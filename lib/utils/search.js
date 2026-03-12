/**
 * @fileoverview Search utility — builds Prisma OR filters for full-text search.
 *
 * Algorithm overview:
 *   Given a search term and a list of model field names, this utility generates
 *   a Prisma `OR` array where each element checks if the term appears anywhere
 *   inside that field (substring match). The database engine performs the search
 *   directly, making it efficient even on large tables.
 *
 *   Case-insensitive matching is delegated to the database via Prisma's
 *   `mode: "insensitive"` option, which maps to `ILIKE` in PostgreSQL.
 *
 *   Multiple fields are combined with OR — a record matches if the term is
 *   found in ANY of the specified fields. Callers can combine the result with
 *   other conditions (AND logic) by spreading it into the parent `where` object.
 *
 * Example — searching owners by name or email:
 *   buildSearchFilter("jonas", ["firstName", "lastName", "email"])
 *   // → { OR: [
 *   //      { firstName: { contains: "jonas", mode: "insensitive" } },
 *   //      { lastName:  { contains: "jonas", mode: "insensitive" } },
 *   //      { email:     { contains: "jonas", mode: "insensitive" } },
 *   //    ] }
 */

/**
 * Builds a Prisma OR filter for case-insensitive, multi-field text search.
 *
 * Steps:
 *   1. Trim the search term. If empty or falsy, return undefined so the
 *      caller can omit it entirely (no-op filter).
 *   2. For each field name, create a Prisma `contains` condition with
 *      `mode: "insensitive"` for case-insensitive matching.
 *   3. Wrap all field conditions in a top-level `OR` array — the record
 *      must match at least one field to pass the filter.
 *
 * @param {string|null|undefined} searchTerm - User-provided search string.
 *   Leading/trailing whitespace is stripped before matching.
 * @param {string[]} fields - Prisma model field names to search across.
 *   Must be string-type fields on the model (e.g. "firstName", "email").
 * @returns {{ OR: object[] }|undefined}
 *   A Prisma OR filter object, or undefined if the term is blank.
 *   Returning undefined lets callers skip spreading it with no side-effects:
 *     const where = { ...buildSearchFilter(q, fields) }  // safe when undefined
 *
 * @example
 * // Search pets by name
 * buildSearchFilter("rex", ["name"])
 * // → { OR: [{ name: { contains: "rex", mode: "insensitive" } }] }
 *
 * @example
 * // Search owners by first name, last name, or email simultaneously
 * buildSearchFilter("Jonas", ["firstName", "lastName", "email"])
 * // → { OR: [
 * //      { firstName: { contains: "Jonas", mode: "insensitive" } },
 * //      { lastName:  { contains: "Jonas", mode: "insensitive" } },
 * //      { email:     { contains: "Jonas", mode: "insensitive" } },
 * //    ] }
 *
 * @example
 * // Empty search term — returns undefined (no filter applied)
 * buildSearchFilter("  ", ["name"])  // → undefined
 * buildSearchFilter(null, ["name"])  // → undefined
 */
function buildSearchFilter(searchTerm, fields) {
  const term = searchTerm?.trim();
  if (!term) return undefined;

  return {
    OR: fields.map((field) => ({
      [field]: { contains: term, mode: "insensitive" },
    })),
  };
}

export { buildSearchFilter };
