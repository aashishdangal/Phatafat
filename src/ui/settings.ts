/**
 * Persisted preferences.
 *
 * localStorage can throw (Safari private mode, disabled storage) and can
 * return junk, so every read is validated and every access is wrapped. A
 * failure is never fatal: the defaults simply stop persisting.
 */

import type { TestLength } from "../session/session";

export type LayoutVariant = "wrapped" | "focus" | "passage";
export type Skin = "alive" | "serious";
export type Theme = "dark" | "light";
export type InputMode = "romanized" | "preeti";
/** Interface language: Nepali, mixed (heavy words in English), English. */
export type UiLanguage = "ne" | "mix" | "en";
export const UI_LANGUAGES: readonly UiLanguage[] = ["ne", "mix", "en"];

export interface Settings {
  mode: InputMode;
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
    language: "mix", // the middle of the switch is the default
    variant: "wrapped",
    length: { kind: "time", seconds: 30 },
    keyboard: keyboardDefault(),
    skin: "alive",
    theme: "dark", // dark by default (CLAUDE.md); light is opt-in
  };
}

const VARIANTS: LayoutVariant[] = ["wrapped", "focus", "passage"];
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
