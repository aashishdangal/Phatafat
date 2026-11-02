/**
 * The app shell: wires the session to the views and owns the clock.
 *
 * Division of labour:
 *   - the Session owns the test; this file never judges a word.
 *   - the word view owns the word DOM; this file never touches a word span.
 *   - one requestAnimationFrame loop calls `session.tick()` while a test is
 *     running, and writes to the DOM only when a displayed value changed.
 *
 * Keystroke path (must stay under 16ms): keydown → session.onKey → one
 * subscriber call → ghost text, two class toggles, keyboard hint classes,
 * progress transform. No layout reads anywhere on that path.
 */

import { countGraphemes } from "../engine/scoring";
import { codeForChar } from "../engine/hint";
import { charForAltCode, keyFor, unicodeToPreeti } from "../engine/preeti";
import { toDevanagari } from "../engine/preview";
import { createDictionary, type Dictionary } from "../engine/skeleton";
import { PreetiInput } from "../input/preeti";
import { RomanizedInput } from "../input/romanized";
import type { InputMethod, KeyEvent, KeyHint } from "../input/types";
import { Session, type FreeLookup, type SessionState, type WordSource } from "../session/session";
import passagesJson from "../data/passages.json";
import lokSewaJson from "../data/loksewa-passages.json";
import wordsJson from "../data/words.json";
import type { WpmSample } from "./chart";
import { ControlBar } from "./controls";
import { el, setText } from "./dom";
import { clamp01, neDuration, neInt, neNum, nePercent } from "./format";
import { KeyboardView } from "./keyboard";
import { ProgressBar, heatFromWpm } from "./progress";
import { renderResults } from "./results";
import { loadSettings, saveSettings, type Settings, type TestType } from "./settings";
import { LANGUAGE, ne } from "./strings";
import { FocusWordView } from "./words/focus";
import { FreeWordView } from "./words/free";
import { WrappedWordView } from "./words/wrapped";
import type { WordView } from "./words/common";

const COMMON_WORDS: readonly string[] = wordsJson.common;
const PASSAGES = passagesJson.passages;

/**
 * Preeti can type almost every word, but not all: ङ has no confirmed key yet.
 * Untypeable words and passages are simply left out of Preeti tests.
 */
const PREETI_WORDS: readonly string[] = COMMON_WORDS.filter((w) => unicodeToPreeti(w) !== null);
const PREETI_PASSAGES = PASSAGES.filter((p) =>
  p.text.trim().split(/\s+/).every((w) => unicodeToPreeti(w) !== null),
);

const TEST_LABEL: Record<TestType, string> = {
  words: ne.testWords,
  passage: ne.testPassage,
  free: ne.testFree,
  loksewa: ne.testLokSewa,
};

/** Exam passages (~200 words): Lok Sewa types a whole one against the clock. */
const LOKSEWA_PASSAGES = lokSewaJson.passages;
/** Words per minute no exam candidate will outrun: sizes the chained text. */
const EXAM_MAX_WPM = 100;
const LOKSEWA_PREETI = LOKSEWA_PASSAGES.filter((p) =>
  p.text.trim().split(/\s+/).every((w) => unicodeToPreeti(w) !== null),
);

export function startApp(root: HTMLElement): void {
  const settings = loadSettings();
  let input: InputMethod = makeInput();

  function makeInput(): InputMethod {
    return settings.mode === "preeti" ? new PreetiInput() : new RomanizedInput();
  }

  /* ---------------- shell ---------------- */

  const progress = new ProgressBar();
  let keyboard = new KeyboardView(input.layout);
  const wordsHost = el("div", { class: "words-host" });
  const typebox = el("input", {
    class: "typebox",
    type: "text",
    autocomplete: "off",
    autocorrect: "off",
    autocapitalize: "off",
    spellcheck: "false",
    "aria-label": ne.typingArea,
    "aria-describedby": "typing-hint",
  });
  const hint = el("p", { class: "hint", id: "typing-hint", text: ne.startHint });
  // Touch screens have no Tab or Esc, so they get a real button (CSS shows
  // it only on coarse pointers).
  const restartTouch = el("button", { class: "btn btn--ghost restart-touch", type: "button" }, [
    ne.restart,
  ]);
  restartTouch.addEventListener("click", () => restart());
  // Announces the result to screen readers when a test ends.
  const announcer = el("p", { class: "sr-only", "aria-live": "polite" });
  const stage = el("div", { class: "stage" }, [
    el("div", { class: "stage-type" }, [typebox, wordsHost]),
    progress.el,
  ]);
  const keyboardHost = el("div", { class: "kb-host" }, [keyboard.el]);
  const resultsHost = el("div", { class: "results-host" });

  const controls = new ControlBar({
    onLanguage: (language) => {
      if (language === settings.language) return;
      settings.language = language;
      persist();
      // Every label in the app is built once from the active table, so a new
      // language is a fresh start. Settings are saved, so nothing is lost
      // but the test in progress.
      window.location.reload();
    },
    onInput: (mode) => {
      if (mode === settings.mode) return;
      // A deliberate choice: leaving the exam keeps it.
      modeBeforeExam = null;
      switchInput(mode);
      persist();
      rebuild();
    },
    onTest: (test) => {
      if (test === settings.test) return;
      const wasExam = settings.test === "loksewa";
      settings.test = test;
      // The exam is typed in Preeti unless the user picks Roman afterwards.
      // Leaving it gives back the input the user had before.
      if (test === "loksewa" && settings.mode !== "preeti") {
        modeBeforeExam = settings.mode;
        switchInput("preeti");
      } else if (wasExam && test !== "loksewa" && modeBeforeExam !== null) {
        switchInput(modeBeforeExam);
        modeBeforeExam = null;
      }
      // A passage is timed: it has no word count of its own.
      if (test === "passage" && settings.length.kind === "words") {
        settings.length = { kind: "time", seconds: 60 };
        controls.setLength(settings.length);
      }
      persist();
      controls.setTest(test);
      applySkin(); // Lok Sewa forces the Calm look
      rebuild();
    },
    onLokSewa: (change) => {
      settings.loksewa = { ...settings.loksewa, ...change };
      persist();
      controls.setLokSewa(settings.loksewa);
      rebuild();
    },
    onLength: (length) => {
      settings.length = length;
      persist();
      controls.setLength(length);
      rebuild();
    },
    onLayout: (layout) => {
      settings.variant = layout;
      persist();
      controls.setLayout(layout);
      rebuild();
    },
    onKeyboard: (show) => {
      settings.keyboard = show;
      persist();
      applyKeyboardVisibility();
    },
    onSkin: (skin) => {
      settings.skin = skin;
      persist();
      applySkin();
    },
    onTheme: (theme) => {
      settings.theme = theme;
      persist();
      applySkin();
    },
  });

  const main = el("main", { class: "main" }, [
    stage,
    keyboardHost,
    hint,
    restartTouch,
    resultsHost,
    announcer,
  ]);
  root.replaceChildren(controls.el, main);

  /** The input to give back when the exam is left; null when the user chose. */
  let modeBeforeExam: Settings["mode"] | null = null;

  /** A new input brings its own keystroke handling and its own keyboard. */
  function switchInput(mode: Settings["mode"]): void {
    settings.mode = mode;
    controls.setInput(mode);
    input = makeInput();
    keyboard = new KeyboardView(input.layout);
    keyboardHost.replaceChildren(keyboard.el);
  }

  function persist(): void {
    saveSettings(settings satisfies Settings);
  }

  /** Lok Sewa is typed in the Calm look whatever the setting says. */
  function effectiveSkin(): Settings["skin"] {
    return settings.test === "loksewa" ? "serious" : settings.skin;
  }

  const isExam = (): boolean => settings.test === "loksewa";

  /** Skin and theme together: both are a colour swap on <html>. */
  function applySkin(): void {
    // Suppress transitions across the swap so every colour does not
    // animate at once (better-ui).
    const html = document.documentElement;
    html.classList.add("no-transitions");
    html.dataset.skin = effectiveSkin();
    html.dataset.theme = settings.theme;
    // Commit the new colours while transitions are off, so none of them
    // animates when the class comes off (better-ui theme-switch recipe).
    void document.body.offsetHeight;
    // The control shows the skin in use, which the exam may override.
    controls.setSkin(effectiveSkin());
    controls.setTheme(settings.theme);
    // Mobile browser chrome follows the page background.
    const bg = getComputedStyle(html).getPropertyValue("--bg").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.documentElement.classList.remove("no-transitions"));
    });
  }

  function applyKeyboardVisibility(): void {
    keyboardHost.hidden = !settings.keyboard;
    controls.setKeyboard(settings.keyboard);
  }

  /* ---------------- session + word view ---------------- */

  let session!: Session;
  let view: WordView | undefined;
  let samples: WpmSample[] = [];
  let nextSampleSecond = 1;
  let correctClusters = 0;
  let committedSeen = 0;
  let notchesFor = 0;
  let lastHints: readonly KeyHint[] = [];
  let suspendUpdates = false;
  let passageTitle = "";

  function pickPassage(): { title: string; text: string } {
    const pool = settings.mode === "preeti" ? PREETI_PASSAGES : PASSAGES;
    const chosen = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
    return { title: chosen?.title ?? "", text: chosen?.text ?? "" };
  }

  /**
   * The exam ends on the clock, not at the end of a passage, so passages are
   * chained until even a fast typist cannot run out before time is up.
   */
  function pickExamText(): { title: string; text: string } {
    // Never an empty exam: fall back to every passage if none suit Preeti.
    const pool =
      settings.mode === "preeti" && LOKSEWA_PREETI.length > 0 ? LOKSEWA_PREETI : LOKSEWA_PASSAGES;
    const needed = settings.loksewa.minutes * EXAM_MAX_WPM;
    const order = [...pool];
    for (let j = order.length - 1; j > 0; j -= 1) {
      const r = Math.floor(Math.random() * (j + 1)); // Fisher-Yates
      [order[j], order[r]] = [order[r]!, order[j]!];
    }
    const texts: string[] = [];
    let words = 0;
    for (let k = 0; words < needed && order.length > 0; k += 1) {
      const text = order[k % order.length]?.text.trim() ?? "";
      texts.push(text);
      words += text.split(/\s+/).length;
    }
    return { title: order[0]?.title ?? "", text: texts.join(" ") };
  }

  function makeSource(): WordSource {
    if (settings.test !== "passage" && !isExam()) {
      return { kind: "words", words: settings.mode === "preeti" ? PREETI_WORDS : COMMON_WORDS };
    }
    const passage = isExam() ? pickExamText() : pickPassage();
    passageTitle = passage.title;
    return { kind: "passage", text: passage.text };
  }

  /* ---------------- free typing ---------------- */

  /**
   * The dictionary is ~160 KB compressed, so it loads only when Free is first
   * opened, as its own chunk, and is indexed once (rules.md A9).
   */
  let dictionary: Dictionary | null = null;
  let dictionaryLoading = false;

  function loadDictionary(): void {
    if (dictionary !== null || dictionaryLoading) return;
    dictionaryLoading = true;
    setText(hint, ne.loadingDictionary);
    void import("../data/dictionary.json").then((module) => {
      dictionary = createDictionary(module.default.words);
      dictionaryLoading = false;
      if (session.state.status !== "running") setText(hint, idleHint());
    });
  }

  /** Free mode's judge: the dictionary word the typed word stands for. */
  const freeLookup: FreeLookup = (typed) => {
    if (settings.mode === "preeti") {
      return { word: dictionary?.findDevanagari(typed) ?? null, display: typed };
    }
    return { word: dictionary?.findRomanized(typed) ?? null, display: toDevanagari(typed) };
  };

  function makeView(): WordView {
    if (settings.test === "free") return new FreeWordView();
    if (settings.test === "passage" || isExam()) {
      return new WrappedWordView({
          visibleLines: 5,
          keepLine: 2,
          variantClass: "words--passage",
        title: passageTitle,
      });
    }
    switch (settings.variant) {
      case "focus":
        return new FocusWordView();
      default:
        return new WrappedWordView({ visibleLines: 3, keepLine: 1, variantClass: "words--wrapped" });
    }
  }

  /** Build a brand-new test: new source, new targets, new word DOM. */
  function rebuild(): void {
    stopLoop();
    suspendUpdates = true;
    const source = makeSource();
    // A new session reuses the input method, so clear what it was holding:
    // half-typed keys must not leak into the next test.
    input.reset();
    session = new Session({
      length: isExam() ? { kind: "time", seconds: settings.loksewa.minutes * 60 } : settings.length,
      source,
      input,
      free: settings.test === "free" ? freeLookup : undefined,
    });
    if (settings.test === "free") loadDictionary();
    // Lok Sewa shows the countdown only: no fill, no speed, no error marks.
    progress.el.classList.toggle("pb--exam", isExam());
    session.subscribe(onState);
    suspendUpdates = false;

    view?.destroy();
    view = makeView();
    wordsHost.replaceChildren(view.el);
    resetRunState();
    view.mount(session.state);
    onState(session.state);
  }

  function resetRunState(): void {
    samples = [];
    nextSampleSecond = 1;
    correctClusters = 0;
    committedSeen = 0;
    notchesFor = 0;
    progress.reset();
    keyboard.clearFlashes();
    resultsHost.replaceChildren();
    setText(announcer, "");
    root.classList.remove("is-finished");
  }

  /** Same test config, fresh words. Tab / Esc / the results button. */
  function restart(): void {
    stopLoop();
    if (settings.test === "passage" || isExam()) {
      // A new passage each time, so a restart is a new reading.
      rebuild();
    } else {
      suspendUpdates = true;
      session.restart();
      suspendUpdates = false;
      resetRunState();
      view?.mount(session.state);
      onState(session.state);
    }
    focusTypebox();
  }

  /* ---------------- live derived numbers ---------------- */

  /** Gross WPM so far, from the same definition scoring.ts uses. */
  function liveWpm(state: SessionState): number {
    if (state.committed.length !== committedSeen) {
      if (state.committed.length < committedSeen) {
        correctClusters = 0;
        for (const word of state.committed) {
          if (word.correct) correctClusters += countGraphemes(word.target);
        }
      } else {
        for (let i = committedSeen; i < state.committed.length; i += 1) {
          const word = state.committed[i];
          if (word !== undefined && word.correct) correctClusters += countGraphemes(word.target);
        }
      }
      committedSeen = state.committed.length;
    }
    const minutes = state.elapsedMs / 60_000;
    if (minutes <= 0) return 0;
    const correctWords = state.committed.reduce((n, w) => (w.correct ? n + 1 : n), 0);
    const spaces = Math.max(0, correctWords - 1);
    return (correctClusters + spaces) / 5 / minutes;
  }

  function progressFraction(state: SessionState): number {
    if (state.remainingMs !== null) {
      const total = state.remainingMs + state.elapsedMs;
      return total > 0 ? clamp01(state.elapsedMs / total) : 0;
    }
    if (state.remainingWords !== null) {
      const total = state.remainingWords + state.committed.length;
      return total > 0 ? clamp01(state.committed.length / total) : 0;
    }
    return state.targets.length > 0 ? clamp01(state.index / state.targets.length) : 0;
  }

  function syncProgress(state: SessionState): void {
    const fraction = progressFraction(state);
    progress.setProgress(fraction);
    // Lok Sewa: no live speed while typing, as in the exam.
    progress.setHeat(isExam() ? 0 : heatFromWpm(liveWpm(state)));
    progress.setRemaining(state.remainingMs, state.remainingWords);

    // One notch per wrong word, at the point in the run where it happened.
    if (state.committed.length < notchesFor) notchesFor = state.committed.length;
    for (let i = notchesFor; i < state.committed.length; i += 1) {
      const word = state.committed[i];
      if (word !== undefined && !word.correct) progress.markWrongAt(fraction);
    }
    notchesFor = state.committed.length;
  }

  /* ---------------- state subscription ---------------- */

  function onState(state: SessionState): void {
    if (suspendUpdates) return;

    if (state.status === "finished") {
      stopLoop();
      view?.update(state);
      syncProgress(state);
      showResults(state);
      controls.setDimmed(false);
      return;
    }

    view?.update(state);
    keyboard.setHints(state.nextKeys);
    lastHints = state.nextKeys;
    syncProgress(state);
    controls.setDimmed(state.status === "running");
    setText(hint, state.status === "running" ? "" : idleHint());
    if (state.status === "running") startLoop();
  }

  /** Touch screens have no Tab key; the restart button below speaks for itself. */
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  function restartHint(): string {
    return coarsePointer.matches ? "" : ne.restartHint;
  }

  function idleHint(): string {
    return document.activeElement === typebox ? restartHint() : ne.tapToType;
  }

  function showResults(state: SessionState): void {
    const results = state.results;
    if (results === null) return;
    root.classList.add("is-finished");
    const lengthLabel =
      isExam()
        ? neDuration(settings.loksewa.minutes * 60_000)
        : settings.length.kind === "time"
          ? neDuration(settings.length.seconds * 1000)
          : `${neNum(settings.length.count)} ${ne.wordsShort}`;
    // Close the line off at the final value, and give a very short test the
    // two points a line needs.
    const line: WpmSample[] = [{ t: 0, wpm: 0 }, ...samples];
    line.push({ t: results.elapsedMs / 1000, wpm: results.grossWpm });

    resultsHost.replaceChildren(
      renderResults({
        results,
        samples: line,
        modeLabel: `${settings.mode === "preeti" ? ne.modePreeti : ne.modeRomanized} · ${TEST_LABEL[settings.test]}`,
        lengthLabel,
        onRestart: restart,
        examTarget: isExam() ? settings.loksewa.target : undefined,
      }),
    );
    setText(hint, restartHint());
    setText(
      announcer,
      `${ne.results}: ${ne.grossWpm} ${neInt(results.grossWpm)} ${ne.wpmUnit}, ` +
        `${ne.netWpm} ${neInt(results.netWpm)} ${ne.wpmUnit}, ` +
        `${ne.accuracy} ${nePercent(results.wordAccuracy)}`,
    );
  }

  /* ---------------- the clock ---------------- */

  let frame = 0;

  function loop(): void {
    frame = requestAnimationFrame(loop);
    session.tick();
    const state = session.state;
    if (state.status !== "running") return;
    syncProgress(state);
    const second = Math.floor(state.elapsedMs / 1000);
    if (second >= nextSampleSecond) {
      nextSampleSecond = second + 1;
      samples.push({ t: second, wpm: liveWpm(state) });
    }
  }

  function startLoop(): void {
    if (frame !== 0) return;
    frame = requestAnimationFrame(loop);
  }

  function stopLoop(): void {
    if (frame === 0) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  /* ---------------- input ---------------- */

  function focusTypebox(): void {
    typebox.focus({ preventScroll: true });
  }

  function isControl(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && target !== typebox && target.closest("button") !== null;
  }

  function backspaceBlocked(): boolean {
    return isExam() && settings.loksewa.noBackspace;
  }

  /** Timestamp of the last keystroke the session took from a keydown. */
  let lastKeyAt = -1;

  /**
   * Hand a keystroke to the session and flash the key that was pressed.
   *
   * The hint used to judge the press is the one from before the keystroke
   * (`lastHints`, kept up to date by the subscription), so judging costs
   * nothing. No hint means no opinion: the user may be typing another
   * accepted spelling, which is not an error.
   */
  function feed(event: KeyEvent): boolean {
    const hints = lastHints;
    const consumed = session.onKey(event);
    if (!consumed) return false;
    if (event.code !== "") {
      const judged =
        hints.length === 0 || event.key === "Backspace"
          ? undefined
          : hints.some((h) => h.code === event.code);
      keyboard.flash(event.code, judged);
    }
    return true;
  }

  /*
   * Alt codes without a numpad. Windows only builds Alt codes (Alt+0203 = ङ्ग
   * in Preeti) from the numpad, and most laptops have none. So the app
   * collects the digits typed while Alt is held, on the top row or the
   * numpad, and inserts the character itself when Alt is released.
   */
  let altDigits = "";

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Alt") {
        altDigits = "";
        return;
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey && /^[0-9]$/.test(event.key)) {
        altDigits += event.key;
        // Not a Preeti key while Alt is held, and no browser shortcut either.
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  document.addEventListener("keyup", (event) => {
    if (event.key !== "Alt") return;
    const digits = altDigits;
    altDigits = "";
    const char = charForAltCode(digits);
    if (char === null) return;
    // Releasing Alt would otherwise focus the browser menu.
    event.preventDefault();
    if (isControl(document.activeElement)) focusTypebox();
    if (feed({ key: char, code: "AltLeft", shiftKey: false })) {
      // A real numpad makes Windows insert the same character right after;
      // the beforeinput guard below skips it, so it is never counted twice.
      lastKeyAt = event.timeStamp;
    }
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      settings.keyboard = !settings.keyboard;
      persist();
      applyKeyboardVisibility();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      restart();
      return;
    }

    // Lok Sewa without Backspace: a mistake stays, as on strict exam
    // software. The key flashes red so the refusal is visible.
    if (event.key === "Backspace" && backspaceBlocked()) {
      event.preventDefault();
      keyboard.flash("Backspace", false);
      return;
    }

    // Tab restarts from the typing surface and from the results card.
    // Shift+Tab is left to the browser, so focus can leave the typing box
    // for the header controls (WCAG 2.1.1, no keyboard trap). On a header
    // control, Tab moves focus as usual.
    if (event.key === "Tab" && !event.shiftKey && !isControl(event.target)) {
      event.preventDefault();
      restart();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // Let Space and Enter activate a focused button instead of typing.
    if (isControl(event.target) && (event.key === " " || event.key === "Enter")) return;
    // Typing a character while a header button has focus (it was just
    // clicked) means "back to the test": move focus there, so the Space that
    // ends the word reaches the test instead of pressing the button.
    if (isControl(event.target) && event.key.length === 1) focusTypebox();

    if (feed(event)) {
      event.preventDefault();
      lastKeyAt = event.timeStamp;
    }
  });

  // Touch keyboards often send no usable keydown (key: "Unidentified"), so
  // the characters are read off beforeinput instead. A keydown the session
  // already took wins, so a desktop keystroke is never counted twice.
  typebox.addEventListener("beforeinput", (event) => {
    const inputEvent = event as InputEvent;
    // Always prevented: the input exists to raise the soft keyboard and to
    // hold focus, never to show text.
    inputEvent.preventDefault();
    if (inputEvent.timeStamp - lastKeyAt < 60) return;
    if (inputEvent.inputType === "insertText" || inputEvent.inputType === "insertCompositionText") {
      for (const ch of inputEvent.data ?? "") {
        const code = keyFor(ch)?.code ?? codeForChar(ch.toLowerCase()) ?? "";
        feed({ key: ch, code, shiftKey: ch !== ch.toLowerCase() });
      }
      return;
    }
    if (inputEvent.inputType.startsWith("deleteContent")) {
      if (backspaceBlocked()) return;
      feed({ key: "Backspace", code: "Backspace", shiftKey: false });
    }
  });

  // Belt and braces: if a composition or a paste slips past beforeinput, the
  // field is emptied again rather than showing stray text.
  typebox.addEventListener("input", () => {
    if (typebox.value !== "") typebox.value = "";
  });

  // The hint line doubles as the focus indicator for the typing surface:
  // unfocused it says "tap here to type" and the surface shows a dashed
  // edge (CSS :focus-within); focused, the caret is the indicator.
  typebox.addEventListener("focus", () => {
    if (session.state.status !== "running") setText(hint, restartHint());
  });
  typebox.addEventListener("blur", () => {
    if (session.state.status !== "running") setText(hint, ne.tapToType);
  });

  stage.addEventListener("pointerdown", (event) => {
    if (isControl(event.target)) return;
    focusTypebox();
  });

  /* ---------------- resize ---------------- */

  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    if (resizeFrame !== 0) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      view?.measure();
    });
  });

  // The Devanagari webfont changes every line break, so line positions are
  // only trustworthy once it has loaded.
  void document.fonts?.ready.then(() => view?.measure(true));

  /* ---------------- go ---------------- */

  applySkin();
  applyKeyboardVisibility();
  controls.setInput(settings.mode);
  controls.setTest(settings.test);
  controls.setLokSewa(settings.loksewa);
  controls.setLanguage(settings.language);
  // English labels read with an English voice; the Nepali words being typed
  // keep the page's lang="ne".
  if (LANGUAGE === "en") {
    for (const node of [controls.el, hint, restartTouch, resultsHost]) node.lang = "en";
  }
  controls.setLength(settings.length);
  controls.setLayout(settings.variant);
  rebuild();
  focusTypebox();
}
