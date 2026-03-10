import { eq, and, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { specVersions } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { requireApiWorkspace } from "@/lib/api/access";
import { ok, notFound, validationError, serverError } from "@/lib/api/response";
import { cloneSpecData } from "@/lib/api/clone";
import { ZodError, z } from "zod";

const publishSchema = z.object({
  name: z.string().max(200).nullish(),
  description: z.string().max(2000).nullish(),
});

export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ projectId: string; workspaceId: string }> }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId, workspaceId } = await params;

    const workspace = await requireApiWorkspace(auth, projectId, workspaceId);
    if (!workspace) return notFound("Workspace not found");

    const body = await request.json().catch(() => ({}));
    const validated = publishSchema.parse(body);

    const published = await db.transaction(async (tx) => {
      const [result] = await tx
        .select({ maxVersion: max(specVersions.versionNumber) })
        .from(specVersions)
        .where(
          and(
            eq(specVersions.projectId, projectId),
            eq(specVersions.type, "published")
          )
        );
      const nextVersion = (result?.maxVersion ?? 0) + 1;

      const [pub] = await tx
        .insert(specVersions)
        .values({
          projectId,
          type: "published",
          name: validated.name ?? null,
          description: validated.description ?? null,
          versionNumber: nextVersion,
          publishedAt: new Date(),
          publishedBy: null, // API key auth — no user context
          createdBy: null,
        })
        .returning();

      await cloneSpecData(tx as Parameters<typeof cloneSpecData>[0], workspaceId, pub.id);

      // Delete workspace after publishing
      await tx
        .delete(specVersions)
        .where(eq(specVersions.id, workspaceId));

      return pub;
    });

    return ok(published);
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return serverError(error);
  }
}
