import React from "react";
import { useCurrentFrame } from "remotion";
import { C, SANS, SERIF } from "../theme";
import { clusterLinks } from "../data";
import { Controls, rangeKm } from "../controls";
import { Box, Caption, FadeUp, Label, MONO, SlideFrame, ease, fmt } from "../ui";

const CW = 900;
const CH = 560;
const MAX_G = 12;
const MAX_KM = 10;
const gx = (g: number) => (g / MAX_G) * CW;
const ky = (km: number) => CH - (Math.min(km, MAX_KM) / MAX_KM) * CH;

const curve = (refKm: number, absorption: number, upTo: number) =>
  Array.from({ length: 121 }, (_, i) => {
    const g = (i / 120) * MAX_G * upTo;
    return `${i ? "L" : "M"}${gx(g).toFixed(1)} ${ky(rangeKm(g, refKm, absorption)).toFixed(1)}`;
  }).join(" ");

export const S4Range: React.FC<Controls> = ({ gainDb, refKm, absorption, gullionRelays }) => {
  const frame = useCurrentFrame();
  const draw = ease(frame, 20, 60);
  const marker = ease(frame, 80, 30);
  const links = clusterLinks(gullionRelays);
  const range = rangeKm(gainDb, refKm, absorption);
  const connected = links.filter((c) => c.bottleneck <= range);
  const hardest = [...links].sort((a, b) => b.bottleneck - a.bottleneck)[0];
  const needed = 20 * Math.log10(hardest.bottleneck / refKm) + absorption * (hardest.bottleneck - refKm);
  // spread labels that would collide
  const sorted = [...links].sort((a, b) => a.bottleneck - b.bottleneck);
  const labelY: Record<string, number> = {};
  let last = Infinity;
  for (const c of sorted) {
    const y = Math.min(ky(c.bottleneck) + 6, last - 24);
    labelY[c.id] = y;
    last = y;
  }
  return (
    <SlideFrame n={4} kicker="Range model" title="Receiver gain buys distance" evidence={["MODELLED"]}>
      <div style={{ position: "absolute", left: 170, top: 250 }}>
        <svg width={CW + 280} height={CH + 90} style={{ overflow: "visible" }}>
          {[0, 3, 6, 9, 12].map((g) => (
            <g key={g}>
              <line x1={gx(g)} y1={0} x2={gx(g)} y2={CH} stroke={C.grid} strokeWidth={1} />
              <text x={gx(g)} y={CH + 32} textAnchor="middle" fontFamily={SANS} fontSize={19} fill={C.ink2}>
                +{g}
              </text>
            </g>
          ))}
          {[0, 2, 4, 6, 8, 10].map((k) => (
            <g key={k}>
              <line x1={0} y1={ky(k)} x2={CW} y2={ky(k)} stroke={C.grid} strokeWidth={1} />
              <text x={-14} y={ky(k) + 6} textAnchor="end" fontFamily={SANS} fontSize={19} fill={C.ink2}>
                {k}
              </text>
            </g>
          ))}
          <line x1={0} y1={CH} x2={CW} y2={CH} stroke={C.ink} strokeWidth={1.5} />
          <line x1={0} y1={0} x2={0} y2={CH} stroke={C.ink} strokeWidth={1.5} />
          <text x={CW / 2} y={CH + 70} textAnchor="middle" fontFamily={SANS} fontSize={18} fill={C.ink}>
            Passive receiver gain, dB
          </text>
          <text x={-58} y={CH / 2} textAnchor="middle" fontFamily={SANS} fontSize={18} fill={C.ink} transform={`rotate(-90 -58 ${CH / 2})`}>
            Viable relay distance, km
          </text>

          {links.map((c, i) => {
            const ok = c.bottleneck <= range;
            const t = ease(frame, 40 + i * 6, 20);
            const col = ok ? C.blue : C.signal;
            return (
              <g key={c.id} opacity={t}>
                <line x1={0} y1={ky(c.bottleneck)} x2={CW} y2={ky(c.bottleneck)} stroke={col} strokeWidth={1.5} strokeDasharray="7 6" />
                <text x={CW + 14} y={labelY[c.id]} fontFamily={SANS} fontSize={18} fill={col}>
                  {c.name}
                  {c.relays && gullionRelays ? " (relays)" : ""} <tspan fontFamily={MONO}>{fmt(c.bottleneck)}</tspan>
                </text>
              </g>
            );
          })}

          <path d={curve(refKm, 0, draw)} fill="none" stroke={absorption > 0 ? C.faint : C.ink} strokeWidth={absorption > 0 ? 2 : 3} strokeDasharray={absorption > 0 ? "3 6" : undefined} />
          {absorption > 0 && <path d={curve(refKm, absorption, draw)} fill="none" stroke={C.ink} strokeWidth={3} />}

          <g opacity={marker}>
            <line x1={gx(gainDb)} y1={ky(range)} x2={gx(gainDb)} y2={CH} stroke={C.ink2} strokeWidth={1} strokeDasharray="2 4" />
            <line x1={0} y1={ky(range)} x2={gx(gainDb)} y2={ky(range)} stroke={C.ink2} strokeWidth={1} strokeDasharray="2 4" />
            <circle cx={gx(gainDb)} cy={ky(range)} r={8} fill={C.paper} stroke={C.ink} strokeWidth={2.5} />
          </g>
        </svg>
        <FadeUp start={60} style={{ width: CW + 120, marginTop: 6 }}>
          <Caption n="Figure 4">
            Idealised relay range against receiver gain{absorption > 0 ? `, with ${fmt(absorption, 2)} dB/km air absorption (dotted: without)` : ""}. Dashed lines are each cluster's longest
            required hop: <span style={{ color: C.blue }}>in range</span> or <span style={{ color: C.signal }}>out of range</span>.
          </Caption>
        </FadeUp>
      </div>

      <div style={{ position: "absolute", right: 90, top: 250, width: 410, display: "flex", flexDirection: "column", gap: 22 }}>
        <FadeUp start={80}>
          <Box fill={C.tint} accent={C.tint}>
            <Label>At +{fmt(gainDb, 1)} dB receiver gain</Label>
            <div style={{ fontFamily: SERIF, fontSize: 80, marginTop: 6, fontVariantNumeric: "tabular-nums lining-nums" }}>
              {fmt(range)}
              <span style={{ fontSize: 32, color: C.ink2 }}> km</span>
            </div>
            <div style={{ fontSize: 22, marginTop: 4 }}>
              <b style={{ color: connected.length === links.length ? C.blue : C.signal }}>
                {connected.length} of {links.length}
              </b>{" "}
              clusters stay connected
            </div>
          </Box>
        </FadeUp>
        <FadeUp start={92}>
          <div style={{ fontSize: 20, color: C.ink2, lineHeight: 1.5 }}>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", color: C.ink, fontSize: 24, marginBottom: 8 }}>
              r = r<sub>0</sub> · 10<sup>G/20</sup>
            </div>
            With r<sub>0</sub> = {fmt(refKm, 1)} km at no gain, the longest hop ({hardest.name}, {fmt(hardest.bottleneck)} km) needs{" "}
            <b style={{ color: C.ink }}>{needed <= 0 ? "no gain" : `+${fmt(needed, 1)} dB`}</b>.
          </div>
        </FadeUp>
        <FadeUp start={104}>
          <div style={{ fontSize: 18, color: C.ink2, lineHeight: 1.5, borderLeft: `3px solid ${C.ochre}`, paddingLeft: 16 }}>
            {absorption > 0
              ? "The dotted curve is the idealised model; the solid one includes air absorption."
              : "Spherical spreading only. Air at 250–500 Hz absorbs roughly 1–3 dB/km, and terrain, wind and ground cut range further, so read the curve as an upper bound."}
          </div>
        </FadeUp>
      </div>
    </SlideFrame>
  );
};
