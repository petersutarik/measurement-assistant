import { getCustomFieldDefinitions } from "./actions";
import { CustomFieldsManager } from "./custom-fields-manager";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const definitions = await getCustomFieldDefinitions(projectId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure custom fields for events and parameters.
        </p>
      </div>
      <CustomFieldsManager projectId={projectId} definitions={definitions} />
    </div>
  );
}
