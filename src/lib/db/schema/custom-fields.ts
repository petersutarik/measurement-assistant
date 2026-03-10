import { pgTable, uuid, text, integer, jsonb } from "drizzle-orm/pg-core";
import {
  timestamps,
  customFieldScopeTypeEnum,
  customFieldTypeEnum,
  customFieldEntityTypeEnum,
} from "./_helpers";
import { events, parameters } from "./spec";

// Custom field definition — lives outside versioning
export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  scopeType: customFieldScopeTypeEnum("scope_type").notNull(),
  scopeId: uuid("scope_id").notNull(), // FK to org or project
  entityType: customFieldEntityTypeEnum("entity_type").notNull(),
  name: text("name").notNull(),
  fieldType: customFieldTypeEnum("field_type").notNull(),
  options: jsonb("options"), // for select/multi_select
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

// Custom field values — inside versioning (copied with spec)
export const customFieldValues = pgTable("custom_field_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  customFieldDefinitionId: uuid("custom_field_definition_id")
    .notNull()
    .references(() => customFieldDefinitions.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").references(() => events.id, {
    onDelete: "cascade",
  }),
  parameterId: uuid("parameter_id").references(() => parameters.id, {
    onDelete: "cascade",
  }),
  value: jsonb("value"),
  ...timestamps,
});
