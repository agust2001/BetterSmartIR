// Logic of a test session, without the DOM. Every function returns a new session.
// The session lives only in the browser: abandoning it leaves nothing behind.

import { createClimate } from "./virtual_climate.js";

export const CATEGORIES = ["on", "off", "mode", "temperature", "fan", "swing"];

export function createSession({
  emitter,
  brand,
  codes,
  editingClimateId = null,
  startCode = null,
}) {
  return {
    emitter,
    brand,
    codes,
    editingClimateId,
    position: Math.max(
      codes.findIndex(({ code }) => code === startCode),
      0,
    ),
    exhausted: false,
    ...emptyCodeState(),
  };
}

function emptyCodeState() {
  return {
    details: null,
    climate: null,
    pendingClimate: null,
    results: {},
    lastResult: null,
    sendStatus: "idle",
    sendError: null,
    lastCategory: null,
  };
}

export function currentCode(session) {
  return session.codes[session.position].code;
}

export function withDetails(session, details) {
  return { ...session, details, climate: createClimate(details) };
}

export function storeClimate(session, climate) {
  return { ...session, climate };
}

export function sendRequest(session, action, climate) {
  const request = { emitter_entity_id: session.emitter, code: currentCode(session) };
  if (action === "off") {
    return { ...request, action };
  }
  const { hvacMode: mode, fan, swing, temperature } = climate;
  return { ...request, action, mode, fan, swing, temperature };
}

export function sendStarted(session, category, climate = null) {
  return {
    ...session,
    sendStatus: "sending",
    sendError: null,
    lastCategory: category,
    pendingClimate: climate,
  };
}

export function sendSucceeded(session) {
  return {
    ...session,
    sendStatus: "sent",
    climate: session.pendingClimate ?? session.climate,
    pendingClimate: null,
  };
}

export function sendFailed(session, error) {
  return { ...session, sendStatus: "failed", sendError: error, pendingClimate: null };
}

export function markResult(session, responded) {
  const result = responded ? "responded" : "not_responded";
  return {
    ...session,
    results: { ...session.results, [session.lastCategory]: result },
    lastResult: result,
    sendStatus: "idle",
  };
}

// The button that stands out in the test screen.
export function primaryAction(session) {
  if (session.exhausted) {
    return "restart";
  }
  if (!session.climate) {
    return "next";
  }
  if (session.sendStatus === "sent") {
    return "worked";
  }
  if (session.lastResult === "responded") {
    return "save";
  }
  return session.lastResult === "not_responded" ? "next" : null;
}

export function next(session) {
  if (session.position + 1 >= session.codes.length) {
    return { ...session, exhausted: true };
  }
  return { ...session, position: session.position + 1, ...emptyCodeState() };
}

export function previous(session) {
  if (session.position === 0) {
    return session;
  }
  return {
    ...session,
    position: session.position - 1,
    exhausted: false,
    ...emptyCodeState(),
  };
}

export function restart(session) {
  return { ...session, position: 0, exhausted: false, ...emptyCodeState() };
}

// Sends only what changed, so a value that is no longer valid, like an emitter
// that was removed, does not block changing the rest.
export function updateRequest(climate, form) {
  const changes = Object.entries(form).filter(([key, value]) => value !== climate[key]);
  if (!changes.length) {
    return null;
  }
  return {
    command: "climates/update",
    data: { climate_id: climate.climate_id, ...Object.fromEntries(changes) },
  };
}

export function saveRequest(session, form, climate = null) {
  const data = {
    ...form,
    emitter_entity_id: session.emitter,
    code: currentCode(session),
  };
  return session.editingClimateId
    ? updateRequest(climate, data)
    : { command: "climates/create", data };
}

export function pendingSummary(session) {
  const relevant = CATEGORIES.filter(
    (category) => category !== "swing" || session.details?.swing_modes.length,
  );
  return {
    failed: relevant.filter((category) => session.results[category] === "not_responded"),
    untested: relevant.filter((category) => !session.results[category]),
  };
}
