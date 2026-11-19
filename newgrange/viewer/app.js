import { NewgrangeAudioEngine } from "./audio_engine.js";
import { NewgrangeWebGLEngine } from "./webgl_engine.js";

const announceEl = document.getElementById("live-announcer");
function announce(msg) {
  if (!announceEl) return;
  announceEl.textContent = "";
  requestAnimationFrame(() => {
    announceEl.textContent = msg;
  });
}

function updateRangeProgress(el) {
  const min = parseFloat(el.min || "0");
  const max = parseFloat(el.max || "100");
  const val = parseFloat(el.value || "0");
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  el.style.setProperty("--progress", `${pct.toFixed(1)}%`);
}

function drawFRFChart(canvas, report, selectedFreqHz, activeFreqHz) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const frf = report.fdtd_simulation.frf_chart;
  const freqs = frf.freqs_hz;
  const vals = frf.chamber_center_db;
  const modes = report.fdtd_simulation.eigenmodes;

  const padL = 36, padR = 10, padT = 14, padB = 22;
  const pw = w - padL - padR;
  const ph = h - padT - padB;
  const fMin = 20, fMax = 320;
  const dbMin = -35, dbMax = 30;

  const xOf = (f) => padL + ((f - fMin) / (fMax - fMin)) * pw;
  const yOf = (db) => padT + (1 - (Math.max(dbMin, Math.min(dbMax, db)) - dbMin) / (dbMax - dbMin)) * ph;

  // Shaded 95-120 Hz Jahn-Devereux band
  ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
  ctx.fillRect(xOf(95), padT, xOf(120) - xOf(95), ph);

  // Grid
  ctx.strokeStyle = "#262b36";
  ctx.lineWidth = 1;
  for (const fTick of [50, 100, 150, 200, 250, 300]) {
    const x = xOf(fTick);
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ph); ctx.stroke();
  }
  for (const dbTick of [-20, 0, 20]) {
    const y = yOf(dbTick);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + pw, y); ctx.stroke();
  }

  // Curve
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < freqs.length; i++) {
    if (freqs[i] < fMin || freqs[i] > fMax) continue;
    const x = xOf(freqs[i]);
    const y = yOf(vals[i]);
    if (!started) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Active sweep/pitch vertical marker
  if (activeFreqHz >= fMin && activeFreqHz <= fMax) {
    ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xOf(activeFreqHz), padT);
    ctx.lineTo(xOf(activeFreqHz), padT + ph);
    ctx.stroke();
  }

  // Mode markers
  for (const m of modes) {
    const mx = xOf(m.freq_hz);
    const my = yOf(m.spl_db);
    const isSel = Math.abs(m.freq_hz - selectedFreqHz) < 0.5;
    ctx.fillStyle = isSel ? "#fbbf24" : "#94a3b8";
    ctx.beginPath();
    ctx.arc(mx, my, isSel ? 4.5 : 3.0, 0, Math.PI * 2);
    ctx.fill();
    if (isSel) {
      ctx.fillStyle = "#fde68a";
      ctx.font = "600 10px sans-serif";
      ctx.fillText(`${m.freq_hz.toFixed(1)} Hz`, Math.min(w - 52, mx + 5), Math.max(12, my - 5));
    }
  }

  // Axes labels
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  ctx.fillText("20", padL - 4, h - 6);
  ctx.fillText("110Hz", xOf(95), h - 6);
  ctx.fillText("200", xOf(192), h - 6);
  ctx.fillText("320", w - 24, h - 6);
  ctx.fillText("+20", 4, yOf(20) + 3);
  ctx.fillText("0 dB", 4, yOf(0) + 3);
  ctx.fillText("-20", 4, yOf(-20) + 3);
}

function drawRT60Chart(canvas, stationObj) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const bands = ["63", "125", "250", "500", "1000", "2000", "4000", "8000"];
  const labels = ["63", "125", "250", "500", "1k", "2k", "4k", "8k"];
  const om = stationObj.octave_metrics;
  const t60s = bands.map((b) => om[b]?.t60_s ?? 0);
  const edts = bands.map((b) => om[b]?.edt_s ?? 0);
  const maxVal = Math.max(2.0, ...t60s, ...edts) * 1.15;

  const padL = 32, padR = 8, padT = 16, padB = 22;
  const pw = w - padL - padR;
  const ph = h - padT - padB;
  const groupW = pw / bands.length;
  const barW = Math.max(4, groupW * 0.34);

  ctx.strokeStyle = "#262b36";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const val = (maxVal * i) / 3;
    const y = padT + ph - (val / maxVal) * ph;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + pw, y); ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.fillText(`${val.toFixed(1)}s`, 2, y + 3);
  }

  for (let i = 0; i < bands.length; i++) {
    const gx = padL + i * groupW + groupW * 0.14;
    const hT = (t60s[i] / maxVal) * ph;
    const hE = (edts[i] / maxVal) * ph;
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(gx, padT + ph - hT, barW, hT);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(gx + barW + 2, padT + ph - hE, barW, hE);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "10px sans-serif";
    ctx.fillText(labels[i], gx + 2, h - 6);
  }

  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(w - 115, 4, 8, 8);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "10px sans-serif";
  ctx.fillText("T60", w - 104, 12);

  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(w - 68, 4, 8, 8);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("EDT", w - 57, 12);
}

function populateISOTable(tbody, stationObj) {
  const bands = ["63", "125", "250", "500", "1000", "2000", "4000", "8000"];
  tbody.replaceChildren();
  for (const b of bands) {
    const m = stationObj.octave_metrics[b];
    const tr = document.createElement("tr");
    const label = parseInt(b, 10) >= 1000 ? `${parseInt(b, 10) / 1000} kHz` : `${b} Hz`;
    const cells = [
      { tag: "th", scope: "row", text: label },
      { tag: "td", text: m.t60_s !== null ? m.t60_s.toFixed(2) : "--" },
      { tag: "td", text: m.edt_s !== null ? m.edt_s.toFixed(2) : "--" },
      { tag: "td", text: m.c80_db.toFixed(1) },
      { tag: "td", text: m.d50_pct.toFixed(0) },
    ];
    for (const c of cells) {
      const el = document.createElement(c.tag);
      if (c.scope) el.scope = c.scope;
      el.textContent = c.text;
      tr.appendChild(el);
    }
    tbody.appendChild(tr);
  }
}

async function init() {
  const canvas = document.getElementById("gl-canvas");
  const glEngine = new NewgrangeWebGLEngine(canvas);
  const audio = new NewgrangeAudioEngine();

  const [reportResp] = await Promise.all([
    fetch("../acoustics/acoustic_report.json"),
    glEngine.loadScene(
      "./data/scene_manifest.json",
      "../acoustics/eigenmodes_3d.bin",
      "../acoustics/ray_paths.json"
    ),
  ]);
  const report = await reportResp.json();
  const modes = report.fdtd_simulation.eigenmodes;
  const primaryHz = report.fdtd_simulation.target_110_hz;
  let primaryIdx = modes.findIndex((m) => Math.abs(m.freq_hz - primaryHz) < 0.2);
  if (primaryIdx < 0) primaryIdx = 0;

  // Populate eigenmode select
  const modeSel = document.getElementById("mode-select");
  modes.forEach((m, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = `Mode ${idx + 1}: ${m.freq_hz.toFixed(1)} Hz (${m.spl_db >= 0 ? "+" : ""}${m.spl_db.toFixed(1)} dB)`;
    if (idx === primaryIdx) opt.selected = true;
    modeSel.appendChild(opt);
  });
  glEngine.setEigenmode(primaryIdx);

  // Populate stations select
  const stSel = document.getElementById("station-select");
  const stDesc = document.getElementById("station-desc");
  const dlIr = document.getElementById("dl-active-ir");
  Object.entries(report.stations).forEach(([k, info]) => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = info.label;
    stSel.appendChild(opt);
  });

  const frfCanvas = document.getElementById("frf-canvas");
  const rt60Canvas = document.getElementById("rt60-canvas");
  const isoBody = document.getElementById("iso-table-body");
  const toneSlider = document.getElementById("tone-freq");
  const toneOut = document.getElementById("tone-freq-out");
  const chipPeak = document.getElementById("chip-peak-hz");
  const chipRt60 = document.getElementById("chip-rt60");

  chipPeak.textContent = `${primaryHz.toFixed(1)} Hz`;
  toneSlider.value = primaryHz.toFixed(1);
  toneOut.textContent = `${primaryHz.toFixed(1)} Hz`;
  audio.setPitch(primaryHz);

  const refreshStationUI = () => {
    const sk = stSel.value;
    const stObj = report.stations[sk];
    stDesc.textContent = stObj.description;
    dlIr.href = `../acoustics/${stObj.wav_file}`;
    const rt1k = stObj.octave_metrics["1000"]?.t60_s;
    chipRt60.textContent = rt1k ? `${rt1k.toFixed(2)} s` : "-- s";
    drawRT60Chart(rt60Canvas, stObj);
    populateISOTable(isoBody, stObj);
  };
  refreshStationUI();

  const refreshFRF = () => {
    const selMode = modes[parseInt(modeSel.value, 10)] ?? modes[0];
    drawFRFChart(frfCanvas, report, selMode.freq_hz, parseFloat(toneSlider.value));
  };
  refreshFRF();

  // Cutaway & Layer Controls
  const clipAxis = document.getElementById("clip-axis");
  const clipPos = document.getElementById("clip-pos");
  const clipPosOut = document.getElementById("clip-pos-out");
  const chkMoundWest = document.getElementById("chk-mound-west");
  const chkMoundEast = document.getElementById("chk-mound-east");

  // Camera Preset Buttons
  const camBtns = document.querySelectorAll(".hud-btn[data-cam]");
  camBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      camBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      const preset = btn.dataset.cam;
      if (preset === "exterior") {
        chkMoundWest.checked = true;
        chkMoundEast.checked = true;
        glEngine.state.layers.mound_west = true;
        glEngine.state.layers.mound_east = true;
        clipAxis.value = "-1";
        clipAxis.dispatchEvent(new Event("change"));
      } else if (preset === "cutaway") {
        chkMoundWest.checked = true;
        chkMoundEast.checked = false;
        glEngine.state.layers.mound_west = true;
        glEngine.state.layers.mound_east = false;
        clipAxis.value = "0";
        clipAxis.dispatchEvent(new Event("change"));
        clipPos.value = "0.15";
        clipPos.dispatchEvent(new Event("input"));
      } else {
        chkMoundEast.checked = false;
        glEngine.state.layers.mound_east = false;
        clipAxis.value = "-1";
        clipAxis.dispatchEvent(new Event("change"));
      }
      glEngine.setCameraPreset(preset);
      announce(`Camera moved to ${btn.textContent} view.`);
    });
  });

  clipAxis.addEventListener("change", () => {
    const ax = parseInt(clipAxis.value, 10);
    glEngine.state.clipAxis = ax;
    if (ax === 0) {
      clipPos.min = "-3.8"; clipPos.max = "4.0"; clipPos.value = "0.15";
    } else if (ax === 1) {
      clipPos.min = "-2.0"; clipPos.max = "25.0"; clipPos.value = "8.0";
    } else if (ax === 2) {
      clipPos.min = "0.5"; clipPos.max = "13.0"; clipPos.value = "4.2";
    }
    clipPos.disabled = ax < 0;
    glEngine.state.clipPos = parseFloat(clipPos.value);
    clipPosOut.textContent = `${parseFloat(clipPos.value).toFixed(2)} m`;
    updateRangeProgress(clipPos);
  });

  clipPos.addEventListener("input", () => {
    const v = parseFloat(clipPos.value);
    glEngine.state.clipPos = v;
    clipPosOut.textContent = `${v.toFixed(2)} m`;
    updateRangeProgress(clipPos);
  });

  const bindLayerChk = (id, layerName) => {
    const el = document.getElementById(id);
    el.addEventListener("change", () => {
      glEngine.state.layers[layerName] = el.checked;
    });
  };
  bindLayerChk("chk-mound-west", "mound_west");
  bindLayerChk("chk-mound-east", "mound_east");
  bindLayerChk("chk-quartz", "exterior");
  bindLayerChk("chk-solstice", "solstice");
  document.getElementById("chk-rays").addEventListener("change", (e) => {
    glEngine.state.showRays = e.target.checked;
  });
  document.getElementById("chk-cavity").addEventListener("change", (e) => {
    glEngine.state.layers.acoustic_cavity = e.target.checked;
  });

  // 3D Eigenmode Slice Controls
  document.getElementById("chk-eigenmode").addEventListener("change", (e) => {
    glEngine.state.showEigenmode = e.target.checked;
  });
  modeSel.addEventListener("change", () => {
    const idx = parseInt(modeSel.value, 10);
    glEngine.setEigenmode(idx);
    const f = modes[idx].freq_hz;
    toneSlider.value = f.toFixed(1);
    toneOut.textContent = `${f.toFixed(1)} Hz`;
    audio.setPitch(f);
    updateRangeProgress(toneSlider);
    refreshFRF();
    announce(`Selected resonant mode ${f.toFixed(1)} Hz.`);
  });

  const sliceZ = document.getElementById("slice-z");
  const sliceZOut = document.getElementById("slice-z-out");
  sliceZ.addEventListener("input", () => {
    const v = parseFloat(sliceZ.value);
    glEngine.state.sliceZ = v;
    sliceZOut.textContent = `${v.toFixed(2)} m`;
    updateRangeProgress(sliceZ);
  });

  const sliceX = document.getElementById("slice-y");
  const sliceXOut = document.getElementById("slice-y-out");
  sliceX.addEventListener("input", () => {
    const v = parseFloat(sliceX.value);
    glEngine.state.sliceX = v;
    sliceXOut.textContent = `${v.toFixed(2)} m`;
    updateRangeProgress(sliceX);
  });

  // Click FRF Canvas to pick nearest mode
  frfCanvas.addEventListener("click", (e) => {
    const rect = frfCanvas.getBoundingClientRect();
    const xRel = ((e.clientX - rect.left) / rect.width) * frfCanvas.width;
    const fClick = 20 + ((xRel - 36) / (frfCanvas.width - 46)) * 300;
    let bestIdx = 0;
    let bestDiff = Infinity;
    modes.forEach((m, i) => {
      const d = Math.abs(m.freq_hz - fClick);
      if (d < bestDiff) { bestDiff = d; bestIdx = i; }
    });
    modeSel.value = String(bestIdx);
    modeSel.dispatchEvent(new Event("change"));
  });

  // Web Audio Controls
  const activeWavUrl = () => `../acoustics/${report.stations[stSel.value].wav_file}`;

  stSel.addEventListener("change", async () => {
    refreshStationUI();
    await audio.loadIR(stSel.value, activeWavUrl());
    announce(`Loaded impulse response for ${report.stations[stSel.value].label}.`);
  });

  const wetSlider = document.getElementById("wet-mix");
  const wetOut = document.getElementById("wet-mix-out");
  wetSlider.addEventListener("input", () => {
    const v = parseInt(wetSlider.value, 10);
    wetOut.textContent = `${v}%`;
    audio.setWetMix(v / 100);
    updateRangeProgress(wetSlider);
  });

  const volSlider = document.getElementById("master-vol");
  const volOut = document.getElementById("master-vol-out");
  volSlider.addEventListener("input", () => {
    const v = parseInt(volSlider.value, 10);
    volOut.textContent = `${v}%`;
    audio.setMasterVolume(v / 100);
    updateRangeProgress(volSlider);
  });

  toneSlider.addEventListener("input", () => {
    const hz = parseFloat(toneSlider.value);
    toneOut.textContent = `${hz.toFixed(1)} Hz`;
    audio.setPitch(hz);
    updateRangeProgress(toneSlider);
    refreshFRF();
  });

  const btnTone = document.getElementById("btn-tone");
  const btnChant = document.getElementById("btn-chant");
  const btnSweep = document.getElementById("btn-sweep");
  const btnMic = document.getElementById("btn-mic");

  const resetPress = (except) => {
    for (const b of [btnTone, btnChant, btnSweep]) {
      if (b !== except) b.setAttribute("aria-pressed", "false");
    }
  };

  btnTone.addEventListener("click", async () => {
    const playing = await audio.toggleTone(activeWavUrl());
    resetPress(btnTone);
    btnTone.setAttribute("aria-pressed", String(playing));
    btnTone.textContent = playing ? "Stop Sine Tone" : "Play Sine Tone";
    btnChant.textContent = "Play Baritone Chant";
    btnSweep.textContent = "Sweep 40–220 Hz";
  });

  btnChant.addEventListener("click", async () => {
    const playing = await audio.toggleChant(activeWavUrl());
    resetPress(btnChant);
    btnChant.setAttribute("aria-pressed", String(playing));
    btnChant.textContent = playing ? "Stop Baritone Chant" : "Play Baritone Chant";
    btnTone.textContent = "Play Sine Tone";
    btnSweep.textContent = "Sweep 40–220 Hz";
  });

  btnSweep.addEventListener("click", async () => {
    const playing = await audio.toggleSweep(
      activeWavUrl(),
      (hz) => {
        toneSlider.value = hz.toFixed(1);
        toneOut.textContent = `${hz.toFixed(1)} Hz`;
        updateRangeProgress(toneSlider);
        refreshFRF();
      },
      () => {
        btnSweep.setAttribute("aria-pressed", "false");
        btnSweep.textContent = "Sweep 40–220 Hz";
      }
    );
    resetPress(btnSweep);
    btnSweep.setAttribute("aria-pressed", String(playing));
    btnSweep.textContent = playing ? "Stop Sweep" : "Sweep 40–220 Hz";
    btnTone.textContent = "Play Sine Tone";
    btnChant.textContent = "Play Baritone Chant";
  });

  document.getElementById("btn-lock-peak").addEventListener("click", () => {
    modeSel.value = String(primaryIdx);
    modeSel.dispatchEvent(new Event("change"));
  });

  document.getElementById("btn-clap").addEventListener("click", async () => {
    glEngine.triggerPulse(report.stations[stSel.value].src_m);
    await audio.playClap(activeWavUrl());
  });

  document.getElementById("btn-drum").addEventListener("click", async () => {
    glEngine.triggerPulse(report.stations[stSel.value].src_m);
    await audio.playDrum(activeWavUrl());
  });

  btnMic.addEventListener("click", async () => {
    try {
      const on = await audio.toggleMic(activeWavUrl());
      btnMic.setAttribute("aria-pressed", String(on));
      btnMic.textContent = on ? "Mute Microphone" : "Live Microphone";
    } catch (err) {
      announce(`Microphone unavailable: ${err.message}`);
    }
  });

  document.getElementById("btn-stop-all").addEventListener("click", () => {
    audio.stopAll();
    resetPress(null);
    btnMic.setAttribute("aria-pressed", "false");
    btnTone.textContent = "Play Sine Tone";
    btnChant.textContent = "Play Baritone Chant";
    btnSweep.textContent = "Sweep 40–220 Hz";
    btnMic.textContent = "Live Microphone";
    announce("All audio stopped.");
  });

  // Init slider fallback custom properties
  document.querySelectorAll('input[type="range"]').forEach(updateRangeProgress);

  const loop = (now) => {
    glEngine.renderFrame(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

init().catch((err) => {
  console.error(err);
  announce(`Error loading Newgrange 3D scene: ${err.message}`);
});
