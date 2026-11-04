// Sidebar panel of BetterSmartIR. A plain Web Component: no build step and no
// external libraries, so it also works without internet.

import { translator } from "./i18n.js";
import * as session from "./session.js";

const API_PREFIX = "better_smartir";
// The entity appears after the reload that follows saving a climate.
const REFRESH_AFTER_SAVE_MS = 1500;

const STYLES = `
  :host {
    display: block;
    min-height: 100%;
    background: var(--primary-background-color);
    color: var(--primary-text-color);
    font-family: var(--ha-font-family-body, Roboto, sans-serif);
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 56px;
    padding: 0 16px;
    background: var(--app-header-background-color, var(--primary-color));
    color: var(--app-header-text-color, #fff);
    font-size: 20px;
  }
  header button {
    background: none;
    border: 0;
    color: inherit;
    font-size: 22px;
    padding: 4px 8px;
    min-height: 0;
  }
  main {
    max-width: 560px;
    margin: 0 auto;
    padding: 16px;
    display: grid;
    gap: 16px;
  }
  section {
    display: grid;
    gap: 12px;
    padding: 16px;
    border-radius: 12px;
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
  }
  h2 { margin: 0; font-size: 18px; font-weight: 500; }
  h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--secondary-text-color);
  }
  p { margin: 0; }
  .muted { color: var(--secondary-text-color); font-size: 14px; }
  .error { color: var(--error-color); }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .spread { justify-content: space-between; }
  .temperature { font-size: 28px; min-width: 88px; text-align: center; }
  label { display: grid; gap: 6px; font-size: 14px; }
  select, input {
    font: inherit;
    padding: 10px;
    border-radius: 8px;
    color: var(--primary-text-color);
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
  }
  button {
    font: inherit;
    min-height: 40px;
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    cursor: pointer;
  }
  button:hover:not(:disabled) { border-color: var(--primary-color); }
  button:disabled { opacity: 0.5; cursor: default; }
  button.selected, button.primary {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
  li {
    display: grid;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--divider-color);
  }
`;

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}

class BetterSmartIRPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._view = "list";
    this._climates = [];
    this._emitters = [];
    this._brands = [];
    this._emitter = null;
    this._brand = null;
    this._session = null;
    this._name = "";
    this._editing = null;
    this._sensors = {};
    this._deleting = null;
    this._error = null;
    this._narrow = false;
    this.shadowRoot.addEventListener("click", (event) => this._onClick(event));
    this.shadowRoot.addEventListener("change", (event) => this._onChange(event));
    this.shadowRoot.addEventListener("input", (event) => this._onInput(event));
  }

  set hass(hass) {
    const firstTime = !this._hass;
    this._hass = hass;
    if (firstTime) {
      this._t = translator(hass.language);
      this._loadClimates();
    }
  }

  set narrow(narrow) {
    this._narrow = narrow;
    if (this._hass) {
      this._render();
    }
  }

  _call(command, data = {}) {
    return this._hass.callWS({ type: `${API_PREFIX}/${command}`, ...data });
  }

  _errorText(error) {
    const text = this._t(`error_${error?.code}`);
    return text === `error_${error?.code}` ? this._t("error_unknown") : text;
  }

  async _run(action) {
    this._error = null;
    try {
      await action();
    } catch (error) {
      this._error = this._errorText(error);
    }
    this._render();
  }

  _loadClimates() {
    return this._run(async () => {
      const { climates } = await this._call("climates/list");
      this._climates = climates;
    });
  }

  _startAdd() {
    return this._run(async () => {
      const [{ emitters }, { brands }] = await Promise.all([
        this._call("emitters"),
        this._call("brands"),
      ]);
      this._emitters = emitters;
      this._brands = brands;
      this._emitter = emitters[0]?.entity_id ?? null;
      this._brand = brands[0]?.name ?? null;
      this._view = "select";
    });
  }

  _startEdit(climate) {
    return this._run(async () => {
      const { emitters } = await this._call("emitters");
      this._emitters = emitters;
      this._editing = climate;
      this._name = climate.name;
      this._emitter = climate.emitter_entity_id;
      this._sensors = {
        temperature_sensor: climate.temperature_sensor,
        humidity_sensor: climate.humidity_sensor,
      };
      this._view = "edit";
    });
  }

  _startCodeChange() {
    return this._run(async () => {
      const { brands } = await this._call("brands");
      const manufacturer = this._editing.manufacturer?.toLowerCase();
      const brand = brands.find(({ name }) => name.toLowerCase() === manufacturer);
      this._brands = brands;
      this._brand = (brand ?? brands[0])?.name ?? null;
      this._view = "select";
    });
  }

  _startTest() {
    return this._run(async () => {
      const { codes } = await this._call("codes", { brand: this._brand });
      this._session = session.createSession({
        emitter: this._emitter,
        brand: this._brand,
        codes,
        editingClimateId: this._editing?.climate_id,
        startCode: this._editing?.code,
      });
      await this._loadCode();
      this._view = "test";
    });
  }

  async _loadCode() {
    const details = await this._call("code", {
      code: session.currentCode(this._session),
    });
    this._session = session.withDetails(this._session, details);
  }

  _changeCode(move) {
    this._session = move(this._session);
    if (this._session.exhausted) {
      this._render();
      return undefined;
    }
    return this._run(() => this._loadCode());
  }

  async _send(category) {
    if (this._session.sendStatus === "sending") {
      return;
    }
    const request = session.sendRequest(this._session, category);
    this._session = session.sendStarted(this._session, category);
    this._render();
    try {
      await this._call("test/send", request);
      this._session = session.sendSucceeded(this._session);
    } catch (error) {
      this._session = session.sendFailed(this._session, this._errorText(error));
    }
    this._render();
  }

  _form() {
    return this._editing
      ? { name: this._name, emitter_entity_id: this._emitter, ...this._sensors }
      : { name: this._name };
  }

  _save() {
    return this._run(async () => {
      const request = this._session
        ? session.saveRequest(this._session, this._form(), this._editing)
        : session.updateRequest(this._editing, this._form());
      if (request) {
        await this._call(request.command, request.data);
      }
      this._showList();
      await this._loadClimates();
      setTimeout(() => this._loadClimates(), REFRESH_AFTER_SAVE_MS);
    });
  }

  _delete() {
    return this._run(async () => {
      await this._call("climates/delete", { climate_id: this._deleting.climate_id });
      this._showList();
      await this._loadClimates();
    });
  }

  _showList() {
    this._session = null;
    this._name = "";
    this._editing = null;
    this._deleting = null;
    this._view = "list";
  }

  // Leaving a test of an existing climate goes back to it, without changing it.
  _cancel() {
    this._error = null;
    if (this._editing && this._view !== "edit") {
      this._session = null;
      this._view = "edit";
    } else {
      this._showList();
    }
    this._render();
  }

  _climate(id) {
    return this._climates.find((climate) => climate.climate_id === id);
  }

  _onClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) {
      return;
    }
    const { action, category, climate, value } = button.dataset;
    switch (action) {
      case "menu":
        this.dispatchEvent(
          new Event("hass-toggle-menu", { bubbles: true, composed: true }),
        );
        break;
      case "add":
        this._startAdd();
        break;
      case "edit":
        this._startEdit(this._climate(climate));
        break;
      case "ask-delete":
        this._error = null;
        this._deleting = this._climate(climate);
        this._view = "delete";
        this._render();
        break;
      case "delete":
        this._delete();
        break;
      case "change-code":
        this._startCodeChange();
        break;
      case "start":
        this._startTest();
        break;
      case "cancel":
        this._cancel();
        break;
      case "send":
        this._send(category);
        break;
      case "choose":
        this._session = session.select(this._session, category, value);
        this._send(category);
        break;
      case "temperature":
        this._session = session.stepTemperature(this._session, Number(value));
        this._send("temperature");
        break;
      case "result":
        this._session = session.markResult(this._session, value === "yes");
        this._render();
        break;
      case "next":
        this._changeCode(session.next);
        break;
      case "previous":
        this._changeCode(session.previous);
        break;
      case "restart":
        this._changeCode(session.restart);
        break;
      case "review":
        this._view = "save";
        this._render();
        break;
      case "keep-testing":
        this._error = null;
        this._view = "test";
        this._render();
        break;
      case "save":
        this._save();
        break;
    }
  }

  _onChange(event) {
    if (event.target.name === "emitter") {
      this._emitter = event.target.value;
    } else if (event.target.name === "brand") {
      this._brand = event.target.value;
    } else if (event.target.name in this._sensors) {
      this._sensors[event.target.name] = event.target.value || null;
    }
  }

  _onInput(event) {
    if (event.target.name === "name") {
      this._name = event.target.value;
      const save = this.shadowRoot.querySelector('[data-action="save"]');
      save.disabled = !this._name.trim();
    }
  }

  _render() {
    const focused = this.shadowRoot.activeElement?.dataset?.focusKey;
    const views = {
      list: () => this._renderList(),
      edit: () => this._renderEdit(),
      delete: () => this._renderDelete(),
      select: () => this._renderSelect(),
      test: () => this._renderTest(),
      save: () => this._renderSave(),
    };
    const error = this._error
      ? `<p class="error" role="alert">${escapeHtml(this._error)}</p>`
      : "";
    const menu = this._narrow
      ? `<button data-action="menu" aria-label="Menu">☰</button>`
      : "";
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <header>${menu}<span>BetterSmartIR</span></header>
      <main>${error}${views[this._view]()}</main>
    `;
    if (focused) {
      this.shadowRoot.querySelector(`[data-focus-key="${focused}"]`)?.focus();
    }
  }

  _button(label, attributes, { selected = false, primary = false, disabled = false } = {}) {
    const data = Object.entries(attributes)
      .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
      .join(" ");
    const focusKey = Object.values(attributes).join(":");
    const classes = selected || primary ? `class="${selected ? "selected" : "primary"}"` : "";
    return `<button ${classes} ${data} data-focus-key="${escapeHtml(focusKey)}" ${disabled ? "disabled" : ""}>${escapeHtml(label)}</button>`;
  }

  _renderList() {
    const t = this._t;
    const items = this._climates
      .map(
        (climate) => `
          <li>
            <strong>${escapeHtml(climate.name)}</strong>
            <p class="muted">
              ${escapeHtml(climate.manufacturer)} · ${escapeHtml(t("code_label", { code: climate.code }))}
              · ${escapeHtml(climate.entity_id ?? "…")}
            </p>
            <div class="row">
              ${this._button(t("edit"), { action: "edit", climate: climate.climate_id })}
              ${this._button(t("delete"), { action: "ask-delete", climate: climate.climate_id })}
            </div>
          </li>`,
      )
      .join("");
    return `
      <section>
        ${items ? `<ul>${items}</ul>` : `<p class="muted">${escapeHtml(t("no_climates"))}</p>`}
        <div>${this._button(t("add_climate"), { action: "add" }, { primary: true })}</div>
      </section>`;
  }

  // A value that is no longer offered stays visible, so it is not lost by accident.
  _options(items, selected) {
    const all = items.some(({ value }) => value === selected) || !selected
      ? items
      : [{ value: selected, label: selected }, ...items];
    return all
      .map(
        ({ value, label }) =>
          `<option value="${escapeHtml(value)}" ${value === (selected ?? "") ? "selected" : ""}>${escapeHtml(label)}</option>`,
      )
      .join("");
  }

  _emitterOptions() {
    return this._options(
      this._emitters.map(({ entity_id, name }) => ({ value: entity_id, label: name })),
      this._emitter,
    );
  }

  _renderSensor(key, deviceClass) {
    const t = this._t;
    const sensors = Object.values(this._hass.states)
      .filter(
        ({ entity_id, attributes }) =>
          entity_id.startsWith("sensor.") && attributes.device_class === deviceClass,
      )
      .map(({ entity_id, attributes }) => ({
        value: entity_id,
        label: attributes.friendly_name ?? entity_id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const options = this._options(
      [{ value: "", label: t("no_sensor") }, ...sensors],
      this._sensors[key],
    );
    return `<label>${escapeHtml(t(key))}<select name="${key}">${options}</select></label>`;
  }

  _renderEdit() {
    const t = this._t;
    const { code, manufacturer } = this._editing;
    return `
      <section>
        <h2>${escapeHtml(t("edit_climate"))}</h2>
        <label>${escapeHtml(t("climate_name"))}
          <input name="name" value="${escapeHtml(this._name)}" data-focus-key="name" autocomplete="off">
        </label>
        <label>${escapeHtml(t("emitter"))}<select name="emitter">${this._emitterOptions()}</select></label>
        ${this._renderSensor("temperature_sensor", "temperature")}
        ${this._renderSensor("humidity_sensor", "humidity")}
        <p class="muted">
          ${escapeHtml(manufacturer)} · ${escapeHtml(t("code_label", { code }))}
        </p>
        <div>${this._button(t("test_code"), { action: "change-code" }, { disabled: !this._emitters.length })}</div>
        <div class="row">
          ${this._button(t("confirm_save"), { action: "save" }, { primary: true, disabled: !this._name.trim() })}
          ${this._button(t("cancel"), { action: "cancel" })}
        </div>
      </section>`;
  }

  _renderDelete() {
    const t = this._t;
    const { name, entity_id: entity } = this._deleting;
    return `
      <section>
        <h2>${escapeHtml(t("delete_question", { name }))}</h2>
        <p>${escapeHtml(t("delete_warning", { entity }))}</p>
        <div class="row">
          ${this._button(t("delete"), { action: "delete" }, { primary: true })}
          ${this._button(t("cancel"), { action: "cancel" })}
        </div>
      </section>`;
  }

  _renderSelect() {
    const t = this._t;
    const cancel = this._button(t("cancel"), { action: "cancel" });
    if (!this._emitters.length) {
      return `
        <section>
          <p>${escapeHtml(t("no_emitters"))}</p>
          <div>${cancel}</div>
        </section>`;
    }
    const brands = this._brands
      .map(
        (brand) =>
          `<option value="${escapeHtml(brand.name)}" ${brand.name === this._brand ? "selected" : ""}>${escapeHtml(brand.name)} (${brand.code_count})</option>`,
      )
      .join("");
    return `
      <section>
        <h2>${escapeHtml(t(this._editing ? "test_code" : "add_climate"))}</h2>
        <label>${escapeHtml(t("emitter"))}<select name="emitter">${this._emitterOptions()}</select></label>
        <label>${escapeHtml(t("brand"))}<select name="brand">${brands}</select></label>
        <p class="muted">${escapeHtml(t("brand_hint"))}</p>
        <div class="row">
          ${this._button(t("start_test"), { action: "start" }, { primary: true })}
          ${cancel}
        </div>
      </section>`;
  }

  _renderExhausted() {
    const t = this._t;
    return `
      <section>
        <p>${escapeHtml(t("exhausted"))}</p>
        <div class="row">
          ${this._button(t("start_over"), { action: "restart" }, { primary: true })}
          ${this._button(t("cancel"), { action: "cancel" })}
        </div>
      </section>`;
  }

  _renderChoices(title, category, values, selected, labelOf = (value) => value) {
    if (!values.length) {
      return "";
    }
    const buttons = values
      .map((value) =>
        this._button(
          labelOf(value),
          { action: "choose", category, value },
          { selected: value === selected, disabled: this._isSending() },
        ),
      )
      .join("");
    return `<h3>${escapeHtml(title)}</h3><div class="row">${buttons}</div>`;
  }

  _isSending() {
    return this._session.sendStatus === "sending";
  }

  _renderStatus() {
    const t = this._t;
    const { sendStatus, sendError } = this._session;
    if (sendStatus === "sending") {
      return `<p class="muted" role="status">${escapeHtml(t("sending"))}</p>`;
    }
    if (sendStatus === "failed") {
      return `<p class="error" role="alert">${escapeHtml(sendError)}</p>`;
    }
    if (sendStatus === "sent") {
      return `
        <div class="row" role="status">
          <span>${escapeHtml(t("sent"))}</span>
          ${this._button(t("yes"), { action: "result", value: "yes" })}
          ${this._button(t("no"), { action: "result", value: "no" })}
        </div>`;
    }
    return "";
  }

  _renderTest() {
    const t = this._t;
    const current = this._session;
    if (current.exhausted) {
      return this._renderExhausted();
    }
    if (!current.details) {
      return "";
    }
    const { modes, fans, swings, temperatures } = session.options(current);
    const { details, selection } = current;
    const disabled = this._isSending();
    const position = t("code_position", {
      position: current.position + 1,
      total: current.codes.length,
    });
    const controls = selection
      ? `
        <h3>${escapeHtml(t("power"))}</h3>
        <div class="row">
          ${this._button(t("turn_on"), { action: "send", category: "on" }, { disabled })}
          ${this._button(t("turn_off"), { action: "send", category: "off" }, { disabled })}
        </div>
        ${this._renderChoices(t("mode"), "mode", modes, selection.mode, (mode) => t(`mode_${mode}`))}
        <h3>${escapeHtml(t("temperature"))}</h3>
        <div class="row">
          ${this._button("−", { action: "temperature", value: "-1" }, { disabled: disabled || selection.temperature === temperatures[0] })}
          <span class="temperature">${escapeHtml(selection.temperature)}°</span>
          ${this._button("+", { action: "temperature", value: "1" }, { disabled: disabled || selection.temperature === temperatures.at(-1) })}
        </div>
        ${this._renderChoices(t("fan"), "fan", fans, selection.fan)}
        ${this._renderChoices(t("swing"), "swing", swings, selection.swing)}
      `
      : `<p>${escapeHtml(t("no_commands"))}</p>`;
    return `
      <section>
        <div>
          <h2>${escapeHtml(position)}</h2>
          <p class="muted">
            ${escapeHtml(details.manufacturer)} · ${escapeHtml(t("code_label", { code: details.code }))}
            · ${escapeHtml(details.models.join(", "))}
          </p>
        </div>
        ${controls}
        ${this._renderStatus()}
      </section>
      <section>
        <div class="row spread">
          ${this._button(t("previous"), { action: "previous" }, { disabled: disabled || current.position === 0 })}
          ${this._button(t("next"), { action: "next" }, { disabled })}
        </div>
        <div class="row spread">
          ${this._button(t("save"), { action: "review" }, { primary: true, disabled: disabled || !selection })}
          ${this._button(t("cancel"), { action: "cancel" })}
        </div>
      </section>`;
  }

  _renderSave() {
    const t = this._t;
    const { failed, untested } = session.pendingSummary(this._session);
    const items = (categories) =>
      categories.map((category) => t(`category_${category}`)).join(", ");
    const lines = [];
    if (failed.length) {
      lines.push(`<p class="error">${escapeHtml(t("summary_failed", { items: items(failed) }))}</p>`);
    }
    if (untested.length) {
      lines.push(`<p>${escapeHtml(t("summary_untested", { items: items(untested) }))}</p>`);
    }
    const summary = lines.length
      ? `<h2>${escapeHtml(t("summary_title"))}</h2>${lines.join("")}`
      : "";
    return `
      <section>
        ${summary}
        <label>${escapeHtml(t("climate_name"))}
          <input name="name" value="${escapeHtml(this._name)}" data-focus-key="name" autocomplete="off">
        </label>
        <div class="row">
          ${this._button(t("confirm_save"), { action: "save" }, { primary: true, disabled: !this._name.trim() })}
          ${this._button(t("keep_testing"), { action: "keep-testing" })}
        </div>
      </section>`;
  }
}

customElements.define("better-smartir-panel", BetterSmartIRPanel);
