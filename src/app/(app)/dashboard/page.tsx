import Link from "next/link";
import { requireUserContext } from "@/lib/auth/user-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Globe } from "lucide-react";
import { CreateProjectDialog } from "../projects/create-project-dialog";
import { CreateWorkspaceDialog } from "../projects/[id]/create-workspace-dialog";
import { WorkspaceCard } from "../projects/[id]/workspace-card";
import {
  getWorkspacesWithEventCounts,
  getLatestPublished,
} from "../projects/[id]/actions";
import { getProjects } from "../projects/actions";
import { getProjectFaviconUrl, parseProjectUrl } from "@/lib/project-url";

export default async function DashboardPage() {
  const { user } = await requireUserContext();

  const name = user.name ?? user.email;
  const firstName = name.includes("@")
    ? name.split("@")[0]
    : name.split(" ")[0];

  const allProjects = await getProjects();

  // Load workspaces + published info for each project in parallel
  const projectData = await Promise.all(
    allProjects.map(async (project) => {
      const [workspacesWithCounts, latestPublished] = await Promise.all([
        getWorkspacesWithEventCounts(project.id),
        getLatestPublished(project.id),
      ]);
      return {
        project,
        projectSite: parseProjectUrl(project.url),
        workspacesWithCounts,
        latestPublished,
      };
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your measurement workspace.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Projects</h2>
          <CreateProjectDialog />
        </div>

        {allProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <FolderKanban className="size-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first project to get started.
            </p>
            <div className="mt-4">
              <CreateProjectDialog />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {projectData.map(
              ({
                project,
                projectSite,
                workspacesWithCounts,
                latestPublished,
              }) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {projectSite ? (
                          <img
                            src={getProjectFaviconUrl(projectSite.hostname, 32)}
                            alt=""
                            width={20}
                            height={20}
                            className="shrink-0 rounded"
                          />
                        ) : (
                          <FolderKanban className="size-5 shrink-0 text-muted-foreground" />
                        )}
                        <Link href={`/projects/${project.id}`}>
                          <CardTitle className="text-base hover:underline">
                            {project.name}
                          </CardTitle>
                        </Link>
                        {latestPublished && (
                          <Badge className="bg-green-600 text-white hover:bg-green-700">
                            <Globe className="mr-1 size-3" />
                            Live v{latestPublished.versionNumber}
                          </Badge>
                        )}
                      </div>
                      <CreateWorkspaceDialog projectId={project.id} />
                    </div>
                    {project.description && (
                      <CardDescription>{project.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {workspacesWithCounts.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {workspacesWithCounts.map((row) => (
                          <WorkspaceCard
                            key={row.workspace.id}
                            projectId={project.id}
                            workspace={row.workspace}
                            eventCount={row.eventCount}
                            forkedFromVersion={row.forkedFromVersion}
                            latestPublishedVersion={
                              latestPublished?.versionNumber ?? null
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No workspaces yet. Create one to start documenting.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
