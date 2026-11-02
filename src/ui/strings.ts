/**
 * Interface strings, in three languages the user picks with the header switch:
 *
 *   ne  — all Nepali
 *   mix — Nepali, with the heavy or technical words in English (the default):
 *         बान्की, श.प्र.मि., अनुच्छेद, त्रुटि and the like become Layout,
 *         WPM, Passage, Errors, because that is how people actually say them
 *   en  — every feature named in English
 *
 * Only the interface changes. The words and passages being typed are Nepali
 * in every language: that is the test, not the interface.
 *
 * Keys are ASCII so the code stays greppable. One flat map per language
 * rather than an i18n library: three tables, no framework.
 *
 * Abbreviations used:
 *   श.प्र.मि. = शब्द प्रति मिनेट (words per minute)
 */

import { loadSettings, type UiLanguage } from "./settings";

const NE = {
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
  restartHint: "पुनः सुरु गर्न Tab थिच्नुहोस् · सेटिङमा जान Shift+Tab",

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

  // Layout variants
  layout: "बान्की",
  layoutWrapped: "पङ्क्ति",
  layoutFocus: "एक हरफ",
  layoutPassage: "अनुच्छेद",
  layoutPassageHint: "लोक सेवा अभ्यास — पूरा अनुच्छेद",

  // Live instrument
  remainingTime: "बाँकी समय",
  remainingWords: "बाँकी शब्द",
  typingArea: "टाइप गर्ने क्षेत्र",
  typingAreaHint: "यहाँ टाइप गर्नुहोस्। Tab वा Esc थिचेर पुनः सुरु हुन्छ।",
  progressLabel: "प्रगति",
  tapToType: "टाइप गर्न यहाँ थिच्नुहोस्",

  // Results extras
  reportCard: "नतिजा पत्र",
  speedOverTime: "गतिको रेखा",
  wrongWordsTitle: "गलत शब्दहरू",
  expected: "सही",
  typedAs: "तपाईंले टाइप गर्नुभयो",
  noWrongWords: "एउटै गल्ती भएन।",
  share: "सेयर",
  copied: "कपी भयो",
  shareLine: "मैले {wpm} WPM टाइप गरें — तपाईं कति फटाफट?",
  minuteShort: "मि.",
  secondShort: "से.",
  wordsShort: "शब्द",

  // Settings
  skin: "प्रभाव",
  skinAlive: "रङ्गीन",
  skinSerious: "सादा",
  theme: "रङ",
  themeDark: "अँध्यारो",
  themeLight: "उज्यालो",
  language: "भाषा",
  test: "परीक्षा",
  length: "लम्बाइ",
  testWords: "शब्द",
  testPassage: "अनुच्छेद",
  testFree: "स्वतन्त्र",
  testLokSewa: "लोक सेवा",
  lokSewaHint: "परीक्षा जस्तै: घडी मात्र, नतिजा अन्त्यमा",
  target: "लक्ष्य",
  backspace: "ब्याकस्पेस",
  allowed: "चल्छ",
  verdictPass: "उत्तीर्ण",
  verdictNotYet: "अझै पुगेन",
  verdictLine: "लक्ष्य {target} श.प्र.मि. · तपाईंको खुद गति {net}",
  examNote: "नियम पदअनुसार फरक हुन्छन्। आफ्नो विज्ञापन हेर्नुहोस्।",
  input: "इनपुट",
  loadingDictionary: "शब्दकोश लोड हुँदैछ…",
  showKeyboard: "कीबोर्ड देखाउनु",
  on: "खुला",
  off: "बन्द",
} as const;

export type StringKey = keyof typeof NE;
type Table = Readonly<Record<StringKey, string>>;

const EN: Table = {
  appName: "फटाफट", // the name stays Nepali in every language
  tagline: "How fast do you type Nepali?",

  modeRomanized: "Roman",
  modePreeti: "Preeti",
  modeFree: "Free",

  time: "Time",
  words: "Words",
  seconds: "seconds",
  settings: "Settings",
  keyboard: "Keyboard",
  passage: "Passage",

  startHint: "Start typing",
  restartHint: "Tab to restart · Shift+Tab for settings",

  results: "Results",
  grossWpm: "Gross speed",
  netWpm: "Net speed",
  wpmUnit: "WPM",
  accuracy: "Accuracy",
  errors: "Errors",
  correctWords: "Correct words",
  duration: "Duration",
  mode: "Mode",
  charAccuracy: "Key accuracy",
  wordAccuracy: "Word accuracy",
  restart: "Restart",
  next: "Next",

  notInDictionary: "Not in the dictionary",
  didYouMean: "Did you mean?",

  layout: "Layout",
  layoutWrapped: "Lines",
  layoutFocus: "Focus",
  layoutPassage: "Passage",
  layoutPassageHint: "Lok Sewa practice — a full passage",

  remainingTime: "Time left",
  remainingWords: "Words left",
  typingArea: "Typing area",
  typingAreaHint: "Type here. Tab or Esc restarts.",
  progressLabel: "Progress",
  tapToType: "Tap here to type",

  reportCard: "Report card",
  speedOverTime: "Speed over time",
  wrongWordsTitle: "Wrong words",
  expected: "Correct",
  typedAs: "You typed",
  noWrongWords: "Not a single mistake.",
  share: "Share",
  copied: "Copied",
  shareLine: "I typed {wpm} WPM in Nepali — how fast are you?",
  minuteShort: "min",
  secondShort: "s",
  wordsShort: "words",

  skin: "Effects",
  skinAlive: "Vivid",
  skinSerious: "Calm",
  theme: "Theme",
  themeDark: "Dark",
  themeLight: "Light",
  language: "Language",
  input: "Input",
  loadingDictionary: "Loading the dictionary…",
  test: "Test",
  length: "Length",
  testWords: "Words",
  testPassage: "Passage",
  testFree: "Free",
  testLokSewa: "Lok Sewa",
  lokSewaHint: "Exam conditions: a clock only, results at the end",
  target: "Target",
  backspace: "Backspace",
  allowed: "Allowed",
  verdictPass: "Pass",
  verdictNotYet: "Not yet",
  verdictLine: "Target {target} WPM · your net speed {net}",
  examNote: "Rules differ by post. Check your vacancy notice.",
  showKeyboard: "Show keyboard",
  on: "On",
  off: "Off",
};

/**
 * Mixed: Nepali, except the words people find heavy or would say in English
 * anyway. Short everyday Nepali (समय, शब्द, नतिजा, सही शब्द) stays.
 */
const MIX: Table = {
  ...NE,
  modeFree: "Free",

  passage: "Passage",
  restartHint: "Restart गर्न Tab · Settings मा जान Shift+Tab",

  grossWpm: "Gross WPM",
  netWpm: "Net WPM",
  wpmUnit: "WPM",
  accuracy: "Accuracy",
  errors: "Errors",
  duration: "समय",
  mode: "Mode",
  charAccuracy: "Key accuracy",
  wordAccuracy: "Word accuracy",
  restart: "Restart",

  layout: "Layout",
  layoutWrapped: "Lines",
  layoutFocus: "Focus",
  layoutPassage: "Passage",
  layoutPassageHint: "लोक सेवा अभ्यास — पूरा Passage",

  typingArea: "Typing area",
  progressLabel: "Progress",

  reportCard: "Result",
  speedOverTime: "Speed graph",
  share: "Share",
  shareLine: "मैले {wpm} WPM टाइप गरें — तपाईं कति फटाफट?",

  skin: "Effects",
  skinAlive: "Vivid",
  skinSerious: "Calm",
  theme: "Theme",
  themeDark: "Dark",
  themeLight: "Light",
  language: "Language",
  input: "Input",
  loadingDictionary: "Dictionary लोड हुँदैछ…",
  test: "Test",
  length: "Length",
  testPassage: "Passage",
  testFree: "Free",
  settings: "Settings",
  lokSewaHint: "Exam जस्तै: घडी मात्र, नतिजा अन्त्यमा",
  target: "Target",
  backspace: "Backspace",
  verdictPass: "Pass",
  verdictNotYet: "Not yet",
  verdictLine: "Target {target} WPM · तपाईंको Net speed {net}",
  notInDictionary: "Dictionary मा छैन",
};

export const TABLES: Readonly<Record<UiLanguage, Table>> = { ne: NE, mix: MIX, en: EN };

/** The interface language, fixed for the page's life (changing it reloads). */
export const LANGUAGE: UiLanguage = loadSettings().language;

/** The active strings. Named `ne` for history: it was the only table. */
export const ne: Table = TABLES[LANGUAGE];
