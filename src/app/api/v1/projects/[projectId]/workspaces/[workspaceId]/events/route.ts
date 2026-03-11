import { eq, max, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, parameters, eventParameters } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { requireApiWorkspace } from "@/lib/api/access";
import {
  ok,
  created,
  notFound,
  validationError,
  serverError,
} from "@/lib/api/response";
import { createEventSchema } from "@/lib/validators/spec";
import { ZodError } from "zod";

async function requireWorkspace(
  auth: { accountId: string },
  projectId: string,
  workspaceId: string
) {
  return requireApiWorkspace(auth, projectId, workspaceId);
}

export async function GET(
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
    if (!(await requireWorkspace(auth, projectId, workspaceId)))
      return notFound("Workspace not found");

    const allEvents = await db
      .select()
      .from(events)
      .where(eq(events.specVersionId, workspaceId))
      .orderBy(events.sortOrder);

    // Include parameters for each event via junction
    const eventIds = allEvents.map((e) => e.id);
    const allParams =
      eventIds.length > 0
        ? await db
            .select({
              param: parameters,
              eventId: eventParameters.eventId,
              sortOrder: eventParameters.sortOrder,
            })
            .from(eventParameters)
            .innerJoin(parameters, eq(parameters.id, eventParameters.parameterId))
            .where(inArray(eventParameters.eventId, eventIds))
            .orderBy(eventParameters.sortOrder)
        : [];

    const paramsByEvent = new Map<string, (typeof allParams)[number]["param"][]>();
    for (const p of allParams) {
      const existing = paramsByEvent.get(p.eventId);
      if (existing) existing.push(p.param);
      else paramsByEvent.set(p.eventId, [p.param]);
    }

    return ok(
      allEvents.map((event) => ({
        ...event,
        parameters: paramsByEvent.get(event.id) ?? [],
      }))
    );
  } catch (error) {
    return serverError(error);
  }
}

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
    if (!(await requireWorkspace(auth, projectId, workspaceId)))
      return notFound("Workspace not found");

    const body = await request.json();
    const validated = createEventSchema.parse(body);

    const [maxSort] = await db
      .select({ max: max(events.sortOrder) })
      .from(events)
      .where(eq(events.specVersionId, workspaceId));
    const sortOrder = (maxSort?.max ?? -1) + 1;

    const [event] = await db
      .insert(events)
      .values({
        specVersionId: workspaceId,
        name: validated.name,
        description: validated.description ?? null,
        trigger: validated.trigger ?? null,
        pagePattern: validated.pagePattern ?? null,
        category: validated.category ?? null,
        implementationNotes: validated.implementationNotes ?? null,
        sortOrder,
      })
      .returning();

    return created(event);
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return serverError(error);
  }
}
