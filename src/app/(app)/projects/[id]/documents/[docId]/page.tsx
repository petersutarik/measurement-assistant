import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDocument } from "../actions";
import { EditDocumentDialog } from "./edit-document-dialog";
import { DeleteDocumentButton } from "./delete-document-button";
import { ParameterTree } from "./parameter-tree";

interface SnapshotEvent {
  event: {
    id: string;
    name: string;
    description: string | null;
    trigger: string | null;
    pagePattern: string | null;
    category: string | null;
    implementationNotes: string | null;
    exampleUrls: string[] | null;
  };
  parameters: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    isRequired: boolean;
    exampleValue: string | null;
    origin: string | null;
    parentId: string | null;
  }[];
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = await params;
  const doc = await getDocument(id, docId);

  if (!doc) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2"
          render={<Link href={`/projects/${id}/documents`} />}
        >
          <ArrowLeft className="mr-1 size-3.5" />
          Documents
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
            {doc.description && (
              <p className="text-muted-foreground mt-1">{doc.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              {doc.specVersion && (
                <Badge variant="secondary">
                  Source: v{doc.specVersion.versionNumber}
                  {doc.specVersion.name ? ` — ${doc.specVersion.name}` : ""}
                </Badge>
              )}
              <span className="flex items-center gap-1">
                <Layers className="size-3.5" />
                {doc.snapshotEvents.length} events
              </span>
              {doc.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <EditDocumentDialog projectId={id} doc={doc} />
            <DeleteDocumentButton projectId={id} docId={doc.id} />
          </div>
        </div>
      </div>

      {/* Events table */}
      {doc.snapshotEvents.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Event</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-[300px]">Description</TableHead>
                <TableHead>Parameters</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doc.snapshotEvents.map((row) => {
                const snapshot = row.snapshotData as SnapshotEvent;
                const event = snapshot.event;
                const params = snapshot.parameters ?? [];

                return (
                  <TableRow key={row.id} className="align-top">
                    <TableCell className="font-medium font-mono text-sm">
                      {event.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {event.trigger || "—"}
                    </TableCell>
                    <TableCell>
                      {event.category ? (
                        <Badge variant="secondary" className="text-xs">
                          {event.category}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {event.description || "—"}
                      {event.implementationNotes && (
                        <p className="mt-1 text-xs italic">
                          {event.implementationNotes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {params.length > 0 ? (
                        <ParameterTree parameters={params} />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          None
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          No events in this document.
        </p>
      )}
    </div>
  );
}
