/**
 * GET    /api/appointments/[id] — get appointment by id
 * PUT    /api/appointments/[id] — update appointment (status, notes, reschedule)
 * DELETE /api/appointments/[id] — delete (only non-scheduled; guard in AppointmentService)
 *
 * Patterns used: Singleton, Template Method (AppointmentService), Adapter, Factory
 */

import { NextResponse } from "next/server";
import { AppointmentService } from "@/lib/patterns/templateMethod";
import { ResponseFactory } from "@/lib/patterns/responseFactory";

const appointmentService = new AppointmentService();

export async function GET(request, { params }) {
  try {
    const id  = parseInt(params.id, 10);
    const dto = await appointmentService.findById(id);
    if (!dto) {
      return NextResponse.json(ResponseFactory.notFound("Appointment"), { status: 404 });
    }
    return NextResponse.json(ResponseFactory.success(dto));
  } catch (error) {
    console.error("[GET /api/appointments/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to fetch appointment"), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id   = parseInt(params.id, 10);
    const body = await request.json();
    const dto  = await appointmentService.update(id, body);
    return NextResponse.json(ResponseFactory.success(dto, "Appointment updated successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Appointment"), { status: 404 });
    }
    const isValidation =
      error.message?.includes("timeSlot") || error.message?.includes("required");
    if (isValidation) {
      return NextResponse.json(ResponseFactory.error(error.message, 400), { status: 400 });
    }
    console.error("[PUT /api/appointments/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to update appointment"), { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id     = parseInt(params.id, 10);
    const result = await appointmentService.delete(id);
    return NextResponse.json(ResponseFactory.success(result, "Appointment deleted successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Appointment"), { status: 404 });
    }
    // AppointmentService.beforeDelete throws if status is "scheduled"
    if (error.message?.includes("scheduled")) {
      return NextResponse.json(
        ResponseFactory.error(error.message, 409),
        { status: 409 }
      );
    }
    console.error("[DELETE /api/appointments/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to delete appointment"), { status: 500 });
  }
}
