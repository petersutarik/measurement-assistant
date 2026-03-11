import { eq, and, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { parameters, eventParameters } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { requireApiEvent, requireApiWorkspace } from "@/lib/api/access";
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
      .select({ param: parameters, sortOrder: eventParameters.sortOrder })
      .from(eventParameters)
      .innerJoin(parameters, eq(parameters.id, eventParameters.parameterId))
      .where(eq(eventParameters.eventId, eventId))
      .orderBy(eventParameters.sortOrder);

    return ok(rows.map((r) => r.param));
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
            eq(parameters.specVersionId, workspaceId)
          )
        )
        .limit(1);
      if (!parent) return notFound("Parent parameter not found");
    }

    const [maxSort] = await db
      .select({ max: max(eventParameters.sortOrder) })
      .from(eventParameters)
      .where(eq(eventParameters.eventId, eventId));
    const sortOrder = (maxSort?.max ?? -1) + 1;

    // Create workspace-level parameter
    const [param] = await db
      .insert(parameters)
      .values({
        specVersionId: workspaceId,
        parentId: validated.parentId ?? null,
        name: validated.name,
        type: validated.type,
        description: validated.description ?? null,
        isRequired: validated.isRequired ?? false,
        exampleValue: validated.exampleValue ?? null,
        origin: validated.origin ?? null,
      })
      .returning();

    // Link to event via junction
    await db.insert(eventParameters).values({
      eventId,
      parameterId: param.id,
      sortOrder,
    });

    return created(param);
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return serverError(error);
  }
}
