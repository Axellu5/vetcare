/**
 * @fileoverview Performance tests — verifies that core sorting and searching
 * operations complete within acceptable time limits on large datasets (10 000 items).
 * Uses performance.now() for sub-millisecond measurement precision.
 */

import { SortByName, SortByDate, SortByPrice } from "@/lib/patterns/strategy.js";
import { buildSearchFilter } from "@/lib/utils/search.js";
import { buildFilterConditions } from "@/lib/utils/filter.js";

const ITEM_COUNT    = 10_000;
const MAX_MS        = 100;  // limit for numeric/date sorts
const MAX_MS_LOCALE = 500;  // localeCompare("lt") is ~5x slower than numeric sort

// ── Dataset factories ─────────────────────────────────────────────────────────

/** Generates ITEM_COUNT name objects in reverse order (worst-case for sort). */
function makeNameItems() {
  return Array.from({ length: ITEM_COUNT }, (_, i) => ({
    name: `Item${String(ITEM_COUNT - i).padStart(6, "0")}`,
  }));
}

/** Generates ITEM_COUNT date objects with reversed chronological order. */
function makeDateItems() {
  const base = new Date("2020-01-01").getTime();
  return Array.from({ length: ITEM_COUNT }, (_, i) => ({
    date: new Date(base + (ITEM_COUNT - i) * 86_400_000),
  }));
}

/** Generates ITEM_COUNT price objects in descending order. */
function makePriceItems() {
  return Array.from({ length: ITEM_COUNT }, (_, i) => ({
    price: ITEM_COUNT - i,
  }));
}

/** Generates ITEM_COUNT owner-like objects for search testing. */
function makeSearchDataset() {
  return Array.from({ length: ITEM_COUNT }, (_, i) => ({
    firstName: `Vardas${i}`,
    lastName:  `Pavardė${i}`,
    email:     `user${i}@vetcare.lt`,
  }));
}

// Helper: apply a buildSearchFilter result as a JS-level predicate
function applySearchFilter(dataset, filter) {
  if (!filter) return dataset;
  return dataset.filter((item) =>
    filter.OR.some((cond) => {
      const [field] = Object.keys(cond);
      const { contains } = cond[field];
      return item[field]?.toLowerCase().includes(contains.toLowerCase());
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe("Performance Tests — Sort 10 000 items in <100 ms", () => {
  afterAll(() => {
    // No shared state to clean up
  });

  test("SortByName: sorts 10 000 items ascending within time limit", () => {
    const items    = makeNameItems();
    const strategy = new SortByName();

    const start   = performance.now();
    const sorted  = strategy.sort(items, "asc");
    const elapsed = performance.now() - start;

    // localeCompare("lt") is slower than numeric sort — allow up to 500 ms
    expect(elapsed).toBeLessThan(MAX_MS_LOCALE);
    expect(sorted).toHaveLength(ITEM_COUNT);
  });

  test("SortByName: sorts 10 000 items descending within time limit", () => {
    const items    = makeNameItems();
    const strategy = new SortByName();

    const start   = performance.now();
    const sorted  = strategy.sort(items, "desc");
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(MAX_MS_LOCALE);
    // DESC: largest name string first ("Item010000" > "Item000001")
    expect(sorted[0].name).toContain("Item010000");
  });

  test("SortByDate: sorts 10 000 dates ascending within time limit", () => {
    const items    = makeDateItems();
    const strategy = new SortByDate();

    const start   = performance.now();
    const sorted  = strategy.sort(items, "asc");
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(MAX_MS);
    expect(sorted).toHaveLength(ITEM_COUNT);
    // Oldest date should be first
    expect(sorted[0].date.getTime()).toBeLessThan(sorted[1].date.getTime());
  });

  test("SortByDate: sorts 10 000 dates descending within time limit", () => {
    const items    = makeDateItems();
    const strategy = new SortByDate();

    const start   = performance.now();
    const sorted  = strategy.sort(items, "desc");
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(MAX_MS);
    // Newest date should be first
    expect(sorted[0].date.getTime()).toBeGreaterThan(sorted[1].date.getTime());
  });

  test("SortByPrice: sorts 10 000 prices ascending within time limit", () => {
    const items    = makePriceItems();
    const strategy = new SortByPrice();

    const start   = performance.now();
    const sorted  = strategy.sort(items, "asc");
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(MAX_MS);
    expect(sorted[0].price).toBeLessThan(sorted[ITEM_COUNT - 1].price);
  });

  test("SortByPrice: sorted result has correct first and last values", () => {
    const items    = makePriceItems();
    const strategy = new SortByPrice();
    const sorted   = strategy.sort(items, "asc");

    expect(sorted[0].price).toBe(1);
    expect(sorted[ITEM_COUNT - 1].price).toBe(ITEM_COUNT);
  });

  test("sort does not lose any items (length preserved)", () => {
    const items  = makeNameItems();
    const sorted = new SortByName().sort(items, "asc");
    expect(sorted).toHaveLength(items.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Performance Tests — Search 10 000 items in <100 ms", () => {
  let dataset;

  beforeAll(() => {
    dataset = makeSearchDataset();
  });

  test("buildSearchFilter: builds OR filter for 3 fields instantaneously", () => {
    const start   = performance.now();
    const filter  = buildSearchFilter("Vardas500", ["firstName", "lastName", "email"]);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(MAX_MS);
    expect(filter).toBeTruthy();
    expect(filter.OR).toHaveLength(3);
  });

  test("applySearchFilter: filters 10 000 items by firstName within time limit", () => {
    const filter = buildSearchFilter("Vardas1", ["firstName"]);

    const start   = performance.now();
    const results = applySearchFilter(dataset, filter);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(MAX_MS);
    expect(results.length).toBeGreaterThan(0);
  });

  test("applySearchFilter: multi-field search on 10 000 items within time limit", () => {
    const filter = buildSearchFilter("user5", ["firstName", "lastName", "email"]);

    const start   = performance.now();
    const results = applySearchFilter(dataset, filter);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(MAX_MS);
    // "user5" matches emails like user5@, user50@, user500@, ...
    expect(results.length).toBeGreaterThan(0);
  });

  test("applySearchFilter: exact email search returns correct item", () => {
    const filter  = buildSearchFilter("user9999@vetcare.lt", ["email"]);
    const results = applySearchFilter(dataset, filter);

    expect(results).toHaveLength(1);
    expect(results[0].email).toBe("user9999@vetcare.lt");
  });

  test("applySearchFilter: search for non-existent term returns empty array", () => {
    const filter  = buildSearchFilter("zzzNonExistent", ["firstName", "lastName", "email"]);
    const results = applySearchFilter(dataset, filter);
    expect(results).toHaveLength(0);
  });

  test("buildFilterConditions: builds conditions object instantaneously", () => {
    const start = performance.now();
    const where = buildFilterConditions({
      vetId: "3",
      status: "scheduled",
      from: "2026-01-01",
      to: "2026-12-31",
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(MAX_MS);
    expect(where).toBeTruthy();
  });

  test("buildSearchFilter: undefined search term returns undefined quickly", () => {
    const start   = performance.now();
    const filter  = buildSearchFilter(undefined, ["firstName"]);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(MAX_MS);
    expect(filter).toBeUndefined();
  });
});
