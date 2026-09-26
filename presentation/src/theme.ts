import { continueRender, delayRender } from "remotion";
import plexSansUrl from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2";
import plexSerif400 from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-normal.woff2";
import plexSerif400i from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-italic.woff2";
import plexSerif500 from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-500-normal.woff2";
import monoUrl from "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2";

// Bundled fonts: no network needed to render or to open the page.
const loadFont = (family: string, url: string, descriptors: FontFaceDescriptors) => {
  if (typeof FontFace === "undefined" || typeof document === "undefined") return;
  const handle = delayRender(`font ${family}`);
  const face = new FontFace(family, `url(${url}) format("woff2")`, descriptors);
  face
    .load()
    .then((f) => document.fonts.add(f))
    .catch((err) => console.warn(`Could not load ${family}`, err))
    .finally(() => continueRender(handle));
};
loadFont("IBM Plex Sans Variable", plexSansUrl, { weight: "100 700" });
loadFont("IBM Plex Serif", plexSerif400, { weight: "400" });
loadFont("IBM Plex Serif", plexSerif400i, { weight: "400", style: "italic" });
loadFont("IBM Plex Serif", plexSerif500, { weight: "500" });
loadFont("JetBrains Mono Variable", monoUrl, { weight: "100 800" });

export const SANS = `"IBM Plex Sans Variable", "Helvetica Neue", Arial, sans-serif`;
export const SERIF = `"IBM Plex Serif", Georgia, "Times New Roman", serif`;
export const MONO = `"JetBrains Mono Variable", ui-monospace, Menlo, monospace`;

/** A white paper: cool white page, dark ink, one engineering blue, a signal red-orange for sound. */
export const C = {
  paper: "#fcfcfb",
  tint: "#f2f4f5",
  rule: "#c9d0d4",
  grid: "#e4e8ea",
  ink: "#17212b",
  ink2: "#4b5864",
  faint: "#8793a0",
  blue: "#1f57a3",
  blueTint: "#e3ecf7",
  signal: "#c4471b",
  signalTint: "#fae9e2",
  ochre: "#8c6200",
  ochreTint: "#f6eedb",
  green: "#2c7a3a",
  land: "#eceff1",
  landEdge: "#6c7a86",
  stone: "#ffffff",
  stoneSide: "#dfe4e7",
  stoneTop: "#f3f5f6",
};

export const W = 1920;
export const H = 1080;
export const FPS = 30;

export type Evidence = "DOCUMENTED" | "MEASURED" | "MODELLED" | "HYPOTHETICAL";
export const EVIDENCE_COLOUR: Record<Evidence, string> = {
  DOCUMENTED: C.blue,
  MEASURED: C.green,
  MODELLED: C.ochre,
  HYPOTHETICAL: C.signal,
};
