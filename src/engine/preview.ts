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
  ["kx", `क${HALANT}ष`], // क्ष sounded out (A3): rakxa → रक्ष, not रक्क्ष
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

/** The Latin letters that begin a Part B vowel key (B2), long forms included. */
const VOWEL_START = new Set(["a", "e", "i", "o", "u", "A", "I", "U"]);

function isVowelKey(ch: string | undefined): boolean {
  return ch !== undefined && VOWEL_START.has(ch);
}

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
    // B4: `nn` is a second way to write ँ, easier to reach than `^`.
    //
    // It must not swallow the न्न geminate, which appears in some of the most
    // common verbs in the language (सुन्नु, भन्नु, जान्नु). A vowel after the
    // pair means the user is writing न्न, so `nn` is ँ only when no vowel
    // follows it — including at the end of the buffer.
    if (chars[i] === "n" && chars[i + 1] === "n" && !isVowelKey(chars[i + 2])) {
      tokens.push({ kind: "sign", dev: "ँ", latin: "nn" });
      i += 2;
      continue;
    }

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

export interface PreviewOptions {
  /** The word being typed, when there is one. Only used to read `x`. */
  target?: string | null;
}

const KSHA = `क${HALANT}ष`;

/** One क्ष or छ of the target, and whether a य follows it (क्ष्य). */
export interface XReading {
  dev: string;
  yFollows: boolean;
}

/** The क्ष and छ of a target word, in order: what each typed `x` stands for. */
export function xReadings(target: string | null): XReading[] {
  if (target === null) return [];
  const out: XReading[] = [];
  const word = target.normalize("NFC");
  for (let i = 0; i < word.length; i += 1) {
    if (word.startsWith(KSHA, i)) {
      i += KSHA.length - 1;
      out.push({ dev: KSHA, yFollows: word.startsWith(HALANT + "य", i + 1) });
    } else if (word[i] === "छ") {
      out.push({ dev: "छ", yFollows: false });
    }
  }
  return out;
}

/** Tokens that stand for one of the target's क्ष/छ, so they advance the x count. */
function isXLike(token: PreviewToken): boolean {
  return (
    token.kind === "consonant" &&
    (token.latin === "x" || token.latin === "kx" || token.dev === KSHA || token.dev === "छ")
  );
}

/**
 * B1–B5: render a Latin buffer as Devanagari.
 *
 * B3 drives the joining: consonant + `a` → bare consonant, consonant + other
 * vowel → consonant + matra, consonant directly followed by a consonant →
 * halant between them, and a word-final (or still-unresolved, mid-typing)
 * consonant stays bare with no halant. Type `\` for a real final halant.
 */
export function toDevanagari(latin: string, options: PreviewOptions = {}): string {
  const xs = xReadings(options.target ?? null);
  let xSeen = 0;
  const tokens = tokenizeLatin(latin);
  let out = "";
  // True when the last thing emitted was a consonant with no vowel yet, so the
  // next consonant has to be joined with a halant (B3).
  let pendingConsonant = false;

  for (let t = 0; t < tokens.length; t += 1) {
    const token = tokens[t];
    if (token === undefined) break;
    switch (token.kind) {
      case "consonant": {
        // x is both क्ष and छ (A3); with a target, the nth x reads as the
        // nth of those in the word, so pakauxa previews as पकाउछ.
        let dev = token.dev;
        if (isXLike(token)) {
          const reading = xs[xSeen++];
          if (reading !== undefined && (token.latin === "x" || token.latin === "kx")) {
            dev = token.latin === "kx" ? KSHA : reading.dev;
          }
          // The y of a sounded-out क्ष (rakxya) is not a य unless the target
          // has one there (लक्ष्य).
          const next = tokens[t + 1];
          if (
            dev === KSHA &&
            reading?.dev === KSHA &&
            !reading.yFollows &&
            next?.kind === "consonant" &&
            next.latin === "y"
          ) {
            t += 1;
          }
        }
        out += pendingConsonant ? HALANT + dev : dev;
        pendingConsonant = true;
        break;
      }
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
