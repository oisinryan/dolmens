import React from "react";
import { C, SANS, SERIF } from "../theme";
import { clusterLinks } from "../data";
import { TombDrawing, makeIso, partAnchor } from "../tomb";
import { Kicker, Numbered, Panel, PlateFrame } from "./frame";

const LINKS = clusterLinks(false);

/** a cluster's sites fitted into a box, with its spanning-tree links */
const Network: React.FC<{ id: string; size: number }> = ({ id, size }) => {
  const c = LINKS.find((x) => x.id === id)!;
  const lat0 = c.nodes.reduce((s, n) => s + n.at[0], 0) / c.nodes.length;
  const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const pts = c.nodes.map((n) => [n.at[1] * kx, -n.at[0] * 110.57]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const k = (size - 60) / span;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const xy = pts.map(([x, y]) => [size / 2 + (x - cx) * k, size / 2 + (y - cy) * k]);
  const longest = Math.max(...c.edges.map((e) => e.km));
  return (
    <svg width={size} height={size} style={{ background: C.tint }}>
      {c.edges.map((e) => (
        <line key={`${e.a}-${e.b}`} x1={xy[e.a][0]} y1={xy[e.a][1]} x2={xy[e.b][0]} y2={xy[e.b][1]} stroke={e.km === longest ? C.signal : C.blue} strokeWidth={e.km === longest ? 3 : 2.2} />
      ))}
      {xy.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={7} fill={C.ink} stroke={C.paper} strokeWidth={2} />
      ))}
      <line x1={10} y1={size - 10} x2={10 + k} y2={size - 10} stroke={C.ink} strokeWidth={2} />
      <text x={10} y={size - 16} fontFamily={SANS} fontSize={13} fill={C.ink2}>
        1 km
      </text>
    </svg>
  );
};

export const P5Clusters: React.FC = () => (
  <PlateFrame n={5} title="Cluster Connectivity" subtitle="Minimum relay hop needed to connect each recognised cluster" footer="Modelled connectivity based on cluster spacing and acoustic range assumptions." evidence={["DOCUMENTED", "MODELLED"]}>
    <div style={{ position: "absolute", left: 90, top: 235, display: "flex", gap: 18 }}>
      {LINKS.map((c) => (
        <div key={c.id} style={{ width: 232, border: `1px solid ${C.rule}`, padding: "16px 16px 18px" }}>
          <div style={{ fontFamily: SERIF, fontSize: 27 }}>{c.name}</div>
          <Kicker style={{ fontSize: 14, marginTop: 2, color: C.blue }}>Co. {c.county}</Kicker>
          <div style={{ marginTop: 14 }}>
            <Network id={c.id} size={198} />
          </div>
          <Kicker style={{ fontSize: 13, marginTop: 16 }}>Largest relay hop</Kicker>
          <div style={{ fontFamily: SERIF, fontSize: 44, color: c.bottleneck > 3 ? C.signal : C.ink }}>
            {c.bottleneck.toFixed(3)}
            <span style={{ fontSize: 22, color: C.ink2 }}> km</span>
          </div>
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 90, top: 790, width: 1240, fontSize: 18, color: C.ink2 }}>
      Each diagram is the minimum spanning tree over the cluster's listed tombs (●); the longest link, in orange, is the hop the cluster needs.
    </div>

    <div style={{ position: "absolute", left: 1380, right: 90, top: 235, display: "flex", flexDirection: "column", gap: 20 }}>
      <Panel title="Key insights">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Numbered n={1} size={20}>
            4 of 5 recognised clusters connect within about 2.62 km or less.
          </Numbered>
          <Numbered n={2} size={20}>
            Only Slieve Gullion needs a substantially longer relay hop, about 4.67 km.
          </Numbered>
        </div>
      </Panel>
      <Panel title="Largest relay hop comparison">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {LINKS.map((c) => (
            <div key={c.id}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17 }}>
                <span>{c.name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{c.bottleneck.toFixed(3)} km</span>
              </div>
              <div style={{ height: 12, background: C.tint, marginTop: 3 }}>
                <div style={{ height: "100%", width: `${(c.bottleneck / 5) * 100}%`, background: c.bottleneck > 3 ? C.signal : C.blue }} />
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.ink2 }}>
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <span key={k}>{k}</span>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  </PlateFrame>
);

/* ---------------- plate 6 ---------------- */
const iso = makeIso(78, 700, 680);
const NAMES = ["Receiving horn / collector", "Portal aperture", "Upright portal stones", "Capstone", "Internal chamber volume", "Cairn or mound envelope", "Listener / operator position"];

export const P6Exploded: React.FC = () => {
  const e = 1;
  const ground = [iso([-7.5, -2.2, 0]), iso([4.2, -2.2, 0]), iso([4.2, 3.6, 0]), iso([-7.5, 3.6, 0])].map((p) => p.join(",")).join(" ");
  const path = [iso([-7, 0.75, 0.95]), iso([-4.5, 0.75, 0.95]), iso([-1.75, 0.75, 0.95]), iso([0.3, 0.75, 0.95]), iso([1.1, 0.75, 1.02])];
  return (
    <PlateFrame n={6} title="Exploded Model" subtitle="Portal tomb acoustic station: a conceptual reconstruction" footer="Conceptual reconstruction. No collector of this kind is known from the archaeology." evidence={["HYPOTHETICAL"]}>
      <svg width={1330} height={800} style={{ position: "absolute", left: 20, top: 200, overflow: "visible" }} viewBox="0 200 1330 800">
        <polygon points={ground} fill="#eef1ec" stroke={C.rule} />
        <TombDrawing iso={iso} e={e} phase={0.35} scale={78} badgeOpacity={() => 1} />
        <polyline points={path.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.signal} strokeWidth={3} strokeDasharray="10 6" markerEnd="url(#arrow)" />
        <defs>
          <marker id="arrow" markerWidth={10} markerHeight={10} refX={6} refY={5} orient="auto">
            <path d="M0 0 L10 5 L0 10 Z" fill={C.signal} />
          </marker>
        </defs>
        <text x={iso([-6.8, 0.75, 2.5])[0]} y={iso([-6.8, 0.75, 2.5])[1]} fontFamily={SANS} fontWeight={600} fontSize={17} letterSpacing={1.5} fill={C.signal}>
          PATH OF SOUND ENERGY
        </text>
        {[1, 4, 6].map((n) => {
          const a = partAnchor(n, e);
          if (!a) return null;
          const [x, y] = iso(a);
          const dx = n === 6 ? 60 : n === 4 ? 40 : -40;
          return (
            <g key={n}>
              <line x1={x + Math.sign(dx) * 17} y1={y} x2={x + dx} y2={y - 34} stroke={C.ink2} />
              <text x={x + dx + Math.sign(dx) * 6} y={y - 38} textAnchor={dx > 0 ? "start" : "end"} fontFamily={SANS} fontWeight={600} fontSize={18} fill={C.ink}>
                {NAMES[n - 1]}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ position: "absolute", left: 90, top: 230, width: 330, border: `1px solid ${C.rule}`, padding: "12px 16px", background: C.paper }}>
        <Kicker style={{ fontSize: 13 }}>At the sending site, 1–5 km away</Kicker>
        <svg width={290} height={70} style={{ marginTop: 6 }}>
          <path d="M10 30 L90 27 Q140 22 180 4 L180 60 Q140 40 90 35 L10 34 Z" fill={C.signalTint} stroke={C.ink} strokeWidth={2} />
          <ellipse cx={180} cy={32} rx={8} ry={28} fill={C.paper} stroke={C.ink} strokeWidth={2} />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${200 + i * 22} 8 Q${216 + i * 22} 32 ${200 + i * 22} 56`} fill="none" stroke={C.signal} strokeWidth={2} />
          ))}
        </svg>
        <div style={{ fontSize: 16, color: C.ink2 }}>Transmitting horn or conch</div>
      </div>

      <div style={{ position: "absolute", left: 1380, right: 90, top: 225, display: "flex", flexDirection: "column", gap: 18 }}>
        <Panel title="Components">
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {NAMES.map((name, i) => (
              <Numbered key={name} n={i + 1} size={18}>
                {name}
              </Numbered>
            ))}
          </div>
        </Panel>
        <Panel title="How it would work" accent={C.blue} fill={C.blueTint}>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <Numbered n={1} size={18}>
              The collector concentrates incoming sound.
            </Numbered>
            <Numbered n={2} size={18}>
              The portal aperture is the coupling point.
            </Numbered>
            <Numbered n={3} size={18}>
              The stone chamber may emphasise certain frequencies.
            </Numbered>
            <Numbered n={4} size={18}>
              The cairn's mass could change transmission and isolate the chamber.
            </Numbered>
          </div>
        </Panel>
      </div>
    </PlateFrame>
  );
};
