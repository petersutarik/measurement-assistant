import { z } from "zod";

// ── Workspace (SpecVersion with type=workspace) ─────────────────────

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

// ── Event ───────────────────────────────────────────────────────────

export const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  trigger: z.string().max(500).optional(),
  pagePattern: z.string().max(500).optional(),
  category: z.string().max(200).optional(),
  exampleUrls: z.array(z.string().url()).optional(),
  implementationNotes: z.string().max(5000).optional(),
});

export const updateEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  trigger: z.string().max(500).optional(),
  pagePattern: z.string().max(500).optional(),
  category: z.string().max(200).optional(),
  exampleUrls: z.array(z.string().url()).optional(),
  implementationNotes: z.string().max(5000).optional(),
});

// ── Parameter ───────────────────────────────────────────────────────

const parameterType = z.enum(["string", "number", "boolean", "array", "object"]);

export const createParameterSchema = z.object({
  name: z.string().min(1).max(200),
  type: parameterType,
  description: z.string().max(2000).optional(),
  isRequired: z.boolean().optional(),
  exampleValue: z.string().max(1000).optional(),
  origin: z.string().max(500).optional(),
  parentId: z.string().uuid().optional(),
});

export const updateParameterSchema = z.object({
  name: z.string().min(1).max(200),
  type: parameterType,
  description: z.string().max(2000).optional(),
  isRequired: z.boolean().optional(),
  exampleValue: z.string().max(1000).optional(),
  origin: z.string().max(500).optional(),
});

// ── Inferred types ──────────────────────────────────────────────────

export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspace = z.infer<typeof updateWorkspaceSchema>;
export type CreateEvent = z.infer<typeof createEventSchema>;
export type UpdateEvent = z.infer<typeof updateEventSchema>;
export type CreateParameter = z.infer<typeof createParameterSchema>;
export type UpdateParameter = z.infer<typeof updateParameterSchema>;
