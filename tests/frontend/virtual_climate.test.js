import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  TEST_ENTITY,
  applyAction,
  createClimate,
  virtualState,
} from "../../custom_components/better_smartir/frontend/virtual_climate.js";

const { codes } = JSON.parse(
  readFileSync(new URL("../fixtures/climate_parity.json", import.meta.url), "utf8"),
);

const DETAILS = codes[0].details;
const FAHRENHEIT = "°F";

for (const { code, details, initial, steps } of codes) {
  test(`code ${code} offers the same as the entity`, () => {
    const { state, attributes } = virtualState(details, createClimate(details));
    const { state: expectedState, ...expected } = initial;

    assert.equal(state, expectedState);
    for (const [key, value] of Object.entries(expected)) {
      assert.deepEqual(attributes[key] ?? null, value, key);
    }
  });

  test(`code ${code} sends the same as the entity`, () => {
    let climate = createClimate(details);

    for (const { service, data, action, error } of steps) {
      const result = applyAction(climate, service, data);

      assert.equal(result.action, action, `${service} ${JSON.stringify(data)}`);
      if (!error) {
        climate = result.climate;
      }
    }
  });
}

test("a code without commands has no climate", () => {
  assert.equal(createClimate({ ...DETAILS, modes: [], available: {} }), null);
});

test("the state has the identifier of the test", () => {
  assert.equal(virtualState(DETAILS, createClimate(DETAILS)).entity_id, TEST_ENTITY);
});

test("the state shows the sensors", () => {
  const { attributes } = virtualState(DETAILS, createClimate(DETAILS), {
    currentTemperature: 23.5,
    currentHumidity: 40,
  });

  assert.equal(attributes.current_temperature, 23.5);
  assert.equal(attributes.current_humidity, 40);
});

test("the state uses the unit of the installation", () => {
  const { attributes } = virtualState(DETAILS, createClimate(DETAILS), {
    unit: FAHRENHEIT,
  });

  assert.equal(attributes.min_temp, 61);
  assert.equal(attributes.max_temp, 86);
  assert.equal(attributes.temperature, 61);
});

test("a temperature in Fahrenheit is stored in the unit of the code", () => {
  const climate = createClimate(DETAILS);

  const result = applyAction(climate, "set_temperature", { temperature: 75 }, {
    unit: FAHRENHEIT,
    precision: DETAILS.precision,
  });

  assert.equal(result.climate.temperature, 24);
});

test("each action has the category of the summary", () => {
  const off = createClimate(DETAILS);
  const on = applyAction(off, "set_hvac_mode", { hvac_mode: "cool" });
  const category = (service, data) => applyAction(on.climate, service, data).category;

  assert.equal(on.category, "on");
  assert.equal(category("set_hvac_mode", { hvac_mode: "heat" }), "mode");
  assert.equal(category("set_temperature", { temperature: 20 }), "temperature");
  assert.equal(category("set_fan_mode", { fan_mode: "high" }), "fan");
  assert.equal(category("set_swing_mode", { swing_mode: "up" }), "swing");
  assert.equal(category("turn_off", {}), "off");
});

test("a change while off has no category", () => {
  const result = applyAction(createClimate(DETAILS), "set_temperature", { temperature: 20 });

  assert.equal(result.action, null);
  assert.equal(result.category, null);
  assert.equal(result.climate.temperature, 20);
});

test("an unknown service does nothing", () => {
  assert.equal(applyAction(createClimate(DETAILS), "set_humidity", {}), null);
});
