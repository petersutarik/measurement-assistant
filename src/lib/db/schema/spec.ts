import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import {
  timestamps,
  createdAt,
  specVersionTypeEnum,
  parameterTypeEnum,
} from "./_helpers";
import { projects, users } from "./tenant";

// Full spec container — workspace or published snapshot
export const specVersions = pgTable("spec_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: specVersionTypeEnum("type").notNull(),
  name: text("name"), // workspace name; null for published
  description: text("description"),
  versionNumber: integer("version_number"), // sequential, published only
  forkedFromId: uuid("forked_from_id"), // self-ref, set after table definition
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedBy: uuid("published_by").references(() => users.id),
  createdBy: uuid("created_by").references(() => users.id), // nullable for API key auth
  ...timestamps,
});

// Canonical source events (dataLayer)
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  specVersionId: uuid("spec_version_id")
    .notNull()
    .references(() => specVersions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  trigger: text("trigger"),
  pagePattern: text("page_pattern"),
  exampleUrls: text("example_urls").array(),
  category: text("category"),
  implementationNotes: text("implementation_notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  sourceEventId: uuid("source_event_id"), // root origin — first event in lineage chain
  ...timestamps,
});

// Workspace-level parameters — shared across events via junction table
export const parameters = pgTable("parameters", {
  id: uuid("id").primaryKey().defaultRandom(),
  specVersionId: uuid("spec_version_id")
    .notNull()
    .references(() => specVersions.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"), // self-ref for nesting
  sharedSchemaId: uuid("shared_schema_id"), // FK set via relations
  name: text("name").notNull(),
  type: parameterTypeEnum("type").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").notNull().default(false),
  exampleValue: text("example_value"),
  enumId: uuid("enum_id"), // FK set via relations
  origin: text("origin"),
  sourceParameterId: uuid("source_parameter_id"), // root origin
  ...timestamps,
});

// Junction: which parameters belong to which events (+ per-event sort order)
export const eventParameters = pgTable(
  "event_parameters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    parameterId: uuid("parameter_id")
      .notNull()
      .references(() => parameters.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    ...createdAt,
  },
  (t) => [unique().on(t.eventId, t.parameterId)]
);

// Reusable parameter groups (e.g., Item object)
export const sharedSchemas = pgTable("shared_schemas", {
  id: uuid("id").primaryKey().defaultRandom(),
  specVersionId: uuid("spec_version_id")
    .notNull()
    .references(() => specVersions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
});

// Individual fields within a shared schema
export const sharedSchemaFields = pgTable("shared_schema_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  sharedSchemaId: uuid("shared_schema_id")
    .notNull()
    .references(() => sharedSchemas.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: parameterTypeEnum("type").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").notNull().default(false),
  exampleValue: text("example_value"),
  enumId: uuid("enum_id"), // FK set via relations
  origin: text("origin"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

// Reusable value sets
export const enums = pgTable("enums", {
  id: uuid("id").primaryKey().defaultRandom(),
  specVersionId: uuid("spec_version_id")
    .notNull()
    .references(() => specVersions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
});

// Individual allowed values within an enum
export const enumValues = pgTable("enum_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  enumId: uuid("enum_id")
    .notNull()
    .references(() => enums.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
  label: text("label"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...createdAt,
});
