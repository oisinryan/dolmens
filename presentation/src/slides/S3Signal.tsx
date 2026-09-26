import React from "react";
import { useCurrentFrame } from "remotion";
import { C, Evidence, EVIDENCE_COLOUR, SANS } from "../theme";
import { Caption, FadeUp, Label, SlideFrame, ease } from "../ui";

const STAGES: { name: string; sub: string; text: string; ev: Evidence }[] = [
  { name: "Transmitter", sub: "Horn or conch", text: "Lip-reed horn. Neolithic shell trumpets are known in Europe.", ev: "DOCUMENTED" },
  { name: "Propagation", sub: "250–500 Hz", text: "Kilometre-scale spreading; terrain, wind and vegetation decide.", ev: "MODELLED" },
  { name: "Collector", sub: "Passive listening horn", text: "Concentrates sound at its throat: +3 to +12 dB tested.", ev: "HYPOTHETICAL" },
  { name: "Portal", sub: "Aperture", text: "Couples the collector's throat into the chamber.", ev: "HYPOTHETICAL" },
  { name: "Chamber", sub: "Stone volume", text: "Enclosed, massive and quiet: a good place to listen.", ev: "MODELLED" },
  { name: "Listener", sub: "Relay operator", text: "Detects, counts and repeats the pulses onward.", ev: "HYPOTHETICAL" },
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
    <SlideFrame n={3} kicker="Signalling principle" title="From horn to listener" evidence={["MODELLED", "HYPOTHETICAL"]}>
      <svg width={1920} height={760} style={{ position: "absolute", left: 0, top: 165 }} viewBox="0 100 1920 760">
        <defs>
          <pattern id="hatch" width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={10} stroke={C.rule} strokeWidth={1.5} />
          </pattern>
          <clipPath id="field">
            <rect x={HORN_X + 150} y={Y - 210} width={MOUTH_X - HORN_X - 150} height={420} />
          </clipPath>
        </defs>

        {/* ground section */}
        <path
          d="M90 640 C 240 600, 330 560, 450 590 S 640 520, 760 570 S 930 610, 1040 580 S 1260 560, 1400 600 S 1650 590, 1830 610 L1830 648 L90 648 Z"
          fill="url(#hatch)"
          stroke={C.ink2}
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
                stroke={C.signal}
                strokeWidth={2.5}
                opacity={0.9 * (1 - p * 0.7)}
              />
            );
          })}
        </g>
        <text x={620} y={250} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={19} fill={C.signal} letterSpacing={2} opacity={waves}>
          B  250–500 Hz CARRIER, SLOW PULSES
        </text>
        <text x={620} y={280} textAnchor="middle" fontFamily={SANS} fontSize={18} fill={C.ink2} opacity={waves}>
          wavelength 0.7–1.4 m · hops of 1–5 km
        </text>

        {/* transmitter horn */}
        <g opacity={draw} transform={`translate(${HORN_X}, ${Y})`}>
          <path d="M-60 -7 L40 -10 Q100 -16 150 -58 L150 58 Q100 16 40 10 L-60 7 Z" fill={C.signalTint} stroke={C.ink} strokeWidth={2} />
          <ellipse cx={150} cy={0} rx={12} ry={58} fill={C.paper} stroke={C.ink} strokeWidth={2} />
        </g>

        {/* collector horn, mouth facing the source */}
        <g opacity={draw}>
          <path d={`M1300 ${Y - 16} Q1190 ${Y - 24} ${MOUTH_X} ${Y - 120} L${MOUTH_X} ${Y + 120} Q1190 ${Y + 24} 1300 ${Y + 16} Z`} fill={C.blueTint} stroke={C.blue} strokeWidth={2} fillOpacity={0.6 + 0.4 * arrival} />
          <ellipse cx={MOUTH_X} cy={Y} rx={16} ry={120} fill={C.paper} stroke={C.blue} strokeWidth={2} />
        </g>

        {/* portal and chamber in section */}
        <g opacity={ease(frame, 20, 30)}>
          <rect x={1300} y={Y - 110} width={34} height={92} fill={C.stoneSide} stroke={C.ink} strokeWidth={2} />
          <rect x={1300} y={Y + 18} width={34} height={122} fill={C.stoneSide} stroke={C.ink} strokeWidth={2} />
          <path d={`M1290 ${Y - 118} L1590 ${Y - 92} L1590 ${Y - 66} L1290 ${Y - 92} Z`} fill={C.stoneSide} stroke={C.ink} strokeWidth={2} />
          <rect x={1334} y={Y - 84} width={236} height={224} fill="none" stroke={C.faint} strokeWidth={1.5} strokeDasharray="6 6" />
          <rect x={1570} y={Y - 84} width={26} height={224} fill={C.stoneSide} stroke={C.ink} strokeWidth={2} />
          <path
            d={Array.from({ length: 41 }, (_, i) => {
              const x = 1334 + (i / 40) * 236;
              const y = Y + 28 + Math.sin((i / 40) * Math.PI) * 60 * Math.cos((frame / 60) * Math.PI * 4) * waves;
              return `${i ? "L" : "M"}${x} ${y}`;
            }).join(" ")}
            fill="none"
            stroke={C.blue}
            strokeWidth={2.5}
          />
        </g>

        {/* listener */}
        <g opacity={ease(frame, 30, 30)} transform={`translate(1700, ${Y + 10})`}>
          <circle cx={0} cy={-40} r={34} fill={C.paper} stroke={C.ink} strokeWidth={2} />
          <path d="M-60 60 Q-60 10 0 10 Q60 10 60 60" fill={C.paper} stroke={C.ink} strokeWidth={2} />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${-50 - i * 16} -62 Q${-66 - i * 16} -40 ${-50 - i * 16} -18`} fill="none" stroke={C.signal} strokeWidth={2} opacity={arrival * (1 - i * 0.28)} />
          ))}
        </g>

        {[
          [HORN_X + 50, "A  Horn"],
          [MOUTH_X + 90, "C  Collector"],
          [1452, "E  Chamber"],
          [1700, "F  Listener"],
        ].map(([x, l]) => (
          <text key={l} x={x} y={Y - 150} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={18} letterSpacing={1.5} fill={C.ink} opacity={draw}>
            {l}
          </text>
        ))}
        <text x={1317} y={Y + 172} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={18} letterSpacing={1.5} fill={C.ink} opacity={draw}>
          D  Portal
        </text>
      </svg>

      <FadeUp start={50} style={{ position: "absolute", left: 90, top: 734 }}>
        <Caption n="Figure 3">The proposed signalling chain, in section. Information travels as slow, repeated pulses to be detected and counted, not as speech.</Caption>
      </FadeUp>
      <div style={{ position: "absolute", left: 90, right: 90, top: 800, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 22 }}>
        {STAGES.map((s, i) => (
          <FadeUp key={s.name} start={60 + i * 7}>
            <div style={{ borderTop: `1.5px solid ${C.ink}`, paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 23, fontWeight: 600 }}>
                  <span style={{ color: C.blue, marginRight: 12 }}>{"ABCDEF"[i]}</span>
                  {s.name}
                </span>
              </div>
              <Label style={{ fontSize: 13, marginTop: 2, color: EVIDENCE_COLOUR[s.ev] }}>
                {s.sub} · {s.ev}
              </Label>
              <div style={{ fontSize: 18, color: C.ink2, marginTop: 8, lineHeight: 1.4 }}>{s.text}</div>
            </div>
          </FadeUp>
        ))}
      </div>
    </SlideFrame>
  );
};
