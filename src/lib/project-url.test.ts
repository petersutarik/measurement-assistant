import { describe, expect, it } from "vitest";
import { getProjectFaviconUrl, parseProjectUrl } from "./project-url";

describe("parseProjectUrl", () => {
  it("returns hostname and normalized href for valid https URLs", () => {
    expect(parseProjectUrl("https://example.com/path?x=1")).toEqual({
      href: "https://example.com/path?x=1",
      hostname: "example.com",
    });
  });

  it("returns null for invalid URLs", () => {
    expect(parseProjectUrl("example.com")).toBeNull();
  });

  it("returns null for unsupported protocols", () => {
    expect(parseProjectUrl("mailto:test@example.com")).toBeNull();
  });
});

describe("getProjectFaviconUrl", () => {
  it("encodes the hostname", () => {
    expect(getProjectFaviconUrl("example.com", 32)).toBe(
      "https://www.google.com/s2/favicons?domain=example.com&sz=32"
    );
  });
});
