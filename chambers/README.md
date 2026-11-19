# The Note in the Stone — Comparative Megalithic Chamber Acoustics (`/chambers/`)

Interactive 3D architectural models, 3D FDTD wave simulations, and physics explainers comparing **Newgrange**, **Maeshowe**, **Loughcrew Cairns L & I**, **Wayland's Smithy**, **Chûn Quoit**, and **Carn Euny**.

Based on data and citations assembled in [*The Note in the Stone*](https://thenommo.com/articles/megalithic-chamber-acoustics-newgrange-maeshowe.html) (Jahn, Devereux & Ibison 1996 *JASA*; Watson & Keating 1998–2004; Watson & Was 2021; Cook et al. 2008; Fazenda et al. 2017; Historic Environment Scotland; World Heritage Ireland).

## Contents
- `src/sites_spec.py` — Full empirical site dataset, voice benchmarks, ideal box modal solver, and 16 primary bibliographic sources.
- `src/build_models.py` — Parametric 3D builders and Y-up `.glb` / WebGL2 bundle exporters for 6 monuments + 1.75 m scale figure.
- `src/simulate_experiments.py` — 3D locally-reacting FDTD simulations for Maeshowe, Loughcrew Cairn L (with vs without 7 radial partitions), and Newgrange Roof-Box vs Entrance Doorway acoustic transmission, plus Helmholtz leakage curves.
- `src/verify_chambers.py` — Automated verification of `.glb` files, WebGL2 bundles, 3D fields, and simulation datasets.
- `models/` — Individual glTF 2.0 (`.glb`) models (`maeshowe.glb`, `loughcrew_cairn_l.glb`, `waylands_smithy.glb`, `chun_quoit.glb`, `carn_euny.glb`).
- `viewer/` — Integrated editorial white-paper and WebGL2 + Web Audio interactive observatory.

## Rebuilding
```sh
python3 build_chambers_all.py
```
