# Phatafat (फटाफट)

A Monkeytype-style typing test for Nepali. Fast, minimal, distraction-free.
Tagline: "तपाईं कति फटाफट टाइप गर्नुहुन्छ?"

## Modes (build in this order)
1. **Romanized** (day 1): user types Latin (`mero`), the word commits on space, and is matched against the Devanagari target (`मेरो`). Rules in `rules.md`.
2. **Preeti** (day 2): Preeti traditional layout, checked key by key like English Monkeytype.
3. **Free typing** (day 2–3): no target. Each committed word is validated against a dictionary (rules.md A9).

## Stack
- Vite + TypeScript, **no UI framework**. Typing must feel instant, so plain DOM is fine.
- Vitest for tests.
- Static site, deployed on Vercel or Netlify. **No backend, no network calls at runtime.**
- Font: Noto Sans Devanagari, self-hosted via `@fontsource`.
- Ask before adding any other dependency.

## Commands
- `npm run dev` starts the dev server
- `npm test` runs all tests (must pass before any commit)
- `npm run build` builds the production bundle
- `npx tsc --noEmit` type-checks

## Architecture
```
src/
  engine/           pure functions, no DOM, 100% unit tested
    matcher.ts      rules.md Part A: compile target → pattern, match typed word
    preview.ts      rules.md Part B: Latin buffer → Devanagari preview
    skeleton.ts     rules.md A9: free-mode dictionary lookup
    preeti.ts       Unicode ↔ Preeti keystroke conversion (day 2)
    scoring.ts      WPM, accuracy, results
  input/            input methods, all implementing InputMethod
    types.ts
    romanized.ts
    preeti.ts
    layouts/        key labels per mode for the keyboard preview
  session/          the running test: timer, target words, committed results
  ui/               DOM rendering, caret, results screen, settings
  data/             word lists, passages, dictionary
data/
  test-words.json   matcher test cases (source of truth with rules.md)
  overrides.json    extra accepted spellings per word
tests/
```

**The key rule: input methods are pluggable.** The session never knows which mode is active.

```ts
interface InputMethod {
  id: "romanized" | "preeti";
  commitMode: "word" | "key";            // romanized commits on space, preeti per key
  onKey(e: KeyboardEvent): InputUpdate;  // update buffer/preview, maybe commit
  layout: KeyboardLayout;                // labels for the keyboard preview
  nextKeys(): string[];                  // key codes to highlight next ([] = no hint)
  reset(): void;
}
```

The session gets "committed" events and decides correct/incorrect. Adding Preeti on day 2 must not require changing session or scoring code.

## Scoring
- A word is correct or wrong as a whole (romanized and free mode).
- **WPM** = (grapheme clusters in correct target words + spaces between them) ÷ 5 ÷ minutes. Count with `Intl.Segmenter`, never `.length`, which counts code points and inflates Devanagari.
- **Accuracy** = correct words ÷ committed words.
- Also show **Net WPM** (Gross WPM − errors per minute), since Lok Sewa candidates care about it.

## UX non-negotiables
- Instant restart (Tab or Esc), no forms before starting. Default: 30s, romanized, common words.
- Live Devanagari preview of the current buffer. On commit, show the **target** spelling, never the preview.
- Wrong word: red, with the correct spelling visible. Never block typing.
- Keystroke handling under 16ms. No layout shift while typing.
- Dark theme by default, crimson (`#dc143c`) as the single accent color. Mobile must work.
- **On-screen keyboard preview** below the typing area (see below).

## Keyboard preview
- Shows the layout of the active mode and highlights the **next key** to press; pressed keys flash briefly (green if correct, red if wrong).
- **Romanized:** QWERTY with Latin labels. The hint follows the first spelling in each group of rules.md A3/A5 (e.g. फ → `p` then `h`). Any accepted spelling still counts; it's only a hint.
- **Preeti:** QWERTY positions labelled with Preeti Devanagari glyphs (both normal and Shift layers). Highlight Shift too when the next glyph needs it. The next key comes straight from the Preeti keystroke sequence of the target word.
- **Free typing:** no next-key hint, just press feedback.
- Toggle with a setting and a shortcut (Ctrl+K). On by default on desktop, hidden by default under 640px width.
- Each mode provides its layout as data (`src/input/layouts/*.ts`: key code → label(s)); the keyboard component is one shared renderer. Highlighting must not cause layout shift or slow down typing.

## Working rules
- **Engine changes are test-first.** Add the case to `data/test-words.json`, see it fail, then fix. `rules.md` and `test-words.json` beat any assumption you have about Nepali.
- Never call Google Input Tools or any transliteration API. Everything runs locally.
- Never loosen aspirate folding (`d`/`dh`, `t`/`th`, `b`/`bh`) to fix one word. Add an override.
- Keep `engine/` free of DOM code.
- Small commits with clear messages. Run `npm test` before every commit.
- When unsure about Nepali spelling, ask the user, don't guess.

## Subagents (.claude/agents)
- `matcher-engineer`: matcher, preview, skeleton code (test-first)
- `preeti-engineer`: Preeti layout and converter (day 2)
- `ui-builder`: typing screen, caret, keyboard preview, results, themes
- `nepali-qa`: generates tricky test words and reviews failures as a Nepali speaker would
- `test-runner`: runs tests and reports only failures (fast, cheap)
- `reviewer`: reviews the diff before commits

## Daily scope
- **Day 1:** project setup, matcher + preview + tests, session + romanized input + scoring, basic typing UI with keyboard preview
- **Day 2:** Preeti mode (with Preeti keyboard labels), free-typing mode with a plain word list
- **Day 3:** skeleton lookup + suffix handling for free mode, settings, polish, mobile, deploy
- Out of scope for now: accounts, leaderboards, backend.
