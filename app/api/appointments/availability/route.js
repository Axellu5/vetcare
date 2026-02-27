/**
 * GET /api/appointments/availability?vetId=1&date=2024-06-15
 *
 * Returns availability for all 9 daily time slots for a specific vet on a given date.
 * Response: { slots: [{ time: "09:00", available: true }, ...] }
 *
 * Patterns used: Singleton, Facade (getVetAvailability), Factory (ResponseFactory)
 */

import { NextResponse } from "next/server";
import { ClinicFacade } from "@/lib/patterns/facade";
import { ResponseFactory } from "@/lib/patterns/responseFactory";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const vetIdParam = searchParams.get("vetId");
    const date       = searchParams.get("date");

    if (!vetIdParam || !date) {
      return NextResponse.json(
        ResponseFactory.error("vetId and date query parameters are required", 400),
        { status: 400 }
      );
    }

    const vetId = parseInt(vetIdParam, 10);
    if (isNaN(vetId)) {
      return NextResponse.json(
        ResponseFactory.error("vetId must be a valid number", 400),
        { status: 400 }
      );
    }

    // Facade returns [{ slot: "09:00", status: "free"|"busy" }]
    const availability = await ClinicFacade.getVetAvailability(vetId, date);

    // Map to the requested response shape: { time, available }
    const slots = availability.map(({ slot, status }) => ({
      time: slot,
      available: status === "free",
    }));

    return NextResponse.json(ResponseFactory.success({ slots }));
  } catch (error) {
    console.error("[GET /api/appointments/availability]", error);
    return NextResponse.json(
      ResponseFactory.error("Failed to fetch availability"),
      { status: 500 }
    );
  }
}
