/**
 * @fileoverview Adapter design pattern implementation for converting Prisma models to frontend DTOs.
 *
 * Adapter Pattern:
 * Converts the interface of a class into another interface that clients expect.
 * The Adapter lets classes work together that could not otherwise because of
 * incompatible interfaces.
 *
 * In this context, Prisma models (the "Adaptee") return raw database records with
 * relational IDs, raw DateTime objects, and split name fields. Frontend components
 * (the "Client") expect clean DTOs — formatted dates, computed fields like age or
 * fullName, flattened relation names, and calculated aggregates like total cost.
 *
 * Each Adapter class acts as the "Adapter" layer between these two incompatible
 * interfaces, so neither the DB layer nor the UI layer needs to know about the other.
 *
 * Structure:
 *   Prisma Model (Adaptee) → Adapter.toDTO() → DTO object (Target Interface)
 *
 * Benefits:
 * - DB schema changes only require updating the adapter, not every UI component
 * - Computed/derived fields (age, fullName, totalCost) are always consistent
 * - Keeps API route handlers and React components free of transformation logic
 */

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Formats a Date object or ISO string to "YYYY-MM-DD".
 *
 * @param {Date|string|null} date - The date to format.
 * @returns {string|null} Formatted date string, or null if input is falsy.
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

/**
 * Calculates age in years from a birth date.
 *
 * @param {Date|string|null} birthDate - The date of birth.
 * @returns {number|null} Age in full years, or null if birthDate is falsy.
 */
function calcAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

// ---------------------------------------------------------------------------
// OwnerAdapter
// ---------------------------------------------------------------------------

/**
 * @class OwnerAdapter
 * @description Adapts a Prisma Owner model (with optional pets relation) to a
 * frontend-friendly DTO. Combines firstName + lastName into fullName and
 * exposes petCount derived from the included pets array.
 *
 * Adaptee:  Prisma Owner { firstName, lastName, createdAt, pets: Pet[] }
 * Target:   OwnerDTO     { fullName, createdAt (formatted), petCount, ... }
 */
class OwnerAdapter {
  /**
   * Converts a single Prisma Owner record to an OwnerDTO.
   *
   * @param {object} owner - Raw Prisma Owner model instance.
   * @param {number} owner.id
   * @param {string} owner.firstName
   * @param {string} owner.lastName
   * @param {string} owner.phone
   * @param {string} owner.email
   * @param {string} owner.address
   * @param {Date}   owner.createdAt
   * @param {Array}  [owner.pets=[]] - Included pets relation (optional).
   * @returns {{
   *   id: number,
   *   fullName: string,
   *   firstName: string,
   *   lastName: string,
   *   phone: string,
   *   email: string,
   *   address: string,
   *   petCount: number,
   *   createdAt: string
   * }}
   *
   * @example
   * OwnerAdapter.toDTO({ id: 1, firstName: "John", lastName: "Doe", pets: [{}, {}], ... });
   * // → { id: 1, fullName: "John Doe", petCount: 2, createdAt: "2025-01-15", ... }
   */
  static toDTO(owner) {
    return {
      id: owner.id,
      fullName: `${owner.firstName} ${owner.lastName}`,
      firstName: owner.firstName,
      lastName: owner.lastName,
      phone: owner.phone,
      email: owner.email,
      address: owner.address,
      petCount: Array.isArray(owner.pets) ? owner.pets.length : 0,
      createdAt: formatDate(owner.createdAt),
    };
  }

  /**
   * Converts an array of Prisma Owner records to OwnerDTOs.
   *
   * @param {object[]} owners - Array of raw Prisma Owner model instances.
   * @returns {object[]} Array of OwnerDTOs.
   */
  static toDTOList(owners) {
    return owners.map((owner) => OwnerAdapter.toDTO(owner));
  }
}

// ---------------------------------------------------------------------------
// PetAdapter
// ---------------------------------------------------------------------------

/**
 * @class PetAdapter
 * @description Adapts a Prisma Pet model (with optional owner relation) to a
 * frontend-friendly DTO. Computes the pet's current age in years from birthDate
 * and flattens the owner's full name into a single field.
 *
 * Adaptee:  Prisma Pet { birthDate: DateTime, ownerId, owner: Owner }
 * Target:   PetDTO     { age: number, ownerFullName: string, birthDate (formatted) }
 */
class PetAdapter {
  /**
   * Converts a single Prisma Pet record to a PetDTO.
   *
   * @param {object}  pet - Raw Prisma Pet model instance.
   * @param {number}  pet.id
   * @param {string}  pet.name
   * @param {string}  pet.species
   * @param {string}  pet.breed
   * @param {Date}    pet.birthDate
   * @param {string}  pet.gender
   * @param {number}  pet.ownerId
   * @param {object}  [pet.owner] - Included owner relation (optional).
   * @param {Date}    pet.createdAt
   * @returns {{
   *   id: number,
   *   name: string,
   *   species: string,
   *   breed: string,
   *   birthDate: string,
   *   age: number|null,
   *   gender: string,
   *   ownerId: number,
   *   ownerFullName: string|null,
   *   createdAt: string
   * }}
   *
   * @example
   * PetAdapter.toDTO({ id: 3, name: "Rex", birthDate: new Date("2020-06-01"), owner: { firstName: "Jane", lastName: "Smith" }, ... });
   * // → { id: 3, name: "Rex", age: 5, ownerFullName: "Jane Smith", birthDate: "2020-06-01", ... }
   */
  static toDTO(pet) {
    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      birthDate: formatDate(pet.birthDate),
      age: calcAge(pet.birthDate),
      gender: pet.gender,
      ownerId: pet.ownerId,
      ownerFullName: pet.owner
        ? `${pet.owner.firstName} ${pet.owner.lastName}`
        : null,
      createdAt: formatDate(pet.createdAt),
    };
  }

  /**
   * Converts an array of Prisma Pet records to PetDTOs.
   *
   * @param {object[]} pets - Array of raw Prisma Pet model instances.
   * @returns {object[]} Array of PetDTOs.
   */
  static toDTOList(pets) {
    return pets.map((pet) => PetAdapter.toDTO(pet));
  }
}

// ---------------------------------------------------------------------------
// VisitAdapter
// ---------------------------------------------------------------------------

/**
 * @class VisitAdapter
 * @description Adapts a Prisma Visit model (with pet, vet, and services relations)
 * to a frontend-friendly DTO. Formats the visit date, flattens related entity
 * names, and calculates the total cost by summing all associated VisitService prices.
 *
 * Adaptee:  Prisma Visit { date: DateTime, pet: Pet, vet: Vet, services: VisitService[] }
 * Target:   VisitDTO     { date (formatted), petName, ownerFullName, vetFullName, totalCost }
 */
class VisitAdapter {
  /**
   * Converts a single Prisma Visit record to a VisitDTO.
   *
   * @param {object}   visit - Raw Prisma Visit model instance.
   * @param {number}   visit.id
   * @param {Date}     visit.date
   * @param {string}   visit.diagnosis
   * @param {string}   [visit.notes]
   * @param {number}   visit.petId
   * @param {number}   visit.vetId
   * @param {object}   [visit.pet] - Included pet relation with nested owner (optional).
   * @param {object}   [visit.vet] - Included vet relation (optional).
   * @param {object[]} [visit.services=[]] - Included VisitService[] with nested service (optional).
   * @param {Date}     visit.createdAt
   * @returns {{
   *   id: number,
   *   date: string,
   *   diagnosis: string,
   *   notes: string|null,
   *   petId: number,
   *   petName: string|null,
   *   ownerFullName: string|null,
   *   vetId: number,
   *   vetFullName: string|null,
   *   services: Array<{ id: number, name: string, price: number, notes: string|null }>,
   *   totalCost: number,
   *   createdAt: string
   * }}
   *
   * @example
   * VisitAdapter.toDTO({
   *   id: 10, date: new Date("2025-03-10"), diagnosis: "Flu",
   *   pet: { name: "Rex", owner: { firstName: "Jane", lastName: "Smith" } },
   *   vet: { firstName: "Dr", lastName: "Brown" },
   *   services: [{ id: 1, notes: null, service: { id: 2, name: "Vaccine", price: 30 } }]
   * });
   * // → { id: 10, date: "2025-03-10", petName: "Rex", ownerFullName: "Jane Smith",
   * //     vetFullName: "Dr Brown", totalCost: 30, services: [...] }
   */
  static toDTO(visit) {
    const services = Array.isArray(visit.services) ? visit.services : [];

    const mappedServices = services.map((vs) => ({
      id: vs.id,
      name: vs.service ? vs.service.name : null,
      price: vs.service ? vs.service.price : 0,
      notes: vs.notes ?? null,
    }));

    const totalCost = mappedServices.reduce((sum, s) => sum + (s.price ?? 0), 0);

    return {
      id: visit.id,
      date: formatDate(visit.date),
      diagnosis: visit.diagnosis,
      notes: visit.notes ?? null,
      petId: visit.petId,
      petName: visit.pet ? visit.pet.name : null,
      ownerFullName:
        visit.pet && visit.pet.owner
          ? `${visit.pet.owner.firstName} ${visit.pet.owner.lastName}`
          : null,
      vetId: visit.vetId,
      vetFullName: visit.vet
        ? `${visit.vet.firstName} ${visit.vet.lastName}`
        : null,
      services: mappedServices,
      totalCost,
      createdAt: formatDate(visit.createdAt),
    };
  }

  /**
   * Converts an array of Prisma Visit records to VisitDTOs.
   *
   * @param {object[]} visits - Array of raw Prisma Visit model instances.
   * @returns {object[]} Array of VisitDTOs.
   */
  static toDTOList(visits) {
    return visits.map((visit) => VisitAdapter.toDTO(visit));
  }
}

// ---------------------------------------------------------------------------
// AppointmentAdapter
// ---------------------------------------------------------------------------

/**
 * @class AppointmentAdapter
 * @description Adapts a Prisma Appointment model (with pet, vet, and owner relations)
 * to a frontend-friendly DTO. Formats the appointment date, keeps the timeSlot
 * string as-is (e.g. "09:00"), flattens related entity names, and exposes status.
 *
 * Adaptee:  Prisma Appointment { date: DateTime, timeSlot: String, status: String, pet, vet, owner }
 * Target:   AppointmentDTO     { date (formatted), timeSlot, status, petName, ownerFullName, vetFullName }
 */
class AppointmentAdapter {
  /**
   * Converts a single Prisma Appointment record to an AppointmentDTO.
   *
   * @param {object} appointment - Raw Prisma Appointment model instance.
   * @param {number} appointment.id
   * @param {Date}   appointment.date
   * @param {string} appointment.timeSlot - Time slot string, e.g. "09:00", "14:00".
   * @param {string} appointment.status   - "scheduled" | "completed" | "cancelled".
   * @param {string} [appointment.notes]
   * @param {number} appointment.petId
   * @param {number} appointment.vetId
   * @param {number} appointment.ownerId
   * @param {object} [appointment.pet]   - Included pet relation (optional).
   * @param {object} [appointment.vet]   - Included vet relation (optional).
   * @param {object} [appointment.owner] - Included owner relation (optional).
   * @param {Date}   appointment.createdAt
   * @returns {{
   *   id: number,
   *   date: string,
   *   timeSlot: string,
   *   status: string,
   *   notes: string|null,
   *   petId: number,
   *   petName: string|null,
   *   vetId: number,
   *   vetFullName: string|null,
   *   ownerId: number,
   *   ownerFullName: string|null,
   *   createdAt: string
   * }}
   *
   * @example
   * AppointmentAdapter.toDTO({
   *   id: 7, date: new Date("2025-04-01"), timeSlot: "10:00", status: "scheduled",
   *   pet: { name: "Bella" },
   *   vet: { firstName: "Anna", lastName: "Green" },
   *   owner: { firstName: "Tom", lastName: "Clark" }
   * });
   * // → { id: 7, date: "2025-04-01", timeSlot: "10:00", status: "scheduled",
   * //     petName: "Bella", vetFullName: "Anna Green", ownerFullName: "Tom Clark", ... }
   */
  static toDTO(appointment) {
    return {
      id: appointment.id,
      date: formatDate(appointment.date),
      timeSlot: appointment.timeSlot,
      status: appointment.status,
      notes: appointment.notes ?? null,
      petId: appointment.petId,
      petName: appointment.pet ? appointment.pet.name : null,
      vetId: appointment.vetId,
      vetFullName: appointment.vet
        ? `${appointment.vet.firstName} ${appointment.vet.lastName}`
        : null,
      ownerId: appointment.ownerId,
      ownerFullName: appointment.owner
        ? `${appointment.owner.firstName} ${appointment.owner.lastName}`
        : null,
      createdAt: formatDate(appointment.createdAt),
    };
  }

  /**
   * Converts an array of Prisma Appointment records to AppointmentDTOs.
   *
   * @param {object[]} appointments - Array of raw Prisma Appointment model instances.
   * @returns {object[]} Array of AppointmentDTOs.
   */
  static toDTOList(appointments) {
    return appointments.map((appt) => AppointmentAdapter.toDTO(appt));
  }
}

export { OwnerAdapter, PetAdapter, VisitAdapter, AppointmentAdapter };
