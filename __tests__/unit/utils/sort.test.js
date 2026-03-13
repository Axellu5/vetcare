/**
 * @fileoverview Unit tests for sort utilities derived from the Strategy pattern
 * (lib/patterns/strategy.js). Tests Lithuanian-locale name sorting, date sorting,
 * price sorting, and the getSortStrategy factory helper as standalone utilities.
 */

import {
  SortByName,
  SortByDate,
  SortByPrice,
  getSortStrategy,
} from "@/lib/patterns/strategy.js";

// ── Shared fixtures ───────────────────────────────────────────────────────────

const NAMES_MIXED = [
  { name: "Žilvinas" },
  { name: "Ąžuolas" },
  { name: "Benas" },
  { name: "Česlovas" },
  { name: "Aurimas" },
];

const DATES_UNSORTED = [
  { date: new Date("2025-06-15") },
  { date: new Date("2024-01-01") },
  { date: new Date("2026-01-01") },
  { date: new Date("2025-01-01") },
];

const PRICES_UNSORTED = [
  { name: "Vaccination", price: 30 },
  { name: "Consultation", price: 0 },
  { name: "Surgery", price: 200 },
  { name: "Checkup", price: 15 },
];

// ─────────────────────────────────────────────────────────────────────────────

describe("Sort Utility — SortByName", () => {
  let strategy;

  beforeAll(() => {
    strategy = new SortByName();
  });

  test("sorted ASC array has same length as input", () => {
    const sorted = strategy.sort(NAMES_MIXED, "asc");
    expect(sorted).toHaveLength(NAMES_MIXED.length);
  });

  test("first item in ASC order is Aurimas (A comes before Ą in Lithuanian)", () => {
    const sorted = strategy.sort(NAMES_MIXED, "asc");
    expect(sorted[0].name).toBe("Aurimas");
  });

  test("last item in ASC order is Žilvinas (Ž is last in Lithuanian alphabet)", () => {
    const sorted = strategy.sort(NAMES_MIXED, "asc");
    expect(sorted[sorted.length - 1].name).toBe("Žilvinas");
  });

  test("ASC order: Aurimas → Ąžuolas → Benas → Česlovas → Žilvinas", () => {
    // Lithuanian alphabet: A < Ą < B < C < Č < ... < Z < Ž
    const sorted = strategy.sort(NAMES_MIXED, "asc");
    expect(sorted.map((x) => x.name)).toEqual([
      "Aurimas",
      "Ąžuolas",
      "Benas",
      "Česlovas",
      "Žilvinas",
    ]);
  });

  test("first item in DESC order is Žilvinas", () => {
    const sorted = strategy.sort(NAMES_MIXED, "desc");
    expect(sorted[0].name).toBe("Žilvinas");
  });

  test("does not mutate the original array", () => {
    const original = NAMES_MIXED.map((x) => ({ ...x }));
    strategy.sort(NAMES_MIXED, "asc");
    expect(NAMES_MIXED).toEqual(original);
  });

  test("uses fullName fallback when name property is absent", () => {
    const items = [{ fullName: "Zygimantas" }, { fullName: "Aldona" }];
    const sorted = strategy.sort(items, "asc");
    expect(sorted[0].fullName).toBe("Aldona");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Sort Utility — SortByDate", () => {
  let strategy;

  beforeAll(() => {
    strategy = new SortByDate();
  });

  test("sorted ASC result has same length as input", () => {
    const sorted = strategy.sort(DATES_UNSORTED, "asc");
    expect(sorted).toHaveLength(DATES_UNSORTED.length);
  });

  test("first item in ASC is the oldest date (2024-01-01)", () => {
    const sorted = strategy.sort(DATES_UNSORTED, "asc");
    expect(sorted[0].date).toEqual(new Date("2024-01-01"));
  });

  test("last item in ASC is the newest date (2026-01-01)", () => {
    const sorted = strategy.sort(DATES_UNSORTED, "asc");
    expect(sorted[sorted.length - 1].date).toEqual(new Date("2026-01-01"));
  });

  test("first item in DESC is the newest date (2026-01-01)", () => {
    const sorted = strategy.sort(DATES_UNSORTED, "desc");
    expect(sorted[0].date).toEqual(new Date("2026-01-01"));
  });

  test("items with null dates are sorted to the end in ASC", () => {
    const items = [
      { date: null },
      { date: new Date("2025-03-01") },
      { date: new Date("2024-06-01") },
    ];
    const sorted = strategy.sort(items, "asc");
    expect(sorted[sorted.length - 1].date).toBeNull();
  });

  test("uses createdAt fallback when date is absent", () => {
    const items = [
      { createdAt: new Date("2025-12-01") },
      { createdAt: new Date("2025-01-01") },
    ];
    const sorted = strategy.sort(items, "asc");
    expect(sorted[0].createdAt).toEqual(new Date("2025-01-01"));
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Sort Utility — SortByPrice", () => {
  let strategy;

  beforeAll(() => {
    strategy = new SortByPrice();
  });

  test("sorted ASC result has same length as input", () => {
    const sorted = strategy.sort(PRICES_UNSORTED, "asc");
    expect(sorted).toHaveLength(PRICES_UNSORTED.length);
  });

  test("first item in ASC is the cheapest (0)", () => {
    const sorted = strategy.sort(PRICES_UNSORTED, "asc");
    expect(sorted[0].price).toBe(0);
  });

  test("last item in ASC is the most expensive (200)", () => {
    const sorted = strategy.sort(PRICES_UNSORTED, "asc");
    expect(sorted[sorted.length - 1].price).toBe(200);
  });

  test("first item in DESC is the most expensive (200)", () => {
    const sorted = strategy.sort(PRICES_UNSORTED, "desc");
    expect(sorted[0].price).toBe(200);
  });

  test("uses totalCost fallback when price is absent", () => {
    const visits = [{ totalCost: 99 }, { totalCost: 10 }];
    const sorted = strategy.sort(visits, "asc");
    expect(sorted[0].totalCost).toBe(10);
  });

  test("treats missing price and totalCost as 0", () => {
    const items = [{ name: "A" }, { name: "B", price: 50 }];
    const sorted = strategy.sort(items, "asc");
    expect(sorted[0].name).toBe("A");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Sort Utility — getSortStrategy factory", () => {
  afterAll(() => {
    // Pure function — nothing to clean up
  });

  test("'name' maps to SortByName", () => {
    expect(getSortStrategy("name") instanceof SortByName).toBe(true);
  });

  test("'date' maps to SortByDate", () => {
    expect(getSortStrategy("date") instanceof SortByDate).toBe(true);
  });

  test("'createdAt' maps to SortByDate", () => {
    expect(getSortStrategy("createdAt") instanceof SortByDate).toBe(true);
  });

  test("'price' maps to SortByPrice", () => {
    expect(getSortStrategy("price") instanceof SortByPrice).toBe(true);
  });

  test("'totalCost' maps to SortByPrice", () => {
    expect(getSortStrategy("totalCost") instanceof SortByPrice).toBe(true);
  });

  test("unknown field defaults to SortByName", () => {
    expect(getSortStrategy("unknown") instanceof SortByName).toBe(true);
  });

  test("empty string defaults to SortByName", () => {
    expect(getSortStrategy("") instanceof SortByName).toBe(true);
  });

  test("each call returns a new (distinct) instance", () => {
    const a = getSortStrategy("name");
    const b = getSortStrategy("name");
    expect(a).not.toBe(b);
  });
});
