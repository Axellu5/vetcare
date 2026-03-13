/**
 * @fileoverview Exception testing — verifies that invalid inputs produce
 * the expected errors or rejection values throughout the system.
 * Covers: email validation, pet ownerId validation, password comparison,
 * and JWT generation/verification error handling.
 */

// Prisma mock required for service instantiation (constructors assign this.model)
jest.mock("@/lib/prisma.js", () => ({
  __esModule: true,
  default: {
    owner:       { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    pet:         { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    visit:       { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    appointment: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    visitService: { deleteMany: jest.fn() },
  },
}));

import { OwnerService, PetService, VisitService, AppointmentService } from "@/lib/patterns/templateMethod.js";
import { hashPassword, comparePassword, generateToken, verifyToken } from "@/lib/auth.js";

describe("Exception Testing", () => {
  let ownerService;
  let petService;
  let visitService;
  let apptService;

  beforeAll(() => {
    process.env.JWT_SECRET = "test_jwt_secret_for_exceptions";
    ownerService    = new OwnerService();
    petService      = new PetService();
    visitService    = new VisitService();
    apptService     = new AppointmentService();
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  // ── Invalid email throws error ────────────────────────────────────────────

  describe("Invalid email throws error", () => {
    test("throws when email has no @ symbol", () => {
      expect(() => ownerService.validate({ email: "notanemail" }))
        .toThrow("valid email");
    });

    test("throws when email is an empty string", () => {
      expect(() => ownerService.validate({ email: "" }))
        .toThrow("valid email");
    });

    test("throws when email is whitespace only", () => {
      expect(() => ownerService.validate({ email: "   " }))
        .toThrow("valid email");
    });

    test("error is an instance of Error", () => {
      let caught;
      try {
        ownerService.validate({ email: "invalid" });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(Error);
    });

    test("error message contains the word 'email'", () => {
      let message = "";
      try {
        ownerService.validate({ email: "bademail" });
      } catch (err) {
        message = err.message;
      }
      expect(message.toLowerCase()).toContain("email");
    });

    test("does NOT throw for a valid email containing @", () => {
      expect(() => ownerService.validate({ email: "admin@vetcare.lt" }))
        .not.toThrow();
    });

    test("does NOT throw when email field is absent (undefined)", () => {
      // Validation only fires when email is explicitly provided
      expect(() => ownerService.validate({})).not.toThrow();
    });
  });

  // ── Invalid pet without ownerId throws error ──────────────────────────────

  describe("Invalid pet without ownerId throws error", () => {
    test("throws when ownerId is a non-numeric string", () => {
      expect(() => petService.validate({ ownerId: "abc" }))
        .toThrow("valid ownerId");
    });

    test("throws when ownerId is zero (falsy number)", () => {
      expect(() => petService.validate({ ownerId: 0 }))
        .toThrow("valid ownerId");
    });

    test("throws when ownerId is null", () => {
      expect(() => petService.validate({ ownerId: null }))
        .toThrow("valid ownerId");
    });

    test("throws when pet name is an empty string", () => {
      expect(() => petService.validate({ name: "" }))
        .toThrow("Pet name is required");
    });

    test("throws when pet name is whitespace only", () => {
      expect(() => petService.validate({ name: "   " }))
        .toThrow("Pet name is required");
    });

    test("error for missing ownerId is an instance of Error", () => {
      let caught;
      try {
        petService.validate({ ownerId: "notanumber" });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught.message).toContain("ownerId");
    });

    test("does NOT throw for valid pet data", () => {
      expect(() => petService.validate({ name: "Reksas", ownerId: 1 }))
        .not.toThrow();
    });

    test("does NOT throw when ownerId is a valid positive integer", () => {
      expect(() => petService.validate({ ownerId: 42 })).not.toThrow();
    });
  });

  // ── Wrong password returns false ──────────────────────────────────────────

  describe("Wrong password returns false (comparePassword)", () => {
    let correctHash;

    beforeAll(async () => {
      correctHash = await hashPassword("correctPassword123!");
    });

    test("returns false for a completely wrong password", async () => {
      const result = await comparePassword("wrongPassword", correctHash);
      expect(result).toBe(false);
    });

    test("returns false for an empty string", async () => {
      const result = await comparePassword("", correctHash);
      expect(result).toBeFalsy();
    });

    test("returns false for a case-modified password", async () => {
      const result = await comparePassword("CORRECTPASSWORD123!", correctHash);
      expect(result).toBe(false);
    });

    test("returns false for a partial match", async () => {
      const result = await comparePassword("correct", correctHash);
      expect(result).toBe(false);
    });

    test("returns false for a password with extra characters appended", async () => {
      const result = await comparePassword("correctPassword123!extra", correctHash);
      expect(result).toBe(false);
    });

    test("returns true for the exact correct password (control test)", async () => {
      const result = await comparePassword("correctPassword123!", correctHash);
      expect(result).toBe(true);
    });
  });

  // ── Invalid JWT — error handling ──────────────────────────────────────────

  describe("Invalid JWT — throws or returns null", () => {
    test("generateToken throws when JWT_SECRET is not set in env", () => {
      const saved = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      expect(() =>
        generateToken({ id: 1, email: "a@b.lt", role: "admin" })
      ).toThrow("JWT_SECRET");
      process.env.JWT_SECRET = saved;
    });

    test("generateToken error message mentions JWT_SECRET", () => {
      const saved = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      let message = "";
      try {
        generateToken({ id: 1, email: "a@b.lt", role: "admin" });
      } catch (err) {
        message = err.message;
      }
      expect(message).toContain("JWT_SECRET");
      process.env.JWT_SECRET = saved;
    });

    test("verifyToken returns null for a random garbage string", () => {
      expect(verifyToken("totally.not.a.jwt.token")).toBeNull();
    });

    test("verifyToken returns null for an empty string", () => {
      expect(verifyToken("")).toBeNull();
    });

    test("verifyToken returns null for a token signed with a different secret", () => {
      const saved = process.env.JWT_SECRET;
      const validToken = generateToken({ id: 1, email: "a@b.lt", role: "admin" });
      process.env.JWT_SECRET = "completely_different_secret_xyz";
      const result = verifyToken(validToken);
      expect(result).toBeNull();
      process.env.JWT_SECRET = saved;
    });

    test("verifyToken returns null when JWT_SECRET is absent at verify time", () => {
      const saved = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      expect(verifyToken("some.fake.token")).toBeNull();
      process.env.JWT_SECRET = saved;
    });

    test("verifyToken returns null — result is falsy for invalid input", () => {
      expect(verifyToken("bad")).toBeFalsy();
    });

    test("verifyToken returns truthy payload for a validly signed token", () => {
      const token = generateToken({ id: 7, email: "test@vet.lt", role: "admin" });
      expect(verifyToken(token)).toBeTruthy();
    });

    // Additional: other services validate their IDs and throw typed errors
    test("VisitService throws a typed Error for empty diagnosis", () => {
      let caught;
      try {
        visitService.validate({ diagnosis: "" });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught.message).toContain("Diagnosis");
    });

    test("AppointmentService throws for an invalid time slot", () => {
      expect(() => apptService.validate({ timeSlot: "08:30" }))
        .toThrow("timeSlot must be");
    });
  });
});
