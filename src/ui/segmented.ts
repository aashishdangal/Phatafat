/**
 * The one choice control the interface uses: a segmented radio group with a
 * thumb that glides behind the selected option.
 *
 * Everything that is "pick one of a few" is one of these — input, test type,
 * length, and every row of the settings panel — so the whole menu speaks one
 * visual language.
 *
 * Accessibility: a radiogroup of radio buttons with one tab stop; arrow keys
 * move the choice and skip disabled options. The thumb is decoration only.
 *
 * Performance: the thumb is placed by reading the selected option's offset
 * once per change (never on a keystroke) and moving with `translate`.
 */

import { el, toggleClass } from "./dom";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Spoken name, when the visible label is short (must contain it). */
  name?: string;
  /** Shown under the option on hover or focus. */
  tip?: string;
  disabled?: boolean;
}

export class Segmented<T extends string> {
  readonly el: HTMLElement;
  private readonly thumb: HTMLElement;
  private readonly buttons = new Map<T, HTMLButtonElement>();
  private readonly order: T[] = [];
  private current: T | undefined;

  constructor(
    label: string,
    options: readonly SegmentOption<T>[],
    private readonly onChange: (value: T) => void,
    variant: "bar" | "panel" | "compact" = "bar",
  ) {
    this.thumb = el("span", { class: "seg__thumb", "aria-hidden": "true" });
    this.el = el("div", { class: `seg seg--${variant}`, role: "radiogroup", "aria-label": label }, [
      this.thumb,
    ]);

    for (const option of options) {
      const button = el("button", {
        class: "seg__opt",
        type: "button",
        role: "radio",
        "aria-checked": "false",
        tabindex: "-1",
        disabled: option.disabled === true ? "" : undefined,
        "aria-label": option.name,
        "data-tip": option.tip,
        text: option.label,
      });
      button.addEventListener("click", () => this.pick(option.value));
      this.buttons.set(option.value, button);
      this.order.push(option.value);
      this.el.append(button);
    }

    this.el.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (step === 0 || this.current === undefined) return;
      event.preventDefault();
      const next = this.neighbour(this.current, step);
      if (next !== undefined) {
        this.pick(next);
        this.buttons.get(next)?.focus();
      }
    });

    // Labels change width once the Devanagari webfont arrives.
    void document.fonts?.ready.then(() => this.place());
  }

  /** Show `value` as selected without firing onChange. */
  set(value: T): void {
    this.current = value;
    for (const [v, button] of this.buttons) {
      button.setAttribute("aria-checked", v === value ? "true" : "false");
      button.tabIndex = v === value ? 0 : -1;
    }
    this.place();
    // The first placement must not glide in from the left edge.
    if (!this.el.classList.contains("is-ready")) {
      requestAnimationFrame(() => this.el.classList.add("is-ready"));
    }
  }

  setDisabled(value: T, disabled: boolean): void {
    const button = this.buttons.get(value);
    if (button !== undefined) button.disabled = disabled;
  }

  /** Re-place the thumb, for a control that was hidden when it was set. */
  refresh(): void {
    this.place();
  }

  private pick(value: T): void {
    if (value === this.current || this.buttons.get(value)?.disabled === true) return;
    this.set(value);
    this.onChange(value);
  }

  private neighbour(from: T, step: number): T | undefined {
    const n = this.order.length;
    let i = this.order.indexOf(from);
    for (let tries = 0; tries < n; tries += 1) {
      i = (i + step + n) % n;
      const v = this.order[i] as T;
      if (this.buttons.get(v)?.disabled !== true) return v;
    }
    return undefined;
  }

  private place(): void {
    const button = this.current === undefined ? undefined : this.buttons.get(this.current);
    const shown = button !== undefined && button.offsetWidth > 0;
    toggleClass(this.thumb, "is-hidden", !shown);
    if (!shown) return;
    this.thumb.style.setProperty("--x", `${button.offsetLeft}px`);
    this.thumb.style.setProperty("--w", `${button.offsetWidth}px`);
  }
}
