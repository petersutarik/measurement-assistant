import { inArray } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { ScreenContextSetter } from "@/components/assistant/screen-context-setter";
import { db } from "@/lib/db";
import {
  customFieldDefinitions,
  customFieldValues,
} from "@/lib/db/schema";
import { getPublishedEventsWithParams } from "../../actions";
import { EventsTable } from "../../workspaces/[workspaceId]/events-table";

export default async function PublishedEventsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const result = await getPublishedEventsWithParams(projectId);
  if (!result) return null;

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

  // Fetch custom field values that exist in this published version's events
  const eventIds = rows.map((r) => r.event.id);
  const cfVals =
    eventIds.length > 0
      ? await db
          .select()
          .from(customFieldValues)
          .where(inArray(customFieldValues.eventId, eventIds))
      : [];

  // Only show definitions that have values in the published version
  const defIdsWithValues = [...new Set(cfVals.map((v) => v.customFieldDefinitionId))];
  const cfDefs =
    defIdsWithValues.length > 0
      ? await db
          .select()
          .from(customFieldDefinitions)
          .where(inArray(customFieldDefinitions.id, defIdsWithValues))
          .orderBy(customFieldDefinitions.sortOrder)
      : [];

  const contextData = rows.map((r) => ({
    name: r.event.name,
    trigger: r.event.trigger,
    category: r.event.category,
    description: r.event.description,
    paramCount: r.params.length,
    paramNames: r.params.map((p) => p.name),
  }));

  return (
    <>
      <ScreenContextSetter
        screen="published-events"
        projectId={projectId}
        view="published"
        summary={`Published events table (v${specVersion.versionNumber}) — ${rows.length} events (read-only)`}
        data={{ events: contextData, version: specVersion.versionNumber }}
      />
      <EventsTable
        projectId={projectId}
        workspaceId={specVersion.id}
        rows={rows}
        readOnly
        customFieldDefinitions={cfDefs}
        customFieldValues={cfVals}
      />
    </>
  );
}
