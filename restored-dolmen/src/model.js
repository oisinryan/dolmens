// A restored portal tomb fitted as a passive acoustic receiver, built with three.js.
// Units are metres. y is up; the chamber runs along +x from the portal (x = 0); the
// collector points along −x toward the sender; z is across the tomb.
import * as THREE from "three";
import { DESIGN } from "./acoustics.js";

/* ---------- deterministic roughness ---------- */
const hash = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (t) => t * t * (3 - 2 * t);
const noise3 = (x, y, z) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
  const lerp = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
};
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** a box with its surface pushed about by noise, so it reads as a split slab */
const roughSlab = (w, h, d, seed, amp = 0.05) => {
  const seg = (n) => Math.max(2, Math.round(n / 0.22));
  const g = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = 2.4;
    p.setXYZ(
      i,
      x + (noise3(x * f + seed, y * f, z * f) - 0.5) * amp * 2,
      y + (noise3(x * f, y * f + seed, z * f + 7) - 0.5) * amp * 2,
      z + (noise3(x * f + 3, y * f, z * f + seed) - 0.5) * amp * 2,
    );
  }
  g.computeVertexNormals();
  return g;
};

const boulder = (r, seed) => {
  const g = new THREE.IcosahedronGeometry(r, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    v.multiplyScalar(0.8 + 0.4 * noise3(v.x * 3 + seed, v.y * 3, v.z * 3));
    v.y *= 0.7;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
};

/** a thin cylinder between two points */
const rod = (a, b, r, material) => {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 6), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
};

/* ---------- colours: natural, a little muted to sit on a white page ---------- */
export const COLOURS = {
  stone: 0xb8b4ab,
  capstone: 0xa7a298,
  packing: 0x9c968a,
  cairn: 0xcdc6b5,
  kerb: 0xa9a396,
  lining: 0xb39a62,
  skin: 0xc49a6c,
  wood: 0x86653f,
  collar: 0x9e6a3d,
  person: 0x55677b,
  ground: 0xe1e6de,
};
const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0, flatShading: true, ...extra });

/** the cairn: a long trapezoidal mound, open at the portal's forecourt */
const cairnGeometry = () => {
  const x0 = -1.3, x1 = 13.2, zW = 5.2, nx = 116, nz = 84;
  const H = (x) => 3.1 - Math.max(0, x - 2) * 0.13;
  const W = (x) => 4.6 - (x - x0) * 0.11;
  const height = (x, z) => {
    const u = Math.abs(z) / W(x);
    let h = H(x) * Math.sqrt(Math.max(0, 1 - u ** 2.4));
    h *= smoothstep(x0, x0 + 0.5, x);
    h *= Math.sqrt(Math.max(0, 1 - Math.max(0, (x - 11) / 2.2) ** 2));
    h *= 1 - smoothstep(0.4, -0.1, x) * smoothstep(1.5, 1.05, Math.abs(z));
    return h + (h > 0.05 ? (noise3(x * 0.7, z * 0.7, 5) - 0.5) * 0.22 * Math.min(1, h) : 0);
  };
  const pos = [];
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx;
      const z = -zW + (2 * zW * j) / nz;
      pos.push(x, Math.max(0.005, height(x, z)), z);
    }
  const idx = [];
  const at = (i, j) => j * (nx + 1) + i;
  const tall = (k) => pos[k * 3 + 1] > 0.03;
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
      if (tall(a) || tall(b) || tall(c)) idx.push(a, c, b);
      if (tall(b) || tall(c) || tall(d)) idx.push(b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geometry: g, footprint: (x) => W(x), x0, x1 };
};

/**
 * Build the model. Returns the root group, the parts by id, and setState() for the
 * dashboard's build sequence, exploded view, cairn cutaway and highlighting.
 */
export function buildDolmen(params = DESIGN) {
  const root = new THREE.Group();
  root.name = "restored-portal-tomb";
  const registry = []; // { obj, part, stage, kind, base, explode }
  const add = (obj, part, stage, kind, explode = [0, 0, 0], parent = root) => {
    obj.name = obj.name || part;
    obj.traverse((o) => {
      if (o.isMesh) {
        o.userData.part = part;
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    parent.add(obj);
    registry.push({ obj, part, stage, kind, base: obj.position.clone(), explode: new THREE.Vector3(...explode) });
    return obj;
  };
  const axisY = params.axisY ?? DESIGN.axisY;

  // ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64).rotateX(-Math.PI / 2), mat(COLOURS.ground, { flatShading: false }));
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  ground.name = "ground";
  root.add(ground);

  // portal stones (stage 0)
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(roughSlab(0.45, 2.3, 0.45, 11 + s), mat(COLOURS.stone));
    m.position.set(-0.22, 1.15, s * 0.675);
    m.name = `portal-stone-${s < 0 ? "south" : "north"}`;
    add(m, "portal-stones", 0, "drop", [-0.8, 0, s * 0.35]);
  }
  // side stones and backstone (stage 1)
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(roughSlab(2.1, 1.75, 0.28, 21 + s), mat(COLOURS.stone));
    m.position.set(1.12, 0.875, s * 0.9);
    m.name = `side-stone-${s < 0 ? "south" : "north"}`;
    add(m, "side-stones", 1, "drop", [0, 0, s * 1.1]);
  }
  const back = new THREE.Mesh(roughSlab(0.3, 1.85, 2.1, 31), mat(COLOURS.stone));
  back.position.set(2.32, 0.925, 0);
  back.name = "backstone";
  add(back, "backstone", 1, "drop", [1.0, 0, 0]);

  // capstone (stage 2), sloping from the portal (2.3 m) down to the backstone (1.85 m)
  const cap = new THREE.Mesh(roughSlab(3.4, 0.6, 2.4, 41, 0.08), mat(COLOURS.capstone));
  const slope = Math.atan2(2.3 - 1.85, 2.32 + 0.22);
  cap.rotation.z = -slope;
  cap.position.set(0.95, 2.3 - (0.95 + 0.22) * Math.tan(slope) + 0.3 / Math.cos(slope), 0);
  cap.name = "capstone";
  add(cap, "capstone", 2, "drop", [0, 1.7, 0]);

  // doorstone, dry-stone packing with the throat, and the collar (stage 3)
  const door = new THREE.Mesh(roughSlab(0.18, 0.85, 0.9, 51, 0.03), mat(COLOURS.stone));
  door.position.set(-0.12, 0.425, 0);
  door.name = "doorstone";
  add(door, "doorstone", 3, "drop", [-0.5, 0, 0]);
  const t = (params.throatD ?? DESIGN.throatD) / 2;
  const packing = new THREE.Group();
  packing.name = "portal-packing";
  const block = (y0, y1, z0, z1, seed) => {
    const m = new THREE.Mesh(roughSlab(0.3, y1 - y0, z1 - z0, seed, 0.025), mat(COLOURS.packing));
    m.position.set(-0.12, (y0 + y1) / 2, (z0 + z1) / 2);
    packing.add(m);
  };
  block(0.85, axisY - t, -0.45, 0.45, 61);
  block(axisY + t, 2.25, -0.45, 0.45, 62);
  block(axisY - t, axisY + t, -0.45, -t, 63);
  block(axisY - t, axisY + t, t, 0.45, 64);
  add(packing, "packing", 3, "drop", [-0.45, 0, 0]);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(t + 0.03, 0.045, 8, 32).rotateY(Math.PI / 2), mat(COLOURS.collar));
  collar.position.set(-0.3, axisY, 0);
  collar.name = "throat-collar";
  add(collar, "collar", 3, "drop", [-1.0, 0, 0]);

  // chamber lining and the listener's seat (stage 4)
  const lining = new THREE.Mesh(roughSlab(2.05, 0.1, 1.45, 71, 0.02), mat(COLOURS.lining));
  lining.position.set(1.1, 0.05, 0);
  lining.name = "chamber-lining";
  add(lining, "lining", 4, "drop");
  const seat = new THREE.Mesh(roughSlab(0.42, 0.4, 0.42, 81, 0.03), mat(COLOURS.stone));
  seat.position.set(0.62, 0.2, 0);
  seat.name = "seat-stone";
  add(seat, "lining", 4, "drop");

  // cairn and kerb (stage 5 and 6)
  const cairnInfo = cairnGeometry();
  const cairnMat = mat(COLOURS.cairn, { side: THREE.DoubleSide, flatShading: false });
  const cairn = new THREE.Mesh(cairnInfo.geometry, cairnMat);
  cairn.name = "cairn";
  add(cairn, "cairn", 5, "grow");
  const kerb = new THREE.Group();
  kerb.name = "kerb";
  let k = 0;
  const kerbStone = (x, z) => {
    const m = new THREE.Mesh(boulder(0.32 + 0.12 * hash(x, z, 1), k), mat(COLOURS.kerb));
    m.position.set(x, 0.12, z);
    m.rotation.y = hash(x, z, 2) * Math.PI;
    kerb.add(m);
    k++;
  };
  for (let x = cairnInfo.x0 + 0.6; x < cairnInfo.x1 - 1.8; x += 0.85) {
    const w = cairnInfo.footprint(x) * 0.98;
    for (const s of [-1, 1]) kerbStone(x, s * w);
  }
  for (let a = -Math.PI / 2; a <= Math.PI / 2; a += Math.PI / 8) kerbStone(cairnInfo.x1 - 2.0 + Math.cos(a) * 1.8, Math.sin(a) * cairnInfo.footprint(cairnInfo.x1 - 2) * 0.9);
  add(kerb, "kerb", 6, "scale");

  // collector (stage 7) on trestles, pivoting at the throat
  const hornPivot = new THREE.Group();
  hornPivot.name = "collector";
  hornPivot.position.set(-0.3, axisY, 0);
  add(hornPivot, "horn", 7, "grow-x", [-1.4, 0, 0]);
  const trestles = new THREE.Group();
  trestles.name = "trestles";
  add(trestles, "trestles", 7, "drop", [-1.4, 0, 0]);

  const skinMat = mat(COLOURS.skin, { side: THREE.DoubleSide, flatShading: false });
  const staveMat = mat(COLOURS.wood);
  const hoopMat = mat(COLOURS.wood);
  const trestleMat = mat(COLOURS.wood);
  const buildHorn = (p) => {
    for (const g of [hornPivot, trestles]) g.clear();
    const L = p.hornL, R = p.mouthD / 2, r = (p.throatD ?? DESIGN.throatD) / 2;
    const skin = new THREE.Mesh(new THREE.CylinderGeometry(r, R, L, 72, 4, true).rotateZ(-Math.PI / 2).translate(-L / 2, 0, 0), skinMat);
    skin.name = "collector-skin";
    skin.userData.part = "skin";
    hornPivot.add(skin);
    const staves = new THREE.Group();
    staves.name = "collector-staves";
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      staves.add(rod(new THREE.Vector3(0, r * 1.06 * Math.cos(a), r * 1.06 * Math.sin(a)), new THREE.Vector3(-L, R * 1.02 * Math.cos(a), R * 1.02 * Math.sin(a)), 0.014, staveMat));
    }
    staves.traverse((o) => (o.userData.part = "staves"));
    hornPivot.add(staves);
    const hoops = new THREE.Group();
    hoops.name = "collector-hoops";
    for (let i = 0; i <= 6; i++) {
      const f = i / 6;
      const m = new THREE.Mesh(new THREE.TorusGeometry(r + (R - r) * f + 0.018, i === 6 ? 0.035 : 0.016, 6, 48).rotateY(Math.PI / 2), hoopMat);
      m.position.x = -L * f;
      m.userData.part = "hoops";
      hoops.add(m);
    }
    hornPivot.add(hoops);
    // two A-frame trestles with the collector resting in their crotch
    for (const f of [0.3, 0.78]) {
      const x = -0.3 - L * f;
      const rr = r + (R - r) * f;
      const yc = axisY - rr * 0.75;
      for (const s of [-1, 1]) trestles.add(rod(new THREE.Vector3(x, 0, s * (rr + 0.45)), new THREE.Vector3(x, yc + 0.28, -s * (rr * 0.55)), 0.035, trestleMat));
      trestles.add(rod(new THREE.Vector3(x, 0.35, -(rr + 0.3)), new THREE.Vector3(x, 0.35, rr + 0.3), 0.03, trestleMat));
    }
    trestles.traverse((o) => {
      if (o.isMesh) {
        o.userData.part = "trestles";
        o.castShadow = true;
      }
    });
    hornPivot.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
  };
  buildHorn({ ...DESIGN, ...params });

  // the listener, seated with the ear at the collector's axis height, and a standing figure for scale (stage 8)
  const person = (seated) => {
    const g = new THREE.Group();
    const m = mat(COLOURS.person, { flatShading: false });
    if (seated) {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.36, 4, 12), m);
      body.position.set(0.66, 0.76, 0);
      body.rotation.z = 0.12;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), m);
      head.position.set(0.6, axisY, 0);
      const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 8), m);
      legs.rotation.z = Math.PI / 2 - 0.3;
      legs.position.set(0.92, 0.46, 0);
      g.add(body, head, legs);
    } else {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.95, 4, 12), m);
      body.position.y = 0.95;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), m);
      head.position.y = 1.62;
      g.add(body, head);
    }
    return g;
  };
  const listener = person(true);
  listener.name = "listener";
  add(listener, "listener", 8, "scale");
  const figure = person(false);
  figure.name = "scale-figure-1.7m";
  figure.position.set(-1.6, 0, 2.6);
  add(figure, "listener", 8, "scale");

  /* ---------- state ---------- */
  const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.02);
  const SECTIONED = new Set(["portal-stones", "side-stones", "backstone", "capstone", "doorstone", "packing", "collar", "lining", "cairn", "kerb"]);
  const easeOut = (x) => 1 - (1 - x) ** 3;
  const setState = ({ build = 9, explode = 0, cairn: cairnMode = "solid", highlight = null } = {}) => {
    for (const r of registry) {
      const tt = Math.min(1, Math.max(0, build - r.stage));
      const e = easeOut(tt);
      r.obj.visible = tt > 0.001;
      r.obj.position.copy(r.base).addScaledVector(r.explode, explode);
      r.obj.scale.set(1, 1, 1);
      if (r.kind === "drop") r.obj.position.y += (1 - e) * 3;
      if (r.kind === "grow") r.obj.scale.y = Math.max(e, 0.001);
      if (r.kind === "grow-x") r.obj.scale.set(Math.max(e, 0.001), Math.max(e, 0.001), Math.max(e, 0.001));
      if (r.kind === "scale") r.obj.scale.setScalar(Math.max(e, 0.001));
    }
    const hideCairn = cairnMode === "hidden" || explode > 0.02;
    cairn.visible = cairn.visible && !hideCairn;
    kerb.visible = kerb.visible && !hideCairn;
    // the cutaway is a section along the axis: stones, cairn and lining lose their near half
    const planes = cairnMode === "cutaway" ? [clip] : [];
    root.traverse((o) => {
      if (!o.isMesh || o === ground) return;
      if (SECTIONED.has(o.userData.part)) o.material.clippingPlanes = planes;
      const on = highlight && highlight.includes(o.userData.part);
      o.material.emissive?.setHex(on ? 0x1f57a3 : 0x000000);
      if (o.material.emissiveIntensity !== undefined) o.material.emissiveIntensity = on ? 0.45 : 0;
    });
  };
  setState();

  return { root, setState, rebuildCollector: (p) => buildHorn({ ...DESIGN, ...p }), axisY };
}
