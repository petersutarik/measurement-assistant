import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { timestamps, createdAt, shareLinkPermissionEnum } from "./_helpers";
import { projects, users } from "./tenant";
import { specVersions, events } from "./spec";

// Curated subset of events for developer handoff (snapshot)
export const implementationDocuments = pgTable("implementation_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  specVersionId: uuid("spec_version_id")
    .notNull()
    .references(() => specVersions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  visibleFields: jsonb("visible_fields"), // which event fields to show
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  ...timestamps,
});

// Frozen copy of event data at creation time
export const implDocumentEvents = pgTable("impl_document_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  implementationDocumentId: uuid("implementation_document_id")
    .notNull()
    .references(() => implementationDocuments.id, { onDelete: "cascade" }),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  snapshotData: jsonb("snapshot_data").notNull(), // frozen event + params + mappings
  sortOrder: integer("sort_order").notNull().default(0),
  ...createdAt,
});

// Token-based external access
export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  implementationDocumentId: uuid("implementation_document_id")
    .notNull()
    .references(() => implementationDocuments.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  permission: shareLinkPermissionEnum("permission").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  ...createdAt,
});
