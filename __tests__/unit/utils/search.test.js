/**
 * @fileoverview Unit tests for the search utility (lib/utils/search.js).
 * Tests that buildSearchFilter correctly builds Prisma OR filters,
 * returns undefined for blank/falsy inputs, and handles multiple fields.
 */

import { buildSearchFilter } from "@/lib/utils/search.js";

describe("buildSearchFilter()", () => {
  // ── Empty / falsy inputs ──────────────────────────────────────────────────

  describe("returns undefined for blank or falsy inputs", () => {
    test("returns undefined for an empty string", () => {
      expect(buildSearchFilter("", ["name"])).toBeUndefined();
    });

    test("returns undefined for a whitespace-only string", () => {
      expect(buildSearchFilter("   ", ["name"])).toBeUndefined();
    });

    test("returns undefined for null", () => {
      expect(buildSearchFilter(null, ["name"])).toBeUndefined();
    });

    test("returns undefined for undefined", () => {
      expect(buildSearchFilter(undefined, ["name"])).toBeUndefined();
    });
  });

  // ── Single field ──────────────────────────────────────────────────────────

  describe("single-field search", () => {
    let result;

    beforeAll(() => {
      result = buildSearchFilter("rex", ["name"]);
    });

    test("returns an object (not undefined)", () => {
      expect(result).toBeTruthy();
    });

    test("result has an OR array", () => {
      expect(Array.isArray(result.OR)).toBe(true);
    });

    test("OR array has exactly one entry for one field", () => {
      expect(result.OR).toHaveLength(1);
    });

    test("OR entry targets the correct field", () => {
      expect(Object.keys(result.OR[0])).toContain("name");
    });

    test("OR entry uses contains with insensitive mode", () => {
      expect(result.OR[0].name).toEqual({ contains: "rex", mode: "insensitive" });
    });
  });

  // ── Multiple fields ───────────────────────────────────────────────────────

  describe("multi-field search", () => {
    const fields = ["firstName", "lastName", "email"];
    let result;

    beforeAll(() => {
      result = buildSearchFilter("Jonas", fields);
    });

    test("OR array has one entry per field", () => {
      expect(result.OR).toHaveLength(3);
    });

    test("OR array entries cover all specified fields", () => {
      const keys = result.OR.map((condition) => Object.keys(condition)[0]);
      expect(keys).toContain("firstName");
      expect(keys).toContain("lastName");
      expect(keys).toContain("email");
    });

    test("each entry uses the same search term", () => {
      result.OR.forEach((condition) => {
        const fieldName = Object.keys(condition)[0];
        expect(condition[fieldName].contains).toBe("Jonas");
      });
    });

    test("each entry uses insensitive mode", () => {
      result.OR.forEach((condition) => {
        const fieldName = Object.keys(condition)[0];
        expect(condition[fieldName].mode).toBe("insensitive");
      });
    });
  });

  // ── Whitespace trimming ───────────────────────────────────────────────────

  describe("whitespace trimming", () => {
    test("trims leading whitespace before building the filter", () => {
      const result = buildSearchFilter("  rex", ["name"]);
      expect(result.OR[0].name.contains).toBe("rex");
    });

    test("trims trailing whitespace before building the filter", () => {
      const result = buildSearchFilter("rex   ", ["name"]);
      expect(result.OR[0].name.contains).toBe("rex");
    });

    test("trims both sides", () => {
      const result = buildSearchFilter("  Jonas  ", ["firstName"]);
      expect(result.OR[0].firstName.contains).toBe("Jonas");
    });
  });
});
