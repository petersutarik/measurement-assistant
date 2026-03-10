import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  getPublishedByVersionNumber,
  getPublishedEventsWithParams,
} from "../../../actions";
import { EventsTable } from "../../../workspaces/[workspaceId]/events-table";

export default async function VersionEventsPage({
  params,
}: {
  params: Promise<{ id: string; versionNumber: string }>;
}) {
  const { id: projectId, versionNumber: versionParam } = await params;
  const versionNumber = parseInt(versionParam, 10);
  if (isNaN(versionNumber)) notFound();

  const version = await getPublishedByVersionNumber(projectId, versionNumber);
  if (!version) notFound();

  const result = await getPublishedEventsWithParams(projectId, version.id);

  if (!result) return null;

  if (result.rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            This version has no events.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <EventsTable
      projectId={projectId}
      workspaceId={result.specVersion.id}
      rows={result.rows}
      readOnly
    />
  );
}
