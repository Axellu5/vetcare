/**
 * @fileoverview Filter utility — builds Prisma WHERE clauses from filter objects.
 *
 * Algorithm overview:
 *   This utility takes a plain object of filter values (species, vetId, status,
 *   date range, etc.) and converts them into a Prisma-compatible `where` clause.
 *
 *   Each filter condition is added only when its value is present (truthy), so
 *   unused filters are silently skipped. All active conditions are merged into
 *   a single object — Prisma interprets this as AND logic, meaning a record
 *   must satisfy EVERY active filter to appear in the results.
 *
 *   Date range filters use UTC-noon parsing to avoid timezone-related off-by-one
 *   errors: "2026-03-16" becomes 2026-03-16T12:00:00Z instead of midnight UTC.
 *
 * Supported filter keys:
 *   species  — case-insensitive exact match on the `species` field (Pet)
 *   vetId    — exact numeric match on the `vetId` FK (Visit, Appointment)
 *   ownerId  — exact numeric match on the `ownerId` FK (Appointment, Pet)
 *   petId    — exact numeric match on the `petId` FK (Visit, Appointment)
 *   status   — exact string match on the `status` field (Appointment)
 *   from     — lower bound (inclusive) on the `date` DateTime field
 *   to       — upper bound (inclusive) on the `date` DateTime field
 *
 * Example — filtering appointments by vet, status, and date range:
 *   buildFilterConditions({ vetId: "2", status: "scheduled", from: "2026-03-01" })
 *   // → {
 *   //     vetId:  2,
 *   //     status: "scheduled",
 *   //     date:   { gte: new Date("2026-03-01T12:00:00Z") }
 *   //   }
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a date value safely, converting a YYYY-MM-DD string to UTC noon
 * to avoid timezone-related off-by-one day shifts.
 *
 * @param {Date|string} date
 * @returns {Date}
 */
function safeParseDate(date) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(date + "T12:00:00Z");
  }
  return new Date(date);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Builds a Prisma WHERE clause by combining multiple independent filter conditions.
 *
 * Algorithm:
 *   1. Start with an empty `where` object.
 *   2. For each recognised filter key, check if the value is present.
 *   3. If present, add the corresponding Prisma condition to `where`.
 *   4. Return `where`. Prisma interprets all top-level keys as AND — every
 *      condition that was added must be satisfied by the returned record.
 *
 * @param {object} filters - Key-value pairs of active filter values (all optional).
 * @param {string}  [filters.species]  - Exact species name (case-insensitive).
 * @param {string|number} [filters.vetId]   - Vet primary key.
 * @param {string|number} [filters.ownerId] - Owner primary key.
 * @param {string|number} [filters.petId]   - Pet primary key.
 * @param {string}  [filters.status]   - Appointment status ("scheduled" | "completed" | "cancelled").
 * @param {string}  [filters.from]     - Start of date range as "YYYY-MM-DD".
 * @param {string}  [filters.to]       - End of date range as "YYYY-MM-DD".
 * @returns {object} Prisma-compatible WHERE clause. May be empty ({}) if no
 *   filters are active, which Prisma treats as "no filter" (return all records).
 *
 * @example
 * // Filter pets by species only
 * buildFilterConditions({ species: "Šuo" })
 * // → { species: { equals: "Šuo", mode: "insensitive" } }
 *
 * @example
 * // Filter visits by vet and date range (AND logic)
 * buildFilterConditions({ vetId: "3", from: "2026-03-01", to: "2026-03-31" })
 * // → {
 * //     vetId: 3,
 * //     date: {
 * //       gte: Date("2026-03-01T12:00:00Z"),
 * //       lte: Date("2026-03-31T12:00:00Z"),
 * //     }
 * //   }
 *
 * @example
 * // No active filters — returns empty object (fetch everything)
 * buildFilterConditions({})  // → {}
 */
function buildFilterConditions(filters) {
  const where = {};

  // Species filter — case-insensitive exact match (e.g. "Šuo", "Katė")
  if (filters.species) {
    where.species = { equals: filters.species, mode: "insensitive" };
  }

  // Foreign key filters — coerce to Number for strict type safety
  if (filters.vetId)   where.vetId   = Number(filters.vetId);
  if (filters.ownerId) where.ownerId = Number(filters.ownerId);
  if (filters.petId)   where.petId   = Number(filters.petId);

  // Status filter — exact string match ("scheduled", "completed", "cancelled")
  if (filters.status) {
    where.status = filters.status;
  }

  // Date range filter — both bounds are inclusive
  // safeParseDate converts "YYYY-MM-DD" → UTC noon to avoid day-boundary shifts
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = safeParseDate(filters.from);
    if (filters.to)   where.date.lte = safeParseDate(filters.to);
  }

  return where;
}

export { buildFilterConditions };
