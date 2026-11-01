---
description: Kick off day 1 — project setup, romanized matcher, and a working romanized typing test
---

Read CLAUDE.md, rules.md, data/test-words.json, and data/overrides.json fully before doing anything.

Then build day 1 in this order, stopping to run tests after each step:

1. **Setup:** Vite + TypeScript (vanilla) + Vitest. Add `@fontsource/noto-sans-devanagari`. Create the folder structure from CLAUDE.md. Commit.
2. **Matcher (use the matcher-engineer subagent):** implement rules.md Part A in `src/engine/matcher.ts`. Write `tests/matcher.test.ts` that loads every case in `data/test-words.json` and checks every accept and reject. All must pass. Commit.
3. **Preview:** implement rules.md Part B in `src/engine/preview.ts` with its own unit tests (namaste→नमस्ते, garnu→गर्नु, kamal→कमल, mero→मेरो, x→क्ष). Commit.
4. **Scoring:** `src/engine/scoring.ts` with WPM via `Intl.Segmenter`, accuracy, and Net WPM, with tests. Commit.
5. **Input + session:** the `InputMethod` interface, `src/input/romanized.ts` (buffer, live preview, commit on space, backspace within the current word), and `src/session/` (timer 15/30/60s, target words, results). Commit.
6. **UI (use the ui-builder subagent):** typing screen with preview line, committed words in target Devanagari (white/red), timer, results screen, Tab/Esc restart, and the on-screen keyboard preview (QWERTY layout for romanized, next-key highlight, press flash, Ctrl+K toggle). Use a starter list of ~200 common Nepali words in `src/data/words.json` (have nepali-qa check it). Commit.

After each step, use the test-runner subagent. Before each commit, use the reviewer subagent.
At the end, tell me exactly what to try in the browser and list anything you were unsure about.

$ARGUMENTS
