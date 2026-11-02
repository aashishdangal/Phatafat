/**
 * Preeti ↔ Unicode.
 *
 * Preeti is a legacy font: the user types plain ASCII on a US keyboard and
 * the font draws Devanagari glyphs in place of the letters. Typing order is
 * *visual* order, which differs from Unicode's logical order in two places:
 *
 *   - the i-kar ि is typed BEFORE its consonant cluster (कि = `l` `s`);
 *   - the reph र् (above the letter) is typed AFTER its syllable (धर्म = `wd{`).
 *
 * Several letters also take two keys, because the font builds them from two
 * glyphs: ष = `i`+`f`, ण = `0`+`f`, क्ष = `I`+`f` (half form + ा), and
 * ई = `O`+`{`, आ = `c`+`f`, ओ = `cf]`, औ = `cf}`, ऐ = `P]`. Plain `m` is not
 * a letter at all: it is the tail that turns उ→ऊ, प→फ, भ→झ, त्र→क्र and
 * त्त→क्त. Visarga ः is Shift+M.
 *
 * `unicodeToPreeti` gives the one standard keystroke sequence for a word
 * (the user chose standard order only). `preetiToUnicode` reads keystrokes
 * back, so the session can score what was typed. Pure functions, no DOM.
 *
 * Mapping checked against the Preeti table of mapmeld/preeti (Shuvayatra),
 * the most used open-source Preeti converter (CC BY-NC-SA). Compared, not
 * copied: only the key → glyph facts are shared. Letters that need an Alt
 * code in real Preeti (ङ = ª, eyelash ra ¥, ्य Ø, ...) cannot be typed on
 * a keyboard, so words with ङ are untypeable here.
 */

const HALANT = "्";
const ZW = /[‌‍]/g;

/** Every Preeti key, as the character the key sends → what the font draws. */
export const PREETI_KEYS: ReadonlyMap<string, string> = new Map([
  // Number row
  ["`", "ञ"],
  ["1", "ज्ञ"],
  ["2", "द्द"],
  ["3", "घ"],
  ["4", "द्ध"],
  ["5", "छ"],
  ["6", "ट"],
  ["7", "ठ"],
  ["8", "ड"],
  ["9", "ढ"],
  ["0", "ण्"],
  ["~", "ञ्"],
  ["-", "("],
  ["_", ")"],
  ["=", "."],
  ["!", "१"],
  ["@", "२"],
  ["#", "३"],
  ["$", "४"],
  ["%", "५"],
  ["^", "६"],
  ["&", "७"],
  ["*", "८"],
  ["(", "९"],
  [")", "०"],
  ["+", "ं"],
  // Top row
  ["q", "त्र"],
  ["w", "ध"],
  ["e", "भ"],
  ["r", "च"],
  ["t", "त"],
  ["y", "थ"],
  ["u", "ग"],
  ["i", "ष्"],
  ["o", "य"],
  ["p", "उ"],
  ["[", "ृ"],
  ["]", "े"],
  ["\\", HALANT],
  ["Q", "त्त"],
  ["W", "ध्"],
  ["E", "भ्"],
  ["R", "च्"],
  ["T", "त्"],
  ["Y", "थ्"],
  ["U", "ग्"],
  ["I", "क्ष्"],
  ["O", "इ"],
  ["P", "ए"],
  ["{", "र्"],
  ["}", "ै"],
  ["|", "्र"],
  // Home row
  ["a", "ब"],
  ["s", "क"],
  ["d", "म"],
  ["f", "ा"],
  ["g", "न"],
  ["h", "ज"],
  ["j", "व"],
  ["k", "प"],
  ["l", "ि"],
  [";", "स"],
  ["'", "ु"],
  ["A", "ब्"],
  ["S", "क्"],
  ["D", "म्"],
  ["F", "ँ"],
  ["G", "न्"],
  ["H", "ज्"],
  ["J", "व्"],
  ["K", "प्"],
  ["L", "ी"],
  [":", "स्"],
  ['"', "ू"],
  // Bottom row
  ["z", "श"],
  ["x", "ह"],
  ["c", "अ"],
  ["v", "ख"],
  ["b", "द"],
  ["n", "ल"],
  ["M", "ः"],
  [",", ","],
  [".", "।"],
  ["/", "र"],
  ["Z", "श्"],
  ["X", "ह्"],
  ["C", "ऋ"],
  ["V", "ख्"],
  ["B", "द्य"],
  ["N", "ल्"],
  [">", "श्र"],
  ["?", "रु"],
  ["<", "?"],
]);

/** Plain `m`: the tail glyph, not a letter of its own (see the header). */
export const TAIL_KEY = "m";

/* ------------------------------------------------------------------ *
 * Unicode → keystrokes
 * ------------------------------------------------------------------ */

/** Full consonants. Two-key letters are built from two glyphs (see above). */
const FULL: ReadonlyMap<string, string> = new Map([
  ["क", "s"], ["ख", "v"], ["ग", "u"], ["घ", "3"], ["च", "r"], ["छ", "5"],
  ["ज", "h"], ["झ", "em"], ["ञ", "`"], ["ट", "6"], ["ठ", "7"], ["ड", "8"],
  ["ढ", "9"], ["ण", "0f"], ["त", "t"], ["थ", "y"], ["द", "b"], ["ध", "w"],
  ["न", "g"], ["प", "k"], ["फ", "km"], ["ब", "a"], ["भ", "e"], ["म", "d"],
  ["य", "o"], ["र", "/"], ["ल", "n"], ["व", "j"], ["श", "z"], ["ष", "if"],
  ["स", ";"], ["ह", "x"],
]);

/** Half forms (consonant + halant before another consonant) with their own key. */
const HALF: ReadonlyMap<string, string> = new Map([
  ["क", "S"], ["ख", "V"], ["ग", "U"], ["च", "R"], ["ज", "H"], ["ण", "0"],
  ["त", "T"], ["थ", "Y"], ["ध", "W"], ["न", "G"], ["प", "K"], ["ब", "A"],
  ["भ", "E"], ["म", "D"], ["ल", "N"], ["व", "J"], ["श", "Z"], ["ष", "i"],
  ["स", ":"], ["ह", "X"], ["ञ", "~"],
]);

/** Conjuncts with a key of their own, longest first. */
const CONJUNCTS: ReadonlyArray<readonly [string, string]> = [
  ["क्ष", "If"],
  ["क्र", "qm"], // त्र + tail
  ["क्त", "Qm"], // त्त + tail
  ["ज्ञ", "1"],
  ["त्र", "q"],
  ["त्त", "Q"],
  ["श्र", ">"],
  ["द्द", "2"],
  ["द्ध", "4"],
  ["द्य", "B"],
];

/** Half forms of the conjuncts above, where Preeti has one. */
const CONJUNCT_HALF: ReadonlyMap<string, string> = new Map([["क्ष", "I"]]);

const MATRAS: ReadonlyMap<string, string> = new Map([
  ["ा", "f"], ["ी", "L"], ["ु", "'"], ["ू", '"'], ["ृ", "["],
  ["े", "]"], ["ै", "}"], ["ो", "f]"], ["ौ", "f}"],
]);

const VOWELS: ReadonlyMap<string, string> = new Map([
  ["अ", "c"], ["आ", "cf"], ["इ", "O"], ["ई", "O{"], ["उ", "p"], ["ऊ", "pm"],
  ["ऋ", "C"], ["ए", "P"], ["ऐ", "P]"], ["ओ", "cf]"], ["औ", "cf}"],
]);

const SIGNS: ReadonlyMap<string, string> = new Map([["ं", "+"], ["ँ", "F"], ["ः", "M"]]);

const OTHER: ReadonlyMap<string, string> = new Map([
  ["०", ")"], ["१", "!"], ["२", "@"], ["३", "#"], ["४", "$"],
  ["५", "%"], ["६", "^"], ["७", "&"], ["८", "*"], ["९", "("],
  ["।", "."], [",", ","],
]);

const isConsonant = (ch: string | undefined): boolean => ch !== undefined && FULL.has(ch);

/**
 * The standard Preeti keystrokes for a Unicode word, or null when the word
 * contains something Preeti cannot type from the keyboard (ङ, until its key
 * is confirmed).
 */
export function unicodeToPreeti(word: string): string | null {
  const chars = [...word.normalize("NFC").replace(/़/g, "")];
  let out = "";
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i] as string;

    if (isConsonant(ch)) {
      // One syllable: [reph] cluster [ि | other matras] [signs].
      let reph = false;
      if (ch === "र" && chars[i + 1] === HALANT && chars[i + 2] !== "‍" && isConsonant(chars[i + 2])) {
        reph = true;
        i += 2;
      }

      let cluster = "";
      for (;;) {
        // Eyelash ra (र्‍य): an explicit र + halant, then the next consonant.
        if (chars[i] === "र" && chars[i + 1] === HALANT && chars[i + 2] === "‍") {
          cluster += "/\\";
          i += 3;
          continue;
        }
        const conj = CONJUNCTS.find(([u]) => chars.slice(i, i + [...u].length).join("") === u);
        const unit = conj ? conj[0] : chars[i];
        if (unit === undefined || !isConsonant([...unit][0])) break;
        const len = [...unit].length;
        const afterUnit = chars[i + len];

        if (afterUnit === HALANT && chars[i + len + 1] === "र" && conj === undefined) {
          // Rakar: consonant + ्र (प्र = k|).
          cluster += (FULL.get(unit) as string) + "|";
          i += len + 2;
          break;
        }
        if (afterUnit === HALANT && isConsonant(chars[i + len + 1])) {
          const half = conj ? CONJUNCT_HALF.get(unit) : HALF.get(unit);
          cluster += half ?? (conj ? conj[1] : (FULL.get(unit) as string)) + "\\";
          i += len + 1;
          continue;
        }
        if (unit === "र" && afterUnit === "ु") {
          cluster += "?";
          i += 2;
          break;
        }
        cluster += conj ? conj[1] : (FULL.get(unit) as string);
        i += len;
        break;
      }

      let pre = "";
      let post = "";
      // Matras, a final halant, signs.
      while (i < chars.length) {
        const c = chars[i] as string;
        if (c === "ि") pre = "l";
        else if (MATRAS.has(c)) post += MATRAS.get(c);
        else if (c === HALANT) post += "\\";
        else break;
        i += 1;
      }
      let signs = "";
      while (i < chars.length && SIGNS.has(chars[i] as string)) {
        signs += SIGNS.get(chars[i] as string);
        i += 1;
      }
      out += pre + cluster + post + (reph ? "{" : "") + signs;
      continue;
    }

    const vowel = VOWELS.get(ch);
    if (vowel !== undefined) {
      out += vowel;
      i += 1;
      while (i < chars.length && SIGNS.has(chars[i] as string)) {
        out += SIGNS.get(chars[i] as string);
        i += 1;
      }
      continue;
    }

    const other = OTHER.get(ch) ?? SIGNS.get(ch);
    if (other !== undefined) {
      out += other;
      i += 1;
      continue;
    }
    if (ch === "‌" || ch === "‍") {
      i += 1;
      continue;
    }
    return null;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Keystrokes → Unicode
 * ------------------------------------------------------------------ */

const I_MARK = ""; // ि typed ahead of its cluster
const REPH_MARK = ""; // र् typed after its syllable
const TAIL_MARK = ""; // m: the tail that completes ऊ, फ, झ, क्र, क्त

const C = "[\u0915-\u0939\u0958-\u095f]";
const CLUSTER = `(?:${C}${HALANT}(?:\\u200d)?)*${C}(?:${HALANT}र)?`;

/** Two-glyph letters, applied in order after the keys are mapped. */
const MERGES: ReadonlyArray<readonly [string, string]> = [
  // A half form + ा is the full letter: ष = if, ण = 0f, क्ष = If.
  [`${HALANT}ा`, ""],
  [`त्र${TAIL_MARK}`, "क्र"],
  [`त्त${TAIL_MARK}`, "क्त"],
  [`उ${TAIL_MARK}`, "ऊ"],
  [`प${TAIL_MARK}`, "फ"],
  [`भ${TAIL_MARK}`, "झ"],
  [TAIL_MARK, ""], // a tail on nothing it completes draws nothing
  ["अा", "आ"],
  ["आे", "ओ"],
  ["आै", "औ"],
  ["एे", "ऐ"],
  ["ाे", "ो"],
  ["ाै", "ौ"],
  [`इ${REPH_MARK}`, "ई"],
];

/**
 * Read a run of Preeti keystrokes as Unicode, in logical order. Keys with no
 * mapping pass through unchanged, so a wrong key still shows something.
 */
export function preetiToUnicode(keys: string): string {
  let text = "";
  for (const k of keys) {
    if (k === "l") text += I_MARK;
    else if (k === "{") text += REPH_MARK;
    else if (k === TAIL_KEY) text += TAIL_MARK;
    else text += PREETI_KEYS.get(k) ?? k;
  }
  for (const [from, to] of MERGES) text = text.split(from).join(to);

  // ि goes after the cluster it was typed in front of.
  text = text.replace(new RegExp(`${I_MARK}(${CLUSTER})`, "g"), "$1ि");
  // र् goes in front of the syllable it was typed after.
  text = text.replace(
    new RegExp(`(${CLUSTER})([ािीुूृेैोौ]*)${REPH_MARK}`, "g"),
    `र${HALANT}$1$2`,
  );
  // Markers left over (typed with nothing to attach to) show as themselves.
  text = text.split(I_MARK).join("ि").split(REPH_MARK).join(`र${HALANT}`);
  return text.replace(ZW, "").normalize("NFC");
}

/* ------------------------------------------------------------------ *
 * Physical keys
 * ------------------------------------------------------------------ */

/** US QWERTY: each printable character → [KeyboardEvent.code, needs Shift]. */
const PHYSICAL: ReadonlyMap<string, readonly [string, boolean]> = (() => {
  const map = new Map<string, readonly [string, boolean]>();
  const rows: ReadonlyArray<readonly [string, string, string]> = [
    ["Backquote", "`", "~"], ["Digit1", "1", "!"], ["Digit2", "2", "@"], ["Digit3", "3", "#"],
    ["Digit4", "4", "$"], ["Digit5", "5", "%"], ["Digit6", "6", "^"], ["Digit7", "7", "&"],
    ["Digit8", "8", "*"], ["Digit9", "9", "("], ["Digit0", "0", ")"], ["Minus", "-", "_"],
    ["Equal", "=", "+"], ["BracketLeft", "[", "{"], ["BracketRight", "]", "}"],
    ["Backslash", "\\", "|"], ["Semicolon", ";", ":"], ["Quote", "'", '"'],
    ["Comma", ",", "<"], ["Period", ".", ">"], ["Slash", "/", "?"],
  ];
  for (const [code, plain, shifted] of rows) {
    map.set(plain, [code, false]);
    map.set(shifted, [code, true]);
  }
  for (const letter of "abcdefghijklmnopqrstuvwxyz") {
    const code = `Key${letter.toUpperCase()}`;
    map.set(letter, [code, false]);
    map.set(letter.toUpperCase(), [code, true]);
  }
  map.set(" ", ["Space", false]);
  return map;
})();

/** The physical key and Shift state that type a Preeti character. */
export function keyFor(char: string): { code: string; shift: boolean } | null {
  const hit = PHYSICAL.get(char);
  return hit === undefined ? null : { code: hit[0], shift: hit[1] };
}
