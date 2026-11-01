/**
 * Romanized keyboard layout — QWERTY positions, dual-labelled.
 *
 * `sub` is the Latin letter printed on the user's real keyboard; `label` is
 * the Devanagari it transliterates to under rules.md B1/B2, and `shiftLabel`
 * is what Shift produces where Part B defines a capital key (the retroflex
 * T D N Sh, the long vowels A I U, and the signs M H).
 *
 * The keyboard is a hint, not a rule: the matcher accepts every spelling in
 * rules.md A3/A5, so `f` and `ph` both reach फ even though the cap shows one.
 */

import type { KeyboardLayout } from "../types";

export const romanizedLayout: KeyboardLayout = {
  id: "romanized-qwerty",
  rows: [
    [
      { code: "KeyQ", sub: "q", label: "क" },
      { code: "KeyW", sub: "w", label: "व" },
      { code: "KeyE", sub: "e", label: "े", shiftLabel: "ऐ" },
      { code: "KeyR", sub: "r", label: "र", shiftLabel: "ऋ" },
      { code: "KeyT", sub: "t", label: "त", shiftLabel: "ट" },
      { code: "KeyY", sub: "y", label: "य" },
      { code: "KeyU", sub: "u", label: "ु", shiftLabel: "ऊ" },
      { code: "KeyI", sub: "i", label: "ि", shiftLabel: "ई" },
      { code: "KeyO", sub: "o", label: "ो", shiftLabel: "औ" },
      { code: "KeyP", sub: "p", label: "प" },
    ],
    [
      { code: "KeyA", sub: "a", label: "अ", shiftLabel: "आ" },
      { code: "KeyS", sub: "s", label: "स", shiftLabel: "ष" },
      { code: "KeyD", sub: "d", label: "द", shiftLabel: "ड" },
      { code: "KeyF", sub: "f", label: "फ" },
      { code: "KeyG", sub: "g", label: "ग" },
      { code: "KeyH", sub: "h", label: "ह", shiftLabel: "ः" },
      { code: "KeyJ", sub: "j", label: "ज" },
      { code: "KeyK", sub: "k", label: "क" },
      { code: "KeyL", sub: "l", label: "ल" },
    ],
    [
      { code: "KeyZ", sub: "z", label: "ज" },
      { code: "KeyX", sub: "x", label: "क्ष" },
      { code: "KeyC", sub: "c", label: "च" },
      { code: "KeyV", sub: "v", label: "व" },
      { code: "KeyB", sub: "b", label: "ब" },
      { code: "KeyN", sub: "n", label: "न", shiftLabel: "ण" },
      { code: "KeyM", sub: "m", label: "म", shiftLabel: "ं" },
    ],
    [{ code: "Space", sub: "space", label: "", width: 7 }],
  ],
};
