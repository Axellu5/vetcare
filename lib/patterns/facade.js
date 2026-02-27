/**
 * @fileoverview Facade design pattern implementation for the VetCare clinic system.
 *
 * Facade Pattern:
 * Provides a simplified, unified interface to a complex subsystem. The Facade
 * does not hide the subsystem — it wraps multiple low-level operations behind
 * a single high-level method, so callers do not need to know which tables are
 * queried, how transactions work, or how data is assembled.
 *
 * In this context, API route handlers are the "Clients". Without the Facade they
 * would each need to know about Prisma query syntax, join strategies, transaction
 * semantics, date range calculations, and business rules (e.g. slot conflict checks).
 * ClinicFacade is the "Facade" — a single class whose methods coordinate all of
 * that complexity and return ready-to-use result objects.
 *
 * Subsystems coordinated by this Facade:
 *   - Prisma ORM (Pet, Owner, Vet, Visit, VisitService, Service, Appointment tables)
 *   - Transaction management ($transaction)
 *   - Date/time range calculations for daily stats and slot availability
 *   - Business rule enforcement (appointment conflict detection)
 *
 * Benefits:
 * - Route handlers stay thin — one `await ClinicFacade.method()` call per endpoint
 * - Complex multi-table queries are tested and maintained in one place
 * - Business rules (conflict checks, slot definitions) live in one location
 */

import prisma from "../prisma.js";

/** All bookable time slots for a clinic day (09:00–17:00, hourly). */
const ALL_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

/**
 * Returns a Date set to the very start of the given day (00:00:00.000 UTC).
 *
 * @param {Date|string} date
 * @returns {Date}
 */
function startOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns a Date set to the very end of the given day (23:59:59.999 UTC).
 *
 * @param {Date|string} date
 * @returns {Date}
 */
function endOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * @class ClinicFacade
 * @description Unified interface for complex, multi-table clinic operations.
 * Each method hides the details of Prisma queries, joins, transactions, and
 * business rules behind a single async call.
 */
class ClinicFacade {
  // ---------------------------------------------------------------------------
  // 1. getFullPetHistory
  // ---------------------------------------------------------------------------

  /**
   * Retrieves the complete history of a pet: pet details, owner, all visits,
   * and every service performed during each visit (5 tables: Pet, Owner,
   * Visit, VisitService, Service).
   *
   * Facade role: the caller does not need to know about nested Prisma includes,
   * join depth, or how VisitService links Visit to Service.
   *
   * @param {number} petId - The primary key of the pet.
   * @returns {Promise<object|null>} The pet object with nested owner, visits,
   *   and services, or null if not found.
   *
   * @example
   * const history = await ClinicFacade.getFullPetHistory(3);
   * // history.visits[0].services[0].service.name → "Vaccination"
   */
  static async getFullPetHistory(petId) {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: {
        owner: true,
        visits: {
          orderBy: { date: "desc" },
          include: {
            vet: true,
            services: {
              include: {
                service: true,
              },
            },
          },
        },
      },
    });

    return pet;
  }

  // ---------------------------------------------------------------------------
  // 2. createVisitWithServices
  // ---------------------------------------------------------------------------

  /**
   * Creates a new Visit and atomically links it to one or more Services via
   * VisitService junction records. The entire operation runs inside a single
   * Prisma transaction — if any step fails, all changes are rolled back.
   *
   * Facade role: the caller provides flat data and a list of service IDs;
   * transaction management and junction-table creation are hidden entirely.
   *
   * @param {object}   data              - Fields for the new Visit record.
   * @param {number}   data.petId        - FK to Pet.
   * @param {number}   data.vetId        - FK to Vet.
   * @param {Date|string} data.date      - Date of the visit.
   * @param {string}   data.diagnosis    - Diagnosis text.
   * @param {string}   [data.notes]      - Optional clinical notes.
   * @param {number[]} serviceIds        - Array of Service IDs to link to the visit.
   * @returns {Promise<object>} The newly created Visit with its VisitService rows included.
   *
   * @example
   * const visit = await ClinicFacade.createVisitWithServices(
   *   { petId: 2, vetId: 1, date: new Date(), diagnosis: "Checkup" },
   *   [3, 7]
   * );
   * // visit.services.length === 2
   */
  static async createVisitWithServices(data, serviceIds = []) {
    const visit = await prisma.$transaction(async (tx) => {
      // Step 1: create the visit record
      const newVisit = await tx.visit.create({
        data: {
          petId: data.petId,
          vetId: data.vetId,
          date: new Date(data.date),
          diagnosis: data.diagnosis,
          notes: data.notes ?? null,
        },
      });

      // Step 2: create VisitService junction rows for each service ID
      if (serviceIds.length > 0) {
        await tx.visitService.createMany({
          data: serviceIds.map((serviceId) => ({
            visitId: newVisit.id,
            serviceId,
          })),
        });
      }

      // Step 3: return the visit with its linked services included
      return tx.visit.findUnique({
        where: { id: newVisit.id },
        include: {
          services: {
            include: { service: true },
          },
        },
      });
    });

    return visit;
  }

  // ---------------------------------------------------------------------------
  // 3. getOwnerDashboard
  // ---------------------------------------------------------------------------

  /**
   * Assembles the data needed for an owner's dashboard page: the owner record,
   * all their pets (with age data available via birthDate), and the 5 most
   * recent visits across all of their pets.
   *
   * Facade role: the caller receives one object; internally this involves
   * joining Owner → Pet and then querying Visit filtered by petId membership.
   *
   * @param {number} ownerId - The primary key of the owner.
   * @returns {Promise<{ owner: object, recentVisits: object[] }|null>}
   *   Combined dashboard data, or null if the owner does not exist.
   *
   * @example
   * const dash = await ClinicFacade.getOwnerDashboard(1);
   * // dash.owner.pets.length → 3
   * // dash.recentVisits[0].pet.name → "Rex"
   */
  static async getOwnerDashboard(ownerId) {
    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      include: {
        pets: true,
        appointments: {
          where: { date: { gte: new Date() } },
          orderBy: { date: "asc" },
          take: 5,
          include: { pet: true, vet: true },
        },
      },
    });

    if (!owner) return null;

    // Fetch the 5 most recent visits for any pet belonging to this owner
    const recentVisits = await prisma.visit.findMany({
      where: {
        petId: { in: owner.pets.map((p) => p.id) },
      },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        pet: true,
        vet: true,
        services: {
          include: { service: true },
        },
      },
    });

    return { owner, recentVisits };
  }

  // ---------------------------------------------------------------------------
  // 4. getDailyStats
  // ---------------------------------------------------------------------------

  /**
   * Returns a snapshot of today's clinic activity and overall system totals.
   * Runs five Prisma queries in parallel with Promise.all for efficiency.
   *
   * Stats returned:
   * - todayVisits        — number of visits with date falling on today
   * - upcomingAppointments — appointments from now until end of today
   * - totalPets          — total pet records in the system
   * - totalOwners        — total owner records in the system
   * - totalVets          — total vet records in the system
   *
   * Facade role: the caller gets a single flat stats object; the multi-query
   * fan-out and date range logic are hidden.
   *
   * @returns {Promise<{
   *   todayVisits: number,
   *   upcomingAppointments: number,
   *   totalPets: number,
   *   totalOwners: number,
   *   totalVets: number
   * }>}
   *
   * @example
   * const stats = await ClinicFacade.getDailyStats();
   * // stats.todayVisits → 4
   * // stats.totalPets   → 38
   */
  static async getDailyStats() {
    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    const [
      todayVisits,
      upcomingAppointments,
      totalPets,
      totalOwners,
      totalVets,
    ] = await Promise.all([
      prisma.visit.count({
        where: { date: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.appointment.count({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          status: "scheduled",
        },
      }),
      prisma.pet.count(),
      prisma.owner.count(),
      prisma.vet.count(),
    ]);

    return {
      todayVisits,
      upcomingAppointments,
      totalPets,
      totalOwners,
      totalVets,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. getVetAvailability
  // ---------------------------------------------------------------------------

  /**
   * Returns the availability of each standard time slot for a given vet on a
   * given date. Queries the Appointment table for that vet+date combination and
   * marks each of the 9 daily slots (09:00–17:00) as "free" or "busy".
   *
   * Available slots: 09:00 10:00 11:00 12:00 13:00 14:00 15:00 16:00 17:00
   *
   * Facade role: the caller passes a vetId and date string and receives a
   * ready-to-render slot array; date range construction and appointment lookup
   * are handled internally.
   *
   * @param {number}      vetId - The primary key of the vet.
   * @param {Date|string} date  - The date to check (any parseable date value).
   * @returns {Promise<Array<{ slot: string, status: "free"|"busy" }>>}
   *   An array of 9 slot objects ordered from 09:00 to 17:00.
   *
   * @example
   * const slots = await ClinicFacade.getVetAvailability(2, "2025-04-10");
   * // slots → [
   * //   { slot: "09:00", status: "free" },
   * //   { slot: "10:00", status: "busy" },
   * //   ...
   * // ]
   */
  static async getVetAvailability(vetId, date) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const appointments = await prisma.appointment.findMany({
      where: {
        vetId,
        date: { gte: dayStart, lte: dayEnd },
        status: { not: "cancelled" },
      },
      select: { timeSlot: true },
    });

    const busySlots = new Set(appointments.map((a) => a.timeSlot));

    return ALL_SLOTS.map((slot) => ({
      slot,
      status: busySlots.has(slot) ? "busy" : "free",
    }));
  }

  // ---------------------------------------------------------------------------
  // 6. createAppointment
  // ---------------------------------------------------------------------------

  /**
   * Creates a new appointment after verifying that the requested time slot is
   * not already taken by another non-cancelled appointment for the same vet on
   * the same date.
   *
   * Facade role: the caller does not need to implement the conflict-check logic.
   * The method returns either the new Appointment record or throws a descriptive
   * error that the route handler can forward directly to the client.
   *
   * @param {object}      data          - Fields for the new Appointment.
   * @param {number}      data.petId    - FK to Pet.
   * @param {number}      data.vetId    - FK to Vet.
   * @param {number}      data.ownerId  - FK to Owner.
   * @param {Date|string} data.date     - Appointment date.
   * @param {string}      data.timeSlot - One of the 9 standard slots, e.g. "10:00".
   * @param {string}      [data.notes]  - Optional notes.
   * @returns {Promise<object>} The newly created Appointment with pet, vet, and owner included.
   * @throws {Error} If the requested slot is already booked ("Slot already booked").
   *
   * @example
   * const appt = await ClinicFacade.createAppointment({
   *   petId: 1, vetId: 2, ownerId: 3,
   *   date: "2025-04-10", timeSlot: "11:00"
   * });
   * // appt.id → 14, appt.status → "scheduled"
   */
  static async createAppointment(data) {
    const dayStart = startOfDay(data.date);
    const dayEnd = endOfDay(data.date);

    // Conflict check: same vet, same date, same slot, not cancelled
    const conflict = await prisma.appointment.findFirst({
      where: {
        vetId: data.vetId,
        timeSlot: data.timeSlot,
        date: { gte: dayStart, lte: dayEnd },
        status: { not: "cancelled" },
      },
    });

    if (conflict) {
      throw new Error("Slot already booked");
    }

    const appointment = await prisma.appointment.create({
      data: {
        petId: data.petId,
        vetId: data.vetId,
        ownerId: data.ownerId,
        date: new Date(data.date),
        timeSlot: data.timeSlot,
        status: "scheduled",
        notes: data.notes ?? null,
      },
      include: {
        pet: true,
        vet: true,
        owner: true,
      },
    });

    return appointment;
  }
}

export { ClinicFacade };
