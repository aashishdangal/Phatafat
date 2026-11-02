import { describe, expect, it } from "vitest";
import cases from "../data/preeti-test-words.json";
import words from "../src/data/words.json";
import passages from "../src/data/passages.json";
import { keyFor, preetiToUnicode, unicodeToPreeti } from "../src/engine/preeti";

const ZW = /[‌‍]/g;

describe("preeti — data/preeti-test-words.json", () => {
  for (const { unicode, keys } of cases as { unicode: string; keys: string | null }[]) {
    it(`types ${unicode} as ${keys}`, () => {
      expect(unicodeToPreeti(unicode)).toBe(keys);
    });
    if (keys === null) continue; // not typeable from the keyboard (ङ is an Alt code)
    it(`reads ${keys} back as ${unicode}`, () => {
      expect(preetiToUnicode(keys)).toBe(unicode.replace(ZW, ""));
    });
  }
});

describe("preeti — round trip over the real content", () => {
  const all = [
    ...(words.common as string[]),
    ...passages.passages.flatMap((p) => p.text.trim().split(/\s+/)),
  ];

  it("converts every word it can type back to the same word", () => {
    const broken: { word: string; keys: string; back: string }[] = [];
    for (const word of all) {
      const keys = unicodeToPreeti(word);
      if (keys === null) continue;
      const back = preetiToUnicode(keys);
      if (back !== word.normalize("NFC").replace(ZW, "")) broken.push({ word, keys, back });
    }
    expect(broken).toEqual([]);
  });

  it("can type nearly all of it", () => {
    const untypeable = all.filter((w) => unicodeToPreeti(w) === null);
    // Only letters with no confirmed Preeti key (ङ for now) may be missing.
    expect(untypeable.filter((w) => !w.includes("ङ"))).toEqual([]);
  });
});

describe("preeti — physical keys", () => {
  it("knows which key and Shift state makes each character", () => {
    expect(keyFor("s")).toEqual({ code: "KeyS", shift: false });
    expect(keyFor("S")).toEqual({ code: "KeyS", shift: true });
    expect(keyFor("{")).toEqual({ code: "BracketLeft", shift: true });
    expect(keyFor("'")).toEqual({ code: "Quote", shift: false });
    expect(keyFor("@")).toEqual({ code: "Digit2", shift: true });
    expect(keyFor(" ")).toEqual({ code: "Space", shift: false });
  });
});
