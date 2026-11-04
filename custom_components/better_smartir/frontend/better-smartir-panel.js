// Sidebar panel of BetterSmartIR. A plain Web Component: no build step and no
// external libraries, so it also works without internet.

import { translator } from "./i18n.js";
import { icon } from "./icons.js";
import * as session from "./session.js";
import { STYLES } from "./styles.js";
import { TEST_ENTITY, applyAction, climateOptions, virtualState } from "./virtual_climate.js";

const API_PREFIX = "better_smartir";
// The entity appears after the reload that follows saving a climate.
const REFRESH_AFTER_SAVE_MS = 1500;
// The card loads on demand, so a slow connection needs some margin.
const CONTROL_CHECK_MS = 5000;
const CONTROL_CONTEXTS = ["states", "hassApi"];

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
    // The live region stays in place: screen readers ignore one that is redrawn.
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div id="content"></div>
      <div id="live" class="visually-hidden" role="status"></div>
    `;
    this._content = this.shadowRoot.getElementById("content");
    this._live = this.shadowRoot.getElementById("live");
    this._focusKey = null;
    this._focusVisible = false;
    this._focusPending = false;
    this._control = null;
    this._controlFailed = false;
    this._mountId = 0;
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
    if (this._control) {
      this._onHassChanged();
    }
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
      this._controlFailed = false;
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
    this._removeControl();
    this._controlFailed = false;
    this._session = move(this._session);
    if (this._session.exhausted) {
      this._render();
      return undefined;
    }
    return this._run(() => this._loadCode());
  }

  _units() {
    return {
      unit: this._hass.config?.unit_system?.temperature,
      precision: this._session.details.precision,
    };
  }

  _sensorValue(entityId) {
    const value = Number.parseFloat(this._hass.states[entityId]?.state);
    return Number.isNaN(value) ? null : value;
  }

  // Only a climate that already exists has sensors.
  _sensorValues() {
    return {
      currentTemperature: this._sensorValue(this._editing && this._sensors.temperature_sensor),
      currentHumidity: this._sensorValue(this._editing && this._sensors.humidity_sensor),
    };
  }

  _virtualState() {
    const { details, climate } = this._session;
    return virtualState(details, climate, { ...this._units(), ...this._sensorValues() });
  }

  // The state keeps its identity unless it changes, or the card would redraw every time.
  _onHassChanged() {
    const { attributes } = this._control.state;
    const { currentTemperature, currentHumidity } = this._sensorValues();
    if (
      attributes.current_temperature !== currentTemperature ||
      attributes.current_humidity !== currentHumidity
    ) {
      this._control.state = this._virtualState();
    }
    this._control.card.hass = this._controlHass();
    this._notifyControl();
  }

  _controlStates() {
    return { ...this._hass.states, [TEST_ENTITY]: this._control.state };
  }

  _controlHass() {
    return {
      ...this._hass,
      states: this._controlStates(),
      callService: (...args) => this._controlService(...args),
    };
  }

  _notifyControl() {
    const states = this._controlStates();
    this._control.subscribers.forEach((unsubscribe, subscriber) =>
      subscriber(states, unsubscribe),
    );
  }

  _refreshControl() {
    if (this._control) {
      this._control.state = this._virtualState();
      this._control.card.hass = this._controlHass();
      this._notifyControl();
    }
  }

  // The card reads its entity and calls services through these two contexts. Any other
  // context goes on to Home Assistant, so the card keeps the real theme and language.
  _onContextRequest(event) {
    this._control.contexts.add(event.context);
    if (event.context === "states") {
      event.stopImmediatePropagation();
      // The consumer drops its subscription if it gets a different unsubscribe.
      const { callback } = event;
      const { subscribers } = this._control;
      const unsubscribe = subscribers.get(callback) ?? (() => subscribers.delete(callback));
      if (event.subscribe) {
        subscribers.set(callback, unsubscribe);
      }
      callback(this._controlStates(), unsubscribe);
    } else if (event.context === "hassApi") {
      event.stopImmediatePropagation();
      event.callback(this._controlHass(), () => {});
    }
  }

  _controlConfig() {
    const { fans, swings } = climateOptions(this._session.details);
    const features = [{ type: "climate-hvac-modes", style: "dropdown" }];
    if (fans.length) {
      features.push({ type: "climate-fan-modes", style: "dropdown" });
    }
    if (swings.length) {
      features.push({ type: "climate-swing-modes", style: "dropdown" });
    }
    return { type: "thermostat", entity: TEST_ENTITY, features };
  }

  async _mountControl(slot) {
    this._mountId += 1;
    const mountId = this._mountId;
    let helpers;
    try {
      helpers = await window.loadCardHelpers();
    } catch {
      this._controlUnavailable();
      return;
    }
    if (mountId !== this._mountId || !slot.isConnected) {
      return;
    }
    const box = document.createElement("div");
    const contexts = new Set();
    this._control = { box, contexts, state: this._virtualState(), subscribers: new Map() };
    box.addEventListener("context-request", (event) => this._onContextRequest(event));
    box.addEventListener("hass-more-info", (event) => event.stopPropagation());
    this._control.card = helpers.createCardElement(this._controlConfig());
    this._control.card.hass = this._controlHass();
    box.append(this._control.card);
    slot.append(box);
    setTimeout(() => {
      const connected = CONTROL_CONTEXTS.every((context) => contexts.has(context));
      if (mountId === this._mountId && !connected) {
        this._controlUnavailable();
      }
    }, CONTROL_CHECK_MS);
  }

  // A card that is not connected to the test would look fine and do nothing.
  _controlUnavailable() {
    this._removeControl();
    this._controlFailed = true;
    this._render();
  }

  _removeControl() {
    this._mountId += 1;
    this._control?.box.remove();
    this._control = null;
  }

  _syncControl() {
    const slot = this._content.querySelector("#control-slot");
    if (slot && this._session?.climate && !this._controlFailed) {
      this._mountControl(slot);
    } else {
      this._removeControl();
    }
  }

  async _controlService(domain, service, data) {
    const accepted = domain === "climate" && data?.entity_id === TEST_ENTITY;
    if (accepted && this._session?.climate) {
      await this._applyControlAction(service, data);
    }
    return { context: { id: "better_smartir_test" } };
  }

  async _applyControlAction(service, data) {
    const result = applyAction(this._session.climate, service, data, this._units());
    if (!result || this._isSending()) {
      this._refreshControl();
      return;
    }
    if (result.action) {
      await this._send(result);
    } else {
      this._session = session.storeClimate(this._session, result.climate);
    }
    this._refreshControl();
  }

  async _send({ action, category, climate }) {
    const request = session.sendRequest(this._session, action, climate);
    this._session = session.sendStarted(this._session, category, climate);
    this._live.textContent = this._t("sending");
    this._render();
    try {
      await this._call("test/send", request);
      this._session = session.sendSucceeded(this._session);
      this._live.textContent = this._t("sent");
    } catch (error) {
      this._session = session.sendFailed(this._session, this._errorText(error));
      this._live.textContent = "";
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
    this._removeControl();
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
    const { action, climate, value } = button.dataset;
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
    this._rememberFocus();
    if (this._view === "test" && this._control?.box.isConnected) {
      this._renderTestParts();
      this._restoreFocus();
      return;
    }
    const views = {
      list: () => this._renderList(),
      edit: () => this._renderEdit(),
      delete: () => this._renderDelete(),
      select: () => this._renderSelect(),
      test: () => this._renderTest(),
      save: () => this._renderSave(),
    };
    const error = this._error
      ? `<section class="status-failed" role="alert">
           <div class="status-line">${icon("alertCircle")}<span>${escapeHtml(this._error)}</span></div>
         </section>`
      : "";
    const menu = this._narrow
      ? `<button data-action="menu" aria-label="Menu">${icon("menu")}</button>`
      : "";
    this._content.innerHTML = `
      <header>${menu}<span>BetterSmartIR</span></header>
      <main class="${this._view === "test" ? "wide" : ""}">${error}${views[this._view]()}</main>
    `;
    this._restoreFocus();
    this._syncControl();
  }

  _rememberFocus() {
    const active = this.shadowRoot.activeElement;
    if (active?.dataset?.focusKey) {
      this._focusKey = active.dataset.focusKey;
      this._focusVisible = active.matches(":focus-visible");
    } else if (!this._focusPending) {
      this._focusKey = null;
    }
  }

  // A button disabled while sending gets the focus back when the send ends. A
  // control that no longer exists hands it to the main action, but only for people
  // using the keyboard: moving it would make the page jump for everyone else.
  _restoreFocus() {
    this._focusPending = false;
    if (!this._focusKey) {
      return;
    }
    const target = this._content.querySelector(
      `[data-focus-key="${CSS.escape(this._focusKey)}"]`,
    );
    if (target && !target.disabled) {
      target.focus({ preventScroll: true });
    } else if (this._session?.sendStatus === "sending") {
      this._focusPending = true;
    } else if (this._focusVisible) {
      const main = this._content.querySelector("button.primary:not(:disabled)");
      (main ?? this._content.querySelector("input, select"))?.focus();
    }
  }

  // variant: "primary" or "danger".
  _button(label, attributes, { variant = "", iconName, disabled = false } = {}) {
    const data = Object.entries(attributes)
      .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
      .join(" ");
    const focusKey = Object.values(attributes).join(":");
    return `
      <button class="${variant}" ${data} data-focus-key="${escapeHtml(focusKey)}" ${disabled ? "disabled" : ""}>
        ${iconName ? icon(iconName) : ""}${escapeHtml(label)}
      </button>`;
  }

  _renderList() {
    const t = this._t;
    const items = this._climates
      .map(
        (climate) => `
          <li>
            <div class="climate">
              <span class="badge">${icon("airConditioner")}</span>
              <div>
                <strong>${escapeHtml(climate.name)}</strong>
                <p class="muted">
                  ${escapeHtml(climate.manufacturer)} · ${escapeHtml(t("code_label", { code: climate.code }))}
                  · ${escapeHtml(climate.entity_id ?? "…")}
                </p>
              </div>
            </div>
            <div class="row">
              ${this._button(t("edit"), { action: "edit", climate: climate.climate_id }, { iconName: "pencil" })}
              ${this._button(t("delete"), { action: "ask-delete", climate: climate.climate_id }, { iconName: "trash" })}
            </div>
          </li>`,
      )
      .join("");
    const empty = `
      <div class="empty">
        <span class="badge">${icon("airConditioner")}</span>
        <p class="muted">${escapeHtml(t("no_climates"))}</p>
      </div>`;
    return `
      <section>
        ${items ? `<ul>${items}</ul>` : empty}
        <div>${this._button(t("add_climate"), { action: "add" }, { variant: "primary", iconName: "plus" })}</div>
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
    return `<label>${escapeHtml(t(key))}<select name="${key}" data-focus-key="${key}">${options}</select></label>`;
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
        <label>${escapeHtml(t("emitter"))}<select name="emitter" data-focus-key="emitter">${this._emitterOptions()}</select></label>
        ${this._renderSensor("temperature_sensor", "temperature")}
        ${this._renderSensor("humidity_sensor", "humidity")}
      </section>
      <section>
        <p class="muted">
          ${escapeHtml(manufacturer)} · ${escapeHtml(t("code_label", { code }))}
        </p>
        <div>${this._button(t("test_code"), { action: "change-code" }, { iconName: "play", disabled: !this._emitters.length })}</div>
      </section>
      <div class="row spread">
        ${this._button(t("confirm_save"), { action: "save" }, { variant: "primary", iconName: "contentSave", disabled: !this._name.trim() })}
        ${this._button(t("cancel"), { action: "cancel" }, { iconName: "close" })}
      </div>`;
  }

  _renderDelete() {
    const t = this._t;
    const { name, entity_id: entity } = this._deleting;
    return `
      <section>
        <h2>${escapeHtml(t("delete_question", { name }))}</h2>
        <p>${escapeHtml(t("delete_warning", { entity }))}</p>
        <div class="row spread">
          ${this._button(t("delete"), { action: "delete" }, { variant: "danger", iconName: "trash" })}
          ${this._button(t("cancel"), { action: "cancel" }, { iconName: "close" })}
        </div>
      </section>`;
  }

  _renderSelect() {
    const t = this._t;
    const cancel = this._button(t("cancel"), { action: "cancel" }, { iconName: "close" });
    if (!this._emitters.length) {
      return `
        <section>
          <div class="empty">
            <span class="badge">${icon("alertCircle")}</span>
            <p>${escapeHtml(t("no_emitters"))}</p>
          </div>
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
        <label>${escapeHtml(t("emitter"))}<select name="emitter" data-focus-key="emitter">${this._emitterOptions()}</select></label>
        <label>${escapeHtml(t("brand"))}<select name="brand" data-focus-key="brand">${brands}</select></label>
        <p class="muted">${escapeHtml(t("brand_hint"))}</p>
        <div class="row spread">
          ${this._button(t("start_test"), { action: "start" }, { variant: "primary", iconName: "play" })}
          ${cancel}
        </div>
      </section>`;
  }

  _renderExhausted() {
    const t = this._t;
    return `
      <section>
        <div class="empty">
          <span class="badge">${icon("restart")}</span>
          <p>${escapeHtml(t("exhausted"))}</p>
        </div>
        <div class="row spread">
          ${this._button(t("start_over"), { action: "restart" }, { variant: "primary", iconName: "restart" })}
          ${this._button(t("cancel"), { action: "cancel" }, { iconName: "close" })}
        </div>
      </section>`;
  }

  _isSending() {
    return this._session.sendStatus === "sending";
  }

  _renderStatus(primary) {
    const t = this._t;
    const { sendStatus, sendError } = this._session;
    const line = (iconName, text) =>
      `<div class="status-line">${icon(iconName)}<span>${escapeHtml(text)}</span></div>`;
    if (sendStatus === "failed") {
      return `
        <section class="status status-failed enter" role="alert">
          ${line("alertCircle", sendError)}
        </section>`;
    }
    if (sendStatus === "sent") {
      return `
        <section class="status status-sent enter">
          ${line("checkCircle", t("sent"))}
          <div class="row">
            ${this._button(t("yes"), { action: "result", value: "yes" }, { variant: primary === "worked" ? "primary" : "", iconName: "check" })}
            ${this._button(t("no"), { action: "result", value: "no" }, { iconName: "close" })}
          </div>
        </section>`;
    }
    if (sendStatus === "sending") {
      return `<section class="status status-sending">${line("loading", t("sending"))}</section>`;
    }
    return `<section class="status status-idle">${line("airConditioner", t("status_idle"))}</section>`;
  }

  _renderTestSummary() {
    const t = this._t;
    const { details, position, codes } = this._session;
    const title = t("code_position", { position: position + 1, total: codes.length });
    const progress = ((position + 1) / codes.length) * 100;
    return `
      <section>
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p class="muted">
            ${escapeHtml(details.manufacturer)} · ${escapeHtml(t("code_label", { code: details.code }))}
            · ${escapeHtml(details.models.join(", "))}
          </p>
        </div>
        <div class="progress"><div style="width: ${progress}%"></div></div>
      </section>`;
  }

  _renderTestStatus(primary) {
    if (this._controlFailed) {
      return `<section role="alert"><p>${escapeHtml(this._t("control_unavailable"))}</p></section>`;
    }
    return this._session.climate
      ? this._renderStatus(primary)
      : `<section><p>${escapeHtml(this._t("no_commands"))}</p></section>`;
  }

  _renderTestFooter(primary) {
    const t = this._t;
    const { climate, position } = this._session;
    const disabled = this._isSending();
    const variantOf = (action) => (primary === action ? "primary" : "");
    return `
      <section>
        <div class="row spread">
          ${this._button(t("previous"), { action: "previous" }, { iconName: "chevronLeft", disabled: disabled || position === 0 })}
          ${this._button(t("next"), { action: "next" }, { variant: variantOf("next"), iconName: "chevronRight", disabled })}
        </div>
        <div class="row spread">
          ${this._button(t("save"), { action: "review" }, { variant: variantOf("save"), iconName: "contentSave", disabled: disabled || !climate || this._controlFailed })}
          ${this._button(t("cancel"), { action: "cancel" }, { iconName: "close" })}
        </div>
      </section>`;
  }

  // The control stays in place: drawing it again would interrupt the dial.
  _renderTestParts() {
    const primary = session.primaryAction(this._session);
    this._content.querySelector("#test-status").innerHTML = this._renderTestStatus(primary);
    this._content.querySelector("#test-footer").innerHTML = this._renderTestFooter(primary);
  }

  _renderTest() {
    const current = this._session;
    if (current.exhausted) {
      return this._renderExhausted();
    }
    if (!current.details) {
      return "";
    }
    const primary = session.primaryAction(current);
    return `
      <div class="test-layout">
        <div class="test-summary">${this._renderTestSummary()}</div>
        <div id="control-slot" class="test-control"></div>
        <div id="test-status" class="test-status">${this._renderTestStatus(primary)}</div>
        <div id="test-footer" class="test-footer">${this._renderTestFooter(primary)}</div>
      </div>`;
  }

  _renderSave() {
    const t = this._t;
    const { failed, untested } = session.pendingSummary(this._session);
    const items = (categories) =>
      categories.map((category) => t(`category_${category}`)).join(", ");
    const lines = [];
    if (failed.length) {
      lines.push(
        `<div class="status-line summary-failed">${icon("alertCircle")}<span>${escapeHtml(t("summary_failed", { items: items(failed) }))}</span></div>`,
      );
    }
    if (untested.length) {
      lines.push(
        `<div class="status-line summary-untested">${icon("thermostat")}<span>${escapeHtml(t("summary_untested", { items: items(untested) }))}</span></div>`,
      );
    }
    const summary = lines.length
      ? `<section><h2>${escapeHtml(t("summary_title"))}</h2>${lines.join("")}</section>`
      : "";
    return `
      ${summary}
      <section>
        <label>${escapeHtml(t("climate_name"))}
          <input name="name" value="${escapeHtml(this._name)}" data-focus-key="name" autocomplete="off">
        </label>
        <div class="row spread">
          ${this._button(t("confirm_save"), { action: "save" }, { variant: "primary", iconName: "contentSave", disabled: !this._name.trim() })}
          ${this._button(t("keep_testing"), { action: "keep-testing" }, { iconName: "chevronLeft" })}
        </div>
      </section>`;
  }
}

// A client open during an update loads the new version next to the old one.
if (!customElements.get("better-smartir-panel")) {
  customElements.define("better-smartir-panel", BetterSmartIRPanel);
}
