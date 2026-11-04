// Sidebar panel of BetterSmartIR. A plain Web Component: no build step and no
// external libraries, so it also works without internet.

import { translator } from "./i18n.js";
import { DEFAULT_MODE_ICON, MODE_ICONS, icon } from "./icons.js";
import * as session from "./session.js";
import { STYLES } from "./styles.js";

const API_PREFIX = "better_smartir";
// The entity appears after the reload that follows saving a climate.
const REFRESH_AFTER_SAVE_MS = 1500;

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
    this._sendKey = null;
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
    const { action, category, climate, focusKey, value } = button.dataset;
    this._sendKey = focusKey;
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
    this._rememberFocus();
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

  // variant: "primary", "danger", "option" or "round". An option also tells whether
  // it is selected. A button without visible text needs a name.
  _button(
    label,
    attributes,
    { variant = "", modeClass = "", iconName, name, selected, disabled = false } = {},
  ) {
    const data = Object.entries(attributes)
      .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
      .join(" ");
    const focusKey = Object.values(attributes).join(":");
    const sending = this._session?.sendStatus === "sending" && focusKey === this._sendKey;
    const pressed = selected === undefined ? "" : `aria-pressed="${selected}"`;
    const accessibleName = name ? `aria-label="${escapeHtml(name)}"` : "";
    return `
      <button class="${variant} ${modeClass} ${sending ? "sending" : ""}" ${data} data-focus-key="${escapeHtml(focusKey)}"
        ${pressed} ${accessibleName} ${disabled ? "disabled" : ""}>
        ${sending ? icon("loading") : iconName ? icon(iconName) : ""}${escapeHtml(label)}${selected ? icon("check") : ""}
      </button>`;
  }

  _modeClass(mode) {
    return `mode-${MODE_ICONS[mode] ? mode : "other"}`;
  }

  _modeIcon(mode) {
    return MODE_ICONS[mode] ?? DEFAULT_MODE_ICON;
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

  _renderChoices(title, category, values, selected, optionsOf) {
    if (!values.length) {
      return "";
    }
    const buttons = values
      .map((value) => {
        const { label = value, ...options } = optionsOf?.(value) ?? {};
        return this._button(
          label,
          { action: "choose", category, value },
          {
            variant: "option",
            selected: value === selected,
            disabled: this._isSending(),
            ...options,
          },
        );
      })
      .join("");
    return `<div class="group"><h3>${escapeHtml(title)}</h3><div class="row">${buttons}</div></div>`;
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
      return `<section class="status">${line("loading", t("sending"))}</section>`;
    }
    return `<section class="status status-idle">${line("airConditioner", t("status_idle"))}</section>`;
  }

  _renderHero(selection, temperatures, disabled) {
    const t = this._t;
    const { mode, temperature } = selection;
    return `
      <section class="hero ${this._modeClass(mode)} ${disabled ? "sending" : ""}">
        <div class="hero-mode">${icon(this._modeIcon(mode))}<span>${escapeHtml(t(`mode_${mode}`))}</span></div>
        <div class="hero-controls">
          ${this._button("", { action: "temperature", value: "-1" }, { variant: "round", iconName: "minus", name: t("temperature_down"), disabled: disabled || temperature === temperatures[0] })}
          <span class="temperature">${escapeHtml(temperature)}°</span>
          ${this._button("", { action: "temperature", value: "1" }, { variant: "round", iconName: "plus", name: t("temperature_up"), disabled: disabled || temperature === temperatures.at(-1) })}
        </div>
      </section>`;
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
    const primary = session.primaryAction(current);
    const variantOf = (action) => (primary === action ? "primary" : "");
    const position = t("code_position", {
      position: current.position + 1,
      total: current.codes.length,
    });
    const progress = ((current.position + 1) / current.codes.length) * 100;
    const summary = `
      <section>
        <div>
          <h2>${escapeHtml(position)}</h2>
          <p class="muted">
            ${escapeHtml(details.manufacturer)} · ${escapeHtml(t("code_label", { code: details.code }))}
            · ${escapeHtml(details.models.join(", "))}
          </p>
        </div>
        <div class="progress"><div style="width: ${progress}%"></div></div>
      </section>`;
    const left = selection
      ? `${this._renderHero(selection, temperatures, disabled)}${this._renderStatus(primary)}`
      : `<section><p>${escapeHtml(t("no_commands"))}</p></section>`;
    const controls = selection
      ? `
        <section>
          <div class="group">
            <h3>${escapeHtml(t("power"))}</h3>
            <div class="row">
              ${this._button(t("turn_on"), { action: "send", category: "on" }, { variant: variantOf("on"), iconName: "power", disabled })}
              ${this._button(t("turn_off"), { action: "send", category: "off" }, { iconName: "powerOff", disabled })}
            </div>
          </div>
          ${this._renderChoices(t("mode"), "mode", modes, selection.mode, (mode) => ({
            label: t(`mode_${mode}`),
            iconName: this._modeIcon(mode),
            modeClass: this._modeClass(mode),
          }))}
          ${this._renderChoices(t("fan"), "fan", fans, selection.fan)}
          ${this._renderChoices(t("swing"), "swing", swings, selection.swing)}
        </section>`
      : "";
    return `
      <div class="test-layout">
        <div class="test-column">${summary}${left}</div>
        <div class="test-column">${controls}</div>
        <section class="test-footer">
          <div class="row spread">
            ${this._button(t("previous"), { action: "previous" }, { iconName: "chevronLeft", disabled: disabled || current.position === 0 })}
            ${this._button(t("next"), { action: "next" }, { variant: variantOf("next"), iconName: "chevronRight", disabled })}
          </div>
          <div class="row spread">
            ${this._button(t("save"), { action: "review" }, { variant: variantOf("save"), iconName: "contentSave", disabled: disabled || !selection })}
            ${this._button(t("cancel"), { action: "cancel" }, { iconName: "close" })}
          </div>
        </section>
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
