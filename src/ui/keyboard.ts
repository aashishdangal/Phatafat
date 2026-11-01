/**
 * On-screen keyboard preview — one shared renderer.
 *
 * The layout arrives as data from the active InputMethod (`layout`), and the
 * hints as `KeyHint[]` from `state.nextKeys`. This file knows nothing about
 * romanized or Preeti; adding Preeti means adding a layout, not touching this.
 *
 * The DOM is built once. Every update toggles classes on at most a handful of
 * caps, so highlighting never reflows and never costs a keystroke frame.
 */

import type { KeyboardLayout, KeyHint } from "../input/types";
import { el, toggleClass } from "./dom";

const FLASH_MS = 150;

export class KeyboardView {
  readonly el: HTMLElement;
  private readonly caps = new Map<string, HTMLElement>();
  private readonly shiftCaps: HTMLElement[] = [];
  private highlighted: HTMLElement[] = [];
  private shiftHighlighted = false;
  private readonly flashTimers = new Map<HTMLElement, number>();

  constructor(layout: KeyboardLayout) {
    const rows = layout.rows.map((row) =>
      el(
        "div",
        { class: "kb-row" },
        row.map((cap) => {
          const node = el("div", {
            class: `kb-key${cap.code === "Space" ? " kb-key--space" : ""}`,
            "data-code": cap.code,
            style: cap.width !== undefined ? `--kb-span:${cap.width}` : undefined,
            "aria-hidden": "true",
          });
          if (cap.sub !== undefined) node.append(el("span", { class: "kb-sub", text: cap.sub }));
          if (cap.label !== "") node.append(el("span", { class: "kb-glyph", text: cap.label }));
          if (cap.shiftLabel !== undefined) {
            node.append(el("span", { class: "kb-shift-glyph", text: cap.shiftLabel }));
          }
          this.caps.set(cap.code, node);
          return node;
        }),
      ),
    );

    // Shift sits outside the data layout: it is a modifier the hint may ask
    // for (Preeti needs it constantly), not a glyph-producing cap.
    const shiftRow = el("div", { class: "kb-row kb-row--mods" }, [
      this.makeShift("ShiftLeft"),
      this.makeShift("ShiftRight"),
    ]);
    rows.splice(rows.length - 1, 0, shiftRow);

    this.el = el("div", { class: "kb", "data-layout": layout.id }, rows);
  }

  private makeShift(code: string): HTMLElement {
    const node = el("div", { class: "kb-key kb-key--mod", "data-code": code, "aria-hidden": "true" }, [
      el("span", { class: "kb-sub", text: "shift" }),
    ]);
    this.caps.set(code, node);
    this.shiftCaps.push(node);
    return node;
  }

  /** Highlight the next key (and Shift when the hint needs it). */
  setHints(hints: readonly KeyHint[]): void {
    const next: HTMLElement[] = [];
    let wantShift = false;
    for (const hint of hints) {
      const cap = this.caps.get(hint.code);
      if (cap !== undefined) next.push(cap);
      if (hint.shift) wantShift = true;
    }

    if (next.length === this.highlighted.length && next.every((n, i) => this.highlighted[i] === n)) {
      // Same hint as last keystroke: nothing to write.
    } else {
      for (const cap of this.highlighted) cap.classList.remove("is-next");
      for (const cap of next) cap.classList.add("is-next");
      this.highlighted = next;
    }

    if (wantShift !== this.shiftHighlighted) {
      for (const cap of this.shiftCaps) toggleClass(cap, "is-next", wantShift);
      this.shiftHighlighted = wantShift;
    }
  }

  /**
   * Flash a pressed key. `correct` undefined means "no opinion" — the user
   * took a different accepted spelling, which is not an error.
   */
  flash(code: string, correct: boolean | undefined): void {
    const cap = this.caps.get(code);
    if (cap === undefined) return;

    const name = correct === undefined ? "is-hit" : correct ? "is-good" : "is-bad";
    const existing = this.flashTimers.get(cap);
    if (existing !== undefined) window.clearTimeout(existing);
    // No layout read here: a repeated press of the same key simply extends
    // the flash. Reading offsetWidth to retrigger it would put a forced
    // reflow on the keystroke path, which is the one thing we never do.
    for (const other of ["is-good", "is-bad", "is-hit"]) {
      if (other !== name) cap.classList.remove(other);
    }
    cap.classList.add(name);
    this.flashTimers.set(
      cap,
      window.setTimeout(() => {
        cap.classList.remove("is-good", "is-bad", "is-hit");
        this.flashTimers.delete(cap);
      }, FLASH_MS * 2),
    );
  }

  clearFlashes(): void {
    for (const [cap, timer] of this.flashTimers) {
      window.clearTimeout(timer);
      cap.classList.remove("is-good", "is-bad", "is-hit");
    }
    this.flashTimers.clear();
  }
}
