/**
 * @fileoverview Observer design pattern implementation for the VetCare event system.
 *
 * Observer Pattern:
 * Defines a one-to-many dependency between objects so that when one object
 * (the Subject) changes state, all its dependents (Observers) are notified
 * and updated automatically.
 *
 * In this context, EventEmitter is the "Subject" (also called Publisher).
 * Listener functions (logEvent, updateStats, and any future handlers) are
 * the "Observers" (also called Subscribers). Business logic that produces
 * events (API routes, facade methods) is the "Client" that calls notify().
 *
 * Structure:
 *   EventEmitter (Subject)
 *     ├── subscribe(event, listener)    — registers an Observer
 *     ├── unsubscribe(event, listener)  — removes an Observer
 *     └── notify(event, data)           — broadcasts to all registered Observers
 *
 *   EVENTS (constants)   — the named channels Observers subscribe to
 *   logEvent (Observer)  — logs every event to the console
 *   updateStats (Observer) — tracks in-memory counters per event type
 *
 * Benefits:
 * - Loose coupling: the code that creates a visit does not need to know
 *   which observers care about VISIT_CREATED
 * - Observers can be added/removed at runtime without touching business logic
 * - Cross-cutting concerns (logging, stats, notifications) are cleanly separated
 */

// ---------------------------------------------------------------------------
// Event constants
// ---------------------------------------------------------------------------

/**
 * Named event channels used throughout the VetCare application.
 * Using constants prevents typo-related bugs when subscribing or notifying.
 *
 * @namespace EVENTS
 * @property {string} VISIT_CREATED        - Fired when a new visit is recorded.
 * @property {string} PET_REGISTERED       - Fired when a new pet is added.
 * @property {string} OWNER_REGISTERED     - Fired when a new owner is added.
 * @property {string} APPOINTMENT_CREATED  - Fired when a new appointment is booked.
 * @property {string} VACCINATION_DUE      - Fired when a pet's vaccination is overdue.
 */
const EVENTS = Object.freeze({
  VISIT_CREATED: "VISIT_CREATED",
  PET_REGISTERED: "PET_REGISTERED",
  OWNER_REGISTERED: "OWNER_REGISTERED",
  APPOINTMENT_CREATED: "APPOINTMENT_CREATED",
  VACCINATION_DUE: "VACCINATION_DUE",
});

// ---------------------------------------------------------------------------
// Subject (Publisher)
// ---------------------------------------------------------------------------

/**
 * @class EventEmitter
 * @description Custom event emitter acting as the Subject in the Observer pattern.
 * Maintains a registry of listener functions keyed by event name and broadcasts
 * event data to all registered listeners when notify() is called.
 *
 * This is a plain JavaScript implementation — it does NOT extend Node.js
 * EventEmitter and carries no external dependencies.
 */
class EventEmitter {
  constructor() {
    /**
     * Internal listener registry.
     * Keys are event name strings; values are Sets of listener functions.
     * Using a Set ensures each listener is registered at most once per event.
     *
     * @private
     * @type {Map<string, Set<Function>>}
     */
    this._listeners = new Map();
  }

  /**
   * Registers a listener function for the given event.
   * If the same listener is subscribed to the same event more than once,
   * the duplicate is silently ignored (Set semantics).
   *
   * @param {string}   eventName - The event channel to subscribe to (use EVENTS constants).
   * @param {Function} listener  - Callback invoked as listener(data) when the event fires.
   * @returns {void}
   *
   * @example
   * emitter.subscribe(EVENTS.VISIT_CREATED, logEvent);
   * emitter.subscribe(EVENTS.PET_REGISTERED, updateStats);
   */
  subscribe(eventName, listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Listener must be a function");
    }
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    this._listeners.get(eventName).add(listener);
  }

  /**
   * Removes a previously registered listener from the given event.
   * If the listener was not registered, the call is a no-op.
   *
   * @param {string}   eventName - The event channel to unsubscribe from.
   * @param {Function} listener  - The exact function reference passed to subscribe().
   * @returns {void}
   *
   * @example
   * emitter.unsubscribe(EVENTS.VISIT_CREATED, logEvent);
   */
  unsubscribe(eventName, listener) {
    if (!this._listeners.has(eventName)) return;
    this._listeners.get(eventName).delete(listener);
  }

  /**
   * Notifies all listeners registered for the given event by invoking each
   * one with the provided data payload. Listeners are called synchronously
   * in subscription order.
   *
   * If a listener throws, the error is caught and logged so that remaining
   * listeners still receive the notification.
   *
   * @param {string} eventName - The event channel to broadcast on.
   * @param {*}      [data]    - Arbitrary payload passed to every listener.
   * @returns {void}
   *
   * @example
   * emitter.notify(EVENTS.VISIT_CREATED, { visitId: 42, petName: "Rex" });
   */
  notify(eventName, data) {
    if (!this._listeners.has(eventName)) return;
    for (const listener of this._listeners.get(eventName)) {
      try {
        listener(data);
      } catch (err) {
        console.error(
          `[EventEmitter] Listener error on event "${eventName}":`,
          err
        );
      }
    }
  }

  /**
   * Returns the number of listeners currently registered for an event.
   * Useful for diagnostics and testing.
   *
   * @param {string} eventName - The event channel to inspect.
   * @returns {number} Count of registered listeners (0 if none).
   *
   * @example
   * emitter.listenerCount(EVENTS.VISIT_CREATED); // → 2
   */
  listenerCount(eventName) {
    return this._listeners.get(eventName)?.size ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Shared singleton emitter instance
// ---------------------------------------------------------------------------

/**
 * Application-wide EventEmitter instance.
 * Import this object wherever events need to be published or subscribed to,
 * so all parts of the application share the same listener registry.
 *
 * @type {EventEmitter}
 *
 * @example
 * import { emitter, EVENTS } from "@/lib/patterns/observer";
 * emitter.subscribe(EVENTS.PET_REGISTERED, myHandler);
 */
const emitter = new EventEmitter();

// ---------------------------------------------------------------------------
// Example listeners (Observers)
// ---------------------------------------------------------------------------

/**
 * Observer: logs every event to the console with a timestamp.
 * Demonstrates a cross-cutting logging concern decoupled from business logic.
 *
 * Subscribe example:
 *   emitter.subscribe(EVENTS.VISIT_CREATED, logEvent);
 *
 * @param {*} data - The event payload forwarded by notify().
 * @returns {void}
 */
function logEvent(data) {
  const timestamp = new Date().toISOString();
  console.log(`[VetCare Event ${timestamp}]`, data);
}

/**
 * In-memory stats counter updated by the updateStats observer.
 * Keys are EVENTS constant values; values are occurrence counts.
 *
 * @type {Record<string, number>}
 */
const stats = Object.fromEntries(
  Object.values(EVENTS).map((name) => [name, 0])
);

/**
 * Observer: increments an in-memory counter each time an event fires.
 * Demonstrates a lightweight stats-tracking concern that is fully decoupled
 * from the code that creates visits, pets, or appointments.
 *
 * The counter is keyed by data.event — callers should include an `event`
 * field in the payload so the correct counter is incremented.
 *
 * Subscribe example:
 *   Object.values(EVENTS).forEach(e => emitter.subscribe(e, updateStats));
 *
 * @param {{ event: string, [key: string]: * }} data - Payload must include `event`.
 * @returns {void}
 */
function updateStats(data) {
  if (data?.event && stats[data.event] !== undefined) {
    stats[data.event] += 1;
  }
}

export { EventEmitter, EVENTS, emitter, logEvent, updateStats, stats };
