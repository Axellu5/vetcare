/**
 * @fileoverview Strategy design pattern implementation for data sorting.
 *
 * Strategy Pattern:
 * Defines a family of algorithms, encapsulates each one, and makes them
 * interchangeable. Strategy lets the algorithm vary independently from the
 * clients that use it.
 *
 * In this context, different sorting algorithms (by name, by date, by price)
 * are the "Strategies". SortContext is the "Context" — it holds a reference
 * to whichever strategy was chosen and delegates sorting to it. API route
 * handlers are the "Clients" — they call getSortStrategy(field) to pick the
 * right strategy without knowing its implementation.
 *
 * Structure:
 *   SortStrategy (abstract base)
 *     ├── SortByName    — alphabetical sort on string fields
 *     ├── SortByDate    — chronological sort on Date fields
 *     └── SortByPrice   — numeric sort on price / cost fields
 *
 *   SortContext          — holds a strategy and delegates to it
 *   getSortStrategy()    — factory helper that maps field name → strategy instance
 *
 * Benefits:
 * - Adding a new sort criterion requires only a new Strategy subclass
 * - Sorting logic is tested in isolation, independent of routes or components
 * - The Context class is open for extension but closed for modification (OCP)
 */

// ---------------------------------------------------------------------------
// Abstract base
// ---------------------------------------------------------------------------

/**
 * @class SortStrategy
 * @abstract
 * @description Abstract base class for all sort strategies. Concrete subclasses
 * must override the sort() method with their specific comparison logic.
 *
 * This class is never instantiated directly — it defines the shared interface
 * that SortContext depends on.
 */
class SortStrategy {
  /**
   * Sorts an array of objects and returns a new sorted array.
   * Concrete subclasses decide which field to compare and how.
   *
   * @param {object[]} data  - Array of objects to sort. Must not be mutated.
   * @param {"asc"|"desc"} order - Sort direction.
   * @returns {object[]} A new sorted array (original array is not mutated).
   * @throws {Error} Always — subclasses must override this method.
   */
  sort(data, order) {
    throw new Error(`${this.constructor.name}.sort() is not implemented`);
  }
}

// ---------------------------------------------------------------------------
// Concrete strategies
// ---------------------------------------------------------------------------

/**
 * @class SortByName
 * @extends SortStrategy
 * @description Sorts objects alphabetically by their `name` field.
 * Falls back gracefully if the field is absent (treats it as an empty string).
 * Comparison is case-insensitive.
 *
 * Applicable to: Pet[], Service[], Vet[], Owner[] (via fullName convention).
 */
class SortByName extends SortStrategy {
  /**
   * Alphabetical sort on the `name` field (case-insensitive).
   *
   * @param {object[]}     data  - Objects that have a `name` string property.
   * @param {"asc"|"desc"} order - "asc" = A→Z, "desc" = Z→A.
   * @returns {object[]} New sorted array.
   *
   * @example
   * new SortByName().sort([{ name: "Rex" }, { name: "Bella" }], "asc");
   * // → [{ name: "Bella" }, { name: "Rex" }]
   */
  sort(data, order = "asc") {
    return [...data].sort((a, b) => {
      const nameA = (a.name ?? "").toLowerCase();
      const nameB = (b.name ?? "").toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      return order === "desc" ? -cmp : cmp;
    });
  }
}

/**
 * @class SortByDate
 * @extends SortStrategy
 * @description Sorts objects chronologically by their `date` field.
 * Also handles `createdAt` as a fallback when `date` is not present.
 * Invalid or missing dates are sorted to the end regardless of direction.
 *
 * Applicable to: Visit[], Appointment[], Owner[], Pet[].
 */
class SortByDate extends SortStrategy {
  /**
   * Chronological sort on the `date` field (falls back to `createdAt`).
   *
   * @param {object[]}     data  - Objects with a `date` or `createdAt` Date/string property.
   * @param {"asc"|"desc"} order - "asc" = oldest first, "desc" = newest first.
   * @returns {object[]} New sorted array.
   *
   * @example
   * new SortByDate().sort(visits, "desc");
   * // → visits sorted newest → oldest by visit.date
   */
  sort(data, order = "asc") {
    return [...data].sort((a, b) => {
      const rawA = a.date ?? a.createdAt;
      const rawB = b.date ?? b.createdAt;
      const timeA = rawA ? new Date(rawA).getTime() : Infinity;
      const timeB = rawB ? new Date(rawB).getTime() : Infinity;
      return order === "desc" ? timeB - timeA : timeA - timeB;
    });
  }
}

/**
 * @class SortByPrice
 * @extends SortStrategy
 * @description Sorts objects numerically by their `price` field.
 * Also handles `totalCost` as a fallback for Visit DTOs produced by the
 * VisitAdapter. Non-numeric or missing values are treated as 0.
 *
 * Applicable to: Service[], VisitDTO[] (totalCost).
 */
class SortByPrice extends SortStrategy {
  /**
   * Numeric sort on the `price` field (falls back to `totalCost`).
   *
   * @param {object[]}     data  - Objects with a `price` or `totalCost` numeric property.
   * @param {"asc"|"desc"} order - "asc" = cheapest first, "desc" = most expensive first.
   * @returns {object[]} New sorted array.
   *
   * @example
   * new SortByPrice().sort(services, "asc");
   * // → services sorted cheapest → most expensive
   */
  sort(data, order = "asc") {
    return [...data].sort((a, b) => {
      const priceA = Number(a.price ?? a.totalCost ?? 0);
      const priceB = Number(b.price ?? b.totalCost ?? 0);
      return order === "desc" ? priceB - priceA : priceA - priceB;
    });
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * @class SortContext
 * @description The Strategy Context — holds a reference to a SortStrategy
 * instance and delegates all sorting to it. The context itself is agnostic
 * to which algorithm is used; it only depends on the SortStrategy interface.
 *
 * Callers can swap the strategy at runtime via setStrategy(), making it easy
 * to change sorting behaviour dynamically (e.g. when a user clicks a column
 * header in the UI).
 */
class SortContext {
  /**
   * @param {SortStrategy} strategy - The initial sorting strategy to use.
   * @throws {Error} If strategy is not a SortStrategy instance.
   */
  constructor(strategy) {
    if (!(strategy instanceof SortStrategy)) {
      throw new Error("SortContext requires a SortStrategy instance");
    }
    /** @private */
    this._strategy = strategy;
  }

  /**
   * Replaces the current strategy with a new one.
   *
   * @param {SortStrategy} strategy - The new sorting strategy.
   * @throws {Error} If strategy is not a SortStrategy instance.
   * @returns {void}
   *
   * @example
   * ctx.setStrategy(new SortByDate());
   */
  setStrategy(strategy) {
    if (!(strategy instanceof SortStrategy)) {
      throw new Error("SortContext requires a SortStrategy instance");
    }
    this._strategy = strategy;
  }

  /**
   * Executes the current strategy against the provided data.
   *
   * @param {object[]}     data  - Array of objects to sort.
   * @param {"asc"|"desc"} [order="asc"] - Sort direction.
   * @returns {object[]} New sorted array produced by the active strategy.
   *
   * @example
   * const ctx = new SortContext(new SortByName());
   * const sorted = ctx.executeSort(pets, "asc");
   */
  executeSort(data, order = "asc") {
    return this._strategy.sort(data, order);
  }
}

// ---------------------------------------------------------------------------
// Helper factory
// ---------------------------------------------------------------------------

/**
 * Maps a sort field name to the corresponding SortStrategy instance.
 * Acts as a simple factory helper so route handlers can resolve the
 * correct strategy from a URL query parameter without a switch statement.
 *
 * Supported field values:
 * | field value         | Strategy returned  |
 * |---------------------|--------------------|
 * | "name"              | SortByName         |
 * | "date" / "createdAt"| SortByDate         |
 * | "price" / "totalCost| SortByPrice        |
 * | anything else       | SortByName (default|
 *
 * @param {string} field - The field name to sort by (typically from req.query.sortBy).
 * @returns {SortStrategy} A concrete strategy instance ready to be passed to SortContext.
 *
 * @example
 * const strategy = getSortStrategy("date");
 * const ctx = new SortContext(strategy);
 * const sorted = ctx.executeSort(visits, "desc");
 */
function getSortStrategy(field) {
  switch (field) {
    case "date":
    case "createdAt":
      return new SortByDate();
    case "price":
    case "totalCost":
      return new SortByPrice();
    case "name":
    default:
      return new SortByName();
  }
}

export { SortStrategy, SortByName, SortByDate, SortByPrice, SortContext, getSortStrategy };
