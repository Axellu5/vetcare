/**
 * @fileoverview GET /api/reports/upcoming-vaccinations
 *
 * Returns all pets that are overdue for vaccination — i.e. their last
 * vaccination service was more than 1 year ago, or they have never received one.
 *
 * Algorithm (two-step approach to avoid a full-table GROUP BY):
 *
 *   Step 1 — Find pet IDs vaccinated within the last year:
 *     SELECT DISTINCT petId FROM Visit
 *       WHERE date >= (NOW − 1 year)
 *         AND EXISTS (
 *           SELECT 1 FROM VisitService vs
 *           JOIN Service s ON vs.serviceId = s.id
 *           WHERE vs.visitId = Visit.id
 *             AND s.name = 'Vakcinacija'
 *         )
 *
 *   Step 2 — Fetch all remaining pets (not in step-1 set):
 *     SELECT Pet.*, Owner.*, lastVaccVisit.date
 *       FROM Pet
 *       JOIN Owner ON Pet.ownerId = Owner.id
 *       LEFT JOIN LATERAL (
 *         SELECT date FROM Visit
 *           WHERE petId = Pet.id
 *             AND EXISTS vaccination service
 *           ORDER BY date DESC LIMIT 1
 *       ) lastVaccVisit ON true
 *       WHERE Pet.id NOT IN (<step 1 IDs>)
 *       ORDER BY Pet.name ASC
 *
 *   The two-step strategy is efficient because step 1 is a small, indexed scan
 *   (recent dates + indexed petId), and step 2 only loads the qualifying pets.
 *   This avoids loading every pet + all their visits into memory.
 *
 *   Each result row is tagged with a "status":
 *     "overdue" — last vaccination was > 1 year ago (date known)
 *     "never"   — no vaccination record exists at all
 *
 *   "Vakcinacija" is the canonical vaccination service name in the system.
 *   All VisitService records linked to a Service with that name are considered.
 *
 * @param {Request} _request
 * @returns {NextResponse} { success, data: VaccinationReminderDTO[], meta }
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ResponseFactory } from "@/lib/patterns/responseFactory";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Exact name of the vaccination service in the Service table. */
const VACCINATION_SERVICE_NAME = "Vakcinacija";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a Date to "YYYY-MM-DD".
 *
 * @param {Date|string|null} date
 * @returns {string|null}
 */
function fmt(date) {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0];
}

/**
 * Returns the number of whole days between two dates.
 *
 * @param {Date} from
 * @param {Date} to
 * @returns {number}
 */
function daysBetween(from, to) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(_request) {
  try {
    const today      = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // ── Step 1: find pet IDs vaccinated within the last year ───────────────
    //
    // Prisma translates this to a query with a nested EXISTS subquery that
    // checks for at least one VisitService linking to the vaccination Service.
    // distinct: ['petId'] removes duplicates (a pet may have multiple visits).
    //
    const recentlyVaccinated = await prisma.visit.findMany({
      where: {
        date: { gte: oneYearAgo },
        services: {
          some: {
            service: { name: VACCINATION_SERVICE_NAME },
          },
        },
      },
      select:   { petId: true },
      distinct: ["petId"],
    });

    const recentlyVaccinatedIds = recentlyVaccinated.map((r) => r.petId);

    // ── Step 2: fetch all other pets with their last vaccination date ───────
    //
    // The nested `visits` include is filtered to return only vaccination visits
    // (same EXISTS check), ordered newest first and limited to 1 row — giving
    // the date of the pet's most recent vaccination without loading all visits.
    //
    const pets = await prisma.pet.findMany({
      where: {
        id: { notIn: recentlyVaccinatedIds },
      },
      include: {
        owner: {
          select: {
            firstName: true,
            lastName:  true,
            phone:     true,
            email:     true,
          },
        },
        visits: {
          where: {
            services: {
              some: {
                service: { name: VACCINATION_SERVICE_NAME },
              },
            },
          },
          orderBy: { date: "desc" },
          take:    1,
          select:  { date: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // ── Shape into DTOs ────────────────────────────────────────────────────

    const data = pets.map((pet) => {
      const lastVaccDate = pet.visits[0]?.date ?? null;
      const status = lastVaccDate ? "overdue" : "never";
      const daysSinceVaccination = lastVaccDate
        ? daysBetween(new Date(lastVaccDate), today)
        : null;

      return {
        id:                    pet.id,
        name:                  pet.name,
        species:               pet.species,
        breed:                 pet.breed,
        ownerFullName:         pet.owner
          ? `${pet.owner.firstName} ${pet.owner.lastName}`
          : null,
        ownerPhone:            pet.owner?.phone ?? null,
        ownerEmail:            pet.owner?.email ?? null,
        lastVaccinationDate:   fmt(lastVaccDate),
        daysSinceVaccination,
        status,
      };
    });

    return NextResponse.json(
      ResponseFactory.success(data, "Upcoming vaccinations retrieved"),
    );
  } catch (error) {
    console.error("[GET /api/reports/upcoming-vaccinations]", error);
    return NextResponse.json(
      ResponseFactory.error("Failed to fetch upcoming vaccinations"),
      { status: 500 },
    );
  }
}
