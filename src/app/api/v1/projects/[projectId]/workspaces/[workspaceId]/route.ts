import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { specVersions } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { requireApiWorkspace } from "@/lib/api/access";
import {
  ok,
  notFound,
  noContent,
  validationError,
  serverError,
} from "@/lib/api/response";
import { updateWorkspaceSchema } from "@/lib/validators/spec";
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
  }: { params: Promise<{ projectId: string; workspaceId: string }> }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId, workspaceId } = await params;
    const workspace = await requireWorkspace(auth, projectId, workspaceId);
    if (!workspace) return notFound("Workspace not found");
    return ok(workspace);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ projectId: string; workspaceId: string }> }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId, workspaceId } = await params;
    const workspace = await requireWorkspace(auth, projectId, workspaceId);
    if (!workspace) return notFound("Workspace not found");

    const body = await request.json();
    const validated = updateWorkspaceSchema.parse(body);

    const [updated] = await db
      .update(specVersions)
      .set({
        name: validated.name,
        description: validated.description ?? null,
      })
      .where(eq(specVersions.id, workspaceId))
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
  }: { params: Promise<{ projectId: string; workspaceId: string }> }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId, workspaceId } = await params;
    const workspace = await requireWorkspace(auth, projectId, workspaceId);
    if (!workspace) return notFound("Workspace not found");

    await db.delete(specVersions).where(eq(specVersions.id, workspaceId));
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
