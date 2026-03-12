/**
 * @fileoverview GET /api/reports/vet-schedule?vetId=1&from=2024-01-01&to=2024-12-31
 *
 * Returns all clinical activity (visits + appointments) for a vet within a
 * date range, including pet and owner information for each entry.
 *
 * Algorithm:
 *   Three Prisma queries run in parallel via Promise.all to minimise latency:
 *     1. prisma.vet.findUnique        — vet header record
 *     2. prisma.visit.findMany        — all visits in [from, to] for this vet,
 *                                       with pet → owner and services → service
 *     3. prisma.appointment.findMany  — all appointments in [from, to] for this
 *                                       vet, with pet and owner
 *
 *   "from" and "to" strings (YYYY-MM-DD) are converted to UTC-noon timestamps
 *   to avoid timezone-related off-by-one day errors: a record stored as
 *   "2024-03-01T00:00:00Z" (midnight UTC) would fall outside a gte/lte range
 *   anchored at local midnight, but safely lands within UTC-noon bounds.
 *
 *   Revenue for the period is derived by summing service prices across all
 *   returned visits in JavaScript — this field cannot be computed at DB level
 *   without a raw aggregation query.
 *
 * Query paths:
 *   Vet ← Visit → Pet → Owner    (via petId, ownerId)
 *               → VisitService → Service
 *   Vet ← Appointment → Pet, Owner
 *
 * @param {Request} request
 * @returns {NextResponse} { success, data: VetScheduleDTO }
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ResponseFactory } from "@/lib/patterns/responseFactory";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Parses a YYYY-MM-DD string to a Date at UTC noon (12:00:00Z).
 * Using noon instead of midnight avoids timezone-related off-by-one day errors
 * when comparing against DateTime values stored at different UTC offsets.
 *
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {Date}
 */
function parseToUTCNoon(dateStr) {
  return new Date(`${dateStr}T12:00:00Z`);
}

/**
 * Formats a Date to "YYYY-MM-DD".
 *
 * @param {Date|string|null} date
 * @returns {string|null}
 */
function fmt(date) {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const vetIdRaw = searchParams.get("vetId");
    const fromStr  = searchParams.get("from");
    const toStr    = searchParams.get("to");

    // ── Validate required params ───────────────────────────────────────────
    if (!vetIdRaw || !fromStr || !toStr) {
      return NextResponse.json(
        ResponseFactory.error("vetId, from, and to are required", 400),
        { status: 400 },
      );
    }

    const vetId = Number(vetIdRaw);
    if (!Number.isInteger(vetId) || vetId < 1) {
      return NextResponse.json(
        ResponseFactory.error("vetId must be a positive integer", 400),
        { status: 400 },
      );
    }

    const fromDate = parseToUTCNoon(fromStr);
    const toDate   = parseToUTCNoon(toStr);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        ResponseFactory.error("from and to must be valid dates (YYYY-MM-DD)", 400),
        { status: 400 },
      );
    }

    if (fromDate > toDate) {
      return NextResponse.json(
        ResponseFactory.error("from must not be later than to", 400),
        { status: 400 },
      );
    }

    // ── Three parallel queries ─────────────────────────────────────────────
    //
    // Query 1: vet header record
    // Query 2: visits in range — pet + nested owner + services → service
    // Query 3: appointments in range — pet + owner
    //
    const [vet, visits, appointments] = await Promise.all([

      // Query 1 — vet record
      prisma.vet.findUnique({
        where: { id: vetId },
        select: {
          id:        true,
          firstName: true,
          lastName:  true,
          specialty: true,
          phone:     true,
          email:     true,
        },
      }),

      // Query 2 — visits with pet, owner, and services
      prisma.visit.findMany({
        where: {
          vetId,
          date: { gte: fromDate, lte: toDate },
        },
        orderBy: { date: "asc" },
        include: {
          pet: {
            select: {
              name:    true,
              species: true,
              breed:   true,
              owner: {
                select: {
                  firstName: true,
                  lastName:  true,
                  phone:     true,
                  email:     true,
                },
              },
            },
          },
          services: {
            include: {
              service: {
                select: { name: true, price: true, category: true },
              },
            },
          },
        },
      }),

      // Query 3 — appointments with pet and owner
      prisma.appointment.findMany({
        where: {
          vetId,
          date: { gte: fromDate, lte: toDate },
        },
        orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
        include: {
          pet: {
            select: { name: true, species: true, breed: true },
          },
          owner: {
            select: { firstName: true, lastName: true, phone: true },
          },
        },
      }),
    ]);

    if (!vet) {
      return NextResponse.json(
        ResponseFactory.notFound("Vet"),
        { status: 404 },
      );
    }

    // ── Shape visits into DTOs and compute revenue ─────────────────────────

    const visitDTOs = visits.map((v) => {
      const services = v.services.map((vs) => ({
        name:     vs.service?.name     ?? null,
        price:    vs.service?.price    ?? 0,
        category: vs.service?.category ?? null,
      }));
      const totalCost = services.reduce((sum, s) => sum + s.price, 0);

      return {
        id:            v.id,
        date:          fmt(v.date),
        diagnosis:     v.diagnosis,
        notes:         v.notes ?? null,
        petName:       v.pet?.name    ?? null,
        petSpecies:    v.pet?.species ?? null,
        ownerFullName: v.pet?.owner
          ? `${v.pet.owner.firstName} ${v.pet.owner.lastName}`
          : null,
        ownerPhone: v.pet?.owner?.phone ?? null,
        services,
        totalCost,
      };
    });

    const appointmentDTOs = appointments.map((a) => ({
      id:            a.id,
      date:          fmt(a.date),
      timeSlot:      a.timeSlot,
      status:        a.status,
      notes:         a.notes ?? null,
      petName:       a.pet?.name    ?? null,
      petSpecies:    a.pet?.species ?? null,
      ownerFullName: a.owner
        ? `${a.owner.firstName} ${a.owner.lastName}`
        : null,
      ownerPhone: a.owner?.phone ?? null,
    }));

    // ── Aggregate summary ──────────────────────────────────────────────────
    const totalRevenue = visitDTOs.reduce((sum, v) => sum + v.totalCost, 0);

    const dto = {
      vet: {
        id:        vet.id,
        fullName:  `${vet.firstName} ${vet.lastName}`,
        specialty: vet.specialty,
        phone:     vet.phone,
        email:     vet.email,
      },
      period: { from: fromStr, to: toStr },
      visits:       visitDTOs,
      appointments: appointmentDTOs,
      summary: {
        visitCount:       visitDTOs.length,
        appointmentCount: appointmentDTOs.length,
        totalRevenue,
      },
    };

    return NextResponse.json(ResponseFactory.success(dto));
  } catch (error) {
    console.error("[GET /api/reports/vet-schedule]", error);
    return NextResponse.json(
      ResponseFactory.error("Failed to fetch vet schedule"),
      { status: 500 },
    );
  }
}
