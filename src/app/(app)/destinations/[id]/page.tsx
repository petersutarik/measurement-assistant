import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ArrowLeft, ExternalLink, Send } from "lucide-react";
import { getDestination } from "./actions";
import { DestinationDetailActions } from "./detail-actions";

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const destination = await getDestination(id);
  if (!destination) notFound();

  const isEditable = destination.scopeType !== "system";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/destinations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {destination.iconUrl ? (
              <img src={destination.iconUrl} alt="" className="size-5" />
            ) : (
              <Send className="size-5 text-muted-foreground" />
            )}
            <h1 className="text-2xl font-bold tracking-tight">
              {destination.name}
            </h1>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              {destination.scopeType === "system" ? "System" : "Custom"}
            </Badge>
          </div>
          {destination.description && (
            <p className="text-muted-foreground text-sm mt-1">
              {destination.description}
            </p>
          )}
          {destination.docsUrl && (
            <a
              href={destination.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs underline underline-offset-4 inline-flex items-center gap-1 mt-1"
            >
              Documentation
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>
                {destination.events.length} event
                {destination.events.length !== 1 ? "s" : ""} defined for this
                destination.
              </CardDescription>
            </div>
            {isEditable && (
              <DestinationDetailActions
                type="createEvent"
                destinationId={destination.id}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {destination.events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead className="text-right">Standard</TableHead>
                  {isEditable && (
                    <TableHead className="w-10" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {destination.events.map((event) => (
                  <DestinationDetailActions
                    key={event.id}
                    type="eventRow"
                    event={event}
                    isEditable={isEditable}
                    destinationId={destination.id}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No events defined yet.
              {isEditable && " Add one to get started."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
