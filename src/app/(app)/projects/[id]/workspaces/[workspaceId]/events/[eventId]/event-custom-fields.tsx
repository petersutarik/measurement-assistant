"use client";

import { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomFieldCell } from "@/components/custom-field-cell";
import { upsertCustomFieldValue } from "../../actions";
import type { CustomFieldDefinition } from "@/types";

interface EventCustomFieldsProps {
  projectId: string;
  workspaceId: string;
  eventId: string;
  definitions: CustomFieldDefinition[];
  valueMap: Map<string, unknown>;
}

export function EventCustomFields({
  projectId,
  workspaceId,
  eventId,
  definitions,
  valueMap,
}: EventCustomFieldsProps) {
  const handleSave = useCallback(
    async (definitionId: string, value: unknown) => {
      await upsertCustomFieldValue(
        projectId,
        workspaceId,
        definitionId,
        eventId,
        "event",
        value
      );
    },
    [projectId, workspaceId, eventId]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Custom Fields</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {definitions.map((def) => (
            <div key={def.id} className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {def.name}
              </Label>
              <CustomFieldCell
                definition={def}
                value={valueMap.get(def.id) ?? null}
                onSave={handleSave}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
