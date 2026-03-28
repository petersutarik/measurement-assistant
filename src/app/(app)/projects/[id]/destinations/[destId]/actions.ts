"use server";

import { eq, and, desc, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import {
  destinations,
  destinationEvents,
  destinationParameters,
  projectDestinations,
  eventDestinationMappings,
  parameterMappings,
} from "@/lib/db/schema";
import {
  specVersions,
  events,
  parameters,
  eventParameters,
  measurementPlans,
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

async function requireProjectDestination(
  projectId: string,
  projectDestinationId: string,
) {
  await requireProject(projectId);
  const [pd] = await db
    .select({
      id: projectDestinations.id,
      projectId: projectDestinations.projectId,
      destinationId: projectDestinations.destinationId,
      config: projectDestinations.config,
      destination: {
        id: destinations.id,
        name: destinations.name,
        slug: destinations.slug,
        description: destinations.description,
        docsUrl: destinations.docsUrl,
        iconUrl: destinations.iconUrl,
        aiInstructions: destinations.aiInstructions,
      },
    })
    .from(projectDestinations)
    .innerJoin(
      destinations,
      eq(destinations.id, projectDestinations.destinationId),
    )
    .where(
      and(
        eq(projectDestinations.id, projectDestinationId),
        eq(projectDestinations.projectId, projectId),
      ),
    )
    .limit(1);
  if (!pd) throw new Error("Project destination not found");
  return pd;
}

export async function getProjectDestinationDetail(
  projectId: string,
  projectDestinationId: string,
) {
  const pd = await requireProjectDestination(projectId, projectDestinationId);

  // Fetch all event mappings with source event and destination event info
  const mappings = await db
    .select({
      id: eventDestinationMappings.id,
      sourceEvent: {
        id: events.id,
        name: events.name,
        description: events.description,
      },
      destEvent: {
        id: destinationEvents.id,
        name: destinationEvents.name,
        description: destinationEvents.description,
        category: destinationEvents.category,
      },
    })
    .from(eventDestinationMappings)
    .innerJoin(events, eq(events.id, eventDestinationMappings.eventId))
    .innerJoin(
      destinationEvents,
      eq(
        destinationEvents.id,
        eventDestinationMappings.destinationEventId,
      ),
    )
    .where(
      eq(
        eventDestinationMappings.projectDestinationId,
        projectDestinationId,
      ),
    )
    .orderBy(events.name);

  // Fetch parameter mappings for all event mappings
  const mappingIds = mappings.map((m) => m.id);
  let paramMappings: {
    eventDestinationMappingId: string;
    id: string;
    sourceParam: { id: string; name: string } | null;
    destParam: { id: string; name: string; type: string; isRequired: boolean; scope: string | null };
    mappingType: string;
    staticValue: string | null;
  }[] = [];

  if (mappingIds.length > 0) {
    paramMappings = await db
      .select({
        id: parameterMappings.id,
        eventDestinationMappingId:
          parameterMappings.eventDestinationMappingId,
        sourceParam: {
          id: parameters.id,
          name: parameters.name,
        },
        destParam: {
          id: destinationParameters.id,
          name: destinationParameters.name,
          type: destinationParameters.type,
          isRequired: destinationParameters.isRequired,
          scope: destinationParameters.scope,
        },
        mappingType: parameterMappings.mappingType,
        staticValue: parameterMappings.staticValue,
      })
      .from(parameterMappings)
      .innerJoin(
        destinationParameters,
        eq(
          destinationParameters.id,
          parameterMappings.destinationParameterId,
        ),
      )
      .leftJoin(
        parameters,
        eq(parameters.id, parameterMappings.sourceParameterId),
      )
      .where(
        or(
          ...mappingIds.map((mid) =>
            eq(parameterMappings.eventDestinationMappingId, mid),
          ),
        ),
      );
  }

  const paramsByMapping = new Map<string, typeof paramMappings>();
  for (const pm of paramMappings) {
    const list = paramsByMapping.get(pm.eventDestinationMappingId) ?? [];
    list.push(pm);
    paramsByMapping.set(pm.eventDestinationMappingId, list);
  }

  return {
    ...pd,
    mappings: mappings.map((m) => ({
      ...m,
      parameterMappings: paramsByMapping.get(m.id) ?? [],
    })),
  };
}

export async function getCatalogEvents(
  projectId: string,
  destinationId: string,
  search?: string,
) {
  await requireProject(projectId);
  const rows = await db
    .select({
      id: destinationEvents.id,
      name: destinationEvents.name,
      description: destinationEvents.description,
      category: destinationEvents.category,
    })
    .from(destinationEvents)
    .where(
      search
        ? and(
            eq(destinationEvents.destinationId, destinationId),
            like(destinationEvents.name, `%${search}%`),
          )
        : eq(destinationEvents.destinationId, destinationId),
    )
    .orderBy(destinationEvents.category, destinationEvents.name)
    .limit(50);
  return rows;
}

export async function getSpecEvents(projectId: string) {
  await requireProject(projectId);

  // Get latest workspace for this project
  const [workspace] = await db
    .select({ id: specVersions.id })
    .from(specVersions)
    .where(
      and(
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "workspace"),
      ),
    )
    .orderBy(desc(specVersions.createdAt))
    .limit(1);

  if (!workspace) return [];

  const evts = await db
    .select({
      id: events.id,
      name: events.name,
      description: events.description,
    })
    .from(events)
    .where(eq(events.specVersionId, workspace.id))
    .orderBy(events.name);

  return evts;
}

/** Spec events with their parameters — used by AI generation */
async function getSpecEventsWithParams(projectId: string) {
  const [workspace] = await db
    .select({ id: specVersions.id })
    .from(specVersions)
    .where(
      and(
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "workspace"),
      ),
    )
    .orderBy(desc(specVersions.createdAt))
    .limit(1);

  if (!workspace) return [];

  const evts = await db
    .select({
      id: events.id,
      name: events.name,
      description: events.description,
    })
    .from(events)
    .where(eq(events.specVersionId, workspace.id))
    .orderBy(events.name);

  // Get all params for this workspace
  const allParams = await db
    .select({
      id: parameters.id,
      name: parameters.name,
      type: parameters.type,
      description: parameters.description,
      eventId: eventParameters.eventId,
    })
    .from(parameters)
    .innerJoin(
      eventParameters,
      eq(eventParameters.parameterId, parameters.id),
    )
    .where(eq(parameters.specVersionId, workspace.id));

  const paramsByEvent = new Map<string, typeof allParams>();
  for (const p of allParams) {
    const list = paramsByEvent.get(p.eventId) ?? [];
    list.push(p);
    paramsByEvent.set(p.eventId, list);
  }

  return evts.map((e) => ({
    ...e,
    parameters: paramsByEvent.get(e.id) ?? [],
  }));
}

export async function addEventMapping(
  projectId: string,
  projectDestinationId: string,
  specEventId: string,
  destinationEventId: string,
) {
  await requireProjectDestination(projectId, projectDestinationId);
  const [mapping] = await db
    .insert(eventDestinationMappings)
    .values({
      eventId: specEventId,
      projectDestinationId,
      destinationEventId,
    })
    .returning();
  revalidatePath(
    `/projects/${projectId}/destinations/${projectDestinationId}`,
  );
  return mapping;
}

export async function updateEventMapping(
  projectId: string,
  projectDestinationId: string,
  mappingId: string,
  destinationEventId: string,
) {
  await requireProjectDestination(projectId, projectDestinationId);
  await db
    .update(eventDestinationMappings)
    .set({ destinationEventId })
    .where(eq(eventDestinationMappings.id, mappingId));
  revalidatePath(
    `/projects/${projectId}/destinations/${projectDestinationId}`,
  );
}

export async function removeEventMapping(
  projectId: string,
  projectDestinationId: string,
  mappingId: string,
) {
  await requireProjectDestination(projectId, projectDestinationId);
  await db
    .delete(eventDestinationMappings)
    .where(eq(eventDestinationMappings.id, mappingId));
  revalidatePath(
    `/projects/${projectId}/destinations/${projectDestinationId}`,
  );
}

// ── Parameter mapping CRUD ─────────────────────────────────────────

export async function getDestinationEventParams(
  projectId: string,
  destinationEventId: string,
) {
  await requireProject(projectId);
  return db
    .select({
      id: destinationParameters.id,
      name: destinationParameters.name,
      type: destinationParameters.type,
      isRequired: destinationParameters.isRequired,
      scope: destinationParameters.scope,
    })
    .from(destinationParameters)
    .where(eq(destinationParameters.destinationEventId, destinationEventId))
    .orderBy(destinationParameters.name);
}

export async function getSpecEventParams(
  projectId: string,
  specEventId: string,
) {
  await requireProject(projectId);
  return db
    .select({
      id: parameters.id,
      name: parameters.name,
      type: parameters.type,
    })
    .from(parameters)
    .innerJoin(eventParameters, eq(eventParameters.parameterId, parameters.id))
    .where(eq(eventParameters.eventId, specEventId))
    .orderBy(parameters.name);
}

export async function addParameterMapping(
  projectId: string,
  projectDestinationId: string,
  data: {
    eventDestinationMappingId: string;
    destinationParameterId: string;
    mappingType: "reference" | "static";
    sourceParameterId?: string;
    staticValue?: string;
  },
) {
  await requireProjectDestination(projectId, projectDestinationId);
  const [pm] = await db
    .insert(parameterMappings)
    .values({
      eventDestinationMappingId: data.eventDestinationMappingId,
      destinationParameterId: data.destinationParameterId,
      mappingType: data.mappingType,
      sourceParameterId: data.sourceParameterId ?? null,
      staticValue: data.staticValue ?? null,
    })
    .returning();
  revalidatePath(
    `/projects/${projectId}/destinations/${projectDestinationId}`,
  );
  return pm;
}

export async function updateParameterMapping(
  projectId: string,
  projectDestinationId: string,
  parameterMappingId: string,
  data: {
    mappingType?: "reference" | "static";
    sourceParameterId?: string | null;
    staticValue?: string | null;
  },
) {
  await requireProjectDestination(projectId, projectDestinationId);
  const updates: Record<string, unknown> = {};
  if (data.mappingType !== undefined) updates.mappingType = data.mappingType;
  if (data.sourceParameterId !== undefined)
    updates.sourceParameterId = data.sourceParameterId;
  if (data.staticValue !== undefined) updates.staticValue = data.staticValue;

  await db
    .update(parameterMappings)
    .set(updates)
    .where(eq(parameterMappings.id, parameterMappingId));
  revalidatePath(
    `/projects/${projectId}/destinations/${projectDestinationId}`,
  );
}

export async function removeParameterMapping(
  projectId: string,
  projectDestinationId: string,
  parameterMappingId: string,
) {
  await requireProjectDestination(projectId, projectDestinationId);
  await db
    .delete(parameterMappings)
    .where(eq(parameterMappings.id, parameterMappingId));
  revalidatePath(
    `/projects/${projectId}/destinations/${projectDestinationId}`,
  );
}

// ── AI-powered generation ─────────────────────────────────────────

const generatedMappingSchema = z.object({
  mappings: z.array(
    z.object({
      specEventName: z
        .string()
        .describe("Exact name from the spec events list"),
      destinationEventName: z
        .string()
        .describe(
          "Name from the catalog if a match exists, or a custom snake_case event name",
        ),
      isCustomEvent: z
        .boolean()
        .describe(
          "true if this is a custom event not in the catalog, false if it matches a catalog event",
        ),
      parameterMappings: z.array(
        z.object({
          sourceParameterName: z
            .string()
            .describe("Parameter name from the spec event"),
          destinationParameterName: z
            .string()
            .describe("Parameter name for the destination platform"),
          mappingType: z
            .enum(["reference", "static"])
            .describe(
              "reference = direct mapping from source, static = hardcoded value",
            ),
          staticValue: z
            .string()
            .optional()
            .describe("Value when mappingType is static"),
        }),
      ),
    }),
  ),
});

export async function generateMappingsFromPlan(
  projectId: string,
  projectDestinationId: string,
) {
  const pd = await requireProjectDestination(projectId, projectDestinationId);

  // 1. Get spec events WITH parameters
  const specEventsWithParams = await getSpecEventsWithParams(projectId);
  if (specEventsWithParams.length === 0) {
    throw new Error(
      "No spec events found. Generate events from your measurement plan first.",
    );
  }

  // 2. Get measurement plan document (latest completed)
  const [plan] = await db
    .select({
      id: measurementPlans.id,
      document: measurementPlans.document,
    })
    .from(measurementPlans)
    .where(
      and(
        eq(measurementPlans.projectId, projectId),
        eq(measurementPlans.status, "completed"),
      ),
    )
    .orderBy(desc(measurementPlans.createdAt))
    .limit(1);

  // 3. Get destination catalog events WITH parameters
  const catalogEvents = await db
    .select({
      id: destinationEvents.id,
      name: destinationEvents.name,
      description: destinationEvents.description,
      category: destinationEvents.category,
    })
    .from(destinationEvents)
    .where(eq(destinationEvents.destinationId, pd.destinationId))
    .orderBy(destinationEvents.name);

  const catalogEventIds = catalogEvents.map((e) => e.id);
  let catalogParams: {
    id: string;
    name: string;
    type: string;
    isRequired: boolean;
    destinationEventId: string;
  }[] = [];
  if (catalogEventIds.length > 0) {
    catalogParams = await db
      .select({
        id: destinationParameters.id,
        name: destinationParameters.name,
        type: destinationParameters.type,
        isRequired: destinationParameters.isRequired,
        destinationEventId: destinationParameters.destinationEventId,
      })
      .from(destinationParameters)
      .where(
        or(
          ...catalogEventIds.map((eid) =>
            eq(destinationParameters.destinationEventId, eid),
          ),
        ),
      );
  }

  const catalogParamsByEvent = new Map<string, typeof catalogParams>();
  for (const p of catalogParams) {
    const list = catalogParamsByEvent.get(p.destinationEventId) ?? [];
    list.push(p);
    catalogParamsByEvent.set(p.destinationEventId, list);
  }

  // 4. Build AI prompt — plan-driven, not catalog-constrained
  const specEventsList = specEventsWithParams
    .map((e) => {
      const params =
        e.parameters.length > 0
          ? `\n    Parameters: ${e.parameters.map((p) => `${p.name} (${p.type})`).join(", ")}`
          : "";
      return `  - ${e.name}: ${e.description || "no description"}${params}`;
    })
    .join("\n");

  const catalogEventsList = catalogEvents
    .map((e) => {
      const params = catalogParamsByEvent.get(e.id) ?? [];
      const paramStr =
        params.length > 0
          ? `\n    Parameters: ${params.map((p) => `${p.name} (${p.type}${p.isRequired ? ", required" : ""})`).join(", ")}`
          : "";
      return `  - ${e.name} [${e.category}]: ${e.description || ""}${paramStr}`;
    })
    .join("\n");

  const prompt = `You are creating ${pd.destination.name} event configurations based on a measurement plan and dataLayer spec.

Your goal is to determine what events and parameters should be sent to ${pd.destination.name} for EVERY spec event. The measurement plan is the primary source of truth for what should be tracked.

## Spec Events (source — what the dataLayer fires):
${specEventsList}

## ${pd.destination.name} Standard Events (reference — use these when they match):
${catalogEventsList}

${plan?.document ? `## Measurement Plan (PRIMARY SOURCE — this defines what should be tracked):\n${plan.document.slice(0, 4000)}` : ""}

${pd.destination.aiInstructions ? `## Platform Instructions:\n${pd.destination.aiInstructions}` : ""}

## Instructions:
1. Map EVERY spec event to a destination event — do not skip events
2. Use a standard/recommended event from the catalog when the spec event clearly matches one
3. For spec events that don't match any standard event, create a CUSTOM event using snake_case naming appropriate for ${pd.destination.name}
4. For each mapping, include parameter mappings:
   - Map spec parameters to the destination event's standard parameters where they match
   - For standard destination events, include the parameters that the platform expects
   - Use "reference" mapping type when a spec parameter maps directly to a destination parameter
   - Use "static" mapping type only for hardcoded values (rare)
5. The measurement plan context should guide your decisions about which events and parameters matter most`;

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: generatedMappingSchema,
    prompt,
  });

  // 5. Resolve names to IDs and insert
  const specEventMap = new Map(
    specEventsWithParams.map((e) => [e.name, e]),
  );
  const catalogEventMap = new Map(catalogEvents.map((e) => [e.name, e.id]));

  // Build param lookup: destEventId -> paramName -> paramId
  const destParamLookup = new Map<string, Map<string, string>>();
  for (const p of catalogParams) {
    let eventMap = destParamLookup.get(p.destinationEventId);
    if (!eventMap) {
      eventMap = new Map();
      destParamLookup.set(p.destinationEventId, eventMap);
    }
    eventMap.set(p.name, p.id);
  }

  let insertedCount = 0;

  await db.transaction(async (tx) => {
    // Delete existing mappings
    await tx
      .delete(eventDestinationMappings)
      .where(
        eq(
          eventDestinationMappings.projectDestinationId,
          projectDestinationId,
        ),
      );

    for (const mapping of object.mappings) {
      const specEvent = specEventMap.get(mapping.specEventName);
      if (!specEvent) continue;

      // Resolve or create destination event
      let destEventId: string | undefined;

      if (!mapping.isCustomEvent) {
        destEventId = catalogEventMap.get(mapping.destinationEventName);
      }

      if (!destEventId) {
        // Create custom destination event in the catalog
        const [newEvent] = await tx
          .insert(destinationEvents)
          .values({
            destinationId: pd.destinationId,
            name: mapping.destinationEventName,
            description: `Custom event mapped from ${mapping.specEventName}`,
            isStandard: false,
            category: "custom",
          })
          .onConflictDoUpdate({
            target: [
              destinationEvents.destinationId,
              destinationEvents.name,
            ],
            set: { description: `Custom event mapped from ${mapping.specEventName}` },
          })
          .returning({ id: destinationEvents.id });
        destEventId = newEvent.id;
      }

      // Insert event mapping
      const [edm] = await tx
        .insert(eventDestinationMappings)
        .values({
          eventId: specEvent.id,
          projectDestinationId,
          destinationEventId: destEventId,
        })
        .returning({ id: eventDestinationMappings.id });

      insertedCount++;

      // Insert parameter mappings
      if (mapping.parameterMappings.length > 0) {
        // Build source param lookup for this spec event
        const sourceParamMap = new Map(
          specEvent.parameters.map((p) => [p.name, p.id]),
        );
        const eventDestParams = destParamLookup.get(destEventId);

        for (const pm of mapping.parameterMappings) {
          // Find or create destination parameter
          let destParamId = eventDestParams?.get(
            pm.destinationParameterName,
          );

          if (!destParamId) {
            // Create the destination parameter
            const [newParam] = await tx
              .insert(destinationParameters)
              .values({
                destinationEventId: destEventId,
                name: pm.destinationParameterName,
                type: "string",
                isRequired: false,
                isStandard: false,
              })
              .returning({ id: destinationParameters.id });
            destParamId = newParam.id;
          }

          const sourceParamId = sourceParamMap.get(
            pm.sourceParameterName,
          );

          await tx.insert(parameterMappings).values({
            eventDestinationMappingId: edm.id,
            destinationParameterId: destParamId,
            mappingType: pm.mappingType as "reference" | "static",
            sourceParameterId: sourceParamId ?? null,
            staticValue: pm.staticValue ?? null,
          });
        }
      }
    }
  });

  revalidatePath(
    `/projects/${projectId}/destinations/${projectDestinationId}`,
  );
  return {
    mappedCount: insertedCount,
    totalSpecEvents: specEventsWithParams.length,
  };
}
