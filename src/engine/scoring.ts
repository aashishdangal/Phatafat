/**
 * Scoring. Pure functions, no DOM.
 *
 * Devanagari must be counted in grapheme clusters, never `.length`: मेरो is
 * four code points but two clusters, so `.length` inflates every Nepali word
 * and would report a WPM roughly double the truth.
 */

const segmenter = new Intl.Segmenter("ne", { granularity: "grapheme" });

/** Number of user-perceived characters in a string. */
export function countGraphemes(text: string): number {
  if (text === "") return 0;
  let n = 0;
  for (const _ of segmenter.segment(text)) n += 1;
  return n;
}

export interface CommittedWord {
  /** The Devanagari word the user was meant to type. */
  target: string;
  /** What they actually typed, in whatever script the input method produces. */
  typed: string;
  correct: boolean;
}

/** Keystroke tally, used by Preeti mode for character-level accuracy. */
export interface KeystrokeTally {
  total: number;
  correct: number;
}

export interface Results {
  /** (clusters in correct targets + spaces between them) / 5 / minutes */
  grossWpm: number;
  /** Gross WPM minus errors per minute, floored at zero. */
  netWpm: number;
  /** Correct words over committed words, 0–1. */
  wordAccuracy: number;
  /** Correct keystrokes over total, 0–1. Only defined when keystrokes are tracked. */
  charAccuracy?: number;
  correctWords: number;
  committedWords: number;
  errors: number;
  elapsedMs: number;
  wrongWords: { target: string; typed: string }[];
}

const CHARS_PER_WORD = 5;

export function computeResults(
  committed: readonly CommittedWord[],
  elapsedMs: number,
  keystrokes?: KeystrokeTally,
): Results {
  const correct = committed.filter((w) => w.correct);
  const errors = committed.length - correct.length;

  // Spaces *between* the correct words, so a single word scores no space.
  const spaces = Math.max(0, correct.length - 1);
  const clusters = correct.reduce((sum, w) => sum + countGraphemes(w.target), 0);

  const minutes = elapsedMs / 60_000;
  const grossWpm = minutes > 0 ? (clusters + spaces) / CHARS_PER_WORD / minutes : 0;
  const errorsPerMinute = minutes > 0 ? errors / minutes : 0;

  return {
    grossWpm,
    netWpm: Math.max(0, grossWpm - errorsPerMinute),
    wordAccuracy: committed.length > 0 ? correct.length / committed.length : 0,
    charAccuracy:
      keystrokes && keystrokes.total > 0 ? keystrokes.correct / keystrokes.total : undefined,
    correctWords: correct.length,
    committedWords: committed.length,
    errors,
    elapsedMs,
    wrongWords: committed
      .filter((w) => !w.correct)
      .map((w) => ({ target: w.target, typed: w.typed })),
  };
}
