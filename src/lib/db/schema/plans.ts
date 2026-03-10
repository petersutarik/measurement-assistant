import { pgTable, uuid, text, jsonb } from "drizzle-orm/pg-core";
import { timestamps, planStatusEnum, contextSourceTypeEnum } from "./_helpers";
import { accounts, projects, users } from "./tenant";

// ── Plan Templates ──────────────────────────────────────────────────
// Account-scoped templates; null accountId = system-wide built-in
export const planTemplates = pgTable("plan_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").references(() => accounts.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  document: text("document").notNull().default(""),
  ...timestamps,
});

// ── Measurement Plans ───────────────────────────────────────────────
export const measurementPlans = pgTable("measurement_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: planStatusEnum("status").notNull().default("draft"),
  document: text("document").notNull().default(""),
  messages: jsonb("messages").notNull().default("[]"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  ...timestamps,
});

// ── Plan Context Sources ────────────────────────────────────────────
// Notes, URLs, or uploaded files that provide context for plan generation
export const planContextSources = pgTable("plan_context_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => measurementPlans.id, { onDelete: "cascade" }),
  type: contextSourceTypeEnum("type").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull().default(""), // extracted text content
  url: text("url"), // for type=url
  filePath: text("file_path"), // for type=file (Supabase Storage path)
  ...timestamps,
});
