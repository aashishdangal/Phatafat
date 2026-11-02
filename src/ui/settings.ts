/**
 * Persisted preferences.
 *
 * localStorage can throw (Safari private mode, disabled storage) and can
 * return junk, so every read is validated and every access is wrapped. A
 * failure is never fatal: the defaults simply stop persisting.
 */

import type { TestLength } from "../session/session";

/** How a word-list test is laid out on screen: a display preference. */
export type LayoutVariant = "wrapped" | "focus";
/** What is being typed. */
export type TestType = "words" | "passage" | "free" | "loksewa";

/**
 * Lok Sewa exam conditions. Official rules differ by post and notice, so
 * these are defaults the user adjusts to match theirs: Preeti, 5 minutes,
 * a 25 net WPM target, no Backspace.
 */
export interface LokSewaConfig {
  minutes: number;
  target: number;
  noBackspace: boolean;
}

export const LOKSEWA_MINUTES = [5, 10];
export const LOKSEWA_TARGETS = [20, 25, 30, 35];
export type Skin = "alive" | "serious";
export type Theme = "dark" | "light";
export type InputMode = "romanized" | "preeti";
/** Interface language: Nepali, mixed (heavy words in English), English. */
export type UiLanguage = "ne" | "mix" | "en";
export const UI_LANGUAGES: readonly UiLanguage[] = ["ne", "mix", "en"];

export interface Settings {
  /** How you type. */
  mode: InputMode;
  /** What you type. */
  test: TestType;
  loksewa: LokSewaConfig;
  language: UiLanguage;
  variant: LayoutVariant;
  length: TestLength;
  keyboard: boolean;
  skin: Skin;
  theme: Theme;
}

const KEY = "phatafat.settings.v1";

/** On by default on desktop, hidden by default under 640px (CLAUDE.md). */
function keyboardDefault(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 640px)").matches;
}

export function defaultSettings(): Settings {
  return {
    mode: "romanized",
    test: "words",
    loksewa: { minutes: 5, target: 25, noBackspace: true },
    language: "mix", // the middle of the switch is the default
    variant: "wrapped",
    length: { kind: "time", seconds: 30 },
    keyboard: keyboardDefault(),
    skin: "alive",
    theme: "dark", // dark by default (CLAUDE.md); light is opt-in
  };
}

const VARIANTS: LayoutVariant[] = ["wrapped", "focus"];
const TESTS: TestType[] = ["words", "passage", "free", "loksewa"];

function parseLokSewa(value: unknown, base: LokSewaConfig): LokSewaConfig {
  if (typeof value !== "object" || value === null) return base;
  const raw = value as Partial<Record<keyof LokSewaConfig, unknown>>;
  return {
    minutes: LOKSEWA_MINUTES.includes(raw.minutes as number) ? (raw.minutes as number) : base.minutes,
    target: LOKSEWA_TARGETS.includes(raw.target as number) ? (raw.target as number) : base.target,
    noBackspace: typeof raw.noBackspace === "boolean" ? raw.noBackspace : base.noBackspace,
  };
}
const TIMES = [15, 30, 60, 120];
const COUNTS = [10, 25, 50];

function parseLength(value: unknown): TestLength | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as { kind?: unknown; seconds?: unknown; count?: unknown };
  if (raw.kind === "time" && typeof raw.seconds === "number" && TIMES.includes(raw.seconds)) {
    return { kind: "time", seconds: raw.seconds };
  }
  if (raw.kind === "words" && typeof raw.count === "number" && COUNTS.includes(raw.count)) {
    return { kind: "words", count: raw.count };
  }
  return null;
}

export function loadSettings(): Settings {
  const base = defaultSettings();
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return base;
  }
  if (raw === null || raw === "") return base;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return base;
    const data = parsed as Partial<Record<keyof Settings, unknown>>;
    return {
      mode: data.mode === "preeti" || data.mode === "romanized" ? data.mode : base.mode,
      // Older saves had "passage" as a layout and free as a flag; both are
      // test types now.
      test: TESTS.includes(data.test as TestType)
        ? (data.test as TestType)
        : (data as { free?: unknown }).free === true
          ? "free"
          : data.variant === "passage"
            ? "passage"
            : base.test,
      loksewa: parseLokSewa(data.loksewa, base.loksewa),
      language: UI_LANGUAGES.includes(data.language as UiLanguage)
        ? (data.language as UiLanguage)
        : base.language,
      variant: VARIANTS.includes(data.variant as LayoutVariant)
        ? (data.variant as LayoutVariant)
        : base.variant,
      length: parseLength(data.length) ?? base.length,
      keyboard: typeof data.keyboard === "boolean" ? data.keyboard : base.keyboard,
      skin: data.skin === "serious" || data.skin === "alive" ? data.skin : base.skin,
      theme: data.theme === "light" || data.theme === "dark" ? data.theme : base.theme,
    };
  } catch {
    return base;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: the session still works, it just will not persist */
  }
}

export const LENGTH_OPTIONS = { times: TIMES, counts: COUNTS } as const;
