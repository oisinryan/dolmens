import React from "react";
import { C, SANS, SERIF } from "../theme";
import { CLUSTERS, COUNTIES, NI_TOTAL, TOP7, TOP7_TOTAL, TOTAL, clusterCentre } from "../data";
import { project } from "../geo";
import { IrelandMap } from "../ui";
import { MAP_W } from "../ireland";
import { Kicker, Numbered, Panel, PlateFrame, mapPxPerKm, pulseWave } from "./frame";

const LABEL: Record<string, [number, number, "start" | "end"]> = {
  ballyvennaght: [-16, -14, "end"],
  "malin-more": [16, -12, "start"],
  burren: [-14, -16, "end"],
  easkey: [-14, 28, "end"],
  "slieve-gullion": [16, 30, "start"],
};

/** scale bar and north arrow, in map pixels */
const MapFurniture: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const k = mapPxPerKm();
  return (
    <g fontFamily={SANS} fontSize={17} fill={C.ink2}>
      {[0, 50, 100, 150].map((km, i) => (
        <g key={km}>
          {i < 3 && <rect x={x + km * k} y={y} width={50 * k} height={8} fill={i % 2 ? C.paper : C.ink} stroke={C.ink} strokeWidth={1.5} />}
          <text x={x + km * k} y={y + 30} textAnchor="middle">
            {km}
          </text>
        </g>
      ))}
      <text x={x + 150 * k + 14} y={y + 30}>
        km
      </text>
      <g transform={`translate(${x + 150 * k + 90}, ${y - 20})`}>
        <path d="M0 -34 L12 8 L0 0 L-12 8 Z" fill={C.ink} />
        <text x={0} y={34} textAnchor="middle" fontFamily={SERIF} fontSize={22} fill={C.ink}>
          N
        </text>
      </g>
    </g>
  );
};

export const P1Title: React.FC = () => (
  <PlateFrame n={1} title="Neolithic Acoustic Signal Network" subtitle="Portal tombs, horn transmitters and passive listening systems across Ireland" footer="A speculative engineering model informed by archaeology and acoustics." evidence={["HYPOTHETICAL"]}>
    <div style={{ position: "absolute", left: 90, top: 250, width: 700 }}>
      <Kicker color={C.blue}>Concept presentation · overview</Kicker>
      <div style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 1.25, marginTop: 18 }}>
        Could clusters of portal tombs have passed simple horn signals from one to the next?
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 40 }}>
        <Numbered n={1}>
          <b>Hypothesis.</b> Clusters of Irish portal tombs may support low-frequency relay signalling.
        </Numbered>
        <Numbered n={2}>
          <b>Carrier concept.</b> Horn-based transmission, plus passive listening horns and resonant stone chambers.
        </Numbered>
        <Numbered n={3}>
          <b>Test method.</b> GIS spacing, acoustic modelling, cluster analysis and field experiments.
        </Numbered>
      </div>
    </div>

    <div style={{ position: "absolute", left: 840, top: 205 }}>
      <IrelandMap width={540}>
        {COUNTIES.map((c) => {
          const [x, y] = project(c.at);
          return <circle key={c.name} cx={x} cy={y} r={3 * Math.sqrt(c.n)} fill={C.faint} opacity={0.28} />;
        })}
        {CLUSTERS.map((c) => {
          const [x, y] = project(clusterCentre(c));
          const k = mapPxPerKm();
          return (
            <g key={c.id}>
              <circle cx={x} cy={y} r={Math.max(22, 5 * k * 3)} fill="none" stroke={C.signal} strokeWidth={1.5} strokeDasharray="4 4" />
              <circle cx={x} cy={y} r={9} fill={C.blue} stroke={C.paper} strokeWidth={2.5} />
              <text x={x + LABEL[c.id][0]} y={y + LABEL[c.id][1]} textAnchor={LABEL[c.id][2]} fontFamily={SANS} fontWeight={600} fontSize={20} fill={C.ink}>
                {c.name}
              </text>
            </g>
          );
        })}
        <MapFurniture x={30} y={880} />
      </IrelandMap>
    </div>

    <div style={{ position: "absolute", left: 1440, right: 90, top: 250, display: "flex", flexDirection: "column", gap: 20 }}>
      <Panel title="Legend">
        <div style={{ display: "grid", gridTemplateColumns: "34px 1fr", rowGap: 10, alignItems: "center", fontSize: 18 }}>
          <svg width={24} height={24}>
            <circle cx={12} cy={12} r={8} fill={C.blue} />
          </svg>
          <span>Portal-tomb cluster studied</span>
          <svg width={24} height={24}>
            <circle cx={12} cy={12} r={7} fill={C.faint} opacity={0.4} />
          </svg>
          <span>County total, working inventory</span>
          <svg width={24} height={24}>
            <circle cx={12} cy={12} r={10} fill="none" stroke={C.signal} strokeWidth={1.5} strokeDasharray="3 3" />
          </svg>
          <span>Local acoustic cell (modelled, not to scale)</span>
        </div>
      </Panel>
      <Panel title="Horn signal (model)">
        <svg width={350} height={90}>
          <line x1={0} y1={45} x2={350} y2={45} stroke={C.grid} />
          <path d={pulseWave(350, 90, [[0.1, 0.8], [2.1, 0.3], [2.7, 0.3], [3.3, 0.3]], 4, 90)} fill="none" stroke={C.signal} strokeWidth={1.3} />
        </svg>
        <div style={{ fontSize: 16, color: C.ink2, marginTop: 6 }}>250–500 Hz carrier, switched on and off at 0.5–2 Hz. Low frequency, long distance, real topography.</div>
      </Panel>
      <Panel title="Topography and sightlines">
        <svg width={350} height={130}>
          <path d="M0 118 C 50 110, 70 70, 120 64 S 190 40, 220 58 S 300 98, 350 104 L350 130 L0 130 Z" fill={C.tint} stroke={C.ink2} strokeWidth={1.5} />
          <line x1={24} y1={104} x2={330} y2={92} stroke={C.ink2} strokeDasharray="4 4" />
          <path d="M24 104 Q 175 -20 330 92" fill="none" stroke={C.signal} strokeWidth={1.8} strokeDasharray="6 4" />
          <circle cx={24} cy={104} r={6} fill={C.blue} />
          <circle cx={330} cy={92} r={6} fill={C.blue} />
        </svg>
        <div style={{ fontSize: 16, color: C.ink2, marginTop: 6 }}>The ridge blocks the line of sight (grey). Sound bends over it, at a cost in level (orange).</div>
      </Panel>
    </div>
  </PlateFrame>
);

export const P2Inventory: React.FC = () => {
  const [niX, niY] = project([54.62, -6.9]);
  const [roiX, roiY] = project([53.05, -8.1]);
  const ranked = [...COUNTIES].sort((a, b) => b.n - a.n);
  return (
    <PlateFrame n={2} title="All-Island Portal Tomb Model" subtitle="Republic of Ireland and Northern Ireland working dataset" footer="Working inventory used for spatial modelling; counts include grouped and uncertain entries." evidence={["DOCUMENTED"]}>
      <div style={{ position: "absolute", left: 90, top: 215 }}>
        <IrelandMap width={570}>
          {COUNTIES.map((c) => {
            const [x, y] = project(c.at);
            const col = c.ni ? C.ochre : C.blue;
            return <circle key={c.name} cx={x} cy={y} r={5.4 * Math.sqrt(c.n)} fill={col} fillOpacity={0.13} stroke={col} strokeWidth={1.4} />;
          })}
          {CLUSTERS.map((c) => {
            const [x, y] = project(clusterCentre(c));
            return (
              <g key={c.id}>
                <rect x={x - 7} y={y - 7} width={14} height={14} fill={C.signal} transform={`rotate(45 ${x} ${y})`} />
                <text x={x + LABEL[c.id][0] * 1.2} y={y + LABEL[c.id][1] * 1.1} textAnchor={LABEL[c.id][2]} fontFamily={SANS} fontWeight={600} fontSize={21} fill={C.ink} paintOrder="stroke" stroke={C.paper} strokeWidth={5}>
                  {c.name}
                </text>
              </g>
            );
          })}
          <text x={niX} y={niY} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={18} letterSpacing={2} fill={C.ochre} paintOrder="stroke" stroke={C.paper} strokeWidth={6}>
            NORTHERN IRELAND
          </text>
          <text x={roiX} y={roiY} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={18} letterSpacing={2} fill={C.blue} paintOrder="stroke" stroke={C.paper} strokeWidth={6}>
            REPUBLIC OF IRELAND
          </text>
          <text x={MAP_W - 40} y={880} textAnchor="end" fontFamily={SANS} fontSize={16} fill={C.ink2}>
            Circles: county totals at county centres. ◆ study clusters.
          </text>
        </IrelandMap>
      </div>

      <div style={{ position: "absolute", left: 760, right: 90, top: 225, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <Panel title="Working count">
          <div style={{ fontFamily: SERIF, fontSize: 84, lineHeight: 1 }}>{TOTAL}</div>
          <div style={{ fontSize: 20, marginTop: 4 }}>grouped portal-tomb locations</div>
          <div style={{ display: "flex", gap: 30, marginTop: 18 }}>
            <div style={{ borderTop: `3px solid ${C.blue}`, paddingTop: 8 }}>
              <div style={{ fontFamily: SERIF, fontSize: 44 }}>{TOTAL - NI_TOTAL}</div>
              <div style={{ fontSize: 17, color: C.ink2 }}>Republic of Ireland</div>
            </div>
            <div style={{ borderTop: `3px solid ${C.ochre}`, paddingTop: 8 }}>
              <div style={{ fontFamily: SERIF, fontSize: 44 }}>{NI_TOTAL}</div>
              <div style={{ fontSize: 17, color: C.ink2 }}>Northern Ireland</div>
            </div>
          </div>
        </Panel>
        <Panel title="Top concentration counties">
          <div style={{ borderTop: `1.5px solid ${C.ink}`, borderBottom: `1.5px solid ${C.ink}` }}>
            {TOP7.map((c, i) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0", borderTop: i ? `1px solid ${C.grid}` : undefined, fontSize: 19 }}>
                <span style={{ width: 120 }}>{c.name}</span>
                <span style={{ flex: 1, height: 11 }}>
                  <span style={{ display: "block", height: "100%", width: `${(c.n / 27) * 100}%`, background: c.ni ? C.ochre : C.blue }} />
                </span>
                <span style={{ width: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{c.n}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Insight" accent={C.blue} fill={C.blueTint} style={{ gridColumn: "span 2" }}>
          <div style={{ fontFamily: SERIF, fontSize: 30 }}>
            These 7 counties contain {TOP7_TOTAL} of {TOTAL} sites (~{Math.round((TOP7_TOTAL / TOTAL) * 100)}%).
          </div>
        </Panel>
        <Panel title="Clustering, not an even spread" style={{ gridColumn: "span 2" }}>
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 110 }}>
            {ranked.map((c, i) => (
              <div key={c.name} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <div style={{ height: `${(c.n / 27) * 100}%`, background: i < 7 ? (c.ni ? C.ochre : C.blue) : C.rule }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: C.ink2, marginTop: 8 }}>
            <span>All 27 counties with portal tombs, ranked by count. The coloured seven hold more than half.</span>
            <span>even spread ≈ {(TOTAL / 27).toFixed(1)} per county</span>
          </div>
        </Panel>
      </div>
    </PlateFrame>
  );
};
