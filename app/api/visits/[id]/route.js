/**
 * GET    /api/visits/[id] — get visit by id (with pet, vet, services)
 * PUT    /api/visits/[id] — update visit (and sync matching appointment)
 * DELETE /api/visits/[id] — delete visit (and delete matching appointment)
 *
 * Patterns used: Singleton, Template Method (VisitService), Adapter, Factory
 */

import { NextResponse } from "next/server";
import { VisitService } from "@/lib/patterns/templateMethod";
import { ResponseFactory } from "@/lib/patterns/responseFactory";
import prisma from "@/lib/prisma";

const visitService = new VisitService();

/**
 * Safely parses a date-only string (YYYY-MM-DD) to a Date at UTC noon.
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

/**
 * Extracts "YYYY-MM-DD" from a Date object using UTC components.
 *
 * @param {Date} date
 * @returns {string}
 */
function toDateStr(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Finds appointment IDs that match a visit by petId, vetId, and same calendar day.
 * Uses JS string comparison instead of Prisma date-range to avoid timezone edge cases.
 *
 * @param {number} petId
 * @param {number} vetId
 * @param {Date}   date
 * @returns {Promise<number[]>} Array of matching appointment IDs.
 */
async function findMatchingAppointmentIds(petId, vetId, date) {
  const candidates = await prisma.appointment.findMany({
    where: { petId, vetId },
    select: { id: true, date: true },
  });

  const dateStr = toDateStr(date);
  return candidates
    .filter((a) => toDateStr(a.date) === dateStr)
    .map((a) => a.id);
}

export async function GET(request, { params }) {
  try {
    const id  = parseInt(params.id, 10);
    const dto = await visitService.findById(id);
    if (!dto) {
      return NextResponse.json(ResponseFactory.notFound("Visit"), { status: 404 });
    }
    return NextResponse.json(ResponseFactory.success(dto));
  } catch (error) {
    console.error("[GET /api/visits/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to fetch visit"), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id   = parseInt(params.id, 10);
    const body = await request.json();

    // Fetch the current visit before updating to get old values for appointment sync
    const oldVisit = await prisma.visit.findUnique({ where: { id } });
    if (!oldVisit) {
      return NextResponse.json(ResponseFactory.notFound("Visit"), { status: 404 });
    }

    // Update the visit via template method (strip timeSlot — it belongs to Appointment, not Visit)
    const { timeSlot: _ts, ...visitData } = body;
    const dto = await visitService.update(id, visitData);

    // Sync the matching appointment if date, vet, or time slot changed
    const newDate     = body.date     ? safeParseDate(body.date) : null;
    const newVetId    = body.vetId    ? Number(body.vetId)       : null;
    const newTimeSlot = body.timeSlot || null;

    const dateChanged = newDate  && toDateStr(newDate) !== toDateStr(oldVisit.date);
    const vetChanged  = newVetId && newVetId !== oldVisit.vetId;
    const needsSync   = dateChanged || vetChanged || newTimeSlot;

    if (needsSync) {
      const updateData = {};
      if (dateChanged)  updateData.date     = newDate;
      if (vetChanged)   updateData.vetId    = newVetId;
      if (newTimeSlot)  updateData.timeSlot = newTimeSlot;

      // Find matching appointments using JS date comparison (avoids Prisma date-range edge cases)
      const matchingIds = await findMatchingAppointmentIds(
        oldVisit.petId,
        oldVisit.vetId,
        oldVisit.date,
      );

      console.log("[PUT /api/visits/:id] Appointment sync:", {
        visitId: id,
        oldDate: toDateStr(oldVisit.date),
        newDate: newDate ? toDateStr(newDate) : null,
        oldVetId: oldVisit.vetId,
        newVetId,
        newTimeSlot,
        matchingAppointments: matchingIds,
      });

      if (matchingIds.length > 0) {
        await prisma.appointment.updateMany({
          where: { id: { in: matchingIds } },
          data: updateData,
        });
      }
    }

    return NextResponse.json(ResponseFactory.success(dto, "Visit updated successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Visit"), { status: 404 });
    }
    const isValidation = error.message?.includes("required") || error.message?.includes("valid");
    if (isValidation) {
      return NextResponse.json(ResponseFactory.error(error.message, 400), { status: 400 });
    }
    console.error("[PUT /api/visits/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to update visit"), { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id, 10);

    // Fetch the visit before deletion so we can also remove the matching appointment
    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit) {
      return NextResponse.json(ResponseFactory.notFound("Visit"), { status: 404 });
    }

    // Delete the visit (beforeDelete hook handles VisitService junction records)
    const result = await visitService.delete(id);

    // Delete the matching appointment(s) so the calendar stays in sync
    const matchingIds = await findMatchingAppointmentIds(
      visit.petId,
      visit.vetId,
      visit.date,
    );

    if (matchingIds.length > 0) {
      await prisma.appointment.deleteMany({
        where: { id: { in: matchingIds } },
      });
      console.log("[DELETE /api/visits/:id] Deleted matching appointments:", matchingIds);
    }

    return NextResponse.json(ResponseFactory.success(result, "Visit deleted successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Visit"), { status: 404 });
    }
    console.error("[DELETE /api/visits/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to delete visit"), { status: 500 });
  }
}
