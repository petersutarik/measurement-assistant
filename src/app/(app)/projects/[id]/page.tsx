import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCode, Send, Layers, ExternalLink, Globe, History } from "lucide-react";
import { getWorkspacesWithEventCounts, getLatestPublished, getPublishedVersions } from "./actions";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { WorkspaceCard } from "./workspace-card";
import { EditVersionDialog } from "./edit-version-dialog";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireUserContext();

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, id), eq(projects.organizationId, organization.id))
    )
    .limit(1);

  if (!project) notFound();

  const [workspacesWithCounts, latestPublished, publishedVersions] = await Promise.all([
    getWorkspacesWithEventCounts(id),
    getLatestPublished(id),
    getPublishedVersions(id),
  ]);
  const workspaceCount = workspacesWithCounts.length;
  const totalEvents = workspacesWithCounts.reduce(
    (sum, w) => sum + w.eventCount,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <Badge variant="secondary">{project.slug}</Badge>
          {latestPublished && (
            <>
              <Badge className="bg-green-600 text-white hover:bg-green-700">
                <Globe className="mr-1 size-3" />
                Live v{latestPublished.versionNumber}
              </Badge>
              <Button variant="outline" size="sm" render={<Link href={`/projects/${id}/published`} />}>
                View published spec
              </Button>
            </>
          )}
        </div>
        {latestPublished?.publishedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Published {latestPublished.publishedAt.toLocaleDateString()}
          </p>
        )}
        {project.description && (
          <p className="text-muted-foreground mt-1">{project.description}</p>
        )}
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
          >
            {project.url}
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Workspaces", value: workspaceCount, icon: FileCode },
          { label: "Destinations", value: "--", icon: Send },
          { label: "Events", value: totalEvents, icon: Layers },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Workspaces</h2>
          <CreateWorkspaceDialog projectId={id} />
        </div>
        {workspacesWithCounts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspacesWithCounts.map((row) => (
              <WorkspaceCard
                key={row.workspace.id}
                projectId={id}
                workspace={row.workspace}
                eventCount={row.eventCount}
                forkedFromVersion={row.forkedFromVersion}
                latestPublishedVersion={latestPublished?.versionNumber ?? null}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                No workspaces yet. Create one to start documenting your
                measurement spec.
              </p>
              <CreateWorkspaceDialog projectId={id} />
            </CardContent>
          </Card>
        )}
      </div>

      {publishedVersions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <History className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Version History</h2>
          </div>
          <div className="space-y-2">
            {publishedVersions.map((version) => (
              <div
                key={version.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Badge variant="secondary" className="shrink-0">
                  v{version.versionNumber}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {version.name || `Version ${version.versionNumber}`}
                  </p>
                  {version.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {version.description}
                    </p>
                  )}
                </div>
                {version.publishedAt && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {version.publishedAt.toLocaleDateString()}
                  </span>
                )}
                <EditVersionDialog projectId={id} version={version} />
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href={`/projects/${id}/published`} />}
                >
                  <ExternalLink className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
