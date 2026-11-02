/**
 * Preeti keyboard layout — QWERTY positions labelled with Preeti glyphs.
 *
 * Built from the same key table the converter uses (engine/preeti.ts), so
 * the caps can never disagree with what a key actually types. `sub` is the
 * character printed on the user's real keyboard; `label` is the glyph the key
 * types, and `shiftLabel` the glyph Shift gives.
 */

import { PREETI_KEYS, TAIL_KEY } from "../../engine/preeti";
import type { KeyCap, KeyboardLayout } from "../types";

/** [code, plain char, shifted char] per key, in physical row order. */
const ROWS: ReadonlyArray<ReadonlyArray<readonly [string, string, string]>> = [
  [
    ["Backquote", "`", "~"], ["Digit1", "1", "!"], ["Digit2", "2", "@"], ["Digit3", "3", "#"],
    ["Digit4", "4", "$"], ["Digit5", "5", "%"], ["Digit6", "6", "^"], ["Digit7", "7", "&"],
    ["Digit8", "8", "*"], ["Digit9", "9", "("], ["Digit0", "0", ")"], ["Equal", "=", "+"],
  ],
  [
    ["KeyQ", "q", "Q"], ["KeyW", "w", "W"], ["KeyE", "e", "E"], ["KeyR", "r", "R"],
    ["KeyT", "t", "T"], ["KeyY", "y", "Y"], ["KeyU", "u", "U"], ["KeyI", "i", "I"],
    ["KeyO", "o", "O"], ["KeyP", "p", "P"], ["BracketLeft", "[", "{"],
    ["BracketRight", "]", "}"], ["Backslash", "\\", "|"],
  ],
  [
    ["KeyA", "a", "A"], ["KeyS", "s", "S"], ["KeyD", "d", "D"], ["KeyF", "f", "F"],
    ["KeyG", "g", "G"], ["KeyH", "h", "H"], ["KeyJ", "j", "J"], ["KeyK", "k", "K"],
    ["KeyL", "l", "L"], ["Semicolon", ";", ":"], ["Quote", "'", '"'],
  ],
  [
    ["KeyZ", "z", "Z"], ["KeyX", "x", "X"], ["KeyC", "c", "C"], ["KeyV", "v", "V"],
    ["KeyB", "b", "B"], ["KeyN", "n", "N"], ["KeyM", "m", "M"], ["Comma", ",", "<"],
    ["Period", ".", ">"], ["Slash", "/", "?"],
  ],
];

/**
 * The tail, traced from the Preeti glyph: a flat bar on top that runs past
 * the curl on the right, and under it a reversed-c curl that starts at the
 * left edge, arcs over to the right and ends near the bottom middle.
 */
const TAIL_PATH = "M2.7 2.8 H13.1 M2.7 9.8 C4.4 7.9 8.4 7.6 9.8 10.4 C10.6 12.2 9.9 14.2 8.4 15.3";

function cap([code, plain, shifted]: readonly [string, string, string]): KeyCap {
  const shiftLabel = PREETI_KEYS.get(shifted);
  return {
    code,
    sub: plain,
    label: PREETI_KEYS.get(plain) ?? "",
    // m types Preeti's tail (the curl that makes प फ, भ झ, उ ऊ). It has no
    // Unicode character, so the cap draws it, as printed on Preeti charts.
    ...(plain === TAIL_KEY ? { glyphPath: TAIL_PATH } : {}),
    ...(shiftLabel !== undefined ? { shiftLabel } : {}),
  };
}

export const preetiLayout: KeyboardLayout = {
  id: "preeti",
  rows: [...ROWS.map((row) => row.map(cap)), [{ code: "Space", sub: "space", label: "", width: 7 }]],
};
