import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const parameterSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  description: z.string().optional(),
  isRequired: z.boolean().optional().default(false),
  exampleValue: z.string().optional(),
});

const eventSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  trigger: z.string().optional(),
  category: z.string().optional(),
  parameters: z.array(parameterSchema).default([]),
});

const planSpecSchema = z.object({
  events: z.array(eventSchema),
});

export type ParsedPlanSpec = z.infer<typeof planSpecSchema>;

/**
 * Uses AI to extract structured events and parameters from a measurement plan document.
 */
export async function parsePlanToSpec(
  planDocument: string
): Promise<ParsedPlanSpec> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: planSpecSchema,
    prompt: `Extract all events and parameters from this measurement plan document.

Rules:
- Each event should have a category based on its section heading (e.g. "Lead Capture & Conversion", "Assessment Funnel")
- Match parameters to the events they belong to based on context (parameter section names map to event categories)
- Use snake_case for all names
- Parameter types: string, number, boolean, array, object
- Set isRequired based on the "Required" column if present

Measurement Plan:
${planDocument}`,
  });

  return object;
}
