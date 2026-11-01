/**
 * The running test.
 *
 * Owns the target words, the clock, the committed results and the scoring. It
 * takes keystrokes, hands them to whichever InputMethod is active, and when
 * one comes back with a commit it decides correct or wrong. It never asks
 * which mode is active, so Preeti and free mode plug in without changing this
 * file.
 *
 * No DOM: the clock is injected, and the UI subscribes for state.
 */

import { matchWord } from "../engine/matcher";
import { computeResults } from "../engine/scoring";
import type { CommittedWord, KeystrokeTally, Results } from "../engine/scoring";
import type { InputMethod, KeyEvent, KeyHint } from "../input/types";

export type TestLength =
  | { kind: "time"; seconds: number }
  | { kind: "words"; count: number };

export type WordSource =
  | { kind: "words"; words: readonly string[] }
  | { kind: "passage"; text: string };

export interface SessionConfig {
  length: TestLength;
  source: WordSource;
  input: InputMethod;
  /** Free mode has no targets: committed words are judged by dictionary. */
  free?: boolean;
  /** Injected for tests; defaults to Date.now. */
  now?: () => number;
  /** Injected for tests; defaults to Math.random. */
  random?: () => number;
}

export type SessionStatus = "idle" | "running" | "finished";

export interface SessionState {
  status: SessionStatus;
  /** The target words, in order. Empty in free mode. */
  targets: readonly string[];
  /** Index of the word being typed. */
  index: number;
  committed: readonly CommittedWord[];
  buffer: string;
  preview: string;
  /** Keys the on-screen keyboard should highlight. */
  nextKeys: readonly KeyHint[];
  /** Milliseconds left, or null in word-count mode. */
  remainingMs: number | null;
  /** Words left to type, or null in timed mode. */
  remainingWords: number | null;
  elapsedMs: number;
  results: Results | null;
}

/** How many words to queue up for a timed test before recycling the list. */
const TIMED_WORD_BUFFER = 200;

export class Session {
  private readonly config: SessionConfig;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly input: InputMethod;

  private status: SessionStatus = "idle";
  private targets: string[] = [];
  private index = 0;
  private committed: CommittedWord[] = [];
  private keystrokes: KeystrokeTally = { total: 0, correct: 0 };
  private startedAt: number | null = null;
  private finishedAt: number | null = null;
  private buffer = "";
  private preview = "";
  private listeners = new Set<(state: SessionState) => void>();

  constructor(config: SessionConfig) {
    this.config = config;
    this.now = config.now ?? (() => Date.now());
    this.random = config.random ?? Math.random;
    this.input = config.input;
    this.buildTargets();
    this.syncTarget();
  }

  /* ---------------------------------------------------------------- *
   * Target words
   * ---------------------------------------------------------------- */

  private buildTargets(): void {
    const { source, length, free } = this.config;

    if (free === true) {
      this.targets = [];
      return;
    }

    if (source.kind === "passage") {
      // A passage is typed in its own order, punctuation and all.
      this.targets = source.text.trim().split(/\s+/);
      return;
    }

    const pool = [...source.words];
    const wanted = length.kind === "words" ? length.count : TIMED_WORD_BUFFER;
    const out: string[] = [];
    // Shuffle, then keep drawing fresh shuffles so a long timed test never
    // repeats a word until the whole list has been used.
    while (out.length < wanted && pool.length > 0) {
      const round = this.shuffle(pool);
      out.push(...round.slice(0, wanted - out.length));
    }
    this.targets = out;
  }

  private shuffle(words: readonly string[]): string[] {
    const out = [...words];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.random() * (i + 1));
      const a = out[i];
      const b = out[j];
      if (a !== undefined && b !== undefined) {
        out[i] = b;
        out[j] = a;
      }
    }
    return out;
  }

  /** The word currently being typed, or null in free mode / past the end. */
  get currentTarget(): string | null {
    return this.targets[this.index] ?? null;
  }

  private syncTarget(): void {
    this.input.setTarget(this.config.free === true ? null : this.currentTarget);
  }

  /* ---------------------------------------------------------------- *
   * Keystrokes
   * ---------------------------------------------------------------- */

  /**
   * Feed a keystroke in. Returns true when the session consumed it, so the UI
   * knows whether to preventDefault.
   */
  onKey(event: KeyEvent): boolean {
    if (this.status === "finished") return false;

    const isBackspaceAtStart = event.key === "Backspace" && this.buffer.length === 0;

    const update = this.input.onKey(event);

    // Start the clock on the first keystroke that actually typed something.
    if (this.status === "idle" && update.consumed && update.buffer.length > 0) {
      this.status = "running";
      this.startedAt = this.now();
    }

    if (update.consumed && this.status === "running") {
      this.keystrokes.total += 1;
      if (update.keyCorrect !== false) this.keystrokes.correct += 1;
    }

    this.buffer = update.buffer;
    this.preview = update.preview;

    if (isBackspaceAtStart) {
      const reopened = this.reopenPreviousWrongWord();
      this.emit();
      return reopened;
    }

    if (update.commit !== undefined) {
      this.commitWord(update.commit.typed);
    }

    this.checkFinished();
    this.emit();
    return update.consumed;
  }

  private commitWord(typed: string): void {
    const target = this.currentTarget;
    if (target === null) {
      // Free mode: the dictionary decides. Until skeleton.ts lands (day 3)
      // nothing is validated, so a committed word is recorded as-is.
      this.committed.push({ target: typed, typed, correct: true });
    } else {
      this.committed.push({ target, typed, correct: matchWord(typed, target) });
      this.index += 1;
      this.syncTarget();
    }
    this.buffer = "";
    this.preview = "";
  }

  /**
   * Monkeytype's rule, which the user chose: backspace at the start of the
   * buffer returns to the previous word only if it was scored wrong. A correct
   * word is final, so there is nothing to go back and fix.
   */
  private reopenPreviousWrongWord(): boolean {
    const last = this.committed[this.committed.length - 1];
    if (last === undefined || last.correct) return false;

    this.committed.pop();
    this.index = Math.max(0, this.index - 1);
    this.syncTarget();
    const restored = this.input.restore?.(last.typed);
    this.buffer = restored?.buffer ?? last.typed;
    this.preview = restored?.preview ?? "";
    return true;
  }

  /* ---------------------------------------------------------------- *
   * Clock and completion
   * ---------------------------------------------------------------- */

  get elapsedMs(): number {
    if (this.startedAt === null) return 0;
    return (this.finishedAt ?? this.now()) - this.startedAt;
  }

  private checkFinished(): void {
    const { length } = this.config;
    if (this.status !== "running") return;

    if (length.kind === "time" && this.elapsedMs >= length.seconds * 1000) {
      this.finish();
      return;
    }
    if (length.kind === "words" && this.committed.length >= length.count) {
      this.finish();
      return;
    }
    // A passage can simply run out.
    if (this.config.free !== true && this.index >= this.targets.length) {
      this.finish();
    }
  }

  /** Called by the UI's animation frame so a timed test ends without input. */
  tick(): void {
    const before = this.status;
    this.checkFinished();
    if (this.status !== before) this.emit();
  }

  private finish(): void {
    this.status = "finished";
    this.finishedAt = this.now();
  }

  get results(): Results | null {
    if (this.status !== "finished") return null;
    const tally = this.input.commitMode === "key" ? this.keystrokes : undefined;
    return computeResults(this.committed, this.elapsedMs, tally);
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle and state
   * ---------------------------------------------------------------- */

  restart(): void {
    this.status = "idle";
    this.index = 0;
    this.committed = [];
    this.keystrokes = { total: 0, correct: 0 };
    this.startedAt = null;
    this.finishedAt = null;
    this.buffer = "";
    this.preview = "";
    this.input.reset();
    this.buildTargets();
    this.syncTarget();
    this.emit();
  }

  get state(): SessionState {
    const { length } = this.config;
    return {
      status: this.status,
      targets: this.targets,
      index: this.index,
      committed: this.committed,
      buffer: this.buffer,
      preview: this.preview,
      nextKeys: this.input.nextKeys(),
      remainingMs:
        length.kind === "time" ? Math.max(0, length.seconds * 1000 - this.elapsedMs) : null,
      remainingWords:
        length.kind === "words" ? Math.max(0, length.count - this.committed.length) : null,
      elapsedMs: this.elapsedMs,
      results: this.results,
    };
  }

  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const state = this.state;
    for (const listener of this.listeners) listener(state);
  }
}
