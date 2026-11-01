---
description: Add a word with its accepted/rejected spellings as a test case (and override if needed)
argument-hint: <devanagari> accept:<spellings,...> [reject:<spellings,...>]
---

Add this word to the matcher tests: $ARGUMENTS

1. Add the case to `data/test-words.json` (merge with an existing entry for the same target if there is one).
2. Run the matcher tests.
3. If an accepted spelling fails only because it crosses an aspirate line (d/dh, t/th, b/bh) or another deliberate rule, add it to `data/overrides.json` for this word. Never change the global rules for one word.
4. If it fails for any other reason, show me the compiled pattern and explain which rule in rules.md is responsible before changing code.
5. Run tests again and report.
