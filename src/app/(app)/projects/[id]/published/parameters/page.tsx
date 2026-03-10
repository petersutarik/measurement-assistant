import { inArray } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  customFieldDefinitions,
  customFieldValues,
} from "@/lib/db/schema";
import { getPublishedParameters } from "../../actions";
import { ParametersTable } from "./parameters-table";

export default async function PublishedParametersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const result = await getPublishedParameters(projectId);

  if (!result) {
    return null; // Layout handles the empty state
  }

  if (result.rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            This published version has no parameters.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Fetch custom field values that exist for published parameters
  const paramIds = result.rows.map((r) => r.id);
  const cfVals =
    paramIds.length > 0
      ? await db
          .select()
          .from(customFieldValues)
          .where(inArray(customFieldValues.parameterId, paramIds))
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

  return (
    <ParametersTable
      rows={result.rows}
      customFieldDefinitions={cfDefs}
      customFieldValues={cfVals}
    />
  );
}
