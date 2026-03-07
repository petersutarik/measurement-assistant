import { pgTable, uuid, text, integer, jsonb } from "drizzle-orm/pg-core";
import {
  timestamps,
  customFieldScopeTypeEnum,
  customFieldTypeEnum,
} from "./_helpers";
import { events } from "./spec";

// Custom field definition — lives outside versioning
export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  scopeType: customFieldScopeTypeEnum("scope_type").notNull(),
  scopeId: uuid("scope_id").notNull(), // FK to org or project
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
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  value: jsonb("value"),
  ...timestamps,
});
