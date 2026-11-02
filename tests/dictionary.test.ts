import { describe, expect, it } from "vitest";
import words from "../src/data/words.json";
import dictionaryJson from "../src/data/dictionary.json";
import { createDictionary, latinSkeleton, wordSkeletons } from "../src/engine/skeleton";
import { hintSpelling } from "../src/engine/hint";
import { matchWord } from "../src/engine/matcher";

const common = words.common as string[];
const dict = createDictionary(dictionaryJson.words);

describe("skeleton keys (rules.md A9)", () => {
  it("gives a typed word the same key as one of its Devanagari word's keys", () => {
    const pairs: [string, string][] = [
      ["nepal", "नेपाल"],
      ["sansar", "संसार"],
      ["buddha", "बुद्ध"],
      ["budha", "बुद्ध"],
      ["phatafat", "फटाफट"],
      ["fatafat", "फटाफट"],
      ["kshetri", "क्षेत्री"],
      ["xetri", "क्षेत्री"],
      ["chhetri", "क्षेत्री"],
      ["rakxya", "रक्षा"],
      ["gyan", "ज्ञान"],
      ["garxa", "गर्छ"],
      ["krishi", "कृषि"],
      ["pakka", "पक्का"],
      ["bhayeko", "भएको"],
      ["dukha", "दुःख"],
      ["garyo", "गर्‍यो"],
    ];
    for (const [typed, word] of pairs) {
      expect(wordSkeletons(word), `${typed} → ${word}`).toContain(latinSkeleton(typed));
    }
  });

  it("keeps aspirates apart (d ≠ dh)", () => {
    expect(latinSkeleton("dan")).not.toBe(latinSkeleton("dhan"));
  });
});

describe("free-mode dictionary", () => {
  it("knows every common word typed in Preeti (exact Devanagari)", () => {
    const missing = common.filter((w) => dict.findDevanagari(w) === null);
    expect(missing).toEqual([]);
  });

  it("finds every common word from its standard romanized spelling", () => {
    const missing: { word: string; typed: string }[] = [];
    for (const word of common) {
      const typed = hintSpelling(word);
      const found = dict.findRomanized(typed);
      if (found === null || !matchWord(typed, found)) missing.push({ word, typed });
    }
    expect(missing).toEqual([]);
  });

  it("accepts other spellings the matcher accepts", () => {
    expect(dict.findRomanized("ful")).toBe("फूल");
    expect(dict.findRomanized("phool")).toBe("फूल");
    expect(dict.findRomanized("kathmandu")).toBe("काठमाडौं");
    expect(dict.findRomanized("dhanyabad")).toBe("धन्यवाद");
  });

  it("finds words only the big list has", () => {
    expect(dict.findDevanagari("प्रस्ताव")).toBe("प्रस्ताव");
    expect(dict.findRomanized("prastab")).toBe("प्रस्ताव");
  });

  it("rejects what is not a word", () => {
    expect(dict.findRomanized("xqzt")).toBeNull();
    expect(dict.findRomanized("asdfgh")).toBeNull();
    expect(dict.findDevanagari("कखगघ")).toBeNull();
    expect(dict.findRomanized("")).toBeNull();
  });

  it("ignores Preeti punctuation and ZWJ when looking up", () => {
    expect(dict.findDevanagari("हो।")).toBe("हो");
    expect(dict.findDevanagari("गर्यो")).not.toBeNull();
  });
});
