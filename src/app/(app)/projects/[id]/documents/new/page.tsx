import { getPublishedVersions } from "../../actions";
import { CreateDocumentForm } from "./create-document-form";

export default async function NewDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const publishedVersions = await getPublishedVersions(id);

  return <CreateDocumentForm projectId={id} publishedVersions={publishedVersions} />;
}
