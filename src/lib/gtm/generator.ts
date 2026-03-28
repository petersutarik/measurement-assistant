/**
 * GTM State Generator
 *
 * Converts destination mappings (from the measurement spec) into
 * a desired GTM state: variables, triggers, and tags.
 */

import type {
  DesiredGtmState,
  DesiredVariable,
  DesiredTrigger,
  DesiredTag,
  DestinationMapping,
  EventMapping,
  GtmParameter,
  MetaTransformResult,
} from "./types";

const PREFIX = "[MA]";
const FOLDER_NAME = `${PREFIX} Measurement Assistant`;

/** Standard Meta Pixel events supported by the Stape template */
const META_STANDARD_EVENTS = new Set([
  "PageView",
  "AddPaymentInfo",
  "AddToCart",
  "AddToWishlist",
  "CompleteRegistration",
  "Contact",
  "CustomizeProduct",
  "Donate",
  "FindLocation",
  "InitiateCheckout",
  "Lead",
  "Purchase",
  "Schedule",
  "Search",
  "StartTrial",
  "SubmitApplication",
  "Subscribe",
  "ViewContent",
]);

// ── Public API ──────────────────────────────────────────────────────

export interface GeneratorInput {
  projectName: string;
  destinations: DestinationMapping[];
  /** Stape template tag type, e.g. "cvt_12345_67" */
  metaTemplateType?: string;
  /** AI-generated Meta transformation variables + bindings */
  metaTransforms?: MetaTransformResult;
}

export function generateDesiredState(input: GeneratorInput): DesiredGtmState {
  const variables: DesiredVariable[] = [];
  const triggers: DesiredTrigger[] = [];
  const tags: DesiredTag[] = [];

  // Track unique variable names to avoid duplicates
  const variableNames = new Set<string>();

  // Collect all unique spec events across destinations for triggers
  const specEventNames = new Set<string>();

  for (const dest of input.destinations) {
    for (const mapping of dest.eventMappings) {
      specEventNames.add(mapping.sourceEvent.name);
    }
  }

  // ── Create triggers for each spec event ───────────────────────
  for (const eventName of specEventNames) {
    triggers.push(buildCustomEventTrigger(eventName));
  }

  // ── Process each destination ──────────────────────────────────
  for (const dest of input.destinations) {
    if (dest.destinationSlug === "ga4") {
      processGA4Destination(dest, variables, tags, variableNames);
    } else if (dest.destinationSlug.startsWith("meta") && input.metaTemplateType) {
      processMetaDestination(
        dest,
        variables,
        tags,
        variableNames,
        input.metaTemplateType,
        input.metaTransforms,
      );
    }
  }

  // ── Add Meta transform Custom JS variables ────────────────────
  if (input.metaTransforms) {
    for (const tv of input.metaTransforms.variables) {
      if (!variableNames.has(tv.name)) {
        variableNames.add(tv.name);
        if (tv.type === "jsm" && tv.config.javascript) {
          variables.push(buildCustomJsVariable(tv.name, tv.config.javascript));
        } else if (tv.type === "v" && tv.config.dataLayerName) {
          variables.push(
            buildDataLayerVariable(tv.name, tv.config.dataLayerName),
          );
        }
      }
    }
  }

  return {
    folderName: FOLDER_NAME,
    variables,
    triggers,
    tags,
  };
}

// ── GA4 Destination ─────────────────────────────────────────────────

function processGA4Destination(
  dest: DestinationMapping,
  variables: DesiredVariable[],
  tags: DesiredTag[],
  variableNames: Set<string>,
) {
  const config = dest.config as { measurementId?: string } | null;
  const measurementId = config?.measurementId;

  if (!measurementId) {
    throw new Error(
      `GA4 destination is missing measurementId in config. ` +
        `Update the project destination config with your GA4 Measurement ID (e.g. G-XXXXXXXXXX).`,
    );
  }

  // Constant variable for measurement ID
  const measIdVarName = `${PREFIX} const - GA4 Measurement ID`;
  if (!variableNames.has(measIdVarName)) {
    variableNames.add(measIdVarName);
    variables.push(buildConstantVariable(measIdVarName, measurementId));
  }

  // GA4 Config tag
  const configTagName = `${PREFIX} GA4 Config - ${measurementId}`;
  tags.push({
    name: configTagName,
    type: "gaawc",
    config: [
      {
        type: "TEMPLATE",
        key: "measurementId",
        value: `{{${measIdVarName}}}`,
      },
    ],
    firingTriggerNames: ["All Pages"], // Built-in trigger
  });

  // GA4 Event tags — one per event mapping
  // Detect duplicate destination event names to disambiguate tag names
  const destEventCounts = new Map<string, number>();
  for (const m of dest.eventMappings) {
    destEventCounts.set(
      m.destEvent.name,
      (destEventCounts.get(m.destEvent.name) ?? 0) + 1,
    );
  }

  for (const mapping of dest.eventMappings) {
    const eventParams = buildGA4EventParams(
      mapping,
      variables,
      variableNames,
    );

    const tagConfig: GtmParameter[] = [
      {
        type: "TEMPLATE",
        key: "eventName",
        value: mapping.destEvent.name,
      },
      {
        type: "TEMPLATE",
        key: "measurementIdOverride",
        value: `{{${measIdVarName}}}`,
      },
    ];

    // Add event parameters table if there are params
    if (eventParams.length > 0) {
      tagConfig.push({
        type: "LIST",
        key: "eventSettingsTable",
        list: eventParams.map((p) => ({
          type: "MAP" as const,
          key: "eventSettingsTable",
          map: [
            { type: "TEMPLATE" as const, key: "parameter", value: p.key },
            {
              type: "TEMPLATE" as const,
              key: "parameterValue",
              value: p.value,
            },
          ],
        })),
      });
    }

    // Check if ecommerce items are involved → enable sendEcommerceData
    const hasItems = mapping.parameterMappings.some(
      (pm) =>
        pm.destParam.name === "items" || pm.sourceParam?.name === "items",
    );
    if (hasItems) {
      tagConfig.push({
        type: "BOOLEAN",
        key: "sendEcommerceData",
        value: "true",
      });
    }

    // Disambiguate tag name when multiple source events map to the same dest event
    const isDuplicate = (destEventCounts.get(mapping.destEvent.name) ?? 0) > 1;
    const tagName = isDuplicate
      ? `${PREFIX} GA4 - ${mapping.destEvent.name} (${mapping.sourceEvent.name})`
      : `${PREFIX} GA4 - ${mapping.destEvent.name}`;

    tags.push({
      name: tagName,
      type: "gaawe",
      config: tagConfig,
      firingTriggerNames: [
        `${PREFIX} ce - ${mapping.sourceEvent.name}`,
      ],
      configTagName,
    });
  }
}

// ── Meta Destination ────────────────────────────────────────────────

function processMetaDestination(
  dest: DestinationMapping,
  variables: DesiredVariable[],
  tags: DesiredTag[],
  variableNames: Set<string>,
  metaTemplateType?: string,
  metaTransforms?: MetaTransformResult,
) {
  const config = dest.config as { pixelId?: string } | null;
  const pixelId = config?.pixelId;

  if (!pixelId) {
    throw new Error(
      `Meta destination is missing pixelId in config. ` +
        `Update the project destination config with your Meta Pixel ID.`,
    );
  }

  if (!metaTemplateType) {
    throw new Error(
      `Stape Meta CAPI template type not provided. ` +
        `Ensure the template is installed in the GTM container.`,
    );
  }

  // Constant variable for pixel ID
  const pixelIdVarName = `${PREFIX} const - Meta Pixel ID`;
  if (!variableNames.has(pixelIdVarName)) {
    variableNames.add(pixelIdVarName);
    variables.push(buildConstantVariable(pixelIdVarName, pixelId));
  }

  // Build binding lookup from AI transforms
  const bindingLookup = new Map<string, Map<string, string>>();
  if (metaTransforms) {
    for (const binding of metaTransforms.parameterBindings) {
      let eventBindings = bindingLookup.get(binding.eventName);
      if (!eventBindings) {
        eventBindings = new Map();
        bindingLookup.set(binding.eventName, eventBindings);
      }
      eventBindings.set(binding.paramName, binding.variableReference);
    }
  }

  // Meta tags — one per event mapping
  // Detect duplicate destination event names to disambiguate tag names
  const metaDestEventCounts = new Map<string, number>();
  for (const m of dest.eventMappings) {
    metaDestEventCounts.set(
      m.destEvent.name,
      (metaDestEventCounts.get(m.destEvent.name) ?? 0) + 1,
    );
  }

  for (const mapping of dest.eventMappings) {
    const eventBindings = bindingLookup.get(mapping.destEvent.name);

    // Determine if this is a standard Meta event
    const isStandardEvent = META_STANDARD_EVENTS.has(mapping.destEvent.name);

    // Build tag config using Stape template field names (lowercase types for community templates)
    const tagParams: GtmParameter[] = [
      { type: "template", key: "pixelIds", value: `{{${pixelIdVarName}}}` },
      { type: "template", key: "inheritEventName", value: "override" },
      { type: "template", key: "eventName", value: isStandardEvent ? "standard" : "custom" },
      // Defaults matching the manually-created tag
      { type: "boolean", key: "enableDataLayerMapping", value: "true" },
      { type: "boolean", key: "enableEdvancedMatching", value: "true" },
      { type: "boolean", key: "consent", value: "true" },
      { type: "boolean", key: "enableConsentMode", value: "false" },
      { type: "boolean", key: "dpoLDU", value: "false" },
      { type: "boolean", key: "disableAutoConfig", value: "false" },
      { type: "boolean", key: "disablePushState", value: "false" },
      { type: "boolean", key: "dataLayerEventPush", value: "false" },
      { type: "boolean", key: "runInitOnce", value: "false" },
      { type: "boolean", key: "enableCurrentDataLayerOnly", value: "false" },
      { type: "boolean", key: "userDataFromVariable", value: "false" },
      { type: "boolean", key: "enableEventEnhancement", value: "false" },
    ];

    if (isStandardEvent) {
      tagParams.push({
        type: "template",
        key: "eventNameStandard",
        value: mapping.destEvent.name,
      });
    } else {
      tagParams.push({
        type: "template",
        key: "eventNameCustom",
        value: mapping.destEvent.name,
      });
    }

    // Build object properties table for event parameters
    const objectProperties: GtmParameter[] = [];

    for (const pm of mapping.parameterMappings) {
      const aiBinding = eventBindings?.get(pm.destParam.name);
      let value: string | undefined;

      if (aiBinding) {
        value = aiBinding;
      } else if (pm.mappingType === "reference" && pm.sourceParam) {
        const dlvName = `${PREFIX} dlv - ${pm.sourceParam.name}`;
        ensureDataLayerVariable(
          dlvName,
          pm.sourceParam.name,
          variables,
          variableNames,
        );
        value = `{{${dlvName}}}`;
      } else if (pm.mappingType === "static" && pm.staticValue) {
        value = pm.staticValue;
      }

      if (value) {
        objectProperties.push({
          type: "map",
          key: "objectPropertiesList",
          map: [
            { type: "template", key: "name", value: pm.destParam.name },
            { type: "template", key: "value", value },
          ],
        });
      }
    }

    if (objectProperties.length > 0) {
      tagParams.push({
        type: "boolean",
        key: "objectPropertiesFromVariable",
        value: "false",
      });
      tagParams.push({
        type: "list",
        key: "objectPropertiesList",
        list: objectProperties,
      });
    } else {
      tagParams.push({
        type: "boolean",
        key: "objectPropertiesFromVariable",
        value: "false",
      });
    }

    const isMetaDuplicate = (metaDestEventCounts.get(mapping.destEvent.name) ?? 0) > 1;
    const metaTagName = isMetaDuplicate
      ? `${PREFIX} Meta - ${mapping.destEvent.name} (${mapping.sourceEvent.name})`
      : `${PREFIX} Meta - ${mapping.destEvent.name}`;

    tags.push({
      name: metaTagName,
      type: metaTemplateType,
      config: tagParams,
      firingTriggerNames: [
        `${PREFIX} ce - ${mapping.sourceEvent.name}`,
      ],
    });
  }
}

// ── GA4 Event Parameter Builder ─────────────────────────────────────

function buildGA4EventParams(
  mapping: EventMapping,
  variables: DesiredVariable[],
  variableNames: Set<string>,
): { key: string; value: string }[] {
  const params: { key: string; value: string }[] = [];

  for (const pm of mapping.parameterMappings) {
    // Skip items — handled via sendEcommerceData
    if (pm.destParam.name === "items") continue;

    if (pm.mappingType === "reference" && pm.sourceParam) {
      const dlvName = `${PREFIX} dlv - ${pm.sourceParam.name}`;
      ensureDataLayerVariable(
        dlvName,
        pm.sourceParam.name,
        variables,
        variableNames,
      );
      params.push({
        key: pm.destParam.name,
        value: `{{${dlvName}}}`,
      });
    } else if (pm.mappingType === "static" && pm.staticValue) {
      params.push({
        key: pm.destParam.name,
        value: pm.staticValue,
      });
    }
  }

  return params;
}

// ── Variable Builders ───────────────────────────────────────────────

function ensureDataLayerVariable(
  name: string,
  dataLayerPath: string,
  variables: DesiredVariable[],
  variableNames: Set<string>,
) {
  if (variableNames.has(name)) return;
  variableNames.add(name);
  variables.push(buildDataLayerVariable(name, dataLayerPath));
}

function buildDataLayerVariable(
  name: string,
  dataLayerPath: string,
): DesiredVariable {
  return {
    name,
    type: "v",
    config: [
      { type: "INTEGER", key: "dataLayerVersion", value: "2" },
      { type: "BOOLEAN", key: "setDefaultValue", value: "false" },
      { type: "TEMPLATE", key: "name", value: dataLayerPath },
    ],
  };
}

function buildConstantVariable(
  name: string,
  value: string,
): DesiredVariable {
  return {
    name,
    type: "c",
    config: [{ type: "TEMPLATE", key: "value", value }],
  };
}

function buildCustomJsVariable(
  name: string,
  javascript: string,
): DesiredVariable {
  return {
    name,
    type: "jsm",
    config: [{ type: "TEMPLATE", key: "javascript", value: javascript }],
  };
}

// ── Trigger Builder ─────────────────────────────────────────────────

function buildCustomEventTrigger(eventName: string): DesiredTrigger {
  return {
    name: `${PREFIX} ce - ${eventName}`,
    type: "CUSTOM_EVENT",
    config: {
      customEventFilter: [
        {
          type: "EQUALS",
          parameter: [
            { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
            { type: "TEMPLATE", key: "arg1", value: eventName },
          ],
        },
      ],
    },
  };
}
