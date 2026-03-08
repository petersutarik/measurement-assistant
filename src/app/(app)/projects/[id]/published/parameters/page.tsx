import { Card, CardContent } from "@/components/ui/card";
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

  return <ParametersTable rows={result.rows} />;
}
