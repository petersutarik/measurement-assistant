import { timestamp, pgEnum } from "drizzle-orm/pg-core";

// ── Reusable timestamp columns ──────────────────────────────────────
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const createdAt = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

// ── Enums ───────────────────────────────────────────────────────────

// Tenant
export const accountMemberRoleEnum = pgEnum("account_member_role", [
  "owner",
  "admin",
  "member",
]);

export const accessRoleEnum = pgEnum("access_role", [
  "admin",
  "editor",
  "viewer",
]);

// Versioning
export const specVersionTypeEnum = pgEnum("spec_version_type", [
  "workspace",
  "published",
]);

// Parameters / shared schema fields
export const parameterTypeEnum = pgEnum("parameter_type", [
  "string",
  "number",
  "boolean",
  "array",
  "object",
]);

// Destinations
export const destinationScopeTypeEnum = pgEnum("destination_scope_type", [
  "system",
  "account",
  "org",
  "project",
]);

// Custom fields
export const customFieldScopeTypeEnum = pgEnum("custom_field_scope_type", [
  "organization",
  "project",
]);

export const customFieldTypeEnum = pgEnum("custom_field_type", [
  "text",
  "number",
  "select",
  "multi_select",
  "boolean",
  "date",
]);

export const customFieldEntityTypeEnum = pgEnum("custom_field_entity_type", [
  "event",
  "parameter",
]);

// Share links
export const shareLinkPermissionEnum = pgEnum("share_link_permission", [
  "view",
  "comment",
]);

// QA
export const qaReportStatusEnum = pgEnum("qa_report_status", [
  "in_progress",
  "completed",
]);

export const qaIssueTypeEnum = pgEnum("qa_issue_type", [
  "missing",
  "incorrect_value",
  "wrong_trigger",
  "other",
]);

export const qaIssueSeverityEnum = pgEnum("qa_issue_severity", [
  "critical",
  "major",
  "minor",
]);

export const qaIssueStatusEnum = pgEnum("qa_issue_status", [
  "open",
  "fixed",
  "wont_fix",
]);

// Parameter mappings
export const mappingTypeEnum = pgEnum("mapping_type", [
  "reference",
  "static",
]);

// GTM deployments
export const gtmDeploymentStatusEnum = pgEnum("gtm_deployment_status", [
  "pending",
  "completed",
  "failed",
]);

// Plans
export const planStatusEnum = pgEnum("plan_status", [
  "draft",
  "completed",
]);

export const contextSourceTypeEnum = pgEnum("context_source_type", [
  "note",
  "url",
  "file",
]);
