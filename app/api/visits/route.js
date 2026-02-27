/**
 * GET  /api/visits — list visits (filter by petId, vetId, date range, sort, paginate)
 * POST /api/visits — create visit with services (via ClinicFacade transaction)
 *
 * Patterns used: Singleton, Facade (createVisitWithServices), Template Method (VisitService),
 *                Strategy, Adapter, Factory
 */

import { NextResponse } from "next/server";
import { VisitService } from "@/lib/patterns/templateMethod";
import { ClinicFacade } from "@/lib/patterns/facade";
import { ResponseFactory } from "@/lib/patterns/responseFactory";
import { VisitAdapter } from "@/lib/patterns/adapter";
import { getSortStrategy, SortContext } from "@/lib/patterns/strategy";
import prisma from "@/lib/prisma";

const visitService = new VisitService();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const petId  = searchParams.get("petId")  ?? undefined;
    const vetId  = searchParams.get("vetId")  ?? undefined;
    const from   = searchParams.get("from")   ?? undefined;
    const to     = searchParams.get("to")     ?? undefined;
    const sortBy = searchParams.get("sortBy") ?? "date";
    const order  = searchParams.get("order")  ?? "desc";
    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

    const where   = visitService.buildWhere({ petId, vetId, from, to });
    const include = visitService.getInclude();

    const [total, records] = await Promise.all([
      prisma.visit.count({ where }),
      prisma.visit.findMany({
        where,
        include,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    let dtos = visitService.transformMany(records);
    const ctx = new SortContext(getSortStrategy(sortBy));
    dtos = ctx.executeSort(dtos, order);

    return NextResponse.json(ResponseFactory.list(dtos, total, page, limit));
  } catch (error) {
    console.error("[GET /api/visits]", error);
    return NextResponse.json(ResponseFactory.error("Failed to fetch visits"), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceIds = [], ...visitData } = body;

    if (!visitData.petId || !visitData.vetId) {
      return NextResponse.json(
        ResponseFactory.error("petId and vetId are required", 400),
        { status: 400 }
      );
    }
    if (!visitData.diagnosis?.trim()) {
      return NextResponse.json(
        ResponseFactory.error("diagnosis is required", 400),
        { status: 400 }
      );
    }

    // Facade handles transaction: create visit + link services atomically
    const visit = await ClinicFacade.createVisitWithServices(visitData, serviceIds);
    const dto   = VisitAdapter.toDTO(visit);

    return NextResponse.json(ResponseFactory.created(dto), { status: 201 });
  } catch (error) {
    console.error("[POST /api/visits]", error);
    return NextResponse.json(ResponseFactory.error("Failed to create visit"), { status: 500 });
  }
}
