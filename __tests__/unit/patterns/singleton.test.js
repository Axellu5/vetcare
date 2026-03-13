/**
 * @fileoverview Unit tests for the Singleton pattern (lib/prisma.js).
 * Verifies that only one PrismaClient instance is created per process
 * in development/test mode, while production always creates a fresh instance.
 */

// Mock @prisma/client so no real DB connection is opened
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({ _isMock: true })),
}));

describe("Singleton Pattern — Prisma Client (lib/prisma.js)", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Clear cached module and globalThis singleton before each test
    delete globalThis.__prisma;
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete globalThis.__prisma;
  });

  test("exports a truthy Prisma client instance", () => {
    const { default: prisma } = require("../../../lib/prisma.js");
    expect(prisma).toBeTruthy();
  });

  test("exported instance is an object", () => {
    const { default: prisma } = require("../../../lib/prisma.js");
    expect(typeof prisma).toBe("object");
  });

  test("stores instance on globalThis.__prisma in development mode", () => {
    process.env.NODE_ENV = "development";
    require("../../../lib/prisma.js");
    expect(globalThis.__prisma).toBeTruthy();
  });

  test("returns the same instance on repeated requires in dev mode", () => {
    process.env.NODE_ENV = "development";
    const first = require("../../../lib/prisma.js").default;
    // Reset module cache — but globalThis.__prisma persists
    jest.resetModules();
    const second = require("../../../lib/prisma.js").default;
    expect(first).toBe(second);
  });

  test("does NOT store instance on globalThis in production mode", () => {
    process.env.NODE_ENV = "production";
    require("../../../lib/prisma.js");
    expect(globalThis.__prisma).toBeUndefined();
  });

  test("mock PrismaClient has the expected shape", () => {
    const { default: prisma } = require("../../../lib/prisma.js");
    expect(prisma).toEqual({ _isMock: true });
  });
});
