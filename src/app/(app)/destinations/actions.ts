"use server";

import { eq, or, isNull, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import { destinations, destinationEvents } from "@/lib/db/schema";
import { slugify } from "@/lib/slugify";

export async function getDestinations() {
  const ctx = await requireUserContext();
  const rows = await db
    .select({
      id: destinations.id,
      name: destinations.name,
      slug: destinations.slug,
      description: destinations.description,
      docsUrl: destinations.docsUrl,
      iconUrl: destinations.iconUrl,
      scopeType: destinations.scopeType,
      scopeId: destinations.scopeId,
      eventCount: sql<number>`count(${destinationEvents.id})::int`,
    })
    .from(destinations)
    .leftJoin(
      destinationEvents,
      eq(destinationEvents.destinationId, destinations.id)
    )
    .where(
      or(
        eq(destinations.scopeType, "system"),
        and(
          eq(destinations.scopeType, "account"),
          eq(destinations.scopeId, ctx.account.id)
        )
      )
    )
    .groupBy(destinations.id)
    .orderBy(destinations.name);
  return rows;
}

export async function createDestination(data: {
  name: string;
  description?: string;
  docsUrl?: string;
  iconUrl?: string;
}) {
  const ctx = await requireUserContext();
  const [dest] = await db
    .insert(destinations)
    .values({
      scopeType: "account",
      scopeId: ctx.account.id,
      name: data.name,
      slug: slugify(data.name),
      description: data.description || null,
      docsUrl: data.docsUrl || null,
      iconUrl: data.iconUrl || null,
    })
    .returning();
  revalidatePath("/destinations");
  return dest;
}

export async function updateDestination(
  id: string,
  data: {
    name?: string;
    description?: string;
    docsUrl?: string;
    iconUrl?: string;
  }
) {
  const ctx = await requireUserContext();
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updates.name = data.name;
    updates.slug = slugify(data.name);
  }
  if (data.description !== undefined) updates.description = data.description || null;
  if (data.docsUrl !== undefined) updates.docsUrl = data.docsUrl || null;
  if (data.iconUrl !== undefined) updates.iconUrl = data.iconUrl || null;

  await db
    .update(destinations)
    .set(updates)
    .where(
      and(
        eq(destinations.id, id),
        eq(destinations.scopeType, "account"),
        eq(destinations.scopeId, ctx.account.id)
      )
    );
  revalidatePath("/destinations");
}

export async function deleteDestination(id: string) {
  const ctx = await requireUserContext();
  await db
    .delete(destinations)
    .where(
      and(
        eq(destinations.id, id),
        eq(destinations.scopeType, "account"),
        eq(destinations.scopeId, ctx.account.id)
      )
    );
  revalidatePath("/destinations");
}
