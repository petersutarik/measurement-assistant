/**
 * GTM Reconciler
 *
 * Compares desired GTM state against existing resources in the container,
 * producing a changeset of create/update/skip actions.
 *
 * Since we create a new workspace each time, "existing" resources
 * are those published in the container (visible in the new workspace).
 * Resources with [MA] prefix are ours to manage.
 */

import type {
  GtmContext,
  GtmVariable,
  GtmTrigger,
  GtmTag,
  GtmFolder,
  DesiredGtmState,
  DesiredVariable,
  DesiredTrigger,
  DesiredTag,
  Changeset,
  ResourceAction,
} from "./types";
import {
  listVariables,
  listTriggers,
  listTags,
  listFolders,
} from "./cli";

const PREFIX = "[MA]";

export interface ExistingState {
  folders: GtmFolder[];
  variables: GtmVariable[];
  triggers: GtmTrigger[];
  tags: GtmTag[];
}

/**
 * Fetch all existing resources from the workspace.
 */
export async function fetchExistingState(
  ctx: GtmContext,
): Promise<ExistingState> {
  const [folders, variables, triggers, tags] = await Promise.all([
    listFolders(ctx),
    listVariables(ctx),
    listTriggers(ctx),
    listTags(ctx),
  ]);

  return { folders, variables, triggers, tags };
}

/**
 * Reconcile desired state against existing resources.
 * Only compares [MA]-prefixed resources — never touches user-created ones.
 *
 * Also checks for non-[MA] GA4 Config tags with matching measurement IDs
 * to avoid creating duplicate config tags.
 */
export function reconcile(
  desired: DesiredGtmState,
  existing: ExistingState,
): Changeset {
  // ── Folder ──────────────────────────────────────────────────────
  const existingFolder = existing.folders.find(
    (f) => f.name === desired.folderName,
  );
  const folderAction: ResourceAction<{ name: string }> = existingFolder
    ? {
        type: "folder",
        name: desired.folderName,
        action: "skip",
        existing: { name: existingFolder.name },
        reason: "folder already exists",
      }
    : {
        type: "folder",
        name: desired.folderName,
        action: "create",
        desired: { name: desired.folderName },
      };

  // ── Variables ───────────────────────────────────────────────────
  const existingVarsByName = new Map(
    existing.variables
      .filter((v) => v.name.startsWith(PREFIX))
      .map((v) => [v.name, v]),
  );

  const variableActions: ResourceAction<DesiredVariable>[] =
    desired.variables.map((dv) => {
      const ev = existingVarsByName.get(dv.name);
      if (ev) {
        // Check if config matches
        if (variableConfigMatches(dv, ev)) {
          return {
            type: "variable",
            name: dv.name,
            action: "skip",
            existing: dv,
            reason: "exists with matching config",
          };
        }
        return {
          type: "variable",
          name: dv.name,
          action: "update",
          desired: dv,
          existing: dv,
        };
      }
      return {
        type: "variable",
        name: dv.name,
        action: "create",
        desired: dv,
      };
    });

  // ── Triggers ────────────────────────────────────────────────────
  const existingTriggersByName = new Map(
    existing.triggers
      .filter((t) => t.name.startsWith(PREFIX))
      .map((t) => [t.name, t]),
  );

  const triggerActions: ResourceAction<DesiredTrigger>[] =
    desired.triggers.map((dt) => {
      const et = existingTriggersByName.get(dt.name);
      if (et) {
        return {
          type: "trigger",
          name: dt.name,
          action: "skip",
          existing: dt,
          reason: "trigger already exists",
        };
      }
      return {
        type: "trigger",
        name: dt.name,
        action: "create",
        desired: dt,
      };
    });

  // ── Tags ────────────────────────────────────────────────────────
  const existingTagsByName = new Map(
    existing.tags
      .filter((t) => t.name.startsWith(PREFIX))
      .map((t) => [t.name, t]),
  );

  // Also check for non-[MA] GA4 Config tags
  const existingGA4ConfigTags = existing.tags.filter(
    (t) => t.type === "gaawc",
  );

  const tagActions: ResourceAction<DesiredTag>[] = desired.tags.map((dt) => {
    const et = existingTagsByName.get(dt.name);
    if (et) {
      return {
        type: "tag",
        name: dt.name,
        action: "update",
        desired: dt,
        existing: dt,
      };
    }

    // Special case: GA4 Config tag — check if ANY config tag has same measurement ID
    if (dt.type === "gaawc") {
      const measurementIdParam = dt.config.find(
        (p) => p.key === "measurementId",
      );
      if (measurementIdParam) {
        const existingConfig = existingGA4ConfigTags.find((t) =>
          t.parameter?.some(
            (p) =>
              p.key === "measurementId" &&
              p.value === measurementIdParam.value,
          ),
        );
        if (existingConfig) {
          return {
            type: "tag",
            name: dt.name,
            action: "skip",
            reason: `GA4 Config tag with same measurement ID already exists: "${existingConfig.name}"`,
          };
        }
      }
    }

    return {
      type: "tag",
      name: dt.name,
      action: "create",
      desired: dt,
    };
  });

  return {
    folder: folderAction,
    variables: variableActions,
    triggers: triggerActions,
    tags: tagActions,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

function variableConfigMatches(
  desired: DesiredVariable,
  existing: GtmVariable,
): boolean {
  // Compare type
  if (desired.type !== existing.type) return false;

  // Compare key config values
  for (const dp of desired.config) {
    const ep = existing.parameter?.find((p) => p.key === dp.key);
    if (!ep) return false;
    if (dp.value !== undefined && dp.value !== ep.value) return false;
  }

  return true;
}
