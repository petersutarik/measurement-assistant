import { describe, it, expect } from "vitest";
import { generateDesiredState, type GeneratorInput } from "./generator";
import type { DestinationMapping } from "./types";

const ga4Destination: DestinationMapping = {
  projectDestinationId: "pd-ga4",
  destinationSlug: "ga4",
  destinationName: "Google Analytics 4",
  config: { measurementId: "G-TEST123" },
  aiInstructions: null,
  eventMappings: [
    {
      id: "em-1",
      sourceEvent: {
        id: "se-1",
        name: "purchase",
        description: "User completes purchase",
      },
      destEvent: {
        id: "de-1",
        name: "purchase",
        description: "GA4 purchase event",
        category: "ecommerce",
      },
      parameterMappings: [
        {
          id: "pm-1",
          sourceParam: { id: "sp-1", name: "transaction_id" },
          destParam: {
            id: "dp-1",
            name: "transaction_id",
            type: "string",
            isRequired: true,
            scope: "default",
          },
          mappingType: "reference",
          staticValue: null,
        },
        {
          id: "pm-2",
          sourceParam: { id: "sp-2", name: "value" },
          destParam: {
            id: "dp-2",
            name: "value",
            type: "number",
            isRequired: false,
            scope: "default",
          },
          mappingType: "reference",
          staticValue: null,
        },
        {
          id: "pm-3",
          sourceParam: { id: "sp-3", name: "currency" },
          destParam: {
            id: "dp-3",
            name: "currency",
            type: "string",
            isRequired: false,
            scope: "default",
          },
          mappingType: "reference",
          staticValue: null,
        },
      ],
    },
    {
      id: "em-2",
      sourceEvent: {
        id: "se-2",
        name: "add_to_cart",
        description: "User adds item to cart",
      },
      destEvent: {
        id: "de-2",
        name: "add_to_cart",
        description: "GA4 add_to_cart event",
        category: "ecommerce",
      },
      parameterMappings: [
        {
          id: "pm-4",
          sourceParam: { id: "sp-4", name: "items" },
          destParam: {
            id: "dp-4",
            name: "items",
            type: "array",
            isRequired: false,
            scope: "default",
          },
          mappingType: "reference",
          staticValue: null,
        },
      ],
    },
  ],
};

const metaDestination: DestinationMapping = {
  projectDestinationId: "pd-meta",
  destinationSlug: "meta-pixel",
  destinationName: "Meta",
  config: { pixelId: "123456789" },
  aiInstructions: null,
  eventMappings: [
    {
      id: "em-3",
      sourceEvent: {
        id: "se-1",
        name: "purchase",
        description: "User completes purchase",
      },
      destEvent: {
        id: "de-3",
        name: "Purchase",
        description: "Meta Purchase event",
        category: "ecommerce",
      },
      parameterMappings: [
        {
          id: "pm-5",
          sourceParam: { id: "sp-2", name: "value" },
          destParam: {
            id: "dp-5",
            name: "value",
            type: "number",
            isRequired: false,
            scope: null,
          },
          mappingType: "reference",
          staticValue: null,
        },
        {
          id: "pm-6",
          sourceParam: null,
          destParam: {
            id: "dp-6",
            name: "content_type",
            type: "string",
            isRequired: false,
            scope: null,
          },
          mappingType: "static",
          staticValue: "product",
        },
      ],
    },
  ],
};

describe("generateDesiredState", () => {
  it("generates GA4 config tag, event tags, triggers, and variables", () => {
    const input: GeneratorInput = {
      projectName: "Test Project",
      destinations: [ga4Destination],
    };

    const state = generateDesiredState(input);

    // Folder
    expect(state.folderName).toBe("[MA] Measurement Assistant");

    // Triggers — one per unique spec event
    expect(state.triggers).toHaveLength(2);
    expect(state.triggers.map((t) => t.name)).toContain(
      "[MA] ce - purchase",
    );
    expect(state.triggers.map((t) => t.name)).toContain(
      "[MA] ce - add_to_cart",
    );

    // All triggers are CUSTOM_EVENT type
    for (const t of state.triggers) {
      expect(t.type).toBe("CUSTOM_EVENT");
      expect(t.config.customEventFilter).toBeDefined();
    }

    // Variables — measurement ID constant + DL variables for mapped params
    const varNames = state.variables.map((v) => v.name);
    expect(varNames).toContain("[MA] const - GA4 Measurement ID");
    expect(varNames).toContain("[MA] dlv - transaction_id");
    expect(varNames).toContain("[MA] dlv - value");
    expect(varNames).toContain("[MA] dlv - currency");
    // items is skipped (handled via sendEcommerceData)
    expect(varNames).not.toContain("[MA] dlv - items");

    // Tags — config + 2 event tags
    expect(state.tags).toHaveLength(3);

    const configTag = state.tags.find((t) => t.type === "gaawc");
    expect(configTag).toBeDefined();
    expect(configTag!.name).toBe("[MA] GA4 Config - G-TEST123");
    expect(configTag!.firingTriggerNames).toContain("All Pages");

    const purchaseTag = state.tags.find(
      (t) => t.name === "[MA] GA4 - purchase",
    );
    expect(purchaseTag).toBeDefined();
    expect(purchaseTag!.type).toBe("gaawe");
    expect(purchaseTag!.firingTriggerNames).toContain(
      "[MA] ce - purchase",
    );

    // add_to_cart tag should have sendEcommerceData
    const addToCartTag = state.tags.find(
      (t) => t.name === "[MA] GA4 - add_to_cart",
    );
    expect(addToCartTag).toBeDefined();
    const ecomParam = addToCartTag!.config.find(
      (p) => p.key === "sendEcommerceData",
    );
    expect(ecomParam?.value).toBe("true");
  });

  it("generates Meta tags with Stape template type", () => {
    const input: GeneratorInput = {
      projectName: "Test Project",
      destinations: [metaDestination],
      metaTemplateType: "cvt_12345_67",
    };

    const state = generateDesiredState(input);

    // Pixel ID constant
    const pixelVar = state.variables.find(
      (v) => v.name === "[MA] const - Meta Pixel ID",
    );
    expect(pixelVar).toBeDefined();
    expect(pixelVar!.type).toBe("c");

    // Meta tag
    const metaTag = state.tags.find(
      (t) => t.name === "[MA] Meta - Purchase",
    );
    expect(metaTag).toBeDefined();
    expect(metaTag!.type).toBe("cvt_12345_67");

    // Should use Stape template field names with lowercase types
    const paramKeys = metaTag!.config.map((p) => p.key);
    expect(paramKeys).toContain("pixelIds");
    expect(paramKeys).toContain("inheritEventName");
    expect(paramKeys).toContain("eventName");
    expect(paramKeys).toContain("objectPropertiesList");

    // Purchase is a standard Meta event
    const eventNameType = metaTag!.config.find((p) => p.key === "eventName");
    expect(eventNameType?.value).toBe("standard");
    expect(eventNameType?.type).toBe("template"); // lowercase for community templates
    const eventNameStandard = metaTag!.config.find(
      (p) => p.key === "eventNameStandard",
    );
    expect(eventNameStandard?.value).toBe("Purchase");

    // Object properties should include value and content_type
    const objProps = metaTag!.config.find(
      (p) => p.key === "objectPropertiesList" && p.type === "list",
    );
    expect(objProps).toBeDefined();
    expect(objProps?.list).toHaveLength(2); // value + content_type
  });

  it("deduplicates DL variables across destinations", () => {
    const input: GeneratorInput = {
      projectName: "Test Project",
      destinations: [ga4Destination, metaDestination],
      metaTemplateType: "cvt_12345_67",
    };

    const state = generateDesiredState(input);

    // "value" is used by both GA4 and Meta — should only appear once
    const valueVars = state.variables.filter(
      (v) => v.name === "[MA] dlv - value",
    );
    expect(valueVars).toHaveLength(1);
  });

  it("throws when GA4 is missing measurementId", () => {
    const badDest: DestinationMapping = {
      ...ga4Destination,
      config: {},
    };

    expect(() =>
      generateDesiredState({
        projectName: "Test",
        destinations: [badDest],
      }),
    ).toThrow("measurementId");
  });

  it("throws when Meta is missing pixelId", () => {
    const badDest: DestinationMapping = {
      ...metaDestination,
      config: {},
    };

    expect(() =>
      generateDesiredState({
        projectName: "Test",
        destinations: [badDest],
        metaTemplateType: "cvt_12345_67",
      }),
    ).toThrow("pixelId");
  });

  it("applies Meta AI transform bindings", () => {
    const input: GeneratorInput = {
      projectName: "Test Project",
      destinations: [metaDestination],
      metaTemplateType: "cvt_12345_67",
      metaTransforms: {
        variables: [
          {
            name: "[MA] cjs - items to contents",
            type: "jsm",
            config: {
              javascript:
                'function() { return []; }',
            },
            description: "Transform items to Meta contents format",
          },
        ],
        parameterBindings: [
          {
            eventName: "Purchase",
            paramName: "contents",
            variableReference: "{{[MA] cjs - items to contents}}",
          },
        ],
      },
    };

    const state = generateDesiredState(input);

    // CJS variable should be added
    const cjsVar = state.variables.find(
      (v) => v.name === "[MA] cjs - items to contents",
    );
    expect(cjsVar).toBeDefined();
    expect(cjsVar!.type).toBe("jsm");
  });

  it("creates correct Custom Event trigger config", () => {
    const input: GeneratorInput = {
      projectName: "Test",
      destinations: [ga4Destination],
    };

    const state = generateDesiredState(input);
    const trigger = state.triggers.find(
      (t) => t.name === "[MA] ce - purchase",
    );

    expect(trigger).toBeDefined();
    expect(trigger!.config.customEventFilter).toHaveLength(1);

    const filter = trigger!.config.customEventFilter![0];
    expect(filter.type).toBe("EQUALS");
    expect(filter.parameter).toHaveLength(2);

    const arg0 = filter.parameter.find((p) => p.key === "arg0");
    expect(arg0?.value).toBe("{{_event}}");

    const arg1 = filter.parameter.find((p) => p.key === "arg1");
    expect(arg1?.value).toBe("purchase");
  });
});
