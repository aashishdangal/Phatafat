/**
 * Next-key hints for the on-screen keyboard, romanized mode.
 *
 * CLAUDE.md: "The hint follows the first spelling in each group of rules.md
 * A3/A5 (e.g. फ → `p` then `h`). Any accepted spelling still counts; it's only
 * a hint." So we build one canonical Latin spelling of the target from the
 * first alternative of each group, and point at its next character.
 *
 * When the user types a different accepted spelling (`f` for फ, say), their
 * buffer stops being a prefix of the canonical spelling and we simply stop
 * hinting rather than nag them toward a spelling they did not choose. The
 * matcher still accepts what they typed.
 *
 * Pure functions, no DOM.
 */

import type { KeyHint } from "../input/types";
import {
  CLUSTERS,
  CONSONANTS,
  INDEPENDENT_VOWELS,
  MATRAS,
  normalizeTarget,
} from "./matcher";

const HALANT = "्";
const MAX_CLUSTER_LENGTH = 3;

/**
 * Hint-only spelling preferences — they override the "first alternative in the
 * group" default and affect NOTHING about matching.
 *
 * The groups in rules.md A3/A5 are ordered for matching, where order carries
 * no meaning, so their first entry is sometimes not what a Nepali typist
 * actually presses:
 *
 *   स   A3 merges श/ष/स into one row whose first entry is `sh`. Correct for
 *       श and ष, wrong for स — nobody types नमस्ते as "namashte".
 *   ी ई  A5's first entry is `ee`, so तिमी would hint "timee" over "timi".
 *   ू ऊ  likewise `oo`, so हजुर would hint "hajoor" over "hajur".
 *
 * Every preference here is still an accepted spelling under Part A — the test
 * suite asserts that for every word in data/test-words.json — so the hint can
 * never point at something the matcher would reject.
 */
const HINT_PREFERENCE: ReadonlyMap<string, string> = new Map([
  ["स", "s"],
  ["ी", "i"],
  ["ई", "i"],
  ["ू", "u"],
  ["ऊ", "u"],
]);

/**
 * A6 signs are optional, so the canonical spelling leaves them out — except
 * anusvara, which Nepali typists do type: संसार reads naturally as "sansaar",
 * not "sasaar". Chandrabindu and visarga stay out, since चाँडै is typed
 * "chadai" far more often than "chandai".
 */
const SIGN_HINTS: ReadonlyMap<string, string> = new Map([
  ["ं", "n"],
  ["ँ", ""],
  ["ः", ""],
]);

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/** The spelling to hint for one Devanagari character. */
function preferred(ch: string, group: readonly string[] | undefined): string {
  return HINT_PREFERENCE.get(ch) ?? group?.[0] ?? "";
}

/**
 * The canonical Latin spelling of a Devanagari word: the first accepted
 * spelling of each sound, in order.
 *
 * The inherent `a` after a bare consonant is included only when another
 * consonant follows it, since that is how the word is actually typed: कम →
 * `kam`, not `kama`, while गर्नु → `garnu` keeps the `a` that makes `gar`
 * typable. Both spellings match either way (A4 makes the inherent `a`
 * optional); this only decides what the keyboard points at.
 */
export function hintSpelling(target: string): string {
  const chars = [...normalizeTarget(target)];
  let out = "";
  let i = 0;

  const isConsonantAt = (index: number): boolean => {
    const ch = chars[index];
    if (ch === undefined) return false;
    if (CONSONANTS.has(ch)) return true;
    for (let len = MAX_CLUSTER_LENGTH; len >= 2; len -= 1) {
      if (CLUSTERS.has(chars.slice(index, index + len).join(""))) return true;
    }
    return false;
  };

  /** What follows the consonant that ends at index `i` (A4). */
  const consonantTail = (): void => {
    const next = chars[i];
    if (next !== undefined && MATRAS.has(next)) {
      out += preferred(next, MATRAS.get(next));
      i += 1;
      return;
    }
    if (next === HALANT) {
      i += 1;
      return;
    }
    // Bare consonant: keep the inherent `a` only before another consonant.
    if (isConsonantAt(i)) out += "a";
  };

  while (i < chars.length) {
    const ch = chars[i];
    if (ch === undefined) break;

    let cluster = false;
    for (let len = MAX_CLUSTER_LENGTH; len >= 2; len -= 1) {
      const slice = chars.slice(i, i + len).join("");
      const alts = CLUSTERS.get(slice);
      if (alts !== undefined) {
        out += preferred(slice, alts);
        i += len;
        consonantTail();
        cluster = true;
        break;
      }
    }
    if (cluster) continue;

    const consonant = CONSONANTS.get(ch);
    if (consonant !== undefined) {
      out += preferred(ch, consonant);
      i += 1;
      // A geminate is typed once, matching the collapsed input (पक्का → paka).
      if (chars[i] === HALANT && chars[i + 1] === ch) i += 2;
      consonantTail();
      continue;
    }

    const vowel = INDEPENDENT_VOWELS.get(ch);
    if (vowel !== undefined) {
      out += preferred(ch, vowel);
      i += 1;
      continue;
    }

    const signHint = SIGN_HINTS.get(ch);
    if (signHint !== undefined) {
      out += signHint;
      i += 1;
      continue;
    }

    const digit = DEVANAGARI_DIGITS.indexOf(ch);
    if (digit >= 0) {
      out += String(digit);
      i += 1;
      continue;
    }

    if (/[0-9a-z]/i.test(ch)) {
      out += ch.toLowerCase();
      i += 1;
      continue;
    }

    i += 1;
  }

  return out;
}

/** KeyboardEvent.code for a character the user should press. */
export function codeForChar(ch: string): string | null {
  if (ch === " ") return "Space";
  if (/^[a-z]$/.test(ch)) return `Key${ch.toUpperCase()}`;
  if (/^[0-9]$/.test(ch)) return `Digit${ch}`;
  return null;
}

/**
 * The key to press next, given the target and what has been typed so far.
 * Empty when there is no target, the word is finished (press space), or the
 * user has taken a different valid spelling.
 */
export function nextHintKeys(target: string | null, typedSoFar: string): KeyHint[] {
  if (target === null) return [];

  const canonical = hintSpelling(target);
  const typed = typedSoFar.toLowerCase();

  if (typed.length >= canonical.length) {
    // Word complete under the canonical spelling: the next key is space.
    return typed === canonical ? [{ code: "Space", shift: false }] : [];
  }
  if (!canonical.startsWith(typed)) return [];

  const next = canonical[typed.length];
  if (next === undefined) return [];
  const code = codeForChar(next);
  return code === null ? [] : [{ code, shift: false }];
}
