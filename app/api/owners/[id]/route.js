/**
 * GET    /api/owners/[id] — get owner by id (with pets)
 * PUT    /api/owners/[id] — update owner
 * DELETE /api/owners/[id] — delete owner
 *
 * Patterns used: Singleton, Template Method (OwnerService), Adapter, Factory
 */

import { NextResponse } from "next/server";
import { OwnerService } from "@/lib/patterns/templateMethod";
import { ResponseFactory } from "@/lib/patterns/responseFactory";

const ownerService = new OwnerService();

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    const dto = await ownerService.findById(id);
    if (!dto) {
      return NextResponse.json(ResponseFactory.notFound("Owner"), { status: 404 });
    }
    return NextResponse.json(ResponseFactory.success(dto));
  } catch (error) {
    console.error("[GET /api/owners/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to fetch owner"), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id  = parseInt(params.id, 10);
    const body = await request.json();
    const dto  = await ownerService.update(id, body);
    return NextResponse.json(ResponseFactory.success(dto, "Owner updated successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Owner"), { status: 404 });
    }
    const isValidation = error.message?.includes("required") || error.message?.includes("valid");
    if (isValidation) {
      return NextResponse.json(ResponseFactory.error(error.message, 400), { status: 400 });
    }
    console.error("[PUT /api/owners/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to update owner"), { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    const result = await ownerService.delete(id);
    return NextResponse.json(ResponseFactory.success(result, "Owner deleted successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Owner"), { status: 404 });
    }
    console.error("[DELETE /api/owners/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to delete owner"), { status: 500 });
  }
}
