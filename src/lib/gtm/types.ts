/**
 * GTM Integration Types
 *
 * Types for generating, reconciling, and deploying GTM resources
 * from measurement spec destination mappings.
 */

// ── GTM API Resource Types ──────────────────────────────────────────

export interface GtmContext {
  accountId: string;
  containerId: string;
  workspaceId: string;
}

export interface GtmFolder {
  folderId: string;
  name: string;
  accountId: string;
  containerId: string;
}

export interface GtmVariable {
  variableId: string;
  name: string;
  type: string; // "v" (DL), "jsm" (Custom JS), "c" (Constant), etc.
  parameter: GtmParameter[];
  parentFolderId?: string;
  fingerprint?: string;
}

export interface GtmTrigger {
  triggerId: string;
  name: string;
  type: string; // "CUSTOM_EVENT", "PAGEVIEW", etc.
  customEventFilter?: GtmCondition[];
  filter?: GtmCondition[];
  parentFolderId?: string;
  fingerprint?: string;
}

export interface GtmTag {
  tagId: string;
  name: string;
  type: string; // "gaawe", "gaawc", "html", "cvt_X_Y"
  parameter: GtmParameter[];
  firingTriggerId: string[];
  blockingTriggerId?: string[];
  parentFolderId?: string;
  fingerprint?: string;
}

export interface GtmTemplate {
  templateId: string;
  name: string;
  containerId?: string;
}

export interface GtmParameter {
  type: "TEMPLATE" | "BOOLEAN" | "INTEGER" | "LIST" | "MAP"
    | "template" | "boolean" | "integer" | "list" | "map";
  key: string;
  value?: string;
  list?: GtmParameter[];
  map?: GtmParameter[];
}

export interface GtmCondition {
  type: "EQUALS" | "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "MATCH_REGEX";
  parameter: GtmParameter[];
}

// ── Desired State (output of generator) ─────────────────────────────

export interface DesiredVariable {
  name: string;
  type: "v" | "jsm" | "c"; // DL variable, Custom JS, Constant
  config: GtmParameter[];
  description?: string;
}

export interface DesiredTrigger {
  name: string;
  type: "CUSTOM_EVENT" | "PAGEVIEW" | "DOM_READY";
  config: {
    customEventFilter?: GtmCondition[];
  };
}

export interface DesiredTag {
  name: string;
  type: string; // "gaawe", "gaawc", "cvt_X_Y"
  config: GtmParameter[];
  firingTriggerNames: string[]; // resolved to IDs by executor
  blockingTriggerNames?: string[];
  /** For GA4 event tags — name of the config tag to reference */
  configTagName?: string;
}

export interface DesiredGtmState {
  folderName: string;
  variables: DesiredVariable[];
  triggers: DesiredTrigger[];
  tags: DesiredTag[];
}

// ── Reconciliation (diff output) ────────────────────────────────────

export type ResourceType = "variable" | "trigger" | "tag" | "folder";

export interface ResourceAction<T = unknown> {
  type: ResourceType;
  name: string;
  action: "create" | "update" | "skip";
  desired?: T;
  existing?: T;
  reason?: string; // for skip: "already exists with matching config"
}

export interface Changeset {
  folder: ResourceAction<{ name: string }>;
  variables: ResourceAction<DesiredVariable>[];
  triggers: ResourceAction<DesiredTrigger>[];
  tags: ResourceAction<DesiredTag>[];
}

// ── Execution Results ───────────────────────────────────────────────

export interface DeployedResource {
  type: ResourceType;
  name: string;
  action: "created" | "updated" | "reused";
  id: string; // GTM resource ID
}

export interface DeployError {
  type: ResourceType;
  name: string;
  error: string;
}

export interface DeployResult {
  workspace: {
    id: string;
    name: string;
    url: string;
  };
  resources: DeployedResource[];
  errors: DeployError[];
  summary: {
    created: number;
    updated: number;
    reused: number;
    errors: number;
  };
}

// ── Deployment Input (from DB) ──────────────────────────────────────

export interface DestinationMapping {
  projectDestinationId: string;
  destinationSlug: string; // "ga4" | "meta" | etc.
  destinationName: string;
  config: Record<string, unknown> | null; // measurementId, pixelId, etc.
  aiInstructions: string | null;
  eventMappings: EventMapping[];
}

export interface EventMapping {
  id: string;
  sourceEvent: {
    id: string;
    name: string;
    description: string | null;
  };
  destEvent: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
  };
  parameterMappings: ParamMapping[];
}

export interface ParamMapping {
  id: string;
  sourceParam: { id: string; name: string } | null;
  destParam: {
    id: string;
    name: string;
    type: string;
    isRequired: boolean;
    scope: string | null;
  };
  mappingType: "reference" | "static";
  staticValue: string | null;
}

// ── Meta Transform Types (AI agent output) ──────────────────────────

export interface MetaTransformVariable {
  name: string;
  type: "jsm" | "v";
  config: {
    javascript?: string;
    dataLayerName?: string;
  };
  description: string;
}

export interface MetaParameterBinding {
  eventName: string;
  paramName: string;
  variableReference: string; // "{{[MA] cjs - items to contents}}"
}

export interface MetaTransformResult {
  variables: MetaTransformVariable[];
  parameterBindings: MetaParameterBinding[];
}
