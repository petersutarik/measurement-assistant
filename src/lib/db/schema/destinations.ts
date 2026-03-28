import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  unique,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  timestamps,
  createdAt,
  destinationScopeTypeEnum,
  mappingTypeEnum,
  gtmDeploymentStatusEnum,
} from "./_helpers";
import { specVersions, events, parameters } from "./spec";
import { projects } from "./tenant";

// Platform definition (Meta, GA4, Google Ads, etc.)
export const destinations = pgTable(
  "destinations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id"), // self-ref for inheritance
    scopeType: destinationScopeTypeEnum("scope_type").notNull(),
    scopeId: uuid("scope_id"), // FK to account/org/project; null for system
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    docsUrl: text("docs_url"),
    iconUrl: text("icon_url"),
    aiInstructions: text("ai_instructions"),
    snippetTemplate: text("snippet_template"),
    ...timestamps,
  },
  (table) => [unique().on(table.slug, table.scopeType)],
);

// Events for a destination platform (standard + custom)
export const destinationEvents = pgTable(
  "destination_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isStandard: boolean("is_standard").notNull().default(true),
    category: text("category"), // e.g. "ecommerce", "auto", "lead_generation"
    verticals: jsonb("verticals").$type<string[]>(), // e.g. ["ecommerce", "retail"]
    docsUrl: text("docs_url"),
    ...timestamps,
  },
  (table) => [unique().on(table.destinationId, table.name)],
);

// Parameters per destination event
export const destinationParameters = pgTable("destination_parameters", {
  id: uuid("id").primaryKey().defaultRandom(),
  destinationEventId: uuid("destination_event_id")
    .notNull()
    .references(() => destinationEvents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // string, number, boolean, array, object
  description: text("description"),
  isRequired: boolean("is_required").notNull().default(false),
  isStandard: boolean("is_standard").notNull().default(true),
  exampleValue: text("example_value"),
  scope: text("scope"), // GA4: "default", "custom_dimension", "custom_metric", "user_property"
  ...timestamps,
});

// Which destinations are active for a project
export const projectDestinations = pgTable(
  "project_destinations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    config: jsonb("config"), // measurement ID, pixel ID, etc.
    ...createdAt,
  },
  (table) => [unique().on(table.projectId, table.destinationId)],
);

// Links a source event to a destination event
export const eventDestinationMappings = pgTable("event_destination_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  projectDestinationId: uuid("project_destination_id")
    .notNull()
    .references(() => projectDestinations.id, { onDelete: "cascade" }),
  destinationEventId: uuid("destination_event_id")
    .notNull()
    .references(() => destinationEvents.id, { onDelete: "cascade" }),
  config: jsonb("config"),
  ...timestamps,
});

// Maps source param → dest param
export const parameterMappings = pgTable("parameter_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventDestinationMappingId: uuid("event_destination_mapping_id")
    .notNull()
    .references(() => eventDestinationMappings.id, { onDelete: "cascade" }),
  destinationParameterId: uuid("destination_parameter_id")
    .notNull()
    .references(() => destinationParameters.id, { onDelete: "cascade" }),
  mappingType: mappingTypeEnum("mapping_type").notNull(),
  sourceParameterId: uuid("source_parameter_id").references(
    () => parameters.id,
    { onDelete: "set null" },
  ),
  staticValue: text("static_value"),
  transformExpression: text("transform_expression"),
  ...createdAt,
});

// GTM deployment history
export const gtmDeployments = pgTable("gtm_deployments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  gtmAccountId: text("gtm_account_id").notNull(),
  gtmContainerId: text("gtm_container_id").notNull(),
  gtmWorkspaceId: text("gtm_workspace_id").notNull(),
  gtmWorkspaceName: text("gtm_workspace_name").notNull(),
  status: gtmDeploymentStatusEnum("status").notNull().default("pending"),
  results: jsonb("results"), // DeployResult from types.ts
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
