import React from "react";
import { useCurrentFrame } from "remotion";
import { C, MONO } from "../theme";
import { CLUSTER_LINKS } from "../data";
import { Controls, rangeKm } from "../controls";
import { FadeUp, Label, Panel, SlideFrame, ease, fmt } from "../ui";

const CW = 900;
const CH = 600;
const MAX_G = 12;
const MAX_KM = 10;
const gx = (g: number) => (g / MAX_G) * CW;
const ky = (km: number) => CH - (Math.min(km, MAX_KM) / MAX_KM) * CH;

const curve = (refKm: number, absorption: number, upTo: number) =>
  Array.from({ length: 121 }, (_, i) => {
    const g = (i / 120) * MAX_G * upTo;
    return `${i ? "L" : "M"}${gx(g).toFixed(1)} ${ky(rangeKm(g, refKm, absorption)).toFixed(1)}`;
  }).join(" ");

export const S4Range: React.FC<Controls> = ({ gainDb, refKm, absorption }) => {
  const frame = useCurrentFrame();
  const draw = ease(frame, 20, 60);
  const marker = ease(frame, 80, 30);
  const range = rangeKm(gainDb, refKm, absorption);
  const connected = CLUSTER_LINKS.filter((c) => c.bottleneck <= range);
  const hardest = CLUSTER_LINKS[CLUSTER_LINKS.length - 1];
  const needed = 20 * Math.log10(hardest.bottleneck / refKm);
  return (
    <SlideFrame n={4} kicker="Range model" title="Receiver gain buys distance" evidence={["MODELLED"]}>
      <div style={{ position: "absolute", left: 150, top: 250 }}>
        <svg width={CW + 260} height={CH + 90} style={{ overflow: "visible" }}>
          {/* axes and grid */}
          {[0, 3, 6, 9, 12].map((g) => (
            <g key={g}>
              <line x1={gx(g)} y1={0} x2={gx(g)} y2={CH} stroke={C.line} strokeWidth={1} />
              <text x={gx(g)} y={CH + 36} textAnchor="middle" fontFamily={MONO} fontSize={20} fill={C.dim}>
                +{g} dB
              </text>
            </g>
          ))}
          {[0, 2, 4, 6, 8, 10].map((k) => (
            <g key={k}>
              <line x1={0} y1={ky(k)} x2={CW} y2={ky(k)} stroke={C.line} strokeWidth={1} />
              <text x={-18} y={ky(k) + 7} textAnchor="end" fontFamily={MONO} fontSize={20} fill={C.dim}>
                {k} km
              </text>
            </g>
          ))}
          <text x={CW / 2} y={CH + 78} textAnchor="middle" fontFamily={MONO} fontSize={17} letterSpacing={3} fill={C.faint}>
            PASSIVE RECEIVER GAIN
          </text>

          {/* cluster hop thresholds */}
          {CLUSTER_LINKS.map((c, i) => {
            const ok = c.bottleneck <= range;
            const t = ease(frame, 40 + i * 6, 20);
            return (
              <g key={c.id} opacity={t}>
                <line x1={0} y1={ky(c.bottleneck)} x2={CW} y2={ky(c.bottleneck)} stroke={ok ? C.cyan : C.orange} strokeWidth={1.5} strokeDasharray="8 7" />
                <text x={CW + 16} y={ky(c.bottleneck) + (i === 1 ? 20 : i === 0 ? -6 : 7)} fontFamily={MONO} fontSize={18} fill={ok ? C.cyan : C.orange}>
                  {c.name} {fmt(c.bottleneck)} km
                </text>
              </g>
            );
          })}

          {/* idealised curve, then the curve with absorption */}
          <path d={curve(refKm, 0, draw)} fill="none" stroke={absorption > 0 ? C.faint : C.amber} strokeWidth={absorption > 0 ? 2.5 : 4} strokeDasharray={absorption > 0 ? "4 6" : undefined} />
          {absorption > 0 && <path d={curve(refKm, absorption, draw)} fill="none" stroke={C.amber} strokeWidth={4} />}

          {/* current gain */}
          <g opacity={marker}>
            <line x1={gx(gainDb)} y1={0} x2={gx(gainDb)} y2={CH} stroke={C.text} strokeWidth={1.5} />
            <circle cx={gx(gainDb)} cy={ky(range)} r={10} fill={C.amber} stroke={C.bg} strokeWidth={3} />
          </g>
        </svg>
      </div>

      <div style={{ position: "absolute", right: 90, top: 250, width: 420, display: "flex", flexDirection: "column", gap: 20 }}>
        <FadeUp start={80}>
          <Panel accent={C.amber}>
            <Label color={C.amber}>At +{fmt(gainDb, 1)} dB receiver gain</Label>
            <div style={{ fontSize: 88, fontWeight: 300, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
              {fmt(range)}
              <span style={{ fontSize: 36, color: C.dim }}> km</span>
            </div>
            <div style={{ fontSize: 24, marginTop: 6 }}>
              <span style={{ color: connected.length === 5 ? C.cyan : C.orange }}>{connected.length} of 5</span> clusters stay connected
            </div>
          </Panel>
        </FadeUp>
        <FadeUp start={92}>
          <div style={{ fontSize: 20, color: C.dim, lineHeight: 1.5 }}>
            <div style={{ fontFamily: MONO, color: C.text, fontSize: 21, marginBottom: 8 }}>r = r₀ · 10^(G/20){absorption > 0 ? ` − α·Δr` : ""}</div>
            r₀ = {fmt(refKm, 1)} km with no receiver gain. Slieve Gullion's {fmt(hardest.bottleneck)} km hop needs about{" "}
            <span style={{ color: C.amber }}>+{fmt(needed, 1)} dB</span> on distance alone.
          </div>
        </FadeUp>
        <FadeUp start={104}>
          <div style={{ fontSize: 19, color: C.faint, lineHeight: 1.5 }}>
            {absorption > 0
              ? `Air absorption of ${fmt(absorption, 2)} dB/km included: the dashed line is the idealised model.`
              : "Idealised spreading only. Air at 250–500 Hz absorbs roughly 1–3 dB/km, and terrain, wind and ground effects cut range further: treat the curve as an upper bound."}
          </div>
        </FadeUp>
      </div>
    </SlideFrame>
  );
};
