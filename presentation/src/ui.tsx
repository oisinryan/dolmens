import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, EVIDENCE_COLOUR, Evidence, FONT, H, MONO, W } from "./theme";
import { IRELAND_PATH, MAP_H, MAP_W } from "./ireland";

export const SLIDE_COUNT = 8;

/** 0→1 over [start, start+dur] frames, eased */
export const ease = (frame: number, start: number, dur = 24) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0.7, 0.2, 1) });

/** fade and rise in, starting at `start` */
export const FadeUp: React.FC<{ start: number; children: React.ReactNode; style?: React.CSSProperties; dy?: number }> = ({ start, children, style, dy = 24 }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, start);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * dy}px)`, ...style }}>{children}</div>;
};

export const EvidenceTag: React.FC<{ kind: Evidence; style?: React.CSSProperties }> = ({ kind, style }) => {
  const c = EVIDENCE_COLOUR[kind];
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 18,
        letterSpacing: 3,
        color: c,
        border: `1.5px solid ${c}`,
        padding: "6px 14px 5px",
        borderRadius: 3,
        background: `${c}14`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {kind}
    </span>
  );
};

const Grid: React.FC = () => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <pattern id="grid" width={60} height={60} patternUnits="userSpaceOnUse">
        <path d="M60 0H0V60" fill="none" stroke={C.grid} strokeWidth={1} />
      </pattern>
      <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
        <stop offset="0%" stopColor="#0c1a20" />
        <stop offset="100%" stopColor={C.bg} />
      </radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#vignette)" />
    <rect width={W} height={H} fill="url(#grid)" />
  </svg>
);

/** background, header, evidence tags and footer shared by every slide */
export const SlideFrame: React.FC<{
  n: number;
  kicker: string;
  title: string;
  evidence?: Evidence[];
  children: React.ReactNode;
}> = ({ n, kicker, title, evidence = [], children }) => {
  const frame = useCurrentFrame();
  const line = ease(frame, 0, 40);
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT, color: C.text, overflow: "hidden" }}>
      <Grid />
      <div style={{ position: "absolute", left: 90, top: 64, right: 90 }}>
        <FadeUp start={2} dy={12}>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: 5, color: C.cyan }}>
            {String(n).padStart(2, "0")} / {String(SLIDE_COUNT).padStart(2, "0")} · {kicker.toUpperCase()}
          </div>
        </FadeUp>
        <FadeUp start={6}>
          <div style={{ fontSize: 64, fontWeight: 300, letterSpacing: -0.5, marginTop: 14 }}>{title}</div>
        </FadeUp>
        <div style={{ height: 2, marginTop: 22, width: `${line * 100}%`, background: `linear-gradient(90deg, ${C.orange} 0 90px, ${C.line} 90px)` }} />
        <div style={{ position: "absolute", right: 0, top: 0, display: "flex", gap: 12 }}>
          {evidence.map((e, i) => (
            <FadeUp key={e} start={14 + i * 4} dy={8}>
              <EvidenceTag kind={e} />
            </FadeUp>
          ))}
        </div>
      </div>
      {children}
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          bottom: 38,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: MONO,
          fontSize: 16,
          letterSpacing: 3,
          color: C.faint,
        }}
      >
        <span>NEOLITHIC ACOUSTIC SIGNAL NETWORK</span>
        <span>SPECULATIVE ENGINEERING MODEL · NOT ESTABLISHED ARCHAEOLOGY</span>
      </div>
    </AbsoluteFill>
  );
};

export const Panel: React.FC<{ style?: React.CSSProperties; children: React.ReactNode; accent?: string }> = ({ style, children, accent = C.line }) => (
  <div style={{ background: C.panel, border: `1.5px solid ${accent}`, borderRadius: 6, padding: "26px 30px", ...style }}>{children}</div>
);

export const Label: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = C.dim, style }) => (
  <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: 3, color, textTransform: "uppercase", ...style }}>{children}</div>
);

/** the island outline, scaled to `width`; children draw in map pixel space */
export const IrelandMap: React.FC<{ width: number; reveal?: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ width, reveal = 1, children, style }) => {
  const height = (width / MAP_W) * MAP_H;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ overflow: "visible", ...style }}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={IRELAND_PATH} fill={C.land} fillOpacity={reveal} stroke={C.landEdge} strokeWidth={1.6} strokeOpacity={0.4 + 0.6 * reveal} strokeLinejoin="round" />
      {children}
    </svg>
  );
};

/** expanding rings; `phase` 0..1 loops, so callers use (frame % period) / period */
export const Rings: React.FC<{ x: number; y: number; phase: number; r: number; color: string; count?: number; width?: number }> = ({ x, y, phase, r, color, count = 3, width = 2 }) => (
  <g>
    {Array.from({ length: count }, (_, i) => {
      const p = (phase + i / count) % 1;
      return <circle key={i} cx={x} cy={y} r={p * r} fill="none" stroke={color} strokeWidth={width} opacity={(1 - p) * 0.8} />;
    })}
  </g>
);

export const fmt = (x: number, d = 2) => x.toFixed(d);
