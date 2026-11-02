import { describe, expect, it } from "vitest";
import { LANGUAGE, TABLES } from "../src/ui/strings";

const DEVANAGARI = /[ऀ-ॿ]/;

describe("interface languages", () => {
  const keys = Object.keys(TABLES.ne);

  it("gives every label in every language", () => {
    for (const table of Object.values(TABLES)) {
      expect(Object.keys(table).sort()).toEqual([...keys].sort());
      for (const value of Object.values(table)) expect(value.trim()).not.toBe("");
    }
  });

  it("names every feature in English in English mode (the app name stays फटाफट)", () => {
    const nepali = Object.entries(TABLES.en).filter(
      ([key, value]) => key !== "appName" && DEVANAGARI.test(value),
    );
    expect(nepali).toEqual([]);
  });

  it("mixes: some labels English, most still Nepali", () => {
    const english = keys.filter((k) => !DEVANAGARI.test(TABLES.mix[k as keyof typeof TABLES.mix]));
    expect(english.length).toBeGreaterThan(10);
    expect(english.length).toBeLessThan(keys.length / 2);
  });

  it("defaults to mixed", () => {
    expect(LANGUAGE).toBe("mix");
  });
});
