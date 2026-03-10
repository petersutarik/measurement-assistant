import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  getPublishedByVersionNumber,
  getPublishedParameters,
} from "../../../actions";
import { ParametersTable } from "../../../published/parameters/parameters-table";

export default async function VersionParametersPage({
  params,
}: {
  params: Promise<{ id: string; versionNumber: string }>;
}) {
  const { id: projectId, versionNumber: versionParam } = await params;
  const versionNumber = parseInt(versionParam, 10);
  if (isNaN(versionNumber)) notFound();

  const version = await getPublishedByVersionNumber(projectId, versionNumber);
  if (!version) notFound();

  const result = await getPublishedParameters(projectId, version.id);

  if (!result) return null;

  if (result.rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            This version has no parameters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ParametersTable rows={result.rows} />;
}
