/**
 * @fileoverview Authentication middleware for Next.js App Router API routes.
 *
 * Exports a single function `authenticate` that extracts and validates a JWT
 * from the Authorization header. It is designed to be called at the top of
 * any protected route handler.
 *
 * Usage in a route:
 *   const auth = await authenticate(request);
 *   if (!auth.success) return auth.response;   // returns 401 NextResponse
 *   const user = auth.user;                    // { id, email, role }
 */

import { NextResponse } from "next/server";
import { verifyToken } from "../auth.js";

/**
 * Validates the JWT from the Authorization header of an incoming request.
 *
 * Expects the header value to be in "Bearer <token>" format.
 * Uses verifyToken() to decode and validate the token against JWT_SECRET.
 *
 * @param {Request} request - The incoming Next.js request object.
 * @returns {Promise<
 *   { success: true,  user: { id: number, email: string, role: string } } |
 *   { success: false, response: NextResponse }
 * >}
 *   On success: `{ success: true, user }` — the caller may proceed.
 *   On failure: `{ success: false, response }` — the caller must return `response` immediately.
 *
 * @example
 * export async function GET(request) {
 *   const auth = await authenticate(request);
 *   if (!auth.success) return auth.response;
 *   return NextResponse.json({ user: auth.user });
 * }
 */
export async function authenticate(request) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: "Authorization header missing or malformed" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7); // strip "Bearer "
  const user = verifyToken(token);

  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }

  return { success: true, user };
}
