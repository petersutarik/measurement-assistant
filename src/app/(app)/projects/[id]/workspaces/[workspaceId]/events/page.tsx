import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <EventsTable
      projectId={projectId}
      workspaceId={workspaceId}
      rows={eventsWithParams}
      customFieldDefinitions={customFields.definitions}
      customFieldValues={customFields.values}
    />
  );
}
