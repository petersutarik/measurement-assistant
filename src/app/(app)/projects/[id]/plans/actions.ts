"use server";

import { eq, and, desc, or, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import {
  measurementPlans,
  planContextSources,
  planTemplates,
  projects,
  events,
  parameters,
  eventParameters,
  specVersions,
} from "@/lib/db/schema";
import type { PlanMessage } from "@/types";

async function requireProject(projectId: string) {
  const ctx = await requireUserContext();
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, ctx.organization.id)
      )
    )
    .limit(1);
  if (!project) throw new Error("Project not found");
  return { ...ctx, project };
}

// ── Plan CRUD ───────────────────────────────────────────────────────

export async function getPlans(projectId: string) {
  await requireProject(projectId);
  return db
    .select()
    .from(measurementPlans)
    .where(eq(measurementPlans.projectId, projectId))
    .orderBy(desc(measurementPlans.updatedAt));
}

export async function getPlan(projectId: string, planId: string) {
  const ctx = await requireProject(projectId);
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
  return { plan, ctx };
}

export async function createPlan(
  projectId: string,
  title: string,
  document?: string
) {
  const { user } = await requireProject(projectId);
  const [plan] = await db
    .insert(measurementPlans)
    .values({
      projectId,
      title,
      document: document ?? "",
      createdBy: user.id,
    })
    .returning();
  revalidatePath(`/projects/${projectId}/plans`);
  return plan;
}

export async function getTemplates() {
  const ctx = await requireUserContext();
  return db
    .select()
    .from(planTemplates)
    .where(
      or(
        isNull(planTemplates.accountId),
        eq(planTemplates.accountId, ctx.account.id)
      )
    )
    .orderBy(planTemplates.name);
}

export async function updatePlanDocument(
  projectId: string,
  planId: string,
  document: string
) {
  await requireProject(projectId);
  await db
    .update(measurementPlans)
    .set({ document })
    .where(
      and(
        eq(measurementPlans.id, planId),
        eq(measurementPlans.projectId, projectId)
      )
    );
}

export async function updatePlanMessages(
  projectId: string,
  planId: string,
  messages: PlanMessage[]
) {
  await requireProject(projectId);
  await db
    .update(measurementPlans)
    .set({ messages })
    .where(
      and(
        eq(measurementPlans.id, planId),
        eq(measurementPlans.projectId, projectId)
      )
    );
}

export async function updatePlanTitle(
  projectId: string,
  planId: string,
  title: string
) {
  await requireProject(projectId);
  await db
    .update(measurementPlans)
    .set({ title })
    .where(
      and(
        eq(measurementPlans.id, planId),
        eq(measurementPlans.projectId, projectId)
      )
    );
  revalidatePath(`/projects/${projectId}/plans`);
}

export async function deletePlan(projectId: string, planId: string) {
  await requireProject(projectId);
  await db
    .delete(measurementPlans)
    .where(
      and(
        eq(measurementPlans.id, planId),
        eq(measurementPlans.projectId, projectId)
      )
    );
  revalidatePath(`/projects/${projectId}/plans`);
}

// ── Context Sources ─────────────────────────────────────────────────

export async function getContextSources(planId: string) {
  return db
    .select()
    .from(planContextSources)
    .where(eq(planContextSources.planId, planId))
    .orderBy(planContextSources.createdAt);
}

export async function addContextNote(
  projectId: string,
  planId: string,
  name: string,
  content: string
) {
  await requireProject(projectId);
  const [source] = await db
    .insert(planContextSources)
    .values({
      planId,
      type: "note",
      name,
      content,
    })
    .returning();
  return source;
}

export async function addContextUrl(
  projectId: string,
  planId: string,
  url: string
) {
  await requireProject(projectId);

  // Fetch and extract page content
  let content = "";
  let name = url;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "MeasurementAssistant/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) name = titleMatch[1].trim();
    // Extract text content (strip tags, compress whitespace)
    content = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50000); // limit context size
  } catch {
    content = `[Failed to fetch URL: ${url}]`;
  }

  const [source] = await db
    .insert(planContextSources)
    .values({
      planId,
      type: "url",
      name,
      url,
      content,
    })
    .returning();
  return source;
}

export async function removeContextSource(
  projectId: string,
  planId: string,
  sourceId: string
) {
  await requireProject(projectId);
  await db
    .delete(planContextSources)
    .where(
      and(
        eq(planContextSources.id, sourceId),
        eq(planContextSources.planId, planId)
      )
    );
}

// ── Project Entities (for AI context) ───────────────────────────────

export async function getProjectEntities(projectId: string) {
  await requireProject(projectId);

  // Get latest published spec version
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

  if (!published) return { events: [], parameters: [] };

  const publishedEvents = await db
    .select()
    .from(events)
    .where(eq(events.specVersionId, published.id))
    .orderBy(events.sortOrder);

  // Get parameters for all published events
  const eventIds = publishedEvents.map((e) => e.id);
  let publishedParams: Array<{
    id: string;
    name: string;
    type: string;
    eventId: string;
    description: string | null;
  }> = [];
  if (eventIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    publishedParams = await db
      .select({
        id: parameters.id,
        name: parameters.name,
        type: parameters.type,
        eventId: eventParameters.eventId,
        description: parameters.description,
      })
      .from(eventParameters)
      .innerJoin(parameters, eq(parameters.id, eventParameters.parameterId))
      .where(inArray(eventParameters.eventId, eventIds))
      .orderBy(eventParameters.sortOrder);
  }

  return { events: publishedEvents, parameters: publishedParams };
}
