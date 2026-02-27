/**
 * @fileoverview GET /api/auth/me — returns the currently authenticated user.
 *
 * Protected route: requires a valid JWT in the Authorization header.
 * Fetches fresh user data from the database using the id decoded from the token,
 * so the response always reflects the current DB state rather than stale token data.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/middleware/authMiddleware";

/**
 * Handles GET /api/auth/me.
 *
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 *   200 { success: true,  user: { id, email, name, role, createdAt } }
 *   401 { success: false, error: "..." }         — missing/invalid token
 *   404 { success: false, error: "User not found" }
 *   500 { success: false, error: "Internal server error" }
 */
export async function GET(request) {
  try {
    const auth = await authenticate(request);
    if (!auth.success) return auth.response;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("[GET /api/auth/me]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
