"use server";

import { revalidatePath } from "next/cache";
import { eq, and, count, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projects,
  specVersions,
  events,
  parameters,
  implementationDocuments,
  implDocumentEvents,
} from "@/lib/db/schema";
import { requireUserContext } from "@/lib/auth/user-context";
import {
  createDocumentSchema,
  updateDocumentSchema,
} from "@/lib/validators/documents";

/** Verify project belongs to user's org, return project + user */
async function requireProject(projectId: string) {
  const { organization, user } = await requireUserContext();
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.organizationId, organization.id))
    )
    .limit(1);
  if (!project) throw new Error("Project not found");
  return { project, organization, user };
}

/** List all implementation documents for a project with event counts */
export async function getDocuments(projectId: string) {
  await requireProject(projectId);

  const docs = await db
    .select({
      id: implementationDocuments.id,
      title: implementationDocuments.title,
      description: implementationDocuments.description,
      specVersionId: implementationDocuments.specVersionId,
      createdAt: implementationDocuments.createdAt,
    })
    .from(implementationDocuments)
    .where(eq(implementationDocuments.projectId, projectId))
    .orderBy(desc(implementationDocuments.createdAt));

  if (docs.length === 0) return [];

  // Get event counts per document
  const docIds = docs.map((d) => d.id);
  const counts = await db
    .select({
      implementationDocumentId: implDocumentEvents.implementationDocumentId,
      eventCount: count(implDocumentEvents.id),
    })
    .from(implDocumentEvents)
    .where(inArray(implDocumentEvents.implementationDocumentId, docIds))
    .groupBy(implDocumentEvents.implementationDocumentId);

  const countMap = new Map(
    counts.map((c) => [c.implementationDocumentId, c.eventCount])
  );

  // Get version numbers for each doc
  const versionIds = [...new Set(docs.map((d) => d.specVersionId))];
  const versions =
    versionIds.length > 0
      ? await db
          .select({
            id: specVersions.id,
            versionNumber: specVersions.versionNumber,
            name: specVersions.name,
          })
          .from(specVersions)
          .where(inArray(specVersions.id, versionIds))
      : [];
  const versionMap = new Map(versions.map((v) => [v.id, v]));

  return docs.map((doc) => ({
    ...doc,
    eventCount: countMap.get(doc.id) ?? 0,
    specVersion: versionMap.get(doc.specVersionId) ?? null,
  }));
}

/** Get a single document with its snapshot events */
export async function getDocument(projectId: string, docId: string) {
  await requireProject(projectId);

  const [doc] = await db
    .select()
    .from(implementationDocuments)
    .where(
      and(
        eq(implementationDocuments.id, docId),
        eq(implementationDocuments.projectId, projectId)
      )
    )
    .limit(1);

  if (!doc) return null;

  const snapshotEvents = await db
    .select()
    .from(implDocumentEvents)
    .where(eq(implDocumentEvents.implementationDocumentId, docId))
    .orderBy(implDocumentEvents.sortOrder);

  // Get source version info
  const [version] = await db
    .select({
      id: specVersions.id,
      versionNumber: specVersions.versionNumber,
      name: specVersions.name,
    })
    .from(specVersions)
    .where(eq(specVersions.id, doc.specVersionId))
    .limit(1);

  return {
    ...doc,
    specVersion: version ?? null,
    snapshotEvents,
  };
}

/** Create a document from a published version, snapshotting selected events + params */
export async function createDocument(
  projectId: string,
  data: {
    title: string;
    description?: string;
    specVersionId: string;
    eventIds: string[];
  }
) {
  const { user } = await requireProject(projectId);
  const parsed = createDocumentSchema.parse(data);

  // Verify the spec version belongs to this project and is published
  const [version] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.id, parsed.specVersionId),
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "published")
      )
    )
    .limit(1);

  if (!version) throw new Error("Published version not found");

  // Fetch selected events
  const selectedEvents = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.specVersionId, parsed.specVersionId),
        inArray(events.id, parsed.eventIds)
      )
    )
    .orderBy(events.sortOrder);

  if (selectedEvents.length === 0) throw new Error("No events found");

  // Fetch all parameters for selected events
  const eventIds = selectedEvents.map((e) => e.id);
  const allParams = await db
    .select()
    .from(parameters)
    .where(inArray(parameters.eventId, eventIds))
    .orderBy(parameters.sortOrder);

  const paramsByEvent = new Map<string, (typeof allParams)[number][]>();
  for (const p of allParams) {
    const existing = paramsByEvent.get(p.eventId);
    if (existing) existing.push(p);
    else paramsByEvent.set(p.eventId, [p]);
  }

  // Create document + snapshot events in a transaction
  const result = await db.transaction(async (tx) => {
    const [doc] = await tx
      .insert(implementationDocuments)
      .values({
        projectId,
        specVersionId: parsed.specVersionId,
        title: parsed.title,
        description: parsed.description ?? null,
        createdBy: user.id,
      })
      .returning({ id: implementationDocuments.id });

    // Snapshot each event with its parameters
    const snapshotRows = selectedEvents.map((event, index) => ({
      implementationDocumentId: doc.id,
      eventId: event.id,
      sortOrder: index,
      snapshotData: {
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
          trigger: event.trigger,
          pagePattern: event.pagePattern,
          category: event.category,
          implementationNotes: event.implementationNotes,
          exampleUrls: event.exampleUrls,
        },
        parameters: (paramsByEvent.get(event.id) ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          description: p.description,
          isRequired: p.isRequired,
          exampleValue: p.exampleValue,
          origin: p.origin,
          parentId: p.parentId,
        })),
      },
    }));

    if (snapshotRows.length > 0) {
      await tx.insert(implDocumentEvents).values(snapshotRows);
    }

    return doc;
  });

  revalidatePath(`/projects/${projectId}/documents`);
  return result;
}

/** Update a document's title/description */
export async function updateDocument(
  projectId: string,
  docId: string,
  data: { title?: string; description?: string }
) {
  await requireProject(projectId);
  const parsed = updateDocumentSchema.parse(data);

  const [existing] = await db
    .select()
    .from(implementationDocuments)
    .where(
      and(
        eq(implementationDocuments.id, docId),
        eq(implementationDocuments.projectId, projectId)
      )
    )
    .limit(1);

  if (!existing) throw new Error("Document not found");

  const updates: Record<string, unknown> = {};
  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.description !== undefined) updates.description = parsed.description;

  if (Object.keys(updates).length > 0) {
    await db
      .update(implementationDocuments)
      .set(updates)
      .where(eq(implementationDocuments.id, docId));
  }

  revalidatePath(`/projects/${projectId}/documents`);
}

/** Delete a document (cascades to snapshot events) */
export async function deleteDocument(projectId: string, docId: string) {
  await requireProject(projectId);

  const [existing] = await db
    .select()
    .from(implementationDocuments)
    .where(
      and(
        eq(implementationDocuments.id, docId),
        eq(implementationDocuments.projectId, projectId)
      )
    )
    .limit(1);

  if (!existing) throw new Error("Document not found");

  await db
    .delete(implementationDocuments)
    .where(eq(implementationDocuments.id, docId));

  revalidatePath(`/projects/${projectId}/documents`);
}

/** Get events for a published spec version (for the create form) */
export async function getVersionEvents(projectId: string, specVersionId: string) {
  await requireProject(projectId);

  const [version] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.id, specVersionId),
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "published")
      )
    )
    .limit(1);

  if (!version) return [];

  return db
    .select({
      id: events.id,
      name: events.name,
      category: events.category,
      trigger: events.trigger,
      description: events.description,
    })
    .from(events)
    .where(eq(events.specVersionId, specVersionId))
    .orderBy(events.sortOrder);
}
