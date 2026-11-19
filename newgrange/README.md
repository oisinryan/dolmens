# Newgrange Passage Tomb — Acoustically Accurate 3D Model

A complete, archaeologically faithful, physics-simulated, and interactively explorable 3D acoustic model of **Newgrange (*Sí an Bhrú*, Brú na Bóinne, County Meath, Ireland, c. 3200 BCE)**.

## Archaeological & Acoustic Reference Basis
- **Dimensions & Structural Layout (O'Kelly, 1982)**:
  - **Passage**: 18.95 m long, ~1.0 m wide, rising 1.95 m smoothly from entrance (`y = 0`) to the inner chamber threshold (`y = 18.95 m`), lined by orthostats L1–L22 & R1–R21 and stepping up beneath roof slabs RS14–RS17 to 3.10 m clear height above chamber floor.
  - **Roof-Box & Winter Solstice Alignment**: Quartz-framed lightbox positioned above the entrance lintel (`z = 1.90–2.55 m`, slit `z = 2.16–2.42 m`) allowing a 1.0° descending Winter Solstice sunrise ray to traverse all 18.95 m unobstructed and illuminate the central chamber floor (`y = 20.6 m`).
  - **Cruciform Chamber**: 6.55 m W–E across West & East recesses, 5.25 m N–S from threshold to back of North recess, containing the four granite basins (West, North, and nested Double East basins).
  - **Corbelled Vault**: 18 overhanging horizontal dry-stone courses rising 6.00 m clear above the chamber floor (`z = 7.95 m`), closed by the capstone.
  - **Exterior Mound Context**: 85 m diameter × 12.5 m high grass-clad cairn ringed by 97 kerbstones (with carved triple-spiral Entrance Stone K1) and the curved white Wicklow quartz retaining wall studded with dark granodiorite cobbles.
- **Acoustic Physics**:
  - **Subterranean Atmosphere**: 11.0 °C, 85% RH, 101.325 kPa (`c = 338.65 m/s`, ISO 9613-1 octave-band air absorption).
  - **Low-Frequency 3D FDTD Wave Solver (18–340 Hz)**: Explicit locally-reacting finite-volume wave solver (`dx = 0.12 m`, 85,760 air voxels, Mur + sponge exterior buffer) extracting calibrated 1 m-referenced frequency response, longitudinal passage standing waves, and 3D standing-wave eigenmode fields.
  - **High-Frequency 3D Mesh Ray-Tracer (250 Hz–20 kHz)**: Vectorized Möller–Trumbore ray tracing on the watertight 2-manifold interior mesh (`8,340` triangles, `0` boundary/non-manifold edges, enclosed volume `108.08 m³`) with Lambertian diffuse scattering and binaural ITD/ILD projection.
  - **Broadband Hybrid IR Synthesis**: 4th-order zero-phase Linkwitz–Riley crossover at 280 Hz producing 48 kHz 16-bit stereo WAV impulse responses across 5 listening stations, plus full ISO 3382 parameter evaluation.

## Directory Structure
- `src/geometry_spec.py` — Parametric coordinates, air physics, octave-band material tables, and exact cavity classifier.
- `src/build_mesh.py` — Watertight 2-manifold acoustic interior mesh + multi-layer architectural monument generator.
- `src/export_3d.py` — Pure-Python exporters for binary `.stl`, `.obj`/`.mtl`, `.glb` (glTF 2.0), and WebGL2 binary buffers.
- `src/acoustic_fdtd.py` — 3D locally-reacting FDTD solver and 3D eigenmode DFT packer.
- `src/acoustic_raytrace.py` — 2D-grid DDA accelerated vectorized 3D ray tracer with diffuse scattering.
- `src/synthesize_ir.py` — Hybrid 48 kHz stereo IR synthesizer, ISO 3382 analyzer, and diagnostic plot generator.
- `src/verify_model.py` — Automated geometric, watertightness, file-format, and acoustic validation suite.
- `models/` — Exported `.glb`, `.obj`, `.mtl`, and `.stl` 3D assets.
- `acoustics/` — `ir_*.wav` (48 kHz stereo), `acoustic_report.json`, `eigenmodes_3d.bin`, `ray_paths.json`, and `plots/*.png`.
- `viewer/` — Interactive WebGL2 + Web Audio real-time 3D cutaway & auralization observatory.

## Reproducing the Build
```bash
MPLCONFIGDIR=/tmp/mpl-cache python3 build_all.py
```

## Running the Interactive 3D & Web Audio Viewer
```bash
python3 -m http.server 8765
```
Then open `http://localhost:8765/viewer/` in a WebGL2-capable browser.
