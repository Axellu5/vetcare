/**
 * GET  /api/owners — list all owners (search, sort, paginate)
 * POST /api/owners — create a new owner
 *
 * Patterns used:
 *   Singleton    — prisma client via lib/prisma
 *   Template Method — OwnerService.buildWhere / validate / transformInput
 *   Strategy     — getSortStrategy + SortContext for sort order
 *   Adapter      — OwnerAdapter.toDTO via OwnerService.transformMany
 *   Factory      — ResponseFactory for all responses
 */

import { NextResponse } from "next/server";
import { OwnerService } from "@/lib/patterns/templateMethod";
import { ResponseFactory } from "@/lib/patterns/responseFactory";
import { getSortStrategy, SortContext } from "@/lib/patterns/strategy";
import prisma from "@/lib/prisma";

const ownerService = new OwnerService();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") ?? undefined;
    const sortBy = searchParams.get("sortBy") ?? "name";
    const order  = searchParams.get("order")  ?? "asc";
    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

    // Build where via OwnerService hook, then count + fetch with pagination
    const where = ownerService.buildWhere({ search });
    const include = ownerService.getInclude();

    const [total, records] = await Promise.all([
      prisma.owner.count({ where }),
      prisma.owner.findMany({ where, include, skip: (page - 1) * limit, take: limit }),
    ]);

    // Transform to DTOs via OwnerAdapter, then sort in-memory
    let dtos = ownerService.transformMany(records);
    const ctx = new SortContext(getSortStrategy(sortBy));
    dtos = ctx.executeSort(dtos, order);

    return NextResponse.json(ResponseFactory.list(dtos, total, page, limit));
  } catch (error) {
    console.error("[GET /api/owners]", error);
    return NextResponse.json(
      ResponseFactory.error("Failed to fetch owners"),
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const dto = await ownerService.create(body);
    return NextResponse.json(ResponseFactory.created(dto), { status: 201 });
  } catch (error) {
    const isValidation = error.message?.includes("required") || error.message?.includes("valid");
    if (isValidation) {
      return NextResponse.json(ResponseFactory.error(error.message, 400), { status: 400 });
    }
    console.error("[POST /api/owners]", error);
    return NextResponse.json(ResponseFactory.error("Failed to create owner"), { status: 500 });
  }
}
