/**
 * Nepali UI strings.
 *
 * The whole interface is in Nepali. Keys are ASCII so the code stays
 * greppable; every value is Devanagari. Kept as one flat map rather than an
 * i18n library — there is exactly one locale, and a second one would be a
 * second map, not a framework.
 *
 * Abbreviations used:
 *   श.प्र.मि. = शब्द प्रति मिनेट (words per minute)
 */
export const ne = {
  // Identity
  appName: "फटाफट",
  tagline: "तपाईं कति फटाफट टाइप गर्नुहुन्छ?",

  // Modes
  modeRomanized: "रोमन",
  modePreeti: "प्रीति",
  modeFree: "स्वतन्त्र",

  // Test configuration
  time: "समय",
  words: "शब्द",
  seconds: "सेकेन्ड",
  settings: "सेटिङ",
  keyboard: "कीबोर्ड",
  passage: "अनुच्छेद",

  // Live
  startHint: "टाइप गर्न सुरु गर्नुहोस्",
  restartHint: "पुनः सुरु गर्न Tab थिच्नुहोस्",

  // Results — exam-style report card
  results: "नतिजा",
  grossWpm: "कुल गति",
  netWpm: "खुद गति",
  wpmUnit: "श.प्र.मि.",
  accuracy: "शुद्धता",
  errors: "त्रुटि",
  correctWords: "सही शब्द",
  duration: "अवधि",
  mode: "माध्यम",
  charAccuracy: "अक्षर शुद्धता",
  wordAccuracy: "शब्द शुद्धता",
  restart: "पुनः सुरु",
  next: "अर्को",

  // Free mode
  notInDictionary: "शब्दकोशमा छैन",
  didYouMean: "यो भन्नु भएको?",

  // Settings
  skin: "रूप",
  skinAlive: "जीवन्त",
  skinSerious: "गम्भीर",
  showKeyboard: "कीबोर्ड देखाउनु",
  on: "खुला",
  off: "बन्द",
} as const;

export type StringKey = keyof typeof ne;
