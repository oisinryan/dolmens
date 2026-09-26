import React from "react";
import { C, SANS, SERIF } from "../theme";
import { CLUSTERS, clusterCentre, messageFor, pulseTrain } from "../data";
import { project } from "../geo";
import { IrelandMap } from "../ui";
import { Kicker, Numbered, Panel, PlateFrame, pulseWave } from "./frame";

/** one pulse sequence drawn to time scale: low pulses tall and orange, high pulses short and blue */
const Sequence: React.FC<{ group: number; value: number; width: number; span?: number }> = ({ group, value, width, span = 8 }) => {
  const x = (s: number) => (s / span) * width;
  return (
    <svg width={width} height={56}>
      <line x1={0} y1={46} x2={width} y2={46} stroke={C.rule} />
      {pulseTrain(group, value).map((p, i) => (
        <rect key={i} x={x(p.start)} y={p.kind === "low" ? 6 : 22} width={x(p.dur)} height={p.kind === "low" ? 40 : 24} fill={p.kind === "low" ? C.signal : C.blue} />
      ))}
    </svg>
  );
};

export const P7PulseCode: React.FC = () => (
  <PlateFrame n={7} title="Pulse Code System" subtitle="An Ogham-inspired structure for robust, low-information signalling" footer="Ogham is 4th–8th century AD; only its four-family, five-position structure is borrowed, as a modern test code." evidence={["HYPOTHETICAL"]}>
    <div style={{ position: "absolute", left: 90, top: 235, width: 820 }}>
      <Kicker color={C.blue}>Two-stage code</Kicker>
      <svg width={820} height={150} style={{ marginTop: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 70} y={20} width={56} height={70} fill={i === 0 ? C.signal : "none"} stroke={C.signal} strokeWidth={2} strokeDasharray={i === 0 ? undefined : "5 4"} />
        ))}
        <text x={0} y={122} fontFamily={SANS} fontWeight={600} fontSize={20} fill={C.signal}>
          1–4 LOW pulses = group
        </text>
        <line x1={300} y1={55} x2={420} y2={55} stroke={C.faint} strokeDasharray="3 5" />
        <text x={360} y={45} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={20} fill={C.ink2}>
          pause
        </text>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={440 + i * 50} y={40} width={30} height={40} fill={i === 0 ? C.blue : "none"} stroke={C.blue} strokeWidth={2} strokeDasharray={i === 0 ? undefined : "5 4"} />
        ))}
        <text x={440} y={122} fontFamily={SANS} fontWeight={600} fontSize={20} fill={C.blue}>
          1–5 HIGH pulses = value
        </text>
      </svg>

      <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Kicker color={C.blue}>Message states</Kicker>
        <span style={{ fontFamily: SERIF, fontSize: 24 }}>4 groups × 5 values = 20 message states</span>
      </div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "110px repeat(5, 1fr)", borderTop: `1.5px solid ${C.ink}`, borderBottom: `1.5px solid ${C.ink}` }}>
        <div />
        {[1, 2, 3, 4, 5].map((v) => (
          <div key={v} style={{ fontSize: 15, fontWeight: 600, color: C.blue, padding: "8px 0", textAlign: "center", borderBottom: `1px solid ${C.ink}` }}>
            HIGH ×{v}
          </div>
        ))}
        {[1, 2, 3, 4].map((g) => (
          <React.Fragment key={g}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.signal, padding: "18px 0", borderTop: g > 1 ? `1px solid ${C.grid}` : undefined }}>LOW ×{g}</div>
            {[1, 2, 3, 4, 5].map((v) => {
              const m = messageFor(g, v);
              return (
                <div key={v} style={{ textAlign: "center", padding: "10px 4px", borderTop: g > 1 ? `1px solid ${C.grid}` : undefined }}>
                  <div style={{ fontSize: 13, color: C.faint }}>state {(g - 1) * 5 + v}</div>
                  <div style={{ fontSize: 18, color: m === "Unassigned" ? C.faint : C.ink }}>{m === "Unassigned" ? "free" : m}</div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>

    <div style={{ position: "absolute", left: 980, right: 90, top: 235 }}>
      <Kicker color={C.blue}>Example sequences, to time scale (8 s)</Kicker>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
        {[
          [1, 1],
          [2, 3],
          [3, 5],
          [4, 2],
        ].map(([g, v]) => {
          const m = messageFor(g, v);
          return (
            <div key={`${g}-${v}`} style={{ display: "grid", gridTemplateColumns: "230px 1fr", alignItems: "center", borderTop: `1px solid ${C.grid}`, paddingTop: 8 }}>
              <div>
                <div style={{ fontFamily: SERIF, fontSize: 22 }}>
                  Group {g} + value {v}
                </div>
                <div style={{ fontSize: 16, color: C.ink2 }}>{m === "Unassigned" ? "free for a test message" : m}</div>
              </div>
              <Sequence group={g} value={v} width={600} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Panel title="Note" accent={C.ochre} fill={C.ochreTint}>
            <div style={{ fontSize: 18 }}>Designed for short command-style messages, not full spoken language.</div>
          </Panel>
          <Panel title="Message workflow">
            <div style={{ fontFamily: SERIF, fontSize: 21 }}>Attention → Code → Repeat → Acknowledge</div>
          </Panel>
        </div>
        <Panel title="Why pulses">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Numbered n={1} size={18}>
              Counting pulses is more robust than speech over distance.
            </Numbered>
            <Numbered n={2} size={18}>
              Two tones, low and high, are easier to tell apart.
            </Numbered>
            <Numbered n={3} size={18}>
              A 20-state code suits predefined commands.
            </Numbered>
          </div>
        </Panel>
      </div>
    </div>
  </PlateFrame>
);

/* ---------------- plate 8 ---------------- */
const STEPS = [
  "Merge NMS and NISMR coordinates into one GIS model",
  "Add elevation, valley paths, vegetation and orientation data",
  "Model propagation at 250, 300, 400 and 500 Hz",
  "Field-test horn transmitters and passive receivers at real cluster distances",
  "Compare real connectivity against constrained random site distributions",
];

export const P8TestPlan: React.FC = () => (
  <PlateFrame n={8} title="Test Plan and Conclusion" subtitle="How to validate or falsify the concept" footer="The idea stands or falls on terrain-aware modelling and field tests, not on spacing alone.">
    <div style={{ position: "absolute", left: 90, top: 235, width: 860 }}>
      <Kicker color={C.blue}>Experimental roadmap</Kicker>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 12, borderTop: `1.5px solid ${C.ink}` }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "grid", gridTemplateColumns: "70px 1fr", alignItems: "center", padding: "18px 0", borderBottom: `1px solid ${i === STEPS.length - 1 ? C.ink : C.grid}` }}>
            <span style={{ fontFamily: SERIF, fontSize: 48, color: C.blue, lineHeight: 1 }}>{i + 1}</span>
            <span style={{ fontSize: 25, lineHeight: 1.35 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>

    <div style={{ position: "absolute", left: 1010, right: 90, top: 235, display: "flex", flexDirection: "column", gap: 20 }}>
      <Panel title="Conclusion">
        <ul style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 10, fontSize: 21, lineHeight: 1.4 }}>
          <li>Portal-tomb clusters show meaningful relay spacing.</li>
          <li>Horn transmission makes the acoustic model more plausible.</li>
          <li>Passive listening systems could bridge the hardest cluster gaps.</li>
          <li>The idea stays speculative until terrain-aware experiments confirm it.</li>
        </ul>
      </Panel>
      <Panel title="Best current reading" accent={C.blue} fill={C.blueTint}>
        <div style={{ fontFamily: SERIF, fontSize: 27, lineHeight: 1.35 }}>Local acoustic cells are more plausible than a single Ireland-wide network.</div>
      </Panel>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24, borderTop: `1px solid ${C.rule}`, paddingTop: 16 }}>
        <IrelandMap width={150}>
          {CLUSTERS.map((c) => {
            const [x, y] = project(clusterCentre(c));
            return <circle key={c.id} cx={x} cy={y} r={16} fill={C.blue} stroke={C.paper} strokeWidth={5} />;
          })}
        </IrelandMap>
        <svg width={280} height={120}>
          <path d={pulseWave(280, 120, [[0.1, 0.8], [2.1, 0.3], [2.7, 0.3], [3.3, 0.3]], 4, 70)} fill="none" stroke={C.signal} strokeWidth={1.3} />
        </svg>
        <svg width={200} height={130}>
          <path d="M0 128 L200 128" stroke={C.ink2} />
          <rect x={30} y={52} width={16} height={76} fill={C.stoneSide} stroke={C.ink} strokeWidth={2} />
          <rect x={140} y={70} width={16} height={58} fill={C.stoneSide} stroke={C.ink} strokeWidth={2} />
          <path d="M14 40 L186 58 L186 76 L14 56 Z" fill={C.stoneTop} stroke={C.ink} strokeWidth={2} />
        </svg>
      </div>
    </div>
  </PlateFrame>
);
