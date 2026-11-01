/**
 * The header: mode, length, layout variant, keyboard and skin.
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
import { LENGTH_OPTIONS, type LayoutVariant, type Skin } from "./settings";

export interface ControlHandlers {
  onLength: (length: TestLength) => void;
  onVariant: (variant: LayoutVariant) => void;
  onKeyboard: (show: boolean) => void;
  onSkin: (skin: Skin) => void;
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
  private readonly lengthPills = new Map<string, HTMLButtonElement>();
  private readonly variantPills = new Map<LayoutVariant, HTMLButtonElement>();
  private readonly keyboardPill: HTMLButtonElement;
  private readonly skinPill: HTMLButtonElement;
  private readonly bar: HTMLElement;
  private dimmed = false;

  constructor(handlers: ControlHandlers) {
    const modeGroup = el("div", { class: "group", role: "group", "aria-label": ne.mode }, [
      pill(ne.modeRomanized, { "aria-pressed": "true" }),
      pill(ne.modePreeti, { disabled: "", title: ne.comingSoon }),
      pill(ne.modeFree, { disabled: "", title: ne.comingSoon }),
    ]);

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

    const variantGroup = el("div", { class: "group", role: "group", "aria-label": ne.layout });
    const variantLabels: [LayoutVariant, string, string][] = [
      ["wrapped", "१", ne.layoutWrapped],
      ["focus", "२", ne.layoutFocus],
      ["passage", "३", ne.layoutPassage],
    ];
    for (const [variant, digit, label] of variantLabels) {
      const button = pill(digit, { "aria-label": `${ne.layout}: ${label}`, title: label });
      button.classList.add("pill--digit");
      button.addEventListener("click", () => handlers.onVariant(variant));
      this.variantPills.set(variant, button);
      variantGroup.append(button);
    }

    this.keyboardPill = pill(ne.keyboard, { title: "Ctrl+K" });
    this.keyboardPill.addEventListener("click", () => {
      handlers.onKeyboard(this.keyboardPill.getAttribute("aria-pressed") !== "true");
    });

    this.skinPill = pill(ne.skinAlive, { "aria-label": ne.skin });
    this.skinPill.addEventListener("click", () => {
      handlers.onSkin(this.skinPill.dataset.skin === "serious" ? "alive" : "serious");
    });

    const tools = el("div", { class: "group group--tools" }, [this.keyboardPill, this.skinPill]);

    this.bar = el("div", { class: "controls" }, [modeGroup, lengthGroup, variantGroup, tools]);
    this.el = el("header", { class: "top" }, [
      el("div", { class: "brand" }, [
        el("span", { class: "brand-name", text: ne.appName }),
        el("span", { class: "brand-tag", text: ne.tagline }),
      ]),
      this.bar,
    ]);
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
    this.skinPill.textContent = skin === "serious" ? ne.skinSerious : ne.skinAlive;
    this.skinPill.setAttribute("aria-pressed", skin === "serious" ? "true" : "false");
  }

  /** Dim and disable while typing; restore when the test stops. */
  setDimmed(dimmed: boolean): void {
    if (dimmed === this.dimmed) return;
    this.dimmed = dimmed;
    toggleClass(this.bar, "is-dimmed", dimmed);
    this.bar.inert = dimmed;
  }
}
