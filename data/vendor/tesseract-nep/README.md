# Nepali word list (Tesseract OCR)

`nep.wordlist` is the Nepali word list from the Tesseract OCR project's
language data, used unmodified as one input to Phatafat's free-typing
dictionary.

- Source: https://github.com/tesseract-ocr/langdata/blob/main/nep/nep.wordlist
- License: Apache License 2.0, see `LICENSE` in this folder.
- Fetched: 2026-11-02.

`scripts/build-dictionary.mjs` reads this file, keeps the pure Devanagari
words, merges them with Phatafat's own word list and passages, and writes
`src/data/dictionary.json`. That generated file is the only part shipped to
the browser.
