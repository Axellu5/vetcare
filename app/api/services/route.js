/**
 * GET  /api/services — list services (filter by category, sort, paginate)
 * POST /api/services — create a new service
 *
 * Patterns used: Singleton (prisma), Strategy, Factory (ResponseFactory)
 */

import { NextResponse } from "next/server";
import { ResponseFactory } from "@/lib/patterns/responseFactory";
import { getSortStrategy, SortContext } from "@/lib/patterns/strategy";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category") ?? undefined;
    const search   = searchParams.get("search")   ?? undefined;
    const sortBy   = searchParams.get("sortBy")   ?? "name";
    const order    = searchParams.get("order")    ?? "asc";
    const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
    const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

    const where = {};
    if (category) where.category = { equals: category, mode: "insensitive" };
    if (search)   where.name     = { contains: search,   mode: "insensitive" };

    const [total, records] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.findMany({ where, skip: (page - 1) * limit, take: limit }),
    ]);

    const ctx = new SortContext(getSortStrategy(sortBy));
    const dtos = ctx.executeSort(records, order);

    return NextResponse.json(ResponseFactory.list(dtos, total, page, limit));
  } catch (error) {
    console.error("[GET /api/services]", error);
    return NextResponse.json(ResponseFactory.error("Failed to fetch services"), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, description, price, category } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        ResponseFactory.error("name is required", 400),
        { status: 400 }
      );
    }
    if (price === undefined || price === null || isNaN(Number(price))) {
      return NextResponse.json(
        ResponseFactory.error("A valid price is required", 400),
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        name,
        description: description ?? "",
        price: Number(price),
        category: category ?? "general",
      },
    });

    return NextResponse.json(ResponseFactory.created(service), { status: 201 });
  } catch (error) {
    console.error("[POST /api/services]", error);
    return NextResponse.json(ResponseFactory.error("Failed to create service"), { status: 500 });
  }
}
