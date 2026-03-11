import { Card, CardContent } from "@/components/ui/card";
import { ScreenContextSetter } from "@/components/assistant/screen-context-setter";
import { getEventsWithParams, getCustomFieldsForWorkspace } from "../actions";
import { CreateEventDialog } from "../create-event-dialog";
import { EventsTable } from "../events-table";

export default async function WorkspaceEventsPage({
  params,
}: {
  params: Promise<{ id: string; workspaceId: string }>;
}) {
  const { id: projectId, workspaceId } = await params;

  const [eventsWithParams, customFields] = await Promise.all([
    getEventsWithParams(projectId, workspaceId),
    getCustomFieldsForWorkspace(projectId, workspaceId),
  ]);

  if (eventsWithParams.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            No events yet. Add your first dataLayer event.
          </p>
          <CreateEventDialog projectId={projectId} workspaceId={workspaceId} customFieldDefinitions={customFields.definitions} />
        </CardContent>
      </Card>
    );
  }

  const contextData = eventsWithParams.map((r) => ({
    id: r.event.id,
    name: r.event.name,
    trigger: r.event.trigger,
    category: r.event.category,
    description: r.event.description,
    params: r.params.map((p) => ({ id: p.id, name: p.name, type: p.type })),
  }));

  return (
    <>
      <ScreenContextSetter
        screen="workspace-events"
        projectId={projectId}
        workspaceId={workspaceId}
        view="workspace"
        summary={`Workspace events table — ${eventsWithParams.length} events`}
        data={{ events: contextData }}
      />
      <EventsTable
        projectId={projectId}
        workspaceId={workspaceId}
        rows={eventsWithParams}
        customFieldDefinitions={customFields.definitions}
        customFieldValues={customFields.values}
      />
    </>
  );
}
