/**
 * GET  /api/vets — list all vets (search, sort, paginate)
 * POST /api/vets — create a new vet
 *
 * Patterns used: Singleton (prisma), Factory (ResponseFactory)
 * Note: No VetService in templateMethod — uses prisma directly with ResponseFactory.
 */

import { NextResponse } from "next/server";
import { ResponseFactory } from "@/lib/patterns/responseFactory";
import { getSortStrategy, SortContext } from "@/lib/patterns/strategy";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") ?? undefined;
    const sortBy = searchParams.get("sortBy") ?? "name";
    const order  = searchParams.get("order")  ?? "asc";
    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName:  { contains: search, mode: "insensitive" } },
            { specialty: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [total, records] = await Promise.all([
      prisma.vet.count({ where }),
      prisma.vet.findMany({ where, skip: (page - 1) * limit, take: limit }),
    ]);

    // Add computed fullName for Strategy sort compatibility
    let dtos = records.map((v) => ({ ...v, name: `${v.firstName} ${v.lastName}` }));
    const ctx = new SortContext(getSortStrategy(sortBy));
    dtos = ctx.executeSort(dtos, order);

    return NextResponse.json(ResponseFactory.list(dtos, total, page, limit));
  } catch (error) {
    console.error("[GET /api/vets]", error);
    return NextResponse.json(ResponseFactory.error("Failed to fetch vets"), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { firstName, lastName, specialty, phone, email } = await request.json();

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        ResponseFactory.error("firstName and lastName are required", 400),
        { status: 400 }
      );
    }
    if (!email?.includes("@")) {
      return NextResponse.json(
        ResponseFactory.error("A valid email is required", 400),
        { status: 400 }
      );
    }

    const vet = await prisma.vet.create({
      data: { firstName, lastName, specialty: specialty ?? "", phone: phone ?? "", email },
    });

    return NextResponse.json(ResponseFactory.created(vet), { status: 201 });
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json(
        ResponseFactory.error("A vet with that email already exists", 409),
        { status: 409 }
      );
    }
    console.error("[POST /api/vets]", error);
    return NextResponse.json(ResponseFactory.error("Failed to create vet"), { status: 500 });
  }
}
