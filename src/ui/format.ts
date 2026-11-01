/**
 * Number and time formatting for a Nepali interface.
 *
 * Every digit the user sees is Devanagari, so formatting goes through here
 * rather than through `toLocaleString`, which would need a locale data set we
 * do not ship.
 */

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/** 42 → "४२". Keeps separators, signs and the decimal point. */
export function neNum(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)] ?? d);
}

/** Rounded integer in Devanagari digits. */
export function neInt(value: number): string {
  return neNum(Math.round(value));
}

/** 0.93 → "९३%". */
export function nePercent(fraction: number): string {
  return `${neNum(Math.round(fraction * 100))}%`;
}

/** Milliseconds → "०:३०" (m:ss), for the clock and the duration row. */
export function neClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${neNum(minutes)}:${neNum(String(seconds).padStart(2, "0"))}`;
}

/** Seconds a test was configured for → "३० से." / "२ मि.". */
export function neDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${neNum(seconds)} से.`;
  const minutes = seconds / 60;
  const shown = Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1);
  return `${neNum(shown)} मि.`;
}

/** Clamp into 0–1. Used by the progress bar for both fill and heat. */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
