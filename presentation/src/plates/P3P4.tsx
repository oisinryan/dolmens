import React from "react";
import { C, SANS, SERIF } from "../theme";
import { Numbered, Panel, PlateFrame, pulseWave } from "./frame";

const Y = 430;

export const P3Signal: React.FC = () => (
  <PlateFrame n={3} title="Signalling Principle" subtitle="Horn transmitter, passive listening system and resonant chamber" footer="Side section, not to scale. Distances follow the report's cluster hops." evidence={["MODELLED", "HYPOTHETICAL"]}>
    <svg width={1330} height={560} style={{ position: "absolute", left: 60, top: 215 }} viewBox="0 150 1330 560">
      <defs>
        <pattern id="p3hatch" width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={10} stroke={C.rule} strokeWidth={1.5} />
        </pattern>
      </defs>
      <path d="M20 600 C 180 590, 260 540, 380 560 S 560 500, 680 540 S 860 580, 960 556 S 1160 560, 1320 580 L1320 640 L20 640 Z" fill="url(#p3hatch)" stroke={C.ink2} strokeWidth={1.5} />

      {/* transmitting site: a person sounding a horn */}
      <g transform="translate(120, 0)">
        <circle cx={0} cy={Y - 62} r={22} fill={C.paper} stroke={C.ink} strokeWidth={2} />
        <path d={`M-6 ${Y - 40} L-10 ${Y + 60} M-10 ${Y + 60} L-30 ${Y + 170} M-10 ${Y + 60} L14 ${Y + 170} M-6 ${Y - 20} L40 ${Y - 55}`} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        <path d={`M16 ${Y - 60} Q60 ${Y - 66} 104 ${Y - 104} L112 ${Y - 30} Q66 ${Y - 52} 18 ${Y - 52} Z`} fill={C.signalTint} stroke={C.ink} strokeWidth={2} />
      </g>
      {[0, 1, 2, 3].map((i) => {
        const r = 120 + i * 150;
        const x0 = 240;
        const a = Math.min(0.34, Math.asin(120 / r));
        return <path key={i} d={`M ${x0 + r * Math.cos(a)} ${Y - 66 - r * Math.sin(a)} A ${r} ${r} 0 0 1 ${x0 + r * Math.cos(a)} ${Y - 66 + r * Math.sin(a)}`} fill="none" stroke={C.signal} strokeWidth={2.2} opacity={1 - i * 0.18} />;
      })}

      {/* receiving site */}
      <path d={`M1010 ${Y - 16} Q920 ${Y - 22} 840 ${Y - 104} L840 ${Y + 104} Q920 ${Y + 22} 1010 ${Y + 16} Z`} fill={C.blueTint} stroke={C.blue} strokeWidth={2} />
      <ellipse cx={840} cy={Y} rx={14} ry={104} fill={C.paper} stroke={C.blue} strokeWidth={2} />
      <rect x={1010} y={Y - 100} width={30} height={84} fill={C.stoneSide} stroke={C.ink} strokeWidth={2} />
      <rect x={1010} y={Y + 16} width={30} height={124} fill={C.stoneSide} stroke={C.ink} strokeWidth={2} />
      <path d={`M1000 ${Y - 108} L1270 ${Y - 84} L1270 ${Y - 60} L1000 ${Y - 84} Z`} fill={C.stoneSide} stroke={C.ink} strokeWidth={2} />
      <rect x={1040} y={Y - 76} width={210} height={216} fill="none" stroke={C.faint} strokeDasharray="6 6" />
      <rect x={1250} y={Y - 76} width={24} height={216} fill={C.stoneSide} stroke={C.ink} strokeWidth={2} />
      <path d={Array.from({ length: 41 }, (_, i) => `${i ? "L" : "M"}${1040 + (i / 40) * 210} ${Y + 30 + Math.sin((i / 40) * Math.PI) * 50}`).join(" ")} fill="none" stroke={C.blue} strokeWidth={2.2} />
      <circle cx={1130} cy={Y - 14} r={20} fill={C.paper} stroke={C.ink} strokeWidth={2} />
      <path d={`M1100 ${Y + 60} Q1100 ${Y + 8} 1130 ${Y + 8} Q1160 ${Y + 8} 1160 ${Y + 60}`} fill={C.paper} stroke={C.ink} strokeWidth={2} />

      <g fontFamily={SANS} fontWeight={600} fontSize={20} fill={C.ink}>
        <text x={120} y={Y - 150} textAnchor="middle">
          Horn transmitter
        </text>
        <text x={560} y={Y - 230} textAnchor="middle" fill={C.signal}>
          Acoustic path: relay hops of about 1–5 km
        </text>
        <text x={560} y={Y - 202} textAnchor="middle" fontWeight={400} fontSize={17} fill={C.ink2}>
          250–500 Hz wavefronts over real terrain
        </text>
        <text x={884} y={Y - 140} textAnchor="start" fill={C.blue}>
          Passive listening horn
        </text>
        <text x={1150} y={Y - 120} textAnchor="middle">
          Resonant stone chamber
        </text>
        <text x={1150} y={Y + 175} textAnchor="middle" fontWeight={400} fontSize={17} fill={C.ink2}>
          listener inside
        </text>
      </g>
    </svg>

    <div style={{ position: "absolute", left: 90, right: 540, top: 800, display: "flex", alignItems: "center", gap: 12, fontFamily: SERIF, fontSize: 25 }}>
      {["Transmitter", "Landscape", "Collector", "Chamber", "Listener"].map((s, i) => (
        <React.Fragment key={s}>
          <span style={{ border: `1.5px solid ${i === 1 ? C.signal : i === 2 ? C.blue : C.ink}`, padding: "10px 18px", color: i === 1 ? C.signal : i === 2 ? C.blue : C.ink }}>{s}</span>
          {i < 4 && <span style={{ color: C.faint }}>→</span>}
        </React.Fragment>
      ))}
    </div>

    <div style={{ position: "absolute", left: 1440, right: 90, top: 225, display: "flex", flexDirection: "column", gap: 20 }}>
      <Panel title="Key points">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Numbered n={1} size={20}>
            Best experimental carrier band: about 250–500 Hz.
          </Numbered>
          <Numbered n={2} size={20}>
            Message type: repeated low and high pulse sequences.
          </Numbered>
          <Numbered n={3} size={20}>
            Aim: reliable detection, not speech intelligibility.
          </Numbered>
        </div>
      </Panel>
      <Panel title="Pulse bursts">
        <svg width={350} height={120}>
          <line x1={0} y1={60} x2={350} y2={60} stroke={C.grid} />
          <path d={pulseWave(350, 120, [[0.1, 0.8], [2.1, 0.3], [2.7, 0.3], [3.3, 0.3]], 4, 70)} fill="none" stroke={C.signal} strokeWidth={1.3} />
        </svg>
        <div style={{ fontSize: 16, color: C.ink2, marginTop: 6 }}>One long low pulse, a pause, then three short high pulses: about 3.6 s.</div>
      </Panel>
    </div>
  </PlateFrame>
);

/* ---------------- plate 4 ---------------- */
const BENCH: [string, number, number][] = [
  ["none", 0, 2.3],
  ["+3 dB", 3, 3.25],
  ["+6 dB", 6, 4.59],
  ["+9 dB", 9, 6.48],
  ["+12 dB", 12, 9.16],
];
const CW = 960;
const CH = 560;
const px = (g: number) => (g / 12) * CW;
const py = (km: number) => CH - (km / 10) * CH;

export const P4Range: React.FC = () => (
  <PlateFrame n={4} title="Range Model" subtitle="How passive receiver gain changes viable signalling distance" footer="Spherical spreading only; air absorption, terrain, wind and vegetation will shorten every range." evidence={["MODELLED"]}>
    <div style={{ position: "absolute", left: 180, top: 250 }}>
      <svg width={CW + 60} height={CH + 90} style={{ overflow: "visible" }}>
        {[0, 3, 6, 9, 12].map((g) => (
          <g key={g}>
            <line x1={px(g)} x2={px(g)} y1={0} y2={CH} stroke={C.grid} />
            <text x={px(g)} y={CH + 32} textAnchor="middle" fontFamily={SANS} fontSize={19} fill={C.ink2}>
              {g ? `+${g} dB` : "none"}
            </text>
          </g>
        ))}
        {[0, 2, 4, 6, 8, 10].map((k) => (
          <g key={k}>
            <line x1={0} x2={CW} y1={py(k)} y2={py(k)} stroke={C.grid} />
            <text x={-14} y={py(k) + 6} textAnchor="end" fontFamily={SANS} fontSize={19} fill={C.ink2}>
              {k}
            </text>
          </g>
        ))}
        <line x1={0} x2={CW} y1={CH} y2={CH} stroke={C.ink} strokeWidth={1.5} />
        <line x1={0} x2={0} y1={0} y2={CH} stroke={C.ink} strokeWidth={1.5} />
        <text x={CW / 2} y={CH + 70} textAnchor="middle" fontFamily={SANS} fontSize={19} fill={C.ink}>
          Receiver improvement (passive gain)
        </text>
        <text x={-62} y={CH / 2} textAnchor="middle" fontFamily={SANS} fontSize={19} fill={C.ink} transform={`rotate(-90 -62 ${CH / 2})`}>
          Estimated range, km
        </text>
        <line x1={0} x2={CW} y1={py(4.671)} y2={py(4.671)} stroke={C.signal} strokeWidth={1.5} strokeDasharray="7 6" />
        <text x={CW - 4} y={py(4.671) - 10} textAnchor="end" fontFamily={SANS} fontSize={18} fill={C.signal}>
          Hardest cluster hop: Slieve Gullion 4.67 km
        </text>
        <path d={Array.from({ length: 121 }, (_, i) => `${i ? "L" : "M"}${px(i / 10)} ${py(2.3 * 10 ** (i / 10 / 20))}`).join(" ")} fill="none" stroke={C.ink} strokeWidth={3} />
        {BENCH.map(([label, g, km]) => (
          <g key={label}>
            <circle cx={px(g)} cy={py(km)} r={9} fill={C.paper} stroke={C.blue} strokeWidth={3} />
            <text x={px(g) + (g === 0 ? 16 : -16)} y={py(km) - (g === 0 ? 18 : 14)} textAnchor={g === 0 ? "start" : "end"} fontFamily={SERIF} fontSize={26} fill={C.blue} paintOrder="stroke" stroke={C.paper} strokeWidth={6}>
              {km.toFixed(2)} km
            </text>
          </g>
        ))}
      </svg>
    </div>

    <div style={{ position: "absolute", left: 1290, right: 90, top: 240, display: "flex", flexDirection: "column", gap: 20 }}>
      <Panel title="Range formula">
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 40, textAlign: "center", padding: "6px 0 10px" }}>
          r<sub>2</sub> = r<sub>1</sub> × 10<sup style={{ color: C.blue }}>G/20</sup>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", rowGap: 6, fontSize: 18 }}>
          <i style={{ fontFamily: SERIF }}>r₂</i>
          <span>estimated range with receiver gain, km</span>
          <i style={{ fontFamily: SERIF }}>r₁</i>
          <span>baseline range, km</span>
          <i style={{ fontFamily: SERIF }}>G</i>
          <span>receiver gain, dB</span>
        </div>
      </Panel>
      <Panel title="Experimental baseline" accent={C.ochre} fill={C.ochreTint}>
        <div style={{ fontFamily: SERIF, fontSize: 34 }}>2.3 km</div>
        <div style={{ fontSize: 18, color: C.ink2 }}>from a horn or conch model, with no receiver gain</div>
      </Panel>
      <Panel title="Interpretation">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Numbered n={1} size={19}>
            Even modest passive gain extends relay spacing materially.
          </Numbered>
          <Numbered n={2} size={19}>
            About 6–7 dB of extra gain could connect the hardest recognised cluster.
          </Numbered>
          <Numbered n={3} size={19}>
            Terrain, wind and vegetation remain decisive.
          </Numbered>
        </div>
      </Panel>
    </div>
  </PlateFrame>
);
