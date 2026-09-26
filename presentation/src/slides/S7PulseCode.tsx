import React from "react";
import { useCurrentFrame } from "remotion";
import { C, FPS, SANS, SERIF } from "../theme";
import { PULSE, messageFor, pulseTrain } from "../data";
import { Controls } from "../controls";
import { Box, Caption, EvidenceTag, FadeUp, Label, SlideFrame, ease } from "../ui";

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
      {/* 4 × 5 code table */}
      <div style={{ position: "absolute", left: 90, top: 230 }}>
        <FadeUp start={6}>
          <Caption n="Table 2">The Ogham-inspired test code: low pulses give the group, high pulses the value.</Caption>
        </FadeUp>
        <FadeUp start={10} style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px repeat(5, 126px)", borderTop: `1.5px solid ${C.ink}`, borderBottom: `1.5px solid ${C.ink}` }}>
            <div style={{ borderBottom: `1px solid ${C.ink}` }} />
            {[1, 2, 3, 4, 5].map((v) => (
              <div key={v} style={{ textAlign: "center", fontSize: 15, fontWeight: 600, color: C.blue, padding: "10px 0 8px", borderBottom: `1px solid ${C.ink}` }}>
                <div style={{ letterSpacing: 3 }}>{"▮".repeat(v)}</div>
                <div style={{ color: C.ink2, marginTop: 2, letterSpacing: 1 }}>HIGH ×{v}</div>
              </div>
            ))}
            {[1, 2, 3, 4].map((g) => (
              <React.Fragment key={g}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.signal, display: "flex", flexDirection: "column", justifyContent: "center", borderTop: g > 1 ? `1px solid ${C.grid}` : undefined }}>
                  <div style={{ letterSpacing: 1 }}>{"▬".repeat(g)}</div>
                  <div style={{ color: C.ink2, marginTop: 2, letterSpacing: 1 }}>LOW ×{g}</div>
                </div>
                {[1, 2, 3, 4, 5].map((v) => {
                  const sel = g === group && v === value;
                  const m = messageFor(g, v);
                  const free = m === "Unassigned";
                  return (
                    <div
                      key={v}
                      style={{
                        height: 86,
                        borderTop: g > 1 ? `1px solid ${C.grid}` : undefined,
                        background: sel ? C.blueTint : undefined,
                        outline: sel ? `2px solid ${C.blue}` : undefined,
                        outlineOffset: -2,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        opacity: ease(frame, 16 + (g - 1) * 5 + v * 2, 16),
                      }}
                    >
                      <div style={{ fontSize: 13, color: C.faint }}>
                        {g}·{v}
                      </div>
                      <div style={{ fontSize: free ? 17 : 20, color: sel ? C.blue : free ? C.faint : C.ink, fontWeight: sel ? 600 : 400, marginTop: 2 }}>{free ? "—" : m}</div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </FadeUp>
        <FadeUp start={70} style={{ marginTop: 20, fontSize: 21, color: C.ink2, width: 760, lineHeight: 1.45 }}>
          4 groups × 5 values = <b style={{ color: C.ink }}>20 message states</b>, log₂ 20 ≈ 4.3 bits each. Every state stands for a pre-agreed command, not a letter.
        </FadeUp>
      </div>

      {/* selected message and its pulse train */}
      <div style={{ position: "absolute", left: 900, top: 230, width: TW }}>
        <FadeUp start={40}>
          <Label>
            Selected state · group {group}, value {value}
          </Label>
          <div style={{ fontFamily: SERIF, fontSize: 64, color: C.blue, marginTop: 4 }}>{messageFor(group, value)}</div>
        </FadeUp>
        <svg width={TW} height={250} style={{ marginTop: 14, overflow: "visible" }}>
          {Array.from({ length: TIMELINE_S + 1 }, (_, s) => (
            <g key={s}>
              <line x1={sx(s)} y1={40} x2={sx(s)} y2={210} stroke={C.grid} />
              <text x={sx(s)} y={238} textAnchor="middle" fontFamily={SANS} fontSize={16} fill={C.ink2}>
                {s}
              </text>
            </g>
          ))}
          <line x1={0} y1={210} x2={TW} y2={210} stroke={C.ink} strokeWidth={1.5} />
          <line x1={0} y1={125} x2={TW} y2={125} stroke={C.rule} strokeWidth={1} />
          {train.map((p, i) => {
            const on = t >= p.start && t <= p.start + p.dur;
            const low = p.kind === "low";
            const h = low ? 150 : 90;
            const col = low ? C.signal : C.blue;
            const x0 = sx(p.start);
            const w = sx(p.dur) * Math.min(1, Math.max(0, draw * train.length - i));
            const cycles = low ? 7 : 9;
            const path = Array.from({ length: 61 }, (_, k) => {
              const u = k / 60;
              return `${k ? "L" : "M"}${(x0 + u * w).toFixed(1)} ${(125 + Math.sin(u * cycles * Math.PI * 2) * (h / 2 - 6)).toFixed(1)}`;
            }).join(" ");
            return (
              <g key={i}>
                <rect x={x0} y={125 - h / 2} width={w} height={h} fill={low ? C.signalTint : C.blueTint} stroke={col} strokeWidth={on ? 3 : 1.2} />
                <path d={path} fill="none" stroke={col} strokeWidth={1.6} />
              </g>
            );
          })}
          {t >= 0 && t <= TIMELINE_S && <line x1={sx(t)} y1={30} x2={sx(t)} y2={214} stroke={C.ink} strokeWidth={2} />}
          <text x={sx(end) + 12} y={60} fontFamily={SANS} fontSize={16} fill={C.ink2} opacity={draw}>
            {end.toFixed(1)} s, then repeat
          </text>
        </svg>
        <FadeUp start={90}>
          <Caption n="Figure 7" style={{ marginTop: 8 }}>
            Pulse train over 10 s: <span style={{ color: C.signal }}>low {PULSE.lowHz} Hz, {PULSE.low} s</span> for the group, then{" "}
            <span style={{ color: C.blue }}>high {PULSE.highHz} Hz, {PULSE.high} s</span> for the value.
          </Caption>
        </FadeUp>

        <FadeUp start={100} style={{ display: "flex", gap: 8, marginTop: 26, flexWrap: "wrap", alignItems: "center", fontSize: 17 }}>
          <Label style={{ marginRight: 8 }}>Protocol</Label>
          {PROTOCOL.map((p, i) => (
            <React.Fragment key={p}>
              <span style={{ color: i === 1 || i === 3 ? C.blue : C.ink, fontWeight: i === 1 || i === 3 ? 600 : 400 }}>{p}</span>
              {i < PROTOCOL.length - 1 && <span style={{ color: C.faint }}>→</span>}
            </React.Fragment>
          ))}
        </FadeUp>

        <FadeUp start={112}>
          <Box fill={C.tint} accent={C.tint} style={{ marginTop: 24, padding: "16px 20px", display: "flex", gap: 18, alignItems: "center" }}>
            <EvidenceTag kind="HYPOTHETICAL" style={{ fontSize: 13, padding: "4px 10px" }} />
            <div style={{ fontSize: 18, color: C.ink2, lineHeight: 1.4 }}>
              Ogham (4th–8th century AD) is thousands of years later than the tombs. Only its four-family, five-position structure is borrowed, as a modern test code.
            </div>
          </Box>
        </FadeUp>
      </div>
    </SlideFrame>
  );
};
