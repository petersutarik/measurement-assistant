import { Card, CardContent } from "@/components/ui/card";
import { ScreenContextSetter } from "@/components/assistant/screen-context-setter";
import {
  getWorkspaceParameters,
  getCustomFieldsForWorkspace,
} from "../actions";
import { ParametersTable } from "../../../published/parameters/parameters-table";

export default async function WorkspaceParametersPage({
  params,
}: {
  params: Promise<{ id: string; workspaceId: string }>;
}) {
  const { id: projectId, workspaceId } = await params;

  const [rows, customFields] = await Promise.all([
    getWorkspaceParameters(projectId, workspaceId),
    getCustomFieldsForWorkspace(projectId, workspaceId),
  ]);

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No parameters yet. Add parameters to your events first.
          </p>
        </CardContent>
      </Card>
    );
  }

  const contextData = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    isRequired: r.isRequired,
    events: r.events,
  }));

  return (
    <>
      <ScreenContextSetter
        screen="workspace-parameters"
        projectId={projectId}
        workspaceId={workspaceId}
        view="workspace"
        summary={`Workspace parameters table — ${rows.length} parameters`}
        data={{ parameters: contextData }}
      />
      <ParametersTable
        rows={rows}
        customFieldDefinitions={customFields.definitions}
        customFieldValues={customFields.values}
      />
    </>
  );
}
