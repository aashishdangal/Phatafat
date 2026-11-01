import { describe, expect, it } from "vitest";
import cases from "../data/test-words.json";
import { matchWord } from "../src/engine/matcher";

interface Case {
  target: string;
  accept: string[];
  reject: string[];
}

const words = cases as Case[];

describe("matcher — data/test-words.json", () => {
  for (const { target, accept, reject } of words) {
    for (const typed of accept) {
      it(`accepts "${typed}" for ${target}`, () => {
        expect(matchWord(typed, target)).toBe(true);
      });
    }
    for (const typed of reject) {
      it(`rejects "${typed}" for ${target}`, () => {
        expect(matchWord(typed, target)).toBe(false);
      });
    }
  }
});
