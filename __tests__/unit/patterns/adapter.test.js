/**
 * @fileoverview Unit tests for the Adapter pattern (lib/patterns/adapter.js).
 * Tests DTO conversion: computed fields, formatted dates, flattened relations,
 * aggregated totals, and null-safety for optional relations.
 */

import {
  OwnerAdapter,
  PetAdapter,
  VisitAdapter,
  AppointmentAdapter,
} from "@/lib/patterns/adapter.js";

// ── Shared fixture factories ──────────────────────────────────────────────────

function makeOwner(overrides = {}) {
  return {
    id: 1,
    firstName: "Jonas",
    lastName: "Jonaitis",
    phone: "+37060000001",
    email: "jonas@test.lt",
    address: "Gedimino 1, Vilnius",
    createdAt: new Date("2025-01-15T00:00:00Z"),
    pets: [{ id: 10 }, { id: 11 }],
    ...overrides,
  };
}

function makePet(overrides = {}) {
  return {
    id: 3,
    name: "Reksas",
    species: "Šuo",
    breed: "Labrador",
    birthDate: new Date("2020-06-01T00:00:00Z"),
    gender: "Male",
    ownerId: 1,
    owner: { firstName: "Jonas", lastName: "Jonaitis" },
    createdAt: new Date("2025-02-01T00:00:00Z"),
    ...overrides,
  };
}

function makeVisit(overrides = {}) {
  return {
    id: 10,
    date: new Date("2025-03-10T00:00:00Z"),
    diagnosis: "Flu",
    notes: "Give antibiotics",
    petId: 3,
    vetId: 2,
    pet: { name: "Reksas", owner: { firstName: "Jonas", lastName: "Jonaitis" } },
    vet: { firstName: "Ona", lastName: "Onaite" },
    services: [
      { id: 1, notes: null, service: { id: 2, name: "Vaccination", price: 30 } },
      { id: 2, notes: "Extra", service: { id: 3, name: "Checkup", price: 15 } },
    ],
    createdAt: new Date("2025-03-10T00:00:00Z"),
    ...overrides,
  };
}

function makeAppointment(overrides = {}) {
  return {
    id: 7,
    date: new Date("2025-04-01T00:00:00Z"),
    timeSlot: "10:00",
    status: "scheduled",
    notes: null,
    petId: 3,
    vetId: 2,
    ownerId: 1,
    pet: { name: "Reksas" },
    vet: { firstName: "Ona", lastName: "Onaite" },
    owner: { firstName: "Jonas", lastName: "Jonaitis" },
    createdAt: new Date("2025-03-15T00:00:00Z"),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("Adapter Pattern — DTO Converters", () => {
  // ── OwnerAdapter ────────────────────────────────────────────────────────

  describe("OwnerAdapter", () => {
    let dto;

    beforeAll(() => {
      dto = OwnerAdapter.toDTO(makeOwner());
    });

    test("combines firstName and lastName into fullName", () => {
      expect(dto.fullName).toBe("Jonas Jonaitis");
    });

    test("counts pets from the included array", () => {
      expect(dto.petCount).toBe(2);
    });

    test("formats createdAt as YYYY-MM-DD", () => {
      expect(dto.createdAt).toBe("2025-01-15");
    });

    test("preserves original id, phone, email, address", () => {
      expect(dto.id).toBe(1);
      expect(dto.phone).toBe("+37060000001");
      expect(dto.email).toBe("jonas@test.lt");
    });

    test("petCount is 0 when pets array is empty", () => {
      const d = OwnerAdapter.toDTO(makeOwner({ pets: [] }));
      expect(d.petCount).toBe(0);
    });

    test("petCount is 0 when pets relation is absent", () => {
      const d = OwnerAdapter.toDTO(makeOwner({ pets: undefined }));
      expect(d.petCount).toBe(0);
    });

    test("toDTOList converts every element", () => {
      const list = OwnerAdapter.toDTOList([makeOwner(), makeOwner({ id: 2 })]);
      expect(list).toHaveLength(2);
      expect(list[0].fullName).toBe("Jonas Jonaitis");
    });
  });

  // ── PetAdapter ──────────────────────────────────────────────────────────

  describe("PetAdapter", () => {
    let dto;

    beforeAll(() => {
      dto = PetAdapter.toDTO(makePet());
    });

    test("formats birthDate as YYYY-MM-DD", () => {
      expect(dto.birthDate).toBe("2020-06-01");
    });

    test("computes a non-negative age from birthDate", () => {
      expect(typeof dto.age).toBe("number");
      expect(dto.age).toBeGreaterThanOrEqual(0);
    });

    test("builds ownerFullName from the included owner", () => {
      expect(dto.ownerFullName).toBe("Jonas Jonaitis");
    });

    test("ownerFullName is null when owner relation is absent", () => {
      const d = PetAdapter.toDTO(makePet({ owner: undefined }));
      expect(d.ownerFullName).toBeNull();
    });

    test("age is null when birthDate is absent", () => {
      const d = PetAdapter.toDTO(makePet({ birthDate: null }));
      expect(d.age).toBeNull();
    });

    test("preserves species, breed, gender, ownerId", () => {
      expect(dto.species).toBe("Šuo");
      expect(dto.breed).toBe("Labrador");
      expect(dto.gender).toBe("Male");
      expect(dto.ownerId).toBe(1);
    });

    test("toDTOList maps all pets", () => {
      const list = PetAdapter.toDTOList([makePet(), makePet({ id: 4 })]);
      expect(list).toHaveLength(2);
    });
  });

  // ── VisitAdapter ────────────────────────────────────────────────────────

  describe("VisitAdapter", () => {
    let dto;

    beforeAll(() => {
      dto = VisitAdapter.toDTO(makeVisit());
    });

    test("formats date as YYYY-MM-DD", () => {
      expect(dto.date).toBe("2025-03-10");
    });

    test("sums service prices into totalCost", () => {
      // 30 + 15 = 45
      expect(dto.totalCost).toBe(45);
    });

    test("services array has correct length", () => {
      expect(dto.services).toHaveLength(2);
    });

    test("maps service name and price", () => {
      expect(dto.services[0].name).toBe("Vaccination");
      expect(dto.services[0].price).toBe(30);
    });

    test("builds petName and ownerFullName from relations", () => {
      expect(dto.petName).toBe("Reksas");
      expect(dto.ownerFullName).toBe("Jonas Jonaitis");
    });

    test("builds vetFullName from vet relation", () => {
      expect(dto.vetFullName).toBe("Ona Onaite");
    });

    test("petName and ownerFullName are null when pet is absent", () => {
      const d = VisitAdapter.toDTO(makeVisit({ pet: undefined }));
      expect(d.petName).toBeNull();
      expect(d.ownerFullName).toBeNull();
    });

    test("totalCost is 0 when no services", () => {
      const d = VisitAdapter.toDTO(makeVisit({ services: [] }));
      expect(d.totalCost).toBe(0);
    });

    test("toDTOList maps all visits", () => {
      const list = VisitAdapter.toDTOList([makeVisit(), makeVisit({ id: 11 })]);
      expect(list).toHaveLength(2);
    });
  });

  // ── AppointmentAdapter ──────────────────────────────────────────────────

  describe("AppointmentAdapter", () => {
    let dto;

    beforeAll(() => {
      dto = AppointmentAdapter.toDTO(makeAppointment());
    });

    test("formats date as YYYY-MM-DD", () => {
      expect(dto.date).toBe("2025-04-01");
    });

    test("preserves timeSlot string", () => {
      expect(dto.timeSlot).toBe("10:00");
    });

    test("preserves status", () => {
      expect(dto.status).toBe("scheduled");
    });

    test("builds vetFullName from vet relation", () => {
      expect(dto.vetFullName).toBe("Ona Onaite");
    });

    test("builds ownerFullName from owner relation", () => {
      expect(dto.ownerFullName).toBe("Jonas Jonaitis");
    });

    test("petName is null when pet relation is absent", () => {
      const d = AppointmentAdapter.toDTO(makeAppointment({ pet: undefined }));
      expect(d.petName).toBeNull();
    });

    test("notes defaults to null when absent", () => {
      expect(dto.notes).toBeNull();
    });

    test("toDTOList maps all appointments", () => {
      const list = AppointmentAdapter.toDTOList([
        makeAppointment(),
        makeAppointment({ id: 8, timeSlot: "14:00" }),
      ]);
      expect(list).toHaveLength(2);
      expect(list[1].timeSlot).toBe("14:00");
    });
  });
});
