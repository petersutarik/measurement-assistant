import { Card, CardContent } from "@/components/ui/card";
import { getPublishedEventsWithParams } from "../../actions";
import { EventsTable } from "../../workspaces/[workspaceId]/events-table";

export default async function PublishedEventsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const result = await getPublishedEventsWithParams(projectId);

  if (!result) {
    return null; // Layout handles the empty state
  }

  const { specVersion, rows } = result;

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            This published version has no events.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <EventsTable
      projectId={projectId}
      workspaceId={specVersion.id}
      rows={rows}
      readOnly
    />
  );
}
