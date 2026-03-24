"use server";

import { eq, and, desc, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  specVersions,
  events,
  parameters,
  eventParameters,
  measurementPlans,
} from "@/lib/db/schema";
import { requireUserContext } from "@/lib/auth/user-context";
import { projects } from "@/lib/db/schema";
import { parsePlanToSpec } from "@/lib/plans/parse-plan";

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

export async function generateSpecFromPlan(
  projectId: string,
  planId: string,
  workspaceId?: string
) {
  const { user } = await requireProject(projectId);

  // Fetch the plan
  const [plan] = await db
    .select()
    .from(measurementPlans)
    .where(
      and(
        eq(measurementPlans.id, planId),
        eq(measurementPlans.projectId, projectId)
      )
    )
    .limit(1);

  if (!plan) throw new Error("Plan not found");
  if (!plan.document) throw new Error("Plan has no document content");

  // Parse the plan document into structured events/parameters
  const parsed = await parsePlanToSpec(plan.document);

  // Use existing workspace or create a new one
  let targetWorkspaceId: string;

  if (workspaceId) {
    targetWorkspaceId = workspaceId;
  } else {
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

    const [workspace] = await db
      .insert(specVersions)
      .values({
        projectId,
        type: "workspace",
        name: `From: ${plan.title}`,
        forkedFromId: latestPublished?.id ?? null,
        createdBy: user.id,
      })
      .returning({ id: specVersions.id });

    targetWorkspaceId = workspace.id;
  }

  // Get current max sort order
  const [maxSort] = await db
    .select({ max: max(events.sortOrder) })
    .from(events)
    .where(eq(events.specVersionId, targetWorkspaceId));
  let nextSort = (maxSort?.max ?? -1) + 1;

  // Load existing params for dedup
  const paramCache = new Map<string, string>();
  const existingParams = await db
    .select({ id: parameters.id, name: parameters.name, type: parameters.type })
    .from(parameters)
    .where(eq(parameters.specVersionId, targetWorkspaceId));
  for (const p of existingParams) {
    paramCache.set(`${p.name}|${p.type}`, p.id);
  }

  // Insert events and parameters
  for (const eventData of parsed.events) {
    const [event] = await db
      .insert(events)
      .values({
        specVersionId: targetWorkspaceId,
        name: eventData.name,
        description: eventData.description ?? null,
        trigger: eventData.trigger ?? null,
        category: eventData.category ?? null,
        sortOrder: nextSort++,
      })
      .returning();

    let paramSort = 0;

    for (const paramData of eventData.parameters) {
      const cacheKey = `${paramData.name}|${paramData.type}`;
      let paramId = paramCache.get(cacheKey);

      if (!paramId) {
        const [param] = await db
          .insert(parameters)
          .values({
            specVersionId: targetWorkspaceId,
            parentId: null,
            name: paramData.name,
            type: paramData.type,
            description: paramData.description ?? null,
            isRequired: paramData.isRequired ?? false,
            exampleValue: paramData.exampleValue ?? null,
          })
          .returning();
        paramId = param.id;
        paramCache.set(cacheKey, paramId);
      }

      await db
        .insert(eventParameters)
        .values({
          eventId: event.id,
          parameterId: paramId,
          sortOrder: paramSort++,
        })
        .onConflictDoNothing();
    }
  }

  revalidatePath(`/projects/${projectId}`);

  if (!workspaceId) {
    redirect(`/projects/${projectId}/workspaces/${targetWorkspaceId}/events`);
  }
}
