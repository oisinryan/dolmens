import React from "react";
import { useCurrentFrame } from "remotion";
import { C, MONO } from "../theme";
import { CLUSTER_LINKS } from "../data";
import { Controls, rangeKm } from "../controls";
import { FadeUp, Label, SlideFrame, ease, fmt } from "../ui";

const PW = 318;
const MAP = 280;
const PAD = 34;

/** local equirectangular fit of a cluster's sites into a MAP × MAP box */
const fit = (sites: { at: readonly [number, number] }[]) => {
  const lat0 = sites.reduce((s, x) => s + x.at[0], 0) / sites.length;
  const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const pts = sites.map(({ at: [lat, lon] }) => [lon * kx, -lat * 110.57] as const);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const pxPerKm = (MAP - 2 * PAD) / span;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return { pxPerKm, xy: pts.map(([x, y]) => [MAP / 2 + (x - cx) * pxPerKm, MAP / 2 + (y - cy) * pxPerKm] as const) };
};

export const S5Clusters: React.FC<Controls> = ({ gainDb, refKm, absorption, cluster }) => {
  const frame = useCurrentFrame();
  const range = rangeKm(gainDb, refKm, absorption);
  const phase = (frame % 60) / 60;
  const connected = CLUSTER_LINKS.filter((c) => c.bottleneck <= range).length;
  return (
    <SlideFrame n={5} kicker="Cluster connectivity" title="The longest hop each cluster needs" evidence={["DOCUMENTED", "MODELLED"]}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 250, display: "flex", gap: 20 }}>
        {CLUSTER_LINKS.map((c, ci) => {
          const { pxPerKm, xy } = fit(c.sites);
          const selected = c.id === cluster;
          const ok = c.bottleneck <= range;
          const need = 20 * Math.log10(c.bottleneck / refKm) + absorption * (c.bottleneck - refKm);
          const t = ease(frame, 20 + ci * 8, 30);
          return (
            <div
              key={c.id}
              style={{
                width: PW,
                opacity: t * (selected ? 1 : 0.82),
                transform: `translateY(${(1 - t) * 30}px)`,
                background: C.panel,
                border: `1.5px solid ${selected ? C.amber : C.line}`,
                borderRadius: 6,
                padding: "20px 18px",
                boxShadow: selected ? `0 0 40px ${C.amber}22` : undefined,
              }}
            >
              <div style={{ fontSize: 30 }}>{c.name}</div>
              <Label style={{ marginTop: 2 }}>Co. {c.county}</Label>
              <svg width={MAP} height={MAP} style={{ marginTop: 10, overflow: "visible" }}>
                <defs>
                  <clipPath id={`clip-${c.id}`}>
                    <rect x={-10} y={-10} width={MAP + 20} height={MAP + 20} />
                  </clipPath>
                </defs>
                {selected &&
                  xy.map(([x, y], i) => (
                    <circle key={i} clipPath={`url(#clip-${c.id})`} cx={x} cy={y} r={range * pxPerKm * (0.97 + 0.03 * Math.sin(phase * Math.PI * 2))} fill={C.amber} fillOpacity={0.035} stroke={C.amber} strokeOpacity={0.25} />
                  ))}
                {c.edges.map((e, i) => {
                  const [x1, y1] = xy[e.a];
                  const [x2, y2] = xy[e.b];
                  const inRange = e.km <= range;
                  const d = ease(frame, 40 + ci * 8 + i * 6, 24);
                  return (
                    <g key={i}>
                      <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * d} y2={y1 + (y2 - y1) * d} stroke={inRange ? C.cyan : C.orange} strokeWidth={3} strokeDasharray={inRange ? undefined : "8 6"} />
                      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 10} textAnchor="middle" fontFamily={MONO} fontSize={17} fill={inRange ? C.cyan : C.orange} opacity={d}>
                        {fmt(e.km)}
                      </text>
                    </g>
                  );
                })}
                {xy.map(([x, y], i) => (
                  <g key={i}>
                    <circle cx={x} cy={y} r={8} fill={C.text} />
                    <circle cx={x} cy={y} r={14} fill="none" stroke={C.text} strokeOpacity={0.3} />
                  </g>
                ))}
                {/* 1 km scale bar */}
                <line x1={10} y1={MAP - 4} x2={10 + pxPerKm}y2={MAP - 4} stroke={C.dim} strokeWidth={2} />
                <text x={10} y={MAP + 18} fontFamily={MONO} fontSize={14} fill={C.dim}>
                  1 km
                </text>
              </svg>
              <div style={{ marginTop: 26, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
                <Label style={{ fontSize: 14 }}>Longest required hop</Label>
                <div style={{ fontSize: 50, fontWeight: 300, color: ok ? C.cyan : C.orange, fontVariantNumeric: "tabular-nums" }}>
                  {fmt(c.bottleneck, 3)}
                  <span style={{ fontSize: 22, color: C.dim }}> km</span>
                </div>
                <div style={{ fontSize: 18, color: C.dim, marginTop: 4 }}>
                  {need <= 0 ? "Within range with no receiver gain" : `Needs +${fmt(need, 1)} dB receiver gain`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <FadeUp start={100} style={{ position: "absolute", left: 90, right: 90, bottom: 100, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 28 }}>
          With +{fmt(gainDb, 1)} dB at the receiver (range {fmt(range)} km):{" "}
          <span style={{ color: connected === 5 ? C.cyan : C.orange }}>{connected} of 5 clusters connect</span>.
        </div>
        <div style={{ fontSize: 19, color: C.faint, maxWidth: 640, textAlign: "right" }}>
          Hops are minimum-spanning-tree links between listed site coordinates. Spacing alone does not show intentional use, and published landscape work finds tombs within these clusters are usually not intervisible.
        </div>
      </FadeUp>
    </SlideFrame>
  );
};
