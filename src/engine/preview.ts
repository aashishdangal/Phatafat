/**
 * Latin → Devanagari preview transliterator — implements rules.md Part B.
 *
 * Greedy longest-match, left to right, case-sensitive only where Part B says so.
 * Used for the live preview above the buffer and for rendering in free mode.
 * Cosmetic in test modes: on commit the session always shows the target word.
 *
 * This is deliberately NOT built on `matcher.ts`: Part A maps one Devanagari
 * sign to many accepted Latin spellings, Part B maps one Latin key to a single
 * Devanagari rendering, and the two tables genuinely differ (Part B has no `q`
 * or bare `c`, `b` is only ब, `v`/`w` are only व, and `T D N Sh A I U Ri M H`
 * are case-sensitive keys that Part A ignores). Sharing tables would force one
 * of the two to be wrong.
 *
 * Pure functions: no DOM, no network, no mutable module state.
 */

export type PreviewTokenKind = "consonant" | "vowel" | "sign" | "halant" | "literal";

export interface PreviewKey {
  readonly kind: PreviewTokenKind;
  /** Independent / standalone Devanagari rendering. */
  readonly dev: string;
  /** Matra form, for vowels only. Empty string for the inherent `a`. */
  readonly matra?: string;
}

export interface PreviewToken extends PreviewKey {
  /** The Latin key that produced this token, or the raw character if unmapped. */
  readonly latin: string;
}

const HALANT = "्";

/** B1: consonants. `T Th D Dh N Sh` are the case-sensitive retroflex keys. */
const CONSONANT_KEYS: ReadonlyArray<readonly [string, string]> = [
  ["k", "क"],
  ["kh", "ख"],
  ["g", "ग"],
  ["gh", "घ"],
  ["ng", "ङ"],
  ["ch", "च"],
  ["chh", "छ"],
  ["j", "ज"],
  ["jh", "झ"],
  ["ny", "ञ"],
  ["T", "ट"],
  ["Th", "ठ"],
  ["D", "ड"],
  ["Dh", "ढ"],
  ["N", "ण"],
  ["t", "त"],
  ["th", "थ"],
  ["d", "द"],
  ["dh", "ध"],
  ["n", "न"],
  ["p", "प"],
  ["ph", "फ"],
  ["f", "फ"],
  ["b", "ब"],
  ["bh", "भ"],
  ["m", "म"],
  ["y", "य"],
  ["r", "र"],
  ["l", "ल"],
  ["v", "व"],
  ["w", "व"],
  ["sh", "श"],
  ["Sh", "ष"],
  ["s", "स"],
  ["h", "ह"],
  ["x", `क${HALANT}ष`],
  ["ksh", `क${HALANT}ष`],
  ["gy", `ज${HALANT}ञ`],
];

/** B2: vowels, as `[key, independent, matra]`. The inherent `a` has no matra. */
const VOWEL_KEYS: ReadonlyArray<readonly [string, string, string]> = [
  ["a", "अ", ""],
  ["aa", "आ", "ा"],
  ["A", "आ", "ा"],
  ["i", "इ", "ि"],
  ["ii", "ई", "ी"],
  ["ee", "ई", "ी"],
  ["I", "ई", "ी"],
  ["u", "उ", "ु"],
  ["uu", "ऊ", "ू"],
  ["oo", "ऊ", "ू"],
  ["U", "ऊ", "ू"],
  ["e", "ए", "े"],
  ["ai", "ऐ", "ै"],
  ["o", "ओ", "ो"],
  ["au", "औ", "ौ"],
  ["Ri", "ऋ", "ृ"],
];

/** B4: signs. `\` is an explicit halant. */
const SIGN_KEYS: ReadonlyArray<readonly [string, string]> = [
  ["M", "ं"], // ं anusvara
  ["^", "ँ"], // ँ chandrabindu
  ["H", "ः"], // ः visarga
];

/** B5: punctuation and digits. `? , !` are unmapped and pass through. */
const LITERAL_KEYS: ReadonlyArray<readonly [string, string]> = [
  [".", "।"],
  ["|", "।"],
  ["0", "०"],
  ["1", "१"],
  ["2", "२"],
  ["3", "३"],
  ["4", "४"],
  ["5", "५"],
  ["6", "६"],
  ["7", "७"],
  ["8", "८"],
  ["9", "९"],
];

function buildKeys(): Map<string, PreviewKey> {
  const keys = new Map<string, PreviewKey>();
  for (const [latin, dev] of CONSONANT_KEYS) keys.set(latin, { kind: "consonant", dev });
  for (const [latin, dev, matra] of VOWEL_KEYS) keys.set(latin, { kind: "vowel", dev, matra });
  for (const [latin, dev] of SIGN_KEYS) keys.set(latin, { kind: "sign", dev });
  keys.set("\\", { kind: "halant", dev: HALANT });
  for (const [latin, dev] of LITERAL_KEYS) keys.set(latin, { kind: "literal", dev });
  return keys;
}

/** The full Part B key table, Latin key → Devanagari rendering. */
export const PREVIEW_KEYS: ReadonlyMap<string, PreviewKey> = buildKeys();

/** Longest key length, for the greedy scan (`chh` before `ch`, `ksh` before `k`). */
const MAX_KEY_LENGTH = [...PREVIEW_KEYS.keys()].reduce(
  (max, key) => Math.max(max, key.length),
  1,
);

/**
 * Greedy longest-match tokenizer for a Latin buffer (Part B preamble).
 * Unmapped characters become `literal` tokens that pass through unchanged
 * (B5: `? , !`), which also keeps partial input visible while typing.
 * Exported for free mode, which needs the token stream, not just the string.
 */
export function tokenizeLatin(latin: string): PreviewToken[] {
  const chars = [...latin.normalize("NFC")];
  const tokens: PreviewToken[] = [];
  let i = 0;

  while (i < chars.length) {
    let matched = false;
    for (let len = Math.min(MAX_KEY_LENGTH, chars.length - i); len >= 1; len -= 1) {
      const slice = chars.slice(i, i + len).join("");
      const key = PREVIEW_KEYS.get(slice);
      if (key !== undefined) {
        tokens.push({ ...key, latin: slice });
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const ch = chars[i];
    if (ch === undefined) break;
    tokens.push({ kind: "literal", dev: ch, latin: ch });
    i += 1;
  }

  return tokens;
}

/**
 * B1–B5: render a Latin buffer as Devanagari.
 *
 * B3 drives the joining: consonant + `a` → bare consonant, consonant + other
 * vowel → consonant + matra, consonant directly followed by a consonant →
 * halant between them, and a word-final (or still-unresolved, mid-typing)
 * consonant stays bare with no halant. Type `\` for a real final halant.
 */
export function toDevanagari(latin: string): string {
  let out = "";
  // True when the last thing emitted was a consonant with no vowel yet, so the
  // next consonant has to be joined with a halant (B3).
  let pendingConsonant = false;

  for (const token of tokenizeLatin(latin)) {
    switch (token.kind) {
      case "consonant":
        out += pendingConsonant ? HALANT + token.dev : token.dev;
        pendingConsonant = true;
        break;
      case "vowel":
        // Inherent `a` after a consonant adds nothing (B3: `ka → क`).
        out += pendingConsonant ? (token.matra ?? "") : token.dev;
        pendingConsonant = false;
        break;
      case "sign":
      case "halant":
      case "literal":
        out += token.dev;
        pendingConsonant = false;
        break;
    }
  }

  return out;
}
