"use server";

import { revalidatePath } from "next/cache";
import { eq, and, count, desc, max, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { specVersions, events, parameters } from "@/lib/db/schema";
import { createWorkspaceSchema } from "@/lib/validators/spec";
import { requireUserContext } from "@/lib/auth/user-context";
import { projects } from "@/lib/db/schema";
import type { SpecVersion } from "@/types";
import {
  computeThreeWayDiff,
  type ConflictSummary,
  type VersionData,
} from "@/lib/conflicts/diff";
import { cloneSpecData } from "@/lib/api/clone";

/** Verify project belongs to user's org, return project */
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

/** Returns the latest published spec version for a project, or null. */
export async function getLatestPublished(projectId: string) {
  const [published] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "published")
      )
    )
    .orderBy(desc(specVersions.versionNumber))
    .limit(1);
  return published ?? null;
}

/** Returns a specific published spec version by version number, or null. */
export async function getPublishedByVersionNumber(
  projectId: string,
  versionNumber: number
) {
  await requireProject(projectId);
  const [published] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "published"),
        eq(specVersions.versionNumber, versionNumber)
      )
    )
    .limit(1);
  return published ?? null;
}

/** Returns events with params for a published spec version. Uses latest if specVersionId not provided. */
export async function getPublishedEventsWithParams(
  projectId: string,
  specVersionId?: string
) {
  await requireProject(projectId);

  let published;
  if (specVersionId) {
    const [row] = await db
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
    published = row ?? null;
  } else {
    published = await getLatestPublished(projectId);
  }
  if (!published) return null;

  const allEvents = await db
    .select()
    .from(events)
    .where(eq(events.specVersionId, published.id))
    .orderBy(events.sortOrder);

  const eventIds = allEvents.map((e) => e.id);
  const params =
    eventIds.length > 0
      ? await db
          .select({
            id: parameters.id,
            eventId: parameters.eventId,
            name: parameters.name,
            type: parameters.type,
            isRequired: parameters.isRequired,
            exampleValue: parameters.exampleValue,
            description: parameters.description,
            origin: parameters.origin,
          })
          .from(parameters)
          .where(inArray(parameters.eventId, eventIds))
          .orderBy(parameters.sortOrder)
      : [];

  const paramsByEvent = new Map<string, typeof params>();
  for (const p of params) {
    const existing = paramsByEvent.get(p.eventId);
    if (existing) {
      existing.push(p);
    } else {
      paramsByEvent.set(p.eventId, [p]);
    }
  }

  return {
    specVersion: published,
    rows: allEvents.map((event) => ({
      event,
      params: paramsByEvent.get(event.id) ?? [],
    })),
  };
}

/** Returns all parameters for a published spec version, grouped with their event names. Uses latest if specVersionId not provided. */
export async function getPublishedParameters(
  projectId: string,
  specVersionId?: string
) {
  await requireProject(projectId);

  let published;
  if (specVersionId) {
    const [row] = await db
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
    published = row ?? null;
  } else {
    published = await getLatestPublished(projectId);
  }
  if (!published) return null;

  const allEvents = await db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(eq(events.specVersionId, published.id));

  if (allEvents.length === 0) return { specVersion: published, rows: [] };

  const eventIds = allEvents.map((e) => e.id);
  const eventNameById = new Map(allEvents.map((e) => [e.id, e.name]));

  const allParams = await db
    .select({
      id: parameters.id,
      eventId: parameters.eventId,
      sourceParameterId: parameters.sourceParameterId,
      name: parameters.name,
      type: parameters.type,
      description: parameters.description,
      isRequired: parameters.isRequired,
      exampleValue: parameters.exampleValue,
    })
    .from(parameters)
    .where(inArray(parameters.eventId, eventIds))
    .orderBy(parameters.name);

  // Group by sourceParameterId (or id if null) to deduplicate across events
  const grouped = new Map<
    string,
    {
      name: string;
      type: string;
      description: string | null;
      isRequired: boolean;
      exampleValue: string | null;
      events: string[];
    }
  >();

  for (const param of allParams) {
    const key = param.sourceParameterId ?? param.id;
    const existing = grouped.get(key);
    const eventName = eventNameById.get(param.eventId) ?? "Unknown";
    if (existing) {
      if (!existing.events.includes(eventName)) {
        existing.events.push(eventName);
      }
      // If any usage is required, mark as required
      if (param.isRequired) existing.isRequired = true;
    } else {
      grouped.set(key, {
        name: param.name,
        type: param.type,
        description: param.description,
        isRequired: param.isRequired,
        exampleValue: param.exampleValue,
        events: [eventName],
      });
    }
  }

  return {
    specVersion: published,
    rows: Array.from(grouped.entries()).map(([id, data]) => ({
      id,
      ...data,
    })),
  };
}

/** Returns the next version number for publishing. */
export async function getNextVersionNumber(projectId: string) {
  const [result] = await db
    .select({ maxVersion: max(specVersions.versionNumber) })
    .from(specVersions)
    .where(
      and(
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "published")
      )
    );
  return (result?.maxVersion ?? 0) + 1;
}

export async function publishWorkspace(
  projectId: string,
  workspaceId: string,
  formData: FormData
) {
  const { user } = await requireProject(projectId);

  const name = (formData.get("name") as string) || null;
  const description = (formData.get("description") as string) || null;

  // Verify workspace exists
  const [workspace] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.id, workspaceId),
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "workspace")
      )
    )
    .limit(1);
  if (!workspace) throw new Error("Workspace not found");

  await db.transaction(async (tx) => {
    // Compute next version number
    const [result] = await tx
      .select({ maxVersion: max(specVersions.versionNumber) })
      .from(specVersions)
      .where(
        and(
          eq(specVersions.projectId, projectId),
          eq(specVersions.type, "published")
        )
      );
    const nextVersion = (result?.maxVersion ?? 0) + 1;

    // Insert published spec version
    const [published] = await tx
      .insert(specVersions)
      .values({
        projectId,
        type: "published",
        name,
        description,
        versionNumber: nextVersion,
        publishedAt: new Date(),
        publishedBy: user.id,
        createdBy: user.id,
      })
      .returning({ id: specVersions.id });

    await cloneSpecData(tx, workspaceId, published.id);

    // Delete the workspace now that it's been published
    await tx
      .delete(specVersions)
      .where(eq(specVersions.id, workspaceId));
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function getWorkspaces(projectId: string): Promise<SpecVersion[]> {
  await requireProject(projectId);
  return db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "workspace")
      )
    )
    .orderBy(specVersions.createdAt);
}

export async function getWorkspacesWithEventCounts(projectId: string) {
  await requireProject(projectId);

  // Alias for the forked-from spec version
  const forkedFrom = db.$with("forked_from").as(
    db
      .select({
        id: specVersions.id,
        versionNumber: specVersions.versionNumber,
      })
      .from(specVersions)
      .where(eq(specVersions.type, "published"))
  );

  const rows = await db
    .with(forkedFrom)
    .select({
      workspace: specVersions,
      eventCount: count(events.id),
      forkedFromVersion: forkedFrom.versionNumber,
    })
    .from(specVersions)
    .leftJoin(events, eq(events.specVersionId, specVersions.id))
    .leftJoin(forkedFrom, eq(specVersions.forkedFromId, forkedFrom.id))
    .where(
      and(
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "workspace")
      )
    )
    .groupBy(specVersions.id, forkedFrom.versionNumber)
    .orderBy(specVersions.createdAt);
  return rows;
}

export async function createWorkspace(projectId: string, formData: FormData) {
  const { user } = await requireProject(projectId);

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;

  createWorkspaceSchema.parse({ name, description });

  await db.transaction(async (tx) => {
    // Check for latest published version to fork from
    const [latestPublished] = await tx
      .select()
      .from(specVersions)
      .where(
        and(
          eq(specVersions.projectId, projectId),
          eq(specVersions.type, "published")
        )
      )
      .orderBy(desc(specVersions.versionNumber))
      .limit(1);

    const [workspace] = await tx
      .insert(specVersions)
      .values({
        projectId,
        type: "workspace",
        name,
        description: description ?? null,
        forkedFromId: latestPublished?.id ?? null,
        createdBy: user.id,
      })
      .returning({ id: specVersions.id });

    // Clone data from published version if one exists
    if (latestPublished) {
      await cloneSpecData(tx, latestPublished.id, workspace.id);
    }
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateWorkspace(
  projectId: string,
  workspaceId: string,
  formData: FormData
) {
  await requireProject(projectId);

  const [existing] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.id, workspaceId),
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "workspace")
      )
    )
    .limit(1);

  if (!existing) throw new Error("Workspace not found");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  createWorkspaceSchema.parse({ name, description: description ?? undefined });

  await db
    .update(specVersions)
    .set({ name, description })
    .where(eq(specVersions.id, workspaceId));

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteWorkspace(projectId: string, workspaceId: string) {
  await requireProject(projectId);

  const [existing] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.id, workspaceId),
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "workspace")
      )
    )
    .limit(1);

  if (!existing) throw new Error("Workspace not found");

  await db.delete(specVersions).where(eq(specVersions.id, workspaceId));

  revalidatePath(`/projects/${projectId}`);
}

/** Load events + parameters for a spec version as VersionData */
async function loadVersionData(specVersionId: string): Promise<VersionData> {
  const [versionEvents, versionParams] = await Promise.all([
    db
      .select({
        id: events.id,
        sourceEventId: events.sourceEventId,
        name: events.name,
        description: events.description,
        trigger: events.trigger,
        pagePattern: events.pagePattern,
        category: events.category,
        implementationNotes: events.implementationNotes,
      })
      .from(events)
      .where(eq(events.specVersionId, specVersionId)),
    db
      .select({
        id: parameters.id,
        eventId: parameters.eventId,
        sourceParameterId: parameters.sourceParameterId,
        name: parameters.name,
        type: parameters.type,
        description: parameters.description,
        isRequired: parameters.isRequired,
        exampleValue: parameters.exampleValue,
        origin: parameters.origin,
      })
      .from(parameters)
      .where(
        inArray(
          parameters.eventId,
          db
            .select({ id: events.id })
            .from(events)
            .where(eq(events.specVersionId, specVersionId))
        )
      ),
  ]);
  return { events: versionEvents, parameters: versionParams };
}

/** Returns all published spec versions for a project, ordered by version DESC. */
export async function getPublishedVersions(projectId: string) {
  await requireProject(projectId);
  return db
    .select({
      id: specVersions.id,
      name: specVersions.name,
      description: specVersions.description,
      versionNumber: specVersions.versionNumber,
      publishedAt: specVersions.publishedAt,
    })
    .from(specVersions)
    .where(
      and(
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "published")
      )
    )
    .orderBy(desc(specVersions.versionNumber));
}

/** Updates name and description on a published spec version. */
export async function updatePublishedVersion(
  projectId: string,
  versionId: string,
  formData: FormData
) {
  await requireProject(projectId);

  const [existing] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.id, versionId),
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "published")
      )
    )
    .limit(1);

  if (!existing) throw new Error("Published version not found");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  await db
    .update(specVersions)
    .set({ name, description })
    .where(eq(specVersions.id, versionId));

  revalidatePath(`/projects/${projectId}`);
}

export async function getWorkspaceConflicts(
  projectId: string,
  workspaceId: string
): Promise<ConflictSummary | null> {
  await requireProject(projectId);

  // Load workspace
  const [workspace] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.id, workspaceId),
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "workspace")
      )
    )
    .limit(1);

  if (!workspace?.forkedFromId) return null;

  // Find latest published version
  const [latestPublished] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "published")
      )
    )
    .orderBy(desc(specVersions.versionNumber))
    .limit(1);

  // No published version, or workspace is forked from the latest
  if (!latestPublished || latestPublished.id === workspace.forkedFromId) {
    return null;
  }

  // Load all three versions in parallel
  const [base, ws, latest] = await Promise.all([
    loadVersionData(workspace.forkedFromId),
    loadVersionData(workspaceId),
    loadVersionData(latestPublished.id),
  ]);

  return computeThreeWayDiff({ base, workspace: ws, latest });
}
