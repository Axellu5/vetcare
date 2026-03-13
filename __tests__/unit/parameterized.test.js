/**
 * @fileoverview Parameterized tests using test.each() — data-driven test style
 * for email validation, sort strategy resolution, and appointment time slot
 * validation. Each table row is an independent test case.
 */

// Prisma mock required for service constructors
jest.mock("@/lib/prisma.js", () => ({
  __esModule: true,
  default: {
    owner:        { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    pet:          { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    visit:        { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    appointment:  { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    visitService: { deleteMany: jest.fn() },
  },
}));

import { OwnerService, PetService, AppointmentService } from "@/lib/patterns/templateMethod.js";
import { getSortStrategy, SortByName, SortByDate, SortByPrice } from "@/lib/patterns/strategy.js";
import { buildSearchFilter } from "@/lib/utils/search.js";
import { buildFilterConditions } from "@/lib/utils/filter.js";

describe("Parameterized Tests", () => {
  let ownerService;
  let petService;
  let apptService;

  beforeAll(() => {
    ownerService = new OwnerService();
    petService   = new PetService();
    apptService  = new AppointmentService();
  });

  // ── Email validation ──────────────────────────────────────────────────────

  describe("Email validation — test.each()", () => {
    /**
     * [email, shouldThrow, description]
     * Validation rule: throws when email is defined AND does not contain '@'.
     */
    test.each([
      ["admin@vetcare.lt",   false, "standard valid email"],
      ["j@j.lt",             false, "minimal valid email (single chars)"],
      ["user@domain.com",    false, "common .com domain"],
      ["name+tag@mail.lt",   false, "email with plus sign"],
      ["@onlydomain.lt",     false, "@ present at start — passes rule"],
      ["notanemail",         true,  "missing @ symbol"],
      ["nodomain",           true,  "no @ symbol, just text"],
      ["",                   true,  "empty string — no @"],
      ["   ",                true,  "whitespace only — no @"],
      ["missingatsign.lt",   true,  "domain without @ separator"],
    ])(
      "email '%s' should throw: %s — %s",
      (email, shouldThrow) => {
        if (shouldThrow) {
          expect(() => ownerService.validate({ email })).toThrow();
        } else {
          expect(() => ownerService.validate({ email })).not.toThrow();
        }
      }
    );
  });

  // ── Sort strategy resolution ──────────────────────────────────────────────

  describe("Sort strategy resolution — test.each()", () => {
    /**
     * [fieldName, ExpectedClass, description]
     * Tests that getSortStrategy() returns the correct strategy for each field.
     */
    test.each([
      ["name",      SortByName,  "name field → SortByName"],
      ["date",      SortByDate,  "date field → SortByDate"],
      ["createdAt", SortByDate,  "createdAt field → SortByDate"],
      ["price",     SortByPrice, "price field → SortByPrice"],
      ["totalCost", SortByPrice, "totalCost field → SortByPrice"],
      ["unknown",   SortByName,  "unknown field → SortByName (default)"],
      ["",          SortByName,  "empty string → SortByName (default)"],
      ["NAME",      SortByName,  "uppercase mismatch → SortByName (default)"],
    ])(
      "getSortStrategy('%s') returns correct class — %s",
      (field, ExpectedClass) => {
        const strategy = getSortStrategy(field);
        expect(strategy instanceof ExpectedClass).toBe(true);
      }
    );

    test.each([
      ["name",      "asc",  "Aurimas", "Žilvinas"],
      ["name",      "desc", "Žilvinas", "Aurimas"],
    ])(
      "getSortStrategy('%s') + order '%s': first='%s', last='%s'",
      (field, order, expectedFirst, expectedLast) => {
        const items = [
          { name: "Žilvinas" },
          { name: "Aurimas"  },
          { name: "Benas"    },
        ];
        const strategy = getSortStrategy(field);
        const sorted   = strategy.sort(items, order);
        expect(sorted[0].name).toBe(expectedFirst);
        expect(sorted[sorted.length - 1].name).toBe(expectedLast);
      }
    );
  });

  // ── Time slot validation ──────────────────────────────────────────────────

  describe("Time slot validation — test.each()", () => {
    /**
     * [timeSlot, shouldThrow, description]
     * Valid slots: "09:00" through "17:00" on the hour.
     */
    test.each([
      ["09:00", false, "first opening slot"],
      ["10:00", false, "second slot"],
      ["11:00", false, "morning slot"],
      ["12:00", false, "noon slot"],
      ["13:00", false, "afternoon slot"],
      ["14:00", false, "mid-afternoon slot"],
      ["15:00", false, "late afternoon slot"],
      ["16:00", false, "penultimate slot"],
      ["17:00", false, "last closing slot"],
      ["08:00", true,  "before opening (08:00)"],
      ["18:00", true,  "after closing (18:00)"],
      ["09:30", true,  "half-hour increment not allowed"],
      ["12:30", true,  "midday half-hour not allowed"],
      ["00:00", true,  "midnight not a clinic slot"],
      ["",      true,  "empty string is invalid"],
      ["9:00",  true,  "missing leading zero is invalid"],
      ["17:01", true,  "one minute past last slot"],
    ])(
      "timeSlot '%s' — shouldThrow: %s — %s",
      (timeSlot, shouldThrow) => {
        if (shouldThrow) {
          expect(() => apptService.validate({ timeSlot })).toThrow();
        } else {
          expect(() => apptService.validate({ timeSlot })).not.toThrow();
        }
      }
    );
  });

  // ── buildSearchFilter — parameterized ────────────────────────────────────

  describe("buildSearchFilter — test.each()", () => {
    /**
     * [searchTerm, fields, expectedUndefined, description]
     */
    test.each([
      ["rex",     ["name"],                   false, "single field, valid term"],
      ["Jonas",   ["firstName", "lastName"],  false, "two fields, valid term"],
      ["",        ["name"],                   true,  "empty string → undefined"],
      [null,      ["name"],                   true,  "null → undefined"],
      [undefined, ["name"],                   true,  "undefined → undefined"],
      ["   ",     ["email"],                  true,  "whitespace only → undefined"],
    ])(
      "buildSearchFilter('%s', %j) — isUndefined: %s — %s",
      (term, fields, expectUndefined) => {
        const result = buildSearchFilter(term, fields);
        if (expectUndefined) {
          expect(result).toBeUndefined();
        } else {
          expect(result).toBeTruthy();
          expect(result.OR).toHaveLength(fields.length);
        }
      }
    );
  });

  // ── buildFilterConditions — parameterized ─────────────────────────────────

  describe("buildFilterConditions — test.each()", () => {
    /**
     * [filters, expectedKeys, description]
     * Tests that only the expected keys appear in the WHERE clause.
     */
    test.each([
      [{ species: "Šuo" },                    ["species"],            "species only"],
      [{ vetId: "2" },                         ["vetId"],              "vetId coerced"],
      [{ ownerId: "5", petId: "3" },           ["ownerId", "petId"],   "two FK filters"],
      [{ status: "scheduled" },               ["status"],             "status filter"],
      [{ from: "2026-01-01" },                 ["date"],               "from-only date range"],
      [{ to: "2026-12-31" },                   ["date"],               "to-only date range"],
      [{ from: "2026-01-01", to: "2026-12-31"}, ["date"],              "both date bounds"],
      [{},                                     [],                     "empty filters → {}"],
    ])(
      "buildFilterConditions(%j) — expected keys: %j — %s",
      (filters, expectedKeys) => {
        const result = buildFilterConditions(filters);
        expect(Object.keys(result)).toHaveLength(expectedKeys.length);
        expectedKeys.forEach((key) => {
          expect(result).toHaveProperty(key);
        });
      }
    );
  });

  // ── PetService validation — parameterized ─────────────────────────────────

  describe("PetService ownerId validation — test.each()", () => {
    /**
     * [ownerId, shouldThrow, description]
     */
    test.each([
      [1,       false, "valid integer ownerId"],
      [99,      false, "large valid ownerId"],
      ["5",     false, "numeric string — Number('5') = 5, truthy"],
      [0,       true,  "zero — falsy"],
      ["abc",   true,  "non-numeric string"],
      [null,    true,  "null — falsy"],
    ])(
      "ownerId=%j — shouldThrow: %s — %s",
      (ownerId, shouldThrow) => {
        if (shouldThrow) {
          expect(() => petService.validate({ ownerId })).toThrow("valid ownerId");
        } else {
          expect(() => petService.validate({ ownerId })).not.toThrow();
        }
      }
    );
  });
});
