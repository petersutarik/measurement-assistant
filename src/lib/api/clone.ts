import { eq, inArray } from "drizzle-orm";
import { events, parameters, eventParameters, customFieldValues } from "@/lib/db/schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Clone events, parameters, junction rows, and custom field values from one spec version to another.
 * Handles parentId remapping for nested parameters in a two-pass approach.
 *
 * Accepts any Drizzle db instance (connection or transaction).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cloneSpecData(db: NodePgDatabase<any>, sourceId: string, targetId: string) {
  const sourceEvents = await db
    .select()
    .from(events)
    .where(eq(events.specVersionId, sourceId));

  if (sourceEvents.length === 0) return;

  // Clone events and build old→new ID map
  const eventIdMap = new Map<string, string>();
  for (const evt of sourceEvents) {
    const [inserted] = await db
      .insert(events)
      .values({
        specVersionId: targetId,
        name: evt.name,
        description: evt.description,
        trigger: evt.trigger,
        pagePattern: evt.pagePattern,
        exampleUrls: evt.exampleUrls,
        category: evt.category,
        implementationNotes: evt.implementationNotes,
        sortOrder: evt.sortOrder,
        sourceEventId: evt.sourceEventId ?? evt.id,
      })
      .returning({ id: events.id });
    eventIdMap.set(evt.id, inserted.id);
  }

  // Clone parameters (workspace-level) and build old→new ID map
  const sourceParams = await db
    .select()
    .from(parameters)
    .where(eq(parameters.specVersionId, sourceId));

  const paramIdMap = new Map<string, string>();
  if (sourceParams.length > 0) {
    // First pass: insert all params with null parentId
    for (const param of sourceParams) {
      const [inserted] = await db
        .insert(parameters)
        .values({
          specVersionId: targetId,
          parentId: null,
          name: param.name,
          type: param.type,
          description: param.description,
          isRequired: param.isRequired,
          exampleValue: param.exampleValue,
          origin: param.origin,
          sourceParameterId: param.sourceParameterId ?? param.id,
        })
        .returning({ id: parameters.id });
      paramIdMap.set(param.id, inserted.id);
    }

    // Second pass: remap parentId on cloned parameters
    for (const param of sourceParams) {
      if (param.parentId) {
        const newParamId = paramIdMap.get(param.id)!;
        const newParentId = paramIdMap.get(param.parentId)!;
        await db
          .update(parameters)
          .set({ parentId: newParentId })
          .where(eq(parameters.id, newParamId));
      }
    }
  }

  // Clone junction rows (event_parameters)
  const sourceEventIds = sourceEvents.map((e) => e.id);
  const sourceJunctions = await db
    .select()
    .from(eventParameters)
    .where(inArray(eventParameters.eventId, sourceEventIds));

  for (const jn of sourceJunctions) {
    const newEventId = eventIdMap.get(jn.eventId);
    const newParamId = paramIdMap.get(jn.parameterId);
    if (newEventId && newParamId) {
      await db.insert(eventParameters).values({
        eventId: newEventId,
        parameterId: newParamId,
        sortOrder: jn.sortOrder,
      });
    }
  }

  // Clone custom field values for events
  const cfvForEvents = await db
    .select()
    .from(customFieldValues)
    .where(inArray(customFieldValues.eventId, sourceEventIds));

  for (const cfv of cfvForEvents) {
    await db.insert(customFieldValues).values({
      customFieldDefinitionId: cfv.customFieldDefinitionId,
      eventId: eventIdMap.get(cfv.eventId!)!,
      parameterId: null,
      value: cfv.value,
    });
  }

  // Clone custom field values for parameters
  if (sourceParams.length > 0) {
    const sourceParamIds = sourceParams.map((p) => p.id);
    const cfvForParams = await db
      .select()
      .from(customFieldValues)
      .where(inArray(customFieldValues.parameterId, sourceParamIds));

    for (const cfv of cfvForParams) {
      await db.insert(customFieldValues).values({
        customFieldDefinitionId: cfv.customFieldDefinitionId,
        eventId: null,
        parameterId: paramIdMap.get(cfv.parameterId!)!,
        value: cfv.value,
      });
    }
  }
}
