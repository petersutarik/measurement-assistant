import { describe, it, expect } from "vitest";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  createEventSchema,
  updateEventSchema,
  createParameterSchema,
  updateParameterSchema,
} from "./spec";

describe("createWorkspaceSchema", () => {
  it("accepts valid input", () => {
    expect(() =>
      createWorkspaceSchema.parse({ name: "Main dataLayer" })
    ).not.toThrow();
  });

  it("accepts name with description", () => {
    const result = createWorkspaceSchema.parse({
      name: "Main",
      description: "Primary workspace",
    });
    expect(result.description).toBe("Primary workspace");
  });

  it("rejects empty name", () => {
    expect(() => createWorkspaceSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 100 chars", () => {
    expect(() =>
      createWorkspaceSchema.parse({ name: "a".repeat(101) })
    ).toThrow();
  });

  it("rejects description over 500 chars", () => {
    expect(() =>
      createWorkspaceSchema.parse({
        name: "OK",
        description: "x".repeat(501),
      })
    ).toThrow();
  });

  it("allows description to be omitted", () => {
    const result = createWorkspaceSchema.parse({ name: "Test" });
    expect(result.description).toBeUndefined();
  });
});

describe("updateWorkspaceSchema", () => {
  it("accepts valid input", () => {
    expect(() =>
      updateWorkspaceSchema.parse({ name: "Updated" })
    ).not.toThrow();
  });
});

describe("createEventSchema", () => {
  it("accepts minimal input", () => {
    expect(() => createEventSchema.parse({ name: "purchase" })).not.toThrow();
  });

  it("accepts all optional fields", () => {
    const result = createEventSchema.parse({
      name: "purchase",
      description: "Fired on purchase",
      trigger: "on click",
      pagePattern: "/checkout/*",
      category: "ecommerce",
      exampleUrls: ["https://example.com/checkout"],
      implementationNotes: "Use GTM",
    });
    expect(result.category).toBe("ecommerce");
  });

  it("rejects empty name", () => {
    expect(() => createEventSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 200 chars", () => {
    expect(() =>
      createEventSchema.parse({ name: "a".repeat(201) })
    ).toThrow();
  });

  it("rejects invalid URLs in exampleUrls", () => {
    expect(() =>
      createEventSchema.parse({
        name: "test",
        exampleUrls: ["not-a-url"],
      })
    ).toThrow();
  });

  it("accepts empty exampleUrls array", () => {
    const result = createEventSchema.parse({
      name: "test",
      exampleUrls: [],
    });
    expect(result.exampleUrls).toEqual([]);
  });
});

describe("updateEventSchema", () => {
  it("accepts valid input", () => {
    expect(() => updateEventSchema.parse({ name: "updated" })).not.toThrow();
  });
});

describe("createParameterSchema", () => {
  it("accepts minimal input", () => {
    expect(() =>
      createParameterSchema.parse({ name: "transaction_id", type: "string" })
    ).not.toThrow();
  });

  it("accepts all optional fields", () => {
    const result = createParameterSchema.parse({
      name: "items",
      type: "array",
      description: "List of purchased items",
      isRequired: true,
      exampleValue: "[{...}]",
      origin: "cart",
      parentId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.isRequired).toBe(true);
    expect(result.parentId).toBeDefined();
  });

  it("rejects invalid type", () => {
    expect(() =>
      createParameterSchema.parse({ name: "x", type: "integer" })
    ).toThrow();
  });

  it("accepts all valid types", () => {
    for (const type of ["string", "number", "boolean", "array", "object"]) {
      expect(() =>
        createParameterSchema.parse({ name: "x", type })
      ).not.toThrow();
    }
  });

  it("rejects invalid parentId format", () => {
    expect(() =>
      createParameterSchema.parse({
        name: "x",
        type: "string",
        parentId: "not-a-uuid",
      })
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      createParameterSchema.parse({ name: "", type: "string" })
    ).toThrow();
  });
});

describe("updateParameterSchema", () => {
  it("accepts valid input", () => {
    expect(() =>
      updateParameterSchema.parse({ name: "updated", type: "number" })
    ).not.toThrow();
  });

  it("does not accept parentId", () => {
    const result = updateParameterSchema.parse({
      name: "x",
      type: "string",
      parentId: "550e8400-e29b-41d4-a716-446655440000",
    });
    // parentId is stripped (not in schema)
    expect("parentId" in result).toBe(false);
  });
});
