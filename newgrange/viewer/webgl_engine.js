/**
 * WebGL2 3D Engine for Newgrange Acoustic & Architectural Observatory
 * Coordinates: Z-up meters (Origin at entrance portal floor, +Y along 18.95m passage).
 */

function createShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`Shader compile error: ${info}`);
  }
  return s;
}

function createProgram(gl, vsSrc, fsSrc) {
  const p = gl.createProgram();
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(p);
    throw new Error(`Program link error: ${info}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return p;
}

function mat4Perspective(fovRad, aspect, near, far) {
  const f = 1.0 / Math.tan(fovRad * 0.5);
  const nf = 1.0 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

function mat4LookAt(eye, target, up) {
  let zx = eye[0] - target[0];
  let zy = eye[1] - target[1];
  let zz = eye[2] - target[2];
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len; zy /= len; zz /= len;

  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  len = Math.hypot(xx, xy, xz);
  if (len < 1e-6) {
    xx = 1; xy = 0; xz = 0;
  } else {
    xx /= len; xy /= len; xz /= len;
  }

  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  return new Float32Array([
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
    -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
    -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
    1,
  ]);
}

const ARCH_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in vec3 aCol;

uniform mat4 uProj;
uniform mat4 uView;

out vec3 vPos;
out vec3 vNorm;
out vec3 vCol;

void main() {
  vPos = aPos;
  vNorm = aNorm;
  vCol = aCol;
  gl_Position = uProj * uView * vec4(aPos, 1.0);
}
`;

const ARCH_FS = `#version 300 es
precision highp float;
in vec3 vPos;
in vec3 vNorm;
in vec3 vCol;

uniform vec3 uCamPos;
uniform int uClipAxis;
uniform float uClipPos;
uniform float uOpacity;
uniform float uEmissive;
uniform vec3 uPulseOrigin;
uniform float uPulseRadius;
uniform float uPulseAlpha;
uniform int uCavityMode;

out vec4 outColor;

void main() {
  if (uClipAxis == 0 && vPos.x > uClipPos) discard;
  if (uClipAxis == 1 && vPos.y < uClipPos) discard;
  if (uClipAxis == 2 && vPos.z > uClipPos) discard;

  vec3 N = normalize(vNorm) * (gl_FrontFacing ? 1.0 : -1.0);

  if (uCavityMode == 1) {
    vec3 V = normalize(uCamPos - vPos);
    float rim = 1.0 - max(0.0, abs(dot(N, V)));
    vec3 c = mix(vec3(0.10, 0.55, 0.85), vec3(0.45, 0.90, 1.0), rim);
    outColor = vec4(c, 0.22 + 0.30 * rim);
    return;
  }

  if (uEmissive > 0.5) {
    float beamFade = smoothstep(-5.0, 21.0, vPos.y);
    outColor = vec4(vCol * (1.15 - 0.25 * beamFade), uOpacity);
    return;
  }

  // Subtle stone micro-texture
  float grain = 0.94 + 0.06 * sin(vPos.x * 16.0 + vPos.y * 13.0) * cos(vPos.z * 19.0);
  vec3 albedo = vCol * grain;

  // Directional Sun + Hemisphere Sky/Ground Ambient
  vec3 sunDir = normalize(vec3(0.48, -0.72, 0.82));
  float sunDiff = max(0.0, dot(N, sunDir));
  float hemi = 0.5 + 0.5 * N.z;
  vec3 amb = mix(vec3(0.17, 0.14, 0.12), vec3(0.42, 0.47, 0.56), hemi);

  // Warm interior solstice/torch lights inside chamber & passage
  vec3 lCh = vec3(0.0, 20.55, 3.65) - vPos;
  float dCh = length(lCh);
  float attCh = 1.0 / (1.0 + 0.085 * dCh * dCh);
  float diffCh = max(0.0, dot(N, normalize(lCh))) * attCh;

  vec3 lPass = vec3(0.0, 10.5, 2.0) - vPos;
  float dPass = length(lPass);
  float attPass = 1.0 / (1.0 + 0.14 * dPass * dPass);
  float diffPass = max(0.0, dot(N, normalize(lPass))) * attPass;

  vec3 V = normalize(uCamPos - vPos);
  vec3 H = normalize(sunDir + V);
  float spec = pow(max(0.0, dot(N, H)), 24.0) * 0.08;

  vec3 lit = albedo * (amb * 0.72 + sunDiff * vec3(1.02, 0.96, 0.86) * 0.78)
           + albedo * (diffCh * vec3(1.35, 0.88, 0.44) + diffPass * vec3(1.0, 0.65, 0.30))
           + vec3(spec);

  // Acoustic impulse wavefront highlight ring
  if (uPulseAlpha > 0.01) {
    float dp = length(vPos - uPulseOrigin);
    float ring = exp(-pow((dp - uPulseRadius) * 2.2, 2.0));
    lit += vec3(1.0, 0.75, 0.25) * ring * uPulseAlpha * 0.95;
  }

  outColor = vec4(lit, uOpacity);
}
`;

const SLICE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aUvw;

uniform mat4 uProj;
uniform mat4 uView;

out vec3 vUvw;
out vec3 vPos;

void main() {
  vPos = aPos;
  vUvw = aUvw;
  gl_Position = uProj * uView * vec4(aPos, 1.0);
}
`;

const SLICE_FS = `#version 300 es
precision highp float;
precision highp sampler3D;

in vec3 vUvw;
in vec3 vPos;

uniform sampler3D uModeTex;
uniform float uPhase;

out vec4 outColor;

void main() {
  vec4 tex = texture(uModeTex, vUvw);
  if (tex.a < 0.35) discard;

  float p = (tex.r * 2.0 - 1.0) * cos(uPhase);
  float mag = abs(p);
  vec3 posCol = mix(vec3(0.96, 0.62, 0.12), vec3(1.0, 0.28, 0.14), smoothstep(0.2, 0.95, mag));
  vec3 negCol = mix(vec3(0.18, 0.72, 0.98), vec3(0.18, 0.34, 0.96), smoothstep(0.2, 0.95, mag));
  vec3 col = p >= 0.0 ? posCol : negCol;
  float alpha = tex.a * (0.12 + 0.72 * smoothstep(0.03, 0.78, mag));
  outColor = vec4(col, alpha);
}
`;

const RAY_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in float aTime;
layout(location=2) in float aEnergy;

uniform mat4 uProj;
uniform mat4 uView;

out float vTime;
out float vEnergy;

void main() {
  vTime = aTime;
  vEnergy = aEnergy;
  gl_Position = uProj * uView * vec4(aPos, 1.0);
}
`;

const RAY_FS = `#version 300 es
precision highp float;
in float vTime;
in float vEnergy;

uniform float uAnimTime;
uniform float uMaxTime;

out vec4 outColor;

void main() {
  float wavePos = mod(uAnimTime, max(0.25, uMaxTime));
  float dt = wavePos - vTime;
  float head = exp(-pow(dt * 12.0, 2.0));
  float trail = dt >= 0.0 ? exp(-dt * 4.2) : 0.18;
  vec3 col = mix(vec3(0.22, 0.76, 0.98), vec3(1.0, 0.85, 0.25), head);
  float alpha = clamp(0.14 + 0.75 * max(head, trail * 0.45), 0.1, 0.95) * clamp(vEnergy * 1.4 + 0.25, 0.2, 1.0);
  outColor = vec4(col, alpha);
}
`;

export const CAMERA_PRESETS = {
  cutaway: { eye: [14.5, 9.0, 8.8], target: [0.0, 14.5, 2.8] },
  chamber: { eye: [0.0, 15.8, 3.25], target: [0.1, 21.2, 3.65] },
  vault: { eye: [0.0, 19.6, 2.45], target: [0.0, 20.55, 7.65] },
  passage: { eye: [4.6, -6.2, 2.9], target: [0.0, 3.5, 1.85] },
  exterior: { eye: [46.0, -34.0, 25.0], target: [0.0, 38.0, 4.5] },
};

export class NewgrangeWebGLEngine {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) throw new Error("WebGL2 is not supported in this browser.");
    this.gl = gl;

    this.archProg = createProgram(gl, ARCH_VS, ARCH_FS);
    this.sliceProg = createProgram(gl, SLICE_VS, SLICE_FS);
    this.rayProg = createProgram(gl, RAY_VS, RAY_FS);

    this.meshes = [];
    this.eigenData = null;
    this.modeTex = null;
    this.sliceVao = gl.createVertexArray();
    this.sliceVbo = gl.createBuffer();
    this.rayVao = null;
    this.rayVertexCount = 0;
    this.rayMaxTime = 0.25;

    this.eye = [...CAMERA_PRESETS.cutaway.eye];
    this.target = [...CAMERA_PRESETS.cutaway.target];
    this.camAnim = null;

    this.state = {
      clipAxis: 0,
      clipPos: 0.15,
      layers: {
        interior: true,
        vault: true,
        mound_west: true,
        mound_east: false,
        exterior: true,
        terrain: true,
        solstice: true,
        acoustic_cavity: false,
      },
      showEigenmode: true,
      modeIndex: 1,
      sliceZ: 2.70,
      sliceX: 0.00,
      showRays: true,
      pulseActive: false,
      pulseStartMs: 0,
      pulseOrigin: [0.0, 20.55, 3.35],
    };

    this.keys = new Set();
    this._bindEvents();
    this._lastTime = performance.now();
  }

  async loadScene(manifestUrl, eigenUrl, raysUrl) {
    const manifestResp = await fetch(manifestUrl);
    const manifest = await manifestResp.json();
    const baseDir = manifestUrl.substring(0, manifestUrl.lastIndexOf("/") + 1);
    const binResp = await fetch(baseDir + manifest.binaryFile);
    const binBuf = await binResp.arrayBuffer();

    const gl = this.gl;
    for (const m of manifest.meshes) {
      const pos = new Float32Array(binBuf, m.pos.byteOffset, m.pos.byteLength / 4);
      const norm = new Float32Array(binBuf, m.norm.byteOffset, m.norm.byteLength / 4);
      const col = new Float32Array(binBuf, m.col.byteOffset, m.col.byteLength / 4);
      const idx = new Uint32Array(binBuf, m.idx.byteOffset, m.idx.byteLength / 4);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      const uploadAttr = (loc, data) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
      };
      uploadAttr(0, pos);
      uploadAttr(1, norm);
      uploadAttr(2, col);

      const ebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);

      this.meshes.push({
        name: m.name,
        layer: m.layer,
        vao,
        indexCount: m.indexCount,
        opacity: m.opacity,
        emissive: m.emissive ? 1.0 : 0.0,
      });
    }

    // Load 3D FDTD Eigenmodes binary
    const eigResp = await fetch(eigenUrl);
    const eigBuf = await eigResp.arrayBuffer();
    const dv = new DataView(eigBuf);
    const nModes = dv.getUint32(0, true);
    const nx = dv.getUint32(4, true);
    const ny = dv.getUint32(8, true);
    const nz = dv.getUint32(12, true);
    const bbox = [];
    for (let i = 0; i < 6; i++) bbox.push(dv.getFloat32(16 + i * 4, true));
    const volSize = nx * ny * nz;
    let offset = 40;
    const mask = new Uint8Array(eigBuf, offset, volSize);
    offset += volSize;
    const modes = [];
    for (let m = 0; m < nModes; m++) {
      modes.push(new Uint8Array(eigBuf, offset, volSize));
      offset += volSize;
    }
    this.eigenData = { nModes, nx, ny, nz, bbox, mask, modes };
    this.setEigenmode(Math.min(1, nModes - 1));

    // Load 3D Ray Paths
    const rayResp = await fetch(raysUrl);
    const rayJson = await rayResp.json();
    const rayVerts = [];
    let maxT = 0.1;
    for (const p of rayJson.paths) {
      const pts = p.points;
      const times = p.times_s;
      const ens = p.energies;
      for (let i = 0; i < pts.length - 1; i++) {
        const t0 = times[i] ?? 0;
        const t1 = times[i + 1] ?? t0 + 0.01;
        const e0 = ens[i] ?? 0.5;
        const e1 = ens[i + 1] ?? e0 * 0.85;
        maxT = Math.max(maxT, t1);
        rayVerts.push(pts[i][0], pts[i][1], pts[i][2], t0, e0);
        rayVerts.push(pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], t1, e1);
      }
    }
    this.rayMaxTime = Math.min(maxT, 0.45);
    this.rayVertexCount = rayVerts.length / 5;
    if (this.rayVertexCount > 0) {
      this.rayVao = gl.createVertexArray();
      gl.bindVertexArray(this.rayVao);
      const rvbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, rvbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rayVerts), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 20, 12);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16);
      gl.bindVertexArray(null);
    }
  }

  setEigenmode(modeIdx) {
    if (!this.eigenData) return;
    const { nx, ny, nz, mask, modes } = this.eigenData;
    const clamped = Math.max(0, Math.min(modes.length - 1, modeIdx));
    this.state.modeIndex = clamped;
    const field = modes[clamped];
    const rgba = new Uint8Array(nx * ny * nz * 4);
    for (let i = 0; i < field.length; i++) {
      const f = field[i];
      rgba[i * 4 + 0] = f;
      rgba[i * 4 + 1] = f;
      rgba[i * 4 + 2] = f;
      rgba[i * 4 + 3] = mask[i];
    }
    const gl = this.gl;
    if (!this.modeTex) this.modeTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, this.modeTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, nx, ny, nz, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
  }

  setCameraPreset(presetName) {
    const p = CAMERA_PRESETS[presetName];
    if (!p) return;
    this.camAnim = {
      startTime: performance.now(),
      dur: 520,
      fromEye: [...this.eye],
      fromTarget: [...this.target],
      toEye: [...p.eye],
      toTarget: [...p.target],
    };
  }

  triggerPulse(origin = [0.0, 20.55, 3.35]) {
    this.state.pulseActive = true;
    this.state.pulseStartMs = performance.now();
    this.state.pulseOrigin = origin;
  }

  _bindEvents() {
    let dragging = false;
    let panMode = false;
    let lx = 0, ly = 0;

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      panMode = e.button === 2 || e.shiftKey;
      lx = e.clientX;
      ly = e.clientY;
      this.camAnim = null;
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;

      const vx = this.eye[0] - this.target[0];
      const vy = this.eye[1] - this.target[1];
      const vz = this.eye[2] - this.target[2];
      const r = Math.max(0.5, Math.hypot(vx, vy, vz));

      if (panMode) {
        const fwd = [-vx / r, -vy / r, -vz / r];
        const rx = fwd[1] * 1 - fwd[2] * 0;
        const ry = fwd[2] * 0 - fwd[0] * 1;
        const rLen = Math.hypot(rx, ry) || 1;
        const right = [rx / rLen, ry / rLen, 0];
        const scale = r * 0.0018;
        const moveX = -dx * right[0] * scale;
        const moveY = -dx * right[1] * scale;
        const moveZ = dy * scale;
        this.eye[0] += moveX; this.target[0] += moveX;
        this.eye[1] += moveY; this.target[1] += moveY;
        this.eye[2] += moveZ; this.target[2] += moveZ;
      } else {
        let theta = Math.atan2(vy, vx) - dx * 0.0065;
        let phi = Math.acos(Math.max(-0.995, Math.min(0.995, vz / r))) - dy * 0.0065;
        phi = Math.max(0.06, Math.min(Math.PI - 0.06, phi));
        this.eye[0] = this.target[0] + r * Math.sin(phi) * Math.cos(theta);
        this.eye[1] = this.target[1] + r * Math.sin(phi) * Math.sin(theta);
        this.eye[2] = this.target[2] + r * Math.cos(phi);
      }
    });
    this.canvas.addEventListener("pointerup", (e) => {
      dragging = false;
      try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    });
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.camAnim = null;
      const factor = Math.exp(e.deltaY * 0.0011);
      for (let i = 0; i < 3; i++) {
        this.eye[i] = this.target[i] + (this.eye[i] - this.target[i]) * factor;
      }
    }, { passive: false });

    window.addEventListener("keydown", (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  _updateCameraWalk(dt) {
    if (this.camAnim) {
      const t = Math.min(1, (performance.now() - this.camAnim.startTime) / this.camAnim.dur);
      const u = t * t * (3 - 2 * t);
      for (let i = 0; i < 3; i++) {
        this.eye[i] = this.camAnim.fromEye[i] + (this.camAnim.toEye[i] - this.camAnim.fromEye[i]) * u;
        this.target[i] = this.camAnim.fromTarget[i] + (this.camAnim.toTarget[i] - this.camAnim.fromTarget[i]) * u;
      }
      if (t >= 1) this.camAnim = null;
    }

    const speed = 4.8 * dt;
    let fMove = 0, sMove = 0, uMove = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) fMove += 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) fMove -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) sMove += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) sMove -= 1;
    if (this.keys.has("e")) uMove += 1;
    if (this.keys.has("q")) uMove -= 1;

    if (fMove || sMove || uMove) {
      const fx = this.target[0] - this.eye[0];
      const fy = this.target[1] - this.eye[1];
      const fl = Math.hypot(fx, fy) || 1;
      const fwd = [fx / fl, fy / fl];
      const right = [fwd[1], -fwd[0]];
      const dx = (fwd[0] * fMove + right[0] * sMove) * speed;
      const dy = (fwd[1] * fMove + right[1] * sMove) * speed;
      const dz = uMove * speed;
      this.eye[0] += dx; this.target[0] += dx;
      this.eye[1] += dy; this.target[1] += dy;
      this.eye[2] += dz; this.target[2] += dz;
    }
  }

  _buildSliceQuads() {
    if (!this.eigenData) return 0;
    const [xmin, xmax, ymin, ymax, zmin, zmax] = this.eigenData.bbox;
    const uz = Math.max(0, Math.min(1, (this.state.sliceZ - zmin) / (zmax - zmin)));
    const ux = Math.max(0, Math.min(1, (this.state.sliceX - xmin) / (xmax - xmin)));
    const uyCh = Math.max(0, Math.min(1, (20.55 - ymin) / (ymax - ymin)));

    const verts = new Float32Array([
      // Horizontal Z-slice
      xmin, ymin, this.state.sliceZ, 0, 0, uz,
      xmax, ymin, this.state.sliceZ, 1, 0, uz,
      xmax, ymax, this.state.sliceZ, 1, 1, uz,
      xmin, ymin, this.state.sliceZ, 0, 0, uz,
      xmax, ymax, this.state.sliceZ, 1, 1, uz,
      xmin, ymax, this.state.sliceZ, 0, 1, uz,

      // Longitudinal X-slice along passage & chamber
      this.state.sliceX, ymin, zmin, ux, 0, 0,
      this.state.sliceX, ymax, zmin, ux, 1, 0,
      this.state.sliceX, ymax, zmax, ux, 1, 1,
      this.state.sliceX, ymin, zmin, ux, 0, 0,
      this.state.sliceX, ymax, zmax, ux, 1, 1,
      this.state.sliceX, ymin, zmax, ux, 0, 1,

      // Transverse Chamber Cross-section (y = 20.55 m)
      xmin, 20.55, zmin, 0, uyCh, 0,
      xmax, 20.55, zmin, 1, uyCh, 0,
      xmax, 20.55, zmax, 1, uyCh, 1,
      xmin, 20.55, zmin, 0, uyCh, 0,
      xmax, 20.55, zmax, 1, uyCh, 1,
      xmin, 20.55, zmax, 0, uyCh, 1,
    ]);

    const gl = this.gl;
    gl.bindVertexArray(this.sliceVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sliceVbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindVertexArray(null);
    return 18;
  }

  renderFrame(now) {
    const dt = Math.min(0.05, (now - this._lastTime) * 0.001);
    this._lastTime = now;
    this._updateCameraWalk(dt);

    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const ch = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }

    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0.055, 0.066, 0.086, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    const proj = mat4Perspective(Math.PI / 4, cw / ch, 0.15, 240.0);
    const view = mat4LookAt(this.eye, this.target, [0, 0, 1]);

    // Pulse animation
    let pulseRad = 0, pulseAlpha = 0;
    if (this.state.pulseActive) {
      const elapsed = (now - this.state.pulseStartMs) * 0.001;
      if (elapsed > 0.75) {
        this.state.pulseActive = false;
      } else {
        pulseRad = elapsed * 36.0;
        pulseAlpha = Math.max(0, 1.0 - elapsed / 0.75);
      }
    }

    // 1. Opaque Architectural Sub-meshes
    gl.useProgram(this.archProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.archProg, "uProj"), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.archProg, "uView"), false, view);
    gl.uniform3fv(gl.getUniformLocation(this.archProg, "uCamPos"), this.eye);
    gl.uniform1i(gl.getUniformLocation(this.archProg, "uClipAxis"), this.state.clipAxis);
    gl.uniform1f(gl.getUniformLocation(this.archProg, "uClipPos"), this.state.clipPos);
    gl.uniform3fv(gl.getUniformLocation(this.archProg, "uPulseOrigin"), this.state.pulseOrigin);
    gl.uniform1f(gl.getUniformLocation(this.archProg, "uPulseRadius"), pulseRad);
    gl.uniform1f(gl.getUniformLocation(this.archProg, "uPulseAlpha"), pulseAlpha);

    gl.disable(gl.BLEND);
    gl.depthMask(true);
    for (const m of this.meshes) {
      if (!this.state.layers[m.layer]) continue;
      if (m.opacity < 0.99 || m.layer === "acoustic_cavity") continue;
      gl.uniform1f(gl.getUniformLocation(this.archProg, "uOpacity"), m.opacity);
      gl.uniform1f(gl.getUniformLocation(this.archProg, "uEmissive"), m.emissive);
      gl.uniform1i(gl.getUniformLocation(this.archProg, "uCavityMode"), 0);
      gl.bindVertexArray(m.vao);
      gl.drawElements(gl.TRIANGLES, m.indexCount, gl.UNSIGNED_INT, 0);
    }

    // 2. Transparent Layers (Solstice Sunbeam, Watertight Cavity, 3D Eigenmode Slices, Rays)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    for (const m of this.meshes) {
      if (!this.state.layers[m.layer]) continue;
      if (m.opacity >= 0.99 && m.layer !== "acoustic_cavity") continue;
      gl.uniform1f(gl.getUniformLocation(this.archProg, "uOpacity"), m.opacity);
      gl.uniform1f(gl.getUniformLocation(this.archProg, "uEmissive"), m.emissive);
      gl.uniform1i(gl.getUniformLocation(this.archProg, "uCavityMode"), m.layer === "acoustic_cavity" ? 1 : 0);
      gl.bindVertexArray(m.vao);
      gl.drawElements(gl.TRIANGLES, m.indexCount, gl.UNSIGNED_INT, 0);
    }

    if (this.state.showEigenmode && this.modeTex) {
      const nSliceVerts = this._buildSliceQuads();
      if (nSliceVerts > 0) {
        gl.useProgram(this.sliceProg);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.sliceProg, "uProj"), false, proj);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.sliceProg, "uView"), false, view);
        gl.uniform1f(gl.getUniformLocation(this.sliceProg, "uPhase"), now * 0.0042);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, this.modeTex);
        gl.uniform1i(gl.getUniformLocation(this.sliceProg, "uModeTex"), 0);
        gl.bindVertexArray(this.sliceVao);
        gl.drawArrays(gl.TRIANGLES, 0, nSliceVerts);
      }
    }

    if (this.state.showRays && this.rayVao && this.rayVertexCount > 0) {
      gl.useProgram(this.rayProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.rayProg, "uProj"), false, proj);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.rayProg, "uView"), false, view);
      gl.uniform1f(gl.getUniformLocation(this.rayProg, "uAnimTime"), now * 0.00018);
      gl.uniform1f(gl.getUniformLocation(this.rayProg, "uMaxTime"), this.rayMaxTime);
      gl.bindVertexArray(this.rayVao);
      gl.drawArrays(gl.LINES, 0, this.rayVertexCount);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}
