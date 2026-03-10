import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, parameters } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { requireApiEvent } from "@/lib/api/access";
import {
  ok,
  notFound,
  noContent,
  validationError,
  serverError,
} from "@/lib/api/response";
import { updateEventSchema } from "@/lib/validators/spec";
import { ZodError } from "zod";

async function requireEvent(
  auth: { accountId: string },
  projectId: string,
  workspaceId: string,
  eventId: string
) {
  return requireApiEvent(auth, projectId, workspaceId, eventId);
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      workspaceId: string;
      eventId: string;
    }>;
  }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId, workspaceId, eventId } = await params;
    const event = await requireEvent(auth, projectId, workspaceId, eventId);
    if (!event) return notFound("Event not found");

    // Include parameters
    const params_ = await db
      .select()
      .from(parameters)
      .where(eq(parameters.eventId, eventId))
      .orderBy(parameters.sortOrder);

    return ok({ ...event, parameters: params_ });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      workspaceId: string;
      eventId: string;
    }>;
  }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId, workspaceId, eventId } = await params;
    const event = await requireEvent(auth, projectId, workspaceId, eventId);
    if (!event) return notFound("Event not found");

    const body = await request.json();
    const validated = updateEventSchema.parse(body);

    const [updated] = await db
      .update(events)
      .set({
        name: validated.name,
        description: validated.description ?? null,
        trigger: validated.trigger ?? null,
        pagePattern: validated.pagePattern ?? null,
        category: validated.category ?? null,
        implementationNotes: validated.implementationNotes ?? null,
      })
      .where(eq(events.id, eventId))
      .returning();

    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return serverError(error);
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      workspaceId: string;
      eventId: string;
    }>;
  }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId, workspaceId, eventId } = await params;
    const event = await requireEvent(auth, projectId, workspaceId, eventId);
    if (!event) return notFound("Event not found");

    await db.delete(events).where(eq(events.id, eventId));
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
