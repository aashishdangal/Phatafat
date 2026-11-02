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
 * copied: only the key → glyph facts are shared.
 *
 * Letters with no key are typed with a Windows Alt code (hold Alt, type the
 * number on the numpad). ALT_TABLE holds every code on the standard Preeti
 * chart; where the chart gives a conjunct its own glyph (ङ्ग = Alt+0203,
 * ट्ट = Alt+0167, द्र = Alt+0155, ...), the standard sequence uses it.
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

/**
 * Every Alt code on the standard Preeti chart: [character, numpad code, what
 * the font draws]. The character is what Windows inserts for that code
 * (Windows-1252), which is what the browser hands us.
 */
export const ALT_TABLE: ReadonlyArray<readonly [string, string, string]> = [
  ["ª", "0170", "ङ"],
  ["Ë", "0203", "ङ्ग"],
  ["Í", "0205", "ङ्क"],
  ["Î", "0206", "ङ्ख"],
  ["‹", "0139", "ङ्घ"],
  ["§", "0167", "ट्ट"],
  ["Ý", "0221", "ट्ठ"],
  ["¶", "0182", "ठ्ठ"],
  ["•", "0149", "ड्ड"],
  ["°", "0176", "ड्ढ"],
  ["›", "0155", "द्र"],
  ["å", "0229", "द्व"],
  ["ß", "0223", "द्म"],
  ["Ì", "0204", "न्न"],
  ["„", "0132", "ध्र"],
  ["Å", "0197", "हृ"],
  ["¿", "0191", "रू"],
  ["¥", "0165", "र्\u200d"],
  ["Ø", "0216", "्य"],
  ["«", "0171", "्र"],
  ["ˆ", "0136", "फ्"],
  ["£", "0163", "घ्"],
  ["‰", "0137", "झ्"],
  ["˜", "0152", "ऽ"],
  ["ç", "0231", "ॐ"],
  ["Þ", "0222", "़"],
  ["…", "0133", "‘"],
  ["Ú", "0218", "’"],
  ["æ", "0230", "“"],
  ["Æ", "0198", "”"],
  ["–", "0150", "-"],
  ["—", "0151", "—"],
  ["±", "0177", "+"],
  ["Ö", "0214", "="],
  ["÷", "0247", "/"],
  ["Ü", "0220", "%"],
  ["Û", "0219", "!"],
  ["Ù", "0217", ";"],
  ["Ò", "0210", "¨"],
];

/** Characters typed with Alt + a numpad code, and that code. */
export const ALT_CODES: ReadonlyMap<string, string> = new Map(
  ALT_TABLE.map(([char, code]) => [char, code]),
);

/** Alt code → the character Windows would insert for it. */
const CHAR_FOR_CODE: ReadonlyMap<string, string> = new Map(
  ALT_TABLE.map(([char, code]) => [code, char]),
);

/**
 * The character for digits typed while Alt is held, or null when the code is
 * not on the Preeti chart. A missing leading zero is forgiven (203 = 0203).
 * This lets Alt codes work from the top number row, on keyboards with no
 * numpad, where Windows itself would not build them.
 */
export function charForAltCode(digits: string): string | null {
  if (!/^\d{3,4}$/.test(digits)) return null;
  return CHAR_FOR_CODE.get(digits.padStart(4, "0")) ?? null;
}

/** Every character Preeti can type, key or Alt code → what the font draws. */
const GLYPHS: ReadonlyMap<string, string> = new Map([
  ...PREETI_KEYS,
  ...ALT_TABLE.map(([char, , glyph]) => [char, glyph] as const),
]);

/** Plain `m`: the tail glyph, not a letter of its own (see the header). */
export const TAIL_KEY = "m";

/* ------------------------------------------------------------------ *
 * Unicode → keystrokes
 * ------------------------------------------------------------------ */

/** Full consonants. Two-key letters are built from two glyphs (see above). */
const FULL: ReadonlyMap<string, string> = new Map([
  ["क", "s"], ["ख", "v"], ["ग", "u"], ["घ", "3"], ["च", "r"], ["छ", "5"],
  ["ज", "h"], ["झ", "em"], ["ञ", "`"], ["ङ", "ª"], ["ट", "6"], ["ठ", "7"], ["ड", "8"],
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
  // Alt codes
  ["फ", "ˆ"], ["घ", "£"], ["झ", "‰"],
]);

/** Letters whose rakar is the under-form ्र (Alt+0171) rather than |. */
const UNDER_RAKAR = new Set(["ट", "ठ", "ड", "ढ"]);

/** Conjuncts with a key of their own, longest first. */
const CONJUNCTS: ReadonlyArray<readonly [string, string]> = [
  // Alt-code conjuncts from the Preeti chart
  ["ङ्ग", "Ë"],
  ["ङ्क", "Í"],
  ["ङ्ख", "Î"],
  ["ङ्घ", "‹"],
  ["ट्ट", "§"],
  ["ट्ठ", "Ý"],
  ["ठ्ठ", "¶"],
  ["ड्ड", "•"],
  ["ड्ढ", "°"],
  ["द्र", "›"],
  ["द्व", "å"],
  ["द्म", "ß"],
  ["न्न", "Ì"],
  ["ध्र", "„"],
  // Keyboard conjuncts
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
  // Punctuation the number row cannot give (its keys type letters)
  ["?", "<"], ["(", "-"], [")", "_"], [".", "="],
  // Alt codes
  ["ऽ", "˜"], ["ॐ", "ç"], ["‘", "…"], ["’", "Ú"], ["“", "æ"], ["”", "Æ"],
  ["-", "–"], ["—", "—"], ["+", "±"], ["=", "Ö"], ["/", "÷"], ["%", "Ü"],
  ["!", "Û"], [";", "Ù"],
]);

const isConsonant = (ch: string | undefined): boolean => ch !== undefined && FULL.has(ch);

/**
 * The standard Preeti keystrokes for a Unicode word, or null when the word
 * contains something Preeti has no key or Alt code for.
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
          cluster += "¥";
          i += 3;
          continue;
        }
        const conj = CONJUNCTS.find(([u]) => chars.slice(i, i + [...u].length).join("") === u);
        const unit = conj ? conj[0] : chars[i];
        if (unit === undefined || !isConsonant([...unit][0])) break;
        const len = [...unit].length;
        const afterUnit = chars[i + len];

        if (afterUnit === HALANT && chars[i + len + 1] === "र" && conj === undefined) {
          // Rakar: consonant + ्र (प्र = k|; ट्र = 6 + Alt+0171).
          cluster += (FULL.get(unit) as string) + (UNDER_RAKAR.has(unit) ? "«" : "|");
          i += len + 2;
          break;
        }
        if (
          afterUnit === HALANT &&
          chars[i + len + 1] === "य" &&
          conj === undefined &&
          !HALF.has(unit)
        ) {
          // ्य under a letter with no half form: ट्य = 6 + Alt+0216.
          cluster += (FULL.get(unit) as string) + "Ø";
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
        if (unit === "र" && afterUnit === "ू") {
          cluster += "¿"; // Alt+0191
          i += 2;
          break;
        }
        if (unit === "ह" && afterUnit === "ृ") {
          cluster += "Å"; // Alt+0197
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
    else text += GLYPHS.get(k) ?? k;
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

/**
 * The physical key and Shift state that type a Preeti character. An Alt-code
 * character points at the Alt key and carries the code to type.
 */
export function keyFor(
  char: string,
): { code: string; shift: boolean; altCode?: string } | null {
  const altCode = ALT_CODES.get(char);
  if (altCode !== undefined) return { code: "AltLeft", shift: false, altCode };
  const hit = PHYSICAL.get(char);
  return hit === undefined ? null : { code: hit[0], shift: hit[1] };
}
