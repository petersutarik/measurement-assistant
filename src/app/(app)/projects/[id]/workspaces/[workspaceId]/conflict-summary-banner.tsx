"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ConflictSummary, EventDiff } from "@/lib/conflicts/diff";

function ChangeTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    added_in_latest: {
      label: "Added in live",
      className: "bg-green-100 text-green-800",
    },
    removed_in_latest: {
      label: "Removed from live",
      className: "bg-red-100 text-red-800",
    },
    modified_in_latest: {
      label: "Changed in live",
      className: "bg-blue-100 text-blue-800",
    },
    modified_in_workspace: {
      label: "Changed here",
      className: "bg-purple-100 text-purple-800",
    },
    conflict: {
      label: "Conflict",
      className: "bg-amber-100 text-amber-800",
    },
    new_in_workspace: {
      label: "New here",
      className: "bg-gray-100 text-gray-800",
    },
  };
  const c = config[type] ?? { label: type, className: "bg-gray-100 text-gray-800" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function EventDiffRow({ diff }: { diff: EventDiff }) {
  const [expanded, setExpanded] = useState(false);
  const name = diff.workspaceName ?? diff.latestName ?? diff.baseName ?? "Unknown";
  const hasParamDiffs = diff.parameterDiffs.length > 0;

  return (
    <div className="border-t border-amber-200 first:border-t-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-amber-50/50"
        onClick={() => hasParamDiffs && setExpanded(!expanded)}
        disabled={!hasParamDiffs}
      >
        {hasParamDiffs ? (
          expanded ? (
            <ChevronDown className="size-3 shrink-0" />
          ) : (
            <ChevronRight className="size-3 shrink-0" />
          )
        ) : (
          <span className="size-3 shrink-0" />
        )}
        <code className="font-mono text-xs">{name}</code>
        <ChangeTypeBadge type={diff.changeType} />
        {hasParamDiffs && (
          <span className="text-xs text-muted-foreground">
            {diff.parameterDiffs.length} param{" "}
            {diff.parameterDiffs.length === 1 ? "change" : "changes"}
          </span>
        )}
      </button>
      {expanded && (
        <div className="ml-8 border-l border-amber-200 pb-2">
          {diff.parameterDiffs.map((pd, i) => {
            const paramName =
              pd.workspaceName ?? pd.latestName ?? pd.baseName ?? "Unknown";
            return (
              <div
                key={pd.sourceParameterId ?? i}
                className="flex items-center gap-2 px-3 py-1 text-sm"
              >
                <code className="font-mono text-xs text-muted-foreground">
                  {paramName}
                </code>
                <ChangeTypeBadge type={pd.changeType} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ConflictSummaryBanner({
  summary,
  forkedFromVersion,
  latestVersion,
}: {
  summary: ConflictSummary;
  forkedFromVersion: number;
  latestVersion: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const pills: { label: string; count: number; className: string }[] = [
    {
      label: "Added in live",
      count: summary.addedInLatest,
      className: "bg-green-100 text-green-800",
    },
    {
      label: "Removed from live",
      count: summary.removedInLatest,
      className: "bg-red-100 text-red-800",
    },
    {
      label: "Changed in live",
      count: summary.modifiedInLatest,
      className: "bg-blue-100 text-blue-800",
    },
    {
      label: "Changed here",
      count: summary.modifiedInWorkspace,
      className: "bg-purple-100 text-purple-800",
    },
    {
      label: "Conflicts",
      count: summary.conflicts,
      className: "bg-amber-100 text-amber-800",
    },
    {
      label: "New here",
      count: summary.newInWorkspace,
      className: "bg-gray-100 text-gray-800",
    },
  ].filter((p) => p.count > 0);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50">
      <div className="flex items-start gap-3 px-4 py-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-amber-900">
            This workspace is based on v{forkedFromVersion}. Live is now v
            {latestVersion}.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pills.map((p) => (
              <Badge
                key={p.label}
                variant="outline"
                className={`${p.className} border-0 text-xs`}
              >
                {p.count} {p.label.toLowerCase()}
              </Badge>
            ))}
          </div>
          {summary.eventDiffs.length > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Hide details" : "Show details"}
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-amber-200">
          {summary.eventDiffs.map((diff, i) => (
            <EventDiffRow key={diff.sourceEventId ?? i} diff={diff} />
          ))}
        </div>
      )}
    </div>
  );
}
