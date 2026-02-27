/**
 * @fileoverview Template Method design pattern implementation for CRUD services.
 *
 * Template Method Pattern:
 * Defines the skeleton of an algorithm in a base class, deferring some steps
 * to subclasses. The base class calls abstract "hook" methods in a fixed order;
 * subclasses override only the hooks they care about, without changing the
 * overall algorithm structure.
 *
 * In this context, every CRUD operation (findAll, findById, create, update,
 * delete) follows the same high-level sequence. BaseCrudService defines that
 * sequence as a template method and declares abstract hooks for the steps that
 * differ per entity. Concrete services (OwnerService, PetService, VisitService,
 * AppointmentService) override only what is entity-specific.
 *
 * Template skeletons:
 *
 *   findAll(filters, sort)
 *     └─ buildWhere(filters)     [override] → builds Prisma where clause
 *     └─ prisma query
 *     └─ transformMany(records)  [override] → maps raw rows to DTOs
 *
 *   findById(id)
 *     └─ prisma findUnique
 *     └─ transformOne(record)    [override] → maps single raw row to DTO
 *
 *   create(data)
 *     └─ validate(data)          [hook]     → throws on invalid input
 *     └─ transformInput(data)    [hook]     → sanitises/shapes data before save
 *     └─ prisma create
 *     └─ afterCreate(record)     [hook]     → side-effects (events, etc.)
 *
 *   update(id, data)
 *     └─ validate(data)          [hook]
 *     └─ transformInput(data)    [hook]
 *     └─ prisma update
 *     └─ afterUpdate(record)     [hook]
 *
 *   delete(id)
 *     └─ beforeDelete(id)        [hook]     → guard checks before removal
 *     └─ prisma delete
 *
 * Benefits:
 * - Shared algorithm structure lives in one place (BaseCrudService)
 * - Entity-specific logic (includes, validation rules, DTO shapes) is isolated
 *   in each concrete service
 * - Adding a new entity requires only a new subclass — the algorithm never changes
 * - Hook methods have sensible defaults so subclasses override only what they need
 */

import prisma from "../prisma.js";
import {
  OwnerAdapter,
  PetAdapter,
  VisitAdapter,
  AppointmentAdapter,
} from "./adapter.js";

// ---------------------------------------------------------------------------
// Abstract base — template methods
// ---------------------------------------------------------------------------

/**
 * @class BaseCrudService
 * @abstract
 * @description Defines the CRUD algorithm skeleton. Subclasses must set
 * `this.model` to the Prisma delegate (e.g. prisma.owner) and override the
 * abstract hooks listed below. Hook methods that are optional have no-op or
 * pass-through default implementations.
 *
 * Abstract hooks (MUST override):
 *   - buildWhere(filters)
 *   - transformOne(record)
 *   - transformMany(records)
 *
 * Optional hooks (MAY override):
 *   - getInclude()
 *   - validate(data)
 *   - transformInput(data)
 *   - afterCreate(record)
 *   - afterUpdate(record)
 *   - beforeDelete(id)
 */
class BaseCrudService {
  constructor() {
    if (new.target === BaseCrudService) {
      throw new Error("BaseCrudService is abstract and cannot be instantiated directly");
    }
    /**
     * Prisma model delegate, set by each subclass constructor.
     * @protected
     * @type {object}
     */
    this.model = null;
  }

  // ── Abstract hooks ────────────────────────────────────────────────────────

  /**
   * Builds the Prisma `where` clause from incoming filter parameters.
   * Called by the findAll() template method.
   *
   * @abstract
   * @param {object} filters - Raw filter params (e.g. from URL query string).
   * @returns {object} A Prisma-compatible where object.
   */
  buildWhere(filters) {
    throw new Error(`${this.constructor.name}.buildWhere() is not implemented`);
  }

  /**
   * Transforms a single raw Prisma record into a frontend DTO.
   * Called by findById(), create(), and update().
   *
   * @abstract
   * @param {object} record - Raw Prisma model instance.
   * @returns {object} DTO object.
   */
  transformOne(record) {
    throw new Error(`${this.constructor.name}.transformOne() is not implemented`);
  }

  /**
   * Transforms an array of raw Prisma records into frontend DTOs.
   * Called by findAll().
   *
   * @abstract
   * @param {object[]} records - Array of raw Prisma model instances.
   * @returns {object[]} Array of DTO objects.
   */
  transformMany(records) {
    throw new Error(`${this.constructor.name}.transformMany() is not implemented`);
  }

  // ── Optional hooks (default implementations) ─────────────────────────────

  /**
   * Returns the Prisma `include` object used in queries.
   * Override to eager-load relations for the entity.
   *
   * @returns {object|undefined} Prisma include clause, or undefined for no includes.
   */
  getInclude() {
    return undefined;
  }

  /**
   * Validates input data before a create or update operation.
   * Throw a descriptive Error to abort the operation.
   *
   * @param {object} data - The input data to validate.
   * @returns {void}
   */
  validate(data) {
    // Default: no validation. Subclasses override as needed.
  }

  /**
   * Transforms / sanitises input data before it is written to the database.
   * Use this to cast types, strip unknown fields, or set default values.
   *
   * @param {object} data - Raw input data.
   * @returns {object} Cleaned data safe to pass to Prisma.
   */
  transformInput(data) {
    return data;
  }

  /**
   * Hook called after a record is successfully created.
   * Use for side-effects such as emitting events or sending notifications.
   *
   * @param {object} record - The newly created Prisma record.
   * @returns {void}
   */
  afterCreate(record) {
    // Default: no-op.
  }

  /**
   * Hook called after a record is successfully updated.
   *
   * @param {object} record - The updated Prisma record.
   * @returns {void}
   */
  afterUpdate(record) {
    // Default: no-op.
  }

  /**
   * Hook called before a record is deleted.
   * Throw an Error here to abort the deletion (e.g. cascade-guard checks).
   *
   * @param {number} id - The primary key of the record about to be deleted.
   * @returns {Promise<void>}
   */
  async beforeDelete(id) {
    // Default: no-op.
  }

  // ── Template methods (the fixed algorithm skeleton) ───────────────────────

  /**
   * Template method: lists all records matching the given filters.
   *
   * Algorithm:
   *   1. buildWhere(filters)   — entity-specific where clause
   *   2. prisma.findMany()     — execute query with optional includes
   *   3. transformMany()       — convert raw records to DTOs
   *
   * @param {object} [filters={}] - Key-value filter params.
   * @param {object} [sort]       - Optional Prisma orderBy clause.
   * @returns {Promise<object[]>} Array of DTOs.
   */
  async findAll(filters = {}, sort) {
    const where = this.buildWhere(filters);
    const include = this.getInclude();
    const records = await this.model.findMany({
      where,
      include,
      ...(sort ? { orderBy: sort } : {}),
    });
    return this.transformMany(records);
  }

  /**
   * Template method: retrieves a single record by primary key.
   *
   * Algorithm:
   *   1. prisma.findUnique()   — fetch with optional includes
   *   2. transformOne()        — convert raw record to DTO (or return null)
   *
   * @param {number} id - The primary key.
   * @returns {Promise<object|null>} DTO, or null if not found.
   */
  async findById(id) {
    const include = this.getInclude();
    const record = await this.model.findUnique({
      where: { id },
      include,
    });
    if (!record) return null;
    return this.transformOne(record);
  }

  /**
   * Template method: creates a new record.
   *
   * Algorithm:
   *   1. validate(data)        — throw on invalid input
   *   2. transformInput(data)  — sanitise / shape data
   *   3. prisma.create()       — persist record
   *   4. afterCreate(record)   — optional side-effects
   *   5. transformOne(record)  — return DTO
   *
   * @param {object} data - Raw input data from the API request body.
   * @returns {Promise<object>} The created record as a DTO.
   */
  async create(data) {
    this.validate(data);
    const clean = this.transformInput(data);
    const include = this.getInclude();
    const record = await this.model.create({
      data: clean,
      include,
    });
    this.afterCreate(record);
    return this.transformOne(record);
  }

  /**
   * Template method: updates an existing record.
   *
   * Algorithm:
   *   1. validate(data)        — throw on invalid input
   *   2. transformInput(data)  — sanitise / shape data
   *   3. prisma.update()       — persist changes
   *   4. afterUpdate(record)   — optional side-effects
   *   5. transformOne(record)  — return DTO
   *
   * @param {number} id   - Primary key of the record to update.
   * @param {object} data - Partial input data from the API request body.
   * @returns {Promise<object>} The updated record as a DTO.
   */
  async update(id, data) {
    this.validate(data);
    const clean = this.transformInput(data);
    const include = this.getInclude();
    const record = await this.model.update({
      where: { id },
      data: clean,
      include,
    });
    this.afterUpdate(record);
    return this.transformOne(record);
  }

  /**
   * Template method: deletes a record by primary key.
   *
   * Algorithm:
   *   1. beforeDelete(id)      — guard / cascade checks (throws to abort)
   *   2. prisma.delete()       — remove record
   *
   * @param {number} id - Primary key of the record to delete.
   * @returns {Promise<{ id: number }>} Object confirming the deleted id.
   */
  async delete(id) {
    await this.beforeDelete(id);
    await this.model.delete({ where: { id } });
    return { id };
  }
}

// ---------------------------------------------------------------------------
// Concrete service: Owner
// ---------------------------------------------------------------------------

/**
 * @class OwnerService
 * @extends BaseCrudService
 * @description Concrete CRUD service for the Owner entity.
 * Overrides hooks to include the pets relation, filter by name/email,
 * validate required fields, and transform records via OwnerAdapter.
 */
class OwnerService extends BaseCrudService {
  constructor() {
    super();
    this.model = prisma.owner;
  }

  /** @override */
  getInclude() {
    return { pets: true };
  }

  /**
   * Supports filtering by firstName, lastName, or email (case-insensitive).
   * @override
   */
  buildWhere(filters) {
    const where = {};
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    return where;
  }

  /** @override */
  validate(data) {
    if (data.firstName !== undefined && !data.firstName?.trim()) {
      throw new Error("firstName is required");
    }
    if (data.lastName !== undefined && !data.lastName?.trim()) {
      throw new Error("lastName is required");
    }
    if (data.email !== undefined && !data.email?.includes("@")) {
      throw new Error("A valid email is required");
    }
  }

  /** @override */
  transformOne(record) {
    return OwnerAdapter.toDTO(record);
  }

  /** @override */
  transformMany(records) {
    return OwnerAdapter.toDTOList(records);
  }
}

// ---------------------------------------------------------------------------
// Concrete service: Pet
// ---------------------------------------------------------------------------

/**
 * @class PetService
 * @extends BaseCrudService
 * @description Concrete CRUD service for the Pet entity.
 * Overrides hooks to include the owner relation, support species/owner filters,
 * cast birthDate to Date, and transform records via PetAdapter.
 */
class PetService extends BaseCrudService {
  constructor() {
    super();
    this.model = prisma.pet;
  }

  /** @override */
  getInclude() {
    return { owner: true };
  }

  /**
   * Supports filtering by ownerId, species, or name search.
   * @override
   */
  buildWhere(filters) {
    const where = {};
    if (filters.ownerId) where.ownerId = Number(filters.ownerId);
    if (filters.species) where.species = { equals: filters.species, mode: "insensitive" };
    if (filters.search) {
      where.name = { contains: filters.search, mode: "insensitive" };
    }
    return where;
  }

  /** @override */
  validate(data) {
    if (data.name !== undefined && !data.name?.trim()) {
      throw new Error("Pet name is required");
    }
    if (data.ownerId !== undefined && !Number(data.ownerId)) {
      throw new Error("A valid ownerId is required");
    }
  }

  /**
   * Casts birthDate string to a proper Date object before saving.
   * @override
   */
  transformInput(data) {
    const clean = { ...data };
    if (clean.birthDate) clean.birthDate = new Date(clean.birthDate);
    if (clean.ownerId) clean.ownerId = Number(clean.ownerId);
    return clean;
  }

  /** @override */
  transformOne(record) {
    return PetAdapter.toDTO(record);
  }

  /** @override */
  transformMany(records) {
    return PetAdapter.toDTOList(records);
  }
}

// ---------------------------------------------------------------------------
// Concrete service: Visit
// ---------------------------------------------------------------------------

/**
 * @class VisitService
 * @extends BaseCrudService
 * @description Concrete CRUD service for the Visit entity.
 * Includes pet (with owner), vet, and services relations; filters by petId/vetId;
 * validates diagnosis presence; transforms via VisitAdapter.
 */
class VisitService extends BaseCrudService {
  constructor() {
    super();
    this.model = prisma.visit;
  }

  /** @override */
  getInclude() {
    return {
      pet: { include: { owner: true } },
      vet: true,
      services: { include: { service: true } },
    };
  }

  /**
   * Supports filtering by petId, vetId, or date range.
   * @override
   */
  buildWhere(filters) {
    const where = {};
    if (filters.petId) where.petId = Number(filters.petId);
    if (filters.vetId) where.vetId = Number(filters.vetId);
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }
    return where;
  }

  /** @override */
  validate(data) {
    if (data.diagnosis !== undefined && !data.diagnosis?.trim()) {
      throw new Error("Diagnosis is required");
    }
    if (data.petId !== undefined && !Number(data.petId)) {
      throw new Error("A valid petId is required");
    }
    if (data.vetId !== undefined && !Number(data.vetId)) {
      throw new Error("A valid vetId is required");
    }
  }

  /** @override */
  transformInput(data) {
    const clean = { ...data };
    if (clean.date) clean.date = new Date(clean.date);
    if (clean.petId) clean.petId = Number(clean.petId);
    if (clean.vetId) clean.vetId = Number(clean.vetId);
    return clean;
  }

  /** @override */
  transformOne(record) {
    return VisitAdapter.toDTO(record);
  }

  /** @override */
  transformMany(records) {
    return VisitAdapter.toDTOList(records);
  }
}

// ---------------------------------------------------------------------------
// Concrete service: Appointment
// ---------------------------------------------------------------------------

/**
 * @class AppointmentService
 * @extends BaseCrudService
 * @description Concrete CRUD service for the Appointment entity.
 * Includes pet, vet, and owner relations; supports status/date/vet filters;
 * validates timeSlot format; guards deletion of scheduled appointments;
 * transforms via AppointmentAdapter.
 */
class AppointmentService extends BaseCrudService {
  constructor() {
    super();
    this.model = prisma.appointment;
  }

  /** @override */
  getInclude() {
    return { pet: true, vet: true, owner: true };
  }

  /**
   * Supports filtering by vetId, ownerId, status, or date range.
   * @override
   */
  buildWhere(filters) {
    const where = {};
    if (filters.vetId) where.vetId = Number(filters.vetId);
    if (filters.ownerId) where.ownerId = Number(filters.ownerId);
    if (filters.petId) where.petId = Number(filters.petId);
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }
    return where;
  }

  /** @override */
  validate(data) {
    const validSlots = [
      "09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00",
    ];
    if (data.timeSlot !== undefined && !validSlots.includes(data.timeSlot)) {
      throw new Error(`timeSlot must be one of: ${validSlots.join(", ")}`);
    }
    if (data.petId !== undefined && !Number(data.petId)) {
      throw new Error("A valid petId is required");
    }
    if (data.vetId !== undefined && !Number(data.vetId)) {
      throw new Error("A valid vetId is required");
    }
    if (data.ownerId !== undefined && !Number(data.ownerId)) {
      throw new Error("A valid ownerId is required");
    }
  }

  /** @override */
  transformInput(data) {
    const clean = { ...data };
    if (clean.date) clean.date = new Date(clean.date);
    if (clean.petId) clean.petId = Number(clean.petId);
    if (clean.vetId) clean.vetId = Number(clean.vetId);
    if (clean.ownerId) clean.ownerId = Number(clean.ownerId);
    return clean;
  }

  /**
   * Prevents deletion of appointments that are still in "scheduled" status.
   * @override
   */
  async beforeDelete(id) {
    const appt = await this.model.findUnique({ where: { id } });
    if (appt && appt.status === "scheduled") {
      throw new Error(
        "Cannot delete a scheduled appointment. Cancel it first."
      );
    }
  }

  /** @override */
  transformOne(record) {
    return AppointmentAdapter.toDTO(record);
  }

  /** @override */
  transformMany(records) {
    return AppointmentAdapter.toDTOList(records);
  }
}

export {
  BaseCrudService,
  OwnerService,
  PetService,
  VisitService,
  AppointmentService,
};
