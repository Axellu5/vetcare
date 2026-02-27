/**
 * GET    /api/visits/[id] — get visit by id (with pet, vet, services)
 * PUT    /api/visits/[id] — update visit
 * DELETE /api/visits/[id] — delete visit
 *
 * Patterns used: Singleton, Template Method (VisitService), Adapter, Factory
 */

import { NextResponse } from "next/server";
import { VisitService } from "@/lib/patterns/templateMethod";
import { ResponseFactory } from "@/lib/patterns/responseFactory";

const visitService = new VisitService();

export async function GET(request, { params }) {
  try {
    const id  = parseInt(params.id, 10);
    const dto = await visitService.findById(id);
    if (!dto) {
      return NextResponse.json(ResponseFactory.notFound("Visit"), { status: 404 });
    }
    return NextResponse.json(ResponseFactory.success(dto));
  } catch (error) {
    console.error("[GET /api/visits/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to fetch visit"), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id   = parseInt(params.id, 10);
    const body = await request.json();
    const dto  = await visitService.update(id, body);
    return NextResponse.json(ResponseFactory.success(dto, "Visit updated successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Visit"), { status: 404 });
    }
    const isValidation = error.message?.includes("required") || error.message?.includes("valid");
    if (isValidation) {
      return NextResponse.json(ResponseFactory.error(error.message, 400), { status: 400 });
    }
    console.error("[PUT /api/visits/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to update visit"), { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id     = parseInt(params.id, 10);
    const result = await visitService.delete(id);
    return NextResponse.json(ResponseFactory.success(result, "Visit deleted successfully"));
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(ResponseFactory.notFound("Visit"), { status: 404 });
    }
    console.error("[DELETE /api/visits/:id]", error);
    return NextResponse.json(ResponseFactory.error("Failed to delete visit"), { status: 500 });
  }
}
