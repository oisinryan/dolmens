import React from "react";
import { useCurrentFrame } from "remotion";
import { C, Evidence, EVIDENCE_COLOUR, MONO } from "../theme";
import { FadeUp, Label, SlideFrame, ease } from "../ui";

const STAGES: { name: string; sub: string; text: string; ev: Evidence }[] = [
  { name: "Transmitter", sub: "horn / conch", text: "Lip-reed horn. Neolithic shell trumpets are known in Europe.", ev: "DOCUMENTED" },
  { name: "Propagation", sub: "250–500 Hz", text: "Kilometre-scale spreading; terrain, wind and vegetation decide.", ev: "MODELLED" },
  { name: "Collector", sub: "passive listening horn", text: "Concentrates sound at its throat: +3 to +12 dB tested.", ev: "HYPOTHETICAL" },
  { name: "Portal", sub: "aperture", text: "Couples the collector's throat into the chamber.", ev: "HYPOTHETICAL" },
  { name: "Chamber", sub: "stone volume", text: "Enclosed, massive, quiet: a high signal-to-noise listening post.", ev: "MODELLED" },
  { name: "Listener", sub: "relay operator", text: "Detects, counts and repeats pulses onward.", ev: "HYPOTHETICAL" },
];

const Y = 470;
const HORN_X = 170;
const MOUTH_X = 1090;

export const S3Signal: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = ease(frame, 8, 40);
  const waves = ease(frame, 40, 30);
  const cycle = (frame % 60) / 60;
  const arrival = Math.max(0, Math.cos(cycle * Math.PI * 2 * 3)) * waves;
  return (
    <SlideFrame n={3} kicker="Signalling principle" title="Horn → landscape → collector → chamber → listener" evidence={["MODELLED", "HYPOTHETICAL"]}>
      <svg width={1920} height={760} style={{ position: "absolute", left: 0, top: 200 }} viewBox="0 100 1920 760">
        <defs>
          <linearGradient id="terrain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.teal} stopOpacity={0.28} />
            <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
          </linearGradient>
          <clipPath id="field">
            <rect x={HORN_X + 150} y={Y - 210} width={MOUTH_X - HORN_X - 150} height={420} />
          </clipPath>
        </defs>

        {/* terrain */}
        <path
          d="M90 640 C 240 600, 330 560, 450 590 S 640 520, 760 570 S 930 610, 1040 580 S 1260 560, 1400 600 S 1650 590, 1830 610 L1830 672 L90 672 Z"
          fill="url(#terrain)"
          stroke={C.teal}
          strokeWidth={1.5}
          opacity={draw}
        />

        {/* wavefronts */}
        <g clipPath="url(#field)" opacity={waves}>
          {[0, 1, 2].map((i) => {
            const p = (cycle + i / 3) % 1;
            const r = 160 + p * (MOUTH_X - HORN_X - 160);
            const a = 0.42;
            const x0 = HORN_X + 150;
            return (
              <path
                key={i}
                d={`M ${x0 + r * Math.cos(a)} ${Y - r * Math.sin(a)} A ${r} ${r} 0 0 1 ${x0 + r * Math.cos(a)} ${Y + r * Math.sin(a)}`}
                fill="none"
                stroke={C.orange}
                strokeWidth={3}
                opacity={0.9 * (1 - p * 0.75)}
              />
            );
          })}
        </g>
        <text x={620} y={250} textAnchor="middle" fontFamily={MONO} fontSize={20} fill={C.orange} letterSpacing={3} opacity={waves}>
          250–500 Hz CARRIER · SLOW PULSES
        </text>
        <text x={620} y={282} textAnchor="middle" fontFamily={MONO} fontSize={17} fill={C.dim} letterSpacing={2} opacity={waves}>
          λ ≈ 0.7–1.4 m · 1–5 km hops
        </text>

        {/* transmitter horn */}
        <g opacity={draw} transform={`translate(${HORN_X}, ${Y})`}>
          <path d="M-60 -7 L40 -10 Q100 -16 150 -58 L150 58 Q100 16 40 10 L-60 7 Z" fill="rgba(255,138,61,0.14)" stroke={C.orange} strokeWidth={2.5} />
          <ellipse cx={150} cy={0} rx={12} ry={58} fill="none" stroke={C.orange} strokeWidth={2.5} />
        </g>

        {/* collector horn (mouth facing the source) */}
        <g opacity={draw}>
          <path
            d={`M1300 ${Y - 16} Q1190 ${Y - 24} ${MOUTH_X} ${Y - 120} L${MOUTH_X} ${Y + 120} Q1190 ${Y + 24} 1300 ${Y + 16} Z`}
            fill={`rgba(63,224,208,${0.08 + 0.18 * arrival})`}
            stroke={C.cyan}
            strokeWidth={2.5}
          />
          <ellipse cx={MOUTH_X} cy={Y} rx={16} ry={120} fill="none" stroke={C.cyan} strokeWidth={2.5} />
        </g>

        {/* portal and chamber */}
        <g opacity={ease(frame, 20, 30)}>
          <rect x={1300} y={Y - 110} width={34} height={92} fill={C.bg2} stroke={C.text} strokeWidth={2} />
          <rect x={1300} y={Y + 18} width={34} height={122} fill={C.bg2} stroke={C.text} strokeWidth={2} />
          <path d={`M1290 ${Y - 118} L1590 ${Y - 92} L1590 ${Y - 66} L1290 ${Y - 92} Z`} fill="#16262c" stroke={C.text} strokeWidth={2} />
          <rect x={1334} y={Y - 84} width={236} height={224} fill="rgba(63,224,208,0.05)" stroke={C.faint} strokeWidth={1.5} strokeDasharray="6 6" />
          <rect x={1570} y={Y - 84} width={26} height={224} fill={C.bg2} stroke={C.text} strokeWidth={2} />
          {/* standing wave */}
          <path
            d={Array.from({ length: 41 }, (_, i) => {
              const x = 1334 + (i / 40) * 236;
              const y = Y + 28 + Math.sin((i / 40) * Math.PI) * 60 * Math.cos((frame / 60) * Math.PI * 4) * waves;
              return `${i ? "L" : "M"}${x} ${y}`;
            }).join(" ")}
            fill="none"
            stroke={C.cyan}
            strokeWidth={2.5}
          />
        </g>

        {/* listener */}
        <g opacity={ease(frame, 30, 30)} transform={`translate(1700, ${Y + 10})`}>
          <circle cx={0} cy={-40} r={34} fill="none" stroke={C.text} strokeWidth={2.5} />
          <path d="M-60 60 Q-60 10 0 10 Q60 10 60 60" fill="none" stroke={C.text} strokeWidth={2.5} />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${-50 - i * 16} -62 Q${-66 - i * 16} -40 ${-50 - i * 16} -18`} fill="none" stroke={C.cyan} strokeWidth={2} opacity={arrival * (1 - i * 0.28)} />
          ))}
        </g>

        {[
          [HORN_X + 50, "HORN"],
          [MOUTH_X + 90, "COLLECTOR"],
          [1452, "CHAMBER"],
          [1700, "LISTENER"],
        ].map(([x, l]) => (
          <text key={l} x={x} y={Y - 150} textAnchor="middle" fontFamily={MONO} fontSize={18} letterSpacing={3} fill={C.dim} opacity={draw}>
            {l}
          </text>
        ))}
        <text x={1317} y={Y + 172} textAnchor="middle" fontFamily={MONO} fontSize={18} letterSpacing={3} fill={C.dim} opacity={draw}>
          PORTAL
        </text>
      </svg>

      <div style={{ position: "absolute", left: 90, right: 90, top: 790, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 18 }}>
        {STAGES.map((s, i) => (
          <FadeUp key={s.name} start={60 + i * 7}>
            <div style={{ borderTop: `2px solid ${EVIDENCE_COLOUR[s.ev]}`, paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 26 }}>{s.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: EVIDENCE_COLOUR[s.ev] }}>{s.ev}</span>
              </div>
              <Label style={{ fontSize: 15, marginTop: 4 }}>{s.sub}</Label>
              <div style={{ fontSize: 19, color: C.dim, marginTop: 10, lineHeight: 1.4 }}>{s.text}</div>
            </div>
          </FadeUp>
        ))}
      </div>
    </SlideFrame>
  );
};
