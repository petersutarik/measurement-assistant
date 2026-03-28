import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import Link from "next/link";
import { getProjectDestinations, getAvailableDestinations } from "./actions";
import { DestinationActions } from "./destination-actions";

export default async function DestinationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const [projectDests, availableDests] = await Promise.all([
    getProjectDestinations(projectId),
    getAvailableDestinations(projectId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Destinations</h1>
          <p className="text-muted-foreground text-sm">
            Measurement platforms for this project. Add a destination to map
            your events to platform-specific implementations.
          </p>
        </div>
        <DestinationActions
          type="add"
          projectId={projectId}
          availableDestinations={availableDests}
        />
      </div>

      {projectDests.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectDests.map((pd) => (
            <Link
              key={pd.id}
              href={`/projects/${projectId}/destinations/${pd.id}`}
            >
              <Card className="group relative flex flex-col hover:border-foreground/20 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {pd.iconUrl ? (
                      <img
                        src={pd.iconUrl}
                        alt=""
                        className="size-4 shrink-0"
                      />
                    ) : (
                      <Send className="size-4 text-muted-foreground shrink-0" />
                    )}
                    <CardTitle className="text-base truncate">
                      {pd.name}
                    </CardTitle>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {pd.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {pd.mappedEventCount} event
                    {pd.mappedEventCount !== 1 ? "s" : ""} mapped
                  </p>
                  <DestinationActions
                    type="remove"
                    projectId={projectId}
                    projectDestinationId={pd.id}
                    destinationName={pd.name}
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Send className="mx-auto size-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No destinations added yet. Add one to start mapping your events to
              measurement platforms.
            </p>
            <DestinationActions
              type="add"
              projectId={projectId}
              availableDestinations={availableDests}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
