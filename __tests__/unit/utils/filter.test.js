/**
 * @fileoverview Unit tests for the filter utility (lib/utils/filter.js).
 * Tests that buildFilterConditions correctly constructs Prisma WHERE clauses
 * for all supported filter keys, coerces FK values to Numbers, and handles
 * date-range parsing.
 */

import { buildFilterConditions } from "@/lib/utils/filter.js";

describe("buildFilterConditions()", () => {
  // ── Empty / no filters ────────────────────────────────────────────────────

  describe("empty filters", () => {
    test("returns an empty object for no filters", () => {
      expect(buildFilterConditions({})).toEqual({});
    });

    test("ignores falsy values — undefined keys are skipped", () => {
      const result = buildFilterConditions({ vetId: undefined, species: undefined });
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  // ── species filter ────────────────────────────────────────────────────────

  describe("species filter", () => {
    let result;

    beforeAll(() => {
      result = buildFilterConditions({ species: "Šuo" });
    });

    test("includes a species key in the WHERE clause", () => {
      expect(result).toHaveProperty("species");
    });

    test("uses equals with insensitive mode", () => {
      expect(result.species).toEqual({ equals: "Šuo", mode: "insensitive" });
    });
  });

  // ── Foreign key filters (vetId, ownerId, petId) ───────────────────────────

  describe("foreign key filters", () => {
    test("coerces string vetId to a Number", () => {
      const result = buildFilterConditions({ vetId: "3" });
      expect(result.vetId).toBe(3);
      expect(typeof result.vetId).toBe("number");
    });

    test("coerces string ownerId to a Number", () => {
      const result = buildFilterConditions({ ownerId: "7" });
      expect(result.ownerId).toBe(7);
    });

    test("coerces string petId to a Number", () => {
      const result = buildFilterConditions({ petId: "12" });
      expect(result.petId).toBe(12);
    });

    test("accepts numeric vetId as-is", () => {
      const result = buildFilterConditions({ vetId: 5 });
      expect(result.vetId).toBe(5);
    });
  });

  // ── status filter ─────────────────────────────────────────────────────────

  describe("status filter", () => {
    test("includes exact status string in WHERE clause", () => {
      const result = buildFilterConditions({ status: "scheduled" });
      expect(result.status).toBe("scheduled");
    });

    it("works for 'completed' status", () => {
      const result = buildFilterConditions({ status: "completed" });
      expect(result.status).toBe("completed");
    });

    it("works for 'cancelled' status", () => {
      const result = buildFilterConditions({ status: "cancelled" });
      expect(result.status).toBe("cancelled");
    });
  });

  // ── date range filters ────────────────────────────────────────────────────

  describe("date range (from / to)", () => {
    test("'from' produces a date.gte filter", () => {
      const result = buildFilterConditions({ from: "2026-03-01" });
      expect(result.date).toBeTruthy();
      expect(result.date.gte instanceof Date).toBe(true);
    });

    test("'to' produces a date.lte filter", () => {
      const result = buildFilterConditions({ to: "2026-03-31" });
      expect(result.date.lte instanceof Date).toBe(true);
    });

    test("both 'from' and 'to' produce gte and lte", () => {
      const result = buildFilterConditions({
        from: "2026-03-01",
        to: "2026-03-31",
      });
      expect(result.date).toHaveProperty("gte");
      expect(result.date).toHaveProperty("lte");
    });

    test("date string is parsed to UTC noon to avoid timezone shifts", () => {
      const result = buildFilterConditions({ from: "2026-03-01" });
      const hours = result.date.gte.getUTCHours();
      expect(hours).toBe(12);
    });

    test("'from' date is before 'to' date when both provided", () => {
      const result = buildFilterConditions({
        from: "2026-01-01",
        to: "2026-12-31",
      });
      expect(result.date.gte < result.date.lte).toBe(true);
    });
  });

  // ── combined filters ──────────────────────────────────────────────────────

  describe("combined filters (AND logic)", () => {
    let result;

    beforeAll(() => {
      result = buildFilterConditions({
        vetId: "2",
        status: "scheduled",
        from: "2026-03-01",
        to: "2026-03-31",
      });
    });

    test("result contains vetId, status, and date", () => {
      expect(result).toHaveProperty("vetId");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("date");
    });

    test("vetId is coerced to number in combined result", () => {
      expect(result.vetId).toBe(2);
    });

    test("status is preserved in combined result", () => {
      expect(result.status).toBe("scheduled");
    });

    test("returns an object with exactly 3 keys for this combination", () => {
      expect(Object.keys(result)).toHaveLength(3);
    });
  });
});
