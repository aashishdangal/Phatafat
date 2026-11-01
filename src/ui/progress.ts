/**
 * The progress bar — the one instrument shown while typing.
 *
 * It carries two readings at once:
 *   1. length  — how far through the test you are (time left in a timed test,
 *                words committed in a word test). Read from the fill width
 *                and from the number beside it, so it survives without
 *                colour.
 *   2. heat    — how fast you are going right now, as a crossfade from
 *                `--blue` (cool, slow) to `--crimson` (hot, fast). Pure
 *                decoration on top of reading 1, and the crossfade is
 *                gated on `prefers-reduced-motion` in CSS.
 *
 * Wrong words leave a notch at the position where they happened, so the
 * finished bar is a record of the run.
 *
 * Writes are compositor-only: `scaleX` for the fill, `opacity` for the heat.
 * Nothing here reads layout.
 */

import { el } from "./dom";
import { clamp01, neClock, neNum } from "./format";
import { ne } from "./strings";

/** Below this WPM the bar is fully cool; at or above HOT_WPM, fully hot. */
const COOL_WPM = 8;
const HOT_WPM = 45;

export function heatFromWpm(wpm: number): number {
  return clamp01((wpm - COOL_WPM) / (HOT_WPM - COOL_WPM));
}

export class ProgressBar {
  readonly el: HTMLElement;
  private readonly track: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly hot: HTMLElement;
  private readonly notches: HTMLElement;
  private readonly label: HTMLElement;

  private lastProgress = -1;
  private lastHeat = -1;
  private lastLabel = "";
  private notchCount = 0;

  constructor() {
    this.fill = el("div", { class: "pb-fill" });
    this.hot = el("div", { class: "pb-hot" });
    this.notches = el("div", { class: "pb-notches" });
    this.track = el("div", { class: "pb-track" }, [this.fill, this.hot, this.notches]);
    this.label = el("div", { class: "pb-label tnum", text: "" });

    this.el = el(
      "div",
      {
        class: "pb",
        role: "progressbar",
        "aria-label": ne.progressLabel,
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": "0",
      },
      [this.track, this.label],
    );
  }

  /** 0–1 along the test. */
  setProgress(fraction: number): void {
    const value = clamp01(fraction);
    // Quantise to a quarter of a percent: finer than a pixel on any screen we
    // target, and it keeps the write count down on fast frames.
    const stepped = Math.round(value * 400) / 400;
    if (stepped === this.lastProgress) return;
    this.lastProgress = stepped;
    this.fill.style.transform = `scaleX(${stepped})`;
    this.hot.style.transform = `scaleX(${stepped})`;
    this.el.setAttribute("aria-valuenow", String(Math.round(stepped * 100)));
  }

  /** 0–1 speed, cool to hot. */
  setHeat(fraction: number): void {
    const stepped = Math.round(clamp01(fraction) * 20) / 20;
    if (stepped === this.lastHeat) return;
    this.lastHeat = stepped;
    this.hot.style.opacity = String(stepped);
  }

  /** The remaining time or word count, in Devanagari digits. */
  setRemaining(remainingMs: number | null, remainingWords: number | null): void {
    const text =
      remainingMs !== null
        ? neClock(remainingMs)
        : remainingWords !== null
          ? `${neNum(remainingWords)} ${ne.wordsShort}`
          : "";
    if (text === this.lastLabel) return;
    this.lastLabel = text;
    this.label.textContent = text;
  }

  /** Put a notch where a word was typed wrong. `at` is 0–1 along the bar. */
  markWrongAt(at: number): void {
    const notch = el("div", { class: "pb-notch" });
    notch.style.left = `${(clamp01(at) * 100).toFixed(2)}%`;
    this.notches.append(notch);
    this.notchCount += 1;
  }

  get notchesPlaced(): number {
    return this.notchCount;
  }

  reset(): void {
    this.notches.replaceChildren();
    this.notchCount = 0;
    this.lastProgress = -1;
    this.lastHeat = -1;
    this.lastLabel = "";
    this.setProgress(0);
    this.setHeat(0);
  }
}
