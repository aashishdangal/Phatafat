/**
 * rules.md A9: the free-typing dictionary.
 *
 * Free mode has no target, so a committed word is valid if the dictionary
 * holds a word it matches. Running the A1 matcher against 30,000 words per
 * keystroke would be far too slow, so words are bucketed by a *skeleton*:
 * the word's consonant classes, folded exactly as A3 folds them, with the
 * letters typists often leave out or add dropped altogether:
 *
 *   - vowels and matras, ं ँ ः ्, ZWJ/ZWNJ
 *   - n, m (anusvara is typed as n or m, or not at all; ञ ण न म fold here)
 *   - y (the optional glide before ए, the y of a sounded-out क्ष, य itself)
 *   - h (visarga typed as h; ह folds here too)
 *
 * The typed word's skeleton picks a bucket of a few candidates; the real A1
 * matcher then decides. A skeleton only narrows the search: it can let a
 * wrong candidate into the bucket, never let a wrong word pass.
 *
 * Preeti commits Devanagari, so its lookup is a plain exact match after the
 * A10 normalization.
 *
 * Pure functions, no DOM.
 */

import { matchWord, normalizeTarget, normalizeTyped } from "./matcher";

type Skel = readonly string[];

/* ------------------------------------------------------------------ *
 * Latin side
 * ------------------------------------------------------------------ */

/** Greedy longest-first: [spelling, class]. "" = dropped. */
const LATIN: ReadonlyArray<readonly [string, string]> = [
  ["kh", "KH"], ["gh", "GH"], ["ch", "C"], ["jh", "JH"], ["th", "TH"],
  ["dh", "DH"], ["ph", "PH"], ["bh", "BH"], ["sh", "S"],
  ["k", "K"], ["q", "K"], ["g", "G"], ["c", "C"], ["x", "C"], ["j", "J"],
  ["z", "J"], ["t", "T"], ["d", "D"], ["p", "P"], ["f", "PH"], ["b", "B"],
  ["v", "B"], ["w", "B"], ["s", "S"], ["r", "R"], ["l", "L"],
  ["n", ""], ["m", ""], ["y", ""], ["h", ""],
];

/** The skeleton of a typed Latin word, as a bucket key. */
export function latinSkeleton(typed: string): string {
  const text = normalizeTyped(typed);
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const hit = LATIN.find(([spelling]) => text.startsWith(spelling, i));
    if (hit !== undefined) {
      if (hit[1] !== "") out.push(hit[1]);
      i += hit[0].length;
      continue;
    }
    if (/[0-9]/.test(text[i] as string)) out.push(text[i] as string);
    i += 1; // vowels and anything else
  }
  return key(out);
}

/* ------------------------------------------------------------------ *
 * Devanagari side
 * ------------------------------------------------------------------ */

const DEV: ReadonlyMap<string, string> = new Map([
  ["क", "K"], ["ख", "KH"], ["ग", "G"], ["घ", "GH"], ["च", "C"], ["छ", "C"],
  ["ज", "J"], ["झ", "JH"], ["ञ", ""], ["ट", "T"], ["ठ", "TH"], ["ड", "D"],
  ["ढ", "DH"], ["ण", ""], ["त", "T"], ["थ", "TH"], ["द", "D"], ["ध", "DH"],
  ["न", ""], ["प", "P"], ["फ", "PH"], ["ब", "B"], ["भ", "BH"], ["म", ""],
  ["य", ""], ["र", "R"], ["ल", "L"], ["व", "B"], ["श", "S"], ["ष", "S"],
  ["स", "S"], ["ह", ""],
  // ऋ / ृ are typed ri or ru (A5), so they carry an R.
  ["ऋ", "R"], ["ृ", "R"],
]);

/** Units with more than one accepted spelling, each a list of classes. */
const VARIANTS: ReadonlyArray<readonly [string, readonly Skel[]]> = [
  // A3: ksh kch x chh ch, each with an optional k before (a y after drops).
  ["क्ष", [["K", "S"], ["K", "C"], ["C"]]],
  // A3: gy gny gn jn.
  ["ज्ञ", [["G"], ["J"]]],
  // A3: ng or n.
  ["ङ", [[], ["G"]]],
];

const DIGITS = "०१२३४५६७८९";
const MAX_VARIANTS = 32;

/** Every skeleton a Devanagari word's accepted spellings can produce. */
export function wordSkeletons(word: string): string[] {
  const chars = [...normalizeTarget(word).replace(/[‌‍]/g, "")];
  let paths: string[][] = [[]];
  let i = 0;
  while (i < chars.length) {
    const rest = chars.slice(i).join("");
    const variant = VARIANTS.find(([unit]) => rest.startsWith(unit));
    if (variant !== undefined) {
      const [unit, options] = variant;
      paths = paths.flatMap((p) => options.map((o) => [...p, ...o])).slice(0, MAX_VARIANTS);
      i += [...unit].length;
      continue;
    }
    const ch = chars[i] as string;
    const cls = DEV.get(ch);
    if (cls !== undefined && cls !== "") paths = paths.map((p) => [...p, cls]);
    const digit = DIGITS.indexOf(ch);
    if (digit >= 0) paths = paths.map((p) => [...p, String(digit)]);
    i += 1;
  }
  return [...new Set(paths.map(key))];
}

/* ------------------------------------------------------------------ *
 * Shared folding
 * ------------------------------------------------------------------ */

const ASPIRATE: ReadonlyMap<string, string> = new Map([
  ["K", "KH"], ["G", "GH"], ["J", "JH"], ["T", "TH"],
  ["D", "DH"], ["P", "PH"], ["B", "BH"],
]);

/**
 * A2 + A4 on a class sequence: repeated classes count once (pakka = paka),
 * and a class right before its own aspirate is dropped (बुद्ध: buddha →
 * budha, A4 aspirate geminates).
 */
function key(classes: Skel): string {
  const out: string[] = [];
  for (const c of classes) {
    const last = out[out.length - 1];
    if (last === c) continue;
    if (last !== undefined && ASPIRATE.get(last) === c) out.pop();
    if (out[out.length - 1] === c) continue;
    out.push(c);
  }
  return out.join(".");
}

/* ------------------------------------------------------------------ *
 * The dictionary
 * ------------------------------------------------------------------ */

export interface Dictionary {
  readonly size: number;
  /** The dictionary word a romanized spelling stands for, or null. */
  findRomanized(typed: string): string | null;
  /** The dictionary word typed as Devanagari (Preeti), or null. */
  findDevanagari(typed: string): string | null;
}

/**
 * Index a word list. Earlier words win when one spelling matches several
 * (`kam` is both काम and कम), so the list should run most-common first.
 */
export function createDictionary(words: readonly string[]): Dictionary {
  const buckets = new Map<string, string[]>();
  const exact = new Map<string, string>();

  for (const word of words) {
    for (const k of wordSkeletons(word)) {
      const bucket = buckets.get(k);
      if (bucket === undefined) buckets.set(k, [word]);
      else bucket.push(word);
    }
    const plain = devanagariKey(word);
    if (plain !== "" && !exact.has(plain)) exact.set(plain, word);
  }

  return {
    size: words.length,
    findRomanized(typed) {
      if (normalizeTyped(typed) === "") return null;
      const candidates = buckets.get(latinSkeleton(typed)) ?? [];
      return candidates.find((word) => matchWord(typed, word)) ?? null;
    },
    findDevanagari(typed) {
      return exact.get(devanagariKey(typed)) ?? null;
    },
  };
}

/** A10: the same normalization on both sides, so ZWJ and danda never matter. */
function devanagariKey(text: string): string {
  return normalizeTarget(text.replace(/[‌‍]/g, ""));
}
