import { beforeEach, describe, expect, it } from "vitest";
import { Session } from "../src/session/session";
import type { SessionConfig } from "../src/session/session";
import { RomanizedInput } from "../src/input/romanized";
import type { KeyEvent } from "../src/input/types";

/** A controllable clock, so timed tests do not depend on real time. */
function clock(start = 1_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

const key = (k: string): KeyEvent => ({ key: k, code: `Key${k.toUpperCase()}`, shiftKey: false });
const SPACE: KeyEvent = { key: " ", code: "Space", shiftKey: false };
const BACKSPACE: KeyEvent = { key: "Backspace", code: "Backspace", shiftKey: false };

function type(session: Session, text: string): void {
  for (const ch of text) session.onKey(ch === " " ? SPACE : key(ch));
}

const WORDS = ["मेरो", "काम", "छ", "नेपाल", "राम्रो"] as const;

/**
 * Deterministic "shuffle" that keeps the list in its given order: Fisher-Yates
 * picks j = floor(r * (i + 1)), so r just below 1 always gives j === i and
 * every swap is a no-op. (r = 0 would rotate the list, not preserve it.)
 */
const noShuffle = () => 0.999999;

function makeSession(overrides: Partial<SessionConfig> = {}) {
  const c = clock();
  const session = new Session({
    length: { kind: "words", count: 3 },
    source: { kind: "words", words: WORDS },
    input: new RomanizedInput(),
    now: c.now,
    random: noShuffle,
    ...overrides,
  });
  return { session, c };
}

describe("session setup", () => {
  it("starts idle with the first word targeted", () => {
    const { session } = makeSession();
    expect(session.state.status).toBe("idle");
    expect(session.state.index).toBe(0);
    expect(session.currentTarget).toBe("मेरो");
  });

  it("queues exactly the requested number of words in word-count mode", () => {
    const { session } = makeSession({ length: { kind: "words", count: 3 } });
    expect(session.state.targets).toHaveLength(3);
  });

  it("types a passage in its own order, punctuation included", () => {
    const { session } = makeSession({
      source: { kind: "passage", text: "नेपाल एक सुन्दर देश हो।" },
      length: { kind: "words", count: 5 },
    });
    expect(session.state.targets).toEqual(["नेपाल", "एक", "सुन्दर", "देश", "हो।"]);
  });
});

describe("typing and preview", () => {
  it("shows a live Devanagari preview of the buffer", () => {
    const { session } = makeSession();
    type(session, "mer");
    expect(session.state.buffer).toBe("mer");
    expect(session.state.preview).toBe("मेर");
  });

  it("starts the clock on the first real keystroke, not before", () => {
    const { session, c } = makeSession();
    expect(session.state.status).toBe("idle");
    c.advance(5_000);
    expect(session.state.elapsedMs).toBe(0);
    type(session, "m");
    expect(session.state.status).toBe("running");
    c.advance(1_000);
    expect(session.state.elapsedMs).toBe(1_000);
  });

  it("does not start the clock on a key it ignores", () => {
    const { session } = makeSession();
    session.onKey({ key: "Shift", code: "ShiftLeft", shiftKey: true });
    session.onKey({ key: "ArrowLeft", code: "ArrowLeft", shiftKey: false });
    expect(session.state.status).toBe("idle");
  });
});

describe("committing words", () => {
  it("scores a correct word against its target and advances", () => {
    const { session } = makeSession();
    type(session, "mero ");
    expect(session.state.committed).toEqual([{ target: "मेरो", typed: "mero", correct: true }]);
    expect(session.currentTarget).toBe("काम");
    expect(session.state.buffer).toBe("");
  });

  it("accepts any spelling the rules allow", () => {
    const { session } = makeSession();
    type(session, "maero ");
    // मेरो's े group accepts e|ai|ae, so "maero" is correct.
    expect(session.state.committed[0]?.correct).toBe(true);
  });

  it("marks a wrong word wrong but keeps the target for display", () => {
    const { session } = makeSession();
    type(session, "mro ");
    expect(session.state.committed).toEqual([{ target: "मेरो", typed: "mro", correct: false }]);
    expect(session.currentTarget).toBe("काम");
  });

  it("ignores a space on an empty buffer rather than scoring a blank", () => {
    const { session } = makeSession();
    session.onKey(SPACE);
    session.onKey(SPACE);
    expect(session.state.committed).toHaveLength(0);
    expect(session.state.status).toBe("idle");
  });
});

describe("backspace — returns to a wrong word only", () => {
  it("edits the current buffer normally", () => {
    const { session } = makeSession();
    type(session, "mer");
    session.onKey(BACKSPACE);
    expect(session.state.buffer).toBe("me");
  });

  it("reopens the previous word when it was wrong, restoring what was typed", () => {
    const { session } = makeSession();
    type(session, "mro ");
    expect(session.state.committed).toHaveLength(1);

    session.onKey(BACKSPACE);

    expect(session.state.committed).toHaveLength(0);
    expect(session.state.index).toBe(0);
    expect(session.currentTarget).toBe("मेरो");
    expect(session.state.buffer).toBe("mro");
    expect(session.state.preview).toBe("म्रो");
  });

  it("lets the user fix the reopened word and re-commit it correctly", () => {
    const { session } = makeSession();
    type(session, "mro ");
    session.onKey(BACKSPACE);
    // buffer is "mro"; fix it to "mero"
    session.onKey(BACKSPACE); // "mr"
    session.onKey(BACKSPACE); // "m"
    type(session, "ero ");
    expect(session.state.committed).toEqual([{ target: "मेरो", typed: "mero", correct: true }]);
    expect(session.currentTarget).toBe("काम");
  });

  it("refuses to reopen a word that was correct", () => {
    const { session } = makeSession();
    type(session, "mero ");
    session.onKey(BACKSPACE);
    expect(session.state.committed).toHaveLength(1);
    expect(session.currentTarget).toBe("काम");
    expect(session.state.buffer).toBe("");
  });

  it("does nothing at the very start of the test", () => {
    const { session } = makeSession();
    session.onKey(BACKSPACE);
    expect(session.state.committed).toHaveLength(0);
    expect(session.state.index).toBe(0);
  });

  it("only goes back one word at a time", () => {
    const { session } = makeSession();
    type(session, "mro "); // wrong
    type(session, "gam "); // wrong
    session.onKey(BACKSPACE);
    expect(session.state.index).toBe(1);
    expect(session.currentTarget).toBe("काम");
    // buffer now holds "gam", so a further backspace edits it rather than
    // jumping another word back.
    session.onKey(BACKSPACE);
    expect(session.state.buffer).toBe("ga");
    expect(session.state.committed).toHaveLength(1);
  });
});

describe("finishing", () => {
  it("ends a word-count test when the last word commits", () => {
    const { session } = makeSession({ length: { kind: "words", count: 3 } });
    type(session, "mero kam cha ");
    expect(session.state.status).toBe("finished");
    expect(session.results?.correctWords).toBe(3);
  });

  it("ends a timed test when the clock runs out, even without input", () => {
    const { session, c } = makeSession({ length: { kind: "time", seconds: 30 } });
    type(session, "mero ");
    expect(session.state.status).toBe("running");
    c.advance(30_000);
    session.tick();
    expect(session.state.status).toBe("finished");
  });

  it("reports remaining time in timed mode and remaining words in word mode", () => {
    const timed = makeSession({ length: { kind: "time", seconds: 30 } });
    type(timed.session, "m");
    timed.c.advance(10_000);
    expect(timed.session.state.remainingMs).toBe(20_000);
    expect(timed.session.state.remainingWords).toBeNull();

    const counted = makeSession({ length: { kind: "words", count: 3 } });
    type(counted.session, "mero ");
    expect(counted.session.state.remainingWords).toBe(2);
    expect(counted.session.state.remainingMs).toBeNull();
  });

  it("ends when a passage runs out", () => {
    const { session } = makeSession({
      source: { kind: "passage", text: "मेरो काम" },
      length: { kind: "words", count: 50 },
    });
    type(session, "mero kam ");
    expect(session.state.status).toBe("finished");
  });

  it("stops accepting keystrokes once finished", () => {
    const { session } = makeSession({ length: { kind: "words", count: 1 } });
    type(session, "mero ");
    expect(session.state.status).toBe("finished");
    expect(session.onKey(key("x"))).toBe(false);
    expect(session.state.buffer).toBe("");
  });

  it("has no results until it is finished", () => {
    const { session } = makeSession();
    type(session, "mero ");
    expect(session.results).toBeNull();
  });

  it("freezes elapsed time at the finish", () => {
    const { session, c } = makeSession({ length: { kind: "words", count: 1 } });
    type(session, "m");
    c.advance(4_000);
    type(session, "ero ");
    const atFinish = session.state.elapsedMs;
    c.advance(10_000);
    expect(session.state.elapsedMs).toBe(atFinish);
  });
});

describe("restart", () => {
  it("clears everything and goes back to idle", () => {
    const { session } = makeSession();
    type(session, "mero kam ");
    session.restart();
    const s = session.state;
    expect(s.status).toBe("idle");
    expect(s.index).toBe(0);
    expect(s.committed).toHaveLength(0);
    expect(s.buffer).toBe("");
    expect(s.elapsedMs).toBe(0);
    expect(session.results).toBeNull();
  });
});

describe("keyboard hints", () => {
  it("points at the next key of the canonical spelling", () => {
    const { session } = makeSession();
    expect(session.state.nextKeys).toEqual([{ code: "KeyM", shift: false }]);
    type(session, "m");
    expect(session.state.nextKeys).toEqual([{ code: "KeyE", shift: false }]);
  });

  it("points at space when the word is complete", () => {
    const { session } = makeSession();
    type(session, "mero");
    expect(session.state.nextKeys).toEqual([{ code: "Space", shift: false }]);
  });
});

describe("subscribers", () => {
  let seen: number;
  beforeEach(() => {
    seen = 0;
  });

  it("notifies on every state change and stops after unsubscribe", () => {
    const { session } = makeSession();
    const off = session.subscribe(() => {
      seen += 1;
    });
    type(session, "me");
    expect(seen).toBe(2);
    off();
    type(session, "ro");
    expect(seen).toBe(2);
  });
});

describe("free mode (rules.md A9)", () => {
  // A tiny stand-in dictionary: the session only needs a lookup.
  const lookup = (typed: string) =>
    typed === "mero"
      ? { word: "मेरो", display: "मेरो" }
      : { word: null, display: `?${typed}` };

  it("has no targets and scores each word by the lookup", () => {
    const { session } = makeSession({ free: lookup, length: { kind: "words", count: 2 } });
    expect(session.state.targets).toEqual([]);
    type(session, "mero xqz ");
    expect(session.state.committed).toEqual([
      { target: "मेरो", typed: "mero", correct: true },
      { target: "?xqz", typed: "xqz", correct: false },
    ]);
    expect(session.state.status).toBe("finished");
  });

  it("gives no key hints", () => {
    const { session } = makeSession({ free: lookup });
    expect(session.state.nextKeys).toEqual([]);
  });
});
