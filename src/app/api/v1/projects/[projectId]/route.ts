import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { requireApiProject } from "@/lib/api/access";
import { ok, notFound, validationError, serverError, noContent } from "@/lib/api/response";
import { slugify } from "@/lib/slugify";
import { ZodError } from "zod";
import { z } from "zod";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
  url: z.string().url().nullish(),
});

async function getProject(auth: { accountId: string }, projectId: string) {
  return requireApiProject(auth, projectId);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId } = await params;
    const project = await getProject(auth, projectId);
    if (!project) return notFound("Project not found");
    return ok(project);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId } = await params;
    const project = await getProject(auth, projectId);
    if (!project) return notFound("Project not found");

    const body = await request.json();
    const validated = updateProjectSchema.parse(body);

    const [updated] = await db
      .update(projects)
      .set({
        name: validated.name,
        slug: slugify(validated.name),
        description: validated.description ?? null,
        url: validated.url ?? null,
      })
      .where(eq(projects.id, projectId))
      .returning();

    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return serverError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId } = await params;
    const project = await getProject(auth, projectId);
    if (!project) return notFound("Project not found");

    await db.delete(projects).where(eq(projects.id, projectId));
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
