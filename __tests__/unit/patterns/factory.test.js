/**
 * @fileoverview Unit tests for the Factory Method pattern (lib/patterns/responseFactory.js).
 * Tests that each factory method produces correctly shaped response objects.
 */

import { ResponseFactory } from "@/lib/patterns/responseFactory.js";

describe("Factory Method Pattern — ResponseFactory", () => {
  // ── ResponseFactory.success ──────────────────────────────────────────────

  describe("success()", () => {
    let result;

    beforeAll(() => {
      result = ResponseFactory.success({ id: 1, name: "Rex" }, "Pet retrieved");
    });

    test("sets success to true", () => {
      expect(result.success).toBe(true);
    });

    test("includes the provided data payload", () => {
      expect(result.data).toEqual({ id: 1, name: "Rex" });
    });

    test("includes the custom message", () => {
      expect(result.message).toBe("Pet retrieved");
    });

    test("uses default message when none provided", () => {
      const r = ResponseFactory.success({});
      expect(r.message).toBe("Success");
    });
  });

  // ── ResponseFactory.error ────────────────────────────────────────────────

  describe("error()", () => {
    test("sets success to false", () => {
      const r = ResponseFactory.error("Something failed", 400);
      expect(r.success).toBe(false);
    });

    test("includes the error message", () => {
      const r = ResponseFactory.error("Validation failed", 400);
      expect(r.error).toBe("Validation failed");
    });

    test("includes the provided status code", () => {
      const r = ResponseFactory.error("Server error", 503);
      expect(r.statusCode).toBe(503);
    });

    test("defaults to status 500 when no code given", () => {
      const r = ResponseFactory.error("Oops");
      expect(r.statusCode).toBe(500);
    });

    test("does not have a data field", () => {
      const r = ResponseFactory.error("Oops");
      expect(r.data).toBeUndefined();
    });
  });

  // ── ResponseFactory.list ─────────────────────────────────────────────────

  describe("list()", () => {
    let result;

    beforeAll(() => {
      result = ResponseFactory.list([{}, {}, {}], 42, 2, 10);
    });

    test("sets success to true", () => {
      expect(result.success).toBe(true);
    });

    test("includes the data array", () => {
      expect(result.data).toHaveLength(3);
    });

    test("includes pagination object", () => {
      expect(result.pagination).toBeTruthy();
    });

    test("calculates totalPages correctly", () => {
      // 42 items, 10 per page → 5 pages (Math.ceil(42/10))
      expect(result.pagination.totalPages).toBe(5);
    });

    test("includes total, page, and limit in pagination", () => {
      expect(result.pagination.total).toBe(42);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });

    test("rounds up partial last page", () => {
      const r = ResponseFactory.list([], 11, 1, 10);
      expect(r.pagination.totalPages).toBe(2);
    });
  });

  // ── ResponseFactory.created ──────────────────────────────────────────────

  describe("created()", () => {
    test("sets success to true", () => {
      const r = ResponseFactory.created({ id: 5 });
      expect(r.success).toBe(true);
    });

    test("includes the created data", () => {
      const r = ResponseFactory.created({ id: 5, name: "Bella" });
      expect(r.data).toEqual({ id: 5, name: "Bella" });
    });

    test("message is 'Created successfully'", () => {
      const r = ResponseFactory.created({});
      expect(r.message).toBe("Created successfully");
    });
  });

  // ── ResponseFactory.notFound ─────────────────────────────────────────────

  describe("notFound()", () => {
    let result;

    beforeAll(() => {
      result = ResponseFactory.notFound("Pet");
    });

    test("sets success to false", () => {
      expect(result.success).toBe(false);
    });

    test("error message contains entity name and 'not found'", () => {
      expect(result.error).toContain("Pet");
      expect(result.error).toContain("not found");
    });

    test("status code is 404", () => {
      expect(result.statusCode).toBe(404);
    });

    test("success field is falsy", () => {
      expect(result.success).toBeFalsy();
    });
  });
});
