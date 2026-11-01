/**
 * The input-method contract.
 *
 * The session never knows which mode is active. It hands keystrokes to an
 * InputMethod and receives an InputUpdate back; when that update carries a
 * `commit`, the session decides correct or wrong and scores it. Adding Preeti
 * on day 2 must not require touching the session or scoring code.
 */

export type InputMethodId = "romanized" | "preeti";

/**
 * How a word ends.
 *   "word" — romanized: the buffer accumulates and commits on space.
 *   "key"  — Preeti: each keystroke is judged immediately, and the word
 *            commits once its keystroke sequence is exhausted.
 */
export type CommitMode = "word" | "key";

export interface InputUpdate {
  /** The raw buffer as typed: Latin for romanized, Devanagari for Preeti. */
  buffer: string;
  /** Devanagari rendering of the buffer, for the live preview. */
  preview: string;
  /**
   * Present when this keystroke ended a word. `typed` is what the session
   * should match against the target. The input method does not decide
   * correctness — only that a word boundary happened.
   */
  commit?: { typed: string };
  /**
   * For "key" commit modes: whether this single keystroke was the expected
   * one. Undefined when the mode does not judge individual keys, or when the
   * keystroke was not a character (backspace, modifier).
   */
  keyCorrect?: boolean;
  /** True when the input method handled the event and the DOM should not. */
  consumed: boolean;
}

export interface KeyCap {
  /** KeyboardEvent.code, e.g. "KeyA", "Space", "Semicolon". */
  code: string;
  /** What the unshifted key produces, as shown on the cap. */
  label: string;
  /** What Shift produces, where it differs. Shown small in the corner. */
  shiftLabel?: string;
  /** Relative width, 1 = a standard key. */
  width?: number;
}

export interface KeyboardLayout {
  id: string;
  /** Rows of caps, top to bottom, as the physical keyboard reads. */
  rows: KeyCap[][];
}

/** A key the user should press next, and whether it needs Shift. */
export interface KeyHint {
  code: string;
  shift: boolean;
}

export interface InputMethod {
  readonly id: InputMethodId;
  readonly commitMode: CommitMode;
  readonly layout: KeyboardLayout;

  /**
   * Tell the method which word is being typed, so it can compute key hints
   * and, in "key" mode, judge each keystroke. `null` in free mode, where no
   * target exists and `nextKeys()` returns nothing.
   */
  setTarget(target: string | null): void;

  onKey(event: KeyboardEvent): InputUpdate;

  /** Keys to highlight next. Empty when the mode offers no hint. */
  nextKeys(): KeyHint[];

  /** Clear the buffer. Called on word commit and on restart. */
  reset(): void;
}
