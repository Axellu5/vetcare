/**
 * @fileoverview POST /api/auth/login — authenticates a user and returns a JWT.
 *
 * Accepts { email, password } in the request body.
 * Looks up the user by email, verifies the password with bcrypt,
 * and returns a signed JWT together with basic user info on success.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, generateToken } from "@/lib/auth";

/**
 * Handles POST /api/auth/login.
 *
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 *   200 { success: true,  token, user: { id, email, name, role } }
 *   400 { success: false, error: "Email and password are required" }
 *   401 { success: false, error: "Invalid email or password" }
 *   500 { success: false, error: "Internal server error" }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password against stored bcrypt hash
    const valid = await comparePassword(password, user.password);

    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = generateToken(user);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
