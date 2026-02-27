/**
 * GET  /api/pets — list all pets (search, filter by species/ownerId, sort, paginate)
 * POST /api/pets — create a new pet
 *
 * Patterns used: Singleton, Template Method (PetService), Strategy, Adapter, Factory
 */

import { NextResponse } from "next/server";
import { PetService } from "@/lib/patterns/templateMethod";
import { ResponseFactory } from "@/lib/patterns/responseFactory";
import { getSortStrategy, SortContext } from "@/lib/patterns/strategy";
import prisma from "@/lib/prisma";

const petService = new PetService();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search  = searchParams.get("search")  ?? undefined;
    const species = searchParams.get("species") ?? undefined;
    const ownerId = searchParams.get("ownerId") ?? undefined;
    const sortBy  = searchParams.get("sortBy")  ?? "name";
    const order   = searchParams.get("order")   ?? "asc";
    const page    = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
    const limit   = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

    const where   = petService.buildWhere({ search, species, ownerId });
    const include = petService.getInclude();

    const [total, records] = await Promise.all([
      prisma.pet.count({ where }),
      prisma.pet.findMany({ where, include, skip: (page - 1) * limit, take: limit }),
    ]);

    let dtos = petService.transformMany(records);
    const ctx = new SortContext(getSortStrategy(sortBy));
    dtos = ctx.executeSort(dtos, order);

    return NextResponse.json(ResponseFactory.list(dtos, total, page, limit));
  } catch (error) {
    console.error("[GET /api/pets]", error);
    return NextResponse.json(ResponseFactory.error("Failed to fetch pets"), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const dto  = await petService.create(body);
    return NextResponse.json(ResponseFactory.created(dto), { status: 201 });
  } catch (error) {
    const isValidation = error.message?.includes("required") || error.message?.includes("valid");
    if (isValidation) {
      return NextResponse.json(ResponseFactory.error(error.message, 400), { status: 400 });
    }
    console.error("[POST /api/pets]", error);
    return NextResponse.json(ResponseFactory.error("Failed to create pet"), { status: 500 });
  }
}
