import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

export const createProjectSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

export const createAccountSchema = z.object({
  provider: z.string().min(1),
  providerAccountId: z.string().min(1),
});

export type CreateOrganization = z.infer<typeof createOrganizationSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type CreateAccount = z.infer<typeof createAccountSchema>;
