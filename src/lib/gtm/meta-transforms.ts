/**
 * Meta Transform AI Agent
 *
 * Uses AI to generate Custom JavaScript variable definitions
 * for complex Meta CAPI parameter transformations (e.g. items → contents).
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type {
  DestinationMapping,
  MetaTransformResult,
} from "./types";

const PREFIX = "[MA]";

const metaTransformSchema = z.object({
  variables: z.array(
    z.object({
      name: z
        .string()
        .describe(
          `Variable name with ${PREFIX} prefix, e.g. "${PREFIX} cjs - items to contents"`,
        ),
      type: z
        .enum(["jsm", "v"])
        .describe("jsm = Custom JavaScript, v = Data Layer Variable"),
      config: z.object({
        javascript: z
          .string()
          .optional()
          .describe(
            "JavaScript function body for jsm type. Must be a function() that returns a value.",
          ),
        dataLayerName: z
          .string()
          .optional()
          .describe("Data layer path for v type"),
      }),
      description: z.string().describe("What this variable does"),
    }),
  ),
  parameterBindings: z.array(
    z.object({
      eventName: z
        .string()
        .describe("Meta destination event name (e.g. Purchase, AddToCart)"),
      paramName: z
        .string()
        .describe("Meta parameter name (e.g. contents, value)"),
      variableReference: z
        .string()
        .describe(
          `GTM variable reference, e.g. "{{${PREFIX} cjs - items to contents}}"`,
        ),
    }),
  ),
});

export async function generateMetaTransforms(
  metaDestination: DestinationMapping,
): Promise<MetaTransformResult> {
  // Build prompt context
  const eventDescriptions = metaDestination.eventMappings
    .map((m) => {
      const sourceParams =
        m.parameterMappings
          .filter((pm) => pm.sourceParam)
          .map(
            (pm) =>
              `    source: ${pm.sourceParam!.name} (${pm.destParam.type}) → dest: ${pm.destParam.name}`,
          )
          .join("\n") || "    (no parameter mappings)";

      return `  ${m.sourceEvent.name} → Meta ${m.destEvent.name}:\n${sourceParams}`;
    })
    .join("\n\n");

  const prompt = `You are a Google Tag Manager expert creating Custom JavaScript variables for Meta (Facebook) Conversions API parameter transformations.

## Context

A measurement spec has dataLayer events that need to be sent to Meta CAPI via GTM. Some parameters require transformation from the dataLayer format to Meta's expected format.

## Event Mappings (source dataLayer → Meta CAPI):

${eventDescriptions}

## Meta CAPI Expected Formats

- **contents**: Array of objects with \`{id: string, quantity: number, item_price: number}\`. The dataLayer typically has \`items\` with \`{item_id, item_name, quantity, price}\` (GA4 format).
- **value**: Total transaction value as a number
- **currency**: ISO 4217 currency code (e.g. "USD", "EUR")
- **content_type**: Usually "product" for ecommerce
- **content_ids**: Array of product IDs as strings
- **content_name**: Product or page name
- **num_items**: Total number of items

## Rules

1. Create Custom JavaScript variables ONLY when the source data format differs from what Meta expects (e.g. items → contents transformation)
2. For simple 1:1 mappings (e.g. currency → currency), do NOT create a variable — just add a parameterBinding referencing a DL variable: \`{{${PREFIX} dlv - paramName}}\`
3. All Custom JS variables must use the \`${PREFIX} cjs -\` prefix
4. Custom JS functions must be wrapped as: \`function() { var data = ...; return ...; }\`
5. Use \`google_tag_manager[{{Container ID}}].dataLayer.get('key')\` or the simpler pattern of referencing other GTM variables via the function
6. Keep Custom JS minimal — only the transformation logic, no error handling beyond null checks
7. Reuse variables across events when the transformation is the same (e.g. one "items to contents" variable shared by Purchase, AddToCart, etc.)
8. For the items → contents mapping, read from dataLayer variable \`ecommerce.items\` and transform each item

## Output

Generate the minimum set of Custom JavaScript variables needed, plus parameter bindings that tell which Meta event parameter should reference which variable.`;

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: metaTransformSchema,
    prompt,
  });

  return object;
}

/**
 * Check if a Meta destination has complex mappings that need AI transforms.
 * Returns true if any mapping involves array/object types or known complex params.
 */
export function needsMetaTransforms(dest: DestinationMapping): boolean {
  const complexParams = new Set([
    "contents",
    "content_ids",
    "items",
    "products",
  ]);

  for (const mapping of dest.eventMappings) {
    for (const pm of mapping.parameterMappings) {
      if (
        complexParams.has(pm.destParam.name) ||
        complexParams.has(pm.sourceParam?.name ?? "") ||
        pm.destParam.type === "array" ||
        pm.destParam.type === "object"
      ) {
        return true;
      }
    }
  }

  return false;
}
