/**
 * @fileoverview Unit tests for the Strategy pattern (lib/patterns/strategy.js).
 * Tests each concrete sort strategy, the SortContext delegation mechanism,
 * and the getSortStrategy factory helper.
 */

import {
  SortStrategy,
  SortByName,
  SortByDate,
  SortByPrice,
  SortContext,
  getSortStrategy,
} from "@/lib/patterns/strategy.js";

describe("Strategy Pattern — Sorting", () => {
  // ── SortStrategy (abstract base) ─────────────────────────────────────────

  describe("SortStrategy (abstract base)", () => {
    test("sort() throws when called directly on the base class", () => {
      const base = Object.create(SortStrategy.prototype);
      expect(() => base.sort([], "asc")).toThrow("is not implemented");
    });
  });

  // ── SortByName ────────────────────────────────────────────────────────────

  describe("SortByName", () => {
    const items = [
      { name: "Žilvinas" },
      { name: "Ąžuolas" },
      { name: "Benas" },
      { name: "Česlovas" },
    ];
    let strategy;

    beforeEach(() => {
      strategy = new SortByName();
    });

    test("is an instance of SortStrategy", () => {
      expect(strategy instanceof SortStrategy).toBe(true);
    });

    test("sorts ascending with correct Lithuanian locale order", () => {
      const sorted = strategy.sort(items, "asc");
      // Lithuanian order: Ą < B < Č < Ž
      expect(sorted[0].name).toBe("Ąžuolas");
      expect(sorted[3].name).toBe("Žilvinas");
    });

    test("sorts descending (Ž→A)", () => {
      const sorted = strategy.sort(items, "desc");
      expect(sorted[0].name).toBe("Žilvinas");
      expect(sorted[3].name).toBe("Ąžuolas");
    });

    test("does not mutate the original array", () => {
      const copy = [...items];
      strategy.sort(items, "asc");
      expect(items).toEqual(copy);
    });

    test("falls back to fullName field when name is absent", () => {
      const owners = [{ fullName: "Zygimantas" }, { fullName: "Antanas" }];
      const sorted = strategy.sort(owners, "asc");
      expect(sorted[0].fullName).toBe("Antanas");
    });

    test("returns array with same length as input", () => {
      const sorted = strategy.sort(items, "asc");
      expect(sorted).toHaveLength(items.length);
    });
  });

  // ── SortByDate ────────────────────────────────────────────────────────────

  describe("SortByDate", () => {
    const visits = [
      { date: new Date("2025-06-15") },
      { date: new Date("2024-01-01") },
      { date: new Date("2025-12-31") },
    ];
    let strategy;

    beforeEach(() => {
      strategy = new SortByDate();
    });

    test("sorts ascending (oldest first)", () => {
      const sorted = strategy.sort(visits, "asc");
      expect(sorted[0].date).toEqual(new Date("2024-01-01"));
      expect(sorted[2].date).toEqual(new Date("2025-12-31"));
    });

    test("sorts descending (newest first)", () => {
      const sorted = strategy.sort(visits, "desc");
      expect(sorted[0].date).toEqual(new Date("2025-12-31"));
    });

    test("pushes null/missing dates to the end", () => {
      const withNull = [{ date: null }, { date: new Date("2025-01-01") }];
      const sorted = strategy.sort(withNull, "asc");
      expect(sorted[1].date).toBeNull();
    });

    test("falls back to createdAt when date is absent", () => {
      const items = [
        { createdAt: new Date("2025-09-01") },
        { createdAt: new Date("2025-01-01") },
      ];
      const sorted = strategy.sort(items, "asc");
      expect(sorted[0].createdAt).toEqual(new Date("2025-01-01"));
    });
  });

  // ── SortByPrice ───────────────────────────────────────────────────────────

  describe("SortByPrice", () => {
    const services = [
      { name: "Vaccine", price: 30 },
      { name: "Checkup", price: 10 },
      { name: "Surgery", price: 200 },
    ];
    let strategy;

    beforeEach(() => {
      strategy = new SortByPrice();
    });

    test("sorts ascending (cheapest first)", () => {
      const sorted = strategy.sort(services, "asc");
      expect(sorted[0].price).toBe(10);
      expect(sorted[2].price).toBe(200);
    });

    test("sorts descending (most expensive first)", () => {
      const sorted = strategy.sort(services, "desc");
      expect(sorted[0].price).toBe(200);
    });

    test("falls back to totalCost field when price is absent", () => {
      const visits = [{ totalCost: 150 }, { totalCost: 50 }];
      const sorted = strategy.sort(visits, "asc");
      expect(sorted[0].totalCost).toBe(50);
    });

    test("treats missing price/totalCost as 0", () => {
      const items = [{ name: "A" }, { name: "B", price: 5 }];
      const sorted = strategy.sort(items, "asc");
      expect(sorted[0].name).toBe("A");
    });
  });

  // ── SortContext ───────────────────────────────────────────────────────────

  describe("SortContext", () => {
    test("throws when constructed with a non-SortStrategy argument", () => {
      expect(() => new SortContext({})).toThrow("SortContext requires a SortStrategy instance");
    });

    test("accepts a valid SortStrategy instance", () => {
      const ctx = new SortContext(new SortByName());
      expect(ctx).toBeTruthy();
    });

    test("executeSort delegates to the active strategy", () => {
      const items = [{ name: "Zebra" }, { name: "Apple" }];
      const ctx = new SortContext(new SortByName());
      const sorted = ctx.executeSort(items, "asc");
      expect(sorted[0].name).toBe("Apple");
    });

    test("setStrategy swaps the strategy at runtime", () => {
      const items = [{ price: 100 }, { price: 10 }];
      const ctx = new SortContext(new SortByName());
      ctx.setStrategy(new SortByPrice());
      const sorted = ctx.executeSort(items, "asc");
      expect(sorted[0].price).toBe(10);
    });

    test("setStrategy throws for invalid argument", () => {
      const ctx = new SortContext(new SortByDate());
      expect(() => ctx.setStrategy("not-a-strategy")).toThrow();
    });
  });

  // ── getSortStrategy ───────────────────────────────────────────────────────

  describe("getSortStrategy()", () => {
    afterEach(() => {
      // No state to clean up — pure function
    });

    test("returns SortByName for 'name'", () => {
      expect(getSortStrategy("name") instanceof SortByName).toBe(true);
    });

    test("returns SortByDate for 'date'", () => {
      expect(getSortStrategy("date") instanceof SortByDate).toBe(true);
    });

    test("returns SortByDate for 'createdAt'", () => {
      expect(getSortStrategy("createdAt") instanceof SortByDate).toBe(true);
    });

    test("returns SortByPrice for 'price'", () => {
      expect(getSortStrategy("price") instanceof SortByPrice).toBe(true);
    });

    test("returns SortByPrice for 'totalCost'", () => {
      expect(getSortStrategy("totalCost") instanceof SortByPrice).toBe(true);
    });

    test("returns SortByName for unknown field (default fallback)", () => {
      expect(getSortStrategy("unknown") instanceof SortByName).toBe(true);
    });

    test("each call returns a new strategy instance", () => {
      const a = getSortStrategy("name");
      const b = getSortStrategy("name");
      expect(a).not.toBe(b);
    });
  });
});
