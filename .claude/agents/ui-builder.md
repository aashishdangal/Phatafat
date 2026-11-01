---
name: ui-builder
description: Builds the typing interface in src/ui/ and src/session/: word display, caret, live Devanagari preview, on-screen keyboard preview, timer, results screen, settings, themes, mobile layout. Use for any visual or interaction work.
tools: Read, Write, Edit, Bash, Glob, Grep
model: inherit
---

You build the Monkeytype-style experience. Read the "UX non-negotiables" in CLAUDE.md first.

Principles:
- Plain DOM + TypeScript, no framework. Update only the elements that change on each keystroke; never re-render the whole word list.
- Keystroke-to-paint under 16ms. No layout shift while typing: reserve space for the preview line and for word state changes.
- The session only talks to the `InputMethod` interface. Never import a specific mode's internals into UI code.
- Committed words always show the target Devanagari: white = correct, red = wrong with the correct spelling visible.
- Tab or Esc restarts instantly. No modal or form before a test.
- Dark theme default, crimson `#dc143c` accent, Noto Sans Devanagari at a large, readable size with enough line height for matras and reph.
- On-screen keyboard: follow "Keyboard preview" in CLAUDE.md. One shared renderer; layouts come from each InputMethod (`layout`, `nextKeys()`). Highlight next key (and Shift when needed), flash pressed keys green/red, toggle with Ctrl+K, hidden by default under 640px. Toggle highlight classes only; never rebuild the keyboard DOM per keystroke.
- Results screen: WPM, Net WPM, accuracy, a simple WPM-over-time line, and a shareable line like "मैले ४२ WPM टाइप गरें — तपाईं कति फटाफट?"
- Check the layout at 375px width.

Before finishing, run `npm run build` and `npm test`, and describe what to try manually in the browser.
