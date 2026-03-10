"use server";

import { eq, or, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import {
  destinations,
  destinationEvents,
  destinationParameters,
} from "@/lib/db/schema";

export async function getDestination(id: string) {
  const ctx = await requireUserContext();

  const [dest] = await db
    .select()
    .from(destinations)
    .where(
      and(
        eq(destinations.id, id),
        or(
          eq(destinations.scopeType, "system"),
          and(
            eq(destinations.scopeType, "account"),
            eq(destinations.scopeId, ctx.account.id)
          )
        )
      )
    )
    .limit(1);

  if (!dest) return null;

  const events = await db
    .select()
    .from(destinationEvents)
    .where(eq(destinationEvents.destinationId, id))
    .orderBy(destinationEvents.name);

  const eventIds = events.map((e) => e.id);
  let params: (typeof destinationParameters.$inferSelect)[] = [];
  if (eventIds.length > 0) {
    params = await db
      .select()
      .from(destinationParameters)
      .where(
        or(...eventIds.map((eid) => eq(destinationParameters.destinationEventId, eid)))!
      )
      .orderBy(destinationParameters.name);
  }

  const paramsByEvent = new Map<string, typeof params>();
  for (const p of params) {
    const list = paramsByEvent.get(p.destinationEventId) ?? [];
    list.push(p);
    paramsByEvent.set(p.destinationEventId, list);
  }

  return {
    ...dest,
    events: events.map((e) => ({
      ...e,
      parameters: paramsByEvent.get(e.id) ?? [],
    })),
  };
}

export async function createDestinationEvent(
  destinationId: string,
  data: { name: string; description?: string; docsUrl?: string }
) {
  const ctx = await requireUserContext();
  // Verify ownership
  const [dest] = await db
    .select({ id: destinations.id })
    .from(destinations)
    .where(
      and(
        eq(destinations.id, destinationId),
        eq(destinations.scopeType, "account"),
        eq(destinations.scopeId, ctx.account.id)
      )
    )
    .limit(1);
  if (!dest) throw new Error("Not found or not editable");

  const [event] = await db
    .insert(destinationEvents)
    .values({
      destinationId,
      name: data.name,
      description: data.description || null,
      docsUrl: data.docsUrl || null,
      isStandard: false,
    })
    .returning();
  revalidatePath(`/destinations/${destinationId}`);
  return event;
}

export async function updateDestinationEvent(
  eventId: string,
  data: { name?: string; description?: string; docsUrl?: string }
) {
  await requireUserContext();
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description || null;
  if (data.docsUrl !== undefined) updates.docsUrl = data.docsUrl || null;

  await db
    .update(destinationEvents)
    .set(updates)
    .where(eq(destinationEvents.id, eventId));
  revalidatePath("/destinations");
}

export async function deleteDestinationEvent(eventId: string) {
  await requireUserContext();
  await db
    .delete(destinationEvents)
    .where(eq(destinationEvents.id, eventId));
  revalidatePath("/destinations");
}

export async function createDestinationParameter(
  eventId: string,
  data: {
    name: string;
    type: string;
    description?: string;
    isRequired?: boolean;
    exampleValue?: string;
  }
) {
  await requireUserContext();
  const [param] = await db
    .insert(destinationParameters)
    .values({
      destinationEventId: eventId,
      name: data.name,
      type: data.type,
      description: data.description || null,
      isRequired: data.isRequired ?? false,
      isStandard: false,
      exampleValue: data.exampleValue || null,
    })
    .returning();
  revalidatePath("/destinations");
  return param;
}

export async function updateDestinationParameter(
  paramId: string,
  data: {
    name?: string;
    type?: string;
    description?: string;
    isRequired?: boolean;
    exampleValue?: string;
  }
) {
  await requireUserContext();
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.type !== undefined) updates.type = data.type;
  if (data.description !== undefined) updates.description = data.description || null;
  if (data.isRequired !== undefined) updates.isRequired = data.isRequired;
  if (data.exampleValue !== undefined) updates.exampleValue = data.exampleValue || null;

  await db
    .update(destinationParameters)
    .set(updates)
    .where(eq(destinationParameters.id, paramId));
  revalidatePath("/destinations");
}

export async function deleteDestinationParameter(paramId: string) {
  await requireUserContext();
  await db
    .delete(destinationParameters)
    .where(eq(destinationParameters.id, paramId));
  revalidatePath("/destinations");
}
