import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ArrowRight, ExternalLink, Send } from "lucide-react";
import {
  getProjectDestinationDetail,
  getCatalogEvents,
  getSpecEvents,
  getSpecEventParams,
  getDestinationEventParams,
} from "./actions";
import {
  AddMappingButton,
  GenerateFromPlanButton,
  MappingRow,
} from "./detail-actions";

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ id: string; destId: string }>;
}) {
  const { id: projectId, destId: projectDestinationId } = await params;
  const detail = await getProjectDestinationDetail(
    projectId,
    projectDestinationId,
  );
  if (!detail) notFound();

  const [catalogEvents, specEvents] = await Promise.all([
    getCatalogEvents(projectId, detail.destinationId),
    getSpecEvents(projectId),
  ]);

  // Load params for all unique source and dest events
  const uniqueSpecEventIds = [
    ...new Set(detail.mappings.map((m) => m.sourceEvent.id)),
  ];
  const uniqueDestEventIds = [
    ...new Set(detail.mappings.map((m) => m.destEvent.id)),
  ];

  const [specParamsByEvent, destParamsByEvent] = await Promise.all([
    Promise.all(
      uniqueSpecEventIds.map(async (eid) => ({
        eventId: eid,
        params: await getSpecEventParams(projectId, eid),
      })),
    ),
    Promise.all(
      uniqueDestEventIds.map(async (eid) => ({
        eventId: eid,
        params: await getDestinationEventParams(projectId, eid),
      })),
    ),
  ]);

  const specParamsMap = new Map(
    specParamsByEvent.map((e) => [e.eventId, e.params]),
  );
  const destParamsMap = new Map(
    destParamsByEvent.map((e) => [e.eventId, e.params]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}/destinations`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {detail.destination.iconUrl ? (
              <img
                src={detail.destination.iconUrl}
                alt=""
                className="size-5"
              />
            ) : (
              <Send className="size-5 text-muted-foreground" />
            )}
            <h1 className="text-2xl font-bold tracking-tight">
              {detail.destination.name}
            </h1>
          </div>
          {detail.destination.description && (
            <p className="text-muted-foreground text-sm mt-1">
              {detail.destination.description}
            </p>
          )}
          {detail.destination.docsUrl && (
            <a
              href={detail.destination.docsUrl}
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
              <CardTitle>Event Mappings</CardTitle>
              <CardDescription>
                {detail.mappings.length} event
                {detail.mappings.length !== 1 ? "s" : ""} mapped from your spec
                to {detail.destination.name}.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <GenerateFromPlanButton
                projectId={projectId}
                projectDestinationId={projectDestinationId}
                hasSpecEvents={specEvents.length > 0}
              />
              <AddMappingButton
                projectId={projectId}
                projectDestinationId={projectDestinationId}
                specEvents={specEvents}
                catalogEvents={catalogEvents}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {detail.mappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Event</TableHead>
                  <TableHead className="w-8" />
                  <TableHead>Destination Event</TableHead>
                  <TableHead className="text-right">Params</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.mappings.map((mapping) => (
                  <MappingRow
                    key={mapping.id}
                    mapping={mapping}
                    projectId={projectId}
                    projectDestinationId={projectDestinationId}
                    catalogEvents={catalogEvents}
                    specParams={
                      specParamsMap.get(mapping.sourceEvent.id) ?? []
                    }
                    destParams={
                      destParamsMap.get(mapping.destEvent.id) ?? []
                    }
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>No event mappings yet.</p>
              <p className="mt-1">
                {specEvents.length > 0
                  ? "Add events manually or generate mappings from your measurement plan."
                  : "Create spec events first (from a measurement plan), then map them here."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
