import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DANGER_FILL_MIX,
  PRIMARY_FILL_MIX,
  STRONG_MIX,
  TINT_MIX,
} from "../../custom_components/better_smartir/frontend/styles.js";

// Default colors of Home Assistant. See research.md.
const THEMES = {
  light: { card: "#ffffff", text: "#141414" },
  dark: { card: "#1c1c1c", text: "#e1e1e1" },
};
const ACCENTS = {
  cool: "#2196f3",
  heat: "#ff6f22",
  dry: "#ff9800",
  fan_only: "#00bcd4",
  auto: "#4caf50",
  success: "#43a047",
  error: "#db4437",
};
const PRIMARY = "#009ac7";
const ON_FILL = "#ffffff";
const BLACK = "#000000";

function channels(color) {
  return [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16));
}

function hex(values) {
  const parts = values.map((value) => Math.round(value).toString(16).padStart(2, "0"));
  return `#${parts.join("")}`;
}

// Same result as color-mix(in srgb, first percent%, second).
function mix(first, second, percent) {
  const weight = percent / 100;
  const other = channels(second);
  return hex(channels(first).map((value, index) => value * weight + other[index] * (1 - weight)));
}

function luminance(color) {
  const [red, green, blue] = channels(color)
    .map((value) => value / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

for (const [theme, { card, text }] of Object.entries(THEMES)) {
  for (const [name, accent] of Object.entries(ACCENTS)) {
    const strong = mix(accent, text, STRONG_MIX);
    const tint = mix(accent, card, TINT_MIX);

    test(`${name} icons and borders are visible in the ${theme} theme`, () => {
      assert.ok(contrast(strong, card) >= 3);
      assert.ok(contrast(strong, tint) >= 3);
    });

    test(`the text is readable over the ${name} tint in the ${theme} theme`, () => {
      assert.ok(contrast(text, tint) >= 4.5);
    });
  }

  test(`the error text is readable in the ${theme} theme`, () => {
    const strong = mix(ACCENTS.error, text, STRONG_MIX);

    assert.ok(contrast(strong, card) >= 4.5);
    assert.ok(contrast(strong, mix(ACCENTS.error, card, TINT_MIX)) >= 4.5);
  });
}

test("the text of a primary button is readable", () => {
  assert.ok(contrast(ON_FILL, mix(PRIMARY, BLACK, PRIMARY_FILL_MIX)) >= 4.5);
});

test("the text of a destructive button is readable", () => {
  assert.ok(contrast(ON_FILL, mix(ACCENTS.error, BLACK, DANGER_FILL_MIX)) >= 4.5);
});
