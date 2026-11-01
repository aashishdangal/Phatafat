import { describe, expect, it } from "vitest";
import { codeForChar, hintSpelling, nextHintKeys } from "../src/engine/hint";
import { matchWord } from "../src/engine/matcher";
import cases from "../data/test-words.json";

describe("hintSpelling", () => {
  it("uses the first spelling of each group (फ → ph, not f)", () => {
    expect(hintSpelling("फटाफट")).toBe("phataaphat");
  });

  it("keeps the inherent a before a consonant and drops it word-final", () => {
    expect(hintSpelling("कम")).toBe("kam");
    expect(hintSpelling("गर्नु")).toBe("garnu");
    expect(hintSpelling("कमल")).toBe("kamal");
  });

  it("takes the matra's own group when one follows", () => {
    expect(hintSpelling("मेरो")).toBe("mero");
    expect(hintSpelling("काम")).toBe("kaam");
  });

  it("adds nothing for a halant", () => {
    expect(hintSpelling("नमस्ते")).toBe("namaste");
  });

  it("types a geminate once", () => {
    expect(hintSpelling("पक्का")).toBe("pakaa");
  });

  it("types anusvara but leaves out chandrabindu and visarga", () => {
    expect(hintSpelling("तपाईं")).toBe("tapaain");
    expect(hintSpelling("चाँडै")).toBe("chaadai");
  });

  it("uses the first spelling for clusters", () => {
    expect(hintSpelling("क्षेत्री")).toBe("kshetri");
    expect(hintSpelling("ज्ञान")).toBe("gyaan");
  });

  it("maps Devanagari digits to ASCII", () => {
    expect(hintSpelling("२०८३")).toBe("2083");
  });

  it("requires the independent vowel", () => {
    expect(hintSpelling("आमा")).toBe("aamaa");
  });
});

describe("hintSpelling is always itself an accepted spelling", () => {
  // The hint must never point the user at something the matcher rejects.
  for (const { target } of cases as { target: string }[]) {
    it(`${target} → "${hintSpelling(target)}" is accepted`, () => {
      expect(matchWord(hintSpelling(target), target)).toBe(true);
    });
  }
});

describe("nextHintKeys", () => {
  it("points at the first key of an untouched word", () => {
    expect(nextHintKeys("मेरो", "")).toEqual([{ code: "KeyM", shift: false }]);
  });

  it("advances through the word", () => {
    expect(nextHintKeys("मेरो", "m")).toEqual([{ code: "KeyE", shift: false }]);
    expect(nextHintKeys("मेरो", "me")).toEqual([{ code: "KeyR", shift: false }]);
    expect(nextHintKeys("मेरो", "mer")).toEqual([{ code: "KeyO", shift: false }]);
  });

  it("points at space once the word is complete", () => {
    expect(nextHintKeys("मेरो", "mero")).toEqual([{ code: "Space", shift: false }]);
  });

  it("stops hinting when the user takes another valid spelling", () => {
    // `f` for फ is accepted by the matcher but is not the canonical spelling.
    expect(matchWord("fatafat", "फटाफट")).toBe(true);
    expect(nextHintKeys("फटाफट", "f")).toEqual([]);
  });

  it("stops hinting on a wrong key rather than guessing", () => {
    expect(nextHintKeys("मेरो", "x")).toEqual([]);
  });

  it("gives no hint without a target (free mode)", () => {
    expect(nextHintKeys(null, "")).toEqual([]);
    expect(nextHintKeys(null, "kam")).toEqual([]);
  });

  it("is case-insensitive about what was typed", () => {
    expect(nextHintKeys("मेरो", "M")).toEqual([{ code: "KeyE", shift: false }]);
  });
});

describe("codeForChar", () => {
  it("maps letters, digits and space", () => {
    expect(codeForChar("a")).toBe("KeyA");
    expect(codeForChar("z")).toBe("KeyZ");
    expect(codeForChar("7")).toBe("Digit7");
    expect(codeForChar(" ")).toBe("Space");
  });

  it("returns null for anything without a key", () => {
    expect(codeForChar("।")).toBeNull();
  });
});
