import React from "react";
import { useCurrentFrame } from "remotion";
import { C, SANS, SERIF } from "../theme";
import { Controls } from "../controls";
import { Box, Caption, EvidenceTag, FadeUp, Label, SlideFrame, ease } from "../ui";
import { TombDrawing, makeIso } from "../tomb";

const iso = makeIso(82, 620, 632);

const PARTS = [
  { n: 1, name: "Receiving horn / collector", text: "Perishable (wood, bark, hide) flare that concentrates incoming sound." },
  { n: 2, name: "Portal aperture", text: "The gap between the portal stones couples the collector to the chamber." },
  { n: 3, name: "Portal stones", text: "Define the entrance geometry and carry the capstone." },
  { n: 4, name: "Capstone", text: "Massive upper boundary of the chamber." },
  { n: 5, name: "Chamber", text: "Small enclosed volume, roughly 2 × 1.5 × 1.5 m." },
  { n: 6, name: "Cairn envelope", text: "Original stone/earth mound: mass, isolation, altered transmission." },
  { n: 7, name: "Listener / relay operator", text: "Sits at a high signal-to-noise position in or near the chamber." },
];

export const S6Exploded: React.FC<Controls> = ({ explode, showCairn }) => {
  const frame = useCurrentFrame();
  const build = ease(frame, 6, 40);
  const e = explode * ease(frame, 60, 70);
  const phase = (frame % 60) / 60;
  const [lx, ly] = iso([-6.6, 0.75, 0.95]);
  return (
    <SlideFrame n={6} kicker="Exploded model" title="A portal tomb as an acoustic receiving station" evidence={["HYPOTHETICAL"]}>
      <svg width={1300} height={840} style={{ position: "absolute", left: 20, top: 200, overflow: "visible" }} viewBox="0 200 1300 840">
        <TombDrawing
          iso={iso}
          e={e}
          phase={phase}
          build={build}
          showCairn={showCairn}
          badgeOpacity={(n) => ease(frame, 110 + n * 4, 16)}
          axisLabel={
            <text x={lx} y={ly - 16} fontFamily={SANS} fontWeight={600} fontSize={16} letterSpacing={2} fill={C.signal}>
              SOUND AXIS
            </text>
          }
        />
      </svg>

      <FadeUp start={40} style={{ position: "absolute", left: 90, top: 944, width: 1100 }}>
        <Caption n="Figure 6">Exploded axonometric of a portal tomb as a conceptual receiving station. Parts separate along the sound axis; the chamber volume is dashed.</Caption>
      </FadeUp>
      <div style={{ position: "absolute", right: 90, top: 230, width: 560, display: "flex", flexDirection: "column", gap: 14 }}>
        {PARTS.map((p, i) => (
          <FadeUp key={p.n} start={100 + i * 5} style={{ display: "flex", gap: 16, opacity: p.n === 6 && !showCairn ? 0.35 : undefined }}>
            <div style={{ fontFamily: SERIF, fontSize: 20, color: C.blue, border: `2px solid ${C.blue}`, borderRadius: 20, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {p.n}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 18, color: C.ink2, lineHeight: 1.35 }}>{p.text}</div>
            </div>
          </FadeUp>
        ))}
        <FadeUp start={150}>
          <Box fill={C.tint} accent={C.tint} style={{ marginTop: 8, padding: "18px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label>Chamber resonance</Label>
              <EvidenceTag kind="MODELLED" style={{ fontSize: 13, padding: "4px 10px" }} />
            </div>
            <div style={{ fontSize: 19, color: C.ink2, lineHeight: 1.45, marginTop: 10 }}>
              <span style={{ fontFamily: SERIF, fontStyle: "italic", color: C.ink }}>f = c / 2L</span> with L = 1.5–2.0 m gives first modes of <b style={{ color: C.ink }}>86–114 Hz</b>, below the
              250–500 Hz carrier. Any enhancement at the carrier has to be measured, not assumed.
            </div>
          </Box>
        </FadeUp>
      </div>
    </SlideFrame>
  );
};
