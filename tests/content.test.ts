import { describe, expect, it } from "vitest";
import words from "../src/data/words.json";
import passages from "../src/data/passages.json";
import { matchWord } from "../src/engine/matcher";
import { hintSpelling } from "../src/engine/hint";

/**
 * Content guard rails.
 *
 * The word list and passages are Nepali text written by hand, so the thing
 * worth testing is not their spelling — only a Nepali speaker can judge that —
 * but whether the engine can actually handle them. A word nobody can type
 * correctly is a broken test item, and the canonical hint spelling is the
 * sharpest probe we have: if the keyboard would point the user at a spelling
 * the matcher rejects, that word is unplayable.
 */

const common = words.common as string[];
const texts = passages.passages as { id: string; title: string; text: string }[];

describe("word list", () => {
  it("has a usable number of words", () => {
    expect(common.length).toBeGreaterThanOrEqual(150);
  });

  it("has no duplicates", () => {
    expect(new Set(common).size).toBe(common.length);
  });

  it("is all Devanagari, with no stray Latin, spaces or punctuation", () => {
    // U+0900-U+097F plus ZWNJ and ZWJ: eyelash ra (गर्‍यो) is spelled with a
    // ZWJ, which rules.md A2 strips from the target, so it belongs here.
    const bad = common.filter((w) => !/^[\u0900-\u097F\u200c\u200d]+$/.test(w));
    expect(bad).toEqual([]);
  });

  it("contains no danda", () => {
    expect(common.filter((w) => w.includes("।"))).toEqual([]);
  });

  it("is typeable: every word accepts its own canonical hint spelling", () => {
    const unplayable = common
      .map((w) => ({ word: w, hint: hintSpelling(w) }))
      .filter(({ word, hint }) => hint === "" || !matchWord(hint, word));
    expect(unplayable).toEqual([]);
  });
});

describe("passages", () => {
  it("has several, each with an id, title and text", () => {
    expect(texts.length).toBeGreaterThanOrEqual(3);
    for (const p of texts) {
      expect(p.id).toMatch(/^[a-z0-9-]+$/);
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.text.length).toBeGreaterThan(0);
    }
  });

  it("has unique ids", () => {
    const ids = texts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is long enough to type for 30 seconds but not endless", () => {
    for (const p of texts) {
      const count = p.text.trim().split(/\s+/).length;
      expect(count).toBeGreaterThanOrEqual(30);
      expect(count).toBeLessThanOrEqual(120);
    }
  });

  it("is typeable: every word in every passage accepts its hint spelling", () => {
    const unplayable: { passage: string; word: string; hint: string }[] = [];
    for (const p of texts) {
      for (const word of p.text.trim().split(/\s+/)) {
        const hint = hintSpelling(word);
        if (hint === "" || !matchWord(hint, word)) {
          unplayable.push({ passage: p.id, word, hint });
        }
      }
    }
    expect(unplayable).toEqual([]);
  });
});
