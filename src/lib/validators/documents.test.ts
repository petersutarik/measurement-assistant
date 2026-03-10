import { describe, it, expect } from "vitest";
import { createDocumentSchema, updateDocumentSchema } from "./documents";

describe("createDocumentSchema", () => {
  it("accepts valid input", () => {
    const result = createDocumentSchema.safeParse({
      title: "My Document",
      specVersionId: "00000000-0000-4000-8000-000000000001",
      eventIds: ["00000000-0000-4000-8000-000000000002"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createDocumentSchema.safeParse({
      title: "",
      specVersionId: "00000000-0000-4000-8000-000000000001",
      eventIds: ["00000000-0000-4000-8000-000000000002"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty eventIds", () => {
    const result = createDocumentSchema.safeParse({
      title: "Test",
      specVersionId: "00000000-0000-4000-8000-000000000001",
      eventIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID specVersionId", () => {
    const result = createDocumentSchema.safeParse({
      title: "Test",
      specVersionId: "not-a-uuid",
      eventIds: ["00000000-0000-4000-8000-000000000002"],
    });
    expect(result.success).toBe(false);
  });

  it("allows optional description", () => {
    const result = createDocumentSchema.safeParse({
      title: "Test",
      description: "A description",
      specVersionId: "00000000-0000-4000-8000-000000000001",
      eventIds: ["00000000-0000-4000-8000-000000000002"],
    });
    expect(result.success).toBe(true);
  });
});

describe("updateDocumentSchema", () => {
  it("accepts partial update", () => {
    expect(updateDocumentSchema.safeParse({ title: "New" }).success).toBe(true);
    expect(updateDocumentSchema.safeParse({ description: "Desc" }).success).toBe(true);
    expect(updateDocumentSchema.safeParse({}).success).toBe(true);
  });
});
