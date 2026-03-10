import { eq, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, parameters } from "@/lib/db/schema";
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
 * Designed for AI agents that generate full specs at once.
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

    // Get current max sort order
    const [maxSort] = await db
      .select({ max: max(events.sortOrder) })
      .from(events)
      .where(eq(events.specVersionId, workspaceId));
    let nextSort = (maxSort?.max ?? -1) + 1;

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

      const createdParams = [];
      let paramSort = 0;
      for (const paramData of eventData.parameters) {
        const [param] = await db
          .insert(parameters)
          .values({
            eventId: event.id,
            parentId: null,
            name: paramData.name,
            type: paramData.type,
            description: paramData.description ?? null,
            isRequired: paramData.isRequired,
            exampleValue: paramData.exampleValue ?? null,
            origin: paramData.origin ?? null,
            sortOrder: paramSort++,
          })
          .returning();
        createdParams.push(param);
      }

      createdEvents.push({ ...event, parameters: createdParams });
    }

    return ok({ created: createdEvents.length, events: createdEvents });
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return serverError(error);
  }
}
