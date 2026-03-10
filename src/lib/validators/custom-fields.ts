import { z } from "zod";

export const createCustomFieldDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  entityType: z.enum(["event", "parameter"]),
  fieldType: z.enum(["text", "number", "select", "multi_select", "boolean", "date"]),
  options: z.array(z.string().min(1).max(200)).optional(),
});

export const updateCustomFieldDefinitionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fieldType: z
    .enum(["text", "number", "select", "multi_select", "boolean", "date"])
    .optional(),
  options: z.array(z.string().min(1).max(200)).optional(),
});

export type CreateCustomFieldDefinition = z.infer<
  typeof createCustomFieldDefinitionSchema
>;
export type UpdateCustomFieldDefinition = z.infer<
  typeof updateCustomFieldDefinitionSchema
>;
