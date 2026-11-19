import { ChambersAudioEngine } from "./chambers_audio.js";
import { ChambersWebGLEngine } from "./chambers_gl.js";

const DATA_URL = "../data/chamber_acoustics_data.json";
const MANIFEST_URL = "./data/chambers_manifest.json";
const COMP_MODES_URL = "../data/comparative_modes_3d.bin";
const NG_MODES_URL = "../../newgrange/acoustics/eigenmodes_3d.bin";
const MODELS_DIR_URL = "../models/";
const NG_GLB_URL = "../../newgrange/models/newgrange_monument.glb";

const liveEl = document.getElementById("chambers-live");
function announce(msg) {
  if (!liveEl) return;
  liveEl.textContent = "";
  requestAnimationFrame(() => { liveEl.textContent = msg; });
}

function updateRangeProgress(el) {
  const min = parseFloat(el.min || "0");
  const max = parseFloat(el.max || "100");
  const val = parseFloat(el.value || "0");
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  el.style.setProperty("--progress", `${pct.toFixed(1)}%`);
}

// ---------------------------------------------------------------------------
// Chart 1: 7 Chambers vs Male (115 +/- 21 Hz) & Female (199 Hz) Voice Pitch
// ---------------------------------------------------------------------------
function drawBandChart(canvas, data, activeSiteId) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const padL = 132, padR = 16, padT = 26, padB = 34;
  const pw = w - padL - padR, ph = h - padT - padB;
  const fMin = 70, fMax = 225;
  const xOf = (f) => padL + ((f - fMin) / (fMax - fMin)) * pw;

  // Male typical range [94, 136] Hz
  ctx.fillStyle = "rgba(56, 189, 248, 0.14)";
  ctx.fillRect(xOf(94), padT, xOf(136) - xOf(94), ph);

  // Surveyed 95-120 Hz band
  ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
  ctx.fillRect(xOf(95), padT, xOf(120) - xOf(95), ph);

  // Reference lines: Male mean 115 Hz & Female mean 199 Hz
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = "#38bdf8";
  ctx.beginPath(); ctx.moveTo(xOf(115), padT); ctx.lineTo(xOf(115), padT + ph); ctx.stroke();
  ctx.strokeStyle = "#f472b6";
  ctx.beginPath(); ctx.moveTo(xOf(199), padT); ctx.lineTo(xOf(199), padT + ph); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#fde68a";
  ctx.font = "600 10px sans-serif";
  ctx.fillText("95–120 Hz", xOf(96), 14);
  ctx.fillStyle = "#7dd3fc";
  ctx.fillText("Male 115 Hz", xOf(117), 14);
  ctx.fillStyle = "#f9a8d4";
  ctx.fillText("Female 199 Hz", xOf(170), 14);

  const rows = [
    { id: "maeshowe", label: "Maeshowe", freqs: [109.8] },
    { id: "newgrange", label: "Newgrange", freqs: [110.0] },
    { id: "loughcrew_l", label: "Loughcrew Cairn L", freqs: [110.0] },
    { id: "loughcrew_i", label: "Loughcrew Cairn I", freqs: [112.0] },
    { id: "waylands_smithy", label: "Wayland's Smithy", freqs: [95.0, 112.0] },
    { id: "chun_quoit", label: "Chûn Quoit", freqs: [110.0] },
    { id: "carn_euny", label: "Carn Euny", freqs: [99.0] },
  ];

  const rowH = ph / rows.length;
  rows.forEach((r, idx) => {
    const y = padT + (idx + 0.5) * rowH;
    const isSel = r.id === activeSiteId;
    ctx.strokeStyle = "#262d3a";
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + pw, y); ctx.stroke();

    ctx.fillStyle = isSel ? "#fbbf24" : "#cbd5e1";
    ctx.font = isSel ? "700 11px sans-serif" : "11px sans-serif";
    ctx.fillText(r.label, 8, y + 4);

    if (r.freqs.length === 2) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xOf(r.freqs[0]), y); ctx.lineTo(xOf(r.freqs[1]), y); ctx.stroke();
    }
    for (const fq of r.freqs) {
      ctx.fillStyle = isSel ? "#fbbf24" : "#f59e0b";
      ctx.beginPath();
      ctx.arc(xOf(fq), y, isSel ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  for (const ft of [80, 100, 120, 140, 160, 180, 200, 220]) {
    ctx.fillText(`${ft}`, xOf(ft) - 8, h - 10);
  }
  ctx.fillText("Hz", w - 20, h - 10);
}

// ---------------------------------------------------------------------------
// Chart 2: Maeshowe vs Newgrange 3D FDTD FRF Comparison
// ---------------------------------------------------------------------------
function drawMultiCurveChart(canvas, freqs, seriesList, yMin = -30, yMax = 42, shade95_120 = true) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const padL = 38, padR = 12, padT = 20, padB = 24;
  const pw = w - padL - padR, ph = h - padT - padB;
  const fMin = freqs[0], fMax = freqs[freqs.length - 1];
  const xOf = (f) => padL + ((f - fMin) / (fMax - fMin)) * pw;
  const yOf = (v) => padT + (1 - (Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * ph;

  if (shade95_120 && fMin < 95 && fMax > 120) {
    ctx.fillStyle = "rgba(245, 158, 11, 0.14)";
    ctx.fillRect(xOf(95), padT, xOf(120) - xOf(95), ph);
  }

  ctx.strokeStyle = "#262d3a";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const val = yMin + (i / 4) * (yMax - yMin);
    const y = yOf(val);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + pw, y); ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText(`${val.toFixed(0)}`, 4, y + 3);
  }

  seriesList.forEach((s, idx) => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width ?? 1.8;
    ctx.beginPath();
    for (let i = 0; i < freqs.length; i++) {
      const x = xOf(freqs[i]);
      const y = yOf(s.values[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Legend item
    const lx = padL + 8 + idx * 175;
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, 5, 10, 8);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "10px sans-serif";
    ctx.fillText(s.label, lx + 14, 13);
  });

  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  const step = Math.max(1, Math.round((fMax - fMin) / 5));
  for (let f = Math.ceil(fMin); f <= fMax; f += step) {
    ctx.fillText(`${f.toFixed(fMax <= 10 ? 1 : 0)} Hz`, xOf(f) - 10, h - 6);
  }
}

// ---------------------------------------------------------------------------
// Chart 3: Passage Standing-Wave Walker
// ---------------------------------------------------------------------------
function drawPassageWalk(canvas, swData, walkerY) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const ys = swData.y_m, spls = swData.spl_db;
  const padL = 38, padR = 12, padT = 16, padB = 24;
  const pw = w - padL - padR, ph = h - padT - padB;
  const xOf = (y) => padL + (y / 24.2) * pw;
  const yOf = (db) => padT + (1 - (Math.max(-40, Math.min(2, db)) + 40) / 42) * ph;

  // Threshold vertical line y=18.95 m
  ctx.strokeStyle = "#fb7185";
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(xOf(18.95), padT); ctx.lineTo(xOf(18.95), padT + ph); ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < ys.length; i++) {
    const px = xOf(ys[i]), py = yOf(spls[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Interpolate walker SPL
  let bestSpl = spls[0];
  let bestD = Infinity;
  for (let i = 0; i < ys.length; i++) {
    const d = Math.abs(ys[i] - walkerY);
    if (d < bestD) { bestD = d; bestSpl = spls[i]; }
  }
  const wx = xOf(walkerY), wy = yOf(bestSpl);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(wx, padT); ctx.lineTo(wx, padT + ph); ctx.stroke();
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath(); ctx.arc(wx, wy, 5.5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  ctx.fillText("0 m (Door)", padL, h - 6);
  ctx.fillText("10 m", xOf(10) - 10, h - 6);
  ctx.fillText("18.95 m Threshold", xOf(18.95) - 36, 12);
  ctx.fillText("24 m", w - 28, h - 6);
  ctx.fillText("0 dB", 4, yOf(0) + 3);
  ctx.fillText("-35", 4, yOf(-35) + 3);
  return bestSpl;
}

// ---------------------------------------------------------------------------
// Chart 4: Helmholtz Cavity-Lung Animation
// ---------------------------------------------------------------------------
function drawLungAnim(canvas, now, leakPct, volM3) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const leak = leakPct / 100.0;
  const f0 = 2.0 * Math.sqrt(92.0 / volM3);
  const pulseAmp = Math.max(0.08, 1.0 - 0.90 * leak);
  const phase = now * 0.001 * 2.0 * Math.PI * f0;
  const osc = Math.sin(phase) * pulseAmp;

  // Draw passage neck + square chamber
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3;
  // Chamber outer wall
  const chX = 240, chY = 38, chW = 220, chH = 160;
  ctx.strokeRect(chX, chY, chW, chH);
  // Passage neck
  ctx.fillStyle = "#11151c";
  ctx.fillRect(50, 96, 195, 44);
  ctx.strokeStyle = "#94a3b8";
  ctx.beginPath();
  ctx.moveTo(50, 96); ctx.lineTo(240, 96);
  ctx.moveTo(50, 140); ctx.lineTo(240, 140);
  ctx.stroke();

  // Pressure glow inside chamber
  const pCol = osc >= 0
    ? `rgba(245, 158, 11, ${(0.12 + 0.45 * Math.abs(osc)).toFixed(2)})`
    : `rgba(56, 189, 248, ${(0.12 + 0.45 * Math.abs(osc)).toFixed(2)})`;
  ctx.fillStyle = pCol;
  ctx.fillRect(chX + 3, chY + 3, chW - 6, chH - 6);

  // Air mass piston inside passage neck oscillating in/out
  const px = 145 + osc * 42;
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(px, 118, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 11px sans-serif";
  ctx.fillText(osc >= 0 ? "Air In ->" : "<- Air Out", Math.max(55, px - 26), 86);

  // Leakage arrows escaping stone joints & roof when leakPct > 15%
  if (leak > 0.12) {
    ctx.strokeStyle = `rgba(248, 113, 113, ${Math.min(0.95, leak).toFixed(2)})`;
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const lx = chX + 25 + k * 42;
      const off = ((now * 0.04 + k * 9) % 24) * leak;
      ctx.beginPath();
      ctx.moveTo(lx, chY);
      ctx.lineTo(lx, chY - 12 - off);
      ctx.stroke();
    }
    ctx.fillStyle = "#fca5a5";
    ctx.font = "11px sans-serif";
    ctx.fillText("Pressure leaking through cairn & joints", chX + 4, 22);
  } else {
    ctx.fillStyle = "#7dd3fc";
    ctx.font = "11px sans-serif";
    ctx.fillText("Clay-sealed fabric traps full 2 Hz pressure", chX + 4, 22);
  }

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "11px monospace";
  ctx.fillText(`f_H = ${f0.toFixed(2)} Hz | Q_eff = ${(14.0 / (1 + leak * 26.0)).toFixed(1)}`, 52, h - 14);
}

// ---------------------------------------------------------------------------
// Chart 5: UCLA EEG Study Summary (Cook et al. 2008)
// ---------------------------------------------------------------------------
function drawEEGChart(canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const tones = [90, 100, 110, 120, 130];
  // Illustrative visual contrast reflecting Cook et al. (2008): distinct left-temporal shift at 110 Hz
  const labels = ["Baseline", "Baseline", "Left-Temporal Drop", "Baseline", "Baseline"];
  const heights = [0.35, 0.38, 0.92, 0.40, 0.34];

  const padL = 36, padR = 16, padT = 24, padB = 34;
  const pw = w - padL - padR, ph = h - padT - padB;
  const gw = pw / tones.length;
  const bw = gw * 0.56;

  tones.forEach((hz, i) => {
    const x = padL + i * gw + gw * 0.22;
    const bh = heights[i] * ph;
    ctx.fillStyle = hz === 110 ? "#f59e0b" : "#475569";
    ctx.fillRect(x, padT + ph - bh, bw, bh);
    ctx.fillStyle = hz === 110 ? "#fde68a" : "#cbd5e1";
    ctx.font = hz === 110 ? "700 11px sans-serif" : "11px sans-serif";
    ctx.fillText(`${hz} Hz`, x + bw * 0.18, h - 10);
    if (hz === 110) {
      ctx.fillText(labels[i], Math.max(4, x - 20), padT + ph - bh - 6);
    }
  });
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  ctx.fillText("Relative Left-Temporal Deactivation / Prefrontal Shift (Cook et al. 2008 Pilot, n=30)", 12, 14);
}

// ---------------------------------------------------------------------------
// Main App Controller
// ---------------------------------------------------------------------------
async function init() {
  const data = await (await fetch(DATA_URL)).json();
  const glCanvas = document.getElementById("gl-chambers");
  const glEngine = new ChambersWebGLEngine(glCanvas);
  const audio = new ChambersAudioEngine();
  await glEngine.loadAssets(MANIFEST_URL, COMP_MODES_URL, NG_MODES_URL);

  const sitesById = Object.fromEntries(data.sites.map((s) => [s.id, s]));
  let activeSiteId = "maeshowe";

  const bandCanvas = document.getElementById("band-canvas");
  const cmpCanvas = document.getElementById("cmp-frf-canvas");
  const walkCanvas = document.getElementById("passage-walk-canvas");
  const helmCanvas = document.getElementById("helm-canvas");
  const lungCanvas = document.getElementById("lung-canvas");
  const testCanvas = document.getElementById("test-canvas");
  const eegCanvas = document.getElementById("eeg-canvas");

  const cutAxis = document.getElementById("cut-axis");
  const cutPos = document.getElementById("cut-pos");
  const cutPosOut = document.getElementById("cut-pos-out");
  const chkPart = document.getElementById("chk-partitions");
  const wrapPart = document.getElementById("wrap-partitions");
  const pitchSlider = document.getElementById("audio-pitch");
  const pitchOut = document.getElementById("audio-pitch-out");

  function refreshSitePanel(siteId) {
    activeSiteId = siteId;
    const s = sitesById[siteId];
    document.getElementById("site-title").textContent = s.name;
    document.getElementById("site-sub").textContent = `${s.location} · ${s.era} · ${s.type}`;

    const dlLink = document.getElementById("dl-site-glb");
    dlLink.href = s.id === "newgrange" ? NG_GLB_URL : `${MODELS_DIR_URL}${s.glb_file}`;

    const dlSpecs = document.getElementById("site-specs");
    dlSpecs.replaceChildren();
    const ch = s.chamber_dims_m;
    const ps = s.passage_dims_m;
    const entries = [
      ["Chamber", `${ch.width} × ${ch.length} × ${ch.height} m`],
      ["Passage", `${ps.length} m long`],
      ["Standing Wave", s.measured_band_label],
      ["Helmholtz", s.helmholtz_measured ? s.helmholtz_measured.status : "Not reported / open dolmen"],
      ["Masonry", s.masonry],
    ];
    for (const [k, v] of entries) {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      dlSpecs.append(dt, dd);
    }

    const ul = document.getElementById("site-bullets");
    ul.replaceChildren();
    for (const b of s.key_features) {
      const li = document.createElement("li"); li.textContent = b;
      ul.appendChild(li);
    }

    wrapPart.style.opacity = siteId === "loughcrew_l" ? "1.0" : "0.55";
    chkPart.disabled = siteId !== "loughcrew_l";

    const fDef = s.measured_resonances_hz[0] || 110.0;
    pitchSlider.value = fDef.toFixed(1);
    pitchOut.textContent = `${fDef.toFixed(1)} Hz`;
    audio.setPitch(fDef);
    updateRangeProgress(pitchSlider);

    if (s.clip_default) {
      cutAxis.value = String(s.clip_default.axis);
      cutPos.value = String(s.clip_default.pos);
      cutPosOut.textContent = `${s.clip_default.pos.toFixed(2)} m`;
      updateRangeProgress(cutPos);
    }

    glEngine.selectSite(siteId, s.camera_preset, s.clip_default, s.slice_defaults);
    drawBandChart(bandCanvas, data, siteId);
  }

  // Tabs
  const siteTabs = document.querySelectorAll(".site-tab[data-site]");
  siteTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      siteTabs.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      refreshSitePanel(btn.dataset.site);
      announce(`Loaded 3D model for ${sitesById[btn.dataset.site].name}.`);
    });
  });

  // Cutaway & layer toggles
  cutAxis.addEventListener("change", () => {
    const ax = parseInt(cutAxis.value, 10);
    glEngine.state.clipAxis = ax;
    if (ax === 0) { cutPos.min = "-4.5"; cutPos.max = "4.5"; }
    else if (ax === 1) { cutPos.min = "-1.0"; cutPos.max = "22.0"; }
    else if (ax === 2) { cutPos.min = "0.2"; cutPos.max = "8.5"; }
    cutPos.disabled = ax < 0;
    updateRangeProgress(cutPos);
  });
  cutPos.addEventListener("input", () => {
    const v = parseFloat(cutPos.value);
    glEngine.state.clipPos = v;
    cutPosOut.textContent = `${v.toFixed(2)} m`;
    updateRangeProgress(cutPos);
  });
  document.getElementById("chk-mound-east").addEventListener("change", (e) => {
    glEngine.state.showEastMound = e.target.checked;
  });
  document.getElementById("chk-scale-fig").addEventListener("change", (e) => {
    glEngine.state.showScaleFigure = e.target.checked;
  });
  document.getElementById("chk-wave-slice").addEventListener("change", (e) => {
    glEngine.state.showWaveSlice = e.target.checked;
  });
  chkPart.addEventListener("change", (e) => {
    glEngine.state.showPartitions = e.target.checked;
  });

  // Audio controls
  const volSlider = document.getElementById("audio-vol");
  const volOut = document.getElementById("audio-vol-out");
  pitchSlider.addEventListener("input", () => {
    const v = parseFloat(pitchSlider.value);
    pitchOut.textContent = `${v.toFixed(1)} Hz`;
    audio.setPitch(v);
    updateRangeProgress(pitchSlider);
  });
  volSlider.addEventListener("input", () => {
    const v = parseInt(volSlider.value, 10);
    volOut.textContent = `${v}%`;
    audio.setVolume(v / 100);
    updateRangeProgress(volSlider);
  });

  const btnTone = document.getElementById("btn-play-tone");
  const btnChant = document.getElementById("btn-play-chant");
  const btnPulse = document.getElementById("btn-play-pulse");
  const clearAudioBtns = (except) => {
    for (const b of [btnTone, btnChant, btnPulse]) {
      if (b !== except) b.setAttribute("aria-pressed", "false");
    }
  };
  btnTone.addEventListener("click", async () => {
    const on = await audio.toggleTone();
    clearAudioBtns(btnTone);
    btnTone.setAttribute("aria-pressed", String(on));
  });
  btnChant.addEventListener("click", async () => {
    const on = await audio.toggleChant();
    clearAudioBtns(btnChant);
    btnChant.setAttribute("aria-pressed", String(on));
  });
  btnPulse.addEventListener("click", async () => {
    const on = await audio.togglePulse2Hz();
    clearAudioBtns(btnPulse);
    btnPulse.setAttribute("aria-pressed", String(on));
  });
  document.getElementById("btn-audio-stop").addEventListener("click", () => {
    audio.stopAll();
    clearAudioBtns(null);
  });

  // Band chart click -> switch 3D monument
  bandCanvas.addEventListener("click", (e) => {
    const rect = bandCanvas.getBoundingClientRect();
    const yRel = ((e.clientY - rect.top) / rect.height) * bandCanvas.height;
    const rowIdx = Math.floor(((yRel - 26) / (bandCanvas.height - 60)) * 7);
    const order = ["maeshowe", "newgrange", "loughcrew_l", "loughcrew_i", "waylands_smithy", "chun_quoit", "carn_euny"];
    const picked = order[Math.max(0, Math.min(6, rowIdx))];
    if (sitesById[picked]?.has_3d_model) {
      document.querySelector(`.site-tab[data-site="${picked}"]`)?.click();
    }
  });

  // Explainer 1: Interactive Room-Mode Arithmetic Calculator
  const calcLx = document.getElementById("calc-lx");
  const calcLy = document.getElementById("calc-ly");
  const calcLz = document.getElementById("calc-lz");
  const calcTemp = document.getElementById("calc-temp");
  const calcReadout = document.getElementById("calc-readout") || document.getElementById("calc-results");

  function updateRoomCalc() {
    const lx = parseFloat(calcLx.value), ly = parseFloat(calcLy.value), lz = parseFloat(calcLz.value);
    const T = parseFloat(calcTemp.value);
    const c = 331.45 * Math.sqrt((T + 273.15) / 273.15);
    const halfWave110 = c / (2 * 110.0);

    document.getElementById("calc-lx-out").textContent = `${lx.toFixed(2)} m`;
    document.getElementById("calc-ly-out").textContent = `${ly.toFixed(2)} m`;
    document.getElementById("calc-lz-out").textContent = `${lz.toFixed(2)} m`;
    document.getElementById("calc-temp-out").textContent = `${T.toFixed(0)} °C`;
    [calcLx, calcLy, calcLz, calcTemp].forEach(updateRangeProgress);

    const modes = [];
    const nxM = Math.ceil(2 * 130 * lx / c) + 1;
    const nyM = Math.ceil(2 * 130 * ly / c) + 1;
    const nzM = Math.ceil(2 * 130 * lz / c) + 1;
    for (let nx = 0; nx <= nxM; nx++) {
      for (let ny = 0; ny <= nyM; ny++) {
        for (let nz = 0; nz <= nzM; nz++) {
          if (nx === 0 && ny === 0 && nz === 0) continue;
          const f = 0.5 * c * Math.sqrt((nx / lx) ** 2 + (ny / ly) ** 2 + (nz / lz) ** 2);
          if (f < 130.0) modes.push({ idx: [nx, ny, nz], f });
        }
      }
    }
    modes.sort((a, b) => a.f - b.f);
    const inBand = modes.filter((m) => m.f >= 95.0 && m.f <= 120.0);

    // Check degenerate pairs (square stacking)
    const freqMap = new Map();
    for (const m of inBand) {
      const key = m.f.toFixed(1);
      freqMap.set(key, (freqMap.get(key) || 0) + 1);
    }
    const stacked = [...freqMap.entries()].filter(([, cnt]) => cnt > 1).map(([fk, cnt]) => `${fk} Hz (×${cnt})`);

    const lines = [
      `Speed of sound c = ${c.toFixed(1)} m/s | 110 Hz half-wave λ/2 = ${halfWave110.toFixed(2)} m`,
      `Modes < 130 Hz: ${modes.length} | Modes inside 95–120 Hz band: ${inBand.length}`,
      stacked.length > 0
        ? `Square degeneracy stacking: ${stacked.join(", ")}`
        : "No degenerate stacking (rectangular / asymmetric geometry).",
    ];
    calcReadout.replaceChildren();
    lines.forEach((txt) => {
      const p = document.createElement("p");
      p.textContent = txt;
      calcReadout.appendChild(p);
    });
  }
  [calcLx, calcLy, calcLz, calcTemp].forEach((el) => el.addEventListener("input", updateRoomCalc));
  document.querySelectorAll(".preset-btn[data-box]").forEach((b) => {
    b.addEventListener("click", () => {
      const [lx, ly, lz, t] = b.dataset.box.split(",");
      calcLx.value = lx; calcLy.value = ly; calcLz.value = lz; calcTemp.value = t;
      updateRoomCalc();
    });
  });
  updateRoomCalc();

  // Populate 7-site accessible table
  const tbody = document.getElementById("sites-table-body");
  for (const s of data.sites) {
    const tr = document.createElement("tr");
    const ch = s.chamber_dims_m;
    const cells = [
      s.name,
      `${ch.width} × ${ch.length} × ${ch.height}`,
      `${s.passage_dims_m.length} m`,
      s.measured_band_label,
      s.helmholtz_measured ? s.helmholtz_measured.status : "Not measured / open",
      s.masonry,
    ];
    cells.forEach((txt, i) => {
      const el = document.createElement(i === 0 ? "th" : "td");
      if (i === 0) el.scope = "row";
      el.textContent = txt;
      tr.appendChild(el);
    });
    tbody.appendChild(tr);
  }

  // Explainer 2: Maeshowe vs Newgrange FRF + Passage Walker
  drawMultiCurveChart(cmpCanvas, data.fdtd_comparison.freqs_hz, [
    { label: `Maeshowe Square (${data.fdtd_comparison.maeshowe_peak.peak_hz} Hz, Q=${data.fdtd_comparison.maeshowe_peak.q_factor})`, color: "#f59e0b", values: data.fdtd_comparison.maeshowe_db },
    { label: `Newgrange Cruciform (${data.fdtd_comparison.newgrange_primary_hz} Hz)`, color: "#38bdf8", values: data.fdtd_comparison.newgrange_db },
  ], -35, 35, true);

  const walkSlider = document.getElementById("walk-y");
  const walkOut = document.getElementById("walk-y-out");
  const walkReadout = document.getElementById("walk-readout");
  const swData = data.fdtd_comparison.newgrange_passage_standing_wave;
  function updateWalker() {
    const y = parseFloat(walkSlider.value);
    const spl = drawPassageWalk(walkCanvas, swData, y);
    const zone = y < 18.95 ? "Passage" : "Cruciform Chamber";
    walkOut.textContent = `${y.toFixed(2)} m (${zone})`;
    walkReadout.textContent = `Position y = ${y.toFixed(2)} m -> Relative SPL at ${data.fdtd_comparison.newgrange_primary_hz} Hz = ${spl.toFixed(1)} dB (${spl < -25 ? "Acoustic Node" : "Acoustic Antinode / Chamber"})`;
    audio.setPassageGainFromDb(spl);
    updateRangeProgress(walkSlider);
  }
  walkSlider.addEventListener("input", updateWalker);
  updateWalker();

  // Explainer 3: Helmholtz Cavity & Leakage Simulator
  const helmLeak = document.getElementById("helm-leak");
  const helmVol = document.getElementById("helm-vol");
  const helmLeakOut = document.getElementById("helm-leak-out");
  const helmVolOut = document.getElementById("helm-vol-out");

  function updateHelmholtz() {
    const leakPct = parseFloat(helmLeak.value);
    const vol = parseFloat(helmVol.value);
    helmLeakOut.textContent = leakPct < 10 ? `${leakPct}% (Clay-Sealed)` : (leakPct > 70 ? `${leakPct}% (Permeable Cairns)` : `${leakPct}%`);
    helmVolOut.textContent = `${vol} m³`;
    [helmLeak, helmVol].forEach(updateRangeProgress);

    const freqs = data.experiments.test3_helmholtz_sealing.freqs_hz;
    const f0 = 2.0 * Math.sqrt(92.0 / vol);
    const qEff = 14.0 / (1.0 + (leakPct / 100.0) * 28.0);
    const simVals = freqs.map((f) => {
      const m = 1.0 / Math.sqrt((1.0 - (f / f0) ** 2) ** 2 + (f / (f0 * Math.max(0.25, qEff))) ** 2);
      return 20.0 * Math.log10(Math.max(m, 1e-4));
    });
    drawMultiCurveChart(helmCanvas, freqs, [
      { label: `Active Model (f0=${f0.toFixed(2)} Hz, Q=${qEff.toFixed(1)})`, color: "#fbbf24", values: simVals },
      { label: "Maeshowe Sealed Ref (2.0 Hz)", color: "#38bdf8", values: data.experiments.test3_helmholtz_sealing.maeshowe_sealed_db, width: 1.2 },
      { label: "Newgrange Leaking Ref", color: "#fb7185", values: data.experiments.test3_helmholtz_sealing.newgrange_permeable_db, width: 1.2 },
    ], -25, 28, false);
  }
  helmLeak.addEventListener("input", updateHelmholtz);
  helmVol.addEventListener("input", updateHelmholtz);
  document.getElementById("btn-helm-maeshowe").addEventListener("click", () => {
    helmLeak.value = "0"; helmVol.value = "92"; updateHelmholtz();
  });
  document.getElementById("btn-helm-newgrange").addEventListener("click", () => {
    helmLeak.value = "85"; helmVol.value = "108"; updateHelmholtz();
  });
  updateHelmholtz();

  // Explainer 4: Four Falsifiable Tests Explorer
  const testTitle = document.getElementById("test-title");
  const testDesc = document.getElementById("test-desc");
  const testStats = document.getElementById("test-stats");
  const testActions = document.getElementById("test-actions");

  function renderTest(tid) {
    const freqs = data.fdtd_comparison.freqs_hz;
    testActions.replaceChildren();
    testStats.replaceChildren();
    const addStat = (t) => { const p = document.createElement("p"); p.textContent = t; testStats.appendChild(p); };

    if (tid === "test1") {
      testTitle.textContent = "Test 1: Square vs Irregular Chamber Resonance";
      testDesc.textContent = "Compares Maeshowe's tightly dressed 4.7 m square flagstone chamber against Newgrange's irregular boulder-lined cruciform chamber (Watson & Keating 2004).";
      addStat(`Maeshowe Square Peak: ${data.fdtd_comparison.maeshowe_peak.peak_hz} Hz (+${data.fdtd_comparison.maeshowe_peak.peak_db} dB, Q = ${data.fdtd_comparison.maeshowe_peak.q_factor})`);
      addStat(`Ideal Maeshowe 4.7 m Box: (3,0,0) & (0,3,0) stack at 109.79 Hz; Newgrange FDTD peaks at ${data.fdtd_comparison.newgrange_primary_hz} Hz.`);
      drawMultiCurveChart(testCanvas, freqs, [
        { label: "Maeshowe (Square)", color: "#f59e0b", values: data.fdtd_comparison.maeshowe_db },
        { label: "Newgrange (Cruciform)", color: "#38bdf8", values: data.fdtd_comparison.newgrange_db },
      ], -35, 35, true);
    } else if (tid === "test2") {
      const t2 = data.experiments.test2_loughcrew_partitions;
      testTitle.textContent = "Test 2: Loughcrew Cairn L — Partition Stones ON vs OFF";
      testDesc.textContent = "3D FDTD simulation testing Jahn et al.'s (1996) hypothesis that radial partition orthostats tune Loughcrew Cairn L's chamber resonance.";
      addStat(`With 7 Radial Partitions + Pillar: Peak = ${t2.with_partitions_peak.peak_hz} Hz (+${t2.with_partitions_peak.peak_db} dB, Q = ${t2.with_partitions_peak.q_factor})`);
      addStat(`Open Chamber (No Partitions): Peak shifts to ${t2.without_partitions_peak.peak_hz} Hz (+${t2.without_partitions_peak.peak_db} dB). Adding partitions tunes the peak right onto 108 Hz near the measured 110 Hz.`);
      drawMultiCurveChart(testCanvas, freqs, [
        { label: `Partitions ON (${t2.with_partitions_peak.peak_hz} Hz)`, color: "#f59e0b", values: t2.with_partitions_db },
        { label: `Open Chamber (${t2.without_partitions_peak.peak_hz} Hz)`, color: "#38bdf8", values: t2.without_partitions_db },
      ], -15, 45, true);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "preset-btn";
      b.textContent = "Inspect Loughcrew Cairn L in 3D";
      b.addEventListener("click", () => document.querySelector('.site-tab[data-site="loughcrew_l"]')?.click());
      testActions.appendChild(b);
    } else if (tid === "test3") {
      const h3 = data.experiments.test3_helmholtz_sealing;
      testTitle.textContent = "Test 3: Clay-Sealed vs Permeable Cairn Helmholtz Threshold";
      testDesc.textContent = "Tests why clay-sealed Maeshowe acts as a 2.0 Hz Helmholtz pressure vessel (120 dB) while Newgrange's boulder joints and roof rainwater cuts vent pressure.";
      addStat(`Maeshowe Sealed: f_H = ${h3.maeshowe_parameters.f0_hz} Hz (Measured: 120 dB walking, >110 dB drum).`);
      addStat(`Newgrange Permeable: Predicted f_H ≈ ${h3.newgrange_parameters.predicted_f0_hz} Hz, empirically measured 0 dB due to air leakage.`);
      drawMultiCurveChart(testCanvas, h3.freqs_hz, [
        { label: "Maeshowe Sealed (2.0 Hz)", color: "#f59e0b", values: h3.maeshowe_sealed_db },
        { label: "Newgrange Permeable", color: "#fb7185", values: h3.newgrange_permeable_db },
      ], -25, 26, false);
    } else if (tid === "test4") {
      const t4 = data.experiments.test4_newgrange_roofbox_mouthpiece;
      testTitle.textContent = "Test 4: Newgrange Roof-Box as an Acoustic Mouthpiece";
      testDesc.textContent = "3D FDTD comparing an exterior sound source placed directly outside the Roof-Box slit vs the Entrance Doorway, recorded 20.7 m away in the central chamber.";
      addStat(`Roof-Box -> Chamber (95–120 Hz peak): +${t4.roofbox_peak_95_120_db} dB | Doorway -> Chamber: +${t4.doorway_peak_95_120_db} dB.`);
      addStat(`Despite being a tiny 26 × 92 cm slot, the elevated Roof-Box couples ${t4.delta_db >= 0 ? "+" : ""}${t4.delta_db} dB stronger in 95–120 Hz straight down the upper passage bore!`);
      drawMultiCurveChart(testCanvas, freqs, [
        { label: "Roof-Box Slit -> Chamber", color: "#fbbf24", values: t4.roofbox_to_chamber_db },
        { label: "Entrance Doorway -> Chamber", color: "#38bdf8", values: t4.doorway_to_chamber_db },
      ], -45, 12, true);
    }
  }

  const testTabs = document.querySelectorAll(".test-tab[data-test]");
  testTabs.forEach((b) => {
    b.addEventListener("click", () => {
      testTabs.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      renderTest(b.dataset.test);
    });
  });
  renderTest("test1");

  // EEG chart & 16-source list
  drawEEGChart(eegCanvas);
  const srcOl = document.getElementById("sources-list");
  for (const src of data.sources) {
    const li = document.createElement("li");
    const txt = document.createTextNode(`${src.citation} `);
    const a = document.createElement("a");
    a.href = src.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = src.url;
    li.append(txt, a);
    srcOl.appendChild(li);
  }

  document.querySelectorAll('input[type="range"]').forEach(updateRangeProgress);
  refreshSitePanel("maeshowe");

  const loop = (now) => {
    glEngine.renderFrame(now);
    drawLungAnim(lungCanvas, now, parseFloat(helmLeak.value), parseFloat(helmVol.value));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

init().catch((err) => {
  console.error(err);
  announce(`Error loading comparative chambers observatory: ${err.message}`);
});
