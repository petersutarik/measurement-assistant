export type EventChangeType =
  | "added_in_latest"
  | "removed_in_latest"
  | "modified_in_latest"
  | "modified_in_workspace"
  | "conflict"
  | "new_in_workspace"
  | "unchanged";

export type ParameterDiff = {
  sourceParameterId: string | null;
  changeType: EventChangeType;
  baseName?: string;
  workspaceName?: string;
  latestName?: string;
};

export type EventDiff = {
  sourceEventId: string | null;
  changeType: EventChangeType;
  baseName?: string;
  workspaceName?: string;
  latestName?: string;
  parameterDiffs: ParameterDiff[];
};

export type ConflictSummary = {
  totalChanges: number;
  addedInLatest: number;
  removedInLatest: number;
  modifiedInLatest: number;
  modifiedInWorkspace: number;
  conflicts: number;
  newInWorkspace: number;
  eventDiffs: EventDiff[];
};

export type VersionEvent = {
  id: string;
  sourceEventId: string | null;
  name: string;
  description: string | null;
  trigger: string | null;
  pagePattern: string | null;
  category: string | null;
  implementationNotes: string | null;
};

export type VersionParameter = {
  id: string;
  eventId: string;
  sourceParameterId: string | null;
  name: string;
  type: string;
  description: string | null;
  isRequired: boolean;
  exampleValue: string | null;
  origin: string | null;
};

export type VersionData = {
  events: VersionEvent[];
  parameters: VersionParameter[];
};

const EVENT_COMPARE_FIELDS = [
  "name",
  "description",
  "trigger",
  "pagePattern",
  "category",
  "implementationNotes",
] as const;

const PARAM_COMPARE_FIELDS = [
  "name",
  "type",
  "description",
  "isRequired",
  "exampleValue",
  "origin",
] as const;

function eventsEqual(a: VersionEvent, b: VersionEvent): boolean {
  return EVENT_COMPARE_FIELDS.every(
    (f) => (a[f] ?? null) === (b[f] ?? null)
  );
}

function paramsEqual(a: VersionParameter, b: VersionParameter): boolean {
  return PARAM_COMPARE_FIELDS.every(
    (f) => (a[f] ?? null) === (b[f] ?? null)
  );
}

/** Index events by sourceEventId. Events with null sourceEventId are keyed by their own id prefixed with "self:" */
function indexEvents(
  evts: VersionEvent[]
): Map<string, VersionEvent> {
  const map = new Map<string, VersionEvent>();
  for (const e of evts) {
    const key = e.sourceEventId ?? `self:${e.id}`;
    map.set(key, e);
  }
  return map;
}

/** Index parameters by sourceParameterId, grouped by event sourceEventId */
function indexParams(
  params: VersionParameter[],
  eventMap: Map<string, VersionEvent>
): Map<string, Map<string, VersionParameter>> {
  // Build eventId→sourceEventId lookup
  const eventIdToSource = new Map<string, string>();
  for (const e of eventMap.values()) {
    const key = e.sourceEventId ?? `self:${e.id}`;
    eventIdToSource.set(e.id, key);
  }

  const result = new Map<string, Map<string, VersionParameter>>();
  for (const p of params) {
    const eventKey = eventIdToSource.get(p.eventId);
    if (!eventKey) continue;
    if (!result.has(eventKey)) result.set(eventKey, new Map());
    const paramKey = p.sourceParameterId ?? `self:${p.id}`;
    result.get(eventKey)!.set(paramKey, p);
  }
  return result;
}

function diffParameters(
  baseParams: Map<string, VersionParameter> | undefined,
  wsParams: Map<string, VersionParameter> | undefined,
  latestParams: Map<string, VersionParameter> | undefined
): ParameterDiff[] {
  const allKeys = new Set<string>();
  baseParams?.forEach((_, k) => allKeys.add(k));
  wsParams?.forEach((_, k) => allKeys.add(k));
  latestParams?.forEach((_, k) => allKeys.add(k));

  const diffs: ParameterDiff[] = [];

  for (const key of allKeys) {
    // Skip workspace-only params with "self:" prefix — they're new in workspace
    if (key.startsWith("self:")) {
      const ws = wsParams?.get(key);
      if (ws) {
        diffs.push({
          sourceParameterId: null,
          changeType: "new_in_workspace",
          workspaceName: ws.name,
        });
      }
      continue;
    }

    const base = baseParams?.get(key);
    const ws = wsParams?.get(key);
    const latest = latestParams?.get(key);

    const sourceParameterId = key;

    if (!base && !ws && latest) {
      diffs.push({
        sourceParameterId,
        changeType: "added_in_latest",
        latestName: latest.name,
      });
    } else if (base && !latest) {
      diffs.push({
        sourceParameterId,
        changeType: "removed_in_latest",
        baseName: base.name,
        workspaceName: ws?.name,
      });
    } else if (base && ws && latest) {
      const baseEqWs = paramsEqual(base, ws);
      const baseEqLatest = paramsEqual(base, latest);
      if (baseEqWs && baseEqLatest) {
        // unchanged — skip
      } else if (baseEqWs && !baseEqLatest) {
        diffs.push({
          sourceParameterId,
          changeType: "modified_in_latest",
          baseName: base.name,
          workspaceName: ws.name,
          latestName: latest.name,
        });
      } else if (!baseEqWs && baseEqLatest) {
        diffs.push({
          sourceParameterId,
          changeType: "modified_in_workspace",
          baseName: base.name,
          workspaceName: ws.name,
          latestName: latest.name,
        });
      } else {
        diffs.push({
          sourceParameterId,
          changeType: "conflict",
          baseName: base.name,
          workspaceName: ws.name,
          latestName: latest.name,
        });
      }
    }
  }

  return diffs;
}

export function computeThreeWayDiff(input: {
  base: VersionData;
  workspace: VersionData;
  latest: VersionData;
}): ConflictSummary {
  const { base, workspace, latest } = input;

  const baseEvents = indexEvents(base.events);
  const wsEvents = indexEvents(workspace.events);
  const latestEvents = indexEvents(latest.events);

  const baseParamsByEvent = indexParams(base.parameters, baseEvents);
  const wsParamsByEvent = indexParams(workspace.parameters, wsEvents);
  const latestParamsByEvent = indexParams(latest.parameters, latestEvents);

  // Collect all event keys across all three sets
  const allEventKeys = new Set<string>();
  baseEvents.forEach((_, k) => allEventKeys.add(k));
  wsEvents.forEach((_, k) => allEventKeys.add(k));
  latestEvents.forEach((_, k) => allEventKeys.add(k));

  const eventDiffs: EventDiff[] = [];

  for (const key of allEventKeys) {
    // "self:" keys in workspace only → new_in_workspace
    if (key.startsWith("self:")) {
      const ws = wsEvents.get(key);
      if (ws) {
        const paramDiffs = diffParameters(
          undefined,
          wsParamsByEvent.get(key),
          undefined
        );
        eventDiffs.push({
          sourceEventId: null,
          changeType: "new_in_workspace",
          workspaceName: ws.name,
          parameterDiffs: paramDiffs,
        });
      }
      continue;
    }

    const baseEvt = baseEvents.get(key);
    const wsEvt = wsEvents.get(key);
    const latestEvt = latestEvents.get(key);

    const paramDiffs = diffParameters(
      baseParamsByEvent.get(key),
      wsParamsByEvent.get(key),
      latestParamsByEvent.get(key)
    );

    if (!baseEvt && !wsEvt && latestEvt) {
      // Added in latest only
      eventDiffs.push({
        sourceEventId: key,
        changeType: "added_in_latest",
        latestName: latestEvt.name,
        parameterDiffs: paramDiffs,
      });
    } else if (baseEvt && !latestEvt) {
      // Removed from latest
      eventDiffs.push({
        sourceEventId: key,
        changeType: "removed_in_latest",
        baseName: baseEvt.name,
        workspaceName: wsEvt?.name,
        parameterDiffs: paramDiffs,
      });
    } else if (baseEvt && wsEvt && latestEvt) {
      const baseEqWs = eventsEqual(baseEvt, wsEvt);
      const baseEqLatest = eventsEqual(baseEvt, latestEvt);

      let changeType: EventChangeType;
      if (baseEqWs && baseEqLatest && paramDiffs.length === 0) {
        changeType = "unchanged";
      } else if (baseEqWs && !baseEqLatest) {
        changeType = "modified_in_latest";
      } else if (!baseEqWs && baseEqLatest) {
        changeType = "modified_in_workspace";
      } else if (!baseEqWs && !baseEqLatest) {
        changeType = "conflict";
      } else {
        // Event fields unchanged but param diffs exist
        // Determine from param diffs
        const hasLatestChanges = paramDiffs.some(
          (d) =>
            d.changeType === "added_in_latest" ||
            d.changeType === "removed_in_latest" ||
            d.changeType === "modified_in_latest"
        );
        const hasWsChanges = paramDiffs.some(
          (d) =>
            d.changeType === "modified_in_workspace" ||
            d.changeType === "new_in_workspace"
        );
        const hasConflicts = paramDiffs.some(
          (d) => d.changeType === "conflict"
        );

        if (hasConflicts) changeType = "conflict";
        else if (hasLatestChanges && hasWsChanges) changeType = "conflict";
        else if (hasLatestChanges) changeType = "modified_in_latest";
        else if (hasWsChanges) changeType = "modified_in_workspace";
        else changeType = "unchanged";
      }

      if (changeType !== "unchanged") {
        eventDiffs.push({
          sourceEventId: key,
          changeType,
          baseName: baseEvt.name,
          workspaceName: wsEvt.name,
          latestName: latestEvt.name,
          parameterDiffs: paramDiffs,
        });
      }
    }
  }

  const summary: ConflictSummary = {
    totalChanges: eventDiffs.length,
    addedInLatest: eventDiffs.filter((d) => d.changeType === "added_in_latest").length,
    removedInLatest: eventDiffs.filter((d) => d.changeType === "removed_in_latest").length,
    modifiedInLatest: eventDiffs.filter((d) => d.changeType === "modified_in_latest").length,
    modifiedInWorkspace: eventDiffs.filter((d) => d.changeType === "modified_in_workspace").length,
    conflicts: eventDiffs.filter((d) => d.changeType === "conflict").length,
    newInWorkspace: eventDiffs.filter((d) => d.changeType === "new_in_workspace").length,
    eventDiffs,
  };

  return summary;
}
