/**
 * @fileoverview Unit tests for authentication utilities (lib/auth.js).
 * Tests bcrypt password hashing, comparison, JWT token generation and verification.
 */

import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
} from "@/lib/auth.js";

describe("Auth Utilities — lib/auth.js", () => {
  const TEST_SECRET = "test_secret_key_for_jest";
  const testUser = { id: 1, email: "admin@vetcare.lt", role: "admin" };

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  // ── hashPassword ──────────────────────────────────────────────────────────

  describe("hashPassword()", () => {
    test("returns a non-empty string", async () => {
      const hash = await hashPassword("secret123");
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    test("produces a bcrypt hash (starts with $2b$)", async () => {
      const hash = await hashPassword("secret123");
      expect(hash).toContain("$2b$");
    });

    test("two calls with the same password produce different hashes (salting)", async () => {
      const hash1 = await hashPassword("samePassword");
      const hash2 = await hashPassword("samePassword");
      expect(hash1).not.toBe(hash2);
    });

    test("result is truthy", async () => {
      const hash = await hashPassword("any");
      expect(hash).toBeTruthy();
    });
  });

  // ── comparePassword ───────────────────────────────────────────────────────

  describe("comparePassword()", () => {
    let hash;

    beforeAll(async () => {
      hash = await hashPassword("mySecurePass");
    });

    test("returns true for a matching password", async () => {
      const result = await comparePassword("mySecurePass", hash);
      expect(result).toBe(true);
    });

    test("returns false for a wrong password", async () => {
      const result = await comparePassword("wrongPass", hash);
      expect(result).toBe(false);
    });

    test("returns false for an empty string", async () => {
      const result = await comparePassword("", hash);
      expect(result).toBeFalsy();
    });

    it("is case-sensitive (different capitalisation is a mismatch)", async () => {
      const result = await comparePassword("MySECUREpass", hash);
      expect(result).toBe(false);
    });
  });

  // ── generateToken ─────────────────────────────────────────────────────────

  describe("generateToken()", () => {
    let token;

    beforeAll(() => {
      token = generateToken(testUser);
    });

    test("returns a string", () => {
      expect(typeof token).toBe("string");
    });

    test("JWT consists of three dot-separated parts", () => {
      const parts = token.split(".");
      expect(parts).toHaveLength(3);
    });

    test("token is truthy", () => {
      expect(token).toBeTruthy();
    });

    test("throws when JWT_SECRET is not set", () => {
      const saved = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      expect(() => generateToken(testUser)).toThrow("JWT_SECRET");
      process.env.JWT_SECRET = saved;
    });
  });

  // ── verifyToken ───────────────────────────────────────────────────────────

  describe("verifyToken()", () => {
    let token;

    beforeAll(() => {
      token = generateToken(testUser);
    });

    test("returns a decoded payload for a valid token", () => {
      const payload = verifyToken(token);
      expect(payload).toBeTruthy();
    });

    test("decoded payload contains user id", () => {
      const payload = verifyToken(token);
      expect(payload.id).toBe(testUser.id);
    });

    test("decoded payload contains user email", () => {
      const payload = verifyToken(token);
      expect(payload.email).toBe(testUser.email);
    });

    test("decoded payload contains user role", () => {
      const payload = verifyToken(token);
      expect(payload.role).toBe(testUser.role);
    });

    test("decoded payload has iat and exp fields", () => {
      const payload = verifyToken(token);
      expect(typeof payload.iat).toBe("number");
      expect(typeof payload.exp).toBe("number");
    });

    test("exp is approximately 24 hours after iat", () => {
      const payload = verifyToken(token);
      const diffHours = (payload.exp - payload.iat) / 3600;
      expect(diffHours).toBe(24);
    });

    test("returns null for a garbage string", () => {
      const result = verifyToken("not.a.token");
      expect(result).toBeNull();
    });

    test("returns null for an empty string", () => {
      expect(verifyToken("")).toBeNull();
    });

    test("returns null when JWT_SECRET is missing at verify time", () => {
      const saved = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      const result = verifyToken(token);
      expect(result).toBeNull();
      process.env.JWT_SECRET = saved;
    });

    it("returns null for a token signed with a different secret", () => {
      const wrongToken = generateToken(testUser); // current secret
      const saved = process.env.JWT_SECRET;
      process.env.JWT_SECRET = "completely_different_secret";
      const result = verifyToken(wrongToken);
      expect(result).toBeNull();
      process.env.JWT_SECRET = saved;
    });
  });
});
