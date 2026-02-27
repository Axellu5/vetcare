/**
 * GET    /api/vets/[id] — get vet by id (with visits)
 * PUT    /api/vets/[id] — update vet
 * DELETE /api/vets/[id] — delete vet
 *
 * Patterns used: Singleton (prisma), Factory (ResponseFactory)
 */

import { NextResponse } from "next/server";
import { ResponseFactory } from "@/lib/patterns/responseFactory";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id, 10);

    const vet = await prisma.vet.findUnique({
      where: { id },
      include: {
        visits: {
          orderBy: { date: "desc" },
          take: 20,
          include: { pet: true },
        },
      },
    });

    if (!vet) {
      return NextResponse.json(ResponseFactory.notFound("Vet"), { status: 404 });
    }

    return NextResponse.json(ResponseFactory.success(vet));
  } catch (error) {
    console.error("[GET /api/vets/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to fetch vet"), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id  = parseInt(params.id, 10);
    const { firstName, lastName, specialty, phone, email } = await request.json();

    const vet = await prisma.vet.update({
      where: { id },
      data: {
        ...(firstName  !== undefined && { firstName }),
        ...(lastName   !== undefined && { lastName }),
        ...(specialty  !== undefined && { specialty }),
        ...(phone      !== undefined && { phone }),
        ...(email      !== undefined && { email }),
      },
    });

    return NextResponse.json(ResponseFactory.success(vet, "Vet updated successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Vet"), { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        ResponseFactory.error("A vet with that email already exists", 409),
        { status: 409 }
      );
    }
    console.error("[PUT /api/vets/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to update vet"), { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    await prisma.vet.delete({ where: { id } });
    return NextResponse.json(ResponseFactory.success({ id }, "Vet deleted successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Vet"), { status: 404 });
    }
    console.error("[DELETE /api/vets/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to delete vet"), { status: 500 });
  }
}
