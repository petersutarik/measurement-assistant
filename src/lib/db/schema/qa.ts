import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import {
  timestamps,
  qaReportStatusEnum,
  qaIssueTypeEnum,
  qaIssueSeverityEnum,
  qaIssueStatusEnum,
} from "./_helpers";
import { users } from "./tenant";
import { events } from "./spec";
import { implementationDocuments } from "./documents";

// Testing results container
export const qaReports = pgTable("qa_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  implementationDocumentId: uuid("implementation_document_id")
    .notNull()
    .references(() => implementationDocuments.id, { onDelete: "cascade" }),
  title: text("title"),
  status: qaReportStatusEnum("status").notNull().default("in_progress"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  ...timestamps,
});

// Individual issues per event/param
export const qaIssues = pgTable("qa_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  qaReportId: uuid("qa_report_id")
    .notNull()
    .references(() => qaReports.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").references(() => events.id, {
    onDelete: "set null",
  }),
  parameterName: text("parameter_name"),
  issueType: qaIssueTypeEnum("issue_type").notNull(),
  severity: qaIssueSeverityEnum("severity").notNull(),
  description: text("description").notNull(),
  status: qaIssueStatusEnum("status").notNull().default("open"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  ...timestamps,
});
