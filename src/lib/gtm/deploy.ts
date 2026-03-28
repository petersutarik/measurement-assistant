/**
 * GTM Deploy Orchestrator
 *
 * Ties together: data fetching → generation → reconciliation → execution.
 * This is the main entry point called by the /deploy-gtm skill.
 */

import { eq, and, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projects,
  organizations,
} from "@/lib/db/schema/tenant";
import {
  destinations,
  projectDestinations,
  destinationEvents,
  destinationParameters,
  eventDestinationMappings,
  parameterMappings,
} from "@/lib/db/schema/destinations";
import { specVersions, events, parameters, eventParameters } from "@/lib/db/schema/spec";
import type {
  GtmContext,
  DestinationMapping,
  EventMapping,
  ParamMapping,
  DeployResult,
} from "./types";
import {
  checkAuth,
  listAccounts,
  listContainers,
  createWorkspace,
  ensureStapeMetaTemplate,
} from "./cli";
import { generateDesiredState } from "./generator";
import { generateMetaTransforms, needsMetaTransforms } from "./meta-transforms";
import { fetchExistingState, reconcile } from "./reconciler";
import { executeChangeset, type ProgressCallback } from "./executor";

// ── Public API ──────────────────────────────────────────────────────

export interface DeployOptions {
  projectSlug: string;
  accountId?: string;
  containerId?: string;
  onProgress?: ProgressCallback;
}

export async function deployToGtm(opts: DeployOptions): Promise<DeployResult> {
  const log = opts.onProgress ?? (() => {});

  // ── 1. Verify GTM auth ──────────────────────────────────────────
  log("Checking GTM authentication...");
  const authed = await checkAuth();
  if (!authed) {
    throw new Error(
      "Not authenticated with GTM. Run `gtm auth login` first.",
    );
  }

  // ── 2. Resolve project ──────────────────────────────────────────
  log("Loading project data...");
  const project = await resolveProject(opts.projectSlug);
  if (!project) {
    throw new Error(`Project not found: ${opts.projectSlug}`);
  }

  // ── 3. Resolve GTM container ────────────────────────────────────
  let accountId = opts.accountId;
  let containerId = opts.containerId;

  if (!accountId || !containerId) {
    log("Fetching GTM accounts and containers...");
    const result = await selectContainer(accountId);
    accountId = result.accountId;
    containerId = result.containerId;
    log(`Using container: ${result.containerName} (${containerId})`);
  }

  // ── 4. Fetch destination mappings ───────────────────────────────
  log("Loading destination mappings...");
  const destinationMappings = await fetchDestinationMappings(project.id);

  if (destinationMappings.length === 0) {
    throw new Error(
      "No destination mappings found. Add destinations and create event mappings first.",
    );
  }

  // ── 5. Create GTM workspace ─────────────────────────────────────
  const date = new Date().toISOString().split("T")[0];
  const workspaceName = `[MA] ${project.name} - ${date}`;
  log(`Creating workspace: ${workspaceName}`);

  const workspace = await createWorkspace(workspaceName, {
    accountId,
    containerId,
  });

  const ctx: GtmContext = {
    accountId,
    containerId,
    workspaceId: workspace.workspaceId,
  };

  // ── 6. Check for Stape template (if Meta dest exists) ──────────
  const metaDest = destinationMappings.find(
    (d) => d.destinationSlug.startsWith("meta"),
  );
  let metaTemplateType: string | undefined;

  if (metaDest) {
    log("Checking for Stape Meta CAPI template...");
    try {
      metaTemplateType = await ensureStapeMetaTemplate(ctx);
      log(`Meta template type: ${metaTemplateType}`);
    } catch (e) {
      log(`Warning: ${(e as Error).message}`);
      log("Skipping Meta tags — install the template and re-run.");
    }
  }

  // ── 7. AI agent for Meta transforms ─────────────────────────────
  let metaTransforms;
  if (metaDest && needsMetaTransforms(metaDest)) {
    log("Generating Meta parameter transformations (AI)...");
    metaTransforms = await generateMetaTransforms(metaDest);
    log(
      `Generated ${metaTransforms.variables.length} transform variables, ${metaTransforms.parameterBindings.length} bindings`,
    );
  }

  // ── 8. Generate desired state ───────────────────────────────────
  log("Generating desired GTM state...");
  const desired = generateDesiredState({
    projectName: project.name,
    destinations: destinationMappings,
    metaTemplateType,
    metaTransforms,
  });

  log(
    `Desired: ${desired.variables.length} variables, ${desired.triggers.length} triggers, ${desired.tags.length} tags`,
  );

  // ── 9. Reconcile with existing state ────────────────────────────
  log("Fetching existing GTM resources...");
  const existing = await fetchExistingState(ctx);
  const changeset = reconcile(desired, existing);

  const createCount =
    changeset.variables.filter((v) => v.action === "create").length +
    changeset.triggers.filter((t) => t.action === "create").length +
    changeset.tags.filter((t) => t.action === "create").length;
  const skipCount =
    changeset.variables.filter((v) => v.action === "skip").length +
    changeset.triggers.filter((t) => t.action === "skip").length +
    changeset.tags.filter((t) => t.action === "skip").length;

  log(`Plan: ${createCount} to create, ${skipCount} to reuse`);

  // ── 10. Execute ─────────────────────────────────────────────────
  log("Deploying to GTM...");
  const { resources, errors } = await executeChangeset(
    changeset,
    ctx,
    opts.onProgress,
  );

  // ── 11. Build result ────────────────────────────────────────────
  const workspaceUrl = `https://tagmanager.google.com/#/container/accounts/${accountId}/containers/${containerId}/workspaces/${workspace.workspaceId}`;

  const result: DeployResult = {
    workspace: {
      id: workspace.workspaceId,
      name: workspaceName,
      url: workspaceUrl,
    },
    resources,
    errors,
    summary: {
      created: resources.filter((r) => r.action === "created").length,
      updated: resources.filter((r) => r.action === "updated").length,
      reused: resources.filter((r) => r.action === "reused").length,
      errors: errors.length,
    },
  };

  log("\nDone!");
  log(`Workspace: ${workspaceUrl}`);

  return result;
}

// ── Data Fetching ───────────────────────────────────────────────────

async function resolveProject(slug: string) {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  return project ?? null;
}

async function fetchDestinationMappings(
  projectId: string,
): Promise<DestinationMapping[]> {
  // Get all project destinations
  const pds = await db
    .select({
      id: projectDestinations.id,
      destinationId: projectDestinations.destinationId,
      config: projectDestinations.config,
      destinationSlug: destinations.slug,
      destinationName: destinations.name,
      aiInstructions: destinations.aiInstructions,
    })
    .from(projectDestinations)
    .innerJoin(
      destinations,
      eq(destinations.id, projectDestinations.destinationId),
    )
    .where(eq(projectDestinations.projectId, projectId));

  const result: DestinationMapping[] = [];

  for (const pd of pds) {
    // Get event mappings for this project destination
    const mappings = await db
      .select({
        id: eventDestinationMappings.id,
        sourceEventId: events.id,
        sourceEventName: events.name,
        sourceEventDescription: events.description,
        destEventId: destinationEvents.id,
        destEventName: destinationEvents.name,
        destEventDescription: destinationEvents.description,
        destEventCategory: destinationEvents.category,
      })
      .from(eventDestinationMappings)
      .innerJoin(events, eq(events.id, eventDestinationMappings.eventId))
      .innerJoin(
        destinationEvents,
        eq(
          destinationEvents.id,
          eventDestinationMappings.destinationEventId,
        ),
      )
      .where(eq(eventDestinationMappings.projectDestinationId, pd.id));

    if (mappings.length === 0) continue;

    // Get parameter mappings for all event mappings
    const mappingIds = mappings.map((m) => m.id);
    const paramMaps = await db
      .select({
        id: parameterMappings.id,
        eventDestinationMappingId: parameterMappings.eventDestinationMappingId,
        sourceParamId: parameters.id,
        sourceParamName: parameters.name,
        destParamId: destinationParameters.id,
        destParamName: destinationParameters.name,
        destParamType: destinationParameters.type,
        destParamRequired: destinationParameters.isRequired,
        destParamScope: destinationParameters.scope,
        mappingType: parameterMappings.mappingType,
        staticValue: parameterMappings.staticValue,
      })
      .from(parameterMappings)
      .innerJoin(
        destinationParameters,
        eq(
          destinationParameters.id,
          parameterMappings.destinationParameterId,
        ),
      )
      .leftJoin(
        parameters,
        eq(parameters.id, parameterMappings.sourceParameterId),
      )
      .where(
        or(
          ...mappingIds.map((mid) =>
            eq(parameterMappings.eventDestinationMappingId, mid),
          ),
        ),
      );

    // Group param mappings by event mapping
    const paramsByMapping = new Map<string, ParamMapping[]>();
    for (const pm of paramMaps) {
      const list = paramsByMapping.get(pm.eventDestinationMappingId) ?? [];
      list.push({
        id: pm.id,
        sourceParam: pm.sourceParamId
          ? { id: pm.sourceParamId, name: pm.sourceParamName! }
          : null,
        destParam: {
          id: pm.destParamId,
          name: pm.destParamName,
          type: pm.destParamType,
          isRequired: pm.destParamRequired,
          scope: pm.destParamScope,
        },
        mappingType: pm.mappingType as "reference" | "static",
        staticValue: pm.staticValue,
      });
      paramsByMapping.set(pm.eventDestinationMappingId, list);
    }

    // Build event mappings
    const eventMappings: EventMapping[] = mappings.map((m) => ({
      id: m.id,
      sourceEvent: {
        id: m.sourceEventId,
        name: m.sourceEventName,
        description: m.sourceEventDescription,
      },
      destEvent: {
        id: m.destEventId,
        name: m.destEventName,
        description: m.destEventDescription,
        category: m.destEventCategory,
      },
      parameterMappings: paramsByMapping.get(m.id) ?? [],
    }));

    result.push({
      projectDestinationId: pd.id,
      destinationSlug: pd.destinationSlug,
      destinationName: pd.destinationName,
      config: pd.config as Record<string, unknown> | null,
      aiInstructions: pd.aiInstructions,
      eventMappings,
    });
  }

  return result;
}

// ── Container Selection ─────────────────────────────────────────────

async function selectContainer(
  accountId?: string,
): Promise<{
  accountId: string;
  containerId: string;
  containerName: string;
}> {
  const accounts = await listAccounts();
  if (accounts.length === 0) {
    throw new Error("No GTM accounts found. Check your GTM access.");
  }

  // If accountId provided, use it; otherwise use first account
  const account = accountId
    ? accounts.find((a) => a.accountId === accountId)
    : accounts[0];

  if (!account) {
    throw new Error(`GTM account not found: ${accountId}`);
  }

  const containers = await listContainers(account.accountId);
  if (containers.length === 0) {
    throw new Error(
      `No containers found in account "${account.name}".`,
    );
  }

  // Use first container (the skill can pass specific IDs)
  const container = containers[0];

  return {
    accountId: account.accountId,
    containerId: container.containerId,
    containerName: container.name,
  };
}
