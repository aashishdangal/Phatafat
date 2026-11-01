# Phatafat — Romanized Nepali Rules

This file is the **source of truth** for romanized mode. If code and this file disagree, the code is wrong.
Every rule here must be covered by a case in `data/test-words.json`.

There are two separate systems:

1. **Matcher** (Part A): decides if a typed romanized word is correct for a known Devanagari target. Used for scoring. This is what matters most.
2. **Preview transliterator** (Part B): turns the user's in-progress Latin buffer into Devanagari for the live preview, and powers free-typing mode. Cosmetic in test modes: on commit we always display the *target* word, never the preview.

---

## Part A — The Matcher (scoring)

### A1. Core idea

We never transliterate the user's input and compare spellings. Instead, we **compile the target Devanagari word into a pattern** of accepted Latin spellings, then test the typed word against it.

```
target फटाफट  →  ^(ph|f)a?(t)(aa|a)(ph|f)a?(t)a?$
typed "fatafat"   ✓     typed "phataphat"  ✓     typed "fatfat"  ✗
```

Spelling variants of the same sounds pass. Missing, extra, or swapped sounds fail.

### A2. Normalizing input (both sides, before matching)

Typed word:
- Lowercase everything. Case never matters in scoring.
- Strip punctuation and the Part B sign keys: `। ॥ | ? , ! . ; : " ' ( ) - ^ \`
  The sign keys are stripped because none of them carries information the
  matcher uses: A6 makes nasals and visarga optional and A4 makes halant
  contribute nothing. Without this, a user who deliberately types `^` for ँ
  sees a preview identical to the target and still scores wrong. `M` and `H`
  need no entry, since lowercasing turns them into `m` and `h`, which the ं
  and ः groups already accept.
- Collapse repeated **consonant** letters: `kamm → kam`, `chha → cha`, `pakka → paka`. Never collapse vowels (`aa`, `ee`, `oo` carry meaning).

Target word:
- Unicode NFC normalize. Remove nukta (`़`).
- Remove ZWJ (`U+200D`) and ZWNJ (`U+200C`). This is what makes the eyelash-ra
  forms typeable: `गर्‍यो` is matched as `गर्यो` and types as `garyo`. Without it,
  common past-tense verbs would be unmatchable.
- Strip the same punctuation.
- Devanagari digits `०-९` match ASCII digits `0-9`.
- Every Latin alternative in the tables below is also consonant-collapsed (so `chh` effectively becomes `ch`).

### A3. Consonants

Each consonant becomes a group of accepted spellings.

| Devanagari | Accepted Latin |
|---|---|
| क | k, q |
| ख | kh |
| ग | g |
| घ | gh |
| ङ | ng, n |
| च | ch, c |
| छ | chh, ch, c |
| ज | j, z |
| झ | jh |
| ञ | ny, n |
| ट / त | t |
| ठ / थ | th |
| ड / द | d |
| ढ / ध | dh |
| ण / न | n |
| प | p |
| फ | ph, f |
| ब | b, v, w |
| भ | bh |
| म | m |
| य | y |
| र | r |
| ल | l |
| व | v, w, b |
| श / ष / स | sh, s |
| ह | h |

**Special clusters** (match these before single consonants):

| Devanagari | Accepted Latin |
|---|---|
| क्ष | ksh, kch, x, chh, ch |
| ज्ञ | gy, gny, gn, jn |

**Order within a group carries no meaning for matching** — the compiled pattern
is an alternation, so `sh, s` and `s, sh` behave identically. It does matter for
the keyboard hint, which follows the first spelling in the group, and a few
first entries are not what a typist presses: this row merges श/ष/स, so स would
hint `sh` (नमस्ते → "namashte"), and A5's ी starts `ee` (तिमी → "timee").
`src/engine/hint.ts` keeps a small hint-only preference table for those cases.
Reordering a group here to fix a hint is the wrong fix; it would change nothing.

Deliberately **not** folded: aspirated vs unaspirated (`d`≠`dh`, `t`≠`th`, `b`≠`bh`). These are different sounds (दान vs धान). Common misspellings that cross this line go in the overrides table (A7), never into these rules.

### A4. What follows a consonant

| Situation | Pattern added after the consonant |
|---|---|
| Followed by a matra (vowel sign) | that matra's group (A5), required |
| Followed by halant `्` (part of a conjunct or word-final half letter) | nothing |
| Bare (no matra, no halant), including word-final | optional `a` → `a?` |

Examples: `गर्नु → g a? r n (u|oo)` · `नमस्ते → n a? m a? (s|sh) t (e|ai|ae)` · `गर्छन्` ends in `n` with nothing after it.

**Geminates:** a consonant + halant + the *same* consonant (`क्क`, `द्द`, `त्त`) counts once, matching the collapsed input. `पक्का` accepts `pakka` and `paka`.

### A5. Vowels

The same groups apply to independent vowels and to matras.

| Independent / matra | Accepted Latin |
|---|---|
| अ / (inherent) | a (independent: required; inherent: optional, see A4) |
| आ / ा | aa, a |
| इ / ि | i, ee |
| ई / ी | ee, i, ii |
| उ / ु | u, oo |
| ऊ / ू | oo, u, uu |
| ए / े | e, ai, ae, ei |
| ऐ / ै | ai, e, ei, ae |
| ओ / ो | o, au, ou |
| औ / ौ | au, ou, o |
| ऋ / ृ | ri, ru |

Long/short pairs are folded on purpose: romanized typists don't distinguish them. `kam` is correct for both कम and काम. Because the target is always known, this never causes a wrong word to be accepted in test modes.

**Optional glide `y`:** an optional `y` may precede ए / े and ऐ / ै. Nepali
typists insert one whenever that vowel follows a vowel or a bare consonant, and
it is a pattern across the language rather than a handful of words: भएको as
`bhayeko`, आएको as `aayeko`, दिएको as `diyeko`, बनाएको as `banayeko`, खाएर as
`khayera`, थिएन as `thiyena`. It cannot cause a wrong word to be accepted in a
test mode, because the target is always known — the glide only widens what
counts as *this* word. It does mean `myero` is accepted for मेरो; that is the
price, and it is paid only against a target that is already मेरो.

`ei` is accepted for ए / े as well as ऐ / ै, because `garein` for गरें is common
and the two vowels are already folded into each other in both directions. This
covers the whole family: गरें, भनें, भएँ, आएँ.

A word-initial independent vowel is **required** so `ma` does not match आमा.

### A6. Nasals and visarga (all optional)

| Sign | Pattern |
|---|---|
| ं (anusvara) | optional `n`, `m`, or `ng` |
| ँ (chandrabindu) | optional `n` or `m` |
| ः (visarga) | optional `h` |

`तपाईं` accepts `tapai`, `tapain`, `tapaai`. `संसार` accepts `sansar`, `samsar`, `sasar`.

### A7. Overrides

`data/overrides.json` maps a target word to extra accepted spellings the rules intentionally reject:

```json
{ "विद्यालय": ["vidhyalaya", "bidhyalaya"], "धन्यवाद": ["danyabad"] }
```

Check overrides **before** the pattern. Start small. Add a word only when a real, commonly typed spelling is wrongly rejected. Every override gets a test case.

### A8. Sentences and passages

- Split the passage on whitespace. Each space commits one typed word, compared against the next target word.
- Target punctuation is stripped before matching, so `ho` and `ho.` both match `हो।`.
- On commit, display the **target** Devanagari word (white if correct, red if wrong), never the user's preview.
- Words never require typing halant, nasal marks, or capital letters.

### A9. Free-typing mode lookup

No target exists, so we need a reverse lookup:

1. **Skeleton key**: consonant classes only, all vowels and nasal/visarga signs dropped. Classes fold the same way as A3 (t/T together, s/sh/ष together, b/v/w together, ch/chh together, ph/f together). Aspirates stay separate.
2. At startup, index every dictionary word under each skeleton its spellings can produce (most words have one; words with क्ष, ज्ञ, or व have a few).
3. On commit: compute the typed word's skeleton, fetch that bucket, and run the A1 matcher against each candidate. Any match means the word is valid, and the first match is displayed.

---

## Part B — Preview transliterator (Latin → Devanagari)

Used for the live preview above the buffer, and for displaying words in free mode when needed. Greedy longest-match, left to right, case-sensitive only where noted.

### B1. Consonants

`k क · kh ख · g ग · gh घ · ng ङ · ch च · chh छ · j ज · jh झ · ny ञ · T ट · Th ठ · D ड · Dh ढ · N ण · t त · th थ · d द · dh ध · n न · p प · ph/f फ · b ब · bh भ · m म · y य · r र · l ल · v/w व · sh श · Sh ष · s स · h ह · x/ksh क्ष · gy ज्ञ`

Capital `T D N Sh` are the only case-sensitive keys (retroflex). They matter only for the preview and free mode, never for test scoring.

### B2. Vowels (independent / matra)

`a अ/— · aa, A आ/ा · i इ/ि · ii, ee, I ई/ी · u उ/ु · uu, oo, U ऊ/ू · e ए/े · ai ऐ/ै · o ओ/ो · au औ/ौ · Ri ऋ/ृ`

### B3. Inherent "a" and conjuncts

- Consonant + `a` → bare consonant (`ka → क`).
- Consonant + other vowel → consonant + matra (`ki → कि`).
- Consonant directly followed by another consonant → halant joins them (`namaste → नमस्ते`, `garnu → गर्नु`).
- Word-final consonant with no vowel → bare, no halant (`kamal → कमल`, `mero → मेरो`).

### B4. Signs (preview and free mode only, never required in tests)

`M → ं · ^ → ँ · nn → ँ · H → ः · \ → explicit halant (garchhan\ → गर्छन्)`

`nn` is a second, easier-to-reach way to write ँ, but only when **no vowel
follows it**. A vowel after the pair means the user is writing the न्न geminate,
which appears in some of the most common verbs in the language:

| typed | renders | why |
|---|---|---|
| `yahaann` | यहाँ | `nn` at the end of the buffer |
| `chaannDai` | चाँडै | `nn` before a consonant |
| `sunnu` | सुन्नु | vowel follows, so न्न |
| `bhannu` | भन्नु | vowel follows, so न्न |

This is a Part B rule, so it affects the preview and free mode only. Scoring is
untouched: A2 collapses doubled consonants and A6 makes every nasal optional,
so no nasal mark ever has to be typed in a test.

### B5. Punctuation and digits

`. or | → ।` · `? , !` pass through · `0-9 → ०-९`

---

## Changing these rules

1. Add a failing case to `data/test-words.json` first.
2. Change the table here.
3. Change the code until all tests pass.
4. Never loosen aspirate folding globally to fix one word. Use overrides.
