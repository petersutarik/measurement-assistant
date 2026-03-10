import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import { projects, specVersions, customFieldDefinitions } from "@/lib/db/schema";
import {
  getNextVersionNumber,
  getWorkspaceConflicts,
  getLatestPublished,
} from "../../actions";
import { CreateEventDialog } from "./create-event-dialog";
import { PublishWorkspaceDialog } from "../../publish-workspace-dialog";
import { ConflictSummaryBanner } from "./conflict-summary-banner";
import { WorkspaceTabs } from "./workspace-tabs";

export default async function WorkspaceLayout({
  params,
  children,
}: {
  params: Promise<{ id: string; workspaceId: string }>;
  children: React.ReactNode;
}) {
  const { id: projectId, workspaceId } = await params;
  const { organization } = await requireUserContext();

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

  let forkedFromVersion: number | null = null;
  if (workspace.forkedFromId) {
    const [forkedFrom] = await db
      .select({ versionNumber: specVersions.versionNumber })
      .from(specVersions)
      .where(eq(specVersions.id, workspace.forkedFromId))
      .limit(1);
    forkedFromVersion = forkedFrom?.versionNumber ?? null;
  }

  const [nextVersion, conflicts, latestPublished, cfDefs] = await Promise.all([
    getNextVersionNumber(projectId),
    getWorkspaceConflicts(projectId, workspaceId),
    getLatestPublished(projectId),
    db
      .select()
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.scopeType, "project"),
          eq(customFieldDefinitions.scopeId, projectId)
        )
      )
      .orderBy(customFieldDefinitions.sortOrder),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href={`/projects/${projectId}`} className="hover:underline">
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
            <CreateEventDialog projectId={projectId} workspaceId={workspaceId} customFieldDefinitions={cfDefs} />
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

      <WorkspaceTabs projectId={projectId} workspaceId={workspaceId} />

      {children}
    </div>
  );
}
