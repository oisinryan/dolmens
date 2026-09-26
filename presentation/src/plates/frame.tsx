import React from "react";
import { AbsoluteFill } from "remotion";
import { C, EVIDENCE_COLOUR, Evidence, SANS, SERIF } from "../theme";
import { MERCATOR } from "../ireland";

export const PLATE_COUNT = 8;

/**
 * A static report plate: the white-paper counterpart of one of ChatGPT's slide-image prompts
 * (chatgpt/analysis-code.md, "Slide image" 1–8 and 10). Nothing animates; render any frame.
 */
export const PlateFrame: React.FC<{ n: number; title: string; subtitle: string; footer: string; evidence?: Evidence[]; children: React.ReactNode }> = ({
  n,
  title,
  subtitle,
  footer,
  evidence = [],
  children,
}) => (
  <AbsoluteFill style={{ background: C.paper, fontFamily: SANS, color: C.ink, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 90, right: 90, top: 40, display: "flex", justifyContent: "space-between", fontSize: 15, letterSpacing: 1.8, textTransform: "uppercase", color: C.ink2 }}>
      <span>Neolithic Acoustic Signal Network · Figure plates</span>
      <span>
        Plate {n} of {PLATE_COUNT}
      </span>
    </div>
    <div style={{ position: "absolute", left: 90, right: 90, top: 70, height: 1.5, background: C.ink }} />
    <div style={{ position: "absolute", left: 90, right: 90, top: 96, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
          <span style={{ fontFamily: SERIF, fontSize: 50, color: C.blue }}>{n}</span>
          <span style={{ fontFamily: SERIF, fontSize: 50, letterSpacing: -0.5 }}>{title}</span>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 25, color: C.ink2, marginTop: 4, marginLeft: 50 }}>{subtitle}</div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        {evidence.map((e) => (
          <span key={e} style={{ fontWeight: 600, fontSize: 15, letterSpacing: 2.5, color: EVIDENCE_COLOUR[e], border: `1.5px solid ${EVIDENCE_COLOUR[e]}`, padding: "5px 12px 4px" }}>
            {e}
          </span>
        ))}
      </div>
    </div>
    {children}
    <div style={{ position: "absolute", left: 90, right: 90, bottom: 32, borderTop: `1px solid ${C.rule}`, paddingTop: 11, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: C.ink2 }}>{footer}</span>
      <span style={{ fontFamily: SERIF, fontSize: 19, color: C.ink2 }}>Plate {n}</span>
    </div>
  </AbsoluteFill>
);

export const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = C.ink2, style }) => (
  <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: 2, textTransform: "uppercase", color, ...style }}>{children}</div>
);

/** a titled, ruled panel */
export const Panel: React.FC<{ title: string; children: React.ReactNode; style?: React.CSSProperties; accent?: string; fill?: string }> = ({ title, children, style, accent = C.rule, fill = C.paper }) => (
  <div style={{ border: `1.5px solid ${accent}`, background: fill, padding: "16px 20px", ...style }}>
    <Kicker color={accent === C.rule ? C.ink2 : accent}>{title}</Kicker>
    <div style={{ marginTop: 10 }}>{children}</div>
  </div>
);

/** numbered point, 1., 2., 3. in serif */
export const Numbered: React.FC<{ n: number; children: React.ReactNode; size?: number }> = ({ n, children, size = 21 }) => (
  <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
    <span style={{ fontFamily: SERIF, fontSize: size + 3, color: C.blue, width: 18, flexShrink: 0 }}>{n}</span>
    <span style={{ fontSize: size, lineHeight: 1.4 }}>{children}</span>
  </div>
);

/** map pixels per km at a latitude, from the same Mercator as the outline */
export const mapPxPerKm = (lat = 53.5) => ((MERCATOR.scale * Math.PI) / 180) / (111.32 * Math.cos((lat * Math.PI) / 180));

/** a 250–500 Hz carrier chopped into pulses, drawn as a line in a w × h box */
export const pulseWave = (w: number, h: number, pulses: [number, number][], span: number, cycles = 70) =>
  Array.from({ length: 900 }, (_, i) => {
    const t = (i / 899) * span;
    const on = pulses.some(([s, d]) => t >= s && t <= s + d);
    const y = h / 2 - (on ? Math.sin(t * cycles) * (h / 2 - 4) : 0);
    return `${i ? "L" : "M"}${((t / span) * w).toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
