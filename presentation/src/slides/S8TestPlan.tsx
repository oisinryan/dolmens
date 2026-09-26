import React from "react";
import { useCurrentFrame } from "remotion";
import { C, MONO } from "../theme";
import { FadeUp, Label, Panel, SlideFrame, ease } from "../ui";

const COLUMNS = [
  {
    head: "01 · Terrain-aware GIS",
    items: ["NMS + NISMR coordinates on a digital elevation model", "Every pair: distance, bearing, line of sight, diffraction", "Predicted level at 250 / 300 / 400 / 500 Hz", "Portal orientation and chamber size where known"],
  },
  {
    head: "02 · Acoustic field tests",
    items: ["Reconstruct one horn and one 1 m-class collector", "Measure outside, portal and chamber levels together", "Frequency response, decay time, SNR, bearing", "Real hops of 1–6 km in real weather"],
  },
  {
    head: "03 · Null hypothesis",
    items: ["Spacing alone is not evidence", "Constrained Monte Carlo: elevation, geology, water, land", "Compare links, component size, path length, orientation", "A real signal must beat matched random layouts"],
  },
];

const FALSIFIERS = [
  "Clusters need implausibly high sound levels",
  "Portal orientations are unrelated to neighbours",
  "Chambers show no useful acoustic enhancement",
  "Random layouts connect as well or better",
  "Neolithic woodland destroys most links",
  "Receivers would need un-Neolithic size or materials",
];

const VERDICT = [
  ["Physically plausible", "in local clusters", C.cyan],
  ["Archaeologically unproven", "no evidence of intent", C.orange],
  ["Experimentally testable", "GIS, acoustics, field trials", C.amber],
] as const;

export const S8TestPlan: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SlideFrame n={8} kicker="Test plan & conclusion" title="How to prove it wrong" evidence={[]}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 240, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.05fr", gap: 22 }}>
        {COLUMNS.map((c, i) => (
          <FadeUp key={c.head} start={10 + i * 8}>
            <Panel style={{ height: 410, boxSizing: "border-box" }}>
              <Label color={C.cyan}>{c.head}</Label>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                {c.items.map((it) => (
                  <div key={it} style={{ fontSize: 21, lineHeight: 1.35, display: "flex", gap: 12 }}>
                    <span style={{ color: C.cyan }}>›</span>
                    {it}
                  </div>
                ))}
              </div>
            </Panel>
          </FadeUp>
        ))}
        <FadeUp start={34}>
          <Panel accent={`${C.red}88`} style={{ height: 410, boxSizing: "border-box", padding: "24px 26px" }}>
            <Label color={C.red}>Reject the idea if…</Label>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
              {FALSIFIERS.map((f, i) => (
                <div key={f} style={{ fontSize: 18.5, lineHeight: 1.28, display: "flex", gap: 12, opacity: ease(frame, 44 + i * 5, 14) }}>
                  <span style={{ fontFamily: MONO, color: C.red }}>{i + 1}</span>
                  {f}
                </div>
              ))}
            </div>
          </Panel>
        </FadeUp>
      </div>

      <FadeUp start={80} style={{ position: "absolute", left: 90, right: 90, top: 690 }}>
        <div style={{ fontSize: 34, fontWeight: 300, lineHeight: 1.35, maxWidth: 1500 }}>
          “Known Irish portal-tomb clusters include relay spacings that are physically compatible with powerful horn signalling, especially with passive collection at the receiver.
          <span style={{ color: C.dim }}> What has not been established is that the monuments were built for this.”</span>
        </div>
      </FadeUp>
      <div style={{ position: "absolute", left: 90, right: 90, top: 860, display: "flex", gap: 22 }}>
        {VERDICT.map(([k, sub, col], i) => (
          <FadeUp key={k} start={110 + i * 10} style={{ flex: 1 }}>
            <div style={{ borderLeft: `4px solid ${col}`, padding: "10px 22px", background: `${col}12` }}>
              <div style={{ fontSize: 30, color: col }}>{k}</div>
              <Label style={{ marginTop: 4 }}>{sub}</Label>
            </div>
          </FadeUp>
        ))}
      </div>
    </SlideFrame>
  );
};
