"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { createDocument, getVersionEvents } from "../actions";

interface PublishedVersion {
  id: string;
  name: string | null;
  versionNumber: number | null;
  publishedAt: Date | null;
}

interface VersionEvent {
  id: string;
  name: string;
  category: string | null;
  trigger: string | null;
  description: string | null;
}

export function CreateDocumentForm({
  projectId,
  publishedVersions,
}: {
  projectId: string;
  publishedVersions: PublishedVersion[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [versionEvents, setVersionEvents] = useState<VersionEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    new Set()
  );
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (!selectedVersionId) {
      setVersionEvents([]);
      setSelectedEventIds(new Set());
      return;
    }
    setLoadingEvents(true);
    getVersionEvents(projectId, selectedVersionId)
      .then((events) => {
        setVersionEvents(events);
        setSelectedEventIds(new Set(events.map((e) => e.id)));
      })
      .finally(() => setLoadingEvents(false));
  }, [projectId, selectedVersionId]);

  function toggleEvent(eventId: string) {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  function toggleAll() {
    if (selectedEventIds.size === versionEvents.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(versionEvents.map((e) => e.id)));
    }
  }

  function handleSubmit() {
    if (!title.trim() || !selectedVersionId || selectedEventIds.size === 0) return;
    startTransition(async () => {
      const doc = await createDocument(projectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        specVersionId: selectedVersionId,
        eventIds: [...selectedEventIds],
      });
      router.push(`/projects/${projectId}/documents/${doc.id}`);
    });
  }

  const allSelected =
    versionEvents.length > 0 &&
    selectedEventIds.size === versionEvents.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Implementation Document</CardTitle>
          <CardDescription>
            Create a developer-facing document from a published spec version.
            Events and parameters are frozen at creation time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Checkout Flow Implementation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description for developers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Published Version</Label>
            {publishedVersions.length > 0 ? (
              <Select
                value={selectedVersionId}
                onValueChange={(v) => setSelectedVersionId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a published version" />
                </SelectTrigger>
                <SelectContent>
                  {publishedVersions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.versionNumber}
                      {v.name ? ` — ${v.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed p-4 text-center">
                No published versions available. Publish a workspace first.
              </p>
            )}
          </div>

          {selectedVersionId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Events to include</Label>
                {versionEvents.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={toggleAll}
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </Button>
                )}
              </div>
              {loadingEvents ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : versionEvents.length > 0 ? (
                <div className="space-y-1 max-h-64 overflow-y-auto rounded-md border p-2">
                  {versionEvents.map((event) => (
                    <label
                      key={event.id}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedEventIds.has(event.id)}
                        onCheckedChange={() => toggleEvent(event.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">
                          {event.name}
                        </span>
                        {event.category && (
                          <Badge
                            variant="secondary"
                            className="ml-2 text-[10px] px-1.5 py-0"
                          >
                            {event.category}
                          </Badge>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No events in this version.
                </p>
              )}
              {selectedEventIds.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedEventIds.size} of {versionEvents.length} events
                  selected
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isPending ||
                !title.trim() ||
                !selectedVersionId ||
                selectedEventIds.size === 0
              }
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Document"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
