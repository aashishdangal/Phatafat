/**
 * Results — an exam-style report card.
 *
 * Deliberately formal: a titled slip with ruled rows, the two speeds given
 * the most weight, and the wrong words listed underneath as target versus
 * what was typed. Built once when the test ends, so this is the one place a
 * staged entrance is appropriate (100ms apart, gated on reduced motion in
 * CSS).
 */

import type { Results } from "../engine/scoring";
import { wpmChart, type WpmSample } from "./chart";
import { el } from "./dom";
import { neDuration, neInt, nePercent, neNum } from "./format";
import { ne } from "./strings";

export interface ResultsOptions {
  results: Results;
  samples: readonly WpmSample[];
  /** e.g. "रोमन · पङ्क्तिबद्ध" */
  modeLabel: string;
  /** e.g. "३० से." */
  lengthLabel: string;
  onRestart: () => void;
  /** Lok Sewa: the net WPM target the result is judged against. */
  examTarget?: number;
}

function bigStat(label: string, value: string): HTMLElement {
  return el("div", { class: "rc-big" }, [
    el("div", { class: "rc-big-value tnum", text: value }),
    el("div", { class: "rc-big-label", text: label }),
    el("div", { class: "rc-big-unit", text: ne.wpmUnit }),
  ]);
}

function row(label: string, value: string): HTMLElement {
  return el("div", { class: "rc-row" }, [
    el("dt", { class: "rc-row-label", text: label }),
    el("dd", { class: "rc-row-value tnum", text: value }),
  ]);
}

export function renderResults(options: ResultsOptions): HTMLElement {
  const { results, samples, modeLabel, lengthLabel, onRestart, examTarget } = options;

  // Lok Sewa: pass or not yet, judged on net speed against the target. The
  // word carries the verdict, not the colour alone.
  const verdict =
    examTarget === undefined
      ? null
      : (() => {
          const passed = Math.round(results.netWpm) >= examTarget;
          return el(
            "div",
            {
              class: `rc-verdict rc-stage ${passed ? "is-pass" : "is-short"}`,
              "data-stage": "1",
            },
            [
              el("div", { class: "rc-verdict-word", text: passed ? ne.verdictPass : ne.verdictNotYet }),
              el("div", {
                class: "rc-verdict-line tnum",
                text: ne.verdictLine
                  .replace("{target}", neNum(examTarget))
                  .replace("{net}", neInt(results.netWpm)),
              }),
              el("div", { class: "rc-verdict-note", text: ne.examNote }),
            ],
          );
        })();

  const heading = el("div", { class: "rc-head rc-stage", "data-stage": "0" }, [
    el("div", { class: "rc-stamp", text: ne.appName }),
    el("h2", { class: "rc-title", text: ne.reportCard }),
  ]);

  const speeds = el("div", { class: "rc-bigs rc-stage", "data-stage": "1" }, [
    bigStat(ne.grossWpm, neInt(results.grossWpm)),
    bigStat(ne.netWpm, neInt(results.netWpm)),
  ]);

  const table = el("dl", { class: "rc-rows rc-stage", "data-stage": "2" }, [
    row(ne.accuracy, nePercent(results.wordAccuracy)),
    row(ne.correctWords, `${neNum(results.correctWords)} / ${neNum(results.committedWords)}`),
    row(ne.errors, neNum(results.errors)),
    row(ne.duration, `${neDuration(results.elapsedMs)} / ${lengthLabel}`),
    row(ne.mode, modeLabel),
  ]);

  const chart = el("figure", { class: "rc-chart rc-stage", "data-stage": "3" }, [
    el("figcaption", { class: "rc-chart-label", text: ne.speedOverTime }),
    wpmChart(samples),
  ]);

  const wrongList =
    results.wrongWords.length === 0
      ? el("p", { class: "rc-clean", text: ne.noWrongWords })
      : el(
          "ul",
          { class: "rc-wrongs" },
          results.wrongWords.map((wrong) =>
            el("li", { class: "rc-wrong" }, [
              el("span", { class: "rc-wrong-target", text: wrong.target }),
              el("span", { class: "rc-wrong-typed", text: wrong.typed }),
            ]),
          ),
        );

  const wrongSection = el("section", { class: "rc-wrong-section rc-stage", "data-stage": "4" }, [
    el("h3", { class: "rc-sub", text: ne.wrongWordsTitle }),
    wrongList,
  ]);

  const shareText = ne.shareLine.replace("{wpm}", neInt(results.grossWpm));
  const shareButton = el("button", { class: "btn btn--ghost", type: "button" }, [
    el("span", { class: "btn-label", text: ne.share }),
  ]);
  const shareLabel = shareButton.querySelector<HTMLElement>(".btn-label");
  let shareTimer: number | undefined;
  shareButton.addEventListener("click", () => {
    const done = (): void => {
      if (shareLabel === null) return;
      shareLabel.textContent = `✓ ${ne.copied}`;
      if (shareTimer !== undefined) window.clearTimeout(shareTimer);
      shareTimer = window.setTimeout(() => {
        shareLabel.textContent = ne.share;
      }, 1800);
    };
    // Clipboard only; nothing here leaves the device.
    try {
      void navigator.clipboard.writeText(shareText).then(done, done);
    } catch {
      done();
    }
  });

  const restartButton = el("button", { class: "btn btn--primary", type: "button" }, [
    el("span", { text: ne.restart }),
    el("kbd", { class: "btn-kbd", text: "Tab" }),
  ]);
  restartButton.addEventListener("click", onRestart);

  const share = el("div", { class: "rc-share rc-stage", "data-stage": "5" }, [
    el("p", { class: "rc-share-line", text: shareText }),
    el("div", { class: "rc-actions" }, [restartButton, shareButton]),
  ]);

  const card = el("div", { class: "report-card", role: "group", "aria-label": ne.results }, [
    heading,
    ...(verdict === null ? [] : [verdict]),
    speeds,
    table,
    chart,
    wrongSection,
    share,
  ]);

  // Stage the entrance on the next frame so the card does not animate in
  // before the browser has it on screen.
  requestAnimationFrame(() => card.classList.add("is-in"));

  return card;
}
