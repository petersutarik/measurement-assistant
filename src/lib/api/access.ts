import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  events,
  organizations,
  parameters,
  projects,
  specVersions,
} from "@/lib/db/schema";
import type { ApiContext } from "./auth";

type ApiAccountContext = Pick<ApiContext, "accountId">;

export async function requireApiProject(
  auth: ApiAccountContext,
  projectId: string
) {
  const [row] = await db
    .select({ project: projects })
    .from(projects)
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(organizations.accountId, auth.accountId)
      )
    )
    .limit(1);

  return row?.project ?? null;
}

export async function organizationBelongsToAccount(
  accountId: string,
  organizationId: string
) {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        eq(organizations.id, organizationId),
        eq(organizations.accountId, accountId)
      )
    )
    .limit(1);

  return org ?? null;
}

export async function requireApiWorkspace(
  auth: ApiAccountContext,
  projectId: string,
  workspaceId: string
) {
  const project = await requireApiProject(auth, projectId);
  if (!project) return null;

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

  return workspace ?? null;
}

export async function requireApiEvent(
  auth: ApiAccountContext,
  projectId: string,
  workspaceId: string,
  eventId: string
) {
  const workspace = await requireApiWorkspace(auth, projectId, workspaceId);
  if (!workspace) return null;

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.specVersionId, workspaceId)))
    .limit(1);

  return event ?? null;
}

export async function requireApiParameter(
  auth: ApiAccountContext,
  projectId: string,
  workspaceId: string,
  eventId: string,
  parameterId: string
) {
  const event = await requireApiEvent(auth, projectId, workspaceId, eventId);
  if (!event) return null;

  const [param] = await db
    .select()
    .from(parameters)
    .where(and(eq(parameters.id, parameterId), eq(parameters.eventId, eventId)))
    .limit(1);

  return param ?? null;
}
