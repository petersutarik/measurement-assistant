"use server";

import { revalidatePath } from "next/cache";
import { eq, and, max } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projects,
  specVersions,
  events,
  parameters,
} from "@/lib/db/schema";
import { createParameterSchema } from "@/lib/validators/spec";
import { requireUserContext } from "@/lib/auth/user-context";
import type { Parameter } from "@/types";

/** Verify event belongs to user's org via project → workspace → event chain */
async function requireEvent(
  projectId: string,
  workspaceId: string,
  eventId: string
) {
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

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.specVersionId, workspaceId)))
    .limit(1);
  if (!event) throw new Error("Event not found");

  return { project, workspace, event, organization };
}

function revalidateEvent(
  projectId: string,
  workspaceId: string,
  eventId: string
) {
  revalidatePath(
    `/projects/${projectId}/workspaces/${workspaceId}/events/${eventId}`
  );
  revalidatePath(`/projects/${projectId}/workspaces/${workspaceId}`);
  revalidatePath(`/projects/${projectId}`);
}

export async function getParameters(
  projectId: string,
  workspaceId: string,
  eventId: string
): Promise<Parameter[]> {
  await requireEvent(projectId, workspaceId, eventId);
  return db
    .select()
    .from(parameters)
    .where(eq(parameters.eventId, eventId))
    .orderBy(parameters.sortOrder);
}

export async function createParameter(
  projectId: string,
  workspaceId: string,
  eventId: string,
  formData: FormData
) {
  await requireEvent(projectId, workspaceId, eventId);

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const description = (formData.get("description") as string) || undefined;
  const isRequired = formData.get("isRequired") === "true";
  const exampleValue = (formData.get("exampleValue") as string) || undefined;
  const origin = (formData.get("origin") as string) || undefined;
  const parentId = (formData.get("parentId") as string) || undefined;

  createParameterSchema.parse({
    name,
    type,
    description,
    isRequired,
    exampleValue,
    origin,
    parentId,
  });

  // If parentId provided, verify it belongs to same event
  if (parentId) {
    const [parent] = await db
      .select()
      .from(parameters)
      .where(and(eq(parameters.id, parentId), eq(parameters.eventId, eventId)))
      .limit(1);
    if (!parent) throw new Error("Parent parameter not found");
  }

  // Auto-compute sort order
  const [maxSort] = await db
    .select({ max: max(parameters.sortOrder) })
    .from(parameters)
    .where(eq(parameters.eventId, eventId));
  const sortOrder = (maxSort?.max ?? -1) + 1;

  await db.insert(parameters).values({
    eventId,
    parentId: parentId ?? null,
    name,
    type: type as "string" | "number" | "boolean" | "array" | "object",
    description: description ?? null,
    isRequired,
    exampleValue: exampleValue ?? null,
    origin: origin ?? null,
    sortOrder,
  });

  revalidateEvent(projectId, workspaceId, eventId);
}

export async function updateParameter(
  projectId: string,
  workspaceId: string,
  eventId: string,
  parameterId: string,
  formData: FormData
) {
  await requireEvent(projectId, workspaceId, eventId);

  const [existing] = await db
    .select()
    .from(parameters)
    .where(
      and(eq(parameters.id, parameterId), eq(parameters.eventId, eventId))
    )
    .limit(1);
  if (!existing) throw new Error("Parameter not found");

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const description = (formData.get("description") as string) || null;
  const isRequired = formData.get("isRequired") === "true";
  const exampleValue = (formData.get("exampleValue") as string) || null;
  const origin = (formData.get("origin") as string) || null;

  await db
    .update(parameters)
    .set({
      name,
      type: type as "string" | "number" | "boolean" | "array" | "object",
      description,
      isRequired,
      exampleValue,
      origin,
    })
    .where(eq(parameters.id, parameterId));

  revalidateEvent(projectId, workspaceId, eventId);
}

export async function deleteParameter(
  projectId: string,
  workspaceId: string,
  eventId: string,
  parameterId: string
) {
  await requireEvent(projectId, workspaceId, eventId);

  const [existing] = await db
    .select()
    .from(parameters)
    .where(
      and(eq(parameters.id, parameterId), eq(parameters.eventId, eventId))
    )
    .limit(1);
  if (!existing) throw new Error("Parameter not found");

  // Children cascade-delete via DB FK
  await db.delete(parameters).where(eq(parameters.id, parameterId));

  revalidateEvent(projectId, workspaceId, eventId);
}
