/**
 * GET  /api/vets — list all vets (search, sort, paginate)
 * POST /api/vets — create a new vet
 *
 * Patterns used: Singleton (prisma), Factory (ResponseFactory)
 * Note: No VetService in templateMethod — uses prisma directly with ResponseFactory.
 */

import { NextResponse } from "next/server";
import { ResponseFactory } from "@/lib/patterns/responseFactory";
import prisma from "@/lib/prisma";

/**
 * Sorts an array of vet DTOs with Lithuanian locale-aware comparison.
 *
 * "name" sort — sorts by lastName then firstName using localeCompare("lt"),
 *   ensuring correct Lithuanian diacritic ordering (Ą after A, Š after S, etc.)
 *   instead of the Unicode default that places diacritics after Z.
 * "date" sort — sorts by createdAt timestamp.
 *
 * @param {object[]} dtos   - Vet DTOs with firstName, lastName, createdAt.
 * @param {string}   sortBy - "name" | "date"
 * @param {string}   order  - "asc" | "desc"
 * @returns {object[]} New sorted array.
 */
function sortVets(dtos, sortBy, order) {
  return [...dtos].sort((a, b) => {
    let cmp;
    if (sortBy === "date") {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      cmp = tA - tB;
    } else {
      cmp =
        (a.lastName  ?? "").localeCompare(b.lastName  ?? "", "lt", { sensitivity: "accent" }) ||
        (a.firstName ?? "").localeCompare(b.firstName ?? "", "lt", { sensitivity: "accent" });
    }
    return order === "desc" ? -cmp : cmp;
  });
}

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

    // Fetch ALL filtered records — no skip/take, no DB-level orderBy.
    // Lithuanian locale sorting must happen in JS (see sortVets above).
    const [total, records] = await Promise.all([
      prisma.vet.count({ where }),
      prisma.vet.findMany({ where, include: { _count: { select: { visits: true } } } }),
    ]);

    let dtos = records.map((v) => ({
      ...v,
      name:       `${v.firstName} ${v.lastName}`,
      visitCount: v._count?.visits ?? 0,
    }));

    dtos = sortVets(dtos, sortBy, order);
    const start = (page - 1) * limit;
    const paginatedDtos = dtos.slice(start, start + limit);

    return NextResponse.json(ResponseFactory.list(paginatedDtos, total, page, limit));
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
