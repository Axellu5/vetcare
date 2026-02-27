/**
 * @fileoverview Authentication utilities — password hashing and JWT management.
 *
 * Provides four functions used throughout the auth system:
 *   - hashPassword    — bcrypt hash for storing passwords securely
 *   - comparePassword — bcrypt compare for login verification
 *   - generateToken   — signs a JWT payload with user id/email/role
 *   - verifyToken     — verifies and decodes a JWT, returns null on failure
 *
 * JWT_SECRET must be set in process.env. Tokens expire in 24 hours.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/** Number of bcrypt salt rounds. 12 is a good balance of security and speed. */
const SALT_ROUNDS = 12;

/** Token lifetime — 24 hours expressed as a jsonwebtoken expiresIn string. */
const TOKEN_EXPIRY = "24h";

/**
 * Hashes a plain-text password using bcrypt.
 *
 * @param {string} password - The plain-text password to hash.
 * @returns {Promise<string>} The bcrypt hash string, safe to store in the DB.
 *
 * @example
 * const hash = await hashPassword("secret123");
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain-text password against a stored bcrypt hash.
 *
 * @param {string} password - The plain-text password from the login form.
 * @param {string} hash     - The bcrypt hash stored in the database.
 * @returns {Promise<boolean>} True if the password matches, false otherwise.
 *
 * @example
 * const valid = await comparePassword("secret123", user.password);
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a signed JWT containing the user's id, email, and role.
 *
 * @param {{ id: number, email: string, role: string }} user - User data to embed.
 * @returns {string} A signed JWT string valid for 24 hours.
 * @throws {Error} If JWT_SECRET is not set in process.env.
 *
 * @example
 * const token = generateToken({ id: 1, email: "admin@vet.lt", role: "admin" });
 */
export function generateToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined in environment variables");

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Verifies a JWT and returns its decoded payload.
 * Returns null instead of throwing so callers can handle invalid tokens gracefully.
 *
 * @param {string} token - The JWT string to verify.
 * @returns {{ id: number, email: string, role: string, iat: number, exp: number } | null}
 *   Decoded payload if valid, or null if the token is missing, expired, or tampered.
 *
 * @example
 * const user = verifyToken(token);
 * if (!user) return unauthorizedResponse();
 */
export function verifyToken(token) {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined in environment variables");
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}
