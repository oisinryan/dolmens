"""
Parametric 3D Monument Builders for Comparative Megalithic Chamber Acoustics:
  1. Maeshowe (Orkney, 4.7x4.7x4.5 m square flagstone chamber + 3 side cells + clay-sealed 35 m mound)
  2. Newgrange (reuses verified O'Kelly mesh from newgrange/src/build_mesh.py)
  3. Loughcrew Cairn L (with toggleable 7-bay radial partition orthostats + pillar stone)
  4. Wayland's Smithy (sarsen long barrow + 1.5x1.5 m cruciform arms)
  5. Chun Quoit (4 leaning granite slabs + 1.5 m cube cavity + 3.3 m mushroom capstone)
  6. Carn Euny (4.6 m circular corbelled beehive + curved subterranean fogou passage)
  + Stylized 1.75 m human scale figure for cross-monument visual proportion.
"""

from __future__ import annotations

import json
import math
import os
import sys
from typing import Dict, List, Tuple

import numpy as np

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
DOLMENS_ROOT = os.path.abspath(os.path.join(THIS_DIR, "..", ".."))
NEWGRANGE_SRC = os.path.join(DOLMENS_ROOT, "newgrange", "src")
if NEWGRANGE_SRC not in sys.path:
    sys.path.insert(0, NEWGRANGE_SRC)

from build_mesh import ARCH_MATERIALS, _append_box, _merge_parts, build_full_monument_mesh  # type: ignore
from export_3d import compute_vertex_normals, write_glb  # type: ignore


CHAMBER_MATERIALS: Dict[str, Dict[str, object]] = {
    **ARCH_MATERIALS,
    "devonian_flagstone": {
        "rgb": (0.46, 0.43, 0.38),
        "roughness": 0.85,
        "metallic": 0.02,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "orkney_clay_seal": {
        "rgb": (0.48, 0.34, 0.21),
        "roughness": 0.94,
        "metallic": 0.00,
        "alpha_opacity": 1.0,
        "double_sided": True,
    },
    "sarsen_stone": {
        "rgb": (0.58, 0.56, 0.50),
        "roughness": 0.88,
        "metallic": 0.02,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "cornish_granite": {
        "rgb": (0.54, 0.53, 0.51),
        "roughness": 0.84,
        "metallic": 0.03,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "partition_orthostat": {
        "rgb": (0.62, 0.52, 0.36),
        "roughness": 0.85,
        "metallic": 0.02,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "scale_human": {
        "rgb": (0.12, 0.34, 0.64),
        "roughness": 0.60,
        "metallic": 0.05,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
}


def _append_cylinder_or_frustum(
    v_list: List[np.ndarray],
    f_list: List[np.ndarray],
    c_list: List[np.ndarray],
    cx: float,
    cy: float,
    z0: float,
    z1: float,
    r0: float,
    r1: float,
    rgb: Tuple[float, float, float],
    n_seg: int = 20,
) -> None:
    base = sum(len(v) for v in v_list)
    pts, cols, tris = [], [], []
    thetas = np.linspace(0.0, 2.0 * math.pi, n_seg, endpoint=False)
    for th in thetas:
        pts.append((cx + r0 * math.cos(th), cy + r0 * math.sin(th), z0))
        cols.append((rgb[0] * 0.86, rgb[1] * 0.86, rgb[2] * 0.86))
    for th in thetas:
        pts.append((cx + r1 * math.cos(th), cy + r1 * math.sin(th), z1))
        cols.append((rgb[0] * 1.05, rgb[1] * 1.05, rgb[2] * 1.05))
    bot_c = len(pts)
    pts.append((cx, cy, z0))
    cols.append((rgb[0] * 0.78, rgb[1] * 0.78, rgb[2] * 0.78))
    top_c = len(pts)
    pts.append((cx, cy, z1))
    cols.append((rgb[0] * 1.08, rgb[1] * 1.08, rgb[2] * 1.08))

    for i in range(n_seg):
        inext = (i + 1) % n_seg
        a, b = i, inext
        c, d = n_seg + inext, n_seg + i
        tris.extend([(a, b, c), (a, c, d)])
        tris.append((bot_c, inext, i))
        tris.append((top_c, n_seg + i, n_seg + inext))

    v_list.append(np.array(pts, dtype=np.float32))
    c_list.append(np.clip(np.array(cols, dtype=np.float32), 0.0, 1.0))
    f_list.append(np.array(tris, dtype=np.uint32) + base)


def _build_split_mound(
    name: str,
    layer: str,
    cy: float,
    rx: float,
    ry: float,
    height: float,
    cut_keepout_fn,
    x_sign: float,
    turf_rgb: Tuple[float, float, float] = (0.24, 0.37, 0.20),
    core_rgb: Tuple[float, float, float] = (0.44, 0.36, 0.24),
) -> Dict[str, object]:
    """Build one half of an elliptical turf/clay mound cutaway with inner keepout."""
    nr, nth = 24, 36
    angs = np.linspace(math.pi * 0.5, math.pi * 1.5, nth) if x_sign < 0 else np.linspace(-math.pi * 0.5, math.pi * 0.5, nth)
    rs = np.linspace(0.0, 1.0, nr)
    pts, cols, tris = [], [], []
    for u_r in rs:
        h_dome = height * ((1.0 - (u_r ** 2.0)) ** 0.72)
        for ang in angs:
            mx = u_r * rx * math.cos(ang)
            my = cy + u_r * ry * math.sin(ang)
            z_surf = max(0.0, cut_keepout_fn(mx, my, h_dome))
            sh = 0.84 + 0.22 * (1.0 - u_r) + 0.05 * math.sin(mx * 0.4 + my * 0.4)
            pts.append((mx, my, z_surf))
            cols.append((turf_rgb[0] * sh, turf_rgb[1] * sh, turf_rgb[2] * sh))
    for ir in range(nr - 1):
        for ia in range(nth - 1):
            a = ir * nth + ia
            b = (ir + 1) * nth + ia
            c = (ir + 1) * nth + ia + 1
            d = ir * nth + ia + 1
            tris.extend([(a, b, c), (a, c, d)])

    # Cutaway cross-section face at x = 0
    cut_start = len(pts)
    ys_cut = np.linspace(cy - ry, cy + ry, 52)
    for yv in ys_cut:
        u_r = min(1.0, abs(yv - cy) / ry)
        z_top = max(0.15, height * ((1.0 - (u_r ** 2.0)) ** 0.72))
        z_bot = min(z_top - 0.1, cut_keepout_fn(0.0, yv, 0.0))
        z_bot = max(0.0, z_bot)
        pts.append((0.0, yv, z_bot))
        cols.append(core_rgb)
        pts.append((0.0, yv, z_top))
        cols.append((core_rgb[0] * 1.12, core_rgb[1] * 1.12, core_rgb[2] * 1.12))
    for iy in range(len(ys_cut) - 1):
        a = cut_start + iy * 2
        b = cut_start + iy * 2 + 1
        c = cut_start + (iy + 1) * 2 + 1
        d = cut_start + (iy + 1) * 2
        if x_sign < 0:
            tris.extend([(a, b, c), (a, c, d)])
        else:
            tris.extend([(a, c, b), (a, d, c)])

    v = np.array(pts, dtype=np.float32)
    f = np.array(tris, dtype=np.uint32)
    return {
        "name": name,
        "layer": layer,
        "material": "turf_mound",
        "verts": v,
        "faces": f,
        "normals": compute_vertex_normals(v, f),
        "colors": np.clip(np.array(cols, dtype=np.float32), 0.0, 1.0),
    }


def build_maeshowe() -> List[Dict[str, object]]:
    """Maeshowe (Orkney): 11 m passage w/ blocking stone, 4.7x4.7x4.5 m square flagstone chamber, 3 raised cells, 35m clay mound."""
    rng = np.random.default_rng(2700)
    parts: List[Dict[str, object]] = []
    fl_col = CHAMBER_MATERIALS["devonian_flagstone"]["rgb"]

    vs, fs, cs = [], [], []
    # Passage: y in [0, 11.0], half-width 0.45 m, height 1.35 m
    # Recessed blocking stone alcove around y = 1.4..3.2 on left, blocking stone leaving gap above
    _append_box(vs, fs, cs, -0.95, -0.45, 0.0, 11.0, 0.0, 1.50, fl_col, rng=rng)
    _append_box(vs, fs, cs, 0.45, 0.95, 0.0, 11.0, 0.0, 1.50, fl_col, rng=rng)
    _append_box(vs, fs, cs, -0.95, 0.95, 0.0, 11.0, 1.35, 1.65, (0.42, 0.39, 0.34), rng=rng)
    # Recessed blocking stone near entrance leaving 18 cm acoustic top slot
    _append_box(vs, fs, cs, -0.68, -0.18, 1.8, 3.0, 0.0, 1.17, (0.52, 0.49, 0.44), rng=rng)

    # 4.7 x 4.7 x 4.5 m Square Chamber (x in [-2.35, 2.35], y in [11.0, 15.7], z in [0, 4.5])
    # South wall with passage opening
    _append_box(vs, fs, cs, -2.65, -0.45, 10.65, 11.05, 0.0, 2.90, fl_col, rng=rng)
    _append_box(vs, fs, cs, 0.45, 2.65, 10.65, 11.05, 0.0, 2.90, fl_col, rng=rng)
    _append_box(vs, fs, cs, -2.65, 2.65, 10.65, 11.05, 1.35, 2.90, fl_col, rng=rng)

    # West & East chamber walls with raised cell openings (y in [12.75, 13.95], z in [0.85, 1.95])
    for side_x0, side_x1 in [(-2.65, -2.35), (2.35, 2.65)]:
        _append_box(vs, fs, cs, side_x0, side_x1, 11.0, 12.75, 0.0, 2.90, fl_col, rng=rng)
        _append_box(vs, fs, cs, side_x0, side_x1, 13.95, 15.70, 0.0, 2.90, fl_col, rng=rng)
        _append_box(vs, fs, cs, side_x0, side_x1, 12.75, 13.95, 0.0, 0.85, fl_col, rng=rng)
        _append_box(vs, fs, cs, side_x0, side_x1, 12.75, 13.95, 1.95, 2.90, fl_col, rng=rng)

    # North wall with raised North cell opening (x in [-0.60, 0.60], z in [0.85, 1.95])
    _append_box(vs, fs, cs, -2.65, -0.60, 15.70, 16.05, 0.0, 2.90, fl_col, rng=rng)
    _append_box(vs, fs, cs, 0.60, 2.65, 15.70, 16.05, 0.0, 2.90, fl_col, rng=rng)
    _append_box(vs, fs, cs, -0.60, 0.60, 15.70, 16.05, 0.0, 0.85, fl_col, rng=rng)
    _append_box(vs, fs, cs, -0.60, 0.60, 15.70, 16.05, 1.95, 2.90, fl_col, rng=rng)

    # 3 Single-Slab Side Cells (West, East, North)
    cell_col = (0.50, 0.47, 0.42)
    # West cell (x in [-4.05, -2.65], y in [12.55, 14.15], z in [0.85, 2.05])
    _append_box(vs, fs, cs, -4.15, -2.65, 12.55, 14.15, 0.72, 0.85, cell_col)
    _append_box(vs, fs, cs, -4.15, -2.65, 12.55, 14.15, 1.95, 2.12, cell_col)
    _append_box(vs, fs, cs, -4.25, -4.05, 12.55, 14.15, 0.85, 1.95, cell_col)
    _append_box(vs, fs, cs, -4.15, -2.65, 12.40, 12.60, 0.85, 1.95, cell_col)
    _append_box(vs, fs, cs, -4.15, -2.65, 14.10, 14.30, 0.85, 1.95, cell_col)
    # East cell
    _append_box(vs, fs, cs, 2.65, 4.15, 12.55, 14.15, 0.72, 0.85, cell_col)
    _append_box(vs, fs, cs, 2.65, 4.15, 12.55, 14.15, 1.95, 2.12, cell_col)
    _append_box(vs, fs, cs, 4.05, 4.25, 12.55, 14.15, 0.85, 1.95, cell_col)
    _append_box(vs, fs, cs, 2.65, 4.15, 12.40, 12.60, 0.85, 1.95, cell_col)
    _append_box(vs, fs, cs, 2.65, 4.15, 14.10, 14.30, 0.85, 1.95, cell_col)
    # North cell
    _append_box(vs, fs, cs, -0.80, 0.80, 16.05, 17.55, 0.72, 0.85, cell_col)
    _append_box(vs, fs, cs, -0.80, 0.80, 16.05, 17.55, 1.95, 2.12, cell_col)
    _append_box(vs, fs, cs, -0.80, 0.80, 17.45, 17.65, 0.85, 1.95, cell_col)
    _append_box(vs, fs, cs, -0.95, -0.75, 16.05, 17.55, 0.85, 1.95, cell_col)
    _append_box(vs, fs, cs, 0.75, 0.95, 16.05, 17.55, 0.85, 1.95, cell_col)

    # 4 Tall Corner Standing Buttress Monoliths
    buttress_col = (0.55, 0.51, 0.45)
    for bx in (-2.12, 2.12):
        for by in (11.25, 15.45):
            _append_box(vs, fs, cs, bx - 0.22, bx + 0.22, by - 0.22, by + 0.22, 0.0, 3.35, buttress_col, rng=rng)

    # Stepped Flagstone Corbelled Vault (z = 2.90 -> 4.50 m, 8 clean square courses)
    for step in range(8):
        u = step / 8.0
        zlo = 2.90 + u * 1.60
        zhi = zlo + 0.21
        hx = 2.35 - u * 1.50
        thk = 0.45
        _append_box(vs, fs, cs, -hx - thk, hx + thk, 13.35 - hx - thk, 13.35 - hx, zlo, zhi, fl_col)
        _append_box(vs, fs, cs, -hx - thk, hx + thk, 13.35 + hx, 13.35 + hx + thk, zlo, zhi, fl_col)
        _append_box(vs, fs, cs, -hx - thk, -hx, 13.35 - hx, 13.35 + hx, zlo, zhi, fl_col)
        _append_box(vs, fs, cs, hx, hx + thk, 13.35 - hx, 13.35 + hx, zlo, zhi, fl_col)
    # Capstone
    _append_box(vs, fs, cs, -1.15, 1.15, 12.20, 14.50, 4.50, 4.78, buttress_col)
    parts.append(_merge_parts("maeshowe_stones", "interior", "devonian_flagstone", vs, fs, cs))

    # Floor slab
    vf, ff, cf = [], [], []
    _append_box(vf, ff, cf, -2.7, 2.7, -0.5, 16.0, -0.15, 0.0, CHAMBER_MATERIALS["compacted_earth_floor"]["rgb"], bevel=0.0)
    parts.append(_merge_parts("maeshowe_floor", "interior", "compacted_earth_floor", vf, ff, cf))

    # Clay-sealed 35 m x 7 m mound cutaway
    def m_keepout(x, y, h_dome):
        if y < 0.0:
            return 0.0
        if abs(x) < 3.0 and y < 17.8:
            if y < 10.8:
                return max(1.75, h_dome)
            return max(4.95, h_dome)
        return max(0.4, h_dome)

    parts.append(_build_split_mound("maeshowe_mound_west", "mound_west", 13.35, 17.5, 17.5, 7.0, m_keepout, -1.0, core_rgb=CHAMBER_MATERIALS["orkney_clay_seal"]["rgb"]))
    parts.append(_build_split_mound("maeshowe_mound_east", "mound_east", 13.35, 17.5, 17.5, 7.0, m_keepout, +1.0, core_rgb=CHAMBER_MATERIALS["orkney_clay_seal"]["rgb"]))
    return parts


def build_loughcrew_l() -> List[Dict[str, object]]:
    """Loughcrew Cairn L (Co. Meath): 6.4 m passage, 4.2x4.0x2.9 m chamber, toggleable 7-bay partition orthostats + pillar."""
    rng = np.random.default_rng(3300)
    parts: List[Dict[str, object]] = []
    st_col = CHAMBER_MATERIALS["greywacke_orthostat"]["rgb"]

    vs, fs, cs = [], [], []
    # Passage y in [0, 6.4], hw=0.45, h=1.50
    _append_box(vs, fs, cs, -0.85, -0.45, 0.0, 6.4, 0.0, 1.55, st_col, rng=rng)
    _append_box(vs, fs, cs, 0.45, 0.85, 0.0, 6.4, 0.0, 1.55, st_col, rng=rng)
    _append_box(vs, fs, cs, -0.95, 0.95, 0.0, 6.4, 1.50, 1.80, (0.38, 0.36, 0.32), rng=rng)

    # Outer polygonal ring of chamber orthostats (center (0, 8.4), radius ~2.1 m, h=2.0 m)
    n_wall = 14
    cy_c = 8.4
    for i in range(n_wall):
        ang = -math.pi * 0.5 + (i / n_wall) * 2.0 * math.pi
        if abs(ang + math.pi * 0.5) < 0.25:
            continue  # entrance gap
        wx = 2.10 * math.cos(ang)
        wy = cy_c + 2.00 * math.sin(ang)
        _append_box(vs, fs, cs, wx - 0.26, wx + 0.26, wy - 0.26, wy + 0.26, 0.0, 2.05, st_col, rng=rng)

    # Corbelled roof slabs rising 2.0 -> 2.95 m
    for s in range(6):
        u = s / 6.0
        zlo = 2.00 + u * 0.95
        zhi = zlo + 0.18
        r_in = 2.05 * (1.0 - 0.65 * u)
        r_out = r_in + 0.65
        n_seg = 20
        base = sum(len(v) for v in vs)
        pts, cols, tris = [], [], []
        for k in range(n_seg):
            th = (k / n_seg) * 2.0 * math.pi
            ca, sa = math.cos(th), math.sin(th)
            pts.extend([(r_in * ca, cy_c + r_in * sa, zlo), (r_out * ca, cy_c + r_out * sa, zlo), (r_out * ca, cy_c + r_out * sa, zhi), (r_in * ca, cy_c + r_in * sa, zhi)])
            cols.extend([(0.34, 0.32, 0.29)] * 4)
            kn = (k + 1) % n_seg
            b0, b1 = k * 4, kn * 4
            tris.extend([(b0, b0+1, b1+1), (b0, b1+1, b1), (b0+1, b0+2, b1+2), (b0+1, b1+2, b1+1), (b0+2, b0+3, b1+3), (b0+2, b1+3, b1+2), (b0+3, b0, b1), (b0+3, b1, b1+3)])
        vs.append(np.array(pts, dtype=np.float32))
        cs.append(np.array(cols, dtype=np.float32))
        fs.append(np.array(tris, dtype=np.uint32) + base)
    _append_box(vs, fs, cs, -0.85, 0.85, cy_c - 0.85, cy_c + 0.85, 2.95, 3.22, (0.44, 0.42, 0.38))
    parts.append(_merge_parts("loughcrew_stones", "interior", "greywacke_orthostat", vs, fs, cs))

    # Separate toggleable radial partition orthostats + famous eccentric pillar stone!
    vp, fp, cp = [], [], []
    p_col = CHAMBER_MATERIALS["partition_orthostat"]["rgb"]
    for ang_deg in (-145, -100, -52, 0, 52, 100, 145):
        ang = math.radians(ang_deg) + math.pi * 0.5
        # Radial slab pointing inward from r=2.0 to r=1.05
        xm = 1.52 * math.cos(ang)
        ym = cy_c + 1.48 * math.sin(ang)
        dx = 0.46 * abs(math.cos(ang)) + 0.10
        dy = 0.46 * abs(math.sin(ang)) + 0.10
        _append_box(vp, fp, cp, xm - dx, xm + dx, ym - dy, ym + dy, 0.0, 1.72, p_col, rng=rng)
    # Standing pillar stone (slightly East of center)
    _append_cylinder_or_frustum(vp, fp, cp, 0.65, 8.75, 0.0, 1.85, 0.19, 0.14, (0.68, 0.58, 0.40), n_seg=12)
    parts.append(_merge_parts("loughcrew_partitions", "partitions", "partition_orthostat", vp, fp, cp))

    vf, ff, cf = [], [], []
    _append_box(vf, ff, cf, -2.5, 2.5, -0.5, 11.2, -0.15, 0.0, CHAMBER_MATERIALS["compacted_earth_floor"]["rgb"], bevel=0.0)
    parts.append(_merge_parts("loughcrew_floor", "interior", "compacted_earth_floor", vf, ff, cf))

    def l_keepout(x, y, h_dome):
        if y < 0.0:
            return 0.0
        if abs(x) < 2.6 and y < 11.2:
            return max(1.90 if y < 6.4 else 3.35, h_dome)
        return max(0.3, h_dome)

    parts.append(_build_split_mound("loughcrew_mound_west", "mound_west", 8.4, 20.5, 20.5, 5.5, l_keepout, -1.0))
    parts.append(_build_split_mound("loughcrew_mound_east", "mound_east", 8.4, 20.5, 20.5, 5.5, l_keepout, +1.0))
    return parts


def build_waylands_smithy() -> List[Dict[str, object]]:
    """Wayland's Smithy (Oxfordshire): monumental sarsen facade, 5m passage, 1.5x1.5m cruciform arms in trapezoidal long barrow."""
    rng = np.random.default_rng(3500)
    parts: List[Dict[str, object]] = []
    sr_col = CHAMBER_MATERIALS["sarsen_stone"]["rgb"]

    vs, fs, cs = [], [], []
    # Front monumental sarsen facade flanking entrance at y=0
    for fx in (-2.5, -1.6, -0.95, 0.95, 1.6, 2.5):
        h_f = 2.85 if abs(fx) < 1.2 else 2.25
        _append_box(vs, fs, cs, fx - 0.30, fx + 0.30, -0.35, 0.15, 0.0, h_f, sr_col, rng=rng)
    # 5 m passage (y in [0, 5.0], hw=0.48, h=1.65)
    _append_box(vs, fs, cs, -0.90, -0.48, 0.0, 5.0, 0.0, 1.70, sr_col, rng=rng)
    _append_box(vs, fs, cs, 0.48, 0.90, 0.0, 5.0, 0.0, 1.70, sr_col, rng=rng)
    _append_box(vs, fs, cs, -1.0, 1.0, 0.0, 5.0, 1.65, 2.02, sr_col, rng=rng)

    # Opposing 1.5 x 1.5 m East & West arms (y in [5.0, 6.5], x in [-2.05, -0.55] and [0.55, 2.05])
    for sign_x in (-1.0, 1.0):
        x_in, x_out = (0.55 * sign_x, 2.05 * sign_x)
        x0, x1 = min(x_in, x_out), max(x_in, x_out)
        # Side walls & back stone of arm
        _append_box(vs, fs, cs, x0, x1, 4.65, 5.00, 0.0, 1.70, sr_col, rng=rng)
        _append_box(vs, fs, cs, x0, x1, 6.50, 6.85, 0.0, 1.70, sr_col, rng=rng)
        bx0, bx1 = (-2.40, -2.05) if sign_x < 0 else (2.05, 2.40)
        _append_box(vs, fs, cs, bx0, bx1, 4.85, 6.65, 0.0, 1.70, sr_col, rng=rng)
        _append_box(vs, fs, cs, x0 - 0.3, x1 + 0.3, 4.85, 6.65, 1.65, 2.05, sr_col, rng=rng)

    # North end chamber (y in [6.5, 8.2], x in [-0.70, 0.70])
    _append_box(vs, fs, cs, -1.05, -0.70, 6.5, 8.2, 0.0, 1.85, sr_col, rng=rng)
    _append_box(vs, fs, cs, 0.70, 1.05, 6.5, 8.2, 0.0, 1.85, sr_col, rng=rng)
    _append_box(vs, fs, cs, -1.05, 1.05, 8.2, 8.6, 0.0, 1.85, sr_col, rng=rng)
    _append_box(vs, fs, cs, -1.15, 1.15, 5.0, 8.5, 1.80, 2.20, sr_col, rng=rng)
    parts.append(_merge_parts("waylands_stones", "interior", "sarsen_stone", vs, fs, cs))

    vf, ff, cf = [], [], []
    _append_box(vf, ff, cf, -3.0, 3.0, -1.0, 9.0, -0.15, 0.0, CHAMBER_MATERIALS["compacted_earth_floor"]["rgb"], bevel=0.0)
    parts.append(_merge_parts("waylands_floor", "interior", "compacted_earth_floor", vf, ff, cf))

    def w_keepout(x, y, h_dome):
        if y < 0.0:
            return 0.0
        if abs(x) < 2.6 and y < 8.8:
            return max(2.28, h_dome)
        return max(0.3, h_dome)

    parts.append(_build_split_mound("waylands_mound_west", "mound_west", 14.0, 7.0, 16.0, 3.2, w_keepout, -1.0))
    parts.append(_build_split_mound("waylands_mound_east", "mound_east", 14.0, 7.0, 16.0, 3.2, w_keepout, +1.0))
    return parts


def build_chun_quoit() -> List[Dict[str, object]]:
    """Chun Quoit (Cornwall): 4 inward-leaning granite slabs forming a 1.5m box under a 3.3m domed mushroom capstone."""
    rng = np.random.default_rng(3550)
    parts: List[Dict[str, object]] = []
    gr_col = CHAMBER_MATERIALS["cornish_granite"]["rgb"]

    vs, fs, cs = [], [], []
    # 4 leaning orthostats enclosing ~1.5x1.5x1.5 m chamber around (0, 0, 0)
    _append_box(vs, fs, cs, -1.02, -0.75, -0.78, 0.78, 0.0, 1.52, gr_col, tilt_x=0.14, rng=rng)
    _append_box(vs, fs, cs, 0.75, 1.02, -0.78, 0.78, 0.0, 1.52, gr_col, tilt_x=-0.14, rng=rng)
    _append_box(vs, fs, cs, -0.78, 0.78, 0.75, 1.02, 0.0, 1.52, gr_col, tilt_y=-0.14, rng=rng)
    # Front slab leaves narrow portal entrance slot on right side
    _append_box(vs, fs, cs, -0.78, 0.25, -1.02, -0.75, 0.0, 1.52, gr_col, tilt_y=0.14, rng=rng)

    # Domed mushroom granite capstone (~3.3 m wide x 0.62 m thick) sitting at z=1.50
    nr, nth = 8, 28
    rs = np.linspace(0.0, 1.65, nr)
    ths = np.linspace(0.0, 2.0 * math.pi, nth, endpoint=False)
    base = sum(len(v) for v in vs)
    pts, cols, tris = [], [], []
    for ir, r in enumerate(rs):
        u = r / 1.65
        z_top = 2.12 - 0.38 * (u ** 2)
        z_bot = 1.48 + 0.14 * (u ** 2)
        for th in ths:
            pts.append((r * math.cos(th), r * math.sin(th), z_top))
            cols.append((gr_col[0] * (1.06 - 0.1 * u), gr_col[1] * (1.06 - 0.1 * u), gr_col[2] * (1.06 - 0.1 * u)))
        for th in ths:
            pts.append((r * math.cos(th), r * math.sin(th), z_bot))
            cols.append((gr_col[0] * 0.85, gr_col[1] * 0.85, gr_col[2] * 0.85))
    for ir in range(nr - 1):
        for ith in range(nth):
            ith_n = (ith + 1) % nth
            t0 = ir * 2 * nth + ith
            t1 = ir * 2 * nth + ith_n
            t2 = (ir + 1) * 2 * nth + ith_n
            t3 = (ir + 1) * 2 * nth + ith
            tris.extend([(t0, t1, t2), (t0, t2, t3)])
            b0 = ir * 2 * nth + nth + ith
            b1 = ir * 2 * nth + nth + ith_n
            b2 = (ir + 1) * 2 * nth + nth + ith_n
            b3 = (ir + 1) * 2 * nth + nth + ith
            tris.extend([(b0, b2, b1), (b0, b3, b2)])
    # Rim skirt
    ir_last = nr - 1
    for ith in range(nth):
        ith_n = (ith + 1) % nth
        top0 = ir_last * 2 * nth + ith
        top1 = ir_last * 2 * nth + ith_n
        bot0 = ir_last * 2 * nth + nth + ith
        bot1 = ir_last * 2 * nth + nth + ith_n
        tris.extend([(top0, bot0, bot1), (top0, bot1, top1)])

    vs.append(np.array(pts, dtype=np.float32))
    cs.append(np.clip(np.array(cols, dtype=np.float32), 0.0, 1.0))
    fs.append(np.array(tris, dtype=np.uint32) + base)
    parts.append(_merge_parts("chun_stones", "interior", "cornish_granite", vs, fs, cs))

    # Moorland base cairn ring apron
    vf, ff, cf = [], [], []
    _append_cylinder_or_frustum(vf, ff, cf, 0.0, 0.0, -0.18, 0.02, 5.2, 4.8, (0.25, 0.34, 0.21), n_seg=32)
    parts.append(_merge_parts("chun_turf", "interior", "boyne_terrain", vf, ff, cf))
    return parts


def build_carn_euny() -> List[Dict[str, object]]:
    """Carn Euny (Cornwall): circular 4.6 m corbelled beehive chamber (3.0 m high) + 9 m curved fogou passage."""
    rng = np.random.default_rng(400)
    parts: List[Dict[str, object]] = []
    gr_col = CHAMBER_MATERIALS["cornish_granite"]["rgb"]

    vs, fs, cs = [], [], []
    # Curved fogou passage y in [0, 8.5], slight gentle X arc
    for i in range(10):
        y0, y1 = i * 0.85, (i + 1) * 0.85
        xc0 = 0.65 * math.sin(y0 / 8.5 * math.pi)
        xc1 = 0.65 * math.sin(y1 / 8.5 * math.pi)
        xm = 0.5 * (xc0 + xc1)
        _append_box(vs, fs, cs, xm - 0.85, xm - 0.45, y0, y1, 0.0, 1.45, gr_col, rng=rng)
        _append_box(vs, fs, cs, xm + 0.45, xm + 0.85, y0, y1, 0.0, 1.45, gr_col, rng=rng)
        _append_box(vs, fs, cs, xm - 0.90, xm + 0.90, y0, y1, 1.40, 1.70, gr_col, rng=rng)

    # Circular corbelled beehive chamber (center (0, 10.8), radius 2.30 m -> 0.50 m at z=3.0 m)
    cy_b = 10.8
    n_seg = 24
    for step in range(12):
        u = step / 12.0
        zlo = u * 3.00
        zhi = zlo + 0.26
        r_in = 2.30 * (1.0 - 0.78 * (u ** 1.35))
        r_out = r_in + 0.55
        base = sum(len(v) for v in vs)
        pts, cols, tris = [], [], []
        for k in range(n_seg):
            th = (k / n_seg) * 2.0 * math.pi
            # Leave passage opening on South (-Y, angle ~ -pi/2) below z = 1.45 m
            if zlo < 1.45 and abs(math.atan2(math.sin(th + math.pi * 0.5), math.cos(th + math.pi * 0.5))) < 0.22:
                continue
            th2 = ((k + 1) / n_seg) * 2.0 * math.pi
            for rr, zz, sh in [(r_in, zlo, 0.88), (r_out, zlo, 0.94), (r_out, zhi, 1.0), (r_in, zhi, 0.96)]:
                pts.append((rr * math.cos(th), cy_b + rr * math.sin(th), zz))
                cols.append(tuple(c * sh for c in gr_col))
            for rr, zz, sh in [(r_in, zlo, 0.88), (r_out, zlo, 0.94), (r_out, zhi, 1.0), (r_in, zhi, 0.96)]:
                pts.append((rr * math.cos(th2), cy_b + rr * math.sin(th2), zz))
                cols.append(tuple(c * sh for c in gr_col))
            b = len(pts) - 8
            tris.extend([
                (b+0, b+1, b+5), (b+0, b+5, b+4),
                (b+1, b+2, b+6), (b+1, b+6, b+5),
                (b+2, b+3, b+7), (b+2, b+7, b+6),
                (b+3, b+0, b+4), (b+3, b+4, b+7),
                (b+0, b+3, b+2), (b+0, b+2, b+1),
                (b+4, b+5, b+6), (b+4, b+6, b+7),
            ])
        if pts:
            vs.append(np.array(pts, dtype=np.float32))
            cs.append(np.array(cols, dtype=np.float32))
            fs.append(np.array(tris, dtype=np.uint32) + base)
    _append_cylinder_or_frustum(vs, fs, cs, 0.0, cy_b, 2.95, 3.25, 0.85, 0.72, gr_col, n_seg=18)
    parts.append(_merge_parts("carn_stones", "interior", "cornish_granite", vs, fs, cs))

    vf, ff, cf = [], [], []
    _append_box(vf, ff, cf, -3.0, 3.0, -0.5, 13.8, -0.15, 0.0, CHAMBER_MATERIALS["compacted_earth_floor"]["rgb"], bevel=0.0)
    parts.append(_merge_parts("carn_floor", "interior", "compacted_earth_floor", vf, ff, cf))

    def c_keepout(x, y, h_dome):
        if y < 0.0:
            return 0.0
        if abs(x) < 2.9 and y < 13.6:
            return max(1.80 if y < 8.3 else 3.30, h_dome)
        return max(0.3, h_dome)

    parts.append(_build_split_mound("carn_mound_west", "mound_west", 10.8, 5.5, 6.2, 3.4, c_keepout, -1.0))
    parts.append(_build_split_mound("carn_mound_east", "mound_east", 10.8, 5.5, 6.2, 3.4, c_keepout, +1.0))
    return parts


def build_scale_figure() -> Dict[str, object]:
    """Stylized 1.75 m tall human reference figure centered at (0, 0, 0) standing on z=0."""
    v_list, f_list, c_list = [], [], []
    col = CHAMBER_MATERIALS["scale_human"]["rgb"]
    # Legs (0 -> 0.88 m)
    _append_cylinder_or_frustum(v_list, f_list, c_list, -0.11, 0.0, 0.0, 0.88, 0.075, 0.085, col, n_seg=12)
    _append_cylinder_or_frustum(v_list, f_list, c_list, 0.11, 0.0, 0.0, 0.88, 0.075, 0.085, col, n_seg=12)
    # Torso (0.86 -> 1.48 m)
    _append_cylinder_or_frustum(v_list, f_list, c_list, 0.0, 0.0, 0.86, 1.48, 0.19, 0.21, col, n_seg=16)
    # Head (1.51 -> 1.75 m)
    _append_cylinder_or_frustum(v_list, f_list, c_list, 0.0, 0.0, 1.50, 1.75, 0.105, 0.095, col, n_seg=16)
    return _merge_parts("scale_human_175cm", "scale_figure", "scale_human", v_list, f_list, c_list)


def build_and_export_all(chambers_root: str) -> Dict[str, object]:
    models_dir = os.path.join(chambers_root, "models")
    viewer_data_dir = os.path.join(chambers_root, "viewer", "data")
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(viewer_data_dir, exist_ok=True)

    monuments: Dict[str, List[Dict[str, object]]] = {
        "maeshowe": build_maeshowe(),
        "newgrange": [sm for sm in build_full_monument_mesh() if sm["name"] != "boyne_terrain"],
        "loughcrew_l": build_loughcrew_l(),
        "waylands_smithy": build_waylands_smithy(),
        "chun_quoit": build_chun_quoit(),
        "carn_euny": build_carn_euny(),
    }

    # Export individual downloadable Y-up .glb files (Newgrange uses existing ../newgrange/models/newgrange_monument.glb)
    glb_files = {
        "maeshowe": "maeshowe.glb",
        "loughcrew_l": "loughcrew_cairn_l.glb",
        "waylands_smithy": "waylands_smithy.glb",
        "chun_quoit": "chun_quoit.glb",
        "carn_euny": "carn_euny.glb",
    }
    for mid, fname in glb_files.items():
        write_glb(monuments[mid], os.path.join(models_dir, fname), CHAMBER_MATERIALS, convert_z_up_to_y_up=True)
        print(f"[Models] Exported {fname} ({len(monuments[mid])} submeshes)")

    # Write combined multi-monument WebGL2 binary bundle
    bin_buf = bytearray()
    manifest_sites: Dict[str, List[Dict[str, object]]] = {}

    def pack_mesh(sm: Dict[str, object]) -> Dict[str, object]:
        verts = np.asarray(sm["verts"], dtype=np.float32)
        faces = np.asarray(sm["faces"], dtype=np.uint32)
        norms = np.asarray(sm["normals"], dtype=np.float32)
        cols = np.asarray(sm["colors"], dtype=np.float32)

        def append_arr(arr: np.ndarray) -> Dict[str, int]:
            while len(bin_buf) % 4 != 0:
                bin_buf.append(0)
            off = len(bin_buf)
            raw = arr.tobytes()
            bin_buf.extend(raw)
            return {"byteOffset": off, "byteLength": len(raw)}

        mprops = CHAMBER_MATERIALS.get(str(sm.get("material", "greywacke_orthostat")), {})
        return {
            "name": sm["name"],
            "layer": sm.get("layer", "interior"),
            "indexCount": int(faces.size),
            "opacity": float(mprops.get("alpha_opacity", 1.0)),
            "emissive": bool(mprops.get("emissive") is not None),
            "pos": append_arr(verts),
            "norm": append_arr(norms),
            "col": append_arr(cols),
            "idx": append_arr(faces),
        }

    for mid, sms in monuments.items():
        manifest_sites[mid] = [pack_mesh(sm) for sm in sms]

    scale_mesh_meta = pack_mesh(build_scale_figure())

    with open(os.path.join(viewer_data_dir, "chambers_scene.bin"), "wb") as fb:
        fb.write(bin_buf)

    manifest = {
        "binaryFile": "chambers_scene.bin",
        "totalBytes": len(bin_buf),
        "scaleFigure": scale_mesh_meta,
        "scalePositions": {
            "maeshowe": [0.0, 13.35, 0.0],
            "newgrange": [0.0, 20.55, 1.95],
            "loughcrew_l": [-0.35, 8.20, 0.0],
            "waylands_smithy": [0.0, 5.75, 0.0],
            "chun_quoit": [0.0, 0.0, 0.0],
            "carn_euny": [0.0, 10.8, 0.0],
        },
        "sites": manifest_sites,
    }
    with open(os.path.join(viewer_data_dir, "chambers_manifest.json"), "w", encoding="utf-8") as fm:
        json.dump(manifest, fm, indent=2)
    print(f"[Models] Packed WebGL2 multi-monument bundle ({len(bin_buf)/1e6:.2f} MB)")
    return manifest


if __name__ == "__main__":
    build_and_export_all(os.path.abspath(os.path.join(THIS_DIR, "..")))
