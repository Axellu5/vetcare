/**
 * GET  /api/owners — list all owners (search, sort, paginate)
 * POST /api/owners — create a new owner
 *
 * Patterns used:
 *   Singleton    — prisma client via lib/prisma
 *   Template Method — OwnerService.buildWhere / validate / transformInput
 *   Adapter      — OwnerAdapter.toDTO via OwnerService.transformMany
 *   Factory      — ResponseFactory for all responses
 */

import { NextResponse } from "next/server";
import { OwnerService } from "@/lib/patterns/templateMethod";
import { ResponseFactory } from "@/lib/patterns/responseFactory";
import prisma from "@/lib/prisma";

const ownerService = new OwnerService();

/**
 * Sorts an array of OwnerDTOs with Lithuanian locale-aware comparison.
 *
 * Algorithm:
 *   "name" sort — compares lastName then firstName using localeCompare("lt").
 *     Lithuanian alphabet places diacritics right after their base letter
 *     (A < Ą < B, C < Č < D, S < Š < T, Z < Ž) which PostgreSQL's default
 *     collation does NOT respect — it puts all diacritic letters after Z.
 *     Sorting in JS after fetching all filtered records is the only reliable
 *     way to get correct cross-page Lithuanian alphabetical ordering.
 *   "date" sort — compares createdAt strings (ISO "YYYY-MM-DD", lexicographically
 *     safe) or falls back to 0 for missing dates.
 *
 * @param {object[]} dtos   - Array of OwnerDTOs (with lastName, firstName, createdAt).
 * @param {string}   sortBy - "name" | "date"
 * @param {string}   order  - "asc" | "desc"
 * @returns {object[]} New sorted array.
 */
function sortOwners(dtos, sortBy, order) {
  return [...dtos].sort((a, b) => {
    let cmp;
    if (sortBy === "date") {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      cmp = tA - tB;
    } else {
      // Primary: lastName, secondary: firstName — both with Lithuanian locale
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

    // Build where via OwnerService hook
    const where   = ownerService.buildWhere({ search });
    const include = ownerService.getInclude();

    // Fetch ALL filtered records without DB-level ordering or pagination.
    // Lithuanian alphabetical ordering (Ą after A, Č after C, Š after S, Ž after Z)
    // requires JS-level localeCompare("lt") — PostgreSQL's default collation places
    // all diacritic characters after Z, producing incorrect cross-page ordering.
    const [total, records] = await Promise.all([
      prisma.owner.count({ where }),
      prisma.owner.findMany({ where, include }),
    ]);

    // Sort all filtered DTOs with Lithuanian locale, then paginate in JS
    const dtos = sortOwners(ownerService.transformMany(records), sortBy, order);
    const start = (page - 1) * limit;
    const paginatedDtos = dtos.slice(start, start + limit);

    return NextResponse.json(ResponseFactory.list(paginatedDtos, total, page, limit));
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
