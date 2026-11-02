/**
 * The header.
 *
 * Two kinds of choice, kept apart because they are used differently:
 *
 *   - The **test bar**, centred: what this test is. Input (Roman | Preeti),
 *     test (Words | Passage | Free | Lok Sewa) and length (a time/words unit
 *     toggle, then that unit's numbers). Changed often, always in view.
 *   - **Quick settings**, top right and always visible: the on-screen
 *     keyboard, light/dark, and the interface language.
 *   - A small **settings panel** behind one button for the set-once rest:
 *     layout (for the Words test) and style.
 *
 * Every choice is the same Segmented control, so the whole menu reads as one
 * system. While a test runs, the bar and the settings button dim to a whisper
 * and go inert (opacity only: nothing moves).
 */

import type { TestLength } from "../session/session";
import { el, toggleClass } from "./dom";
import { neNum } from "./format";
import { Segmented } from "./segmented";
import { ne } from "./strings";
import {
  LENGTH_OPTIONS,
  type InputMode,
  type LayoutVariant,
  type Skin,
  type TestType,
  type Theme,
  type UiLanguage,
} from "./settings";

export interface ControlHandlers {
  onInput: (mode: InputMode) => void;
  onTest: (test: TestType) => void;
  onLength: (length: TestLength) => void;
  onLayout: (layout: LayoutVariant) => void;
  onKeyboard: (show: boolean) => void;
  onSkin: (skin: Skin) => void;
  onTheme: (theme: Theme) => void;
  onLanguage: (language: UiLanguage) => void;
}

type Unit = "time" | "words";
/** The bar also shows Lok Sewa, greyed out until it exists. */
type TestChoice = TestType | "loksewa";

const SVG = "http://www.w3.org/2000/svg";

/**
 * One line-icon set, drawn here so the bar needs no icon library. Strokes
 * are `currentColor` and non-scaling, so they render at 1.5px beside regular
 * text at any size (better-ui: icon stroke matches text weight).
 */
function icon(paths: readonly string[], extraClass = ""): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", `icon ${extraClass}`.trim());
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", d);
    path.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(path);
  }
  return svg;
}

const ICON_SLIDERS = ["M4 7h9M17 7h3M4 17h3M11 17h9", "M15 5v4M9 15v4"];
const ICON_KEYBOARD = [
  "M3.5 6.5h17a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z",
  "M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8",
];
const ICON_MOON = ["M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"];
const ICON_SUN = [
  "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  "M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4",
];

function divider(): HTMLElement {
  return el("span", { class: "testbar__divider", "aria-hidden": "true" });
}

export class ControlBar {
  readonly el: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private dimmed = false;

  private readonly input: Segmented<InputMode>;
  private readonly test: Segmented<TestChoice>;
  private readonly unit: Segmented<Unit>;
  private readonly times: Segmented<string>;
  private readonly counts: Segmented<string>;
  private readonly keyboardButton: HTMLButtonElement;
  private readonly themeButton: HTMLButtonElement;
  private readonly layout: Segmented<LayoutVariant>;
  private readonly skin: Segmented<Skin>;
  private readonly language: Segmented<UiLanguage>;
  private readonly layoutRow: HTMLElement;
  private readonly quick: HTMLElement;
  private panelOpen = false;
  private themeValue: Theme = "dark";

  constructor(handlers: ControlHandlers) {
    /* ---------------- the test bar ---------------- */

    this.input = new Segmented<InputMode>(
      ne.input,
      [
        { value: "romanized", label: ne.modeRomanized },
        { value: "preeti", label: ne.modePreeti },
      ],
      handlers.onInput,
    );

    this.test = new Segmented<TestChoice>(
      ne.test,
      [
        { value: "words", label: ne.testWords },
        { value: "passage", label: ne.testPassage, tip: ne.layoutPassageHint },
        { value: "free", label: ne.testFree },
        { value: "loksewa", label: ne.testLokSewa, tip: ne.comingSoon, disabled: true },
      ],
      (test) => {
        if (test !== "loksewa") handlers.onTest(test);
      },
    );

    this.unit = new Segmented<Unit>(
      ne.length,
      [
        { value: "time", label: "⏱", name: ne.time, tip: ne.time },
        // "#" not "शब्द": the Words test already uses that word.
        { value: "words", label: "#", name: ne.words, tip: ne.words },
      ],
      (unit) => {
        // Switching unit keeps the test going with that unit's middle option.
        handlers.onLength(unit === "time" ? { kind: "time", seconds: 30 } : { kind: "words", count: 25 });
      },
    );

    this.times = new Segmented<string>(
      ne.time,
      LENGTH_OPTIONS.times.map((s) => ({
        value: String(s),
        label: neNum(s),
        name: `${neNum(s)} ${ne.seconds}`,
      })),
      (s) => handlers.onLength({ kind: "time", seconds: Number(s) }),
    );

    this.counts = new Segmented<string>(
      ne.words,
      LENGTH_OPTIONS.counts.map((c) => ({
        value: String(c),
        label: neNum(c),
        name: `${neNum(c)} ${ne.words}`,
      })),
      (c) => handlers.onLength({ kind: "words", count: Number(c) }),
    );

    this.bar = el("div", { class: "testbar" }, [
      this.input.el,
      divider(),
      this.test.el,
      divider(),
      el("div", { class: "testbar__length" }, [this.unit.el, this.times.el, this.counts.el]),
    ]);

    /* ---------------- quick settings: always in view ---------------- */

    this.keyboardButton = el(
      "button",
      {
        class: "icon-button",
        type: "button",
        "aria-pressed": "false",
        "aria-label": ne.keyboard,
        title: `${ne.keyboard} (Ctrl+K)`,
      },
      [icon(ICON_KEYBOARD)],
    );
    this.keyboardButton.addEventListener("click", () => {
      handlers.onKeyboard(this.keyboardButton.getAttribute("aria-pressed") !== "true");
    });

    // Sun and moon share one cell and cross-fade (better-ui icon swap).
    this.themeButton = el(
      "button",
      { class: "icon-button", type: "button", "data-theme-icon": "dark" },
      [
        el("span", { class: "icon-swap" }, [
          icon(ICON_MOON, "icon-swap__layer icon-swap__layer--dark"),
          icon(ICON_SUN, "icon-swap__layer icon-swap__layer--light"),
        ]),
      ],
    );
    this.themeButton.addEventListener("click", () => {
      handlers.onTheme(this.themeValue === "dark" ? "light" : "dark");
    });

    this.language = new Segmented<UiLanguage>(
      ne.language,
      [
        { value: "ne", label: "ने", name: "ने — नेपाली", tip: "नेपाली" },
        { value: "mix", label: "ने+En", name: "ने+En — नेपाली + English", tip: "नेपाली + English" },
        { value: "en", label: "En", name: "En — English", tip: "English" },
      ],
      (language) => {
        // The handler reloads the page; let the thumb finish its glide first.
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.setTimeout(() => handlers.onLanguage(language), still ? 0 : 160);
      },
      "compact",
    );

    /* ---------------- the settings panel: set-once choices ---------------- */

    this.layout = new Segmented<LayoutVariant>(
      ne.layout,
      [
        { value: "wrapped", label: ne.layoutWrapped },
        { value: "focus", label: ne.layoutFocus },
      ],
      handlers.onLayout,
      "panel",
    );
    this.skin = new Segmented<Skin>(
      ne.skin,
      [
        { value: "alive", label: ne.skinAlive },
        { value: "serious", label: ne.skinSerious },
      ],
      handlers.onSkin,
      "panel",
    );

    const row = (label: string, control: HTMLElement): HTMLElement =>
      el("div", { class: "settings-row" }, [el("span", { class: "settings-row__label", text: label }), control]);

    this.layoutRow = row(ne.layout, this.layout.el);
    this.panel = el(
      "div",
      { class: "settings-panel", id: "settings-panel", role: "dialog", "aria-label": ne.settings },
      [this.layoutRow, row(ne.skin, this.skin.el)],
    );

    this.settingsButton = el(
      "button",
      {
        class: "icon-button",
        type: "button",
        "aria-label": ne.settings,
        "aria-expanded": "false",
        "aria-controls": "settings-panel",
        title: ne.settings,
      },
      [icon(ICON_SLIDERS)],
    );
    this.settingsButton.addEventListener("click", () => this.togglePanel());

    // Non-modal: Esc, a click outside, or focus leaving closes it.
    this.panel.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation(); // Esc here closes the panel, not the test
      this.togglePanel(false);
      this.settingsButton.focus();
    });
    document.addEventListener("pointerdown", (event) => {
      if (!this.panelOpen) return;
      const target = event.target as Node;
      if (!this.panel.contains(target) && !this.settingsButton.contains(target)) this.togglePanel(false);
    });
    this.panel.addEventListener("focusout", (event) => {
      const next = event.relatedTarget as Node | null;
      if (next !== null && !this.panel.contains(next) && next !== this.settingsButton) {
        this.togglePanel(false);
      }
    });

    this.quick = el("div", { class: "quick" }, [
      this.keyboardButton,
      this.themeButton,
      this.language.el,
      el("span", { class: "quick__divider", "aria-hidden": "true" }),
      el("div", { class: "settings" }, [this.settingsButton, this.panel]),
    ]);

    this.el = el("header", { class: "top" }, [
      el("div", { class: "top-row" }, [
        el("div", { class: "brand" }, [
          el("h1", { class: "brand-name", text: ne.appName }),
          el("span", { class: "brand-tag", text: ne.tagline }),
        ]),
        this.quick,
      ]),
      this.bar,
    ]);
  }

  /**
   * Open or close the panel. A class, not `hidden`, so the exit can animate:
   * CSS keeps it displayed through a short exit transition (better-ui:
   * transitions, not keyframes, for state that toggles).
   */
  private togglePanel(open = !this.panelOpen): void {
    if (open === this.panelOpen) return;
    this.panelOpen = open;
    toggleClass(this.panel, "is-open", open);
    this.settingsButton.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) return;
    // Thumbs inside a closed panel could not be measured; place them now.
    this.layout.refresh();
    this.skin.refresh();
    this.panel.querySelector<HTMLElement>('.settings-row:not([hidden]) [aria-checked="true"]')?.focus();
  }

  /* ---------------- state in ---------------- */

  setInput(mode: InputMode): void {
    this.input.set(mode);
  }

  setTest(test: TestType): void {
    this.test.set(test);
    // A passage is timed; it has no word count of its own.
    this.unit.setDisabled("words", test === "passage");
    // Lines / Focus lay out a word list: meaningless for a passage or Free.
    this.layoutRow.hidden = test !== "words";
  }

  setLength(length: TestLength): void {
    const unit: Unit = length.kind;
    this.unit.set(unit);
    this.times.el.hidden = unit !== "time";
    this.counts.el.hidden = unit !== "words";
    if (length.kind === "time") this.times.set(String(length.seconds));
    else this.counts.set(String(length.count));
  }

  setLayout(layout: LayoutVariant): void {
    this.layout.set(layout);
  }

  setKeyboard(show: boolean): void {
    this.keyboardButton.setAttribute("aria-pressed", show ? "true" : "false");
  }

  setSkin(skin: Skin): void {
    this.skin.set(skin);
  }

  setTheme(theme: Theme): void {
    this.themeValue = theme;
    this.themeButton.dataset.themeIcon = theme;
    const label = theme === "light" ? ne.themeLight : ne.themeDark;
    // The visible state is the icon; the name says what it is now.
    this.themeButton.setAttribute("aria-label", `${ne.theme}: ${label}`);
    this.themeButton.title = `${ne.theme}: ${label}`;
  }

  setLanguage(language: UiLanguage): void {
    this.language.set(language);
  }

  /** Dim and disable while typing; restore when the test stops. */
  setDimmed(dimmed: boolean): void {
    if (dimmed === this.dimmed) return;
    this.dimmed = dimmed;
    if (dimmed) this.togglePanel(false);
    for (const part of [this.bar, this.quick]) {
      toggleClass(part, "is-dimmed", dimmed);
      part.inert = dimmed;
    }
  }
}
