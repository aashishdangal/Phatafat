/**
 * The header: mode, length, layout variant, keyboard, skin and theme.
 *
 * Every control is a pill button with `aria-pressed`, so the selected state is
 * carried by markup as well as by colour. The whole bar dims to
 * `opacity: 0.25` and goes inert while a test is running and comes back when
 * it stops — opacity only, so nothing moves and no layout shifts.
 */

import type { TestLength } from "../session/session";
import { el, toggleClass } from "./dom";
import { neNum } from "./format";
import { ne } from "./strings";
import {
  LENGTH_OPTIONS,
  type InputMode,
  type LayoutVariant,
  type Skin,
  type Theme,
  type UiLanguage,
} from "./settings";

export interface ControlHandlers {
  onLanguage: (language: UiLanguage) => void;
  onMode: (mode: InputMode) => void;
  onLength: (length: TestLength) => void;
  onVariant: (variant: LayoutVariant) => void;
  onKeyboard: (show: boolean) => void;
  onSkin: (skin: Skin) => void;
  onTheme: (theme: Theme) => void;
}

function pill(label: string, attrs: Record<string, string> = {}): HTMLButtonElement {
  return el("button", {
    class: "pill",
    type: "button",
    "aria-pressed": "false",
    text: label,
    ...attrs,
  });
}

function lengthKey(length: TestLength): string {
  return length.kind === "time" ? `t${length.seconds}` : `w${length.count}`;
}

export class ControlBar {
  readonly el: HTMLElement;
  private readonly modePills = new Map<InputMode, HTMLButtonElement>();
  private readonly lengthPills = new Map<string, HTMLButtonElement>();
  private readonly variantPills = new Map<LayoutVariant, HTMLButtonElement>();
  private readonly keyboardPill: HTMLButtonElement;
  private readonly skinPill: HTMLButtonElement;
  private readonly themePill: HTMLButtonElement;
  private readonly languagePills = new Map<UiLanguage, HTMLButtonElement>();
  private readonly bar: HTMLElement;
  private dimmed = false;

  constructor(handlers: ControlHandlers) {
    const modeGroup = el("div", { class: "group", role: "group", "aria-label": ne.mode });
    for (const [mode, label] of [
      ["romanized", ne.modeRomanized],
      ["preeti", ne.modePreeti],
    ] as const) {
      const button = pill(label);
      button.addEventListener("click", () => handlers.onMode(mode));
      this.modePills.set(mode, button);
      modeGroup.append(button);
    }
    modeGroup.append(pill(ne.modeFree, { disabled: "", title: ne.comingSoon }));

    const lengthGroup = el("div", { class: "group", role: "group", "aria-label": ne.time });
    lengthGroup.append(el("span", { class: "group-label", text: ne.time }));
    for (const seconds of LENGTH_OPTIONS.times) {
      const length: TestLength = { kind: "time", seconds };
      const button = pill(neNum(seconds), { "aria-label": `${neNum(seconds)} ${ne.seconds}` });
      button.addEventListener("click", () => handlers.onLength(length));
      this.lengthPills.set(lengthKey(length), button);
      lengthGroup.append(button);
    }
    lengthGroup.append(el("span", { class: "group-label", text: ne.words }));
    for (const count of LENGTH_OPTIONS.counts) {
      const length: TestLength = { kind: "words", count };
      const button = pill(neNum(count), { "aria-label": `${neNum(count)} ${ne.words}` });
      button.addEventListener("click", () => handlers.onLength(length));
      this.lengthPills.set(lengthKey(length), button);
      lengthGroup.append(button);
    }

    // The layouts are a permanent, named choice rather than a chooser: wrapped
    // lines is the default, and the passage layout is what Lok Sewa practice
    // actually looks like, so both earn a real label instead of a digit.
    const variantGroup = el("div", { class: "group", role: "group", "aria-label": ne.layout });
    const variantLabels: [LayoutVariant, string, string | undefined][] = [
      ["wrapped", ne.layoutWrapped, undefined],
      ["focus", ne.layoutFocus, undefined],
      ["passage", ne.layoutPassage, ne.layoutPassageHint],
    ];
    for (const [variant, label, hint] of variantLabels) {
      const button = pill(label, {
        "aria-label": `${ne.layout}: ${label}`,
        title: hint ?? label,
      });
      button.addEventListener("click", () => handlers.onVariant(variant));
      this.variantPills.set(variant, button);
      variantGroup.append(button);
    }

    this.keyboardPill = pill(ne.keyboard, { title: "Ctrl+K" });
    this.keyboardPill.addEventListener("click", () => {
      handlers.onKeyboard(this.keyboardPill.getAttribute("aria-pressed") !== "true");
    });

    this.skinPill = pill(ne.skinAlive);
    this.skinPill.addEventListener("click", () => {
      handlers.onSkin(this.skinPill.dataset.skin === "serious" ? "alive" : "serious");
    });

    this.themePill = pill(ne.themeDark);
    this.themePill.addEventListener("click", () => {
      handlers.onTheme(this.themePill.dataset.theme === "light" ? "dark" : "light");
    });

    // Language: three segments with one crimson thumb that glides behind
    // the active one. Each segment names its own language, so the switch
    // reads the same whichever language is on.
    this.languageThumb = el("span", { class: "lang-switch__thumb", "aria-hidden": "true" });
    this.languageSwitch = el(
      "div",
      { class: "lang-switch", role: "radiogroup", "aria-label": ne.language },
      [this.languageThumb],
    );
    const order: UiLanguage[] = [];
    for (const [language, label, name] of [
      ["ne", "ने", "नेपाली"],
      ["mix", "ने+En", "नेपाली + English"],
      ["en", "En", "English"],
    ] as const) {
      order.push(language);
      const button = el("button", {
        class: "lang-switch__pos",
        type: "button",
        role: "radio",
        "aria-checked": "false",
        tabindex: "-1",
        // The visible label first, so voice control can say it (WCAG 2.5.3).
        "aria-label": `${label} — ${name}`,
        "data-name": name,
        text: label,
      });
      button.addEventListener("click", () => this.chooseLanguage(language, handlers));
      this.languagePills.set(language, button);
      this.languageSwitch.append(button);
    }
    // Radio-group keys: arrows move the choice, as in any radio group.
    this.languageSwitch.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      const next = order[(order.indexOf(this.language) + step + order.length) % order.length];
      if (next !== undefined) this.chooseLanguage(next, handlers);
    });
    // Labels change width once the Devanagari webfont arrives.
    void document.fonts?.ready.then(() => this.placeThumb());

    const tools = el("div", { class: "group group--tools" }, [
      this.keyboardPill,
      this.skinPill,
      this.themePill,
    ]);

    this.bar = el("div", { class: "controls" }, [modeGroup, lengthGroup, variantGroup, tools]);
    this.el = el("header", { class: "top" }, [
      // App-wide, not a test option: the language sits with the name.
      el("div", { class: "top-row" }, [
        el("div", { class: "brand" }, [
          el("h1", { class: "brand-name", text: ne.appName }),
          el("span", { class: "brand-tag", text: ne.tagline }),
        ]),
        this.languageSwitch,
      ]),
      this.bar,
    ]);
  }

  private readonly languageSwitch: HTMLElement;
  private readonly languageThumb: HTMLElement;
  private language: UiLanguage = "mix";

  /**
   * Glide the thumb to the new language, then hand over. The handler reloads
   * the page, so it waits for the glide to finish: the user sees it move.
   */
  private chooseLanguage(language: UiLanguage, handlers: ControlHandlers): void {
    if (language === this.language) return;
    this.setLanguage(language);
    this.languagePills.get(language)?.focus();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => handlers.onLanguage(language), still ? 0 : 240);
  }

  /** Put the thumb behind the active segment. Layout read on change only. */
  private placeThumb(): void {
    const active = this.languagePills.get(this.language);
    if (active === undefined || active.offsetWidth === 0) return;
    this.languageThumb.style.setProperty("--thumb-x", `${active.offsetLeft}px`);
    this.languageThumb.style.setProperty("--thumb-w", `${active.offsetWidth}px`);
  }

  setMode(mode: InputMode): void {
    for (const [m, button] of this.modePills) {
      button.setAttribute("aria-pressed", m === mode ? "true" : "false");
    }
  }

  setLanguage(language: UiLanguage): void {
    this.language = language;
    for (const [l, button] of this.languagePills) {
      button.setAttribute("aria-checked", l === language ? "true" : "false");
      button.tabIndex = l === language ? 0 : -1; // one tab stop for the group
    }
    this.placeThumb();
    // The first placement happens before anything is seen: no glide in from
    // the left edge. Transitions switch on from the next frame.
    if (!this.languageSwitch.classList.contains("is-ready")) {
      requestAnimationFrame(() => this.languageSwitch.classList.add("is-ready"));
    }
  }

  setLength(length: TestLength): void {
    const key = lengthKey(length);
    for (const [k, button] of this.lengthPills) {
      button.setAttribute("aria-pressed", k === key ? "true" : "false");
    }
  }

  setVariant(variant: LayoutVariant): void {
    for (const [v, button] of this.variantPills) {
      button.setAttribute("aria-pressed", v === variant ? "true" : "false");
    }
  }

  setKeyboard(show: boolean): void {
    this.keyboardPill.setAttribute("aria-pressed", show ? "true" : "false");
  }

  setSkin(skin: Skin): void {
    this.skinPill.dataset.skin = skin;
    // The button shows the current value. Its accessible name contains that
    // visible word (WCAG 2.5.3), and it is not aria-pressed: "pressed" says
    // nothing about which of two skins is on.
    const label = skin === "serious" ? ne.skinSerious : ne.skinAlive;
    this.skinPill.textContent = label;
    this.skinPill.removeAttribute("aria-pressed");
    this.skinPill.setAttribute("aria-label", `${ne.skin}: ${label}`);
  }

  setTheme(theme: Theme): void {
    this.themePill.dataset.theme = theme;
    const label = theme === "light" ? ne.themeLight : ne.themeDark;
    this.themePill.textContent = label;
    this.themePill.removeAttribute("aria-pressed");
    this.themePill.setAttribute("aria-label", `${ne.theme}: ${label}`);
  }

  /** Dim and disable while typing; restore when the test stops. */
  setDimmed(dimmed: boolean): void {
    if (dimmed === this.dimmed) return;
    this.dimmed = dimmed;
    toggleClass(this.bar, "is-dimmed", dimmed);
    this.bar.inert = dimmed;
    // Switching language mid-test would reload the page: off while typing.
    toggleClass(this.languageSwitch, "is-dimmed", dimmed);
    this.languageSwitch.inert = dimmed;
  }
}
