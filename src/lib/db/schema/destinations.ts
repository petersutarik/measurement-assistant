import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import {
  timestamps,
  createdAt,
  destinationScopeTypeEnum,
  mappingTypeEnum,
} from "./_helpers";
import { specVersions, events, parameters } from "./spec";

// Platform definition (Meta, GA4, Google Ads, etc.)
export const destinations = pgTable("destinations", {
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
});

// Events for a destination platform (standard + custom)
export const destinationEvents = pgTable("destination_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  destinationId: uuid("destination_id")
    .notNull()
    .references(() => destinations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isStandard: boolean("is_standard").notNull().default(true),
  docsUrl: text("docs_url"),
  ...timestamps,
});

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
  ...timestamps,
});

// Which destinations are active for a spec version
export const projectDestinations = pgTable("project_destinations", {
  id: uuid("id").primaryKey().defaultRandom(),
  specVersionId: uuid("spec_version_id")
    .notNull()
    .references(() => specVersions.id, { onDelete: "cascade" }),
  destinationId: uuid("destination_id")
    .notNull()
    .references(() => destinations.id, { onDelete: "cascade" }),
  config: jsonb("config"), // measurement ID, pixel ID, etc.
  ...createdAt,
});

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
