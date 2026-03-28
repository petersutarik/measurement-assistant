/**
 * GTM Executor
 *
 * Applies a reconciled changeset to GTM via the CLI.
 * Respects dependency ordering: folder → variables → triggers → tags.
 */

import type {
  GtmContext,
  Changeset,
  DesiredVariable,
  DesiredTrigger,
  DesiredTag,
  DeployedResource,
  DeployError,
  GtmParameter,
} from "./types";
import {
  createFolder,
  createVariable,
  createTrigger,
  createTag,
  apiCreateTag,
  listTriggers,
} from "./cli";

const RATE_LIMIT_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ExecutionResult {
  resources: DeployedResource[];
  errors: DeployError[];
}

export type ProgressCallback = (message: string) => void;

/**
 * Execute the changeset against GTM.
 */
export async function executeChangeset(
  changeset: Changeset,
  ctx: GtmContext,
  onProgress?: ProgressCallback,
): Promise<ExecutionResult> {
  const resources: DeployedResource[] = [];
  const errors: DeployError[] = [];
  const log = onProgress ?? (() => {});

  // ── 1. Folder ───────────────────────────────────────────────────
  let folderId: string | undefined;

  if (changeset.folder.action === "create") {
    log(`Creating folder: ${changeset.folder.name}`);
    try {
      const folder = await createFolder(changeset.folder.name, ctx);
      folderId = folder.folderId;
      resources.push({
        type: "folder",
        name: changeset.folder.name,
        action: "created",
        id: folderId,
      });
    } catch (e) {
      errors.push({
        type: "folder",
        name: changeset.folder.name,
        error: (e as Error).message,
      });
    }
  } else {
    log(`Folder already exists: ${changeset.folder.name}`);
  }

  // ── 2. Variables ────────────────────────────────────────────────
  const toCreateVars = changeset.variables.filter(
    (v) => v.action === "create" || v.action === "update",
  );
  const skippedVars = changeset.variables.filter((v) => v.action === "skip");

  for (const sv of skippedVars) {
    resources.push({
      type: "variable",
      name: sv.name,
      action: "reused",
      id: "existing",
    });
  }

  if (toCreateVars.length > 0) {
    log(`Creating ${toCreateVars.length} variables...`);
  }

  // Create variables sequentially to avoid rate limits
  for (const va of toCreateVars) {
    const dv = va.desired as DesiredVariable;
    try {
      const variable = await createVariable(
        dv.name,
        dv.type,
        { parameter: dv.config },
        ctx,
      );
      resources.push({
        type: "variable",
        name: dv.name,
        action: va.action === "update" ? "updated" : "created",
        id: variable.variableId,
      });
      log(`  ✓ ${dv.name}`);
      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (e) {
      errors.push({
        type: "variable",
        name: dv.name,
        error: (e as Error).message,
      });
      log(`  ✗ ${dv.name}: ${(e as Error).message}`);
    }
  }

  // ── 3. Triggers ─────────────────────────────────────────────────
  const toCreateTriggers = changeset.triggers.filter(
    (t) => t.action === "create" || t.action === "update",
  );
  const skippedTriggers = changeset.triggers.filter(
    (t) => t.action === "skip",
  );

  for (const st of skippedTriggers) {
    resources.push({
      type: "trigger",
      name: st.name,
      action: "reused",
      id: "existing",
    });
  }

  if (toCreateTriggers.length > 0) {
    log(`Creating ${toCreateTriggers.length} triggers...`);
  }

  for (const ta of toCreateTriggers) {
    const dt = ta.desired as DesiredTrigger;
    try {
      const trigger = await createTrigger(
        dt.name,
        dt.type,
        dt.config,
        ctx,
      );
      resources.push({
        type: "trigger",
        name: dt.name,
        action: ta.action === "update" ? "updated" : "created",
        id: trigger.triggerId,
      });
      log(`  ✓ ${dt.name}`);
      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (e) {
      errors.push({
        type: "trigger",
        name: dt.name,
        error: (e as Error).message,
      });
      log(`  ✗ ${dt.name}: ${(e as Error).message}`);
    }
  }

  // ── 4. Tags (need trigger IDs) ─────────────────────────────────
  // Build trigger name → ID lookup from our created resources + fetched list
  const triggerIdByName = new Map<string, string>();

  // Add triggers we just created (we have their IDs already)
  for (const r of resources) {
    if (r.type === "trigger" && r.id !== "existing") {
      triggerIdByName.set(r.name, r.id);
    }
  }

  // Also fetch from workspace to catch existing/reused triggers
  await sleep(RATE_LIMIT_DELAY_MS * 3);
  try {
    const allTriggers = await listTriggers(ctx);
    const triggerList = Array.isArray(allTriggers) ? allTriggers : [];
    for (const t of triggerList) {
      triggerIdByName.set(t.name, t.triggerId);
    }
  } catch {
    log("  (warning: could not fetch trigger list, using created IDs only)");
  }

  // "All Pages" is a built-in trigger with a well-known ID
  if (!triggerIdByName.has("All Pages")) {
    triggerIdByName.set("All Pages", "2147479553");
  }

  // Build config tag name → ID lookup for GA4 event tags
  const configTagIds = new Map<string, string>();

  const toCreateTags = changeset.tags.filter(
    (t) => t.action === "create" || t.action === "update",
  );
  const skippedTags = changeset.tags.filter((t) => t.action === "skip");

  for (const st of skippedTags) {
    resources.push({
      type: "tag",
      name: st.name,
      action: "reused",
      id: "existing",
    });
  }

  // Sort: GA4 Config tags first (other tags depend on them)
  const sortedTags = [...toCreateTags].sort((a, b) => {
    const aIsConfig = (a.desired as DesiredTag)?.type === "gaawc" ? 0 : 1;
    const bIsConfig = (b.desired as DesiredTag)?.type === "gaawc" ? 0 : 1;
    return aIsConfig - bIsConfig;
  });

  if (sortedTags.length > 0) {
    log(`Creating ${sortedTags.length} tags...`);
  }

  for (const ta of sortedTags) {
    const dt = ta.desired as DesiredTag;
    try {
      // Resolve trigger names to IDs
      const firingTriggerIds = resolveTriggerIds(
        dt.firingTriggerNames,
        triggerIdByName,
      );
      if (firingTriggerIds.length === 0) {
        throw new Error(
          `No trigger IDs resolved for: ${dt.firingTriggerNames.join(", ")}`,
        );
      }

      // For GA4 Event tags, inject the config tag reference
      let config: GtmParameter[] = [...dt.config];
      if (dt.configTagName && dt.type === "gaawe") {
        const configTagId = configTagIds.get(dt.configTagName);
        if (configTagId) {
          config.push({
            type: "TEMPLATE",
            key: "measurementId",
            value: "", // cleared when using configTagId
          });
          // The GA4 event tag references config via tagManagerUrl or we use measurementIdOverride
          // measurementIdOverride is already in the config from the generator
        }
      }

      // Use direct API for community template tags (CLI bug with cvt_* types)
      const isVendorTemplate = dt.type.startsWith("cvt_");
      const tag = isVendorTemplate
        ? await apiCreateTag(
            dt.name,
            dt.type,
            { parameter: config },
            firingTriggerIds,
            ctx,
          )
        : await createTag(
            dt.name,
            dt.type,
            { parameter: config },
            firingTriggerIds,
            ctx,
            {
              blockingTriggerIds: dt.blockingTriggerNames
                ? resolveTriggerIds(dt.blockingTriggerNames, triggerIdByName)
                : undefined,
            },
          );

      resources.push({
        type: "tag",
        name: dt.name,
        action: ta.action === "update" ? "updated" : "created",
        id: tag.tagId,
      });

      // Track config tag IDs for event tags
      if (dt.type === "gaawc") {
        configTagIds.set(dt.name, tag.tagId);
      }

      log(`  ✓ ${dt.name}`);
      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (e) {
      errors.push({
        type: "tag",
        name: dt.name,
        error: (e as Error).message,
      });
      log(`  ✗ ${dt.name}: ${(e as Error).message}`);
    }
  }

  return { resources, errors };
}

// ── Helpers ─────────────────────────────────────────────────────────

function resolveTriggerIds(
  names: string[],
  lookup: Map<string, string>,
): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const id = lookup.get(name);
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}
