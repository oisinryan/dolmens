import React from "react";
import { C, SERIF } from "./theme";

/* ---- isometric projection: metres → screen. The portal (x = 0) faces lower-left, sound arrives along −x. ---- */
export type V3 = readonly [number, number, number];
export type Iso = (p: V3) => [number, number];
const COS = Math.cos(Math.PI / 6);
export const makeIso = (S: number, OX: number, OY: number): Iso => ([x, y, z]) => [OX + (x + y) * COS * S, OY + (y - x) * 0.5 * S - z * S];

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

/** a circle of radius r in the y–z plane at x (a ring across the sound axis) */
export const ring = (x: number, r: number, cy = 0.75, cz = 0.95, n = 40): V3[] =>
  Array.from({ length: n }, (_, i) => [x, cy + r * Math.cos((i / n) * Math.PI * 2), cz + r * Math.sin((i / n) * Math.PI * 2)] as const);

/** where each numbered part sits, for badges and leader lines */
export const partAnchor = (n: number, e: number, showCairn = true): V3 | null => {
  const cairnScale = 1 + 0.22 * e;
  const anchors: Record<number, V3> = {
    1: [-3.2 - 1.3 * e, 0.75, 2.1],
    2: [-0.35 - 0.8 * e, 0.7, 1.35],
    3: [-0.35 - 0.8 * e, 1.45 + 0.3 * e, 2.35],
    4: [1.0, 0.75, 2.6 + 1.3 * e + 0.25],
    5: [1.9, 0.0, 1.3],
    6: [1.0 + 2.9 * cairnScale, 0.75, 0.9],
    7: [1.25, 0.75, 1.5],
  };
  return n === 6 && !showCairn ? null : anchors[n];
};

/**
 * The exploded portal tomb as an SVG group: cairn, stones, chamber, collector and listener.
 * `e` is how far it is exploded (0–1), `phase` (0–1) drives the wavefronts and standing wave.
 */
export const TombDrawing: React.FC<{
  iso: Iso;
  e: number;
  phase: number;
  build?: number;
  showCairn?: boolean;
  scale?: number;
  badgeOpacity?: (n: number) => number;
  axisLabel?: React.ReactNode;
}> = ({ iso, e, phase, build = 1, showCairn = true, scale = 82, badgeOpacity, axisLabel }) => {
  const poly = (pts: V3[]) => pts.map((p) => iso(p).map((n) => n.toFixed(1)).join(",")).join(" ");
  const Block: React.FC<{ x: [number, number]; y: [number, number]; z: [number, number]; zBack?: [number, number]; d: V3; shade?: number }> = ({ x: [x0, x1], y: [y0, y1], z: [z0, z1], zBack, d: [dx, dy, dz], shade = 0 }) => {
    const [b0, b1] = zBack ?? [z0, z1];
    const P = (x: number, y: number, z: number): V3 => [x + dx, y + dy, z + dz];
    const top = [P(x0, y0, z1), P(x1, y0, b1), P(x1, y1, b1), P(x0, y1, z1)];
    const front = [P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)];
    const side = [P(x0, y1, z0), P(x1, y1, b0), P(x1, y1, b1), P(x0, y1, z1)];
    return (
      <g stroke={C.ink} strokeWidth={1.8} strokeLinejoin="round">
        <polygon points={poly(side)} fill={C.stoneSide} />
        <polygon points={poly(front)} fill={shade ? C.stoneTop : C.stone} />
        <polygon points={poly(top)} fill={shade ? C.stoneSide : C.stoneTop} />
      </g>
    );
  };
  const cairnScale = 1 + 0.22 * e;
  const collectorDx = -1.3 * e;
  const cairnPts: [number, number][] = [];
  for (let a = 0; a < 36; a++)
    for (let h = 0; h <= 6; h++) {
      const t = (a / 36) * Math.PI * 2;
      const phi = (h / 6) * (Math.PI / 2);
      cairnPts.push(iso([1.0 + 3.0 * cairnScale * Math.cos(phi) * Math.cos(t), 0.75 + 2.4 * cairnScale * Math.cos(phi) * Math.sin(t), 2.9 * cairnScale * Math.sin(phi)]));
    }
  const contour = (h: number) =>
    poly(
      Array.from({ length: 48 }, (_, i) => {
        const t = (i / 48) * Math.PI * 2;
        const k = Math.sqrt(1 - h * h);
        return [1.0 + 3.0 * cairnScale * k * Math.cos(t), 0.75 + 2.4 * cairnScale * k * Math.sin(t), 2.9 * cairnScale * h] as const;
      }),
    );
  const mouthX = -3.2 + collectorDx;
  const throatX = -0.45 + collectorDx;
  const hornHull = hull([...ring(mouthX, 0.95), ...ring(throatX, 0.18)].map(iso));
  const wave = Array.from({ length: 33 }, (_, i) => iso([(i / 32) * 1.9, 0.75, 0.75 + 0.45 * Math.sin((i / 32) * Math.PI) * Math.cos(phase * Math.PI * 4)]))
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const [ax0, ay0] = iso([-7, 0.75, 0.95]);
  const [ax1, ay1] = iso([3.2, 0.75, 0.95]);
  return (
    <g>
      <g opacity={build}>
        <line x1={ax0} y1={ay0} x2={ax1} y2={ay1} stroke={C.signal} strokeWidth={1.2} strokeDasharray="14 5 3 5" opacity={0.8} />
        {axisLabel}
      </g>
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
        <Block x={[1.9, 2.2]} y={[0, 1.5]} z={[0, 1.6]} d={[0.9 * e, 0, 0]} />
        <Block x={[0.3, 1.9]} y={[-0.2, 0]} z={[0, 1.5]} d={[0, -0.9 * e, 0]} />
        <Block x={[-0.35, 0]} y={[-0.15, 0.25]} z={[0, 2.1]} d={[-0.8 * e, -0.3 * e, 0]} />
        <g stroke={C.blue} strokeWidth={1.2} strokeDasharray="5 5" fill="none" opacity={0.7}>
          <polygon points={poly([[0, 0, 0], [1.9, 0, 0], [1.9, 1.5, 0], [0, 1.5, 0]])} />
          <polygon points={poly([[0, 0, 1.5], [1.9, 0, 1.5], [1.9, 1.5, 1.5], [0, 1.5, 1.5]])} />
        </g>
        <path d={wave} fill="none" stroke={C.blue} strokeWidth={2.5} />
        <circle cx={iso([1.25, 0.75, 1.02])[0]} cy={iso([1.25, 0.75, 1.02])[1]} r={0.2 * scale} fill={C.paper} stroke={C.ink} strokeWidth={2} />
        <polygon points={poly([[1.25, 0.45, 0.1], [1.25, 1.05, 0.1], [1.25, 1.0, 0.8], [1.25, 0.5, 0.8]])} fill={C.paper} stroke={C.ink} strokeWidth={2} />
        <Block x={[0.3, 1.9]} y={[1.5, 1.7]} z={[0, 1.5]} d={[0, 0.9 * e, 0]} />
        <Block x={[-0.35, 0]} y={[1.25, 1.65]} z={[0, 2.1]} d={[-0.8 * e, 0.3 * e, 0]} />
        <Block x={[-0.6, 2.5]} y={[-0.35, 1.85]} z={[2.1, 2.7]} zBack={[1.6, 2.05]} d={[0, 0, 1.3 * e]} shade={1} />
        <polygon points={hornHull} fill={C.blueTint} fillOpacity={0.8} stroke={C.blue} strokeWidth={2} />
        <polygon points={poly(ring(mouthX, 0.95))} fill={C.paper} fillOpacity={0.6} stroke={C.blue} strokeWidth={2.2} />
        <polygon points={poly(ring(throatX, 0.18))} fill="none" stroke={C.blue} strokeWidth={2} />
      </g>
      {badgeOpacity &&
        [1, 2, 3, 4, 5, 6, 7].map((n) => {
          const a = partAnchor(n, e, showCairn);
          if (!a) return null;
          const [x, y] = iso(a);
          return (
            <g key={n} opacity={badgeOpacity(n)}>
              <circle cx={x} cy={y} r={17} fill={C.paper} stroke={C.blue} strokeWidth={2} />
              <text x={x} y={y + 7} textAnchor="middle" fontFamily={SERIF} fontSize={20} fill={C.blue}>
                {n}
              </text>
            </g>
          );
        })}
    </g>
  );
};
