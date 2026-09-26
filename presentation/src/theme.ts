import { continueRender, delayRender } from "remotion";
import plexUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2";
import monoUrl from "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2";

// Bundled variable fonts: no network needed to render or to open the page.
const loadFont = (family: string, url: string, weight: string) => {
  if (typeof FontFace === "undefined" || typeof document === "undefined") return;
  const handle = delayRender(`font ${family}`);
  const face = new FontFace(family, `url(${url}) format("woff2")`, { weight });
  face
    .load()
    .then((f) => document.fonts.add(f))
    .catch((err) => console.warn(`Could not load ${family}`, err))
    .finally(() => continueRender(handle));
};
loadFont("IBM Plex Sans Variable", plexUrl, "100 700");
loadFont("JetBrains Mono Variable", monoUrl, "100 800");

export const FONT = `"IBM Plex Sans Variable", "Helvetica Neue", Arial, sans-serif`;
export const MONO = `"JetBrains Mono Variable", ui-monospace, Menlo, monospace`;

export const C = {
  bg: "#05080b",
  bg2: "#0a1116",
  panel: "rgba(12, 22, 28, 0.78)",
  line: "#17343c",
  grid: "rgba(63, 224, 208, 0.055)",
  cyan: "#3fe0d0",
  teal: "#1aa39a",
  orange: "#ff8a3d",
  amber: "#ffc15e",
  red: "#ff5d6c",
  text: "#e6f0f1",
  dim: "#86a3a8",
  faint: "#46626a",
  land: "#0d1b20",
  landEdge: "#2a6b6f",
};

export const W = 1920;
export const H = 1080;
export const FPS = 30;

export type Evidence = "DOCUMENTED" | "MEASURED" | "MODELLED" | "HYPOTHETICAL";
export const EVIDENCE_COLOUR: Record<Evidence, string> = {
  DOCUMENTED: C.cyan,
  MEASURED: "#7ee07a",
  MODELLED: C.amber,
  HYPOTHETICAL: C.red,
};
