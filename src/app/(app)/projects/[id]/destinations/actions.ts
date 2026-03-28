"use server";

import { eq, and, sql, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import {
  destinations,
  projectDestinations,
  eventDestinationMappings,
} from "@/lib/db/schema";
import { projects } from "@/lib/db/schema/tenant";

async function requireProject(projectId: string) {
  const ctx = await requireUserContext();
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, ctx.organization.id),
      ),
    )
    .limit(1);
  if (!project) throw new Error("Project not found");
  return { project, ctx };
}

export async function getProjectDestinations(projectId: string) {
  await requireProject(projectId);
  const rows = await db
    .select({
      id: projectDestinations.id,
      destinationId: destinations.id,
      name: destinations.name,
      slug: destinations.slug,
      description: destinations.description,
      docsUrl: destinations.docsUrl,
      iconUrl: destinations.iconUrl,
      config: projectDestinations.config,
      mappedEventCount:
        sql<number>`count(${eventDestinationMappings.id})::int`,
    })
    .from(projectDestinations)
    .innerJoin(
      destinations,
      eq(destinations.id, projectDestinations.destinationId),
    )
    .leftJoin(
      eventDestinationMappings,
      eq(
        eventDestinationMappings.projectDestinationId,
        projectDestinations.id,
      ),
    )
    .where(eq(projectDestinations.projectId, projectId))
    .groupBy(projectDestinations.id, destinations.id)
    .orderBy(destinations.name);
  return rows;
}

export async function getAvailableDestinations(projectId: string) {
  await requireProject(projectId);

  // Get destination IDs already added to this project
  const existing = await db
    .select({ destinationId: projectDestinations.destinationId })
    .from(projectDestinations)
    .where(eq(projectDestinations.projectId, projectId));

  const existingIds = existing.map((r) => r.destinationId);

  const rows = await db
    .select({
      id: destinations.id,
      name: destinations.name,
      slug: destinations.slug,
      description: destinations.description,
      docsUrl: destinations.docsUrl,
      iconUrl: destinations.iconUrl,
    })
    .from(destinations)
    .where(
      existingIds.length > 0
        ? and(
            eq(destinations.scopeType, "system"),
            notInArray(destinations.id, existingIds),
          )
        : eq(destinations.scopeType, "system"),
    )
    .orderBy(destinations.name);
  return rows;
}

export async function addDestinationToProject(
  projectId: string,
  destinationId: string,
) {
  await requireProject(projectId);
  const [pd] = await db
    .insert(projectDestinations)
    .values({ projectId, destinationId })
    .onConflictDoNothing()
    .returning();
  revalidatePath(`/projects/${projectId}/destinations`);
  return pd;
}

export async function removeDestinationFromProject(
  projectId: string,
  projectDestinationId: string,
) {
  await requireProject(projectId);
  await db
    .delete(projectDestinations)
    .where(
      and(
        eq(projectDestinations.id, projectDestinationId),
        eq(projectDestinations.projectId, projectId),
      ),
    );
  revalidatePath(`/projects/${projectId}/destinations`);
}
