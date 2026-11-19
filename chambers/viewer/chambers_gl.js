/**
 * WebGL2 Multi-Monument Cutaway & 3D Standing-Wave Observatory
 * Supports Maeshowe, Newgrange, Loughcrew Cairn L (toggleable partitions),
 * Wayland's Smithy, Chun Quoit, and Carn Euny, plus 1.75 m scale figure.
 */

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const msg = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`Shader error: ${msg}`);
  }
  return s;
}

function linkProgram(gl, vsSrc, fsSrc) {
  const p = gl.createProgram();
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(p)}`);
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
  if (len < 1e-6) { xx = 1; xy = 0; xz = 0; } else { xx /= len; xy /= len; xz /= len; }

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
uniform vec3 uOffset;

out vec3 vPos;
out vec3 vNorm;
out vec3 vCol;

void main() {
  vec3 p = aPos + uOffset;
  vPos = p;
  vNorm = aNorm;
  vCol = aCol;
  gl_Position = uProj * uView * vec4(p, 1.0);
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
uniform vec3 uTorchPos;

out vec4 outColor;

void main() {
  if (uClipAxis == 0 && vPos.x > uClipPos) discard;
  if (uClipAxis == 1 && vPos.y < uClipPos) discard;
  if (uClipAxis == 2 && vPos.z > uClipPos) discard;

  vec3 N = normalize(vNorm) * (gl_FrontFacing ? 1.0 : -1.0);
  if (uEmissive > 0.5) {
    outColor = vec4(vCol * 1.08, uOpacity);
    return;
  }

  float grain = 0.94 + 0.06 * sin(vPos.x * 14.0 + vPos.y * 12.0) * cos(vPos.z * 16.0);
  vec3 albedo = vCol * grain;

  vec3 sunDir = normalize(vec3(0.45, -0.72, 0.85));
  float sunDiff = max(0.0, dot(N, sunDir));
  float hemi = 0.5 + 0.5 * N.z;
  vec3 amb = mix(vec3(0.20, 0.17, 0.14), vec3(0.45, 0.50, 0.58), hemi);

  vec3 lVec = uTorchPos - vPos;
  float ld = length(lVec);
  float att = 1.0 / (1.0 + 0.09 * ld * ld);
  float torchDiff = max(0.0, dot(N, normalize(lVec))) * att;

  vec3 V = normalize(uCamPos - vPos);
  vec3 H = normalize(sunDir + V);
  float spec = pow(max(0.0, dot(N, H)), 24.0) * 0.07;

  vec3 lit = albedo * (amb * 0.72 + sunDiff * vec3(1.02, 0.96, 0.88) * 0.75)
           + albedo * (torchDiff * vec3(1.25, 0.86, 0.44))
           + vec3(spec);
  outColor = vec4(lit, uOpacity);
}
`;

const WAVE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aUvw;

uniform mat4 uProj;
uniform mat4 uView;

out vec3 vPos;
out vec3 vUvw;

void main() {
  vPos = aPos;
  vUvw = aUvw;
  gl_Position = uProj * uView * vec4(aPos, 1.0);
}
`;

const WAVE_FS = `#version 300 es
precision highp float;
precision highp sampler3D;

in vec3 vPos;
in vec3 vUvw;

uniform sampler3D uWaveTex;
uniform int uUseTex;
uniform float uPhase;
uniform vec3 uAnalyticCenter;
uniform vec3 uAnalyticHalf;

out vec4 outColor;

void main() {
  float val = 0.0;
  float alphaMask = 0.0;
  if (uUseTex == 1) {
    vec4 t = texture(uWaveTex, vUvw);
    if (t.a < 0.35) discard;
    val = (t.r * 2.0 - 1.0);
    alphaMask = t.a;
  } else {
    vec3 q = (vPos - uAnalyticCenter) / max(uAnalyticHalf, vec3(0.2));
    if (abs(q.x) > 1.0 || abs(q.y) > 1.0 || abs(q.z) > 1.0) discard;
    val = cos(q.x * 3.14159) * cos(q.y * 3.14159 * 0.85) * cos(q.z * 1.5708);
    alphaMask = 0.85;
  }

  float p = val * cos(uPhase);
  float mag = abs(p);
  vec3 posCol = mix(vec3(0.95, 0.60, 0.14), vec3(0.88, 0.25, 0.12), smoothstep(0.2, 0.95, mag));
  vec3 negCol = mix(vec3(0.16, 0.68, 0.96), vec3(0.12, 0.34, 0.68), smoothstep(0.2, 0.95, mag));
  vec3 col = p >= 0.0 ? posCol : negCol;
  float alpha = alphaMask * (0.14 + 0.68 * smoothstep(0.04, 0.78, mag));
  outColor = vec4(col, alpha);
}
`;

const ANALYTIC_BOUNDS = {
  waylands_smithy: { center: [0.0, 5.75, 0.95], half: [2.0, 2.2, 0.95], bbox: [-2.4, 2.4, 0.0, 8.6, 0.05, 2.0] },
  chun_quoit: { center: [0.0, 0.0, 0.78], half: [0.75, 0.75, 0.75], bbox: [-0.9, 0.9, -0.9, 0.9, 0.05, 1.5] },
  carn_euny: { center: [0.0, 10.8, 1.45], half: [2.15, 2.15, 1.45], bbox: [-2.4, 2.4, 0.0, 13.4, 0.05, 3.0] },
};

export class ChambersWebGLEngine {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;

    this.archProg = linkProgram(gl, ARCH_VS, ARCH_FS);
    this.waveProg = linkProgram(gl, WAVE_VS, WAVE_FS);

    this.siteMeshes = {};
    this.scaleMesh = null;
    this.scalePositions = {};
    this.volumes = {};
    this.activeTex = null;
    this.activeBbox = null;
    this.useTex = false;

    this.sliceVao = gl.createVertexArray();
    this.sliceVbo = gl.createBuffer();

    this.activeSite = "maeshowe";
    this.eye = [11.0, -7.5, 6.2];
    this.target = [0.0, 10.5, 2.3];
    this.camAnim = null;

    this.state = {
      clipAxis: 0,
      clipPos: 0.2,
      showEastMound: false,
      showScaleFigure: true,
      showWaveSlice: true,
      showPartitions: true,
      sliceZ: 2.1,
      sliceX: 0.0,
    };

    this.keys = new Set();
    this._bindEvents();
    this._lastTime = performance.now();
  }

  async loadAssets(manifestUrl, compModesUrl, ngModesUrl) {
    const manResp = await fetch(manifestUrl);
    const manifest = await manResp.json();
    const baseDir = manifestUrl.substring(0, manifestUrl.lastIndexOf("/") + 1);
    const binBuf = await (await fetch(baseDir + manifest.binaryFile)).arrayBuffer();

    const uploadMesh = (m) => {
      const gl = this.gl;
      const pos = new Float32Array(binBuf, m.pos.byteOffset, m.pos.byteLength / 4);
      const norm = new Float32Array(binBuf, m.norm.byteOffset, m.norm.byteLength / 4);
      const col = new Float32Array(binBuf, m.col.byteOffset, m.col.byteLength / 4);
      const idx = new Uint32Array(binBuf, m.idx.byteOffset, m.idx.byteLength / 4);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const put = (loc, arr) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
      };
      put(0, pos);
      put(1, norm);
      put(2, col);
      const ebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      return {
        name: m.name,
        layer: m.layer,
        vao,
        indexCount: m.indexCount,
        opacity: m.opacity,
        emissive: m.emissive ? 1.0 : 0.0,
      };
    };

    for (const [siteId, list] of Object.entries(manifest.sites)) {
      this.siteMeshes[siteId] = list.map(uploadMesh);
    }
    this.scaleMesh = uploadMesh(manifest.scaleFigure);
    this.scalePositions = manifest.scalePositions;

    // Load 3D FDTD volumes for Maeshowe & Loughcrew L
    const [compBuf, ngBuf] = await Promise.all([
      fetch(compModesUrl).then((r) => r.arrayBuffer()),
      fetch(ngModesUrl).then((r) => r.arrayBuffer()),
    ]);

    const dvC = new DataView(compBuf);
    let off = 0;
    for (const key of ["maeshowe", "loughcrew_l"]) {
      const nx = dvC.getUint32(off, true);
      const ny = dvC.getUint32(off + 4, true);
      const nz = dvC.getUint32(off + 8, true);
      const bbox = [];
      for (let i = 0; i < 6; i++) bbox.push(dvC.getFloat32(off + 12 + i * 4, true));
      off += 36;
      const volN = nx * ny * nz;
      const mask = new Uint8Array(compBuf, off, volN);
      const field = new Uint8Array(compBuf, off + volN, volN);
      off += volN * 2;
      this.volumes[key] = { nx, ny, nz, bbox, mask, field };
    }

    // Load Newgrange primary ~105 Hz standing wave mode (mode 1) from eigenmodes_3d.bin
    const dvN = new DataView(ngBuf);
    const nxN = dvN.getUint32(4, true);
    const nyN = dvN.getUint32(8, true);
    const nzN = dvN.getUint32(12, true);
    const bboxN = [];
    for (let i = 0; i < 6; i++) bboxN.push(dvN.getFloat32(16 + i * 4, true));
    const volN = nxN * nyN * nzN;
    const maskN = new Uint8Array(ngBuf, 40, volN);
    const fieldN = new Uint8Array(ngBuf, 40 + volN * 2, volN); // Mode 1 (105.42 Hz)
    this.volumes.newgrange = { nx: nxN, ny: nyN, nz: nzN, bbox: bboxN, mask: maskN, field: fieldN };

    this.selectSite("maeshowe", { eye: [11.0, -7.5, 6.2], target: [0.0, 10.5, 2.3] }, { axis: 0, pos: 0.2 }, { x: 0.0, z: 2.1 });
  }

  selectSite(siteId, camPreset, clipDefault, sliceDefaults) {
    this.activeSite = siteId;
    if (camPreset) {
      this.camAnim = {
        start: performance.now(),
        dur: 500,
        fromEye: [...this.eye],
        fromTarget: [...this.target],
        toEye: [...camPreset.eye],
        toTarget: [...camPreset.target],
      };
    }
    if (clipDefault) {
      this.state.clipAxis = clipDefault.axis;
      this.state.clipPos = clipDefault.pos;
    }
    if (sliceDefaults) {
      this.state.sliceX = sliceDefaults.x;
      this.state.sliceZ = sliceDefaults.z;
    }

    const vol = this.volumes[siteId];
    if (vol) {
      const gl = this.gl;
      const rgba = new Uint8Array(vol.nx * vol.ny * vol.nz * 4);
      for (let i = 0; i < vol.field.length; i++) {
        rgba[i * 4 + 0] = vol.field[i];
        rgba[i * 4 + 1] = vol.field[i];
        rgba[i * 4 + 2] = vol.field[i];
        rgba[i * 4 + 3] = vol.mask[i];
      }
      if (!this.activeTex) this.activeTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_3D, this.activeTex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, vol.nx, vol.ny, vol.nz, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      this.activeBbox = vol.bbox;
      this.useTex = true;
    } else {
      this.activeBbox = ANALYTIC_BOUNDS[siteId]?.bbox ?? [-2, 2, 0, 8, 0, 2.5];
      this.useTex = false;
    }
  }

  _bindEvents() {
    let dragging = false, pan = false, lx = 0, ly = 0;
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      pan = e.button === 2 || e.shiftKey;
      lx = e.clientX; ly = e.clientY;
      this.camAnim = null;
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      const vx = this.eye[0] - this.target[0];
      const vy = this.eye[1] - this.target[1];
      const vz = this.eye[2] - this.target[2];
      const r = Math.max(0.5, Math.hypot(vx, vy, vz));
      if (pan) {
        const fx = -vx / r, fy = -vy / r;
        const rLen = Math.hypot(fy, -fx) || 1;
        const right = [fy / rLen, -fx / rLen];
        const s = r * 0.0018;
        this.eye[0] += -dx * right[0] * s; this.target[0] += -dx * right[0] * s;
        this.eye[1] += -dx * right[1] * s; this.target[1] += -dx * right[1] * s;
        this.eye[2] += dy * s; this.target[2] += dy * s;
      } else {
        const theta = Math.atan2(vy, vx) - dx * 0.0065;
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
      for (let i = 0; i < 3; i++) this.eye[i] = this.target[i] + (this.eye[i] - this.target[i]) * factor;
    }, { passive: false });

    window.addEventListener("keydown", (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
  }

  _updateWalk(dt) {
    if (this.camAnim) {
      const t = Math.min(1, (performance.now() - this.camAnim.start) / this.camAnim.dur);
      const u = t * t * (3 - 2 * t);
      for (let i = 0; i < 3; i++) {
        this.eye[i] = this.camAnim.fromEye[i] + (this.camAnim.toEye[i] - this.camAnim.fromEye[i]) * u;
        this.target[i] = this.camAnim.fromTarget[i] + (this.camAnim.toTarget[i] - this.camAnim.fromTarget[i]) * u;
      }
      if (t >= 1) this.camAnim = null;
    }
    const speed = 4.2 * dt;
    let fm = 0, sm = 0;
    if (this.keys.has("w")) fm += 1;
    if (this.keys.has("s")) fm -= 1;
    if (this.keys.has("d")) sm += 1;
    if (this.keys.has("a")) sm -= 1;
    if (fm || sm) {
      const fx = this.target[0] - this.eye[0], fy = this.target[1] - this.eye[1];
      const fl = Math.hypot(fx, fy) || 1;
      const fwd = [fx / fl, fy / fl];
      const right = [fwd[1], -fwd[0]];
      const dx = (fwd[0] * fm + right[0] * sm) * speed;
      const dy = (fwd[1] * fm + right[1] * sm) * speed;
      this.eye[0] += dx; this.target[0] += dx;
      this.eye[1] += dy; this.target[1] += dy;
    }
  }

  _buildWaveSlice() {
    if (!this.activeBbox) return 0;
    const [xmin, xmax, ymin, ymax, zmin, zmax] = this.activeBbox;
    const sz = Math.max(zmin + 0.05, Math.min(zmax - 0.05, this.state.sliceZ));
    const sx = Math.max(xmin + 0.05, Math.min(xmax - 0.05, this.state.sliceX));
    const uz = (sz - zmin) / Math.max(0.01, zmax - zmin);
    const ux = (sx - xmin) / Math.max(0.01, xmax - xmin);

    const verts = new Float32Array([
      xmin, ymin, sz, 0, 0, uz,
      xmax, ymin, sz, 1, 0, uz,
      xmax, ymax, sz, 1, 1, uz,
      xmin, ymin, sz, 0, 0, uz,
      xmax, ymax, sz, 1, 1, uz,
      xmin, ymax, sz, 0, 1, uz,

      sx, ymin, zmin, ux, 0, 0,
      sx, ymax, zmin, ux, 1, 0,
      sx, ymax, zmax, ux, 1, 1,
      sx, ymin, zmin, ux, 0, 0,
      sx, ymax, zmax, ux, 1, 1,
      sx, ymin, zmax, ux, 0, 1,
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
    return 12;
  }

  renderFrame(now) {
    const dt = Math.min(0.05, (now - this._lastTime) * 0.001);
    this._lastTime = now;
    this._updateWalk(dt);

    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const ch = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }

    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0.062, 0.075, 0.095, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    const proj = mat4Perspective(Math.PI / 4, cw / ch, 0.12, 220.0);
    const view = mat4LookAt(this.eye, this.target, [0, 0, 1]);
    const list = this.siteMeshes[this.activeSite] || [];
    const sPos = this.scalePositions[this.activeSite] || [0, 0, 0];

    gl.useProgram(this.archProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.archProg, "uProj"), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.archProg, "uView"), false, view);
    gl.uniform3fv(gl.getUniformLocation(this.archProg, "uCamPos"), this.eye);
    gl.uniform1i(gl.getUniformLocation(this.archProg, "uClipAxis"), this.state.clipAxis);
    gl.uniform1f(gl.getUniformLocation(this.archProg, "uClipPos"), this.state.clipPos);
    gl.uniform3fv(gl.getUniformLocation(this.archProg, "uTorchPos"), [sPos[0], sPos[1], sPos[2] + 1.8]);

    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.uniform3fv(gl.getUniformLocation(this.archProg, "uOffset"), [0, 0, 0]);
    for (const m of list) {
      if (m.layer === "mound_east" && !this.state.showEastMound) continue;
      if (m.layer === "partitions" && !this.state.showPartitions) continue;
      if (m.opacity < 0.99) continue;
      gl.uniform1f(gl.getUniformLocation(this.archProg, "uOpacity"), m.opacity);
      gl.uniform1f(gl.getUniformLocation(this.archProg, "uEmissive"), m.emissive);
      gl.bindVertexArray(m.vao);
      gl.drawElements(gl.TRIANGLES, m.indexCount, gl.UNSIGNED_INT, 0);
    }

    if (this.state.showScaleFigure && this.scaleMesh) {
      gl.uniform3fv(gl.getUniformLocation(this.archProg, "uOffset"), sPos);
      gl.uniform1f(gl.getUniformLocation(this.archProg, "uOpacity"), 1.0);
      gl.uniform1f(gl.getUniformLocation(this.archProg, "uEmissive"), 0.0);
      gl.uniform1i(gl.getUniformLocation(this.archProg, "uClipAxis"), -1);
      gl.bindVertexArray(this.scaleMesh.vao);
      gl.drawElements(gl.TRIANGLES, this.scaleMesh.indexCount, gl.UNSIGNED_INT, 0);
      gl.uniform1i(gl.getUniformLocation(this.archProg, "uClipAxis"), this.state.clipAxis);
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.uniform3fv(gl.getUniformLocation(this.archProg, "uOffset"), [0, 0, 0]);
    for (const m of list) {
      if (m.opacity >= 0.99) continue;
      gl.uniform1f(gl.getUniformLocation(this.archProg, "uOpacity"), m.opacity);
      gl.uniform1f(gl.getUniformLocation(this.archProg, "uEmissive"), m.emissive);
      gl.bindVertexArray(m.vao);
      gl.drawElements(gl.TRIANGLES, m.indexCount, gl.UNSIGNED_INT, 0);
    }

    if (this.state.showWaveSlice) {
      const nVerts = this._buildWaveSlice();
      if (nVerts > 0) {
        gl.useProgram(this.waveProg);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.waveProg, "uProj"), false, proj);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.waveProg, "uView"), false, view);
        gl.uniform1i(gl.getUniformLocation(this.waveProg, "uUseTex"), this.useTex ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(this.waveProg, "uPhase"), now * 0.0042);
        const ab = ANALYTIC_BOUNDS[this.activeSite] ?? ANALYTIC_BOUNDS.chun_quoit;
        gl.uniform3fv(gl.getUniformLocation(this.waveProg, "uAnalyticCenter"), ab.center);
        gl.uniform3fv(gl.getUniformLocation(this.waveProg, "uAnalyticHalf"), ab.half);
        if (this.useTex && this.activeTex) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_3D, this.activeTex);
          gl.uniform1i(gl.getUniformLocation(this.waveProg, "uWaveTex"), 0);
        }
        gl.bindVertexArray(this.sliceVao);
        gl.drawArrays(gl.TRIANGLES, 0, nVerts);
      }
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}
