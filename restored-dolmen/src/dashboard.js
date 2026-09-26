// The interactive dashboard: a three.js model of the restored tomb, and live charts of the collector's acoustics.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { buildDolmen } from "./model.js";
import {
  BAND,
  CHAMBER,
  CHAMBER_VOLUME,
  DESIGN,
  REF_KM,
  TARGET_DB,
  bandMinimum,
  collectorGain,
  halfBeamwidth,
  pattern,
  rangeKm,
  reverbTime,
  rimPhaseError,
  roomModes,
  skinArea,
} from "./acoustics.js";
import { MATERIALS } from "./materials.js";

const $ = (id) => document.getElementById(id);
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const INK = "#17212b", INK2 = "#4b5864", FAINT = "#7c8894", RULE = "#c9d0d4", GRID = "#e4e8ea";
const BLUE = "#1f57a3", BLUE_TINT = "#e3ecf7", SIGNAL = "#c4471b", GREEN = "#2c7a3a";

const CLUSTERS = [
  ["Ballyvennaght", 0.915],
  ["Malin More", 0.979],
  ["Burren", 1.825],
  ["Easkey", 2.622],
  ["Slieve Gullion", 4.671],
];
const STAGES = [
  "Portal stones raised in packed sockets",
  "Side stones and backstone set",
  "Capstone levered up on timber and earth",
  "Doorstone and dry-stone packing, leaving a 0.3 m throat",
  "Chamber lined with bracken and fleece; seat stone set",
  "Cairn raised over the chamber",
  "Kerb of boulders set round the cairn",
  "Collector seated in the throat on its trestles",
  "Listener in place",
];

const state = {
  params: { mouthD: DESIGN.mouthD, hornL: DESIGN.hornL, eta: DESIGN.eta },
  view: "restored",
  build: 9,
  playing: false,
  explode: 0,
  sound: true,
  freq: 250,
  lining: DESIGN.lining,
  selected: null,
};

/* ---------------- numbers that ease to their new value ---------------- */
const easing = [];
const setNum = (el, to, decimals, suffix = "") => {
  const from = el._v ?? to;
  el._v = to;
  if (still || from === to) {
    el.innerHTML = `${to.toFixed(decimals)}${suffix}`;
    return;
  }
  easing.push({ el, from, to, decimals, suffix, t0: performance.now() });
};
const stepNumbers = (now) => {
  for (let i = easing.length - 1; i >= 0; i--) {
    const e = easing[i];
    const k = Math.min(1, (now - e.t0) / 450);
    const v = e.from + (e.to - e.from) * (1 - (1 - k) ** 3);
    e.el.innerHTML = `${v.toFixed(e.decimals)}${e.suffix}`;
    if (k >= 1) easing.splice(i, 1);
  }
};

/* ---------------- key figures ---------------- */
const KPIS = [
  ["g250", "Gain at 250 Hz"],
  ["gmin", "Band minimum"],
  ["range", "Relay range"],
  ["reach", "Clusters in reach"],
  ["rt", "Chamber ring"],
  ["skin", "Collector skin"],
];
$("kpis").innerHTML = KPIS.map(([id, k]) => `<div class="kpi"><span class="k">${k}</span><span class="v" id="kpi-${id}"></span><span id="kpi-${id}-pill"></span></div>`).join("");
const pill = (id, ok, text) => ($(`kpi-${id}-pill`).innerHTML = `<span class="pill ${ok ? "ok" : "bad"}">${text}</span>`);

/* ---------------- svg helpers ---------------- */
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
};

/* ---------------- Figure 2: gain against frequency ---------------- */
const G = { svg: $("gain-chart"), x0: 36, x1: 368, y0: 180, y1: 14, fMin: 200, fMax: 600, gMax: 18 };
const gx = (f) => G.x0 + ((f - G.fMin) / (G.fMax - G.fMin)) * (G.x1 - G.x0);
const gy = (g) => G.y0 - (Math.max(0, Math.min(G.gMax, g)) / G.gMax) * (G.y0 - G.y1);
el("rect", { x: gx(250), y: G.y1, width: gx(500) - gx(250), height: G.y0 - G.y1, fill: BLUE_TINT }, G.svg);
for (let g = 0; g <= 18; g += 3) {
  el("line", { x1: G.x0, x2: G.x1, y1: gy(g), y2: gy(g), stroke: GRID }, G.svg);
  el("text", { x: G.x0 - 6, y: gy(g) + 4, "text-anchor": "end", "font-size": 11, fill: INK2 }, G.svg).textContent = g;
}
for (let f = 200; f <= 600; f += 100) el("text", { x: gx(f), y: G.y0 + 16, "text-anchor": "middle", "font-size": 11, fill: INK2 }, G.svg).textContent = f;
el("text", { x: (G.x0 + G.x1) / 2, y: G.y0 + 29, "text-anchor": "middle", "font-size": 11, fill: INK }, G.svg).textContent = "Frequency, Hz · gain in dB";
el("line", { x1: G.x0, x2: G.x1, y1: G.y0, y2: G.y0, stroke: INK, "stroke-width": 1.2 }, G.svg);
el("line", { x1: G.x0, x2: G.x1, y1: gy(TARGET_DB), y2: gy(TARGET_DB), stroke: SIGNAL, "stroke-width": 1.4, "stroke-dasharray": "5 4" }, G.svg);
el("text", { x: G.x1 - 2, y: gy(TARGET_DB) + 14, "text-anchor": "end", "font-size": 11, fill: SIGNAL }, G.svg).textContent = "+6 dB target";
el("text", { x: gx(375), y: G.y1 + 12, "text-anchor": "middle", "font-size": 10.5, fill: BLUE, "letter-spacing": 1 }, G.svg).textContent = "SIGNALLING BAND";
const gainPath = el("path", { fill: "none", stroke: INK, "stroke-width": 2.2 }, G.svg);
const gainDots = BAND.map(() => {
  const g = el("g", {}, G.svg);
  el("circle", { r: 4, fill: "#fff", stroke: INK, "stroke-width": 1.8 }, g);
  el("text", { y: -9, "text-anchor": "middle", "font-size": 11, "font-weight": 600, fill: INK }, g);
  return g;
});
const FS = Array.from({ length: 81 }, (_, i) => G.fMin + (i / 80) * (G.fMax - G.fMin));
let gainNow = FS.map((f) => collectorGain(f, state.params));
let gainTarget = gainNow;

/* ---------------- Figure 3: directional pattern ---------------- */
const P = { svg: $("polar"), cx: 190, cy: 196, r: 172, floor: 30 };
const pr = (db) => P.r * Math.max(0, 1 + db / P.floor);
const pxy = (deg, rad) => [P.cx + rad * Math.sin((deg * Math.PI) / 180), P.cy - rad * Math.cos((deg * Math.PI) / 180)];
for (const db of [0, -10, -20]) {
  const r = pr(db);
  el("path", { d: `M${P.cx - r} ${P.cy} A${r} ${r} 0 0 1 ${P.cx + r} ${P.cy}`, fill: "none", stroke: GRID }, P.svg);
  el("text", { x: P.cx + 4, y: P.cy - r + 12, "font-size": 10, fill: FAINT }, P.svg).textContent = `${db} dB`;
}
for (let d = -90; d <= 90; d += 30) {
  const [x, y] = pxy(d, P.r);
  el("line", { x1: P.cx, y1: P.cy, x2: x, y2: y, stroke: GRID }, P.svg);
  const [lx, ly] = pxy(d, P.r + 10);
  if (Math.abs(d) < 90) el("text", { x: lx, y: ly + 3, "text-anchor": "middle", "font-size": 10, fill: FAINT }, P.svg).textContent = `${d}°`;
}
el("line", { x1: 10, x2: 370, y1: P.cy, y2: P.cy, stroke: INK, "stroke-width": 1 }, P.svg);
const sweep = el("line", { x1: P.cx, y1: P.cy, stroke: SIGNAL, "stroke-width": 1.2, opacity: 0.6 }, P.svg);
const lobe = el("path", { fill: BLUE_TINT, "fill-opacity": 0.7, stroke: BLUE, "stroke-width": 2 }, P.svg);
const beamL = el("line", { x1: P.cx, y1: P.cy, stroke: BLUE, "stroke-dasharray": "3 4" }, P.svg);
const beamR = el("line", { x1: P.cx, y1: P.cy, stroke: BLUE, "stroke-dasharray": "3 4" }, P.svg);
const beamText = el("text", { x: 10, y: 16, "font-size": 11.5, fill: INK }, P.svg);
el("text", { x: 370, y: 16, "text-anchor": "end", "font-size": 11, fill: FAINT }, P.svg).textContent = "toward the sender ↑";
const PA = Array.from({ length: 91 }, (_, i) => -90 + i * 2);
let lobeNow = PA.map((d) => pattern(state.freq, (d * Math.PI) / 180, state.params.mouthD));
let lobeTarget = lobeNow;
$("freq-chips").innerHTML = BAND.map((f) => `<button type="button" class="chip" data-f="${f}" aria-pressed="${f === state.freq}">${f}</button>`).join("");

/* ---------------- Figure 4: relay range ---------------- */
const R = { svg: $("range-chart"), x0: 118, x1: 366, kmMax: 8, row: 34, top: 22 };
const rx = (km) => R.x0 + (Math.min(km, R.kmMax) / R.kmMax) * (R.x1 - R.x0);
for (let k = 0; k <= 8; k += 2) {
  el("line", { x1: rx(k), x2: rx(k), y1: R.top - 6, y2: R.top + R.row * 5, stroke: GRID }, R.svg);
  el("text", { x: rx(k), y: R.top + R.row * 5 + 16, "text-anchor": "middle", "font-size": 11, fill: INK2 }, R.svg).textContent = `${k}`;
}
el("text", { x: (R.x0 + R.x1) / 2, y: R.top + R.row * 5 + 30, "text-anchor": "middle", "font-size": 11, fill: INK }, R.svg).textContent = "km";
const bars = CLUSTERS.map(([name, km], i) => {
  const y = R.top + i * R.row;
  el("text", { x: R.x0 - 8, y: y + 17, "text-anchor": "end", "font-size": 12.5, fill: INK }, R.svg).textContent = name;
  const bar = el("rect", { x: R.x0, y: y + 6, height: 16, width: 0, fill: BLUE }, R.svg);
  const label = el("text", { y: y + 18.5, "font-size": 11, fill: INK2 }, R.svg);
  return { km, bar, label };
});
const unaided = el("line", { y1: R.top - 10, y2: R.top + R.row * 5, stroke: INK2, "stroke-dasharray": "2 3" }, R.svg);
const unaidedText = el("text", { y: R.top - 12, "text-anchor": "middle", "font-size": 10.5, fill: INK2 }, R.svg);
const reachLine = el("line", { y1: R.top - 10, y2: R.top + R.row * 5, stroke: INK, "stroke-width": 2 }, R.svg);
const reachText = el("text", { y: R.top - 12, "text-anchor": "middle", "font-size": 11, "font-weight": 600, fill: INK }, R.svg);
let reachNow = rangeKm(bandMinimum({ ...DESIGN, ...state.params }));

/* ---------------- Figure 5: pulses in the chamber ---------------- */
const canvas = $("pulses");
const ctx = canvas.getContext("2d");
const TRAIN = [
  { s: 0, d: 0.8, low: true },
  { s: 2.0, d: 0.3 },
  { s: 2.6, d: 0.3 },
  { s: 3.2, d: 0.3 },
];
const WINDOW = 4.4;
const drawPulses = (time) => {
  const W = canvas.width, H = canvas.height, pad = 36, base = H - 44, top = 30;
  const rt = reverbTime(state.lining);
  const xs = (s) => pad + (s / WINDOW) * (W - 2 * pad);
  const ys = (db) => base - (Math.max(-40, db) + 40) / 40 * (base - top);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fcfcfb";
  ctx.fillRect(0, 0, W, H);
  ctx.font = "20px 'IBM Plex Sans', sans-serif";
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = INK2;
  for (const db of [0, -20, -40]) {
    ctx.beginPath();
    ctx.moveTo(pad, ys(db));
    ctx.lineTo(W - pad, ys(db));
    ctx.stroke();
    ctx.fillText(`${db}`, 2, ys(db) + 6);
  }
  for (let s = 0; s <= 4; s++) ctx.fillText(`${s}s`, xs(s) - 8, H - 12);
  // level over time: direct sound while a pulse sounds, then an exponential ring-down of 60 dB per RT
  const level = (t) => {
    let best = -99;
    for (const p of TRAIN) {
      if (t < p.s) continue;
      const db = t <= p.s + p.d ? 0 : (-60 * (t - p.s - p.d)) / rt;
      best = Math.max(best, db);
    }
    return best;
  };
  ctx.beginPath();
  ctx.moveTo(xs(0), ys(-40));
  for (let i = 0; i <= 440; i++) {
    const t = (i / 440) * WINDOW;
    ctx.lineTo(xs(t), ys(level(t)));
  }
  ctx.lineTo(xs(WINDOW), ys(-40));
  ctx.closePath();
  ctx.fillStyle = "rgba(196, 71, 27, 0.14)";
  ctx.fill();
  // smeared stretches: the previous pulse's ring is still within 20 dB when the next begins
  let smeared = false;
  for (let i = 1; i < TRAIN.length; i++) {
    const prev = TRAIN[i - 1];
    const tail = (-60 * (TRAIN[i].s - prev.s - prev.d)) / rt;
    if (tail > -20) {
      smeared = true;
      ctx.fillStyle = "rgba(196, 71, 27, 0.18)";
      ctx.fillRect(xs(prev.s + prev.d), top - 8, xs(TRAIN[i].s) - xs(prev.s + prev.d), base - top + 8);
    }
  }
  for (const p of TRAIN) {
    ctx.fillStyle = p.low ? SIGNAL : BLUE;
    ctx.fillRect(xs(p.s), ys(0), xs(p.s + p.d) - xs(p.s), base - ys(0));
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, base);
  ctx.lineTo(W - pad, base);
  ctx.stroke();
  if (!still) {
    const t = (time / 1000) % (WINDOW + 0.6);
    if (t <= WINDOW) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xs(t), top - 10);
      ctx.lineTo(xs(t), base);
      ctx.stroke();
    }
  }
  const decay20 = rt / 3;
  $("smear-note").textContent = smeared
    ? `The ring takes ${decay20.toFixed(2)} s to fall 20 dB, longer than the 0.3 s gaps: the high pulses run together.`
    : `The ring falls 20 dB in ${decay20.toFixed(2)} s, inside the 0.3 s gaps: every pulse stays countable.`;
};

/* ---------------- specification ---------------- */
const renderSpec = () => {
  const p = { ...DESIGN, ...state.params };
  const modes = roomModes().map((m) => m.toFixed(0));
  const rows = [
    ["Collector", `Cone, ${p.mouthD.toFixed(2)} m mouth, ${p.hornL.toFixed(2)} m long, ${DESIGN.throatD} m throat`],
    ["Rim phase error", `${(rimPhaseError(p) * 100).toFixed(1)} cm (λ/4 at 500 Hz is 17 cm)`],
    ["Beam, −3 dB", `±${halfBeamwidth(250, p.mouthD)}° at 250 Hz, ±${halfBeamwidth(500, p.mouthD)}° at 500 Hz`],
    ["Axis and ear height", `${DESIGN.axisY} m`],
    ["Chamber", `${CHAMBER.length} × ${CHAMBER.width} × ${CHAMBER.height} m, ${CHAMBER_VOLUME.toFixed(1)} m³`],
    ["Chamber room modes", `${modes.join(", ")} Hz, below the band`],
    ["Helmholtz, chamber + throat", "about 7.5 Hz, far below the band"],
    ["Capstone", "about 3.4 × 2.4 × 0.6 m, 10 t"],
    ["Cairn", "about 14 × 9 m, 3 m high at the portal"],
  ];
  $("spec").innerHTML = `<dl style="margin:0;display:grid;grid-template-columns:auto 1fr;gap:7px 14px;font-size:13.5px">${rows
    .map(([k, v]) => `<dt style="color:var(--ink2)">${k}</dt><dd style="margin:0">${v}</dd>`)
    .join("")}</dl>`;
};

/* ---------------- materials ---------------- */
$("materials").innerHTML = MATERIALS.map(
  (m) => `<button type="button" class="mat" data-id="${m.id}" aria-pressed="false">
    <span class="name">${m.name}</span>
    <span class="what">${m.material}</span>
    <span class="src">${m.source}</span>
    <span class="meta"><span class="qty">${m.quantity}</span><span class="ev ${m.evidence}">${m.evidence === "DOCUMENTED" ? "MATERIAL OF THE PERIOD" : "PROPOSED USE"}</span></span>
  </button>`,
).join("");

/* ---------------- three.js scene ---------------- */
const host = $("viewport");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
host.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
Object.assign(labels.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
host.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#f3f5f2");
scene.fog = new THREE.Fog("#f3f5f2", 30, 70);
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
camera.position.set(-10, 5.8, 10.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.6, 1.1, 0);
controls.enableDamping = true;
controls.maxPolarAngle = 1.52;
controls.minDistance = 3;
controls.maxDistance = 40;
scene.add(new THREE.HemisphereLight(0xffffff, 0xd3d9cc, 1.7));
const sun = new THREE.DirectionalLight(0xffffff, 2.3);
sun.position.set(-9, 16, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
sun.shadow.bias = -0.0005;
scene.add(sun);

const model = buildDolmen({ ...DESIGN, ...state.params });
scene.add(model.root);
const listener = model.root.getObjectByName("listener");
const listenerMat = listener.children[0].material;

// the sound axis and the incoming wavefronts
const axisLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-18, DESIGN.axisY, 0), new THREE.Vector3(2.6, DESIGN.axisY, 0)]),
  new THREE.LineDashedMaterial({ color: SIGNAL, dashSize: 0.35, gapSize: 0.2, transparent: true, opacity: 0.7 }),
);
axisLine.computeLineDistances();
scene.add(axisLine);
const waves = Array.from({ length: 5 }, () => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.018, 6, 72).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0 }));
  scene.add(m);
  return m;
});
const tag = (text, cls = "tag3d") => {
  const d = document.createElement("div");
  d.className = cls;
  d.textContent = text;
  return new CSS2DObject(d);
};
const senderTag = tag("From the sender · 250–500 Hz pulses", "tag3d soft");
senderTag.position.set(-13, DESIGN.axisY + 1.9, 0);
scene.add(senderTag);
const focusTag = tag("");
focusTag.visible = false;
scene.add(focusTag);

const FOCUS = {
  capstone: [[0.95, 2.6, 0], 7],
  orthostats: [[1.0, 1.0, 0], 7.5],
  cairn: [[5, 2.2, 0], 17],
  packing: [[-0.15, 1.2, 0], 4.5],
  frame: ["horn", 6],
  skin: ["horn", 6],
  sealant: [[-0.35, 1.15, 0], 4],
  trestles: [[-1.2, 0.6, 0], 6],
  lining: [[1.1, 0.3, 0], 6],
  tools: [[0.8, 1.2, 0], 11],
};
const INSIDE = new Set(["lining", "packing", "sealant"]);
const fly = { active: false, t: 0, fromP: new THREE.Vector3(), fromT: new THREE.Vector3(), toP: new THREE.Vector3(), toT: new THREE.Vector3() };
const hornCentre = () => new THREE.Vector3(-0.3 - state.params.hornL / 2 - 1.4 * state.explode, DESIGN.axisY, 0);
const flyTo = (target, dist) => {
  fly.fromP.copy(camera.position);
  fly.fromT.copy(controls.target);
  fly.toT.copy(target);
  fly.toP.copy(target).add(new THREE.Vector3(-0.75, 0.5, 1).normalize().multiplyScalar(dist));
  fly.t = 0;
  fly.active = true;
  if (still) {
    camera.position.copy(fly.toP);
    controls.target.copy(fly.toT);
    fly.active = false;
  }
};

const select = (id) => {
  state.selected = state.selected === id ? null : id;
  document.querySelectorAll(".mat").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === state.selected)));
  const m = MATERIALS.find((x) => x.id === state.selected);
  if (!m) {
    focusTag.visible = false;
    flyTo(new THREE.Vector3(0.6, 1.1, 0), 15.5);
    return;
  }
  if (INSIDE.has(m.id) && state.view === "restored") setView("cutaway");
  const [where, dist] = FOCUS[m.id];
  const target = where === "horn" ? hornCentre() : new THREE.Vector3(...where);
  focusTag.element.textContent = m.name;
  focusTag.position.copy(target).add(new THREE.Vector3(0, where === "horn" ? 1.1 : 0.7, 0));
  focusTag.visible = true;
  flyTo(target, dist);
};

// click a part in the model to find its material
const ray = new THREE.Raycaster();
let down = null;
renderer.domElement.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.intersectObjects(model.root.children, true).find((h) => h.object.visible && h.object.userData.part && h.object.name !== "ground");
  const part = hit?.object.userData.part;
  const m = part && MATERIALS.find((x) => x.parts.includes(part));
  if (m && m.id !== state.selected) select(m.id);
});

/* ---------------- controls ---------------- */
const views = document.querySelectorAll("[data-view]");
const setView = (v) => {
  state.view = v;
  views.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
};
views.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

const buildInput = $("build");
const stageLabel = () => {
  const i = Math.min(STAGES.length - 1, Math.max(0, Math.floor(state.build - 0.001)));
  $("stage-label").innerHTML = `<span class="n">${i + 1}/${STAGES.length}</span>${STAGES[i]}`;
};
buildInput.addEventListener("input", () => {
  state.build = Number(buildInput.value);
  state.playing = false;
  $("play").textContent = "▶ Build it";
  stageLabel();
});
$("play").addEventListener("click", () => {
  if (state.playing) {
    state.playing = false;
    $("play").textContent = "▶ Build it";
    return;
  }
  if (state.build >= 8.99) state.build = 0;
  if (state.view === "exploded") setView("restored");
  state.playing = true;
  $("play").textContent = "❚❚ Pause";
  if (still) {
    state.build = 9;
    state.playing = false;
    $("play").textContent = "▶ Build it";
  }
});
$("sound").addEventListener("click", () => {
  state.sound = !state.sound;
  $("sound").setAttribute("aria-pressed", String(state.sound));
  $("sound").textContent = state.sound ? "Sound on" : "Sound off";
});

const sliders = [
  ["mouth", "mouthD", (v) => `${v.toFixed(2)} m`],
  ["length", "hornL", (v) => `${v.toFixed(2)} m`],
  ["eta", "eta", (v) => v.toFixed(2)],
];
const fill = (input) => input.style.setProperty("--fill", `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
const syncSliders = () => {
  for (const [id, key, f] of sliders) {
    $(id).value = state.params[key];
    $(`${id}-out`).textContent = f(state.params[key]);
    fill($(id));
  }
  $("lining").value = state.lining;
  $("lining-out").textContent = `${state.lining.toFixed(1)} m²`;
  fill($("lining"));
};
for (const [id, key, f] of sliders)
  $(id).addEventListener("input", () => {
    state.params[key] = Number($(id).value);
    $(`${id}-out`).textContent = f(state.params[key]);
    fill($(id));
    if (key !== "eta") model.rebuildCollector({ ...DESIGN, ...state.params });
    update();
  });
$("lining").addEventListener("input", () => {
  state.lining = Number($("lining").value);
  $("lining-out").textContent = `${state.lining.toFixed(1)} m²`;
  fill($("lining"));
  update();
});
$("reset").addEventListener("click", () => {
  state.params = { mouthD: DESIGN.mouthD, hornL: DESIGN.hornL, eta: DESIGN.eta };
  state.lining = DESIGN.lining;
  model.rebuildCollector({ ...DESIGN, ...state.params });
  syncSliders();
  update();
});
$("freq-chips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  state.freq = Number(b.dataset.f);
  document.querySelectorAll("#freq-chips .chip").forEach((c) => c.setAttribute("aria-pressed", String(Number(c.dataset.f) === state.freq)));
  update();
});
document.querySelectorAll(".mat").forEach((b) => b.addEventListener("click", () => select(b.dataset.id)));

/* ---------------- recompute everything that depends on the design ---------------- */
function update() {
  const p = { ...DESIGN, ...state.params };
  const g250 = collectorGain(250, p);
  const gmin = bandMinimum(p);
  const range = rangeKm(gmin);
  const reach = CLUSTERS.filter(([, km]) => km <= range).length;
  const rt = reverbTime(state.lining);
  setNum($("kpi-g250"), g250, 1, "<small>dB</small>");
  pill("g250", g250 >= TARGET_DB, g250 >= TARGET_DB ? "MEETS +6 dB" : "BELOW +6 dB");
  setNum($("kpi-gmin"), gmin, 1, "<small>dB</small>");
  pill("gmin", gmin >= TARGET_DB, "250–500 Hz");
  setNum($("kpi-range"), range, 2, "<small>km</small>");
  pill("range", range > REF_KM, `vs ${REF_KM} km unaided`);
  setNum($("kpi-reach"), reach, 0, "<small>of 5</small>");
  pill("reach", reach === 5, reach === 5 ? "ALL CLUSTERS" : "SOME OUT OF REACH");
  setNum($("kpi-rt"), rt, 2, "<small>s</small>");
  pill("rt", rt / 3 <= 0.3, rt / 3 <= 0.3 ? "PULSES CLEAR" : "PULSES SMEAR");
  setNum($("kpi-skin"), skinArea(p), 1, "<small>m²</small>");
  pill("skin", true, `about ${Math.ceil(skinArea(p) / 2.2)} cattle hides`);
  $("gain-note").textContent = `${gmin >= TARGET_DB ? "clears" : "misses"} +6 dB across the band`;
  $("shape-note").textContent = `η = ${p.eta.toFixed(2)}`;
  setNum($("range-out"), range, 2, " km");
  setNum($("rt-out"), rt, 2, " s ring");
  gainTarget = FS.map((f) => collectorGain(f, p));
  lobeTarget = PA.map((d) => pattern(state.freq, (d * Math.PI) / 180, p.mouthD));
  const hb = halfBeamwidth(state.freq, p.mouthD);
  const [lx, ly] = pxy(-hb, P.r);
  const [rX, rY] = pxy(hb, P.r);
  Object.entries({ x2: lx, y2: ly }).forEach(([k, v]) => beamL.setAttribute(k, v));
  Object.entries({ x2: rX, y2: rY }).forEach(([k, v]) => beamR.setAttribute(k, v));
  beamText.textContent = `${state.freq} Hz: ±${hb}° at −3 dB, gain ${collectorGain(state.freq, p).toFixed(1)} dB`;
  renderSpec();
  if (still) {
    gainNow = gainTarget;
    lobeNow = lobeTarget;
    reachNow = range;
  }
}

const drawCharts = () => {
  gainPath.setAttribute("d", FS.map((f, i) => `${i ? "L" : "M"}${gx(f).toFixed(1)} ${gy(gainNow[i]).toFixed(1)}`).join(" "));
  BAND.forEach((f, i) => {
    const g = collectorGain(f, { ...DESIGN, ...state.params });
    const k = FS.findIndex((x) => x >= f);
    gainDots[i].setAttribute("transform", `translate(${gx(f)} ${gy(gainNow[k])})`);
    gainDots[i].querySelector("circle").setAttribute("stroke", g >= TARGET_DB ? INK : SIGNAL);
    gainDots[i].querySelector("text").textContent = g.toFixed(1);
  });
  lobe.setAttribute("d", `M${P.cx} ${P.cy} ` + PA.map((d, i) => `L${pxy(d, pr(lobeNow[i])).map((n) => n.toFixed(1)).join(" ")}`).join(" ") + " Z");
  bars.forEach(({ km, bar, label }) => {
    bar.setAttribute("width", rx(km) - R.x0);
    bar.setAttribute("fill", km <= reachNow ? BLUE : SIGNAL);
    label.setAttribute("x", rx(km) + 5);
    label.textContent = `${km.toFixed(2)} km`;
  });
  for (const [line, text, km, words] of [
    [unaided, unaidedText, REF_KM, "no collector"],
    [reachLine, reachText, reachNow, "with collector"],
  ]) {
    line.setAttribute("x1", rx(km));
    line.setAttribute("x2", rx(km));
    text.setAttribute("x", rx(km));
    text.textContent = words;
  }
};

/* ---------------- loop ---------------- */
const resize = () => {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h);
  labels.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(host);
resize();

let last = performance.now();
const loop = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  stepNumbers(now);
  const k = still ? 1 : Math.min(1, dt * 7);
  gainNow = gainNow.map((g, i) => g + (gainTarget[i] - g) * k);
  lobeNow = lobeNow.map((g, i) => g + (lobeTarget[i] - g) * k);
  reachNow += (rangeKm(bandMinimum({ ...DESIGN, ...state.params })) - reachNow) * k;
  drawCharts();
  drawPulses(now);
  if (!still) {
    const a = Math.sin(now / 1400) * 88;
    const [sx, sy] = pxy(a, P.r);
    sweep.setAttribute("x2", sx);
    sweep.setAttribute("y2", sy);
  }

  if (state.playing) {
    state.build = Math.min(9, state.build + dt / 1.3);
    buildInput.value = state.build;
    stageLabel();
    if (state.build >= 9) {
      state.playing = false;
      $("play").textContent = "▶ Build it";
    }
  }
  const explodeTarget = state.view === "exploded" ? 1 : 0;
  state.explode += (explodeTarget - state.explode) * (still ? 1 : Math.min(1, dt * 4));
  const m = MATERIALS.find((x) => x.id === state.selected);
  model.setState({ build: state.build, explode: state.explode, cairn: state.view === "cutaway" ? "cutaway" : "solid", highlight: m ? m.parts : null });

  const L = state.params.hornL, Rm = state.params.mouthD / 2, rt = DESIGN.throatD / 2;
  const throatX = -0.3 - 1.4 * state.explode;
  const mouthX = throatX - L;
  const hornUp = state.build >= 8;
  let flash = 0;
  waves.forEach((w, i) => {
    const ph = (now / 1000 / 3.2 + i / waves.length) % 1;
    const x = -18 + ph * (throatX + 18);
    const r = x < mouthX ? 1.9 - 0.4 * ((x + 18) / (mouthX + 18)) : Rm + (rt - Rm) * ((x - mouthX) / L);
    w.position.set(x, DESIGN.axisY, 0);
    w.scale.setScalar(Math.max(0.05, r));
    w.material.opacity = state.sound && hornUp && !still ? Math.sin(ph * Math.PI) ** 0.6 * 0.85 : 0;
    if (ph > 0.94) flash = Math.max(flash, (ph - 0.94) / 0.06);
  });
  if (state.sound && hornUp && !still && !(m && m.parts.includes("listener"))) {
    listenerMat.emissive.setHex(0x1f57a3);
    listenerMat.emissiveIntensity = flash * 0.9;
  }
  axisLine.visible = state.sound && hornUp;
  senderTag.visible = state.sound && hornUp;
  if (m && (m.id === "frame" || m.id === "skin")) focusTag.position.copy(hornCentre()).add(new THREE.Vector3(0, 1.1, 0));

  if (fly.active) {
    fly.t = Math.min(1, fly.t + dt / 1.1);
    const e = 1 - (1 - fly.t) ** 3;
    camera.position.lerpVectors(fly.fromP, fly.toP, e);
    controls.target.lerpVectors(fly.fromT, fly.toT, e);
    if (fly.t >= 1) fly.active = false;
  }
  controls.update();
  renderer.render(scene, camera);
  labels.render(scene, camera);
  requestAnimationFrame(loop);
};

if (["restored", "cutaway", "exploded"].includes(location.hash.slice(1))) setView(location.hash.slice(1));
syncSliders();
stageLabel();
update();
requestAnimationFrame(loop);
