/**
 * Free typing — no target words.
 *
 * One line, split at the centre: committed words pile up to the left of the
 * centre line, and the word being typed sits just right of it as a large
 * live preview with the caret, the raw keys small beneath. A word found in
 * the dictionary shows as the dictionary spells it; one that is not shows red
 * with a wavy underline and "not in dictionary" (it counts as an error).
 *
 * Both halves are anchored to the centre with CSS (right: 50% / left: 50%),
 * so nothing is ever measured, and each keystroke writes only the preview.
 * Old words are dropped from the DOM once they are far off screen.
 */

import type { SessionState } from "../../session/session";
import { el, setText, toggleClass } from "../dom";
import { ne } from "../strings";
import type { WordView } from "./common";

/** Committed words kept in the DOM; anything older is off screen anyway. */
const KEEP = 24;

export class FreeWordView implements WordView {
  readonly el: HTMLElement;
  private readonly past: HTMLElement;
  private readonly preview: HTMLElement;
  private readonly keys: HTMLElement;
  private readonly caret: HTMLElement;
  private shown = 0;
  private stillTimer: number | undefined;

  constructor() {
    this.past = el("div", { class: "free-past" });
    this.preview = el("span", { class: "free-preview" });
    this.caret = el("span", { class: "caret" });
    this.keys = el("span", { class: "free-keys" });
    const now = el("div", { class: "free-now" }, [
      el("span", { class: "free-line" }, [this.preview, this.caret]),
      this.keys,
    ]);
    this.el = el("div", { class: "words words--free" }, [
      el("div", { class: "free-viewport", "aria-hidden": "true" }, [this.past, now]),
    ]);
  }

  mount(state: SessionState): void {
    this.past.replaceChildren();
    this.shown = 0;
    this.update(state);
  }

  update(state: SessionState): void {
    const { committed } = state;

    // Backspace can reopen a wrong word: drop what is no longer committed.
    if (committed.length < this.shown) {
      for (let i = committed.length; i < this.shown; i += 1) this.past.lastElementChild?.remove();
      this.shown = committed.length;
    }
    for (let i = this.shown; i < committed.length; i += 1) {
      const word = committed[i];
      if (word === undefined) continue;
      const span = el("span", {
        class: `w ${word.correct ? "is-correct" : "is-wrong"}`,
        title: word.correct ? undefined : ne.notInDictionary,
      }, [el("span", { class: "w-text", text: word.target })]);
      this.past.append(span);
    }
    this.shown = committed.length;
    while (this.past.childElementCount > KEEP) this.past.firstElementChild?.remove();

    setText(this.preview, state.preview);
    setText(this.keys, state.buffer);
    toggleClass(this.el, "is-empty", state.buffer === "");
    this.markTyping();
  }

  measure(): void {
    // Anchored with CSS; there is nothing to measure.
  }

  private markTyping(): void {
    this.caret.classList.add("is-still");
    if (this.stillTimer !== undefined) window.clearTimeout(this.stillTimer);
    this.stillTimer = window.setTimeout(() => {
      this.caret.classList.remove("is-still");
      this.stillTimer = undefined;
    }, 900);
  }

  destroy(): void {
    if (this.stillTimer !== undefined) window.clearTimeout(this.stillTimer);
    this.el.remove();
  }
}
