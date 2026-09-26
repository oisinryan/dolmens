/**
 * The interactive presentation page.
 *
 *   npm run build-web
 *
 * bundles this file (with the slides and the fonts) into web/index.html, a
 * single self-contained page that opens by double-click with no server.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player, PlayerRef } from "@remotion/player";
import { SLIDES, TOTAL_FRAMES } from "../src/slides";
import { Presentation } from "../src/Presentation";
import { Controls, DEFAULTS, rangeKm } from "../src/controls";
import { PULSE, clusterLinks, messageFor, pulseTrain } from "../src/data";
import { FPS, H, W } from "../src/theme";

type Mode = "slides" | "film";

const STARTS = SLIDES.reduce<number[]>((acc, s, i) => [...acc, i ? acc[i - 1] + SLIDES[i - 1].duration : 0], []);
const slideAt = (frame: number) => Math.max(0, STARTS.findIndex((s, i) => frame >= s && frame < s + SLIDES[i].duration));

/* ---- sound: the pulse code through a horn-ish filtered sawtooth ---- */
let audio: AudioContext | null = null;
const playPulses = (group: number, value: number) => {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return 0;
  audio = audio ?? new Ctx();
  void audio.resume();
  const t0 = audio.currentTime + 0.05;
  const out = audio.createGain();
  out.gain.value = 0.22;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  filter.connect(out).connect(audio.destination);
  const train = pulseTrain(group, value);
  for (const p of train) {
    const osc = audio.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = p.kind === "low" ? PULSE.lowHz : PULSE.highHz;
    const env = audio.createGain();
    const a = t0 + p.start;
    env.gain.setValueAtTime(0, a);
    env.gain.linearRampToValueAtTime(1, a + 0.04);
    env.gain.setValueAtTime(1, a + p.dur - 0.06);
    env.gain.linearRampToValueAtTime(0, a + p.dur);
    osc.connect(env).connect(filter);
    osc.start(a);
    osc.stop(a + p.dur + 0.02);
  }
  const last = train[train.length - 1];
  return last.start + last.dur;
};

/* ---- small controls ---- */
const Slider: React.FC<{ id: string; label: string; unit: string; min: number; max: number; step: number; value: number; digits?: number; onChange: (v: number) => void; hint?: string }> = ({
  id,
  label,
  unit,
  min,
  max,
  step,
  value,
  digits = 1,
  onChange,
  hint,
}) => (
  <div className="field">
    <div className="field-head">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>
        {value.toFixed(digits)}
        <span>{unit}</span>
      </output>
    </div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ "--fill": `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties} />
    {hint && <p className="hint">{hint}</p>}
  </div>
);

const RangeControls: React.FC<{ c: Controls; set: (p: Partial<Controls>) => void; withCluster?: boolean }> = ({ c, set, withCluster }) => {
  const range = rangeKm(c.gainDb, c.refKm, c.absorption);
  const links = clusterLinks(c.gullionRelays);
  const connected = links.filter((x) => x.bottleneck <= range).length;
  return (
    <div className="group">
      <div className="readout">
        <div>
          <span className="big">{range.toFixed(2)}</span> km range
        </div>
        <div className={connected === 5 ? "ok" : "warn"}>{connected} of 5 clusters connect</div>
      </div>
      <Slider id="gain" label="Receiver gain" unit=" dB" min={0} max={12} step={0.5} value={c.gainDb} onChange={(v) => set({ gainDb: v })} hint="What a passive collector adds at the listener. The report tests +3, +6, +9 and +12 dB." />
      <Slider id="absorption" label="Air absorption" unit=" dB/km" min={0} max={3} step={0.25} digits={2} value={c.absorption} onChange={(v) => set({ absorption: v })} hint="0 is the report's idealised model. At 250–500 Hz, air absorbs roughly 1–3 dB per km." />
      <Slider id="ref" label="Reference range, no gain" unit=" km" min={1} max={4} step={0.1} value={c.refKm} onChange={(v) => set({ refKm: v })} />
      <div className="field">
        <label className="check" htmlFor="relays">
          <input id="relays" type="checkbox" checked={c.gullionRelays} onChange={(e) => set({ gullionRelays: e.target.checked })} />
          Slieve Gullion relays
        </label>
        <p className="hint">Adds the summit passage tomb and the Long Stone, two surviving monuments near the cluster's centre. Its longest hop drops from 4.67 km to 2.92 km.</p>
      </div>
      {withCluster && (
        <div className="field">
          <div className="field-head">
            <span className="label">Highlight cluster</span>
          </div>
          <div className="chips" role="group" aria-label="Highlight cluster">
            {links.map((x) => (
              <button key={x.id} type="button" className={`chip ${x.id === c.cluster ? "on" : ""} ${x.bottleneck <= range ? "" : "out"}`} aria-pressed={x.id === c.cluster} onClick={() => set({ cluster: x.id })}>
                {x.name}
                <small>{x.bottleneck.toFixed(2)} km</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ExplodeControls: React.FC<{ c: Controls; set: (p: Partial<Controls>) => void }> = ({ c, set }) => (
  <div className="group">
    <Slider id="explode" label="Explode" unit="" min={0} max={1} step={0.05} digits={2} value={c.explode} onChange={(v) => set({ explode: v })} hint="0 shows the assembled tomb; 1 pulls every part apart along the sound axis." />
    <label className="check" htmlFor="cairn">
      <input id="cairn" type="checkbox" checked={c.showCairn} onChange={(e) => set({ showCairn: e.target.checked })} />
      Show the cairn envelope
    </label>
  </div>
);

const PulseControls: React.FC<{ c: Controls; set: (p: Partial<Controls>) => void; onPlay: () => void; sounding: boolean }> = ({ c, set, onPlay, sounding }) => (
  <div className="group">
    <div className="readout">
      <div>
        <span className="big">{messageFor(c.group, c.value)}</span>
      </div>
      <div>
        {c.group} low · {c.value} high
      </div>
    </div>
    <div className="code-grid" role="grid" aria-label="Pulse code: group by value">
      {[1, 2, 3, 4].map((g) =>
        [1, 2, 3, 4, 5].map((v) => {
          const m = messageFor(g, v);
          const on = g === c.group && v === c.value;
          return (
            <button key={`${g}-${v}`} type="button" className={`cell ${on ? "on" : ""} ${m === "Unassigned" ? "free" : ""}`} aria-pressed={on} aria-label={`Group ${g}, value ${v}: ${m}`} onClick={() => set({ group: g, value: v })}>
              {m === "Unassigned" ? `${g}·${v}` : m}
            </button>
          );
        }),
      )}
    </div>
    <button type="button" className="primary" onClick={onPlay} disabled={sounding}>
      {sounding ? "Playing…" : "Play the pulses"}
    </button>
    <p className="hint">
      Low pulses at {PULSE.lowHz} Hz give the group, high pulses at {PULSE.highHz} Hz the value. Turn your sound on.
    </p>
  </div>
);

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>("slides");
  const [index, setIndex] = useState(() => {
    const n = SLIDES.findIndex((s) => s.id.toLowerCase() === location.hash.slice(1).toLowerCase());
    return n < 0 ? 0 : n;
  });
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const [sounding, setSounding] = useState(false);
  const set = useCallback((p: Partial<Controls>) => setControls((c) => ({ ...c, ...p })), []);
  const player = useRef<PlayerRef>(null);
  const slide = SLIDES[index];

  // slides mode: play the intro once, then loop the ambient tail
  useEffect(() => {
    const p = player.current;
    if (!p || mode !== "slides") return;
    const onEnded = () => {
      p.seekTo(slide.loopStart);
      p.play();
    };
    p.addEventListener("ended", onEnded);
    return () => p.removeEventListener("ended", onEnded);
  }, [mode, index, slide.loopStart]);

  // film mode: follow the playhead to know which slide is showing
  useEffect(() => {
    const p = player.current;
    if (!p || mode !== "film") return;
    const onFrame = (e: { detail: { frame: number } }) => setIndex(slideAt(e.detail.frame));
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("seeked", onFrame);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("seeked", onFrame);
    };
  }, [mode]);

  useEffect(() => {
    try {
      history.replaceState(null, "", `#${slide.id.toLowerCase()}`);
    } catch {
      /* the hash is a convenience */
    }
  }, [slide.id]);

  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(SLIDES.length - 1, i));
      setIndex(n);
      if (mode === "film") player.current?.seekTo(STARTS[n]);
    },
    [mode],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(index + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(index - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(SLIDES.length - 1);
      else if (e.key.toLowerCase() === "f") player.current?.requestFullscreen();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  const onPlayPulses = () => {
    if (mode === "slides") {
      player.current?.seekTo(slide.loopStart);
      player.current?.play();
    }
    const secs = playPulses(controls.group, controls.value);
    setSounding(true);
    window.setTimeout(() => setSounding(false), secs * 1000 + 300);
  };

  const inputProps = useMemo(() => controls, [controls]);
  const ids = mode === "film" ? ["Range", "Clusters", "Exploded", "PulseCode"] : [slide.id];

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="eyebrow">Portal tombs · island of Ireland</span>
          <h1>Neolithic Acoustic Signal Network</h1>
        </div>
        <div className="modes" role="tablist" aria-label="View">
          {(["slides", "film"] as Mode[]).map((m) => (
            <button key={m} role="tab" type="button" aria-selected={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
              {m === "slides" ? "Present" : "Watch the film"}
            </button>
          ))}
        </div>
      </header>

      <main className="layout">
        <section className="stage" aria-label="Presentation">
          <div className="screen">
            {mode === "slides" ? (
              <Player
                key={`slide-${index}`}
                ref={player}
                component={slide.component}
                inputProps={inputProps}
                durationInFrames={slide.duration}
                fps={FPS}
                compositionWidth={W}
                compositionHeight={H}
                autoPlay
                initiallyMuted
                acknowledgeRemotionLicense
                allowFullscreen
                doubleClickToFullscreen
                style={{ width: "100%", aspectRatio: `${W} / ${H}` }}
              />
            ) : (
              <Player
                key="film"
                ref={player}
                component={Presentation}
                inputProps={inputProps}
                durationInFrames={TOTAL_FRAMES}
                fps={FPS}
                compositionWidth={W}
                compositionHeight={H}
                controls
                clickToPlay
                allowFullscreen
                doubleClickToFullscreen
                showVolumeControls={false}
                acknowledgeRemotionLicense
                initialFrame={STARTS[index]}
                style={{ width: "100%", aspectRatio: `${W} / ${H}` }}
              />
            )}
          </div>
          <div className="transport">
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">
              ← Prev
            </button>
            <div className="where">
              <span className="num">
                {index + 1} / {SLIDES.length}
              </span>
              {slide.title}
            </div>
            <button type="button" onClick={() => go(index + 1)} disabled={index === SLIDES.length - 1} aria-label="Next slide">
              Next →
            </button>
          </div>
          <ol className="chapters">
            {SLIDES.map((s, i) => (
              <li key={s.id}>
                <button type="button" className={i === index ? "on" : ""} aria-current={i === index ? "step" : undefined} onClick={() => go(i)}>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
        </section>

        <aside className="rack" aria-label="Controls and notes">
          {ids.includes("Range") || ids.includes("Clusters") ? (
            <section className="panel">
              <h2>Link budget</h2>
              <RangeControls c={controls} set={set} withCluster={ids.includes("Clusters")} />
            </section>
          ) : null}
          {ids.includes("Exploded") && (
            <section className="panel">
              <h2>Exploded model</h2>
              <ExplodeControls c={controls} set={set} />
            </section>
          )}
          {ids.includes("PulseCode") && (
            <section className="panel">
              <h2>Pulse code</h2>
              <PulseControls c={controls} set={set} onPlay={onPlayPulses} sounding={sounding} />
            </section>
          )}
          {mode === "slides" && !["Range", "Clusters", "Exploded", "PulseCode"].includes(slide.id) && (
            <section className="panel quiet">
              <h2>Controls</h2>
              <p>
                Slides 4 to 7 have live controls: receiver gain and air absorption, the highlighted cluster, the exploded model, and the pulse code. Your settings carry into the film.
              </p>
            </section>
          )}
          <section className="panel notes">
            <h2>Speaker notes</h2>
            <p>{slide.notes}</p>
          </section>
          <div className="foot">
            <button type="button" className="link" onClick={() => setControls(DEFAULTS)}>
              Reset controls
            </button>
            <span>← → to move · F for full screen</span>
          </div>
        </aside>
      </main>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
