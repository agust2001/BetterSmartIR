import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createSession,
  currentCode,
  markResult,
  next,
  pendingSummary,
  previous,
  primaryAction,
  restart,
  saveRequest,
  sendFailed,
  sendRequest,
  sendStarted,
  sendSucceeded,
  storeClimate,
  updateRequest,
  withDetails,
} from "../../custom_components/better_smartir/frontend/session.js";

const DETAILS = {
  code: 10,
  min_temperature: 16,
  modes: ["cool", "heat"],
  fan_modes: ["low", "high"],
  swing_modes: [],
  available: {
    cool: { low: ["16", "17", "18"], high: ["20"] },
    heat: { low: ["24"] },
  },
};

const SWING_DETAILS = {
  code: 11,
  min_temperature: 16,
  modes: ["cool"],
  fan_modes: ["low"],
  swing_modes: ["up", "down"],
  available: { cool: { low: { up: ["16"], down: ["17", "18"] } } },
};

const NO_COMMANDS = {
  code: 12,
  min_temperature: 16,
  modes: [],
  fan_modes: [],
  swing_modes: [],
  available: {},
};

function newSession(details = DETAILS) {
  const session = createSession({
    emitter: "remote.living",
    brand: "LG",
    codes: [{ code: 10 }, { code: 11 }, { code: 12 }],
  });
  return withDetails(session, details);
}

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

const CLIMATE = {
  climate_id: "abc",
  name: "Living",
  emitter_entity_id: "remote.living",
  code: 10,
  manufacturer: "LG",
  temperature_sensor: null,
  humidity_sensor: "sensor.humidity",
  entity_id: "climate.living",
};

const FORM = {
  name: "Living",
  emitter_entity_id: "remote.living",
  temperature_sensor: null,
  humidity_sensor: "sensor.humidity",
};

function editSession(startCode) {
  const session = createSession({
    emitter: "remote.living",
    brand: "LG",
    codes: [{ code: 10 }, { code: 11 }, { code: 12 }],
    editingClimateId: "abc",
    startCode,
  });
  return withDetails(session, DETAILS);
}

test("saving a new climate creates it", () => {
  assert.deepEqual(saveRequest(newSession(), { name: "Living" }), {
    command: "climates/create",
    data: { name: "Living", emitter_entity_id: "remote.living", code: 10 },
  });
});

test("saving an edit updates the climate with what changed", () => {
  const session = next(editSession());

  assert.deepEqual(saveRequest(session, FORM, CLIMATE), {
    command: "climates/update",
    data: { climate_id: "abc", code: 11 },
  });
});

test("saving an edit includes the changes made before testing", () => {
  const form = { ...FORM, name: "Bedroom", temperature_sensor: "sensor.temperature" };

  assert.deepEqual(saveRequest(next(editSession()), form, CLIMATE), {
    command: "climates/update",
    data: {
      climate_id: "abc",
      name: "Bedroom",
      temperature_sensor: "sensor.temperature",
      code: 11,
    },
  });
});

test("an edit without changes sends nothing", () => {
  assert.equal(updateRequest(CLIMATE, FORM), null);
  assert.equal(saveRequest(editSession(), FORM, CLIMATE), null);
});

test("removing a sensor is sent as null", () => {
  assert.deepEqual(updateRequest(CLIMATE, { ...FORM, humidity_sensor: null }), {
    command: "climates/update",
    data: { climate_id: "abc", humidity_sensor: null },
  });
});

test("an edit starts at the code of the climate", () => {
  assert.equal(currentCode(editSession(11)), 11);
});

test("an edit starts at the first code if the climate has another brand", () => {
  assert.equal(currentCode(editSession(99)), 10);
});

function answered(session, responded) {
  return markResult(sendSucceeded(sendStarted(session, "on")), responded);
}

test("before sending anything the control is the main element", () => {
  assert.equal(primaryAction(newSession()), null);
});

test("after sending, the main action is to confirm that it worked", () => {
  assert.equal(primaryAction(sendSucceeded(sendStarted(newSession(), "on"))), "worked");
});

test("after it responded, the main action is to save", () => {
  assert.equal(primaryAction(answered(newSession(), true)), "save");
});

test("after it did not respond, the main action is the next code", () => {
  assert.equal(primaryAction(answered(newSession(), false)), "next");
});

test("a code without usable commands leads to the next one", () => {
  const session = newSession(NO_COMMANDS);

  assert.equal(primaryAction(session), "next");
});

test("when the codes run out, the main action is to go through them again", () => {
  assert.equal(primaryAction(next(next(next(newSession())))), "restart");
});

test("sending does not change the main action", () => {
  assert.equal(primaryAction(sendStarted(newSession(), "on")), null);
  assert.equal(primaryAction(sendStarted(answered(newSession(), true), "fan")), "save");
});

test("a failed send keeps the main action", () => {
  const session = sendStarted(answered(newSession(), true), "fan");

  assert.equal(primaryAction(sendFailed(session, "error")), "save");
});

test("changing the code forgets the last answer", () => {
  const session = withDetails(next(answered(newSession(), true)), DETAILS);

  assert.equal(primaryAction(session), null);
});

const COOL = {
  hvacMode: "cool",
  temperature: 20,
  fan: "low",
  swing: null,
  lastOnMode: "cool",
};

test("each code starts with its climate turned off", () => {
  const { climate } = newSession();

  assert.deepEqual(climate, {
    hvacMode: "off",
    temperature: 16,
    fan: "low",
    swing: null,
    lastOnMode: "cool",
  });
});

test("a code without usable commands has no climate", () => {
  assert.equal(newSession(NO_COMMANDS).climate, null);
});

test("changing the code forgets the climate", () => {
  assert.equal(next(newSession()).climate, null);
});

test("requests carry the whole state", () => {
  const session = newSession();

  assert.deepEqual(sendRequest(session, "state", COOL), {
    emitter_entity_id: "remote.living",
    code: 10,
    action: "state",
    mode: "cool",
    fan: "low",
    swing: null,
    temperature: 20,
  });
  assert.equal(sendRequest(session, "on", COOL).action, "on");
  assert.deepEqual(sendRequest(session, "off", COOL), {
    emitter_entity_id: "remote.living",
    code: 10,
    action: "off",
  });
});

test("the new climate only counts once it was sent", () => {
  const session = sendStarted(newSession(), "on", COOL);
  assert.equal(session.climate.hvacMode, "off");

  assert.deepEqual(sendSucceeded(session).climate, COOL);
});

test("a failed send keeps the previous climate", () => {
  const session = sendFailed(sendStarted(newSession(), "on", COOL), "error");

  assert.equal(session.climate.hvacMode, "off");
  assert.equal(sendSucceeded(sendStarted(session, "on")).climate.hvacMode, "off");
});

test("a change that sends nothing is stored", () => {
  const session = storeClimate(newSession(), { ...COOL, hvacMode: "off" });

  assert.equal(session.climate.temperature, 20);
  assert.equal(session.sendStatus, "idle");
});
