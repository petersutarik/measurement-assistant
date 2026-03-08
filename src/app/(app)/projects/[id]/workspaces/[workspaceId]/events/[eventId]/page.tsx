import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import { projects, specVersions, events } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getParameters } from "./actions";
import { CreateParameterDialog } from "./create-parameter-dialog";
import { ParameterTree } from "./parameter-tree";
import { DataLayerSnippet } from "./datalayer-snippet";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string; workspaceId: string; eventId: string }>;
}) {
  const { id: projectId, workspaceId, eventId } = await params;
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

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.specVersionId, workspaceId)))
    .limit(1);
  if (!event) notFound();

  const parameters = await getParameters(projectId, workspaceId, eventId);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href={`/projects/${projectId}`} className="hover:underline">
            {project.name}
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${projectId}/workspaces/${workspaceId}`}
            className="hover:underline"
          >
            {workspace.name}
          </Link>
          <span>/</span>
          <span>{event.name}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight font-mono">
          {event.name}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {event.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{event.description}</p>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {event.trigger && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Trigger</p>
              <p className="text-sm">{event.trigger}</p>
            </div>
          )}
          {event.category && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Category</p>
              <Badge variant="secondary">{event.category}</Badge>
            </div>
          )}
          {event.pagePattern && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Page Pattern</p>
              <p className="text-sm font-mono">{event.pagePattern}</p>
            </div>
          )}
        </div>
      </div>

      {event.implementationNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Implementation Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {event.implementationNotes}
            </p>
          </CardContent>
        </Card>
      )}

      <DataLayerSnippet eventName={event.name} parameters={parameters} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Parameters</h2>
          <CreateParameterDialog
            projectId={projectId}
            workspaceId={workspaceId}
            eventId={eventId}
          />
        </div>
        {parameters.length > 0 ? (
          <ParameterTree
            parameters={parameters}
            projectId={projectId}
            workspaceId={workspaceId}
            eventId={eventId}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                No parameters yet. Add your first parameter.
              </p>
              <CreateParameterDialog
                projectId={projectId}
                workspaceId={workspaceId}
                eventId={eventId}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
