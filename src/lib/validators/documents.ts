import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  specVersionId: z.string().uuid(),
  eventIds: z.array(z.string().uuid()).min(1, "Select at least one event"),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

export type CreateDocument = z.infer<typeof createDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
