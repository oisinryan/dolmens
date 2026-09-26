import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, EVIDENCE_COLOUR, Evidence, MONO, SANS, SERIF } from "./theme";
import { IRELAND_PATH, MAP_H, MAP_W } from "./ireland";

export const SLIDE_COUNT = 8;
export const REPORT = "Neolithic Acoustic Signal Network · Engineering concept report";

/** 0→1 over [start, start+dur] frames, eased */
export const ease = (frame: number, start: number, dur = 24) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0.7, 0.2, 1) });

/** fade and rise in, starting at `start` */
export const FadeUp: React.FC<{ start: number; children: React.ReactNode; style?: React.CSSProperties; dy?: number }> = ({ start, children, style, dy = 14 }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, start);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * dy}px)`, ...style }}>{children}</div>;
};

/** evidence status, printed like a classification stamp */
export const EvidenceTag: React.FC<{ kind: Evidence; style?: React.CSSProperties }> = ({ kind, style }) => {
  const c = EVIDENCE_COLOUR[kind];
  return (
    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15, letterSpacing: 2.5, color: c, border: `1.5px solid ${c}`, padding: "5px 12px 4px", whiteSpace: "nowrap", ...style }}>
      {kind}
    </span>
  );
};

export const Label: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = C.ink2, style }) => (
  <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15, letterSpacing: 2, color, textTransform: "uppercase", ...style }}>{children}</div>
);

/** a numbered figure or table caption */
export const Caption: React.FC<{ n: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ n, children, style }) => (
  <div style={{ fontFamily: SANS, fontSize: 18, lineHeight: 1.45, color: C.ink2, ...style }}>
    <span style={{ fontWeight: 600, color: C.ink }}>{n}. </span>
    {children}
  </div>
);

/** a ruled box, used sparingly for callouts */
export const Box: React.FC<{ style?: React.CSSProperties; children: React.ReactNode; accent?: string; fill?: string }> = ({ style, children, accent = C.rule, fill = C.paper }) => (
  <div style={{ background: fill, border: `1.5px solid ${accent}`, padding: "22px 26px", ...style }}>{children}</div>
);

/** the report page every slide sits on: running header, section heading, footer with page number */
export const SlideFrame: React.FC<{
  n: number;
  kicker: string;
  title: string;
  evidence?: Evidence[];
  children: React.ReactNode;
}> = ({ n, kicker, title, evidence = [], children }) => {
  const frame = useCurrentFrame();
  const rule = ease(frame, 0, 36);
  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: SANS, color: C.ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 42, display: "flex", justifyContent: "space-between", fontSize: 15, letterSpacing: 1.8, textTransform: "uppercase", color: C.ink2 }}>
        <span>{REPORT}</span>
        <span>
          Section {n} · {kicker}
        </span>
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 72, height: 1.5, background: C.ink, transformOrigin: "left", transform: `scaleX(${rule})` }} />
      <div style={{ position: "absolute", left: 90, right: 90, top: 104, display: "flex", alignItems: "baseline", gap: 26 }}>
        <FadeUp start={4} style={{ display: "flex", alignItems: "baseline", gap: 26, flex: 1 }}>
          <span style={{ fontFamily: SERIF, fontSize: 54, color: C.blue, fontVariantNumeric: "lining-nums" }}>{n}</span>
          <span style={{ fontFamily: SERIF, fontSize: 54, letterSpacing: -0.5 }}>{title}</span>
        </FadeUp>
        <div style={{ display: "flex", gap: 10 }}>
          {evidence.map((e, i) => (
            <FadeUp key={e} start={12 + i * 4} dy={6}>
              <EvidenceTag kind={e} />
            </FadeUp>
          ))}
        </div>
      </div>
      {children}
      <div style={{ position: "absolute", left: 90, right: 90, bottom: 34, borderTop: `1px solid ${C.rule}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: C.faint }}>A speculative engineering model. Nothing here is established archaeology.</span>
        <span style={{ fontFamily: SERIF, fontSize: 20, color: C.ink2 }}>{n}</span>
      </div>
    </AbsoluteFill>
  );
};

/** the island outline, scaled to `width`; children draw in map pixel space */
export const IrelandMap: React.FC<{ width: number; reveal?: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ width, reveal = 1, children, style }) => {
  const height = (width / MAP_W) * MAP_H;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ overflow: "visible", ...style }}>
      <path d={IRELAND_PATH} fill={C.land} fillOpacity={reveal} stroke={C.landEdge} strokeWidth={1.4} strokeOpacity={0.3 + 0.7 * reveal} strokeLinejoin="round" />
      {children}
    </svg>
  );
};

/** expanding rings; `phase` 0..1 loops, so callers use (frame % period) / period */
export const Rings: React.FC<{ x: number; y: number; phase: number; r: number; color: string; count?: number; width?: number }> = ({ x, y, phase, r, color, count = 3, width = 1.5 }) => (
  <g>
    {Array.from({ length: count }, (_, i) => {
      const p = (phase + i / count) % 1;
      return <circle key={i} cx={x} cy={y} r={p * r} fill="none" stroke={color} strokeWidth={width} opacity={(1 - p) * 0.7} />;
    })}
  </g>
);

export const fmt = (x: number, d = 2) => x.toFixed(d);
export { MONO };
