import React from "react";
import { useCurrentFrame } from "remotion";
import { C, FPS, MONO } from "../theme";
import { PULSE, messageFor, pulseTrain } from "../data";
import { Controls } from "../controls";
import { EvidenceTag, FadeUp, Label, Panel, SlideFrame, ease } from "../ui";

/** the playhead loops over the last 300 frames: keep in step with SLIDES in slides.ts */
export const PULSE_LOOP_START = 150;
export const PULSE_LOOP = 300;
const TIMELINE_S = 10;
const TW = 900;
const sx = (s: number) => (s / TIMELINE_S) * TW;

const PROTOCOL = ["Attention", "Group", "Pause", "Value", "Long pause", "Repeat", "Acknowledge"];

export const S7PulseCode: React.FC<Controls> = ({ group, value }) => {
  const frame = useCurrentFrame();
  const train = pulseTrain(group, value);
  const end = train[train.length - 1].start + train[train.length - 1].dur;
  const t = frame >= PULSE_LOOP_START ? ((frame - PULSE_LOOP_START) % PULSE_LOOP) / FPS : -1;
  const draw = ease(frame, 60, 50);
  return (
    <SlideFrame n={7} kicker="Pulse code system" title="Count pulses, don't decode speech" evidence={["HYPOTHETICAL"]}>
      {/* 4 × 5 grid */}
      <div style={{ position: "absolute", left: 90, top: 250 }}>
        <FadeUp start={10}>
          <div style={{ display: "grid", gridTemplateColumns: "120px repeat(5, 126px)", gap: 8 }}>
            <div />
            {[1, 2, 3, 4, 5].map((v) => (
              <div key={v} style={{ textAlign: "center", fontFamily: MONO, fontSize: 16, color: C.cyan, letterSpacing: 2, paddingBottom: 6 }}>
                {"▮".repeat(v)}
                <div style={{ color: C.dim, marginTop: 4 }}>HIGH ×{v}</div>
              </div>
            ))}
            {[1, 2, 3, 4].map((g) => (
              <React.Fragment key={g}>
                <div style={{ fontFamily: MONO, fontSize: 16, color: C.orange, letterSpacing: 2, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div>{"▬".repeat(g)}</div>
                  <div style={{ color: C.dim, marginTop: 4 }}>LOW ×{g}</div>
                </div>
                {[1, 2, 3, 4, 5].map((v) => {
                  const sel = g === group && v === value;
                  const m = messageFor(g, v);
                  const free = m === "Unassigned";
                  return (
                    <div
                      key={v}
                      style={{
                        height: 92,
                        borderRadius: 5,
                        border: `1.5px solid ${sel ? C.amber : C.line}`,
                        background: sel ? `${C.amber}22` : C.panel,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        opacity: ease(frame, 16 + (g - 1) * 5 + v * 2, 16),
                      }}
                    >
                      <div style={{ fontFamily: MONO, fontSize: 14, color: C.faint }}>
                        {g}·{v}
                      </div>
                      <div style={{ fontSize: free ? 17 : 20, color: sel ? C.amber : free ? C.faint : C.text, marginTop: 4 }}>{free ? "—" : m}</div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </FadeUp>
        <FadeUp start={70} style={{ marginTop: 26, fontSize: 21, color: C.dim, width: 760, lineHeight: 1.45 }}>
          4 groups × 5 values = <span style={{ color: C.text }}>20 message states</span>, log₂ 20 ≈ 4.3 bits each. Every state stands for a pre-agreed command, not a letter.
        </FadeUp>
      </div>

      {/* selected message and its pulse train */}
      <div style={{ position: "absolute", left: 900, top: 250, width: TW }}>
        <FadeUp start={40}>
          <Label>
            Group {group} · value {value}
          </Label>
          <div style={{ fontSize: 72, fontWeight: 300, color: C.amber, marginTop: 6 }}>{messageFor(group, value)}</div>
        </FadeUp>
        <svg width={TW} height={250} style={{ marginTop: 20, overflow: "visible" }}>
          {Array.from({ length: TIMELINE_S + 1 }, (_, s) => (
            <g key={s}>
              <line x1={sx(s)} y1={40} x2={sx(s)} y2={210} stroke={C.line} />
              <text x={sx(s)} y={240} textAnchor="middle" fontFamily={MONO} fontSize={16} fill={C.dim}>
                {s}s
              </text>
            </g>
          ))}
          <line x1={0} y1={125} x2={TW} y2={125} stroke={C.faint} strokeWidth={1} />
          {train.map((p, i) => {
            const on = t >= p.start && t <= p.start + p.dur;
            const low = p.kind === "low";
            const h = low ? 150 : 90;
            const col = low ? C.orange : C.cyan;
            const x0 = sx(p.start);
            const w = sx(p.dur) * Math.min(1, Math.max(0, draw * train.length - i));
            const cycles = low ? 7 : 9;
            const path = Array.from({ length: 61 }, (_, k) => {
              const u = k / 60;
              return `${k ? "L" : "M"}${(x0 + u * w).toFixed(1)} ${(125 + Math.sin(u * cycles * Math.PI * 2) * (h / 2 - 6)).toFixed(1)}`;
            }).join(" ");
            return (
              <g key={i}>
                <rect x={x0} y={125 - h / 2} width={w} height={h} rx={4} fill={col} fillOpacity={on ? 0.35 : 0.1} stroke={col} strokeWidth={on ? 3 : 1.5} />
                <path d={path} fill="none" stroke={col} strokeWidth={1.8} opacity={0.9} />
              </g>
            );
          })}
          {t >= 0 && t <= TIMELINE_S && <line x1={sx(t)} y1={30} x2={sx(t)} y2={220} stroke={C.text} strokeWidth={2} />}
          <text x={sx(end) + 12} y={60} fontFamily={MONO} fontSize={15} fill={C.faint} opacity={draw}>
            {end.toFixed(1)} s, then repeat
          </text>
        </svg>
        <FadeUp start={90} style={{ display: "flex", gap: 30, marginTop: 10, fontFamily: MONO, fontSize: 16, letterSpacing: 2 }}>
          <span style={{ color: C.orange }}>▬ LOW {PULSE.lowHz} Hz · {PULSE.low}s = GROUP</span>
          <span style={{ color: C.cyan }}>▮ HIGH {PULSE.highHz} Hz · {PULSE.high}s = VALUE</span>
        </FadeUp>

        <FadeUp start={100} style={{ display: "flex", gap: 10, marginTop: 36, flexWrap: "wrap", alignItems: "center" }}>
          {PROTOCOL.map((p, i) => (
            <React.Fragment key={p}>
              <span style={{ fontFamily: MONO, fontSize: 16, letterSpacing: 2, padding: "8px 12px", border: `1.5px solid ${C.line}`, borderRadius: 4, color: i === 1 || i === 3 ? C.amber : C.text }}>
                {p.toUpperCase()}
              </span>
              {i < PROTOCOL.length - 1 && <span style={{ color: C.faint }}>→</span>}
            </React.Fragment>
          ))}
        </FadeUp>

        <FadeUp start={112}>
          <Panel style={{ marginTop: 30, padding: "18px 22px", display: "flex", gap: 20, alignItems: "center" }}>
            <EvidenceTag kind="HYPOTHETICAL" style={{ fontSize: 13, padding: "4px 10px" }} />
            <div style={{ fontSize: 19, color: C.dim, lineHeight: 1.4 }}>
              Ogham (4th–8th century AD) is thousands of years later than the tombs. Its four-family, five-position structure is used here only as a modern test code.
            </div>
          </Panel>
        </FadeUp>
      </div>
    </SlideFrame>
  );
};
