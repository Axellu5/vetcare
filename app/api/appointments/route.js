/**
 * GET  /api/appointments — list appointments (filter by vetId, ownerId, petId, status, date range)
 * POST /api/appointments — create appointment (via ClinicFacade — includes conflict check)
 *
 * Patterns used: Singleton, Facade (createAppointment), Template Method (AppointmentService),
 *                Strategy, Adapter, Factory
 */

import { NextResponse } from "next/server";
import { AppointmentService } from "@/lib/patterns/templateMethod";
import { ClinicFacade } from "@/lib/patterns/facade";
import { ResponseFactory } from "@/lib/patterns/responseFactory";
import { AppointmentAdapter } from "@/lib/patterns/adapter";
import { getSortStrategy, SortContext } from "@/lib/patterns/strategy";
import prisma from "@/lib/prisma";

const appointmentService = new AppointmentService();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const vetId  = searchParams.get("vetId")   ?? undefined;
    const ownerId = searchParams.get("ownerId") ?? undefined;
    const petId  = searchParams.get("petId")   ?? undefined;
    const status = searchParams.get("status")  ?? undefined;
    const from   = searchParams.get("from")    ?? undefined;
    const to     = searchParams.get("to")      ?? undefined;
    const sortBy = searchParams.get("sortBy")  ?? "date";
    const order  = searchParams.get("order")   ?? "asc";
    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

    const where   = appointmentService.buildWhere({ vetId, ownerId, petId, status, from, to });
    const include = appointmentService.getInclude();

    const [total, records] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        include,
        orderBy: { date: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    let dtos = appointmentService.transformMany(records);
    const ctx = new SortContext(getSortStrategy(sortBy));
    dtos = ctx.executeSort(dtos, order);

    return NextResponse.json(ResponseFactory.list(dtos, total, page, limit));
  } catch (error) {
    console.error("[GET /api/appointments]", error);
    return NextResponse.json(ResponseFactory.error("Failed to fetch appointments"), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.petId || !body.vetId || !body.ownerId) {
      return NextResponse.json(
        ResponseFactory.error("petId, vetId and ownerId are required", 400),
        { status: 400 }
      );
    }
    if (!body.date || !body.timeSlot) {
      return NextResponse.json(
        ResponseFactory.error("date and timeSlot are required", 400),
        { status: 400 }
      );
    }

    // Facade handles conflict check + creation
    const appointment = await ClinicFacade.createAppointment(body);
    const dto = AppointmentAdapter.toDTO(appointment);

    return NextResponse.json(ResponseFactory.created(dto), { status: 201 });
  } catch (error) {
    if (error.message === "Slot already booked") {
      return NextResponse.json(
        ResponseFactory.error("This time slot is already booked for the selected vet", 409),
        { status: 409 }
      );
    }
    const isValidation = error.message?.includes("timeSlot") || error.message?.includes("required");
    if (isValidation) {
      return NextResponse.json(ResponseFactory.error(error.message, 400), { status: 400 });
    }
    console.error("[POST /api/appointments]", error);
    return NextResponse.json(ResponseFactory.error("Failed to create appointment"), { status: 500 });
  }
}
