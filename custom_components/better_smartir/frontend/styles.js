// Styles of the panel. Colors come from the theme of the person, with the default
// of Home Assistant as a fallback. tests/frontend/contrast.test.js checks the
// proportions below: a theme color alone does not reach an accessible contrast.

export const TINT_MIX = 16;
export const STRONG_MIX = 70;
export const PRIMARY_FILL_MIX = 70;
export const DANGER_FILL_MIX = 80;

export const STYLES = `
  :host {
    --bsi-card: var(--ha-card-background, var(--card-background-color, #fff));
    --bsi-text: var(--primary-text-color, #141414);
    --bsi-muted: var(--secondary-text-color, #5e5e5e);
    --bsi-divider: var(--divider-color, #0000001f);
    --bsi-radius: var(--ha-card-border-radius, 12px);
    --bsi-primary: var(--primary-color, #009ac7);
    --bsi-on-fill: var(--text-primary-color, #fff);
    --bsi-primary-fill: color-mix(in srgb, var(--bsi-primary) ${PRIMARY_FILL_MIX}%, black);
    --bsi-danger-fill: color-mix(in srgb, var(--error-color, #db4437) ${DANGER_FILL_MIX}%, black);
    --accent: var(--bsi-primary);
    display: block;
    min-height: 100%;
    background: var(--primary-background-color, #fafafa);
    color: var(--bsi-text);
    font-family: var(--ha-font-family-body, Roboto, sans-serif);
  }
  * { box-sizing: border-box; }

  .mode-cool { --accent: var(--state-climate-cool-color, #2196f3); }
  .mode-heat { --accent: var(--state-climate-heat-color, #ff6f22); }
  .mode-dry { --accent: var(--state-climate-dry-color, #ff9800); }
  .mode-fan_only { --accent: var(--state-climate-fan_only-color, #00bcd4); }
  .mode-auto { --accent: var(--state-climate-auto-color, #4caf50); }
  .mode-heat_cool {
    --accent: var(--state-climate-heat_cool-color, var(--state-climate-auto-color, #4caf50));
  }
  .mode-other { --accent: var(--bsi-muted); }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 56px;
    padding: 0 16px;
    background: var(--app-header-background-color, var(--bsi-primary-fill));
    color: var(--app-header-text-color, var(--bsi-on-fill));
    font-size: 20px;
  }
  header button {
    min-width: 44px;
    padding: 0;
    background: none;
    border: 0;
    color: inherit;
  }

  main {
    container-type: inline-size;
    max-width: 560px;
    margin: 0 auto;
    padding: 16px;
    display: grid;
    gap: 16px;
  }
  main.wide { max-width: 1040px; }

  section {
    display: grid;
    gap: 12px;
    min-width: 0;
    padding: 16px;
    border-radius: var(--bsi-radius);
    background: var(--bsi-card);
    border: 1px solid var(--bsi-divider);
  }
  h2 { margin: 0; font-size: 20px; font-weight: 500; }
  h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--bsi-muted);
  }
  p { margin: 0; overflow-wrap: anywhere; }
  .muted { color: var(--bsi-muted); font-size: 14px; }
  .error { color: color-mix(in srgb, var(--error-color, #db4437) ${STRONG_MIX}%, var(--bsi-text)); }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .spread { justify-content: space-between; }
  .group { display: grid; gap: 8px; }

  label { display: grid; gap: 6px; font-size: 14px; }
  select, input {
    width: 100%;
    min-height: 44px;
    font: inherit;
    padding: 10px;
    border-radius: 8px;
    color: var(--bsi-text);
    background: var(--bsi-card);
    border: 1px solid var(--bsi-muted);
  }
  select:focus-visible, input:focus-visible {
    outline: 2px solid var(--bsi-text);
    outline-offset: 2px;
  }

  .icon { width: 20px; height: 20px; flex: none; fill: currentColor; }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    max-width: 100%;
    padding: 8px 16px;
    font: inherit;
    font-weight: 500;
    overflow-wrap: anywhere;
    border-radius: 10px;
    border: 1px solid var(--bsi-divider);
    background: var(--bsi-card);
    color: var(--bsi-text);
    cursor: pointer;
    transition: background-color 120ms, border-color 120ms, transform 80ms;
  }
  button:focus-visible { outline: 2px solid var(--bsi-text); outline-offset: 2px; }
  button:active:not(:disabled) { transform: scale(0.97); }
  button:disabled { opacity: 0.45; cursor: default; }
  button.sending:disabled { opacity: 1; }
  button.sending .icon { animation: spin 400ms linear infinite; }

  button.primary {
    border-color: transparent;
    background: var(--bsi-primary-fill);
    color: var(--bsi-on-fill);
    box-shadow: 0 2px 6px color-mix(in srgb, var(--bsi-primary) 35%, transparent);
  }
  button.primary:active:not(:disabled) {
    background: color-mix(in srgb, var(--bsi-primary) 50%, black);
  }
  button.danger {
    border-color: transparent;
    background: var(--bsi-danger-fill);
    color: var(--bsi-on-fill);
  }
  button.danger:active:not(:disabled) {
    background: color-mix(in srgb, var(--error-color, #db4437) 60%, black);
  }

  button.option { border-radius: 999px; padding: 8px 14px; }
  button.option .icon {
    color: color-mix(in srgb, var(--accent) ${STRONG_MIX}%, var(--bsi-text));
  }
  button.option[aria-pressed="true"] {
    background: color-mix(in srgb, var(--accent) ${TINT_MIX}%, var(--bsi-card));
    border-color: color-mix(in srgb, var(--accent) ${STRONG_MIX}%, var(--bsi-text));
  }
  button.round {
    width: 56px;
    height: 56px;
    padding: 0;
    border-radius: 50%;
    border-color: color-mix(in srgb, var(--accent) ${STRONG_MIX}%, var(--bsi-text));
    background: var(--bsi-card);
  }
  button.round .icon { width: 28px; height: 28px; }

  @media (hover: hover) {
    button:hover:not(:disabled) { border-color: var(--bsi-text); }
    button.primary:hover:not(:disabled) {
      border-color: transparent;
      background: color-mix(in srgb, var(--bsi-primary) 60%, black);
    }
    button.danger:hover:not(:disabled) {
      border-color: transparent;
      background: color-mix(in srgb, var(--error-color, #db4437) 70%, black);
    }
  }

  ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
  li {
    display: grid;
    gap: 8px;
    min-width: 0;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--bsi-divider);
    overflow-wrap: anywhere;
  }

  .climate { display: flex; gap: 12px; min-width: 0; }
  .climate > div { min-width: 0; }
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) ${TINT_MIX}%, var(--bsi-card));
    color: color-mix(in srgb, var(--accent) ${STRONG_MIX}%, var(--bsi-text));
  }
  .badge .icon { width: 24px; height: 24px; }
  .empty { display: grid; justify-items: center; gap: 12px; padding: 16px 0; text-align: center; }
  .summary-failed { --accent: var(--error-color, #db4437); }
  .summary-untested { --accent: var(--bsi-muted); font-weight: 400; }

  .test-layout { display: grid; gap: 16px; }
  .test-column { display: grid; gap: 16px; align-content: start; min-width: 0; }
  .progress {
    height: 4px;
    border-radius: 2px;
    overflow: hidden;
    background: var(--bsi-divider);
  }
  .progress > div { height: 100%; background: var(--bsi-primary-fill); }

  .hero {
    position: relative;
    overflow: hidden;
    justify-items: center;
    gap: 16px;
    padding: 24px 16px;
    background: color-mix(in srgb, var(--accent) ${TINT_MIX}%, var(--bsi-card));
    border-color: color-mix(in srgb, var(--accent) ${STRONG_MIX}%, var(--bsi-text));
    transition: background-color 200ms, border-color 200ms;
  }
  .hero.sending::before, .hero.sending::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 120px;
    height: 120px;
    margin: -60px;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--accent) ${STRONG_MIX}%, var(--bsi-text));
    pointer-events: none;
    animation: wave 400ms ease-out infinite;
  }
  .hero.sending::after { animation-delay: 200ms; }
  .hero-mode { display: flex; align-items: center; gap: 8px; font-size: 22px; font-weight: 500; }
  .hero-mode .icon {
    width: 32px;
    height: 32px;
    color: color-mix(in srgb, var(--accent) ${STRONG_MIX}%, var(--bsi-text));
  }
  .hero-controls { display: flex; align-items: center; gap: 16px; }
  .temperature {
    min-width: 2.2em;
    font-size: 56px;
    font-weight: 300;
    line-height: 1;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .status {
    --accent: var(--bsi-muted);
    align-content: center;
    min-height: 124px;
  }
  .status-line { display: flex; align-items: center; gap: 8px; font-weight: 500; }
  .status-line .icon {
    width: 24px;
    height: 24px;
    color: color-mix(in srgb, var(--accent) ${STRONG_MIX}%, var(--bsi-text));
  }
  .status-idle .status-line { color: var(--bsi-muted); font-weight: 400; }
  .status-sent, .status-failed {
    background: color-mix(in srgb, var(--accent) ${TINT_MIX}%, var(--bsi-card));
    border-color: color-mix(in srgb, var(--accent) ${STRONG_MIX}%, var(--bsi-text));
  }
  .status-sent { --accent: var(--success-color, #43a047); }
  .status-failed { --accent: var(--error-color, #db4437); }
  .enter { animation: enter 200ms ease-out; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes wave {
    from { transform: scale(0.6); opacity: 0.8; }
    to { transform: scale(2.4); opacity: 0; }
  }
  @keyframes enter {
    from { transform: translateY(6px); opacity: 0; }
  }

  @container (max-width: 360px) {
    .status { min-height: 168px; }
  }

  @container (min-width: 760px) {
    .test-layout { grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); }
    .test-footer { grid-column: 1 / -1; }
    .temperature { font-size: 72px; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
    button:active:not(:disabled) { transform: none; }
    .hero.sending::before, .hero.sending::after { display: none; }
  }
`;
