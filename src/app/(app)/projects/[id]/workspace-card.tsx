"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Layers, GitFork, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditWorkspaceDialog } from "./edit-workspace-dialog";
import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";
import type { SpecVersion } from "@/types";

export function WorkspaceCard({
  projectId,
  workspace,
  eventCount,
  forkedFromVersion,
  latestPublishedVersion,
}: {
  projectId: string;
  workspace: SpecVersion;
  eventCount: number;
  forkedFromVersion?: number | null;
  latestPublishedVersion?: number | null;
}) {
  const isBehind =
    forkedFromVersion != null &&
    latestPublishedVersion != null &&
    forkedFromVersion < latestPublishedVersion;
  return (
    <Card className="group relative">
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <EditWorkspaceDialog projectId={projectId} workspace={workspace} />
        <DeleteWorkspaceDialog projectId={projectId} workspace={workspace} />
      </div>
      <Link href={`/projects/${projectId}/workspaces/${workspace.id}`}>
        <CardHeader>
          <CardTitle className="text-base">{workspace.name}</CardTitle>
          {workspace.description && (
            <CardDescription>{workspace.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Layers className="size-4" />
              <span>
                {eventCount} {eventCount === 1 ? "event" : "events"}
              </span>
            </div>
            {forkedFromVersion && (
              <Badge variant="outline" className="text-xs">
                <GitFork className="mr-1 size-3" />
                from v{forkedFromVersion}
              </Badge>
            )}
            {isBehind && (
              <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
                <AlertTriangle className="mr-1 size-3" />
                behind v{latestPublishedVersion}
              </Badge>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
