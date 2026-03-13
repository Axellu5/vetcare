/**
 * @fileoverview Unit tests for the Template Method pattern (lib/patterns/templateMethod.js).
 * Tests abstract class enforcement, validation hooks, and input transformation
 * in each concrete service, using a mocked Prisma client.
 */

// Mock Prisma before any module imports — mock is hoisted by babel-jest
jest.mock("@/lib/prisma.js", () => ({
  __esModule: true,
  default: {
    owner: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    pet: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    visit: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    appointment: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    visitService: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

import {
  BaseCrudService,
  OwnerService,
  PetService,
  VisitService,
  AppointmentService,
} from "@/lib/patterns/templateMethod.js";
import prisma from "@/lib/prisma.js";

describe("Template Method Pattern — BaseCrudService", () => {
  // ── Abstract class enforcement ────────────────────────────────────────────

  describe("BaseCrudService (abstract)", () => {
    test("cannot be instantiated directly", () => {
      expect(() => new BaseCrudService()).toThrow(
        "BaseCrudService is abstract and cannot be instantiated directly"
      );
    });

    test("buildWhere() throws when not overridden", () => {
      // Create a minimal concrete subclass that doesn't override buildWhere
      class Broken extends BaseCrudService {
        constructor() { super(); this.model = {}; }
        transformOne(r) { return r; }
        transformMany(r) { return r; }
      }
      expect(() => new Broken().buildWhere({})).toThrow("is not implemented");
    });

    test("transformOne() throws when not overridden", () => {
      class Broken extends BaseCrudService {
        constructor() { super(); this.model = {}; }
        buildWhere() { return {}; }
        transformMany(r) { return r; }
      }
      expect(() => new Broken().transformOne({})).toThrow("is not implemented");
    });

    test("transformMany() throws when not overridden", () => {
      class Broken extends BaseCrudService {
        constructor() { super(); this.model = {}; }
        buildWhere() { return {}; }
        transformOne(r) { return r; }
      }
      expect(() => new Broken().transformMany([])).toThrow("is not implemented");
    });
  });
});

describe("Template Method Pattern — OwnerService", () => {
  let service;

  beforeAll(() => {
    service = new OwnerService();
  });

  test("validate() throws when firstName is an empty string", () => {
    expect(() => service.validate({ firstName: "" })).toThrow("firstName is required");
  });

  test("validate() throws when firstName is only whitespace", () => {
    expect(() => service.validate({ firstName: "   " })).toThrow("firstName is required");
  });

  test("validate() throws when lastName is an empty string", () => {
    expect(() => service.validate({ lastName: "" })).toThrow("lastName is required");
  });

  test("validate() throws when email lacks '@'", () => {
    expect(() => service.validate({ email: "notanemail" })).toThrow("valid email");
  });

  test("validate() does not throw for valid data", () => {
    expect(() =>
      service.validate({ firstName: "Jonas", lastName: "Jonaitis", email: "j@j.lt" })
    ).not.toThrow();
  });

  test("getInclude() returns pets: true", () => {
    expect(service.getInclude()).toEqual({ pets: true });
  });

  test("findAll() calls prisma.owner.findMany", async () => {
    prisma.owner.findMany.mockResolvedValueOnce([]);
    await service.findAll({});
    expect(prisma.owner.findMany).toHaveBeenCalled();
  });
});

describe("Template Method Pattern — PetService", () => {
  let service;

  beforeAll(() => {
    service = new PetService();
  });

  test("validate() throws when name is empty", () => {
    expect(() => service.validate({ name: "" })).toThrow("Pet name is required");
  });

  test("validate() throws when ownerId is not numeric", () => {
    expect(() => service.validate({ ownerId: "abc" })).toThrow("valid ownerId");
  });

  test("validate() does not throw for valid data", () => {
    expect(() => service.validate({ name: "Reksas", ownerId: 1 })).not.toThrow();
  });

  test("transformInput() casts ownerId to Number", () => {
    const result = service.transformInput({ name: "Rex", ownerId: "5" });
    expect(result.ownerId).toBe(5);
  });

  test("transformInput() converts birthDate string to Date", () => {
    const result = service.transformInput({ birthDate: "2020-06-01" });
    expect(result.birthDate instanceof Date).toBe(true);
  });

  test("getInclude() returns owner: true", () => {
    expect(service.getInclude()).toEqual({ owner: true });
  });
});

describe("Template Method Pattern — VisitService", () => {
  let service;

  beforeAll(() => {
    service = new VisitService();
  });

  test("validate() throws when diagnosis is empty", () => {
    expect(() => service.validate({ diagnosis: "" })).toThrow("Diagnosis is required");
  });

  test("validate() throws when petId is not numeric", () => {
    expect(() => service.validate({ petId: "abc" })).toThrow("valid petId");
  });

  test("validate() throws when vetId is not numeric", () => {
    expect(() => service.validate({ vetId: "xyz" })).toThrow("valid vetId");
  });

  test("validate() does not throw for valid data", () => {
    expect(() =>
      service.validate({ diagnosis: "Flu", petId: 1, vetId: 2 })
    ).not.toThrow();
  });

  test("transformInput() casts petId and vetId to Number", () => {
    const result = service.transformInput({ petId: "3", vetId: "7" });
    expect(result.petId).toBe(3);
    expect(result.vetId).toBe(7);
  });

  test("getInclude() includes pet with owner, vet, and services", () => {
    const include = service.getInclude();
    expect(include).toHaveProperty("pet");
    expect(include).toHaveProperty("vet");
    expect(include).toHaveProperty("services");
  });
});

describe("Template Method Pattern — AppointmentService", () => {
  let service;

  beforeAll(() => {
    service = new AppointmentService();
  });

  test("validate() throws for an invalid timeSlot", () => {
    expect(() => service.validate({ timeSlot: "08:00" })).toThrow("timeSlot must be");
  });

  test("validate() accepts all nine valid time slots", () => {
    const validSlots = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
    validSlots.forEach((slot) => {
      expect(() => service.validate({ timeSlot: slot })).not.toThrow();
    });
  });

  test("validate() throws for non-numeric petId", () => {
    expect(() => service.validate({ petId: "bad" })).toThrow("valid petId");
  });

  test("validate() throws for non-numeric ownerId", () => {
    expect(() => service.validate({ ownerId: "bad" })).toThrow("valid ownerId");
  });

  test("transformInput() casts petId, vetId, ownerId to Number", () => {
    const result = service.transformInput({ petId: "1", vetId: "2", ownerId: "3" });
    expect(result.petId).toBe(1);
    expect(result.vetId).toBe(2);
    expect(result.ownerId).toBe(3);
  });

  test("getInclude() includes pet, vet, and owner", () => {
    const include = service.getInclude();
    expect(include).toEqual({ pet: true, vet: true, owner: true });
  });
});

// ── Template method CRUD operations (OwnerService) ───────────────────────────

describe("Template Method Pattern — CRUD operations via OwnerService", () => {
  const mockOwner = {
    id: 1,
    firstName: "Jonas",
    lastName: "Jonaitis",
    phone: "+37060000001",
    email: "j@j.lt",
    address: "Gedimino 1",
    createdAt: new Date("2025-01-01"),
    pets: [],
  };

  let service;

  beforeAll(() => {
    service = new OwnerService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("findAll() returns transformed DTO list", async () => {
    prisma.owner.findMany.mockResolvedValueOnce([mockOwner]);
    const result = await service.findAll({});
    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe("Jonas Jonaitis");
  });

  test("findAll() calls prisma.owner.findMany with where clause", async () => {
    prisma.owner.findMany.mockResolvedValueOnce([]);
    await service.findAll({});
    expect(prisma.owner.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
  });

  test("findById() returns a DTO when the record exists", async () => {
    prisma.owner.findUnique.mockResolvedValueOnce(mockOwner);
    const result = await service.findById(1);
    expect(result).toBeTruthy();
    expect(result.fullName).toBe("Jonas Jonaitis");
  });

  test("findById() returns null when no record found", async () => {
    prisma.owner.findUnique.mockResolvedValueOnce(null);
    const result = await service.findById(999);
    expect(result).toBeNull();
  });

  test("create() calls prisma.owner.create and returns DTO", async () => {
    prisma.owner.create.mockResolvedValueOnce(mockOwner);
    const result = await service.create({
      firstName: "Jonas",
      lastName: "Jonaitis",
      email: "j@j.lt",
    });
    expect(result.fullName).toBe("Jonas Jonaitis");
    expect(prisma.owner.create).toHaveBeenCalledTimes(1);
  });

  test("create() aborts and throws when validation fails (no DB call)", async () => {
    await expect(
      service.create({ firstName: "", lastName: "X", email: "x@x.lt" })
    ).rejects.toThrow("firstName is required");
    expect(prisma.owner.create).not.toHaveBeenCalled();
  });

  test("update() calls prisma.owner.update and returns DTO", async () => {
    prisma.owner.update.mockResolvedValueOnce({ ...mockOwner, firstName: "Updated" });
    const result = await service.update(1, { firstName: "Updated" });
    expect(result.fullName).toContain("Updated");
    expect(prisma.owner.update).toHaveBeenCalledTimes(1);
  });

  test("delete() calls prisma.owner.delete and returns { id }", async () => {
    prisma.owner.delete.mockResolvedValueOnce({});
    const result = await service.delete(1);
    expect(result).toEqual({ id: 1 });
    expect(prisma.owner.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

// ── VisitService.beforeDelete ─────────────────────────────────────────────────

describe("Template Method Pattern — VisitService.beforeDelete()", () => {
  let service;

  beforeAll(() => {
    service = new VisitService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calls prisma.visitService.deleteMany with correct visitId", async () => {
    prisma.visitService.deleteMany.mockResolvedValueOnce({ count: 2 });
    await service.beforeDelete(5);
    expect(prisma.visitService.deleteMany).toHaveBeenCalledWith({
      where: { visitId: 5 },
    });
  });

  test("resolves without throwing for a valid visitId", async () => {
    prisma.visitService.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.beforeDelete(10)).resolves.not.toThrow();
  });
});

// ── AppointmentService.beforeDelete ──────────────────────────────────────────

describe("Template Method Pattern — AppointmentService.beforeDelete()", () => {
  let service;

  beforeAll(() => {
    service = new AppointmentService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("throws when appointment status is 'scheduled'", async () => {
    prisma.appointment.findUnique.mockResolvedValueOnce({ id: 1, status: "scheduled" });
    await expect(service.beforeDelete(1)).rejects.toThrow(
      "Cannot delete a scheduled appointment"
    );
  });

  test("resolves without throwing when appointment is 'completed'", async () => {
    prisma.appointment.findUnique.mockResolvedValueOnce({ id: 2, status: "completed" });
    await expect(service.beforeDelete(2)).resolves.not.toThrow();
  });

  test("resolves without throwing when appointment is 'cancelled'", async () => {
    prisma.appointment.findUnique.mockResolvedValueOnce({ id: 3, status: "cancelled" });
    await expect(service.beforeDelete(3)).resolves.not.toThrow();
  });

  test("resolves without throwing when appointment is not found (null)", async () => {
    prisma.appointment.findUnique.mockResolvedValueOnce(null);
    await expect(service.beforeDelete(999)).resolves.not.toThrow();
  });
});
