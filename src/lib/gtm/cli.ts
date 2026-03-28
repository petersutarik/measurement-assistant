/**
 * GTM CLI Wrapper
 *
 * Thin wrapper around the `gtm` CLI tool for managing
 * Google Tag Manager resources via the API.
 */

import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type {
  GtmContext,
  GtmFolder,
  GtmVariable,
  GtmTrigger,
  GtmTag,
  GtmTemplate,
  GtmParameter,
} from "./types";

const GTM_CLI_PATH = join(homedir(), ".local/bin/gtm");
const GTM_CREDENTIALS_PATH = join(
  homedir(),
  ".config/gtm-cli/credentials.json",
);

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Extract JSON from CLI output that may contain status messages
 * and upgrade notices around the actual JSON payload.
 */
function extractJson(output: string): string {
  // Try to find JSON object or array in the output
  const jsonStart = output.indexOf("{") !== -1 ? output.indexOf("{") : output.indexOf("[");
  if (jsonStart === -1) return output;

  // Find the matching closing bracket
  const openChar = output[jsonStart];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let jsonEnd = -1;

  for (let i = jsonStart; i < output.length; i++) {
    if (output[i] === openChar) depth++;
    else if (output[i] === closeChar) depth--;
    if (depth === 0) {
      jsonEnd = i;
      break;
    }
  }

  if (jsonEnd === -1) return output;
  return output.slice(jsonStart, jsonEnd + 1);
}

// ── Core executor ───────────────────────────────────────────────────

export async function gtmExec(
  args: string[],
  ctx?: Partial<GtmContext>,
): Promise<unknown> {
  const fullArgs = [...args, "-o", "json"];

  if (ctx?.accountId) fullArgs.push("--account-id", ctx.accountId);
  if (ctx?.containerId) fullArgs.push("--container-id", ctx.containerId);
  if (ctx?.workspaceId)
    fullArgs.push("--workspace-id", ctx.workspaceId);

  return new Promise((resolve, reject) => {
    execFile(
      GTM_CLI_PATH,
      fullArgs,
      { maxBuffer: 10 * 1024 * 1024, timeout: 30_000 },
      (error, stdout, stderr) => {
        if (error) {
          const msg = stderr?.trim() || stdout?.trim() || error.message;
          reject(new Error(`gtm ${args.join(" ")} failed: ${msg}`));
          return;
        }
        try {
          resolve(JSON.parse(extractJson(stdout)));
        } catch {
          // Some commands return empty output on success
          resolve(stdout.trim() || null);
        }
      },
    );
  });
}

// ── Accounts & Containers ───────────────────────────────────────────

export interface GtmAccount {
  accountId: string;
  name: string;
}

export interface GtmContainer {
  accountId: string;
  containerId: string;
  name: string;
  publicId: string;
}

export async function listAccounts(): Promise<GtmAccount[]> {
  return (await gtmExec(["accounts", "list"])) as GtmAccount[];
}

export async function listContainers(
  accountId: string,
): Promise<GtmContainer[]> {
  return (await gtmExec(["containers", "list"], {
    accountId,
  })) as GtmContainer[];
}

// ── Workspaces ──────────────────────────────────────────────────────

export interface GtmWorkspace {
  workspaceId: string;
  name: string;
  description?: string;
}

export async function listWorkspaces(
  ctx: Pick<GtmContext, "accountId" | "containerId">,
): Promise<GtmWorkspace[]> {
  return (await gtmExec(["workspaces", "list"], ctx)) as GtmWorkspace[];
}

export async function createWorkspace(
  name: string,
  ctx: Pick<GtmContext, "accountId" | "containerId">,
): Promise<GtmWorkspace> {
  return (await gtmExec(
    ["workspaces", "create", "--name", name],
    ctx,
  )) as GtmWorkspace;
}

// ── Folders ─────────────────────────────────────────────────────────

export async function listFolders(ctx: GtmContext): Promise<GtmFolder[]> {
  return ((await gtmExec(["folders", "list"], ctx)) as GtmFolder[]) ?? [];
}

export async function createFolder(
  name: string,
  ctx: GtmContext,
): Promise<GtmFolder> {
  return (await gtmExec(
    ["folders", "create", "--name", name],
    ctx,
  )) as GtmFolder;
}

// ── Variables ───────────────────────────────────────────────────────

export async function listVariables(ctx: GtmContext): Promise<GtmVariable[]> {
  return (
    ((await gtmExec(["variables", "list"], ctx)) as GtmVariable[]) ?? []
  );
}

export async function createVariable(
  name: string,
  type: string,
  config: { parameter: GtmParameter[] },
  ctx: GtmContext,
  folderId?: string,
): Promise<GtmVariable> {
  const args = [
    "variables",
    "create",
    "--name",
    name,
    "--type",
    type,
    "--config",
    JSON.stringify(config),
  ];
  return (await gtmExec(args, ctx)) as GtmVariable;
}

// ── Triggers ────────────────────────────────────────────────────────

export async function listTriggers(ctx: GtmContext): Promise<GtmTrigger[]> {
  return ((await gtmExec(["triggers", "list"], ctx)) as GtmTrigger[]) ?? [];
}

export async function createTrigger(
  name: string,
  type: string,
  config: Record<string, unknown>,
  ctx: GtmContext,
  folderId?: string,
): Promise<GtmTrigger> {
  const args = [
    "triggers",
    "create",
    "--name",
    name,
    "--type",
    type,
    "--config",
    JSON.stringify(config),
  ];
  return (await gtmExec(args, ctx)) as GtmTrigger;
}

// ── Tags ────────────────────────────────────────────────────────────

export async function listTags(ctx: GtmContext): Promise<GtmTag[]> {
  return ((await gtmExec(["tags", "list"], ctx)) as GtmTag[]) ?? [];
}

export async function createTag(
  name: string,
  type: string,
  config: { parameter: GtmParameter[] },
  firingTriggerIds: string[],
  ctx: GtmContext,
  opts?: { blockingTriggerIds?: string[]; folderId?: string },
): Promise<GtmTag> {
  const args = [
    "tags",
    "create",
    "--name",
    name,
    "--type",
    type,
    "--firing-trigger-id",
    firingTriggerIds.join(","),
    "--config",
    JSON.stringify(config),
  ];
  if (opts?.blockingTriggerIds?.length) {
    args.push(
      "--blocking-trigger-id",
      opts.blockingTriggerIds.join(","),
    );
  }
  return (await gtmExec(args, ctx)) as GtmTag;
}

/**
 * Direct GTM API call for creating tags.
 * Workaround for CLI bug with vendor/community template tags (cvt_*).
 */
export async function apiCreateTag(
  name: string,
  type: string,
  config: { parameter: GtmParameter[] },
  firingTriggerIds: string[],
  ctx: GtmContext,
): Promise<GtmTag> {
  const accessToken = await getAccessToken();

  const base = `https://www.googleapis.com/tagmanager/v2/accounts/${ctx.accountId}/containers/${ctx.containerId}/workspaces/${ctx.workspaceId}/tags`;

  const body = {
    name,
    type,
    parameter: config.parameter,
    firingTriggerId: firingTriggerIds,
  };

  const res = await fetch(base, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API create tag "${name}" failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function getAccessToken(): Promise<string> {
  // Trigger a token refresh by running a lightweight CLI command
  await gtmExec(["auth", "status"]);
  const credentials = JSON.parse(
    await readFile(GTM_CREDENTIALS_PATH, "utf-8"),
  );
  return credentials.accessToken;
}

/**
 * Direct GTM API call for updating tags.
 * Workaround for CLI bug with GA4 Event (gaawe) tag updates.
 */
export async function apiUpdateTag(
  tagId: string,
  updates: Record<string, unknown>,
  ctx: GtmContext,
): Promise<GtmTag> {
  const accessToken = await getAccessToken();

  const base = `https://www.googleapis.com/tagmanager/v2/accounts/${ctx.accountId}/containers/${ctx.containerId}/workspaces/${ctx.workspaceId}/tags`;

  // GET current tag
  const getRes = await fetch(`${base}/${tagId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!getRes.ok) {
    throw new Error(`GET tag ${tagId} failed: ${getRes.status} ${await getRes.text()}`);
  }
  const tag = await getRes.json();

  // Merge updates
  const updated = { ...tag, ...updates };

  // PUT updated tag
  const putRes = await fetch(`${base}/${tagId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updated),
  });
  if (!putRes.ok) {
    throw new Error(`PUT tag ${tagId} failed: ${putRes.status} ${await putRes.text()}`);
  }
  return putRes.json();
}

// ── Templates ───────────────────────────────────────────────────────

export async function listTemplates(ctx: GtmContext): Promise<GtmTemplate[]> {
  return (
    ((await gtmExec(["templates", "list"], ctx)) as GtmTemplate[]) ?? []
  );
}

export async function createTemplate(
  name: string,
  templateData: string,
  ctx: GtmContext,
): Promise<GtmTemplate> {
  return (await gtmExec(
    ["templates", "create", "--name", name, "--template-data", templateData],
    ctx,
  )) as GtmTemplate;
}

/**
 * Find or install the Stape Meta CAPI template.
 * Returns the tag type string: cvt_{containerId}_{templateId}
 */
export async function ensureStapeMetaTemplate(
  ctx: GtmContext,
): Promise<string> {
  const raw = await listTemplates(ctx);
  const templates = Array.isArray(raw) ? raw : raw ? [raw] : [];

  // Look for existing Stape Meta/Facebook template
  const stape = templates.find(
    (t) =>
      t.name &&
      (/facebook/i.test(t.name) || /meta/i.test(t.name)) &&
      /stape/i.test(t.name),
  );

  if (stape) {
    // Extract the public template ID from the template data's ___INFO___ section
    // The API uses this ID (e.g. "cvt_KFNBV"), not the numeric templateId
    const tplData = (stape as unknown as Record<string, unknown>).templateData as string | undefined;
    if (tplData) {
      const infoMatch = tplData.match(/"id"\s*:\s*"(cvt_[^"]+)"/);
      if (infoMatch) {
        return infoMatch[1];
      }
    }
    // Fallback to constructed ID
    return `cvt_${ctx.containerId}_${stape.templateId}`;
  }

  // Template not found — community gallery templates can't be installed via API.
  // Fall back to using Custom HTML tag with Meta Pixel base code.
  throw new Error(
    `Stape Meta CAPI template not found in this container. ` +
      `Please install it manually: GTM → Templates → Search Gallery → ` +
      `"Facebook Pixel" by stape.io. Then re-run the deploy.\n` +
      `Alternatively, the deploy will use Custom HTML tags for Meta Pixel if you pass --meta-html flag.`,
  );
}

// ── Auth Check ──────────────────────────────────────────────────────

export async function checkAuth(): Promise<boolean> {
  try {
    await gtmExec(["auth", "status"]);
    return true;
  } catch {
    return false;
  }
}
