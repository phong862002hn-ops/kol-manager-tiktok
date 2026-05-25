import { describe, it, expect } from "vitest";
import { normalizeUsername } from "@/lib/normalize";

describe("normalizeUsername", () => {
  it("should strip @ prefix and lowercase", () => {
    expect(normalizeUsername("@Linh")).toBe("linh");
  });

  it("should return empty string for empty input", () => {
    expect(normalizeUsername("")).toBe("");
  });

  it("should return empty string for null", () => {
    expect(normalizeUsername(null)).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(normalizeUsername(undefined)).toBe("");
  });

  it("should lowercase ALL CAPS username", () => {
    expect(normalizeUsername("USERNAME")).toBe("username");
  });

  it("should trim leading and trailing whitespace", () => {
    expect(normalizeUsername("  username  ")).toBe("username");
  });

  it("should handle combined @ + caps + trailing space", () => {
    expect(normalizeUsername("@USERNAME ")).toBe("username");
  });

  it("should preserve dots and digits in username", () => {
    expect(normalizeUsername("linh.123")).toBe("linh.123");
  });
});
