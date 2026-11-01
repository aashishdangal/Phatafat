/** Entry point: tokens, font, styles, then the app. */

import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/600.css";
import "@fontsource/noto-sans-devanagari/700.css";
import "./ui/theme.css";
import "./ui/app.css";

import { startApp } from "./ui/app";

const root = document.querySelector<HTMLDivElement>("#app");
if (root !== null) startApp(root);
