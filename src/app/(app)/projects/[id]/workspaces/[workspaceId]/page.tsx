import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import { projects, specVersions } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { getEventsWithParams } from "./actions";
import {
  getNextVersionNumber,
  getWorkspaceConflicts,
  getLatestPublished,
} from "../../actions";
import { CreateEventDialog } from "./create-event-dialog";
import { PublishWorkspaceDialog } from "../../publish-workspace-dialog";
import { EventsTable } from "./events-table";
import { ConflictSummaryBanner } from "./conflict-summary-banner";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string; workspaceId: string }>;
}) {
  const { id: projectId, workspaceId } = await params;
  const { organization } = await requireUserContext();

  // Verify ownership chain
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.organizationId, organization.id))
    )
    .limit(1);
  if (!project) notFound();

  const [workspace] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.id, workspaceId),
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "workspace")
      )
    )
    .limit(1);
  if (!workspace) notFound();

  // Look up the version number of the spec this workspace forked from
  let forkedFromVersion: number | null = null;
  if (workspace.forkedFromId) {
    const [forkedFrom] = await db
      .select({ versionNumber: specVersions.versionNumber })
      .from(specVersions)
      .where(eq(specVersions.id, workspace.forkedFromId))
      .limit(1);
    forkedFromVersion = forkedFrom?.versionNumber ?? null;
  }

  const [eventsWithParams, nextVersion, conflicts, latestPublished] =
    await Promise.all([
      getEventsWithParams(projectId, workspaceId),
      getNextVersionNumber(projectId),
      getWorkspaceConflicts(projectId, workspaceId),
      getLatestPublished(projectId),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link
            href={`/projects/${projectId}`}
            className="hover:underline"
          >
            {project.name}
          </Link>
          <span>/</span>
          <span>{workspace.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {workspace.name}
            </h1>
            {workspace.description && (
              <p className="text-muted-foreground mt-1">
                {workspace.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <PublishWorkspaceDialog
              projectId={projectId}
              workspaceId={workspaceId}
              workspaceName={workspace.name ?? ""}
              nextVersion={nextVersion}
            />
            <CreateEventDialog projectId={projectId} workspaceId={workspaceId} />
          </div>
        </div>
      </div>

      {conflicts && forkedFromVersion != null && latestPublished?.versionNumber && (
        <ConflictSummaryBanner
          summary={conflicts}
          forkedFromVersion={forkedFromVersion}
          latestVersion={latestPublished.versionNumber}
        />
      )}

      {eventsWithParams.length > 0 ? (
        <EventsTable
          projectId={projectId}
          workspaceId={workspaceId}
          rows={eventsWithParams}
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No events yet. Add your first dataLayer event.
            </p>
            <CreateEventDialog projectId={projectId} workspaceId={workspaceId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
