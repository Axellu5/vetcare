/**
 * @fileoverview GET /api/reports/revenue?month=2024-01
 *
 * Returns a revenue breakdown by vet for a given calendar month.
 * Revenue is calculated from the prices of services rendered during visits
 * (VisitService → Service.price), not from flat visit fees.
 *
 * Algorithm:
 *   1. Parse the "month" query param (YYYY-MM) into UTC date boundaries:
 *        start = first millisecond of the month  (e.g. 2024-01-01T00:00:00.000Z)
 *        end   = first millisecond of next month (e.g. 2024-02-01T00:00:00.000Z)
 *      The range is [start, end) — using `lt` for the upper bound avoids
 *      having to compute the last day of each month (handles 28/29/30/31 days).
 *
 *   2. Fetch all visits in that range with:
 *        - vet (id, firstName, lastName, specialty)
 *        - services → service.price
 *      A single query with includes; no GROUP BY at DB level.
 *
 *   3. Aggregate in JavaScript:
 *        Group visits by vetId using a Map.
 *        For each visit: compute cost = Σ service.price, increment vetId bucket.
 *        Produces: { vetId, vetFullName, specialty, visitCount, totalRevenue }.
 *
 *   4. Sort the grouped result by totalRevenue descending (highest earner first).
 *
 *   5. Compute month-level totals (totalVisits, totalRevenue) by reducing
 *      the grouped array — O(number of vets), not O(number of visits).
 *
 * @param {Request} request
 * @returns {NextResponse} { success, data: RevenueReportDTO }
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ResponseFactory } from "@/lib/patterns/responseFactory";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a "YYYY-MM" string and returns UTC-based start and end Date objects
 * spanning the full calendar month.
 *
 * Algorithm:
 *   start = Date.UTC(year, month-1, 1)           — first day of month, midnight UTC
 *   end   = Date.UTC(year, month,   1)           — first day of next month (exclusive)
 *
 * Using Date.UTC avoids local-timezone shifts that would occur with
 * `new Date("YYYY-MM-01")` which is parsed as local time by some runtimes.
 *
 * @param {string} monthStr - "YYYY-MM"
 * @returns {{ start: Date, end: Date, isValid: boolean }}
 */
function parseMonthBounds(monthStr) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthStr ?? "");
  if (!match) return { start: null, end: null, isValid: false };

  const year  = parseInt(match[1], 10);
  const month = parseInt(match[2], 10); // 1-based

  if (month < 1 || month > 12) return { start: null, end: null, isValid: false };

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end   = new Date(Date.UTC(year, month,     1)); // first day of NEXT month

  return { start, end, isValid: true };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get("month");

    if (!monthStr) {
      return NextResponse.json(
        ResponseFactory.error("month is required (format: YYYY-MM)", 400),
        { status: 400 },
      );
    }

    const { start, end, isValid } = parseMonthBounds(monthStr);
    if (!isValid) {
      return NextResponse.json(
        ResponseFactory.error("month must be a valid YYYY-MM value", 400),
        { status: 400 },
      );
    }

    // ── Fetch all visits in the month with vet info and service prices ─────
    //
    // The upper bound uses `lt` (strictly less than the first day of the next
    // month) so records from both the first and last day of the month are
    // correctly included regardless of their stored time component.
    //
    const visits = await prisma.visit.findMany({
      where: {
        date: { gte: start, lt: end },
      },
      include: {
        vet: {
          select: {
            id:        true,
            firstName: true,
            lastName:  true,
            specialty: true,
          },
        },
        services: {
          include: {
            service: {
              select: { price: true },
            },
          },
        },
      },
    });

    // ── Group by vet and accumulate revenue ────────────────────────────────
    //
    // Algorithm:
    //   Iterate over visits once (O(n)).
    //   For each visit, compute the visit's cost from its services.
    //   Upsert a bucket in vetMap keyed by vetId:
    //     - first occurrence: initialise with vet metadata, visitCount=1
    //     - subsequent: increment visitCount and totalRevenue
    //
    /** @type {Map<number, { vetId: number, vetFullName: string, specialty: string, visitCount: number, totalRevenue: number }>} */
    const vetMap = new Map();

    for (const visit of visits) {
      const visitCost = visit.services.reduce(
        (sum, vs) => sum + (vs.service?.price ?? 0),
        0,
      );

      if (!vetMap.has(visit.vetId)) {
        vetMap.set(visit.vetId, {
          vetId:        visit.vetId,
          vetFullName:  `${visit.vet.firstName} ${visit.vet.lastName}`,
          specialty:    visit.vet.specialty,
          visitCount:   0,
          totalRevenue: 0,
        });
      }

      const bucket = vetMap.get(visit.vetId);
      bucket.visitCount   += 1;
      bucket.totalRevenue += visitCost;
    }

    // Convert map to array and sort by revenue descending (highest earner first)
    const byVet = Array.from(vetMap.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    );

    // ── Month-level totals ─────────────────────────────────────────────────
    const totalVisits  = byVet.reduce((sum, v) => sum + v.visitCount,   0);
    const totalRevenue = byVet.reduce((sum, v) => sum + v.totalRevenue, 0);

    const dto = {
      month: monthStr,
      byVet,
      summary: {
        totalVisits,
        totalRevenue,
        vetCount: byVet.length,
      },
    };

    return NextResponse.json(ResponseFactory.success(dto));
  } catch (error) {
    console.error("[GET /api/reports/revenue]", error);
    return NextResponse.json(
      ResponseFactory.error("Failed to fetch revenue report"),
      { status: 500 },
    );
  }
}
