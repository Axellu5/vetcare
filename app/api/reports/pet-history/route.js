/**
 * @fileoverview GET /api/reports/pet-history?petId=1
 *
 * Returns the complete medical history for a single pet, joining 5 tables
 * in one Prisma query:  Pet → Owner, Pet → Visit[] → VisitService[] → Service.
 *
 * Algorithm:
 *   A single prisma.pet.findUnique() with deeply-nested includes fetches all
 *   related data in one round-trip.  The raw Prisma result is then reshaped into
 *   a clean DTO:
 *     - pet fields + computed age
 *     - owner object (fullName, phone, email, address)
 *     - visits array sorted oldest → newest; each visit contains:
 *         - vet name, diagnosis, notes, formatted date
 *         - services array with name / price / category
 *         - totalCost  (sum of service prices for that visit)
 *     - aggregate summary: visitCount, totalSpent across all visits
 *
 * Query path (5 tables):
 *   Pet ──(ownerId)──► Owner
 *       ──(petId)───► Visit ──(visitId)──► VisitService ──(serviceId)──► Service
 *                          ──(vetId)────► Vet
 *
 * @param {Request} request
 * @returns {NextResponse} { success, data: PetHistoryDTO }
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ResponseFactory } from "@/lib/patterns/responseFactory";

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
 * Computes age in full years from a birth date.
 *
 * @param {Date|string|null} birthDate
 * @returns {number|null}
 */
function calcAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now   = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const petIdRaw = searchParams.get("petId");

    if (!petIdRaw) {
      return NextResponse.json(
        ResponseFactory.error("petId is required", 400),
        { status: 400 },
      );
    }

    const petId = Number(petIdRaw);
    if (!Number.isInteger(petId) || petId < 1) {
      return NextResponse.json(
        ResponseFactory.error("petId must be a positive integer", 400),
        { status: 400 },
      );
    }

    // ── Single query joining 5 tables ──────────────────────────────────────
    //
    // Prisma executes this as a series of efficient JOINs:
    //   1. Pet  (base record)
    //   2. Owner (via Pet.ownerId FK)
    //   3. Visit[] (all visits for this pet, ordered oldest → newest)
    //   4. Vet (for each visit, via Visit.vetId FK)
    //   5. VisitService[] → Service (services rendered in each visit)
    //
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: {
        // Table 2: Owner
        owner: {
          select: {
            id:        true,
            firstName: true,
            lastName:  true,
            phone:     true,
            email:     true,
            address:   true,
          },
        },
        // Table 3: Visit (all, oldest first)
        visits: {
          orderBy: { date: "asc" },
          include: {
            // Table 4: Vet
            vet: {
              select: { firstName: true, lastName: true, specialty: true },
            },
            // Table 5: VisitService → Service
            services: {
              include: {
                service: {
                  select: { name: true, price: true, category: true },
                },
              },
            },
          },
        },
      },
    });

    if (!pet) {
      return NextResponse.json(
        ResponseFactory.notFound("Pet"),
        { status: 404 },
      );
    }

    // ── Shape into DTO ─────────────────────────────────────────────────────

    const visitDTOs = pet.visits.map((v) => {
      const services = v.services.map((vs) => ({
        id:       vs.id,
        name:     vs.service?.name     ?? null,
        price:    vs.service?.price    ?? 0,
        category: vs.service?.category ?? null,
        notes:    vs.notes             ?? null,
      }));
      const totalCost = services.reduce((sum, s) => sum + s.price, 0);

      return {
        id:         v.id,
        date:       fmt(v.date),
        diagnosis:  v.diagnosis,
        notes:      v.notes ?? null,
        vetFullName: v.vet
          ? `${v.vet.firstName} ${v.vet.lastName}`
          : null,
        vetSpecialty: v.vet?.specialty ?? null,
        services,
        totalCost,
      };
    });

    const totalSpent = visitDTOs.reduce((sum, v) => sum + v.totalCost, 0);

    const dto = {
      id:        pet.id,
      name:      pet.name,
      species:   pet.species,
      breed:     pet.breed,
      gender:    pet.gender,
      birthDate: fmt(pet.birthDate),
      age:       calcAge(pet.birthDate),
      owner: pet.owner
        ? {
            id:       pet.owner.id,
            fullName: `${pet.owner.firstName} ${pet.owner.lastName}`,
            phone:    pet.owner.phone,
            email:    pet.owner.email,
            address:  pet.owner.address,
          }
        : null,
      visits:     visitDTOs,
      visitCount: visitDTOs.length,
      totalSpent,
    };

    return NextResponse.json(ResponseFactory.success(dto));
  } catch (error) {
    console.error("[GET /api/reports/pet-history]", error);
    return NextResponse.json(
      ResponseFactory.error("Failed to fetch pet history"),
      { status: 500 },
    );
  }
}
