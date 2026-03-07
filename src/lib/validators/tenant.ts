import { z } from "zod";

const slug = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens");

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  slug,
});

export const createOrganizationSchema = z.object({
  accountId: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug,
});

export const createProjectSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug,
  description: z.string().max(500).optional(),
  url: z.string().url().optional(),
});

export const addAccountMemberSchema = z.object({
  accountId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "member"]),
});

export const grantMemberAccessSchema = z.object({
  accountMemberId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  role: z.enum(["admin", "editor", "viewer"]),
});

export type CreateAccount = z.infer<typeof createAccountSchema>;
export type CreateOrganization = z.infer<typeof createOrganizationSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type AddAccountMember = z.infer<typeof addAccountMemberSchema>;
export type GrantMemberAccess = z.infer<typeof grantMemberAccessSchema>;
