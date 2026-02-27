/**
 * @fileoverview Factory Method design pattern implementation for API responses.
 *
 * Factory Method Pattern:
 * Defines an interface for creating objects, but lets subclasses (or in this case,
 * static factory methods) decide which class/shape to instantiate. The factory
 * method encapsulates object creation logic, so callers don't need to know the
 * exact structure of the object being created.
 *
 * In this context, ResponseFactory acts as the "Creator" — each static method is
 * a factory method that produces a consistently-shaped response object for a
 * specific scenario (success, error, list, etc.). API route handlers are the
 * "clients" that call factory methods without knowing the internal shape details.
 *
 * Benefits:
 * - Centralizes response structure — changing the shape only requires editing here
 * - Eliminates repeated boilerplate in every API route
 * - Makes response shapes predictable and testable
 */

/**
 * @class ResponseFactory
 * @description Factory class providing static methods to create standardized
 * API response objects. Each method is a factory method that produces a
 * specific type of response, hiding construction details from callers.
 */
class ResponseFactory {
  /**
   * Creates a generic success response.
   *
   * Factory method for operations that return a single resource or
   * perform an action successfully.
   *
   * @param {*} data - The payload to return to the client.
   * @param {string} [message="Success"] - A human-readable success message.
   * @returns {{ success: true, data: *, message: string }}
   *
   * @example
   * ResponseFactory.success({ id: 1, name: "Rex" }, "Pet retrieved");
   * // → { success: true, data: { id: 1, name: "Rex" }, message: "Pet retrieved" }
   */
  static success(data, message = "Success") {
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * Creates an error response.
   *
   * Factory method for any failed operation. Includes an HTTP status code
   * so the caller can forward it to the HTTP response.
   *
   * @param {string} message - A human-readable error description.
   * @param {number} [statusCode=500] - The HTTP status code for this error.
   * @returns {{ success: false, error: string, statusCode: number }}
   *
   * @example
   * ResponseFactory.error("Validation failed", 400);
   * // → { success: false, error: "Validation failed", statusCode: 400 }
   */
  static error(message, statusCode = 500) {
    return {
      success: false,
      error: message,
      statusCode,
    };
  }

  /**
   * Creates a paginated list response.
   *
   * Factory method for collection endpoints that support pagination.
   * Automatically computes the total number of pages from the provided
   * total count and page size.
   *
   * @param {Array<*>} data - The array of items for the current page.
   * @param {number} total - Total number of items across all pages.
   * @param {number} [page=1] - The current page number (1-based).
   * @param {number} [limit=10] - The maximum number of items per page.
   * @returns {{ success: true, data: Array<*>, pagination: { total: number, page: number, limit: number, totalPages: number } }}
   *
   * @example
   * ResponseFactory.list([...pets], 42, 2, 10);
   * // → { success: true, data: [...], pagination: { total: 42, page: 2, limit: 10, totalPages: 5 } }
   */
  static list(data, total, page = 1, limit = 10) {
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Creates a "resource created" success response.
   *
   * Factory method for POST endpoints that create a new resource.
   * Pairs with HTTP 201 status codes.
   *
   * @param {*} data - The newly created resource.
   * @returns {{ success: true, data: *, message: string }}
   *
   * @example
   * ResponseFactory.created({ id: 5, name: "Bella" });
   * // → { success: true, data: { id: 5, name: "Bella" }, message: "Created successfully" }
   */
  static created(data) {
    return {
      success: true,
      data,
      message: "Created successfully",
    };
  }

  /**
   * Creates a "not found" error response.
   *
   * Factory method for endpoints where the requested resource does not exist.
   * Always produces a 404 status code.
   *
   * @param {string} entity - The name of the resource that was not found (e.g. "Pet", "Owner").
   * @returns {{ success: false, error: string, statusCode: 404 }}
   *
   * @example
   * ResponseFactory.notFound("Pet");
   * // → { success: false, error: "Pet not found", statusCode: 404 }
   */
  static notFound(entity) {
    return {
      success: false,
      error: `${entity} not found`,
      statusCode: 404,
    };
  }
}

export { ResponseFactory };
