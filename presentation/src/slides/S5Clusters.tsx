import React from "react";
import { useCurrentFrame } from "remotion";
import { C, SANS, SERIF } from "../theme";
import { Site, clusterLinks } from "../data";
import { Controls, rangeKm } from "../controls";
import { Caption, FadeUp, Label, MONO, SlideFrame, ease, fmt } from "../ui";

const PW = 318;
const MAP = 280;
const PAD = 34;

/** local equirectangular fit of a cluster's nodes into a MAP × MAP box */
const fit = (nodes: Site[]) => {
  const lat0 = nodes.reduce((s, x) => s + x.at[0], 0) / nodes.length;
  const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const pts = nodes.map(({ at: [lat, lon] }) => [lon * kx, -lat * 110.57] as const);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const pxPerKm = (MAP - 2 * PAD) / span;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return { pxPerKm, xy: pts.map(([x, y]) => [MAP / 2 + (x - cx) * pxPerKm, MAP / 2 + (y - cy) * pxPerKm] as const) };
};

export const S5Clusters: React.FC<Controls> = ({ gainDb, refKm, absorption, cluster, gullionRelays }) => {
  const frame = useCurrentFrame();
  const range = rangeKm(gainDb, refKm, absorption);
  const phase = (frame % 60) / 60;
  const links = clusterLinks(gullionRelays);
  const connected = links.filter((c) => c.bottleneck <= range).length;
  return (
    <SlideFrame n={5} kicker="Cluster connectivity" title="The longest hop each cluster needs" evidence={["DOCUMENTED", "MODELLED"]}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 225, display: "flex", gap: 20 }}>
        {links.map((c, ci) => {
          const { pxPerKm, xy } = fit(c.nodes);
          const selected = c.id === cluster;
          const ok = c.bottleneck <= range;
          const need = 20 * Math.log10(c.bottleneck / refKm) + absorption * (c.bottleneck - refKm);
          const t = ease(frame, 20 + ci * 8, 30);
          const withRelays = gullionRelays && !!c.relays;
          return (
            <div
              key={c.id}
              style={{
                width: PW,
                opacity: t,
                transform: `translateY(${(1 - t) * 16}px)`,
                background: C.paper,
                border: selected ? `2px solid ${C.blue}` : `1px solid ${C.rule}`,
                padding: selected ? "17px 17px" : "18px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: SERIF, fontSize: 28 }}>{c.name}</span>
                <span style={{ fontFamily: SANS, fontSize: 15, color: C.ink2 }}>({String.fromCharCode(97 + ci)})</span>
              </div>
              <Label style={{ marginTop: 2, fontSize: 13 }}>
                Co. {c.county}
                {withRelays ? " · with relays" : ""}
              </Label>
              <svg width={MAP} height={MAP} style={{ marginTop: 10, overflow: "visible", background: C.tint }}>
                <defs>
                  <clipPath id={`clip-${c.id}`}>
                    <rect x={0} y={0} width={MAP} height={MAP} />
                  </clipPath>
                </defs>
                {selected &&
                  xy.map(([x, y], i) => (
                    <circle key={i} clipPath={`url(#clip-${c.id})`} cx={x} cy={y} r={range * pxPerKm * (0.97 + 0.03 * Math.sin(phase * Math.PI * 2))} fill={C.blue} fillOpacity={0.03} stroke={C.blue} strokeOpacity={0.3} strokeDasharray="3 5" />
                  ))}
                {c.edges.map((e, i) => {
                  const [x1, y1] = xy[e.a];
                  const [x2, y2] = xy[e.b];
                  const inRange = e.km <= range;
                  const d = ease(frame, 40 + ci * 8 + i * 6, 24);
                  return (
                    <g key={`${e.a}-${e.b}`}>
                      <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * d} y2={y1 + (y2 - y1) * d} stroke={inRange ? C.blue : C.signal} strokeWidth={2.5} strokeDasharray={inRange ? undefined : "7 5"} />
                      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 9} textAnchor="middle" fontFamily={MONO} fontSize={15} fill={inRange ? C.blue : C.signal} opacity={d} paintOrder="stroke" stroke={C.tint} strokeWidth={4}>
                        {fmt(e.km)}
                      </text>
                    </g>
                  );
                })}
                {c.nodes.map((n, i) => {
                  const [x, y] = xy[i];
                  return n.relay ? (
                    <g key={n.name}>
                      <rect x={x - 8} y={y - 8} width={16} height={16} transform={`rotate(45 ${x} ${y})`} fill={C.ochre} stroke={C.paper} strokeWidth={2} />
                      <text x={x} y={y + 26} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={14} fill={C.ochre} paintOrder="stroke" stroke={C.tint} strokeWidth={4}>
                        {n.name}
                      </text>
                    </g>
                  ) : (
                    <circle key={n.name} cx={x} cy={y} r={7} fill={C.ink} stroke={C.paper} strokeWidth={2} />
                  );
                })}
                <line x1={10} y1={MAP - 10} x2={10 + pxPerKm} y2={MAP - 10} stroke={C.ink} strokeWidth={2} />
                <text x={10} y={MAP - 16} fontFamily={SANS} fontSize={13} fill={C.ink2}>
                  1 km
                </text>
              </svg>
              <div style={{ marginTop: 16 }}>
                <Label style={{ fontSize: 13 }}>Longest required hop</Label>
                <div style={{ fontFamily: SERIF, fontSize: 46, color: ok ? C.ink : C.signal, fontVariantNumeric: "tabular-nums lining-nums" }}>
                  {fmt(c.bottleneck, 3)}
                  <span style={{ fontSize: 22, color: C.ink2 }}> km</span>
                </div>
                <div style={{ fontSize: 17, color: C.ink2, marginTop: 2 }}>{need <= 0 ? "In range with no receiver gain" : `Needs +${fmt(need, 1)} dB receiver gain`}</div>
              </div>
            </div>
          );
        })}
      </div>
      <FadeUp start={90} style={{ position: "absolute", left: 90, right: 90, top: 832 }}>
        <div style={{ fontSize: 25 }}>
          At +{fmt(gainDb, 1)} dB (range {fmt(range)} km), <b style={{ color: connected === links.length ? C.blue : C.signal }}>{connected} of 5 clusters connect</b>.
        </div>
        <Caption n="Figure 5" style={{ marginTop: 10, maxWidth: 1600 }}>
          Minimum-spanning-tree links between each cluster's listed tombs (●), in <span style={{ color: C.blue }}>range</span> or <span style={{ color: C.signal }}>out of range</span> at the
          current gain.{" "}
          {gullionRelays
            ? "Slieve Gullion adds two surviving non-portal-tomb monuments as relays (◆): the Neolithic passage tomb on the summit and the Long Stone (NI SMR ARM028:007, ARM028:001)."
            : "Slieve Gullion's 4.67 km hop crosses the mountain's summit; turn on its relays to route it through the summit cairn and the Long Stone."}{" "}
          Spacing alone does not show intent.
        </Caption>
      </FadeUp>
    </SlideFrame>
  );
};
