import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, SANS, SERIF } from "../theme";
import { CLUSTERS, COUNTIES, clusterCentre } from "../data";
import { project } from "../geo";
import { Caption, EvidenceTag, FadeUp, IrelandMap, Label, Rings, ease } from "../ui";

/** label placement per cluster, in map pixels relative to the node */
const LABEL: Record<string, [number, number, "start" | "end"]> = {
  ballyvennaght: [-16, -14, "end"],
  "malin-more": [16, -12, "start"],
  burren: [-14, -16, "end"],
  easkey: [-14, 28, "end"],
  "slieve-gullion": [16, 30, "start"],
};

const POINTS = [
  ["Hypothesis", "Clusters of Irish portal tombs may sit in landscapes where simple long-distance acoustic signalling was physically possible."],
  ["Carrier", "Horn transmitters at 250–500 Hz, passive listening collectors, resonant stone chambers and a human relay."],
  ["Method", "Site spacing, terrain-aware acoustic modelling, constrained random baselines and field trials."],
] as const;

export const S1Title: React.FC = () => {
  const frame = useCurrentFrame();
  const map = ease(frame, 10, 50);
  const phase = (frame % 60) / 60;
  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: SANS, color: C.ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 18, background: C.blue }} />

      <div style={{ position: "absolute", left: 120, top: 96, width: 900 }}>
        <FadeUp start={0} dy={6}>
          <Label color={C.blue} style={{ letterSpacing: 3 }}>
            White paper · Island of Ireland · September 2026
          </Label>
        </FadeUp>
        <div style={{ height: 1.5, background: C.ink, marginTop: 20, transformOrigin: "left", transform: `scaleX(${ease(frame, 4, 40)})` }} />
        <FadeUp start={8}>
          <div style={{ fontFamily: SERIF, fontSize: 92, lineHeight: 1.04, letterSpacing: -1.5, marginTop: 36 }}>Neolithic Acoustic Signal Network</div>
        </FadeUp>
        <FadeUp start={18}>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 34, color: C.ink2, marginTop: 22, lineHeight: 1.3 }}>
            Portal tombs, horn signalling and passive listening: a testable engineering hypothesis
          </div>
        </FadeUp>

        <FadeUp start={34} style={{ marginTop: 56 }}>
          <Label>Abstract</Label>
          <div style={{ fontSize: 23, lineHeight: 1.55, color: C.ink, marginTop: 10, maxWidth: 860 }}>
            Could clusters of Irish portal tombs have supported a simple relay of horn signals? This paper sets out the physics, the site spacing and the tests that would prove it wrong. It does not
            claim that the monuments were built for communication.
          </div>
        </FadeUp>
        <div style={{ marginTop: 34, display: "grid", gridTemplateColumns: "150px 1fr", rowGap: 16, columnGap: 22, maxWidth: 860 }}>
          {POINTS.map(([k, v], i) => (
            <React.Fragment key={k}>
              <FadeUp start={48 + i * 8}>
                <Label color={C.blue} style={{ paddingTop: 4 }}>
                  {k}
                </Label>
              </FadeUp>
              <FadeUp start={48 + i * 8}>
                <div style={{ fontSize: 21, lineHeight: 1.45, color: C.ink2 }}>{v}</div>
              </FadeUp>
            </React.Fragment>
          ))}
        </div>
      </div>

      <FadeUp start={20} style={{ position: "absolute", right: 110, top: 96, width: 640 }}>
        <div style={{ border: `1.5px solid ${C.rule}`, padding: "18px 18px 10px", background: C.paper }}>
          <IrelandMap width={600} reveal={map}>
            {COUNTIES.map((c) => {
              const [x, y] = project(c.at);
              return <circle key={c.name} cx={x} cy={y} r={2 * Math.sqrt(c.n) * map} fill={C.faint} opacity={0.35} />;
            })}
            {CLUSTERS.map((c, i) => {
              const [x, y] = project(clusterCentre(c));
              const t = ease(frame, 50 + i * 8, 20);
              return (
                <g key={c.id} opacity={t}>
                  <Rings x={x} y={y} phase={(phase + i * 0.2) % 1} r={46} color={C.signal} />
                  <circle cx={x} cy={y} r={8} fill={C.blue} stroke={C.paper} strokeWidth={2.5} />
                  <text x={x + LABEL[c.id][0]} y={y + LABEL[c.id][1]} textAnchor={LABEL[c.id][2]} fill={C.ink} fontFamily={SANS} fontWeight={600} fontSize={19}>
                    {c.name}
                  </text>
                </g>
              );
            })}
          </IrelandMap>
        </div>
        <Caption n="Figure 1" style={{ marginTop: 12 }}>
          The five portal-tomb clusters studied, over county totals of the 207-location working inventory (grey).
        </Caption>
      </FadeUp>

      <div style={{ position: "absolute", left: 120, right: 110, bottom: 40, borderTop: `1px solid ${C.rule}`, paddingTop: 14, display: "flex", gap: 18, alignItems: "center" }}>
        <EvidenceTag kind="HYPOTHETICAL" />
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: C.ink2 }}>Status: speculative research concept. Archaeologically unproven; experimentally testable.</span>
      </div>
    </AbsoluteFill>
  );
};
