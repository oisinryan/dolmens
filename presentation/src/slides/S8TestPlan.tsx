import React from "react";
import { useCurrentFrame } from "remotion";
import { C, SERIF } from "../theme";
import { Box, FadeUp, Label, SlideFrame, ease } from "../ui";

const COLUMNS = [
  {
    head: "Terrain-aware GIS",
    items: ["NMS and NISMR coordinates on a digital elevation model", "Every pair: distance, bearing, line of sight, diffraction", "Predicted level at 250, 300, 400 and 500 Hz", "Portal orientation and chamber size where known"],
  },
  {
    head: "Acoustic field tests",
    items: ["Reconstruct one horn and one 1 m-class collector", "Measure outside, portal and chamber levels together", "Frequency response, decay time, SNR, bearing", "Real hops of 1–6 km in real weather"],
  },
  {
    head: "Null hypothesis",
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
  ["Physically plausible", "in local clusters", C.blue],
  ["Archaeologically unproven", "no evidence of intent", C.signal],
  ["Experimentally testable", "GIS, acoustics, field trials", C.ochre],
] as const;

export const S8TestPlan: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SlideFrame n={8} kicker="Test plan and conclusion" title="How to prove it wrong" evidence={[]}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 225, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.08fr", gap: 30 }}>
        {COLUMNS.map((c, i) => (
          <FadeUp key={c.head} start={10 + i * 8}>
            <div style={{ borderTop: `2px solid ${C.ink}`, paddingTop: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <span style={{ fontFamily: SERIF, fontSize: 30, color: C.blue }}>8.{i + 1}</span>
                <span style={{ fontFamily: SERIF, fontSize: 28 }}>{c.head}</span>
              </div>
              <ul style={{ margin: "16px 0 0", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 10 }}>
                {c.items.map((it) => (
                  <li key={it} style={{ fontSize: 20, lineHeight: 1.4, color: C.ink }}>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
        ))}
        <FadeUp start={34}>
          <Box accent={C.signal} fill={C.signalTint} style={{ padding: "18px 22px" }}>
            <Label color={C.signal}>Reject the idea if…</Label>
            <ol style={{ margin: "12px 0 0", paddingLeft: 24, display: "flex", flexDirection: "column", gap: 7 }}>
              {FALSIFIERS.map((f, i) => (
                <li key={f} style={{ fontSize: 18.5, lineHeight: 1.3, opacity: ease(frame, 44 + i * 5, 14) }}>
                  {f}
                </li>
              ))}
            </ol>
          </Box>
        </FadeUp>
      </div>

      <FadeUp start={80} style={{ position: "absolute", left: 90, right: 90, top: 670, borderLeft: `4px solid ${C.blue}`, paddingLeft: 30 }}>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 32, lineHeight: 1.4, maxWidth: 1560 }}>
          “Known Irish portal-tomb clusters include relay spacings that are physically compatible with powerful horn signalling, especially with passive collection at the receiver.{" "}
          <span style={{ color: C.ink2 }}>What has not been established is that the monuments were built for this.”</span>
        </div>
      </FadeUp>
      <div style={{ position: "absolute", left: 90, right: 90, top: 862, display: "flex", borderTop: `1.5px solid ${C.ink}`, borderBottom: `1.5px solid ${C.ink}` }}>
        {VERDICT.map(([k, sub, col], i) => (
          <FadeUp key={k} start={110 + i * 10} style={{ flex: 1, padding: "14px 22px", borderLeft: i ? `1px solid ${C.rule}` : undefined }}>
            <div style={{ fontFamily: SERIF, fontSize: 30, color: col }}>{k}</div>
            <Label style={{ marginTop: 2 }}>{sub}</Label>
          </FadeUp>
        ))}
      </div>
    </SlideFrame>
  );
};
