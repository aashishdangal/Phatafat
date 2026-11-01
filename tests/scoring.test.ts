import { describe, expect, it } from "vitest";
import { countGraphemes, computeResults } from "../src/engine/scoring";
import type { CommittedWord } from "../src/engine/scoring";

const word = (target: string, typed: string, correct: boolean): CommittedWord => ({
  target,
  typed,
  correct,
});

describe("countGraphemes", () => {
  it("counts Devanagari by grapheme cluster, not code point", () => {
    // मेरो is 4 code points (म े र ो) but 2 clusters: मे + रो
    expect("मेरो".length).toBe(4);
    expect(countGraphemes("मेरो")).toBe(2);
  });

  it("counts a conjunct with halant as one cluster", () => {
    // गर्नु → ग + र्नु ... the halant binds र to नु
    expect(countGraphemes("गर्नु")).toBeLessThan("गर्नु".length);
  });

  it("counts तपाईं correctly", () => {
    expect(countGraphemes("तपाईं")).toBe(3); // त + पा + ईं
  });

  it("handles the empty string", () => {
    expect(countGraphemes("")).toBe(0);
  });

  it("counts ASCII one per character", () => {
    expect(countGraphemes("kamal")).toBe(5);
  });
});

describe("computeResults", () => {
  it("is all zeroes with nothing committed", () => {
    const r = computeResults([], 30_000);
    expect(r.grossWpm).toBe(0);
    expect(r.netWpm).toBe(0);
    expect(r.wordAccuracy).toBe(0);
    expect(r.correctWords).toBe(0);
    expect(r.errors).toBe(0);
  });

  it("counts graphemes of correct targets plus the spaces between them", () => {
    // मेरो (2) + काम (2) + छ (1) = 5 clusters, 2 spaces between 3 words = 7
    // 7 / 5 / 0.5min = 2.8
    const committed = [
      word("मेरो", "mero", true),
      word("काम", "kam", true),
      word("छ", "cha", true),
    ];
    const r = computeResults(committed, 30_000);
    expect(r.grossWpm).toBeCloseTo(2.8, 5);
  });

  it("ignores wrong words when counting speed", () => {
    const committed = [word("मेरो", "mero", true), word("काम", "gam", false)];
    // only मेरो counts: 2 clusters, 0 spaces (one correct word) = 2
    const r = computeResults(committed, 60_000);
    expect(r.grossWpm).toBeCloseTo(0.4, 5);
  });

  it("subtracts errors per minute for net WPM", () => {
    const committed = [
      word("मेरो", "mero", true),
      word("काम", "kam", true),
      word("छ", "ja", false),
    ];
    // gross: मेरो+काम = 4 clusters + 1 space = 5 → 5/5/0.5 = 2
    // 1 error over 0.5 min = 2 errors/min → net 0
    const r = computeResults(committed, 30_000);
    expect(r.grossWpm).toBeCloseTo(2, 5);
    expect(r.errors).toBe(1);
    expect(r.netWpm).toBeCloseTo(0, 5);
  });

  it("never reports a negative net WPM", () => {
    const committed = [word("मेरो", "x", false), word("काम", "y", false)];
    const r = computeResults(committed, 30_000);
    expect(r.netWpm).toBe(0);
  });

  it("reports word accuracy as correct over committed", () => {
    const committed = [
      word("मेरो", "mero", true),
      word("काम", "kam", true),
      word("छ", "ja", false),
      word("नेपाल", "nepal", true),
    ];
    expect(computeResults(committed, 30_000).wordAccuracy).toBeCloseTo(0.75, 5);
  });

  it("reports character accuracy only when keystrokes are supplied", () => {
    const committed = [word("मेरो", "mero", true)];
    expect(computeResults(committed, 30_000).charAccuracy).toBeUndefined();
    const withKeys = computeResults(committed, 30_000, { total: 50, correct: 47 });
    expect(withKeys.charAccuracy).toBeCloseTo(0.94, 5);
  });

  it("treats zero elapsed time as no speed rather than dividing by zero", () => {
    const r = computeResults([word("मेरो", "mero", true)], 0);
    expect(Number.isFinite(r.grossWpm)).toBe(true);
    expect(r.grossWpm).toBe(0);
  });

  it("lists the wrong words so the results screen can show them", () => {
    const committed = [word("मेरो", "mero", true), word("काम", "gam", false)];
    expect(computeResults(committed, 30_000).wrongWords).toEqual([
      { target: "काम", typed: "gam" },
    ]);
  });
});
