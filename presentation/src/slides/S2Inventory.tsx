import React from "react";
import { useCurrentFrame } from "remotion";
import { C, MONO } from "../theme";
import { CLUSTERS, COUNTIES, NI_TOTAL, TOP7, TOP7_TOTAL, TOTAL, clusterCentre } from "../data";
import { project } from "../geo";
import { FadeUp, IrelandMap, Label, Panel, SlideFrame, ease } from "../ui";

const Stat: React.FC<{ n: number; label: string; color: string; t: number }> = ({ n, label, color, t }) => (
  <div>
    <div style={{ fontSize: 96, fontWeight: 300, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{Math.round(n * t)}</div>
    <Label style={{ marginTop: 10 }}>{label}</Label>
  </div>
);

export const S2Inventory: React.FC = () => {
  const frame = useCurrentFrame();
  const map = ease(frame, 10, 40);
  const count = ease(frame, 20, 50);
  const max = TOP7[0].n;
  return (
    <SlideFrame n={2} kicker="All-island portal tomb model" title="Where the portal tombs are" evidence={["DOCUMENTED"]}>
      <div style={{ position: "absolute", left: 110, top: 225 }}>
        <IrelandMap width={500} reveal={map}>
          {COUNTIES.map((c, i) => {
            const [x, y] = project(c.at);
            const t = ease(frame, 24 + i * 2, 20);
            const col = c.ni ? C.orange : C.cyan;
            return (
              <g key={c.name} opacity={t}>
                <circle cx={x} cy={y} r={5.2 * Math.sqrt(c.n) * t} fill={col} fillOpacity={0.22} stroke={col} strokeWidth={1.6} />
                {c.n >= 11 && (
                  <text x={x} y={y + 7} textAnchor="middle" fontFamily={MONO} fontSize={21} fill={C.text}>
                    {c.n}
                  </text>
                )}
              </g>
            );
          })}
          {CLUSTERS.map((c) => {
            const [x, y] = project(clusterCentre(c));
            return <circle key={c.id} cx={x} cy={y} r={5} fill={C.amber} opacity={ease(frame, 90, 20)} />;
          })}
        </IrelandMap>
        <FadeUp start={80} style={{ display: "flex", gap: 26, marginTop: 6, fontFamily: MONO, fontSize: 16, letterSpacing: 2, color: C.dim }}>
          <span style={{ color: C.cyan }}>● REPUBLIC</span>
          <span style={{ color: C.orange }}>● NORTHERN IRELAND</span>
          <span style={{ color: C.amber }}>● STUDY CLUSTERS</span>
        </FadeUp>
        <FadeUp start={86} style={{ fontSize: 17, color: C.faint, marginTop: 8, width: 500 }}>
          Circles are county totals placed at county centres, not site positions.
        </FadeUp>
      </div>

      <div style={{ position: "absolute", left: 760, top: 235, right: 110 }}>
        <div style={{ display: "flex", gap: 80 }}>
          <Stat n={TOTAL} label="Grouped locations" color={C.text} t={count} />
          <Stat n={TOTAL - NI_TOTAL} label="Republic of Ireland" color={C.cyan} t={count} />
          <Stat n={NI_TOTAL} label="Northern Ireland" color={C.orange} t={count} />
        </div>

        <FadeUp start={50}>
          <Panel style={{ marginTop: 36, padding: "22px 30px" }}>
            <Label color={C.cyan}>Largest concentrations</Label>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 9 }}>
              {TOP7.map((c, i) => {
                const t = ease(frame, 56 + i * 5, 26);
                return (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <div style={{ width: 150, fontSize: 24 }}>{c.name}</div>
                    <div style={{ flex: 1, height: 22, background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ height: "100%", width: `${(c.n / max) * 100 * t}%`, background: c.ni ? C.orange : C.cyan, opacity: 0.8 }} />
                    </div>
                    <div style={{ width: 50, textAlign: "right", fontFamily: MONO, fontSize: 22 }}>{c.n}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 22, fontSize: 25, color: C.text }}>
              Seven counties hold <span style={{ color: C.orange }}>{TOP7_TOTAL}</span> of {TOTAL} locations (
              <span style={{ color: C.orange }}>{Math.round((TOP7_TOTAL / TOTAL) * 100)}%</span>): strong clustering, not a uniform spread.
            </div>
          </Panel>
        </FadeUp>

        <FadeUp start={100} style={{ marginTop: 20, fontSize: 19, color: C.dim, lineHeight: 1.45 }}>
          Working GIS counts from the National Monuments Service and the NI Sites and Monuments Record. They include grouped, uncertain, destroyed and
          reclassified entries; the commonly cited figure for surviving portal tombs is about 180–200.
        </FadeUp>
      </div>
    </SlideFrame>
  );
};
