import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, Trash2, Calendar, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDocuments, deleteDocument } from "./actions";
import { DeleteDocumentButton } from "./delete-document-button";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const documents = await getDocuments(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Developer-facing implementation documents from published specs
          </p>
        </div>
        <Button render={<Link href={`/projects/${id}/documents/new`} />}>
          <Plus className="mr-2 size-4" />
          New Document
        </Button>
      </div>

      {documents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="group relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/projects/${id}/documents/${doc.id}`}
                    className="min-w-0 flex-1"
                  >
                    <CardTitle className="text-base truncate hover:underline">
                      {doc.title}
                    </CardTitle>
                  </Link>
                  <DeleteDocumentButton projectId={id} docId={doc.id} />
                </div>
                {doc.description && (
                  <CardDescription className="line-clamp-2">
                    {doc.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {doc.specVersion && (
                    <Badge variant="secondary" className="text-xs">
                      v{doc.specVersion.versionNumber}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1">
                    <Layers className="size-3" />
                    {doc.eventCount} events
                  </span>
                  {doc.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto size-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">No documents yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create a document from a published spec version to share with
              developers.
            </p>
            <Button render={<Link href={`/projects/${id}/documents/new`} />}>
              <Plus className="mr-2 size-4" />
              New Document
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
