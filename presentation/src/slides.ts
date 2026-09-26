import React from "react";
import { Controls } from "./controls";
import { S1Title } from "./slides/S1Title";
import { S2Inventory } from "./slides/S2Inventory";
import { S3Signal } from "./slides/S3Signal";
import { S4Range } from "./slides/S4Range";
import { S5Clusters } from "./slides/S5Clusters";
import { S6Exploded } from "./slides/S6Exploded";
import { PULSE_LOOP, PULSE_LOOP_START, S7PulseCode } from "./slides/S7PulseCode";
import { S8TestPlan } from "./slides/S8TestPlan";

export type Slide = {
  id: string;
  title: string;
  component: React.FC<Controls>;
  /** frames; the interactive page plays the intro once, then loops from loopStart */
  duration: number;
  loopStart: number;
  notes: string;
};

// Ambient animation repeats every 60 frames, so loops of 120 are seamless.
export const SLIDES: Slide[] = [
  {
    id: "Title",
    title: "Neolithic Acoustic Signal Network",
    component: S1Title,
    duration: 300,
    loopStart: 180,
    notes:
      "A testable engineering hypothesis, not a claim: could clusters of Irish portal tombs sit in landscapes where simple long-distance acoustic signalling was physically possible? The strongest reading is a set of local acoustic cells, not one island-wide network.",
  },
  {
    id: "Inventory",
    title: "All-island portal tomb model",
    component: S2Inventory,
    duration: 360,
    loopStart: 240,
    notes:
      "“Dolmen” here means the archaeological class portal tomb. The working inventory has 207 grouped locations, 155 in the Republic and 52 in Northern Ireland. Seven counties hold 114 of them (55%), so the pattern is clustering, not an even spread.",
  },
  {
    id: "Signal",
    title: "Signalling principle",
    component: S3Signal,
    duration: 360,
    loopStart: 240,
    notes:
      "A horn or conch sends a 250–500 Hz carrier, easier to make loud than true infrasound. A passive collector, a horn in reverse, concentrates it into the portal and chamber, where a listener counts slow pulses. The goal is reliable detection, not intelligible speech.",
  },
  {
    id: "Range",
    title: "Range model",
    component: S4Range,
    duration: 360,
    loopStart: 240,
    notes:
      "Idealised spreading gives r = r₀·10^(G/20) from a 2.3 km reference. About +6 dB puts the longest hop, Slieve Gullion's 4.67 km, in range. Turn on air absorption to see how much of that gain it costs: the ideal curve is an upper bound.",
  },
  {
    id: "Clusters",
    title: "Cluster connectivity",
    component: S5Clusters,
    duration: 360,
    loopStart: 240,
    notes:
      "For each recognised cluster, the minimum spanning tree over its listed tombs gives the longest hop needed to keep it connected. Four of five connect with hops of 2.62 km or less; Slieve Gullion needs 4.67 km. Spacing alone does not show intent.",
  },
  {
    id: "Exploded",
    title: "Exploded model",
    component: S6Exploded,
    duration: 360,
    loopStart: 240,
    notes:
      "A conceptual receiving station: collector, portal aperture, portal stones, capstone, chamber, cairn and listener. Many tombs were originally covered by a cairn, so the bare dolmen seen today is not the acoustic reconstruction. None of this hardware has been shown to have existed.",
  },
  {
    id: "PulseCode",
    title: "Pulse code system",
    component: S7PulseCode,
    duration: PULSE_LOOP_START + PULSE_LOOP,
    loopStart: PULSE_LOOP_START,
    notes:
      "1–4 low pulses give the group, a pause, then 1–5 high pulses give the value: 20 states, each a pre-agreed command. Ogham is far later than the Neolithic; only its 4 × 5 structure is borrowed as a modern test code.",
  },
  {
    id: "TestPlan",
    title: "Test plan & conclusion",
    component: S8TestPlan,
    duration: 360,
    loopStart: 240,
    notes:
      "Terrain-aware GIS, field acoustics and a constrained random baseline, with explicit falsification criteria. Current verdict: physically plausible in local clusters, archaeologically unproven, experimentally testable.",
  },
];

export const TOTAL_FRAMES = SLIDES.reduce((s, x) => s + x.duration, 0);
