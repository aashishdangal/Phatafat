/**
 * Variant 1 (wrapped lines) and variant 3 (passage block).
 *
 * Both are the same shape — words wrapped into lines inside a window of fixed
 * height, the track sliding up a line at a time — so they share one
 * implementation and differ by configuration: how many lines are visible,
 * which line the current word is held on, and whether the text is a shuffled
 * word list or a real passage with its punctuation and title.
 *
 * Line positions are measured once (one batched read of `offsetTop`), then
 * scrolling is a single `translateY` on the track: compositor work, no
 * reflow, nothing read on the keystroke path.
 */

import type { SessionState } from "../../session/session";
import { el } from "../dom";
import { WordTrack, type WordView } from "./common";

export interface WrappedOptions {
  /** How many lines of text are visible at once. */
  visibleLines: number;
  /** Which visible line the current word is held on, 0 = the top one. */
  keepLine: number;
  /** Extra class on the root, for the per-variant type scale. */
  variantClass: string;
  /** Shown above the text in passage mode. */
  title?: string;
}

export class WrappedWordView implements WordView {
  readonly el: HTMLElement;
  private readonly viewport: HTMLElement;
  private readonly track: HTMLElement;
  private readonly inner: HTMLElement;
  private readonly words = new WordTrack();
  private readonly options: WrappedOptions;

  private lineTops: number[] = [];
  private lineOfWord: number[] = [];
  private step = 0;
  private measuredWidth = -1;
  private offsetLine = -1;

  constructor(options: WrappedOptions) {
    this.options = options;
    this.inner = el("div", { class: "wrap-words" });
    this.track = el("div", { class: "wrap-track" }, [this.inner]);
    this.viewport = el("div", { class: "wrap-viewport" }, [this.track]);

    const children: HTMLElement[] = [];
    if (options.title !== undefined) {
      children.push(el("h2", { class: "wrap-title", text: options.title }));
    }
    children.push(this.viewport);
    this.el = el("div", { class: `words ${options.variantClass}` }, children);
  }

  mount(state: SessionState): void {
    this.words.build(state.targets, this.inner);
    this.measuredWidth = -1;
    this.offsetLine = -1;
    this.words.sync(state);
    this.measure();
  }

  update(state: SessionState): void {
    const moved = this.words.sync(state);
    if (moved) this.aim(state.index);
    this.words.ghost.markTyping();
  }

  measure(force = false): void {
    if (this.words.words.length === 0) return;
    const width = this.viewport.clientWidth;
    if (width === 0) return;
    if (!force && width === this.measuredWidth) return;
    this.measuredWidth = width;

    // One batched read pass.
    const tops: number[] = [];
    const seen: number[] = [];
    for (const word of this.words.words) {
      const top = word.offsetTop;
      tops.push(top);
      if (seen.length === 0 || seen[seen.length - 1] !== top) seen.push(top);
    }
    const first = seen[0] ?? 0;
    const second = seen[1];
    const sampleHeight = this.words.words[0]?.offsetHeight ?? 0;
    this.step = second !== undefined ? second - first : Math.round(sampleHeight * 1.9);
    this.lineTops = seen;
    this.lineOfWord = tops.map((top) => {
      const index = seen.indexOf(top);
      return index < 0 ? 0 : index;
    });

    // One batched write pass.
    const height = `${this.step * this.options.visibleLines}px`;
    if (this.viewport.style.height !== height) this.viewport.style.height = height;
    this.offsetLine = -1;
    this.aim(this.words.index);
  }

  /** Slide the track so the current word sits on its kept line. */
  private aim(index: number): void {
    if (this.step === 0) return;
    const line = this.lineOfWord[index] ?? 0;
    const lastStart = Math.max(0, this.lineTops.length - this.options.visibleLines);
    const target = Math.min(Math.max(0, line - this.options.keepLine), lastStart);
    if (target === this.offsetLine) return;
    this.offsetLine = target;
    const y = this.lineTops[target] ?? 0;
    this.track.style.transform = `translate3d(0, ${-y}px, 0)`;
  }

  destroy(): void {
    this.words.destroy();
    this.el.remove();
  }
}
