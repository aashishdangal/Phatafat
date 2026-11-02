# फटाफट · Phatafat

**तपाईं कति फटाफट टाइप गर्नुहुन्छ?** (How fast do you type?)

A fast, minimal typing test for **Nepali**. Type in Romanized Latin or the
Preeti layout, practise free typing against a dictionary, or sit a timed
Lok Sewa style exam.

**▶ Live:** https://aashishdangal.github.io/Phatafat/

---

## Features

- **Romanized mode.** Type `mero`, press space, and it is matched against
  `मेरो`. Common spelling variants are accepted (`ph`/`f`, `aa`/`a`,
  `sh`/`s`, `kshamata`/`xyamata`, …), and a live Devanagari preview
  shows what you are typing.
- **Preeti mode.** The traditional Preeti layout, checked key by key.
- **Free typing.** No target text. Each word you type is checked against a
  dictionary of about 30,000 Nepali words.
- **Lok Sewa exam.** A 5 or 10 minute timed test on exam-style passages,
  with a net WPM target (20–35), a pass or not-yet verdict, an optional
  no-Backspace rule and a calm, distraction-free look.
- **On-screen keyboard.** Shows the layout for the active mode,
  highlights the next key and flashes each press green or red.
- **Honest scoring.** WPM counts grapheme clusters (`Intl.Segmenter`),
  not code points, so Devanagari is not inflated. Gross WPM, net WPM and
  accuracy are all shown.
- **Interface in Nepali, English or a mix of both.** Dark and light
  themes; works on mobile.
- **Fully offline.** No backend, no tracking, no transliteration API.
  Everything runs in your browser.

## Shortcuts

| Key | Action |
|---|---|
| `Tab` / `Esc` | Restart instantly |
| `Ctrl` + `K` | Show / hide the keyboard |
| `Alt` + digits | Type a Preeti Alt-code character |

## Run it locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # unit tests (Vitest)
npm run build    # production build in dist/
```

## How it works

Plain TypeScript and the DOM, built with Vite and no UI framework, so
every keystroke is handled in well under a frame.

```
src/
  engine/   pure functions: matcher, preview, Preeti converter, scoring
  input/    pluggable input methods (romanized, preeti) and keyboard layouts
  session/  the running test: timer, targets, committed words
  ui/       rendering, caret, keyboard preview, results, settings
  data/     word lists, passages, dictionary
```

The Romanized matcher compiles each Devanagari target into a pattern of
accepted Latin spellings. The rules are written down in
[`rules.md`](rules.md), and the test cases live in
[`data/test-words.json`](data/test-words.json).

## Credits

- Font: [Noto Sans Devanagari](https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari),
  self-hosted via [Fontsource](https://fontsource.org).
- The free-typing dictionary includes the Tesseract OCR Nepali word list
  (Apache 2.0, see [`data/vendor/tesseract-nep`](data/vendor/tesseract-nep)).

## License

[MIT](LICENSE) © 2026 Aashish Dangal
