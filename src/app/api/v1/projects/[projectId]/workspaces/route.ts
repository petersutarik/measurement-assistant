import { eq, and, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { specVersions, events } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { requireApiProject } from "@/lib/api/access";
import {
  ok,
  created,
  notFound,
  validationError,
  serverError,
} from "@/lib/api/response";
import { createWorkspaceSchema } from "@/lib/validators/spec";
import { ZodError } from "zod";

async function requireProject(
  auth: { accountId: string },
  projectId: string
) {
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
    if (!(await requireProject(auth, projectId)))
      return notFound("Project not found");

    const rows = await db
      .select({
        workspace: specVersions,
        eventCount: count(events.id),
      })
      .from(specVersions)
      .leftJoin(events, eq(events.specVersionId, specVersions.id))
      .where(
        and(
          eq(specVersions.projectId, projectId),
          eq(specVersions.type, "workspace")
        )
      )
      .groupBy(specVersions.id)
      .orderBy(specVersions.createdAt);

    return ok(
      rows.map((r) => ({
        ...r.workspace,
        eventCount: Number(r.eventCount),
      }))
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId } = await params;
    if (!(await requireProject(auth, projectId)))
      return notFound("Project not found");

    const body = await request.json();
    const validated = createWorkspaceSchema.parse(body);

    // Find latest published to fork from
    const [latestPublished] = await db
      .select()
      .from(specVersions)
      .where(
        and(
          eq(specVersions.projectId, projectId),
          eq(specVersions.type, "published")
        )
      )
      .orderBy(desc(specVersions.versionNumber))
      .limit(1);

    const [workspace] = await db
      .insert(specVersions)
      .values({
        projectId,
        type: "workspace",
        name: validated.name,
        description: validated.description ?? null,
        forkedFromId: latestPublished?.id ?? null,
        createdBy: null, // API key auth — no user context
      })
      .returning();

    // Clone data from published version if one exists
    if (latestPublished) {
      // Import cloneSpecData inline to avoid circular deps with server actions
      const { cloneSpecData } = await import("@/lib/api/clone");
      await cloneSpecData(db, latestPublished.id, workspace.id);
    }

    return created(workspace);
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return serverError(error);
  }
}
