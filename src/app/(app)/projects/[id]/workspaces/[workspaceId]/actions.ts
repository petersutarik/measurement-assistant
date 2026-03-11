"use server";

import { revalidatePath } from "next/cache";
import { eq, and, max, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  specVersions,
  events,
  parameters,
  eventParameters,
  projects,
  customFieldDefinitions,
  customFieldValues,
} from "@/lib/db/schema";
import { createEventSchema } from "@/lib/validators/spec";
import { requireUserContext } from "@/lib/auth/user-context";
import type { Event } from "@/types";

/** Verify workspace belongs to user's org via project chain */
async function requireWorkspace(projectId: string, workspaceId: string) {
  const { organization } = await requireUserContext();
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.organizationId, organization.id))
    )
    .limit(1);
  if (!project) throw new Error("Project not found");

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

  return { project, workspace, organization };
}

function revalidateWorkspace(projectId: string, workspaceId: string) {
  revalidatePath(`/projects/${projectId}/workspaces/${workspaceId}`);
  revalidatePath(`/projects/${projectId}`);
}

export async function getEventsWithParams(
  projectId: string,
  workspaceId: string
) {
  await requireWorkspace(projectId, workspaceId);

  const allEvents = await db
    .select()
    .from(events)
    .where(eq(events.specVersionId, workspaceId))
    .orderBy(events.sortOrder);

  const eventIds = allEvents.map((e) => e.id);

  // Fetch params via junction table
  const params =
    eventIds.length > 0
      ? await db
          .select({
            id: parameters.id,
            eventId: eventParameters.eventId,
            name: parameters.name,
            type: parameters.type,
            isRequired: parameters.isRequired,
            exampleValue: parameters.exampleValue,
            description: parameters.description,
            origin: parameters.origin,
            sortOrder: eventParameters.sortOrder,
          })
          .from(eventParameters)
          .innerJoin(parameters, eq(parameters.id, eventParameters.parameterId))
          .where(inArray(eventParameters.eventId, eventIds))
          .orderBy(eventParameters.sortOrder)
      : [];

  // Group params by event
  const paramsByEvent = new Map<string, typeof params>();
  for (const p of params) {
    const existing = paramsByEvent.get(p.eventId);
    if (existing) {
      existing.push(p);
    } else {
      paramsByEvent.set(p.eventId, [p]);
    }
  }

  return allEvents.map((event) => ({
    event,
    params: paramsByEvent.get(event.id) ?? [],
  }));
}

export async function getWorkspaceParameters(
  projectId: string,
  workspaceId: string
) {
  await requireWorkspace(projectId, workspaceId);

  // Parameters are now workspace-level — query directly
  const allParams = await db
    .select({
      id: parameters.id,
      name: parameters.name,
      type: parameters.type,
      description: parameters.description,
      isRequired: parameters.isRequired,
      exampleValue: parameters.exampleValue,
    })
    .from(parameters)
    .where(eq(parameters.specVersionId, workspaceId))
    .orderBy(parameters.name);

  if (allParams.length === 0) return [];

  // Get event names for each parameter via junction
  const paramIds = allParams.map((p) => p.id);
  const junctions = await db
    .select({
      parameterId: eventParameters.parameterId,
      eventName: events.name,
    })
    .from(eventParameters)
    .innerJoin(events, eq(events.id, eventParameters.eventId))
    .where(inArray(eventParameters.parameterId, paramIds));

  const eventsByParam = new Map<string, string[]>();
  for (const j of junctions) {
    const existing = eventsByParam.get(j.parameterId);
    if (existing) {
      if (!existing.includes(j.eventName)) existing.push(j.eventName);
    } else {
      eventsByParam.set(j.parameterId, [j.eventName]);
    }
  }

  return allParams.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    description: p.description,
    isRequired: p.isRequired,
    exampleValue: p.exampleValue,
    events: eventsByParam.get(p.id) ?? [],
  }));
}

export async function getEvents(
  projectId: string,
  workspaceId: string
): Promise<Event[]> {
  await requireWorkspace(projectId, workspaceId);
  return db
    .select()
    .from(events)
    .where(eq(events.specVersionId, workspaceId))
    .orderBy(events.sortOrder);
}

export async function createEvent(
  projectId: string,
  workspaceId: string,
  formData: FormData
) {
  await requireWorkspace(projectId, workspaceId);

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const trigger = (formData.get("trigger") as string) || undefined;
  const pagePattern = (formData.get("pagePattern") as string) || undefined;
  const category = (formData.get("category") as string) || undefined;
  const implementationNotes =
    (formData.get("implementationNotes") as string) || undefined;

  createEventSchema.parse({
    name,
    description,
    trigger,
    pagePattern,
    category,
    implementationNotes,
  });

  // Auto-compute sort order
  const [maxSort] = await db
    .select({ max: max(events.sortOrder) })
    .from(events)
    .where(eq(events.specVersionId, workspaceId));
  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db.insert(events).values({
    specVersionId: workspaceId,
    name,
    description: description ?? null,
    trigger: trigger ?? null,
    pagePattern: pagePattern ?? null,
    category: category ?? null,
    implementationNotes: implementationNotes ?? null,
    sortOrder,
  }).returning({ id: events.id });

  revalidateWorkspace(projectId, workspaceId);

  return created.id;
}

export async function updateEvent(
  projectId: string,
  workspaceId: string,
  eventId: string,
  formData: FormData
) {
  await requireWorkspace(projectId, workspaceId);

  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.specVersionId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Event not found");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const trigger = (formData.get("trigger") as string) || null;
  const pagePattern = (formData.get("pagePattern") as string) || null;
  const category = (formData.get("category") as string) || null;
  const implementationNotes =
    (formData.get("implementationNotes") as string) || null;

  createEventSchema.parse({
    name,
    description: description ?? undefined,
    trigger: trigger ?? undefined,
    pagePattern: pagePattern ?? undefined,
    category: category ?? undefined,
    implementationNotes: implementationNotes ?? undefined,
  });

  await db
    .update(events)
    .set({
      name,
      description,
      trigger,
      pagePattern,
      category,
      implementationNotes,
    })
    .where(eq(events.id, eventId));

  revalidateWorkspace(projectId, workspaceId);
}


export async function updateParameterField(
  projectId: string,
  workspaceId: string,
  _eventId: string,
  parameterId: string,
  field: "name" | "type" | "description" | "isRequired" | "exampleValue" | "origin",
  value: string | boolean
) {
  await requireWorkspace(projectId, workspaceId);

  const [existing] = await db
    .select()
    .from(parameters)
    .where(
      and(eq(parameters.id, parameterId), eq(parameters.specVersionId, workspaceId))
    )
    .limit(1);
  if (!existing) throw new Error("Parameter not found");

  if (field === "name" && typeof value === "string" && !value.trim())
    throw new Error("Name is required");

  const setValue =
    field === "isRequired"
      ? { [field]: Boolean(value) }
      : field === "type"
        ? { [field]: value as "string" | "number" | "boolean" | "array" | "object" }
        : { [field]: (value as string) || null };

  await db
    .update(parameters)
    .set(setValue)
    .where(eq(parameters.id, parameterId));

  revalidateWorkspace(projectId, workspaceId);
}

export async function deleteEvent(
  projectId: string,
  workspaceId: string,
  eventId: string
) {
  await requireWorkspace(projectId, workspaceId);

  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.specVersionId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Event not found");

  await db.delete(events).where(eq(events.id, eventId));

  // Clean up orphaned parameters (no junction rows left)
  await db.execute(sql`
    DELETE FROM parameters p
    WHERE p.spec_version_id = ${workspaceId}
    AND NOT EXISTS (
      SELECT 1 FROM event_parameters ep WHERE ep.parameter_id = p.id
    )
  `);

  revalidateWorkspace(projectId, workspaceId);
}

export async function getCustomFieldsForWorkspace(
  projectId: string,
  workspaceId: string
) {
  const { project } = await requireWorkspace(projectId, workspaceId);

  const definitions = await db
    .select()
    .from(customFieldDefinitions)
    .where(
      and(
        eq(customFieldDefinitions.scopeType, "project"),
        eq(customFieldDefinitions.scopeId, project.id)
      )
    )
    .orderBy(customFieldDefinitions.sortOrder);

  if (definitions.length === 0) return { definitions, values: [] };

  // Get all event IDs in this workspace
  const workspaceEvents = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.specVersionId, workspaceId));

  const eventIds = workspaceEvents.map((e) => e.id);
  if (eventIds.length === 0) return { definitions, values: [] };

  // Get all parameter IDs for this workspace directly
  const workspaceParams = await db
    .select({ id: parameters.id })
    .from(parameters)
    .where(eq(parameters.specVersionId, workspaceId));

  const paramIds = workspaceParams.map((p) => p.id);

  // Get custom field values for both events and parameters
  const defIds = definitions.map((d) => d.id);
  const values = await db
    .select()
    .from(customFieldValues)
    .where(
      and(
        inArray(customFieldValues.customFieldDefinitionId, defIds),
        sql`(${customFieldValues.eventId} IN (${sql.join(eventIds.map((id) => sql`${id}`), sql`, `)})${paramIds.length > 0 ? sql` OR ${customFieldValues.parameterId} IN (${sql.join(paramIds.map((id) => sql`${id}`), sql`, `)})` : sql``})`
      )
    );

  return { definitions, values };
}

export async function upsertCustomFieldValue(
  projectId: string,
  workspaceId: string,
  definitionId: string,
  entityId: string,
  entityType: "event" | "parameter",
  value: unknown
) {
  await requireWorkspace(projectId, workspaceId);

  const eventId = entityType === "event" ? entityId : null;
  const parameterId = entityType === "parameter" ? entityId : null;

  // Check if value already exists
  const conditions = [eq(customFieldValues.customFieldDefinitionId, definitionId)];
  if (eventId) {
    conditions.push(eq(customFieldValues.eventId, eventId));
  } else {
    conditions.push(eq(customFieldValues.parameterId, parameterId!));
  }

  const [existing] = await db
    .select({ id: customFieldValues.id })
    .from(customFieldValues)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    await db
      .update(customFieldValues)
      .set({ value: value as Record<string, unknown> | null })
      .where(eq(customFieldValues.id, existing.id));
  } else {
    await db.insert(customFieldValues).values({
      customFieldDefinitionId: definitionId,
      eventId,
      parameterId,
      value: value as Record<string, unknown> | null,
    });
  }

  revalidateWorkspace(projectId, workspaceId);
}
