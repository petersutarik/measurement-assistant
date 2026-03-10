import { eq, and, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { parameters } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { requireApiEvent } from "@/lib/api/access";
import {
  ok,
  created,
  notFound,
  validationError,
  serverError,
} from "@/lib/api/response";
import { createParameterSchema } from "@/lib/validators/spec";
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
    if (!(await requireEvent(auth, projectId, workspaceId, eventId)))
      return notFound("Event not found");

    const rows = await db
      .select()
      .from(parameters)
      .where(eq(parameters.eventId, eventId))
      .orderBy(parameters.sortOrder);

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(
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
    if (!(await requireEvent(auth, projectId, workspaceId, eventId)))
      return notFound("Event not found");

    const body = await request.json();
    const validated = createParameterSchema.parse(body);

    // Verify parent if provided
    if (validated.parentId) {
      const [parent] = await db
        .select()
        .from(parameters)
        .where(
          and(
            eq(parameters.id, validated.parentId),
            eq(parameters.eventId, eventId)
          )
        )
        .limit(1);
      if (!parent) return notFound("Parent parameter not found");
    }

    const [maxSort] = await db
      .select({ max: max(parameters.sortOrder) })
      .from(parameters)
      .where(eq(parameters.eventId, eventId));
    const sortOrder = (maxSort?.max ?? -1) + 1;

    const [param] = await db
      .insert(parameters)
      .values({
        eventId,
        parentId: validated.parentId ?? null,
        name: validated.name,
        type: validated.type,
        description: validated.description ?? null,
        isRequired: validated.isRequired ?? false,
        exampleValue: validated.exampleValue ?? null,
        origin: validated.origin ?? null,
        sortOrder,
      })
      .returning();

    return created(param);
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return serverError(error);
  }
}
