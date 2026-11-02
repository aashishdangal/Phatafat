/**
 * Preeti input method.
 *
 * The user types on a US keyboard as if the Preeti font were active. Each
 * keystroke is judged against the target's one standard keystroke sequence
 * (engine/preeti.ts), and the word commits on space, like English Monkeytype.
 * A wrong key turns red and the caret moves on; it is never blocked.
 *
 * The committed text is the Devanagari the keys produce, so the session
 * scores it with matchWord's exact Devanagari comparison (rules.md A10)
 * without knowing this mode exists.
 *
 * No DOM.
 */

import { keyFor, preetiToUnicode, unicodeToPreeti } from "../engine/preeti";
import { preetiLayout } from "./layouts/preeti";
import type { InputMethod, InputUpdate, KeyEvent, KeyHint, KeyboardLayout } from "./types";

/** Printable ASCII: anything a US keyboard types that the font could draw. */
const PRINTABLE = /^[!-~]$/;

export class PreetiInput implements InputMethod {
  readonly id = "preeti" as const;
  readonly commitMode = "key" as const;
  readonly layout: KeyboardLayout = preetiLayout;

  /** Keystrokes typed for the current word, as the characters the keys sent. */
  private keys = "";
  /** The standard keystrokes for the target, or "" when there is none. */
  private targetKeys = "";
  /** Keystrokes of each committed word, so a wrong word can be reopened as typed. */
  private history: string[] = [];

  setTarget(target: string | null): void {
    this.targetKeys = target === null ? "" : (unicodeToPreeti(target) ?? "");
  }

  /** The keystrokes so far, for showing what was pressed. */
  get currentKeys(): string {
    return this.keys;
  }

  restore(buffer: string): InputUpdate {
    const last = this.history.pop();
    this.keys =
      last !== undefined && preetiToUnicode(last) === buffer ? last : (unicodeToPreeti(buffer) ?? "");
    return this.update(true);
  }

  onKey(event: KeyEvent): InputUpdate {
    if (event.ctrlKey === true || event.metaKey === true || event.altKey === true) {
      return this.update(false);
    }

    if (event.key === " ") {
      if (this.keys.length === 0) return this.update(true);
      const typed = preetiToUnicode(this.keys);
      // Space is the right key only once the whole word has been typed.
      const keyCorrect = this.keys.length === this.targetKeys.length;
      this.history.push(this.keys);
      this.keys = "";
      return { ...this.update(true), commit: { typed }, keyCorrect };
    }

    if (event.key === "Backspace") {
      if (this.keys.length === 0) return this.update(false);
      this.keys = this.keys.slice(0, -1);
      return this.update(true);
    }

    if (event.key.length === 1 && PRINTABLE.test(event.key)) {
      const expected = this.targetKeys[this.keys.length];
      this.keys += event.key;
      return { ...this.update(true), keyCorrect: event.key === expected };
    }

    return this.update(false);
  }

  nextKeys(): KeyHint[] {
    if (this.targetKeys === "") return [];
    const next = this.keys.length < this.targetKeys.length ? this.targetKeys[this.keys.length] : " ";
    const key = next === undefined ? null : keyFor(next);
    return key === null ? [] : [key];
  }

  reset(): void {
    this.keys = "";
    this.history = [];
  }

  private update(consumed: boolean): InputUpdate {
    // buffer is the keys as pressed (shown small under the word), preview the
    // Devanagari they make.
    return { buffer: this.keys, preview: preetiToUnicode(this.keys), consumed };
  }
}
