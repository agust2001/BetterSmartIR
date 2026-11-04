import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createSession,
  currentCode,
  markResult,
  next,
  options,
  pendingSummary,
  previous,
  restart,
  select,
  sendFailed,
  sendRequest,
  sendStarted,
  sendSucceeded,
  stepTemperature,
  withDetails,
} from "../../custom_components/better_smartir/frontend/session.js";

const DETAILS = {
  code: 10,
  swing_modes: [],
  available: {
    cool: { low: ["16", "17", "18"], high: ["20"] },
    heat: { low: ["24"] },
  },
};

const SWING_DETAILS = {
  code: 11,
  swing_modes: ["up", "down"],
  available: { cool: { low: { up: ["16"], down: ["17", "18"] } } },
};

function newSession(details = DETAILS) {
  const session = createSession({
    emitter: "remote.living",
    brand: "LG",
    codes: [{ code: 10 }, { code: 11 }, { code: 12 }],
  });
  return withDetails(session, details);
}

test("starts at the first code with the first available combination", () => {
  const session = newSession();

  assert.equal(currentCode(session), 10);
  assert.equal(session.position, 0);
  assert.deepEqual(session.selection, {
    mode: "cool",
    fan: "low",
    swing: null,
    temperature: "16",
  });
});

test("next and previous move through the codes and clear the results", () => {
  let session = sendSucceeded(sendStarted(newSession(), "on"));
  session = markResult(session, false);

  session = next(session);
  assert.equal(currentCode(session), 11);
  assert.deepEqual(session.results, {});
  assert.equal(session.details, null);

  session = previous(session);
  assert.equal(currentCode(session), 10);
});

test("previous stays at the first code", () => {
  const session = newSession();

  assert.equal(previous(session).position, 0);
});

test("going past the last code exhausts the session and it can restart", () => {
  let session = next(next(newSession()));
  assert.equal(session.exhausted, false);

  session = next(session);
  assert.equal(session.exhausted, true);
  assert.equal(currentCode(session), 12);

  session = restart(session);
  assert.equal(session.exhausted, false);
  assert.equal(currentCode(session), 10);
});

test("only offers what the code has for the current selection", () => {
  const session = select(newSession(), "mode", "heat");

  assert.deepEqual(options(session), {
    modes: ["cool", "heat"],
    fans: ["low"],
    swings: [],
    temperatures: ["24"],
  });
});

test("changing a value moves the others to something available", () => {
  const session = select(newSession(), "fan", "high");

  assert.equal(session.selection.temperature, "20");
});

test("keeps the closest temperature when the fan changes", () => {
  let session = select(newSession(), "temperature", "18");
  session = select(session, "mode", "heat");

  assert.deepEqual(session.selection, {
    mode: "heat",
    fan: "low",
    swing: null,
    temperature: "24",
  });
});

test("swing is part of the selection", () => {
  let session = newSession(SWING_DETAILS);
  assert.equal(session.selection.swing, "up");
  assert.deepEqual(options(session).swings, ["up", "down"]);

  session = select(session, "swing", "down");

  assert.equal(session.selection.temperature, "17");
  assert.deepEqual(options(session).temperatures, ["17", "18"]);
});

test("a code without usable commands has no selection", () => {
  const session = newSession({ code: 12, swing_modes: [], available: {} });

  assert.equal(session.selection, null);
  assert.deepEqual(options(session).modes, []);
});

test("the temperature moves through the available values and stops at the ends", () => {
  let session = stepTemperature(newSession(), 1);
  assert.equal(session.selection.temperature, "17");

  session = stepTemperature(stepTemperature(session, 1), 1);
  assert.equal(session.selection.temperature, "18");

  assert.equal(stepTemperature(newSession(), -1).selection.temperature, "16");
});

test("requests carry the whole combination", () => {
  const session = newSession();

  assert.deepEqual(sendRequest(session, "temperature"), {
    emitter_entity_id: "remote.living",
    code: 10,
    action: "state",
    mode: "cool",
    fan: "low",
    swing: null,
    temperature: 16,
  });
  assert.equal(sendRequest(session, "on").action, "on");
  assert.deepEqual(sendRequest(session, "off"), {
    emitter_entity_id: "remote.living",
    code: 10,
    action: "off",
  });
});

test("a failure keeps the position and does not count as a result", () => {
  let session = next(newSession());
  session = withDetails(session, DETAILS);

  session = sendFailed(sendStarted(session, "on"), "error");

  assert.equal(session.position, 1);
  assert.equal(session.sendStatus, "failed");
  assert.deepEqual(session.results, {});
});

test("the person indicates whether the air conditioner responded", () => {
  let session = sendSucceeded(sendStarted(newSession(), "on"));
  assert.equal(session.sendStatus, "sent");

  session = markResult(session, true);

  assert.deepEqual(session.results, { on: "responded" });
  assert.equal(session.sendStatus, "idle");
});

test("the summary lists failed and untested commands", () => {
  let session = markResult(sendSucceeded(sendStarted(newSession(), "on")), true);
  session = markResult(sendSucceeded(sendStarted(session, "fan")), false);

  assert.deepEqual(pendingSummary(session), {
    failed: ["fan"],
    untested: ["off", "mode", "temperature"],
  });
});

test("the summary only includes swing if the code has it", () => {
  assert.ok(pendingSummary(newSession(SWING_DETAILS)).untested.includes("swing"));
});
