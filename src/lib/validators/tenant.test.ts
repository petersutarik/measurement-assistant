import { describe, expect, it } from "vitest";
import { createProjectSchema, projectUrlSchema } from "./tenant";

describe("projectUrlSchema", () => {
  it("accepts http and https URLs", () => {
    expect(projectUrlSchema.parse("https://example.com")).toBe(
      "https://example.com/"
    );
    expect(projectUrlSchema.parse("http://example.com")).toBe(
      "http://example.com/"
    );
  });

  it("rejects non-http protocols", () => {
    expect(() => projectUrlSchema.parse("mailto:test@example.com")).toThrow(
      "URL must start with http:// or https://"
    );
  });
});

describe("createProjectSchema", () => {
  it("requires a project URL", () => {
    expect(() =>
      createProjectSchema.parse({
        organizationId: crypto.randomUUID(),
        name: "Example",
        slug: "example",
      })
    ).toThrow();
  });
});
