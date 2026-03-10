import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { getDestinations } from "./actions";
import { DestinationActions } from "./destination-actions";

export default async function DestinationsPage() {
  const destinations = await getDestinations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Destinations</h1>
          <p className="text-muted-foreground text-sm">
            Destination platforms for your measurement implementations (GA4,
            Meta, etc.).
          </p>
        </div>
        <DestinationActions type="create" />
      </div>

      {destinations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((dest) => (
            <Card key={dest.id} className="group relative flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2">
                  {dest.iconUrl ? (
                    <img
                      src={dest.iconUrl}
                      alt=""
                      className="size-4 shrink-0"
                    />
                  ) : (
                    <Send className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <CardTitle className="text-base truncate">
                    {dest.name}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {dest.scopeType === "system" ? "System" : "Custom"}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {dest.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {dest.eventCount} event{dest.eventCount !== 1 ? "s" : ""}
                </p>
                <DestinationActions
                  type="row"
                  destinationId={dest.id}
                  destinationName={dest.name}
                  destinationDescription={dest.description}
                  destinationDocsUrl={dest.docsUrl}
                  destinationIconUrl={dest.iconUrl}
                  isSystem={dest.scopeType === "system"}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Send className="mx-auto size-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No destinations yet. Create one to define your measurement
              platforms.
            </p>
            <DestinationActions type="create" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
