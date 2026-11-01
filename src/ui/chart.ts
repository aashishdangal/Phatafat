/**
 * The WPM-over-time line on the report card.
 *
 * Built once, after the test, from samples the app takes each second. Inline
 * SVG with a viewBox: it scales with the card and needs no measurement.
 */

import { neInt } from "./format";

export interface WpmSample {
  /** Seconds since the first keystroke. */
  t: number;
  wpm: number;
}

const W = 320;
const H = 90;
const PAD_L = 4;
const PAD_R = 4;
const PAD_T = 8;
const PAD_B = 14;

const SVG = "http://www.w3.org/2000/svg";

function node<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  return element;
}

/** A line with a soft area under it, plus the peak value as a static label. */
export function wpmChart(samples: readonly WpmSample[]): SVGSVGElement {
  const svg = node("svg", {
    class: "chart",
    viewBox: `0 0 ${W} ${H}`,
    role: "img",
    focusable: "false",
  });

  const baseline = node("line", {
    class: "chart-axis",
    x1: PAD_L,
    y1: H - PAD_B,
    x2: W - PAD_R,
    y2: H - PAD_B,
  });
  svg.append(baseline);

  if (samples.length < 2) return svg;

  const maxT = samples[samples.length - 1]?.t ?? 1;
  const peak = samples.reduce((m, s) => Math.max(m, s.wpm), 0);
  const scaleMax = Math.max(10, peak * 1.15);

  const x = (t: number): number => PAD_L + (t / Math.max(1, maxT)) * (W - PAD_L - PAD_R);
  const y = (wpm: number): number => PAD_T + (1 - wpm / scaleMax) * (H - PAD_T - PAD_B);

  const points = samples.map((s) => `${x(s.t).toFixed(1)},${y(s.wpm).toFixed(1)}`).join(" ");

  const area = node("polygon", {
    class: "chart-area",
    points: `${PAD_L},${H - PAD_B} ${points} ${(W - PAD_R).toFixed(1)},${H - PAD_B}`,
  });
  const line = node("polyline", { class: "chart-line", points });
  svg.append(area, line);

  const last = samples[samples.length - 1];
  if (last !== undefined) {
    svg.append(
      node("circle", { class: "chart-dot", cx: x(last.t).toFixed(1), cy: y(last.wpm).toFixed(1), r: 2.5 }),
    );
  }

  const label = node("text", {
    class: "chart-peak",
    x: PAD_L + 2,
    y: PAD_T + 6,
  });
  label.textContent = neInt(peak);
  svg.append(label);

  return svg;
}
