/**
 * Romanized Nepali matcher — implements rules.md Part A.
 *
 * A1: compile the Devanagari target into a pattern of accepted Latin spellings,
 *     then test the normalized typed word against it. We never transliterate the
 *     user's input.
 *
 * Pure functions only: no DOM, no network. The single piece of module state is
 * the compiled-pattern cache (A1 / performance: matching runs on every space).
 */

import overridesJson from "../../data/overrides.json";

/* ------------------------------------------------------------------ *
 * A2 — normalization
 * ------------------------------------------------------------------ */

/**
 * Punctuation stripped from both sides before matching (A2, A8).
 *
 * Includes the Part B sign keys `^` (ँ) and `\` (halant). Without them a user
 * who types the signs on purpose gets a preview that matches the target
 * exactly and a word that scores wrong: `chaa^Dai` renders चाँडै, which *is*
 * चाँडै, but the stray `^` breaks the pattern. Stripping them is right rather
 * than merely convenient — A6 makes every nasal and visarga optional, and A4
 * makes halant contribute nothing, so none of these marks carries information
 * the matcher uses. (`M` and `H` need no entry: lowercasing turns them into
 * `m` and `h`, which the ं and ः groups already accept.)
 */
const PUNCTUATION = /[।॥|?,!.;:"'()\-^\\]/g;

/** Nukta, removed from the target after NFC (A2). */
const NUKTA = /़/g;

const LATIN_VOWELS = new Set(["a", "e", "i", "o", "u"]);

/**
 * A2: collapse repeated *consonant* letters (`kamm → kam`, `chha → cha`,
 * `pakka → paka`). Repeated vowels are never collapsed — `aa`, `ee`, `oo`
 * carry meaning. Applied to typed input and to every Latin alternative in the
 * A3/A5 tables.
 */
export function collapseConsonants(input: string): string {
  let out = "";
  for (const ch of input) {
    const prev = out.length > 0 ? out[out.length - 1] : undefined;
    if (prev === ch && /[a-z]/.test(ch) && !LATIN_VOWELS.has(ch)) continue;
    out += ch;
  }
  return out;
}

/** A2: normalize the typed Latin word (lowercase, strip punctuation, collapse). */
export function normalizeTyped(typed: string): string {
  return collapseConsonants(
    typed.normalize("NFC").toLowerCase().replace(PUNCTUATION, "").trim(),
  );
}

/** A2: normalize the Devanagari target (NFC, drop nukta, strip punctuation). */
export function normalizeTarget(target: string): string {
  return target.normalize("NFC").replace(NUKTA, "").replace(PUNCTUATION, "").trim();
}

/** A2: Devanagari digits `०-९` match ASCII digits `0-9`. */
const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/* ------------------------------------------------------------------ *
 * A3 — consonants
 * ------------------------------------------------------------------ */

/** A3: single consonants → accepted Latin spellings. */
export const CONSONANTS: ReadonlyMap<string, readonly string[]> = new Map([
  ["क", ["k", "q"]],
  ["ख", ["kh"]],
  ["ग", ["g"]],
  ["घ", ["gh"]],
  ["ङ", ["ng", "n"]],
  ["च", ["ch", "c"]],
  ["छ", ["chh", "ch", "c"]],
  ["ज", ["j", "z"]],
  ["झ", ["jh"]],
  ["ञ", ["ny", "n"]],
  ["ट", ["t"]],
  ["त", ["t"]],
  ["ठ", ["th"]],
  ["थ", ["th"]],
  ["ड", ["d"]],
  ["द", ["d"]],
  ["ढ", ["dh"]],
  ["ध", ["dh"]],
  ["ण", ["n"]],
  ["न", ["n"]],
  ["प", ["p"]],
  ["फ", ["ph", "f"]],
  ["ब", ["b", "v", "w"]],
  ["भ", ["bh"]],
  ["म", ["m"]],
  ["य", ["y"]],
  ["र", ["r"]],
  ["ल", ["l"]],
  ["व", ["v", "w", "b"]],
  ["श", ["sh", "s"]],
  ["ष", ["sh", "s"]],
  ["स", ["sh", "s"]],
  ["ह", ["h"]],
]);

/** A3: special clusters, matched *before* their component consonants. */
export const CLUSTERS: ReadonlyMap<string, readonly string[]> = new Map([
  ["क्ष", ["ksh", "kch", "x", "chh", "ch"]],
  ["ज्ञ", ["gy", "gny", "gn", "jn"]],
]);

const MAX_CLUSTER_LENGTH = 3;

/* ------------------------------------------------------------------ *
 * A5 — vowels
 * ------------------------------------------------------------------ */

/** A5: independent vowels (always required, so `ma` cannot match आमा). */
export const INDEPENDENT_VOWELS: ReadonlyMap<string, readonly string[]> = new Map([
  ["अ", ["a"]],
  ["आ", ["aa", "a"]],
  ["इ", ["i", "ee"]],
  ["ई", ["ee", "i", "ii"]],
  ["उ", ["u", "oo"]],
  ["ऊ", ["oo", "u", "uu"]],
  ["ए", ["e", "ai", "ae", "ei"]],
  ["ऐ", ["ai", "e", "ei", "ae"]],
  ["ओ", ["o", "au", "ou"]],
  ["औ", ["au", "ou", "o"]],
  ["ऋ", ["ri", "ru"]],
  ["ऑ", ["o", "au", "ou"]],
]);

/** A5: matras (vowel signs), same groups as the independent vowels. */
export const MATRAS: ReadonlyMap<string, readonly string[]> = new Map([
  ["ा", ["aa", "a"]], // ा
  ["ि", ["i", "ee"]], // ि
  ["ी", ["ee", "i", "ii"]], // ी
  ["ु", ["u", "oo"]], // ु
  ["ू", ["oo", "u", "uu"]], // ू
  ["ृ", ["ri", "ru"]], // ृ
  ["े", ["e", "ai", "ae", "ei"]], // े
  ["ै", ["ai", "e", "ei", "ae"]], // ै
  ["ो", ["o", "au", "ou"]], // ो
  ["ौ", ["au", "ou", "o"]], // ौ
  ["ॉ", ["o", "au", "ou"]], // ॉ
  ["ॅ", ["e", "ai", "ae"]], // ॅ
  ["ॆ", ["e", "ai", "ae"]], // ॆ
  ["ॊ", ["o", "au", "ou"]], // ॊ
]);

const HALANT = "्";

/* ------------------------------------------------------------------ *
 * A6 — nasals and visarga (all optional)
 * ------------------------------------------------------------------ */

const OPTIONAL_SIGNS: ReadonlyMap<string, readonly string[]> = new Map([
  ["ं", ["n", "m", "ng"]], // ं anusvara
  ["ँ", ["n", "m"]], // ँ chandrabindu
  ["ः", ["h"]], // ः visarga
]);

/* ------------------------------------------------------------------ *
 * A7 — overrides, checked before the pattern
 * ------------------------------------------------------------------ */

const OVERRIDES: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries(overridesJson as Record<string, readonly string[]>).map(
    ([word, spellings]) =>
      [
        normalizeTarget(word),
        new Set(spellings.map((spelling) => normalizeTyped(spelling))),
      ] as const,
  ),
);

/* ------------------------------------------------------------------ *
 * A1 / A4 — compiling a target into a pattern
 * ------------------------------------------------------------------ */

/**
 * A2: every Latin alternative in the tables is consonant-collapsed too, so
 * `chh` effectively becomes `ch`. Longest first keeps the alternation greedy.
 */
function group(alternatives: readonly string[], optional = false): string {
  const seen = new Set<string>();
  for (const alt of alternatives) {
    const collapsed = collapseConsonants(alt);
    if (collapsed.length > 0) seen.add(collapsed);
  }
  const sorted = [...seen].sort((a, b) => b.length - a.length || a.localeCompare(b));
  if (sorted.length === 0) return "";
  return `(?:${sorted.join("|")})${optional ? "?" : ""}`;
}

/** Optional inherent `a` after a bare consonant (A4). */
const INHERENT_A = "a?";

function isConsonant(ch: string | undefined): boolean {
  return ch !== undefined && CONSONANTS.has(ch);
}

/**
 * A1 + A3–A6: build the regex source for a normalized target word.
 * Exported mostly for tests and debugging; `compileTarget` is the cached entry.
 */
export function compileTargetSource(normalizedTarget: string): string {
  const chars = [...normalizedTarget];
  let out = "";
  let i = 0;

  /** A4: what follows the consonant that ends at index `i`. */
  const consonantTail = (): void => {
    const next = chars[i];
    if (next !== undefined && MATRAS.has(next)) {
      // Followed by a matra: that matra's group, required.
      out += group(MATRAS.get(next) ?? []);
      i += 1;
      return;
    }
    if (next === HALANT) {
      // Halant adds nothing (conjunct or word-final half letter).
      i += 1;
      return;
    }
    // Bare consonant, including word-final: optional inherent `a`.
    out += INHERENT_A;
  };

  while (i < chars.length) {
    const ch = chars[i];
    if (ch === undefined) break;

    // A3: special clusters before single consonants.
    let matchedCluster = false;
    for (let len = MAX_CLUSTER_LENGTH; len >= 2; len -= 1) {
      const slice = chars.slice(i, i + len).join("");
      const alts = CLUSTERS.get(slice);
      if (alts !== undefined) {
        out += group(alts);
        i += len;
        consonantTail();
        matchedCluster = true;
        break;
      }
    }
    if (matchedCluster) continue;

    const consonant = CONSONANTS.get(ch);
    if (consonant !== undefined) {
      out += group(consonant);
      i += 1;
      // A4 geminates: consonant + halant + the same consonant counts once,
      // matching the consonant-collapsed input (पक्का → `pakka` and `paka`).
      if (chars[i] === HALANT && chars[i + 1] === ch && isConsonant(chars[i + 1])) {
        i += 2;
      }
      consonantTail();
      continue;
    }

    const vowel = INDEPENDENT_VOWELS.get(ch);
    if (vowel !== undefined) {
      // A5: an independent vowel is always required.
      out += group(vowel);
      i += 1;
      continue;
    }

    const sign = OPTIONAL_SIGNS.get(ch);
    if (sign !== undefined) {
      // A6: anusvara, chandrabindu and visarga are all optional.
      out += group(sign, true);
      i += 1;
      continue;
    }

    const digitIndex = DEVANAGARI_DIGITS.indexOf(ch);
    if (digitIndex >= 0) {
      out += String(digitIndex); // A2: Devanagari digits match ASCII digits.
      i += 1;
      continue;
    }

    if (/[0-9a-z]/i.test(ch)) {
      out += ch.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i += 1;
      continue;
    }

    // A stray matra, halant, ZWJ/ZWNJ or anything else contributes nothing.
    i += 1;
  }

  return `^${out}$`;
}

/** Compiled-pattern cache, keyed by the raw target word (A1). */
const patternCache = new Map<string, RegExp>();

/** A1: compile (and cache) the accepted-spelling pattern for a target word. */
export function compileTarget(target: string): RegExp {
  const cached = patternCache.get(target);
  if (cached !== undefined) return cached;
  const pattern = new RegExp(compileTargetSource(normalizeTarget(target)));
  patternCache.set(target, pattern);
  return pattern;
}

/**
 * A1: is `typed` an accepted romanized spelling of the Devanagari `target`?
 * Overrides (A7) are checked before the pattern.
 */
export function matchWord(typed: string, target: string): boolean {
  const normalizedTyped = normalizeTyped(typed);
  if (normalizedTyped.length === 0) return false;

  const override = OVERRIDES.get(normalizeTarget(target));
  if (override !== undefined && override.has(normalizedTyped)) return true;

  return compileTarget(target).test(normalizedTyped);
}
