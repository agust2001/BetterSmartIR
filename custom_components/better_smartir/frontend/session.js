// Logic of a test session, without the DOM. Every function returns a new session.
// The session lives only in the browser: abandoning it leaves nothing behind.

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
    selection: null,
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
  return { ...session, details, selection: defaultSelection(details) };
}

function fansOf(details, mode) {
  return Object.keys(details.available[mode] ?? {});
}

function swingsOf(details, mode, fan) {
  const branch = details.available[mode]?.[fan];
  return branch && !Array.isArray(branch) ? Object.keys(branch) : [];
}

function temperaturesOf(details, { mode, fan, swing }) {
  const branch = details.available[mode]?.[fan];
  if (Array.isArray(branch)) {
    return branch;
  }
  return branch?.[swing] ?? [];
}

function pick(options, value) {
  return options.includes(value) ? value : (options[0] ?? null);
}

function nearest(options, value) {
  if (!options.length || value === null) {
    return options[0] ?? null;
  }
  return options.reduce((best, option) =>
    Math.abs(option - value) < Math.abs(best - value) ? option : best,
  );
}

// Keeps a selection inside what the code offers after one of its values changes.
function reconcile(details, selection) {
  const modes = Object.keys(details.available);
  const mode = pick(modes, selection.mode);
  const fan = pick(fansOf(details, mode), selection.fan);
  const swing = pick(swingsOf(details, mode, fan), selection.swing);
  const temperature = nearest(
    temperaturesOf(details, { mode, fan, swing }),
    selection.temperature,
  );
  return { mode, fan, swing, temperature };
}

function defaultSelection(details) {
  if (!Object.keys(details.available).length) {
    return null;
  }
  return reconcile(details, { mode: null, fan: null, swing: null, temperature: null });
}

export function options(session) {
  const { details, selection } = session;
  if (!details || !selection) {
    return { modes: [], fans: [], swings: [], temperatures: [] };
  }
  return {
    modes: Object.keys(details.available),
    fans: fansOf(details, selection.mode),
    swings: swingsOf(details, selection.mode, selection.fan),
    temperatures: temperaturesOf(details, selection),
  };
}

export function select(session, category, value) {
  const selection = reconcile(session.details, { ...session.selection, [category]: value });
  return { ...session, selection };
}

export function stepTemperature(session, delta) {
  const { temperatures } = options(session);
  const index = temperatures.indexOf(session.selection.temperature) + delta;
  if (index < 0 || index >= temperatures.length) {
    return session;
  }
  return select(session, "temperature", temperatures[index]);
}

export function sendRequest(session, category) {
  const request = { emitter_entity_id: session.emitter, code: currentCode(session) };
  if (category === "off") {
    return { ...request, action: "off" };
  }
  const { mode, fan, swing, temperature } = session.selection;
  return {
    ...request,
    action: category === "on" ? "on" : "state",
    mode,
    fan,
    swing,
    temperature: Number(temperature),
  };
}

export function sendStarted(session, category) {
  return { ...session, sendStatus: "sending", sendError: null, lastCategory: category };
}

export function sendSucceeded(session) {
  return { ...session, sendStatus: "sent" };
}

export function sendFailed(session, error) {
  return { ...session, sendStatus: "failed", sendError: error };
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
  if (!session.selection) {
    return "next";
  }
  if (session.sendStatus === "sent") {
    return "worked";
  }
  if (session.lastResult === "responded") {
    return "save";
  }
  return session.lastResult === "not_responded" ? "next" : "on";
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
