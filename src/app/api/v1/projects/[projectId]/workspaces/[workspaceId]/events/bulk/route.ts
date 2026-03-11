import { eq, and, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, parameters, eventParameters } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { requireApiWorkspace } from "@/lib/api/access";
import {
  ok,
  notFound,
  validationError,
  serverError,
} from "@/lib/api/response";
import { z } from "zod";
import { ZodError } from "zod";

const parameterType = z.enum(["string", "number", "boolean", "array", "object"]);

const bulkParameterSchema = z.object({
  name: z.string().min(1).max(200),
  type: parameterType,
  description: z.string().max(2000).nullish(),
  isRequired: z.boolean().optional().default(false),
  exampleValue: z.string().max(1000).nullish(),
  origin: z.string().max(500).nullish(),
});

const bulkEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  trigger: z.string().max(500).nullish(),
  pagePattern: z.string().max(500).nullish(),
  category: z.string().max(200).nullish(),
  implementationNotes: z.string().max(5000).nullish(),
  parameters: z.array(bulkParameterSchema).optional().default([]),
});

const bulkCreateSchema = z.object({
  events: z.array(bulkEventSchema).min(1).max(200),
});

/**
 * POST /api/v1/projects/:projectId/workspaces/:workspaceId/events/bulk
 *
 * Create multiple events with their parameters in a single request.
 * Auto-deduplicates parameters: if a parameter with the same name+type already
 * exists in the workspace, it reuses it and creates a junction row.
 */
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; workspaceId: string }>;
  }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId, workspaceId } = await params;

    const workspace = await requireApiWorkspace(auth, projectId, workspaceId);
    if (!workspace) return notFound("Workspace not found");

    const body = await request.json();
    const validated = bulkCreateSchema.parse(body);

    // Get current max sort order for events
    const [maxSort] = await db
      .select({ max: max(events.sortOrder) })
      .from(events)
      .where(eq(events.specVersionId, workspaceId));
    let nextSort = (maxSort?.max ?? -1) + 1;

    // Cache of existing workspace params for dedup: "name|type" → param id
    const paramCache = new Map<string, string>();

    // Load existing params into cache
    const existingParams = await db
      .select({ id: parameters.id, name: parameters.name, type: parameters.type })
      .from(parameters)
      .where(eq(parameters.specVersionId, workspaceId));
    for (const p of existingParams) {
      paramCache.set(`${p.name}|${p.type}`, p.id);
    }

    const createdEvents = [];

    for (const eventData of validated.events) {
      const [event] = await db
        .insert(events)
        .values({
          specVersionId: workspaceId,
          name: eventData.name,
          description: eventData.description ?? null,
          trigger: eventData.trigger ?? null,
          pagePattern: eventData.pagePattern ?? null,
          category: eventData.category ?? null,
          implementationNotes: eventData.implementationNotes ?? null,
          sortOrder: nextSort++,
        })
        .returning();

      const eventParamRows = [];
      let paramSort = 0;

      for (const paramData of eventData.parameters) {
        const cacheKey = `${paramData.name}|${paramData.type}`;
        let paramId = paramCache.get(cacheKey);

        if (!paramId) {
          // Create new workspace-level parameter
          const [param] = await db
            .insert(parameters)
            .values({
              specVersionId: workspaceId,
              parentId: null,
              name: paramData.name,
              type: paramData.type,
              description: paramData.description ?? null,
              isRequired: paramData.isRequired,
              exampleValue: paramData.exampleValue ?? null,
              origin: paramData.origin ?? null,
            })
            .returning();
          paramId = param.id;
          paramCache.set(cacheKey, paramId);
          eventParamRows.push(param);
        } else {
          // Reuse existing — fetch it for the response
          const [existing] = await db
            .select()
            .from(parameters)
            .where(eq(parameters.id, paramId))
            .limit(1);
          if (existing) eventParamRows.push(existing);
        }

        // Create junction row
        await db
          .insert(eventParameters)
          .values({
            eventId: event.id,
            parameterId: paramId,
            sortOrder: paramSort++,
          })
          .onConflictDoNothing();
      }

      createdEvents.push({ ...event, parameters: eventParamRows });
    }

    return ok({ created: createdEvents.length, events: createdEvents });
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return serverError(error);
  }
}
