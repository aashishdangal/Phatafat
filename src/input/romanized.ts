/**
 * Romanized input method.
 *
 * The user types Latin; we show a live Devanagari preview of the buffer and
 * commit the word on space. Correctness is not decided here — the session
 * matches the committed Latin against the Devanagari target (rules.md A1).
 *
 * No DOM. The buffer is plain Latin text, so backspace is a simple truncation.
 */

import { toDevanagari } from "../engine/preview";
import { nextHintKeys } from "../engine/hint";
import { romanizedLayout } from "./layouts/romanized";
import type { InputMethod, InputUpdate, KeyEvent, KeyHint, KeyboardLayout } from "./types";

/** Characters that belong in a romanized buffer (rules.md Part B keys). */
const TYPEABLE = /^[A-Za-z0-9^\\|.?,!]$/;

export class RomanizedInput implements InputMethod {
  readonly id = "romanized" as const;
  readonly commitMode = "word" as const;
  readonly layout: KeyboardLayout = romanizedLayout;

  private buffer = "";
  private target: string | null = null;

  setTarget(target: string | null): void {
    this.target = target;
  }

  /** What is currently in the buffer, as typed. */
  get currentBuffer(): string {
    return this.buffer;
  }

  /** Put text back in the buffer, for returning to a word scored wrong. */
  restore(buffer: string): InputUpdate {
    this.buffer = buffer;
    return this.update(true);
  }

  onKey(event: KeyEvent): InputUpdate {
    // Leave browser and app shortcuts alone.
    if (event.ctrlKey === true || event.metaKey === true || event.altKey === true) {
      return this.update(false);
    }

    if (event.key === " ") {
      // Space commits — but never an empty buffer, so leading spaces and
      // double spaces do not score a blank word.
      if (this.buffer.length === 0) return this.update(true);
      const typed = this.buffer;
      this.buffer = "";
      return { ...this.update(true), commit: { typed } };
    }

    if (event.key === "Backspace") {
      // Signalled to the session by an unchanged, empty buffer: the session
      // decides whether to reopen the previous word.
      if (this.buffer.length === 0) return this.update(false);
      this.buffer = this.buffer.slice(0, -1);
      return this.update(true);
    }

    if (event.key.length === 1 && TYPEABLE.test(event.key)) {
      this.buffer += event.key;
      return this.update(true);
    }

    // Tab, Escape, arrows, function keys: not ours.
    return this.update(false);
  }

  nextKeys(): KeyHint[] {
    return nextHintKeys(this.target, this.buffer);
  }

  reset(): void {
    this.buffer = "";
  }

  private update(consumed: boolean): InputUpdate {
    return {
      buffer: this.buffer,
      preview: toDevanagari(this.buffer, { target: this.target }),
      consumed,
    };
  }
}
