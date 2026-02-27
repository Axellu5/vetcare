/**
 * GET    /api/pets/[id] — get pet by id (with owner + visits)
 * PUT    /api/pets/[id] — update pet
 * DELETE /api/pets/[id] — delete pet
 *
 * Patterns used: Singleton, Template Method (PetService), Adapter, Factory
 */

import { NextResponse } from "next/server";
import { PetService } from "@/lib/patterns/templateMethod";
import { ResponseFactory } from "@/lib/patterns/responseFactory";
import { PetAdapter } from "@/lib/patterns/adapter";
import prisma from "@/lib/prisma";

const petService = new PetService();

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id, 10);

    // Include visits in addition to owner for the detail view
    const pet = await prisma.pet.findUnique({
      where: { id },
      include: {
        owner: true,
        visits: {
          orderBy: { date: "desc" },
          include: { vet: true, services: { include: { service: true } } },
        },
      },
    });

    if (!pet) {
      return NextResponse.json(ResponseFactory.notFound("Pet"), { status: 404 });
    }

    return NextResponse.json(ResponseFactory.success(PetAdapter.toDTO(pet)));
  } catch (error) {
    console.error("[GET /api/pets/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to fetch pet"), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id   = parseInt(params.id, 10);
    const body = await request.json();
    const dto  = await petService.update(id, body);
    return NextResponse.json(ResponseFactory.success(dto, "Pet updated successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Pet"), { status: 404 });
    }
    const isValidation = error.message?.includes("required") || error.message?.includes("valid");
    if (isValidation) {
      return NextResponse.json(ResponseFactory.error(error.message, 400), { status: 400 });
    }
    console.error("[PUT /api/pets/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to update pet"), { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id     = parseInt(params.id, 10);
    const result = await petService.delete(id);
    return NextResponse.json(ResponseFactory.success(result, "Pet deleted successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Pet"), { status: 404 });
    }
    console.error("[DELETE /api/pets/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to delete pet"), { status: 500 });
  }
}
