import React from "react";
import { useCurrentFrame } from "remotion";
import { C, SANS, SERIF } from "../theme";
import { CLUSTERS, COUNTIES, NI_TOTAL, TOP7, TOP7_TOTAL, TOTAL, clusterCentre } from "../data";
import { project } from "../geo";
import { Caption, FadeUp, IrelandMap, Label, MONO, SlideFrame, ease } from "../ui";

const Stat: React.FC<{ n: number; label: string; color: string; t: number }> = ({ n, label, color, t }) => (
  <div style={{ borderTop: `3px solid ${color}`, paddingTop: 12, flex: 1 }}>
    <div style={{ fontFamily: SERIF, fontSize: 76, color: C.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums lining-nums" }}>{Math.round(n * t)}</div>
    <Label style={{ marginTop: 10 }}>{label}</Label>
  </div>
);

export const S2Inventory: React.FC = () => {
  const frame = useCurrentFrame();
  const map = ease(frame, 10, 40);
  const count = ease(frame, 20, 50);
  const max = TOP7[0].n;
  return (
    <SlideFrame n={2} kicker="All-island inventory" title="Where the portal tombs are" evidence={["DOCUMENTED"]}>
      <div style={{ position: "absolute", left: 90, top: 215 }}>
        <IrelandMap width={500} reveal={map}>
          {COUNTIES.map((c, i) => {
            const [x, y] = project(c.at);
            const t = ease(frame, 24 + i * 2, 20);
            const col = c.ni ? C.ochre : C.blue;
            return (
              <g key={c.name} opacity={t}>
                <circle cx={x} cy={y} r={5.2 * Math.sqrt(c.n) * t} fill={col} fillOpacity={0.14} stroke={col} strokeWidth={1.6} />
                {c.n >= 11 && (
                  <text x={x} y={y + 7} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={20} fill={C.ink}>
                    {c.n}
                  </text>
                )}
              </g>
            );
          })}
          {CLUSTERS.map((c) => {
            const [x, y] = project(clusterCentre(c));
            return <rect key={c.id} x={x - 5} y={y - 5} width={10} height={10} fill={C.signal} transform={`rotate(45 ${x} ${y})`} opacity={ease(frame, 90, 20)} />;
          })}
        </IrelandMap>
        <FadeUp start={80} style={{ width: 500, marginTop: 8 }}>
          <Caption n="Figure 2">
            County totals, drawn at county centres rather than site positions: <span style={{ color: C.blue }}>Republic</span>,{" "}
            <span style={{ color: C.ochre }}>Northern Ireland</span>, and the <span style={{ color: C.signal }}>study clusters</span> (◆).
          </Caption>
        </FadeUp>
      </div>

      <div style={{ position: "absolute", left: 740, top: 225, right: 90 }}>
        <div style={{ display: "flex", gap: 40 }}>
          <Stat n={TOTAL} label="Grouped locations" color={C.ink} t={count} />
          <Stat n={TOTAL - NI_TOTAL} label="Republic of Ireland" color={C.blue} t={count} />
          <Stat n={NI_TOTAL} label="Northern Ireland" color={C.ochre} t={count} />
        </div>

        <FadeUp start={50} style={{ marginTop: 44 }}>
          <Caption n="Table 1">Largest concentrations in the working inventory.</Caption>
          <div style={{ marginTop: 10, borderTop: `1.5px solid ${C.ink}`, borderBottom: `1.5px solid ${C.ink}` }}>
            {TOP7.map((c, i) => {
              const t = ease(frame, 56 + i * 5, 26);
              return (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 18, padding: "7px 0", borderTop: i ? `1px solid ${C.grid}` : undefined }}>
                  <div style={{ width: 150, fontSize: 22 }}>{c.name}</div>
                  <div style={{ width: 110, fontSize: 16, color: C.ink2 }}>{c.ni ? "N. Ireland" : "Republic"}</div>
                  <div style={{ flex: 1, height: 14 }}>
                    <div style={{ height: "100%", width: `${(c.n / max) * 100 * t}%`, background: c.ni ? C.ochre : C.blue, opacity: 0.85 }} />
                  </div>
                  <div style={{ width: 50, textAlign: "right", fontFamily: MONO, fontSize: 21, fontVariantNumeric: "tabular-nums" }}>{c.n}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, fontSize: 23, lineHeight: 1.45 }}>
            Seven counties hold <b>{TOP7_TOTAL}</b> of {TOTAL} locations (<b>{Math.round((TOP7_TOTAL / TOTAL) * 100)}%</b>): strong clustering, not an even spread.
          </div>
        </FadeUp>

        <FadeUp start={100} style={{ marginTop: 18, fontSize: 18, color: C.ink2, lineHeight: 1.5 }}>
          Source: National Monuments Service and the NI Sites and Monuments Record. Working GIS counts include grouped, uncertain, destroyed and reclassified entries; the commonly
          cited figure for surviving portal tombs is about 180–200.
        </FadeUp>
      </div>
    </SlideFrame>
  );
};
