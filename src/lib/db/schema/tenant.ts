import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import {
  timestamps,
  createdAt,
  accountMemberRoleEnum,
  accessRoleEnum,
} from "./_helpers";

// Auth user profile — maps to Supabase auth.users
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  ...timestamps,
});

// Billing entity (company or agency)
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  billingPlan: text("billing_plan"),
  ...timestamps,
});

// Client or business unit — belongs to account
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(), // unique per account (enforced via index)
  ...timestamps,
});

// Website, app, or user-defined scope — belongs to org
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(), // unique per org (enforced via index)
  description: text("description"),
  url: text("url"),
  ...timestamps,
});

// User's role within an account
export const accountMembers = pgTable("account_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: accountMemberRoleEnum("role").notNull().default("member"),
  ...createdAt,
});

// Granular access control per org or project
export const memberAccess = pgTable("member_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountMemberId: uuid("account_member_id")
    .notNull()
    .references(() => accountMembers.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  role: accessRoleEnum("role").notNull(),
  ...createdAt,
});
