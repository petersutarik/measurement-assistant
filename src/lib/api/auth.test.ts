import { describe, it, expect } from "vitest";
import { hashApiKey, generateApiKey } from "./auth";

describe("API auth utilities", () => {
  describe("generateApiKey", () => {
    it("generates keys with ma_live_ prefix", () => {
      const key = generateApiKey();
      expect(key).toMatch(/^ma_live_[a-f0-9]{64}$/);
    });

    it("generates unique keys", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe("hashApiKey", () => {
    it("returns consistent SHA-256 hex hash", async () => {
      const hash1 = await hashApiKey("test-key");
      const hash2 = await hashApiKey("test-key");
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces different hashes for different keys", async () => {
      const hash1 = await hashApiKey("key-1");
      const hash2 = await hashApiKey("key-2");
      expect(hash1).not.toBe(hash2);
    });
  });
});
