import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { parameters, eventParameters } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { requireApiParameter } from "@/lib/api/access";
import {
  ok,
  notFound,
  noContent,
  validationError,
  serverError,
} from "@/lib/api/response";
import { updateParameterSchema } from "@/lib/validators/spec";
import { ZodError } from "zod";

async function requireParameter(
  auth: { accountId: string },
  projectId: string,
  workspaceId: string,
  eventId: string,
  parameterId: string
) {
  return requireApiParameter(auth, projectId, workspaceId, eventId, parameterId);
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
      parameterId: string;
    }>;
  }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId, workspaceId, eventId, parameterId } = await params;
    const param = await requireParameter(
      auth,
      projectId,
      workspaceId,
      eventId,
      parameterId
    );
    if (!param) return notFound("Parameter not found");
    return ok(param);
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
      parameterId: string;
    }>;
  }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId, workspaceId, eventId, parameterId } = await params;
    const param = await requireParameter(
      auth,
      projectId,
      workspaceId,
      eventId,
      parameterId
    );
    if (!param) return notFound("Parameter not found");

    const body = await request.json();
    const validated = updateParameterSchema.parse(body);

    const [updated] = await db
      .update(parameters)
      .set({
        name: validated.name,
        type: validated.type,
        description: validated.description ?? null,
        isRequired: validated.isRequired ?? false,
        exampleValue: validated.exampleValue ?? null,
        origin: validated.origin ?? null,
      })
      .where(eq(parameters.id, parameterId))
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
      parameterId: string;
    }>;
  }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId, workspaceId, eventId, parameterId } = await params;
    const param = await requireParameter(
      auth,
      projectId,
      workspaceId,
      eventId,
      parameterId
    );
    if (!param) return notFound("Parameter not found");

    // Remove junction row
    await db
      .delete(eventParameters)
      .where(
        and(
          eq(eventParameters.eventId, eventId),
          eq(eventParameters.parameterId, parameterId)
        )
      );

    // Delete parameter if orphaned
    await db.execute(sql`
      DELETE FROM parameters
      WHERE id = ${parameterId}
      AND NOT EXISTS (
        SELECT 1 FROM event_parameters ep WHERE ep.parameter_id = ${parameterId}
      )
    `);

    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
