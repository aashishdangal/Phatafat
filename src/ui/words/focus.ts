/**
 * Variant 2 — single focus line.
 *
 * One centred row of words that slides horizontally so the current word is
 * always in the middle: biggest, brightest, with its ghost directly beneath.
 * Neighbours fall away in four steps of brightness, so the eye has somewhere
 * to go without the row ever becoming a wall of text.
 *
 * Word centres are measured once. The current word is enlarged with `scale`,
 * not with `font-size`, so growing it cannot move anything else and the
 * measured centres stay true for the whole test.
 */

import type { SessionState } from "../../session/session";
import { el } from "../dom";
import { WordTrack, type WordView } from "./common";

/** How far from the current word the brightness steps reach. */
const NEIGHBOURS = 4;

export class FocusWordView implements WordView {
  readonly el: HTMLElement;
  private readonly viewport: HTMLElement;
  private readonly track: HTMLElement;
  private readonly words = new WordTrack();

  private centres: number[] = [];
  private half = 0;
  private measuredWidth = -1;
  private litIndex = -1;
  private lastShift = Number.NaN;

  constructor() {
    this.track = el("div", { class: "focus-track" });
    this.viewport = el("div", { class: "focus-viewport" }, [this.track]);
    this.el = el("div", { class: "words words--focus" }, [this.viewport]);
  }

  mount(state: SessionState): void {
    this.words.build(state.targets, this.track);
    this.measuredWidth = -1;
    this.litIndex = -1;
    this.lastShift = Number.NaN;
    this.words.sync(state);
    this.measure();
  }

  update(state: SessionState): void {
    const moved = this.words.sync(state);
    if (moved) {
      this.light(state.index);
      this.aim(state.index);
    }
    this.words.ghost.markTyping();
  }

  measure(force = false): void {
    if (this.words.words.length === 0) return;
    const width = this.viewport.clientWidth;
    if (width === 0) return;
    if (!force && width === this.measuredWidth) return;
    this.measuredWidth = width;
    this.half = width / 2;
    this.centres = this.words.words.map((word) => word.offsetLeft + word.offsetWidth / 2);
    this.lastShift = Number.NaN;
    this.light(this.words.index);
    this.aim(this.words.index);
  }

  /** Brightness steps, written only on the few words that changed. */
  private light(index: number): void {
    const clear = (centre: number): void => {
      for (let d = -NEIGHBOURS; d <= NEIGHBOURS; d += 1) {
        const word = this.words.words[centre + d];
        if (word === undefined) continue;
        word.classList.remove("d1", "d2", "d3", "d4");
      }
    };
    if (this.litIndex >= 0) clear(this.litIndex);
    for (let d = -NEIGHBOURS; d <= NEIGHBOURS; d += 1) {
      if (d === 0) continue;
      const word = this.words.words[index + d];
      if (word === undefined) continue;
      word.classList.add(`d${Math.abs(d)}`);
    }
    this.litIndex = index;
  }

  private aim(index: number): void {
    const centre = this.centres[index];
    if (centre === undefined) return;
    const shift = Math.round(this.half - centre);
    if (shift === this.lastShift) return;
    this.lastShift = shift;
    this.track.style.transform = `translate3d(${shift}px, 0, 0)`;
  }

  destroy(): void {
    this.words.destroy();
    this.el.remove();
  }
}
