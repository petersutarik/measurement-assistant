import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { specVersions, events, parameters } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { requireApiProject } from "@/lib/api/access";
import { ok, notFound, serverError } from "@/lib/api/response";

/**
 * GET /api/v1/projects/:projectId/published
 *
 * Returns the latest published version with all events and parameters.
 * This is the "current source of truth" endpoint — what's live.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { projectId } = await params;
    const project = await requireApiProject(auth, projectId);
    if (!project) return notFound("Project not found");

    const [published] = await db
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

    if (!published) {
      return ok({ version: null, events: [] });
    }

    const allEvents = await db
      .select()
      .from(events)
      .where(eq(events.specVersionId, published.id))
      .orderBy(events.sortOrder);

    const eventIds = allEvents.map((e) => e.id);
    const allParams =
      eventIds.length > 0
        ? await db
            .select()
            .from(parameters)
            .where(inArray(parameters.eventId, eventIds))
            .orderBy(parameters.sortOrder)
        : [];

    const paramsByEvent = new Map<string, typeof allParams>();
    for (const p of allParams) {
      const existing = paramsByEvent.get(p.eventId);
      if (existing) existing.push(p);
      else paramsByEvent.set(p.eventId, [p]);
    }

    return ok({
      version: published,
      events: allEvents.map((event) => ({
        ...event,
        parameters: paramsByEvent.get(event.id) ?? [],
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}
