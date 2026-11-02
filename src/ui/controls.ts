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
} from "./settings";

export interface ControlHandlers {
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

    const tools = el("div", { class: "group group--tools" }, [
      this.keyboardPill,
      this.skinPill,
      this.themePill,
    ]);

    this.bar = el("div", { class: "controls" }, [modeGroup, lengthGroup, variantGroup, tools]);
    this.el = el("header", { class: "top" }, [
      el("div", { class: "brand" }, [
        el("h1", { class: "brand-name", text: ne.appName }),
        el("span", { class: "brand-tag", text: ne.tagline }),
      ]),
      this.bar,
    ]);
  }

  setMode(mode: InputMode): void {
    for (const [m, button] of this.modePills) {
      button.setAttribute("aria-pressed", m === mode ? "true" : "false");
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
  }
}
