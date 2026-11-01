/**
 * Shared machinery for the three word-area layouts.
 *
 * All three render the target words once into spans and then, on every
 * keystroke, write only what changed:
 *   - the ghost line under the current word (preview text + caret),
 *   - the class of a word that has just been committed,
 *   - the class of the word that has just become active.
 *
 * Nothing in here reads layout during typing. Measurement happens in
 * `measure()`, which the view calls on mount, on resize and once the
 * Devanagari font has loaded.
 */

import type { SessionState } from "../../session/session";
import { el, setText, toggleClass } from "../dom";

export interface WordView {
  readonly el: HTMLElement;
  /** Build the word DOM for this test. Called once per session. */
  mount(state: SessionState): void;
  /** Keystroke path. Must not read layout. */
  update(state: SessionState): void;
  /**
   * Re-measure line positions. Safe to call at any time; pass `force` when
   * the metrics changed without the width changing, as they do when the
   * Devanagari webfont finishes loading.
   */
  measure(force?: boolean): void;
  destroy(): void;
}

/**
 * The ghost: the Devanagari preview of what is being typed, directly under
 * the current word, with the caret at its end and the raw Latin kept small
 * and dim behind it. It is absolutely positioned inside the active word, so
 * it never pushes the word list around, and it moves between words only when
 * a word is committed — not on every keystroke.
 */
export class Ghost {
  readonly el: HTMLElement;
  private readonly text: HTMLElement;
  private readonly latin: HTMLElement;
  private readonly caret: HTMLElement;
  private stillTimer: number | undefined;
  private host: HTMLElement | null = null;

  constructor() {
    this.text = el("span", { class: "ghost-deva" });
    this.caret = el("span", { class: "caret" });
    this.latin = el("span", { class: "ghost-latin" });
    this.el = el("span", { class: "ghost", "aria-hidden": "true" }, [
      this.text,
      this.caret,
      this.latin,
    ]);
  }

  /** Park the ghost inside a word. One DOM move per committed word. */
  attachTo(word: HTMLElement | null): void {
    if (word === this.host) return;
    this.host = word;
    if (word === null) this.el.remove();
    else word.append(this.el);
  }

  write(preview: string, buffer: string): void {
    setText(this.text, preview);
    setText(this.latin, buffer);
    toggleClass(this.el, "is-empty", buffer === "");
  }

  /** Stop the blink while keys are coming in, the way a text cursor does. */
  markTyping(): void {
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

/**
 * Word spans plus the correct/wrong/active bookkeeping every layout needs.
 * Subclasses of the views own the scrolling; this owns the text and classes.
 */
export class WordTrack {
  readonly words: HTMLElement[] = [];
  readonly ghost = new Ghost();
  private committedCount = 0;
  private activeIndex = -1;

  /** Build one span per target. Called once; never on a keystroke. */
  build(targets: readonly string[], into: HTMLElement): void {
    this.words.length = 0;
    this.committedCount = 0;
    this.activeIndex = -1;
    const frag = document.createDocumentFragment();
    for (const [i, target] of targets.entries()) {
      const word = el("span", { class: "w", "data-i": i }, [
        el("span", { class: "w-text", text: target }),
      ]);
      this.words.push(word);
      frag.append(word);
    }
    into.replaceChildren(frag);
  }

  /**
   * Reconcile classes with the session state.
   * Returns true when the active word changed, which is the only moment a
   * view needs to re-aim its scroll.
   */
  sync(state: SessionState): boolean {
    const { committed, index } = state;

    if (committed.length !== this.committedCount) {
      const from = Math.min(this.committedCount, committed.length);
      const to = Math.max(this.committedCount, committed.length);
      for (let i = from; i < to; i += 1) {
        const word = this.words[i];
        if (word === undefined) continue;
        const result = committed[i];
        toggleClass(word, "is-correct", result !== undefined && result.correct);
        toggleClass(word, "is-wrong", result !== undefined && !result.correct);
      }
      this.committedCount = committed.length;
    }

    const moved = index !== this.activeIndex;
    if (moved) {
      const previous = this.words[this.activeIndex];
      if (previous !== undefined) previous.classList.remove("is-active");
      const current = this.words[index];
      if (current !== undefined) current.classList.add("is-active");
      this.activeIndex = index;
      this.ghost.attachTo(current ?? null);
    }

    this.ghost.write(state.preview, state.buffer);
    return moved;
  }

  get index(): number {
    return this.activeIndex;
  }

  destroy(): void {
    this.ghost.destroy();
    this.words.length = 0;
  }
}
