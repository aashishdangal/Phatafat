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
 * The parts of a keystroke an input method needs.
 *
 * A structural subset of the DOM KeyboardEvent rather than the type itself, so
 * that `input/` and `session/` stay free of DOM dependencies and can be unit
 * tested in a node environment. A real KeyboardEvent satisfies this interface,
 * so the UI passes one straight through.
 */
export interface KeyEvent {
  /** The character or named key, e.g. "k", " ", "Backspace". */
  key: string;
  /** Physical key, e.g. "KeyK", "Space". Used for keyboard highlighting. */
  code: string;
  shiftKey: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/**
 * How a word ends.
 *   "word" — romanized: the buffer accumulates and commits on space.
 *   "key"  — Preeti: each keystroke is judged immediately, and the word
 *            commits once its keystroke sequence is exhausted.
 */
export type CommitMode = "word" | "key";

export interface InputUpdate {
  /** The raw buffer as typed: Latin for romanized, the pressed keys for Preeti. */
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
  /**
   * The glyph this key produces, shown large on the cap. Devanagari in both
   * modes: the character the key types in Preeti, or the character it
   * transliterates to in romanized mode. Empty where the key produces nothing
   * worth showing.
   */
  label: string;
  /**
   * The physical letter printed on the user's actual keyboard, shown small
   * above the glyph. This is what makes the cap dual-label and teachable: the
   * user reads the Latin they must press and the Devanagari they will get.
   */
  sub?: string;
  /**
   * A glyph with no Unicode character of its own, drawn instead of `label`
   * as an SVG path in a 0 0 16 16 box (Preeti's `m` tail, for one).
   */
  glyphPath?: string;
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
  /** For a character typed as Alt + numpad code (Preeti ङ = 0170): the code. */
  altCode?: string;
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

  onKey(event: KeyEvent): InputUpdate;

  /** Keys to highlight next. Empty when the mode offers no hint. */
  nextKeys(): KeyHint[];

  /**
   * Put text back in the buffer, for returning to a word that was scored
   * wrong. Returns the resulting update so the session gets the re-rendered
   * preview without knowing how this mode transliterates. Optional: a mode
   * that cannot be re-entered simply omits it.
   */
  restore?(buffer: string): InputUpdate;

  /** Clear the buffer. Called on word commit and on restart. */
  reset(): void;
}
