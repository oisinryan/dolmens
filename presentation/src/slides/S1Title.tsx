import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, H, MONO, W } from "../theme";
import { CLUSTERS, COUNTIES, clusterCentre } from "../data";
import { project } from "../geo";
import { EvidenceTag, FadeUp, IrelandMap, Label, Rings, ease } from "../ui";

/** label placement per cluster, in map pixels relative to the node */
const LABEL: Record<string, [number, number, "start" | "end"]> = {
  ballyvennaght: [-18, -16, "end"],
  "malin-more": [18, -14, "start"],
  burren: [-16, -18, "end"],
  easkey: [-16, 30, "end"],
  "slieve-gullion": [18, 32, "start"],
};

const POINTS = [
  ["Hypothesis", "Clusters of Irish portal tombs may sit in landscapes where simple long-distance acoustic signalling was physically possible."],
  ["Carrier", "Horn transmitters at 250–500 Hz, passive listening collectors, resonant stone chambers and a human relay."],
  ["Test", "Site spacing, terrain-aware acoustic modelling, constrained random baselines and field trials."],
] as const;

export const S1Title: React.FC = () => {
  const frame = useCurrentFrame();
  const map = ease(frame, 10, 50);
  const phase = (frame % 60) / 60;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT, color: C.text, overflow: "hidden" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="g1" width={60} height={60} patternUnits="userSpaceOnUse">
            <path d="M60 0H0V60" fill="none" stroke={C.grid} strokeWidth={1} />
          </pattern>
          <radialGradient id="v1" cx="68%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0e2127" />
            <stop offset="100%" stopColor={C.bg} />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#v1)" />
        <rect width={W} height={H} fill="url(#g1)" />
      </svg>

      <div style={{ position: "absolute", right: 150, top: 70, opacity: map }}>
        <IrelandMap width={720} reveal={map}>
          {COUNTIES.map((c) => {
            const [x, y] = project(c.at);
            return <circle key={c.name} cx={x} cy={y} r={2.2 * Math.sqrt(c.n) * map} fill={C.teal} opacity={0.35} />;
          })}
          {CLUSTERS.map((c, i) => {
            const [x, y] = project(clusterCentre(c));
            const t = ease(frame, 50 + i * 10, 20);
            return (
              <g key={c.id} opacity={t}>
                <Rings x={x} y={y} phase={(phase + i * 0.2) % 1} r={70} color={C.orange} />
                <circle cx={x} cy={y} r={9} fill={C.orange} filter="url(#glow)" />
                <text x={x + LABEL[c.id][0]} y={y + LABEL[c.id][1]} textAnchor={LABEL[c.id][2]} fill={C.text} fontFamily={MONO} fontSize={19} letterSpacing={1.5}>
                  {c.name.toUpperCase()}
                </text>
              </g>
            );
          })}
        </IrelandMap>
      </div>

      <div style={{ position: "absolute", left: 110, top: 120, width: 860 }}>
        <FadeUp start={0} dy={10}>
          <Label color={C.cyan} style={{ letterSpacing: 6, fontSize: 20 }}>
            Concept presentation · island of Ireland
          </Label>
        </FadeUp>
        <FadeUp start={8}>
          <div style={{ fontSize: 96, fontWeight: 300, lineHeight: 1.0, letterSpacing: -2, marginTop: 26 }}>
            Neolithic Acoustic
            <br />
            <span style={{ color: C.orange }}>Signal Network</span>
          </div>
        </FadeUp>
        <FadeUp start={20}>
          <div style={{ fontSize: 30, color: C.dim, marginTop: 26, lineHeight: 1.35, fontWeight: 300 }}>
            Portal tombs, horn transmitters and passive listening: a testable engineering hypothesis.
          </div>
        </FadeUp>
        <div style={{ marginTop: 46, display: "flex", flexDirection: "column", gap: 24 }}>
          {POINTS.map(([k, v], i) => (
            <FadeUp key={k} start={40 + i * 12}>
              <div style={{ display: "flex", gap: 26, alignItems: "flex-start" }}>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    color: C.orange,
                    border: `1.5px solid ${C.orange}`,
                    borderRadius: 30,
                    width: 50,
                    height: 50,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  0{i + 1}
                </div>
                <div style={{ fontSize: 24, lineHeight: 1.4, color: C.text }}>
                  <span style={{ color: C.orange }}>{k}: </span>
                  {v}
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>

      <FadeUp start={90} style={{ position: "absolute", left: 110, bottom: 60, display: "flex", gap: 16, alignItems: "center" }}>
        <EvidenceTag kind="HYPOTHETICAL" />
        <span style={{ fontFamily: MONO, fontSize: 17, letterSpacing: 2, color: C.faint }}>NOT A CLAIM THAT PORTAL TOMBS WERE COMMUNICATIONS STATIONS</span>
      </FadeUp>
    </AbsoluteFill>
  );
};
