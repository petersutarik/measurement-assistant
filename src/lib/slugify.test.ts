import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("converts text to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("my project")).toBe("my-project");
  });

  it("removes special characters", () => {
    expect(slugify("Hello! World@2024")).toBe("hello-world-2024");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("hello---world")).toBe("hello-world");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("handles accented/non-ascii characters by removing them", () => {
    expect(slugify("café résumé")).toBe("caf-r-sum");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("handles purely numeric input", () => {
    expect(slugify("123 456")).toBe("123-456");
  });
});
