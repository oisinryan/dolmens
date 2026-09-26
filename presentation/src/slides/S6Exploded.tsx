import React from "react";
import { useCurrentFrame } from "remotion";
import { C, SANS, SERIF } from "../theme";
import { Controls } from "../controls";
import { Box, Caption, EvidenceTag, FadeUp, Label, SlideFrame, ease } from "../ui";

/* ---- isometric projection: metres → screen. The portal (x = 0) faces lower-left, sound arrives along −x. ---- */
const S = 82;
const OX = 620;
const OY = 632;
const COS = Math.cos(Math.PI / 6);
type V3 = readonly [number, number, number];
const iso = ([x, y, z]: V3): [number, number] => [OX + (x + y) * COS * S, OY + (y - x) * 0.5 * S - z * S];
const poly = (pts: V3[]) => pts.map((p) => iso(p).map((n) => n.toFixed(1)).join(",")).join(" ");

/** convex hull (monotone chain) of screen points, for cones and domes */
const hull = (pts: [number, number][]) => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const out: [number, number][] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...half(p), ...half([...p].reverse())].map((q) => q.map((n) => n.toFixed(1)).join(",")).join(" ");
};

/** a stone block; zf/zb let the top slope from front (x0) to back (x1) */
const Block: React.FC<{ x: [number, number]; y: [number, number]; z: [number, number]; zBack?: [number, number]; d: V3; shade?: number; stroke?: string }> = ({
  x: [x0, x1],
  y: [y0, y1],
  z: [z0, z1],
  zBack,
  d: [dx, dy, dz],
  shade = 0,
  stroke = C.ink,
}) => {
  const [b0, b1] = zBack ?? [z0, z1];
  const P = (x: number, y: number, z: number): V3 => [x + dx, y + dy, z + dz];
  const top = [P(x0, y0, z1), P(x1, y0, b1), P(x1, y1, b1), P(x0, y1, z1)];
  const front = [P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)];
  const side = [P(x0, y1, z0), P(x1, y1, b0), P(x1, y1, b1), P(x0, y1, z1)];
  return (
    <g stroke={stroke} strokeWidth={1.8} strokeLinejoin="round">
      <polygon points={poly(side)} fill={C.stoneSide} />
      <polygon points={poly(front)} fill={shade ? C.stoneTop : C.stone} />
      <polygon points={poly(top)} fill={shade ? C.stoneSide : C.stoneTop} />
    </g>
  );
};

/** a circle of radius r in the y–z plane at x (a ring across the sound axis) */
const ring = (x: number, r: number, cy = 0.75, cz = 0.95, n = 40): V3[] =>
  Array.from({ length: n }, (_, i) => [x, cy + r * Math.cos((i / n) * Math.PI * 2), cz + r * Math.sin((i / n) * Math.PI * 2)] as const);

const PARTS = [
  { n: 1, name: "Receiving horn / collector", text: "Perishable (wood, bark, hide) flare that concentrates incoming sound." },
  { n: 2, name: "Portal aperture", text: "The gap between the portal stones couples the collector to the chamber." },
  { n: 3, name: "Portal stones", text: "Define the entrance geometry and carry the capstone." },
  { n: 4, name: "Capstone", text: "Massive upper boundary of the chamber." },
  { n: 5, name: "Chamber", text: "Small enclosed volume, roughly 2 × 1.5 × 1.5 m." },
  { n: 6, name: "Cairn envelope", text: "Original stone/earth mound: mass, isolation, altered transmission." },
  { n: 7, name: "Listener / relay operator", text: "Sits at a high signal-to-noise position in or near the chamber." },
];

export const S6Exploded: React.FC<Controls> = ({ explode, showCairn }) => {
  const frame = useCurrentFrame();
  const build = ease(frame, 6, 40);
  const e = explode * ease(frame, 60, 70);
  const phase = (frame % 60) / 60;
  const cairnScale = 1 + 0.22 * e;
  const collectorDx = -1.3 * e;

  // the cairn: an ellipsoidal mound drawn as a translucent hull with contour rings
  const cairnPts: [number, number][] = [];
  for (let a = 0; a < 36; a++)
    for (let h = 0; h <= 6; h++) {
      const t = (a / 36) * Math.PI * 2;
      const phi = (h / 6) * (Math.PI / 2);
      cairnPts.push(iso([1.0 + 3.0 * cairnScale * Math.cos(phi) * Math.cos(t), 0.75 + 2.4 * cairnScale * Math.cos(phi) * Math.sin(t), 2.9 * cairnScale * Math.sin(phi)]));
    }
  const contour = (h: number) =>
    poly(Array.from({ length: 48 }, (_, i) => {
      const t = (i / 48) * Math.PI * 2;
      const k = Math.sqrt(1 - h * h);
      return [1.0 + 3.0 * cairnScale * k * Math.cos(t), 0.75 + 2.4 * cairnScale * k * Math.sin(t), 2.9 * cairnScale * h] as const;
    }));

  const mouthX = -3.2 + collectorDx;
  const throatX = -0.45 + collectorDx;
  const hornHull = hull([...ring(mouthX, 0.95), ...ring(throatX, 0.18)].map(iso));

  const wave = Array.from({ length: 33 }, (_, i) => {
    const x = (i / 32) * 1.9;
    return iso([x, 0.75, 0.75 + 0.45 * Math.sin((i / 32) * Math.PI) * Math.cos(phase * Math.PI * 4)]);
  })
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const badge = (n: number, p: V3) => {
    const [x, y] = iso(p);
    return (
      <g key={n} opacity={ease(frame, 110 + n * 4, 16)}>
        <circle cx={x} cy={y} r={17} fill={C.paper} stroke={C.blue} strokeWidth={2} />
        <text x={x} y={y + 7} textAnchor="middle" fontFamily={SERIF} fontSize={20} fill={C.blue}>
          {n}
        </text>
      </g>
    );
  };

  return (
    <SlideFrame n={6} kicker="Exploded model" title="A portal tomb as an acoustic receiving station" evidence={["HYPOTHETICAL"]}>
      <svg width={1300} height={840} style={{ position: "absolute", left: 20, top: 200, overflow: "visible" }} viewBox="0 200 1300 840">
        {/* sound axis */}
        <g opacity={build}>
          <line x1={iso([-7, 0.75, 0.95])[0]} y1={iso([-7, 0.75, 0.95])[1]} x2={iso([3.2, 0.75, 0.95])[0]} y2={iso([3.2, 0.75, 0.95])[1]} stroke={C.signal} strokeWidth={1.2} strokeDasharray="14 5 3 5" opacity={0.8} />
          <text x={iso([-6.6, 0.75, 0.95])[0]} y={iso([-6.6, 0.75, 0.95])[1] - 16} fontFamily={SANS} fontWeight={600} fontSize={16} letterSpacing={2} fill={C.signal}>
            SOUND AXIS
          </text>
        </g>

        {/* incoming wavefronts */}
        {[0, 1, 2].map((k) => {
          const p = (phase + k / 3) % 1;
          const x = -7 + p * (mouthX + 7);
          return <polygon key={k} points={poly(ring(x, 0.8 + 0.3 * p))} fill="none" stroke={C.signal} strokeWidth={2} opacity={build * Math.sin(p * Math.PI) * 0.9} />;
        })}

        {showCairn && (
          <g opacity={build * (1 - 0.45 * e)}>
            <polygon points={hull(cairnPts)} fill={C.tint} fillOpacity={0.7} stroke={C.ink2} strokeWidth={1.5} strokeDasharray="8 5" />
            {[0.15, 0.45, 0.75].map((h) => (
              <polygon key={h} points={contour(h)} fill="none" stroke={C.faint} strokeWidth={1} strokeDasharray="3 6" />
            ))}
          </g>
        )}

        <g opacity={build}>
          {/* back and far-side stones first */}
          <Block x={[1.9, 2.2]} y={[0, 1.5]} z={[0, 1.6]} d={[0.9 * e, 0, 0]} />
          <Block x={[0.3, 1.9]} y={[-0.2, 0]} z={[0, 1.5]} d={[0, -0.9 * e, 0]} />
          <Block x={[-0.35, 0]} y={[-0.15, 0.25]} z={[0, 2.1]} d={[-0.8 * e, -0.3 * e, 0]} />

          {/* chamber volume, standing wave and listener */}
          <g stroke={C.blue} strokeWidth={1.2} strokeDasharray="5 5" fill="none" opacity={0.7}>
            <polygon points={poly([[0, 0, 0], [1.9, 0, 0], [1.9, 1.5, 0], [0, 1.5, 0]])} />
            <polygon points={poly([[0, 0, 1.5], [1.9, 0, 1.5], [1.9, 1.5, 1.5], [0, 1.5, 1.5]])} />
          </g>
          <path d={wave} fill="none" stroke={C.blue} strokeWidth={2.5} />
          <g>
            <circle cx={iso([1.25, 0.75, 1.02])[0]} cy={iso([1.25, 0.75, 1.02])[1]} r={0.2 * S} fill={C.paper} stroke={C.ink} strokeWidth={2} />
            <polygon points={poly([[1.25, 0.45, 0.1], [1.25, 1.05, 0.1], [1.25, 1.0, 0.8], [1.25, 0.5, 0.8]])} fill={C.paper} stroke={C.ink} strokeWidth={2} />
          </g>

          {/* near-side stones */}
          <Block x={[0.3, 1.9]} y={[1.5, 1.7]} z={[0, 1.5]} d={[0, 0.9 * e, 0]} />
          <Block x={[-0.35, 0]} y={[1.25, 1.65]} z={[0, 2.1]} d={[-0.8 * e, 0.3 * e, 0]} />

          {/* capstone, sloping down to the back */}
          <Block x={[-0.6, 2.5]} y={[-0.35, 1.85]} z={[2.1, 2.7]} zBack={[1.6, 2.05]} d={[0, 0, 1.3 * e]} shade={1} />

          {/* collector horn */}
          <polygon points={hornHull} fill={C.blueTint} fillOpacity={0.8} stroke={C.blue} strokeWidth={2} />
          <polygon points={poly(ring(mouthX, 0.95))} fill={C.paper} fillOpacity={0.6} stroke={C.blue} strokeWidth={2.2} />
          <polygon points={poly(ring(throatX, 0.18))} fill="none" stroke={C.blue} strokeWidth={2} />
        </g>

        {badge(1, [mouthX, 0.75, 2.1])}
        {badge(2, [-0.35 - 0.8 * e, 0.7, 1.35])}
        {badge(3, [-0.35 - 0.8 * e, 1.45 + 0.3 * e, 2.35])}
        {badge(4, [1.0, 0.75, 2.6 + 1.3 * e + 0.25])}
        {badge(5, [1.9, 0.0, 1.3])}
        {showCairn ? badge(6, [1.0 + 2.9 * cairnScale, 0.75, 0.9]) : null}
        {badge(7, [1.25, 0.75, 1.5])}
      </svg>

      <FadeUp start={40} style={{ position: "absolute", left: 90, top: 944, width: 1100 }}>
        <Caption n="Figure 6">Exploded axonometric of a portal tomb as a conceptual receiving station. Parts separate along the sound axis; the chamber volume is dashed.</Caption>
      </FadeUp>
      <div style={{ position: "absolute", right: 90, top: 230, width: 560, display: "flex", flexDirection: "column", gap: 14 }}>
        {PARTS.map((p, i) => (
          <FadeUp key={p.n} start={100 + i * 5} style={{ display: "flex", gap: 16, opacity: p.n === 6 && !showCairn ? 0.35 : undefined }}>
            <div style={{ fontFamily: SERIF, fontSize: 20, color: C.blue, border: `2px solid ${C.blue}`, borderRadius: 20, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {p.n}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 18, color: C.ink2, lineHeight: 1.35 }}>{p.text}</div>
            </div>
          </FadeUp>
        ))}
        <FadeUp start={150}>
          <Box fill={C.tint} accent={C.tint} style={{ marginTop: 8, padding: "18px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label>Chamber resonance</Label>
              <EvidenceTag kind="MODELLED" style={{ fontSize: 13, padding: "4px 10px" }} />
            </div>
            <div style={{ fontSize: 19, color: C.ink2, lineHeight: 1.45, marginTop: 10 }}>
              <span style={{ fontFamily: SERIF, fontStyle: "italic", color: C.ink }}>f = c / 2L</span> with L = 1.5–2.0 m gives first modes of <b style={{ color: C.ink }}>86–114 Hz</b>, below the
              250–500 Hz carrier. Any enhancement at the carrier has to be measured, not assumed.
            </div>
          </Box>
        </FadeUp>
      </div>
    </SlideFrame>
  );
};
