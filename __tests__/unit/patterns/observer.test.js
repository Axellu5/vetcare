/**
 * @fileoverview Unit tests for the Observer pattern (lib/patterns/observer.js).
 * Tests subscribe/notify/unsubscribe mechanics, listener isolation,
 * EVENTS constants, and the built-in updateStats observer.
 */

import {
  EventEmitter,
  EVENTS,
  updateStats,
  stats,
} from "@/lib/patterns/observer.js";

describe("Observer Pattern — EventEmitter", () => {
  let emitter;

  // Create a fresh EventEmitter before each test to avoid state bleed
  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    // No shared state to restore — each test uses its own emitter instance
  });

  // ── subscribe + notify ────────────────────────────────────────────────────

  describe("subscribe() and notify()", () => {
    test("registered listener is called when event fires", () => {
      const listener = jest.fn();
      emitter.subscribe(EVENTS.VISIT_CREATED, listener);
      emitter.notify(EVENTS.VISIT_CREATED, { visitId: 1 });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test("listener receives the correct data payload", () => {
      const received = [];
      emitter.subscribe(EVENTS.PET_REGISTERED, (data) => received.push(data));
      emitter.notify(EVENTS.PET_REGISTERED, { petId: 42 });
      expect(received[0]).toEqual({ petId: 42 });
    });

    test("multiple listeners all receive the event", () => {
      const calls = [];
      emitter.subscribe(EVENTS.VISIT_CREATED, () => calls.push("A"));
      emitter.subscribe(EVENTS.VISIT_CREATED, () => calls.push("B"));
      emitter.notify(EVENTS.VISIT_CREATED, {});
      expect(calls).toHaveLength(2);
      expect(calls).toContain("A");
      expect(calls).toContain("B");
    });

    test("notify on an event with no listeners is a no-op", () => {
      expect(() =>
        emitter.notify(EVENTS.VACCINATION_DUE, {})
      ).not.toThrow();
    });

    test("duplicate listener is ignored (Set semantics)", () => {
      const listener = jest.fn();
      emitter.subscribe(EVENTS.OWNER_REGISTERED, listener);
      emitter.subscribe(EVENTS.OWNER_REGISTERED, listener); // duplicate
      emitter.notify(EVENTS.OWNER_REGISTERED, {});
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test("subscribe throws when listener is not a function", () => {
      expect(() => emitter.subscribe(EVENTS.VISIT_CREATED, "notAFunction")).toThrow(
        "Listener must be a function"
      );
    });
  });

  // ── unsubscribe ───────────────────────────────────────────────────────────

  describe("unsubscribe()", () => {
    test("removed listener is NOT called after unsubscribe", () => {
      const listener = jest.fn();
      emitter.subscribe(EVENTS.PET_REGISTERED, listener);
      emitter.unsubscribe(EVENTS.PET_REGISTERED, listener);
      emitter.notify(EVENTS.PET_REGISTERED, {});
      expect(listener).not.toHaveBeenCalled();
    });

    test("unsubscribing a non-existent listener is a no-op", () => {
      expect(() =>
        emitter.unsubscribe(EVENTS.VISIT_CREATED, jest.fn())
      ).not.toThrow();
    });

    test("unsubscribing from an unknown event is a no-op", () => {
      expect(() =>
        emitter.unsubscribe("UNKNOWN_EVENT", jest.fn())
      ).not.toThrow();
    });
  });

  // ── listenerCount ─────────────────────────────────────────────────────────

  describe("listenerCount()", () => {
    test("returns 0 for an event with no listeners", () => {
      expect(emitter.listenerCount(EVENTS.VACCINATION_DUE)).toBe(0);
    });

    test("returns correct count after subscribing", () => {
      emitter.subscribe(EVENTS.VISIT_CREATED, jest.fn());
      emitter.subscribe(EVENTS.VISIT_CREATED, jest.fn());
      expect(emitter.listenerCount(EVENTS.VISIT_CREATED)).toBe(2);
    });

    test("decrements after unsubscribe", () => {
      const fn = jest.fn();
      emitter.subscribe(EVENTS.APPOINTMENT_CREATED, fn);
      expect(emitter.listenerCount(EVENTS.APPOINTMENT_CREATED)).toBe(1);
      emitter.unsubscribe(EVENTS.APPOINTMENT_CREATED, fn);
      expect(emitter.listenerCount(EVENTS.APPOINTMENT_CREATED)).toBe(0);
    });
  });

  // ── error isolation ───────────────────────────────────────────────────────

  describe("listener error isolation", () => {
    test("error in one listener does not prevent others from running", () => {
      // Suppress expected console.error — EventEmitter logs caught listener errors
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const goodListener = jest.fn();
      emitter.subscribe(EVENTS.VISIT_CREATED, () => {
        throw new Error("I blew up");
      });
      emitter.subscribe(EVENTS.VISIT_CREATED, goodListener);

      expect(() => emitter.notify(EVENTS.VISIT_CREATED, {})).not.toThrow();
      expect(goodListener).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });
});

// ── EVENTS constants ──────────────────────────────────────────────────────────

describe("EVENTS constants", () => {
  test("EVENTS object is frozen (immutable)", () => {
    expect(Object.isFrozen(EVENTS)).toBe(true);
  });

  test("contains all five expected event names", () => {
    const values = Object.values(EVENTS);
    expect(values).toContain("VISIT_CREATED");
    expect(values).toContain("PET_REGISTERED");
    expect(values).toContain("OWNER_REGISTERED");
    expect(values).toContain("APPOINTMENT_CREATED");
    expect(values).toContain("VACCINATION_DUE");
  });

  test("has exactly 5 events", () => {
    expect(Object.keys(EVENTS)).toHaveLength(5);
  });
});

// ── updateStats observer ──────────────────────────────────────────────────────

describe("updateStats observer", () => {
  test("increments the correct counter when called with a known event", () => {
    const before = stats[EVENTS.VISIT_CREATED];
    updateStats({ event: EVENTS.VISIT_CREATED });
    expect(stats[EVENTS.VISIT_CREATED]).toBe(before + 1);
  });

  test("does nothing for unknown event keys", () => {
    // Should not throw and should not mutate known counters
    const before = stats[EVENTS.PET_REGISTERED];
    expect(() => updateStats({ event: "FAKE_EVENT" })).not.toThrow();
    expect(stats[EVENTS.PET_REGISTERED]).toBe(before);
  });

  test("does nothing when event key is missing from payload", () => {
    const before = stats[EVENTS.OWNER_REGISTERED];
    updateStats({});
    expect(stats[EVENTS.OWNER_REGISTERED]).toBe(before);
  });

  test("stats object contains a counter for every EVENTS value", () => {
    Object.values(EVENTS).forEach((eventName) => {
      expect(typeof stats[eventName]).toBe("number");
    });
  });
});
