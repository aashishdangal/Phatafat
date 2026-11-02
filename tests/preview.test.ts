import { describe, expect, it } from "vitest";
import { toDevanagari, tokenizeLatin } from "../src/engine/preview";

/** Expected strings are written with explicit escapes where a mark is invisible. */
const HALANT = "्";

function expectAll(pairs: ReadonlyArray<readonly [string, string]>): void {
  for (const [latin, devanagari] of pairs) {
    expect(toDevanagari(latin), `${latin} → ${devanagari}`).toBe(devanagari);
  }
}

describe("preview — B1 consonants (every row)", () => {
  it("maps each consonant key, with the inherent a", () => {
    expectAll([
      ["ka", "क"],
      ["kha", "ख"],
      ["ga", "ग"],
      ["gha", "घ"],
      ["nga", "ङ"],
      ["cha", "च"],
      ["chha", "छ"],
      ["ja", "ज"],
      ["jha", "झ"],
      ["nya", "ञ"],
      ["Ta", "ट"],
      ["Tha", "ठ"],
      ["Da", "ड"],
      ["Dha", "ढ"],
      ["Na", "ण"],
      ["ta", "त"],
      ["tha", "थ"],
      ["da", "द"],
      ["dha", "ध"],
      ["na", "न"],
      ["pa", "प"],
      ["pha", "फ"],
      ["fa", "फ"],
      ["ba", "ब"],
      ["bha", "भ"],
      ["ma", "म"],
      ["ya", "य"],
      ["ra", "र"],
      ["la", "ल"],
      ["va", "व"],
      ["wa", "व"],
      ["sha", "श"],
      ["Sha", "ष"],
      ["sa", "स"],
      ["ha", "ह"],
    ]);
  });

  it("maps the x/ksh and gy clusters", () => {
    expectAll([
      ["xa", `क${HALANT}ष`],
      ["ksha", `क${HALANT}ष`],
      ["gya", `ज${HALANT}ञ`],
      ["gyaan", `ज${HALANT}ञान`],
      ["kshetri", `क${HALANT}षेत${HALANT}रि`],
    ]);
  });

  it("is case-sensitive for the four retroflex keys", () => {
    expect(toDevanagari("Ta")).not.toBe(toDevanagari("ta"));
    expect(toDevanagari("Da")).not.toBe(toDevanagari("da"));
    expect(toDevanagari("Na")).not.toBe(toDevanagari("na"));
    expect(toDevanagari("Sha")).not.toBe(toDevanagari("sha"));
    expectAll([
      ["Thaa", "ठा"],
      ["Dhaa", "ढा"],
      ["baSha", "बष"],
      ["kaTa", "कट"],
    ]);
  });
});

describe("preview — greedy longest match", () => {
  it("prefers the longest key at each position", () => {
    expectAll([
      ["chha", "छ"], // chh before ch
      ["cham", "चम"], // ch before c (c alone is not a Part B key)
      ["shahar", "शहर"], // sh before s, so not स + ह
      ["sahar", "सहर"],
      ["kshama", `क${HALANT}षम`],
      ["khel", "खेल"], // kh before k
      ["ghar", "घर"],
      ["jhan", "झन"],
      ["thaal", "थाल"],
      ["dhan", "धन"],
      ["bhai", "भै"],
      ["bhaai", "भाइ"],
      ["phal", "फल"],
    ]);
  });
});

describe("preview — B2 vowels (independent and matra)", () => {
  it("renders independent vowels", () => {
    expectAll([
      ["a", "अ"],
      ["aa", "आ"],
      ["A", "आ"],
      ["i", "इ"],
      ["ii", "ई"],
      ["ee", "ई"],
      ["I", "ई"],
      ["u", "उ"],
      ["uu", "ऊ"],
      ["oo", "ऊ"],
      ["U", "ऊ"],
      ["e", "ए"],
      ["ai", "ऐ"],
      ["o", "ओ"],
      ["au", "औ"],
      ["Ri", "ऋ"],
    ]);
  });

  it("renders matras after a consonant", () => {
    expectAll([
      ["ka", "क"],
      ["kaa", "का"],
      ["kA", "का"],
      ["ki", "कि"],
      ["kii", "की"],
      ["kee", "की"],
      ["kI", "की"],
      ["ku", "कु"],
      ["kuu", "कू"],
      ["koo", "कू"],
      ["kU", "कू"],
      ["ke", "के"],
      ["kai", "कै"],
      ["ko", "को"],
      ["kau", "कौ"],
      ["kRi", "कृ"],
    ]);
  });

  it("keeps an independent vowel independent in the middle of a word", () => {
    expectAll([
      ["bhaai", "भाइ"],
      ["aaunu", "आउनु"],
      ["RiShi", "ऋषि"],
    ]);
  });
});

describe("preview — B3 inherent a and conjuncts", () => {
  it("consonant + a is a bare consonant", () => {
    expectAll([
      ["ka", "क"],
      ["kamala", "कमल"],
    ]);
  });

  it("consonant + other vowel is consonant + matra", () => {
    expectAll([
      ["ki", "कि"],
      ["mero", "मेरो"],
    ]);
  });

  it("consonant directly followed by a consonant is joined with a halant", () => {
    expectAll([
      ["namaste", `नमस${HALANT}ते`],
      ["garnu", `गर${HALANT}नु`],
      ["raamro", `राम${HALANT}रो`],
      ["swaagatam", `स${HALANT}वागतम`],
    ]);
  });

  it("word-final consonant with no vowel stays bare, with no halant", () => {
    expectAll([
      ["kamal", "कमल"],
      ["mero", "मेरो"],
      ["nepaal", "नेपाल"],
      ["ghar", "घर"],
    ]);
  });
});

describe("preview — B4 signs", () => {
  it("renders anusvara, chandrabindu, visarga and the explicit halant", () => {
    expectAll([
      ["saMsaar", "संसार"],
      ["chaa^Dai", "चाँडै"],
      ["cha^Dai", "चँडै"],
      ["duHkha", "दुःख"],
      ["garchhan\\", `गर${HALANT}छन${HALANT}`],
      ["ka\\", `क${HALANT}`],
    ]);
  });

  it("a sign does not pull a halant onto the following consonant", () => {
    expect(toDevanagari("saMsaar")).toBe("संसार");
    expect(toDevanagari("saMsaar")).not.toContain(HALANT);
  });
});

describe("preview — B5 punctuation and digits", () => {
  it("maps . and | to danda, passes ? , ! through", () => {
    expectAll([
      ["ho.", "हो।"],
      ["ho|", "हो।"],
      ["ke?", "के?"],
      ["ho,", "हो,"],
      ["ho!", "हो!"],
    ]);
  });

  it("maps ASCII digits to Devanagari digits", () => {
    expectAll([
      ["0123456789", "०१२३४५६७८९"],
      ["2083", "२०८३"],
    ]);
  });

  it("passes spaces and unmapped characters through", () => {
    expectAll([
      ["mero nepaal", "मेरो नेपाल"],
      ["", ""],
      ["c", "c"],
    ]);
  });
});

describe("preview — partial input while typing", () => {
  it("renders every prefix of garnu sensibly", () => {
    expectAll([
      ["g", "ग"],
      ["ga", "ग"],
      ["gar", "गर"],
      ["garn", `गर${HALANT}न`],
      ["garnu", `गर${HALANT}नु`],
    ]);
  });

  it("renders every prefix of namaste sensibly", () => {
    expectAll([
      ["n", "न"],
      ["na", "न"],
      ["nam", "नम"],
      ["nama", "नम"],
      ["namas", "नमस"],
      ["namast", `नमस${HALANT}त`],
      ["namaste", `नमस${HALANT}ते`],
    ]);
  });

  it("never leaves a trailing halant unless the user typed one", () => {
    for (const buffer of ["g", "gar", "garn", "kamal", "namast", "chh", "ksh"]) {
      expect(toDevanagari(buffer).endsWith(HALANT), buffer).toBe(false);
    }
    expect(toDevanagari("garchhan\\").endsWith(HALANT)).toBe(true);
  });
});

describe("preview — worked examples from rules.md", () => {
  it("matches every example named in Part B", () => {
    expectAll([
      ["namaste", `नमस${HALANT}ते`],
      ["garnu", `गर${HALANT}नु`],
      ["kamal", "कमल"],
      ["mero", "मेरो"],
      ["garchhan\\", `गर${HALANT}छन${HALANT}`],
      ["ka", "क"],
      ["ki", "कि"],
    ]);
  });

  it("agrees with NFC-normalized Devanagari", () => {
    expect(toDevanagari("namaste")).toBe("नमस्ते".normalize("NFC"));
    expect(toDevanagari("garnu")).toBe("गर्नु".normalize("NFC"));
    expect(toDevanagari("garchhan\\")).toBe("गर्छन्".normalize("NFC"));
    expect(toDevanagari("phaTaafaT")).toBe("फटाफट".normalize("NFC"));
  });
});

describe("preview — tokenizer (exposed for free mode)", () => {
  it("returns greedy tokens with their kinds", () => {
    expect(tokenizeLatin("garnu").map((t) => t.latin)).toEqual(["g", "a", "r", "n", "u"]);
    expect(tokenizeLatin("chhaina").map((t) => t.latin)).toEqual(["chh", "ai", "n", "a"]);
    expect(tokenizeLatin("kshetri").map((t) => t.latin)).toEqual(["ksh", "e", "t", "r", "i"]);
    expect(tokenizeLatin("ho.").map((t) => t.kind)).toEqual(["consonant", "vowel", "literal"]);
    expect(tokenizeLatin("ka\\").map((t) => t.kind)).toEqual(["consonant", "vowel", "halant"]);
    expect(tokenizeLatin("saM").map((t) => t.kind)).toEqual(["consonant", "vowel", "sign"]);
  });
});

/**
 * B4: `nn` as a second way to write ँ.
 *
 * A bare `nn → ँ` would collide with the न्न geminate in very common verbs
 * (सुन्नु, भन्नु, जान्नु), so the rule is conditional: `nn` is ँ only when no
 * vowel follows it. A vowel after it means the user is writing न्न.
 *
 * Preview only. Scoring is untouched — A2 collapses doubled consonants and A6
 * makes every nasal optional, so none of this reaches the matcher.
 */
describe("B4 — nn as chandrabindu", () => {
  it("renders ँ when no vowel follows", () => {
    expect(toDevanagari("yahaann")).toBe("यहाँ");
    expect(toDevanagari("chaannDai")).toBe("चाँडै");
    expect(toDevanagari("gaaunn")).toBe("गाउँ");
  });

  it("still renders the न्न geminate when a vowel follows", () => {
    expect(toDevanagari("sunnu")).toBe("सुन्नु");
    expect(toDevanagari("bhannu")).toBe("भन्नु");
    expect(toDevanagari("jaannu")).toBe("जान्नु");
    expect(toDevanagari("unnaais")).toBe("उन्नाइस");
  });

  it("leaves ^ working as before", () => {
    expect(toDevanagari("yahaa^")).toBe("यहाँ");
  });

  it("does not disturb a single n", () => {
    expect(toDevanagari("sundar")).toBe("सुन्दर");
    expect(toDevanagari("nepaal")).toBe("नेपाल");
    expect(toDevanagari("naya^")).toBe("नयँ");
  });
});

describe("preview — x follows the target word (rules.md B1)", () => {
  // x is accepted for both क्ष and छ (A3), so the preview reads it from the
  // word being typed: the nth x takes the nth क्ष-or-छ in the target.
  const KSH = `क${HALANT}ष`;

  it("shows छ when the target has छ", () => {
    expect(toDevanagari("basxa", { target: "बस्छ" })).toBe(`बस${HALANT}छ`);
    expect(toDevanagari("xa", { target: "छ" })).toBe("छ");
    expect(toDevanagari("garxa", { target: "गर्छ" })).toBe(`गर${HALANT}छ`);
  });

  it("shows क्ष when the target has क्ष", () => {
    expect(toDevanagari("xetri", { target: "क्षेत्री" })).toBe(`${KSH}ेत${HALANT}रि`);
  });

  it("follows the order when a word has both", () => {
    expect(toDevanagari("xaxa", { target: "क्षछ" })).toBe(`${KSH}छ`);
    expect(toDevanagari("xaxa", { target: "छक्ष" })).toBe(`छ${KSH}`);
  });

  it("keeps क्ष with no target, or more x than the target has", () => {
    expect(toDevanagari("xa")).toBe(KSH);
    expect(toDevanagari("xa", { target: null })).toBe(KSH);
    expect(toDevanagari("xaxa", { target: "छ" })).toBe(`छ${KSH}`);
  });
});

describe("preview — sounded-out क्ष: kx, xy (rules.md B1)", () => {
  const KSH = `क${HALANT}ष`;

  it("shows kx as one क्ष, not क्क्ष", () => {
    expect(toDevanagari("rakxa", { target: "रक्षा" })).toBe(`र${KSH}`);
    expect(toDevanagari("rakxa")).toBe(`र${KSH}`);
  });

  it("drops the y after x when the target has no य there", () => {
    expect(toDevanagari("rakxya", { target: "रक्षा" })).toBe(`र${KSH}`);
    expect(toDevanagari("xyamata", { target: "क्षमता" })).toBe(`${KSH}मत`);
  });

  it("keeps the y when the target has क्ष्य", () => {
    expect(toDevanagari("lakxya", { target: "लक्ष्य" })).toBe(`ल${KSH}${HALANT}य`);
  });

  it("counts ksh and chh in the x order too", () => {
    expect(toDevanagari("kshaxa", { target: "क्षछ" })).toBe(`${KSH}छ`);
  });
});
