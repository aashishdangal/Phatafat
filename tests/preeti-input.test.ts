import { describe, expect, it } from "vitest";
import { Session } from "../src/session/session";
import { PreetiInput } from "../src/input/preeti";
import type { KeyEvent } from "../src/input/types";

const ev = (k: string): KeyEvent => ({
  key: k,
  code: k === " " ? "Space" : k === "Backspace" ? "Backspace" : "KeyX",
  shiftKey: k.length === 1 && k !== k.toLowerCase(),
});

function makeSession(words: string[]) {
  let t = 1_000;
  const input = new PreetiInput();
  const session = new Session({
    length: { kind: "words", count: words.length },
    source: { kind: "words", words },
    input,
    now: () => t,
    random: () => 0.999999, // keep the given order
  });
  const type = (keys: string) => {
    for (const k of keys) {
      t += 100;
      session.onKey(ev(k));
    }
  };
  return { session, input, type };
}

describe("Preeti mode through the real session", () => {
  it("scores a word typed with its standard keys as correct", () => {
    const { session, type } = makeSession(["नेपाल", "किताब"]);
    type("g]kfn lstfa ");
    expect(session.state.committed.map((w) => w.correct)).toEqual([true, true]);
    expect(session.state.status).toBe("finished");
  });

  it("marks a wrong key, moves on, and scores the word wrong", () => {
    const { session, input, type } = makeSession(["नेपाल", "छ"]);
    type("g]");
    const wrong = input.onKey(ev("s"));
    expect(wrong.keyCorrect).toBe(false);
    type("fn 5 ");
    expect(session.state.committed.map((w) => w.correct)).toEqual([false, true]);
  });

  it("previews the Devanagari as keys are typed, ि and reph included", () => {
    const { session, type } = makeSession(["किताब", "धर्म"]);
    type("ls");
    expect(session.state.preview).toBe("कि");
    type("tfa wd{");
    expect(session.state.preview).toBe("धर्म");
  });

  it("hints the next key with Shift, then space at the end of the word", () => {
    const { session, type } = makeSession(["सिक्नु"]);
    // l;Sg'  — S needs Shift.
    type("l;");
    expect(session.state.nextKeys).toEqual([{ code: "KeyS", shift: true }]);
    type("Sg'");
    expect(session.state.nextKeys).toEqual([{ code: "Space", shift: false }]);
  });

  it("reopens a wrong word with the keys that were typed", () => {
    const { session, type } = makeSession(["नेपाल", "छ", "हो"]);
    type("g]kn ");
    session.onKey(ev("Backspace"));
    expect(session.state.committed).toHaveLength(0);
    expect(session.state.preview).toBe("नेपल");
  });
});
