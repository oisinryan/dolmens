"""
Newgrange 3D Parametric Mesh Generator
Builds two complementary, archaeologically faithful 3D assemblies:
  1. build_acoustic_interior_mesh():
     Strictly watertight, closed 2-manifold boundary of the subterranean air cavity
     (0 boundary edges, 0 non-manifold edges, outward-oriented positive enclosed volume),
     material-tagged per face for 3D acoustic ray-tracing & CAD/STL export.
  2. build_full_monument_mesh():
     Rich multi-layered architectural monument (orthostats L1-L22/R1-R21, stepped corbelled
     vault, roof-box, granite basins, curved white quartz & cobble wall, 97 kerbstones with
     carved triple-spiral Entrance Stone K1, split 85m cairn mound, Boyne Valley terrain,
     and Winter Solstice sunbeam).
"""

from __future__ import annotations

import math
from typing import Dict, List, Tuple

import numpy as np

from export_3d import check_watertight_manifold, compute_vertex_normals
from geometry_spec import (
    CAPSTONE_RADIUS,
    CAPSTONE_Z,
    CHAMBER_CORE_X_MAX,
    CHAMBER_CORE_X_MIN,
    CHAMBER_CORE_Y_MAX,
    CHAMBER_CORE_Y_MIN,
    CHAMBER_FLOOR_Z,
    EAST_RECESS,
    ENTRANCE_DOOR_LEN,
    ENTRANCE_DOOR_Z,
    MATERIAL_NAMES,
    MATERIALS,
    MOUND_CENTER_X,
    MOUND_CENTER_Y,
    MOUND_HEIGHT,
    MOUND_RADIUS,
    NORTH_RECESS,
    NUM_KERBSTONES,
    PASSAGE_LEN,
    ROOFBOX_SLIT_X_HALF,
    ROOFBOX_SLIT_Z_MAX,
    ROOFBOX_SLIT_Z_MIN,
    ROOFBOX_X_HALF,
    ROOFBOX_Z_MAX,
    ROOFBOX_Z_MIN,
    VAULT_SPRING_Z,
    VAULT_STEPS,
    WEST_RECESS,
    basin_elevation_grid,
    floor_z,
    passage_ceil_z,
    passage_half_width,
    smoothstep,
    vault_profile_at_z,
)

# ---------------------------------------------------------------------------
# Material Palette for Architectural Render & GLB / OBJ / WebGL2
# ---------------------------------------------------------------------------
ARCH_MATERIALS: Dict[str, Dict[str, object]] = {
    "greywacke_orthostat": {
        "rgb": (0.43, 0.40, 0.36),
        "roughness": 0.90,
        "metallic": 0.02,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "carved_megalith": {
        "rgb": (0.50, 0.47, 0.41),
        "roughness": 0.86,
        "metallic": 0.02,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "corbelled_vault": {
        "rgb": (0.37, 0.35, 0.32),
        "roughness": 0.92,
        "metallic": 0.02,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "granite_basin": {
        "rgb": (0.60, 0.58, 0.54),
        "roughness": 0.78,
        "metallic": 0.04,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "compacted_earth_floor": {
        "rgb": (0.31, 0.26, 0.21),
        "roughness": 0.95,
        "metallic": 0.00,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "roofbox_quartz": {
        "rgb": (0.85, 0.83, 0.79),
        "roughness": 0.76,
        "metallic": 0.02,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "quartz_facade": {
        "rgb": (0.89, 0.88, 0.85),
        "roughness": 0.74,
        "metallic": 0.02,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "dark_cobble": {
        "rgb": (0.20, 0.21, 0.23),
        "roughness": 0.78,
        "metallic": 0.04,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "turf_mound": {
        "rgb": (0.24, 0.37, 0.20),
        "roughness": 0.94,
        "metallic": 0.00,
        "alpha_opacity": 1.0,
        "double_sided": True,
    },
    "boyne_terrain": {
        "rgb": (0.22, 0.33, 0.19),
        "roughness": 0.96,
        "metallic": 0.00,
        "alpha_opacity": 1.0,
        "double_sided": False,
    },
    "solstice_beam": {
        "rgb": (1.00, 0.82, 0.34),
        "roughness": 0.20,
        "metallic": 0.00,
        "alpha_opacity": 0.34,
        "double_sided": True,
        "emissive": (0.95, 0.72, 0.24),
    },
    "entrance_portal": {
        "rgb": (0.14, 0.18, 0.26),
        "roughness": 0.50,
        "metallic": 0.0,
        "alpha_opacity": 0.28,
        "double_sided": True,
    },
    "roofbox_slit": {
        "rgb": (0.95, 0.76, 0.28),
        "roughness": 0.40,
        "metallic": 0.0,
        "alpha_opacity": 0.35,
        "double_sided": True,
    },
}


# ---------------------------------------------------------------------------
# Helper: Watertight Topological Mesh Builder
# ---------------------------------------------------------------------------
class _ManifoldBuilder:
    def __init__(self) -> None:
        self.vert_map: Dict[Tuple[int, int, int], int] = {}
        self.verts: List[Tuple[float, float, float]] = []
        self.faces: List[Tuple[int, int, int]] = []
        self.face_mats: List[str] = []
        self.pinned_mask: List[bool] = []

    def add_vertex(self, x: float, y: float, z: float, pinned: bool = False) -> int:
        key = (int(round(x * 1e5)), int(round(y * 1e5)), int(round(z * 1e5)))
        idx = self.vert_map.get(key)
        if idx is None:
            idx = len(self.verts)
            self.vert_map[key] = idx
            self.verts.append((float(x), float(y), float(z)))
            self.pinned_mask.append(pinned)
        elif pinned:
            self.pinned_mask[idx] = True
        return idx

    def add_tri(self, a: int, b: int, c: int, mat: str) -> None:
        if a == b or b == c or c == a:
            return
        self.faces.append((a, b, c))
        self.face_mats.append(mat)

    def add_quad(self, a: int, b: int, c: int, d: int, mat: str) -> None:
        self.add_tri(a, b, c, mat)
        self.add_tri(a, c, d, mat)


# ---------------------------------------------------------------------------
# 1. Strictly Watertight Closed 2-Manifold Acoustic Interior Mesh
# ---------------------------------------------------------------------------
def build_acoustic_interior_mesh() -> Dict[str, object]:
    """
    Build a strictly watertight, closed 2-manifold boundary mesh of the Newgrange
    air cavity (passage + entrance portal + roof-box + central chamber + West/East/North
    recesses + carved stone basins + 16-step corbelled vault + capstone).
    Outward normals point OUT of the enclosed air volume (positive signed volume).
    """
    mb = _ManifoldBuilder()

    # Exact grid breakpoints shared across all chamber core & recess portals
    X_CORE = np.array(
        [-1.45, -1.135, -0.82, -0.56, -0.28, 0.00, 0.28, 0.56, 0.82, 1.135, 1.45],
        dtype=np.float64,
    )
    Y_CORE = np.array(
        [18.95, 19.325, 19.70, 19.85, 20.225, 20.60, 20.975, 21.35, 21.55, 21.85, 22.15],
        dtype=np.float64,
    )
    Z_CORE = np.array(
        [1.95, 2.34, 2.73, 3.12, 3.51, 3.90, 4.30, 4.45, 4.65, 4.85, 5.05],
        dtype=np.float64,
    )
    # Portal index spans in (X_CORE, Y_CORE, Z_CORE)
    PASS_I = (3, 7)    # X_CORE[3..7] = [-0.56 .. +0.56] (4 cells)
    PASS_K = (0, 10)   # Z_CORE[0..10] = [1.95 .. 5.05] (10 cells)
    WEST_J = (3, 7)    # Y_CORE[3..7] = [19.85 .. 21.35] (4 cells)
    WEST_K = (0, 6)    # Z_CORE[0..6] = [1.95 .. 4.30] (6 cells)
    EAST_J = (2, 8)    # Y_CORE[2..8] = [19.70 .. 21.55] (6 cells)
    EAST_K = (0, 8)    # Z_CORE[0..8] = [1.95 .. 4.65] (8 cells)
    NORTH_I = (2, 8)   # X_CORE[2..8] = [-0.82 .. +0.82] (6 cells)
    NORTH_K = (0, 7)   # Z_CORE[0..7] = [1.95 .. 4.45] (7 cells)

    # A) Central Chamber Core Floor (z = 1.95, outward normal -Z)
    for i in range(len(X_CORE) - 1):
        for j in range(len(Y_CORE) - 1):
            a = mb.add_vertex(X_CORE[i], Y_CORE[j], CHAMBER_FLOOR_Z)
            b = mb.add_vertex(X_CORE[i], Y_CORE[j + 1], CHAMBER_FLOOR_Z)
            c = mb.add_vertex(X_CORE[i + 1], Y_CORE[j + 1], CHAMBER_FLOOR_Z)
            d = mb.add_vertex(X_CORE[i + 1], Y_CORE[j], CHAMBER_FLOOR_Z)
            mb.add_quad(a, b, c, d, "compacted_earth_floor")

    # B) Central Chamber Core Walls (with portal cutouts)
    # South Wall (y = 18.95, outward normal -Y)
    for i in range(len(X_CORE) - 1):
        for k in range(len(Z_CORE) - 1):
            if PASS_I[0] <= i < PASS_I[1] and PASS_K[0] <= k < PASS_K[1]:
                continue
            a = mb.add_vertex(X_CORE[i], CHAMBER_CORE_Y_MIN, Z_CORE[k])
            b = mb.add_vertex(X_CORE[i + 1], CHAMBER_CORE_Y_MIN, Z_CORE[k])
            c = mb.add_vertex(X_CORE[i + 1], CHAMBER_CORE_Y_MIN, Z_CORE[k + 1])
            d = mb.add_vertex(X_CORE[i], CHAMBER_CORE_Y_MIN, Z_CORE[k + 1])
            mb.add_quad(a, b, c, d, "greywacke_orthostat")

    # North Wall (y = 22.15, outward normal +Y)
    for i in range(len(X_CORE) - 1):
        for k in range(len(Z_CORE) - 1):
            if NORTH_I[0] <= i < NORTH_I[1] and NORTH_K[0] <= k < NORTH_K[1]:
                continue
            a = mb.add_vertex(X_CORE[i], CHAMBER_CORE_Y_MAX, Z_CORE[k])
            b = mb.add_vertex(X_CORE[i], CHAMBER_CORE_Y_MAX, Z_CORE[k + 1])
            c = mb.add_vertex(X_CORE[i + 1], CHAMBER_CORE_Y_MAX, Z_CORE[k + 1])
            d = mb.add_vertex(X_CORE[i + 1], CHAMBER_CORE_Y_MAX, Z_CORE[k])
            mb.add_quad(a, b, c, d, "greywacke_orthostat")

    # West Wall (x = -1.45, outward normal -X)
    for j in range(len(Y_CORE) - 1):
        for k in range(len(Z_CORE) - 1):
            if WEST_J[0] <= j < WEST_J[1] and WEST_K[0] <= k < WEST_K[1]:
                continue
            a = mb.add_vertex(CHAMBER_CORE_X_MIN, Y_CORE[j], Z_CORE[k])
            b = mb.add_vertex(CHAMBER_CORE_X_MIN, Y_CORE[j], Z_CORE[k + 1])
            c = mb.add_vertex(CHAMBER_CORE_X_MIN, Y_CORE[j + 1], Z_CORE[k + 1])
            d = mb.add_vertex(CHAMBER_CORE_X_MIN, Y_CORE[j + 1], Z_CORE[k])
            mb.add_quad(a, b, c, d, "greywacke_orthostat")

    # East Wall (x = +1.45, outward normal +X)
    for j in range(len(Y_CORE) - 1):
        for k in range(len(Z_CORE) - 1):
            if EAST_J[0] <= j < EAST_J[1] and EAST_K[0] <= k < EAST_K[1]:
                continue
            a = mb.add_vertex(CHAMBER_CORE_X_MAX, Y_CORE[j], Z_CORE[k])
            b = mb.add_vertex(CHAMBER_CORE_X_MAX, Y_CORE[j + 1], Z_CORE[k])
            c = mb.add_vertex(CHAMBER_CORE_X_MAX, Y_CORE[j + 1], Z_CORE[k + 1])
            d = mb.add_vertex(CHAMBER_CORE_X_MAX, Y_CORE[j], Z_CORE[k + 1])
            mb.add_quad(a, b, c, d, "greywacke_orthostat")

    # C) Three Cruciform Recesses (with sculpted Granite Basin floor elevations)
    def build_recess_box(
        x_grid: np.ndarray,
        y_grid: np.ndarray,
        z_grid: np.ndarray,
        open_side: str,
    ) -> None:
        nx, ny, nz = len(x_grid), len(y_grid), len(z_grid)

        def floor_pt(ix: int, iy: int) -> float:
            xv = float(x_grid[ix])
            yv = float(y_grid[iy])
            # Keep portal seam strictly flush at CHAMBER_FLOOR_Z
            if open_side == "east" and ix == 0:
                return CHAMBER_FLOOR_Z
            if open_side == "west" and ix == nx - 1:
                return CHAMBER_FLOOR_Z
            if open_side == "north" and iy == 0:
                return CHAMBER_FLOOR_Z
            z_add, _ = basin_elevation_grid(np.array([xv]), np.array([yv]))
            return CHAMBER_FLOOR_Z + float(z_add[0])

        def pt(ix: int, iy: int, iz: int) -> int:
            z_val = floor_pt(ix, iy) if iz == 0 else float(z_grid[iz])
            return mb.add_vertex(float(x_grid[ix]), float(y_grid[iy]), z_val)

        # Floor (iz = 0, outward -Z) & Ceiling (iz = nz-1, outward +Z)
        for ix in range(nx - 1):
            for iy in range(ny - 1):
                xm = 0.5 * (x_grid[ix] + x_grid[ix + 1])
                ym = 0.5 * (y_grid[iy] + y_grid[iy + 1])
                _, is_b = basin_elevation_grid(np.array([xm]), np.array([ym]))
                fmat = "granite_basin" if bool(is_b[0]) else "compacted_earth_floor"
                mb.add_quad(
                    pt(ix, iy, 0), pt(ix, iy + 1, 0), pt(ix + 1, iy + 1, 0), pt(ix + 1, iy, 0), fmat
                )
                mb.add_quad(
                    pt(ix, iy, nz - 1),
                    pt(ix + 1, iy, nz - 1),
                    pt(ix + 1, iy + 1, nz - 1),
                    pt(ix, iy + 1, nz - 1),
                    "corbelled_vault",
                )

        # South wall (iy = 0, outward -Y) unless open_side == "north"
        if open_side != "north":
            for ix in range(nx - 1):
                for iz in range(nz - 1):
                    mb.add_quad(
                        pt(ix, 0, iz), pt(ix + 1, 0, iz), pt(ix + 1, 0, iz + 1), pt(ix, 0, iz + 1), "greywacke_orthostat"
                    )
        # North wall (iy = ny-1, outward +Y)
        for ix in range(nx - 1):
            for iz in range(nz - 1):
                mb.add_quad(
                    pt(ix, ny - 1, iz),
                    pt(ix, ny - 1, iz + 1),
                    pt(ix + 1, ny - 1, iz + 1),
                    pt(ix + 1, ny - 1, iz),
                    "greywacke_orthostat",
                )
        # West wall (ix = 0, outward -X) unless open_side == "east"
        if open_side != "east":
            for iy in range(ny - 1):
                for iz in range(nz - 1):
                    mb.add_quad(
                        pt(0, iy, iz), pt(0, iy, iz + 1), pt(0, iy + 1, iz + 1), pt(0, iy + 1, iz), "greywacke_orthostat"
                    )
        # East wall (ix = nx-1, outward +X) unless open_side == "west"
        if open_side != "west":
            for iy in range(ny - 1):
                for iz in range(nz - 1):
                    mb.add_quad(
                        pt(nx - 1, iy, iz),
                        pt(nx - 1, iy + 1, iz),
                        pt(nx - 1, iy + 1, iz + 1),
                        pt(nx - 1, iy, iz + 1),
                        "greywacke_orthostat",
                    )

    # West Recess (x in [-3.00, -1.45])
    build_recess_box(
        np.linspace(WEST_RECESS["x_min"], WEST_RECESS["x_max"], 8),
        Y_CORE[WEST_J[0] : WEST_J[1] + 1],
        Z_CORE[WEST_K[0] : WEST_K[1] + 1],
        open_side="west",
    )
    # East Recess (x in [1.45, 3.55])
    build_recess_box(
        np.linspace(EAST_RECESS["x_min"], EAST_RECESS["x_max"], 10),
        Y_CORE[EAST_J[0] : EAST_J[1] + 1],
        Z_CORE[EAST_K[0] : EAST_K[1] + 1],
        open_side="east",
    )
    # North Recess (y in [22.15, 24.20])
    build_recess_box(
        X_CORE[NORTH_I[0] : NORTH_I[1] + 1],
        np.linspace(NORTH_RECESS["y_min"], NORTH_RECESS["y_max"], 10),
        Z_CORE[NORTH_K[0] : NORTH_K[1] + 1],
        open_side="north",
    )

    # D) Stepped Corbelled Vault (z = 5.05 -> 7.95, 16 stepped courses)
    # Base perimeter loop matches X_CORE & Y_CORE edges CCW around (0, 20.55)
    base_loop: List[Tuple[float, float]] = []
    for i in range(len(X_CORE) - 1):
        base_loop.append((float(X_CORE[i]), CHAMBER_CORE_Y_MIN))
    for j in range(len(Y_CORE) - 1):
        base_loop.append((CHAMBER_CORE_X_MAX, float(Y_CORE[j])))
    for i in range(len(X_CORE) - 1, 0, -1):
        base_loop.append((float(X_CORE[i]), CHAMBER_CORE_Y_MAX))
    for j in range(len(Y_CORE) - 1, 0, -1):
        base_loop.append((CHAMBER_CORE_X_MIN, float(Y_CORE[j])))

    N_ring = len(base_loop)
    yc_chamber = 0.5 * (CHAMBER_CORE_Y_MIN + CHAMBER_CORE_Y_MAX)
    base_angles = [math.atan2((py - yc_chamber) / 1.60, px / 1.45) for px, py in base_loop]

    def vault_ring_coords(z_val: float) -> List[Tuple[float, float, float]]:
        hx, hy, p_exp = vault_profile_at_z(z_val)
        pts = []
        for theta in base_angles:
            ca, sa = math.cos(theta), math.sin(theta)
            denom = (abs(ca) ** p_exp + abs(sa) ** p_exp) ** (1.0 / p_exp)
            pts.append((hx * ca / denom, yc_chamber + hy * sa / denom, z_val))
        return pts

    # Ring 0 uses the exact base_loop coordinates at VAULT_SPRING_Z
    prev_ring = [mb.add_vertex(px, py, VAULT_SPRING_Z) for px, py in base_loop]
    z_levels = np.linspace(VAULT_SPRING_Z, CAPSTONE_Z, VAULT_STEPS + 1)

    for s in range(VAULT_STEPS):
        z_lo = float(z_levels[s])
        z_hi = float(z_levels[s + 1])
        # First step slightly inward (corbel overhang) at z_lo (skip on step 0 so base wall meets flush,
        # or overhang cleanly on each course s >= 1)
        if s > 0:
            overhang_coords = vault_ring_coords(z_lo)
            overhang_ring = [mb.add_vertex(x, y, z) for x, y, z in overhang_coords]
            for m in range(N_ring):
                mn = (m + 1) % N_ring
                mb.add_quad(prev_ring[m], prev_ring[mn], overhang_ring[mn], overhang_ring[m], "corbelled_vault")
            prev_ring = overhang_ring

        # Vertical riser to z_hi using same XY radius as z_lo (creates authentic stepped corbel!)
        if s == 0:
            riser_coords = [(px, py, z_hi) for px, py in base_loop]
        else:
            riser_coords = [(px, py, z_hi) for px, py, _ in vault_ring_coords(z_lo)]
        riser_ring = [mb.add_vertex(x, y, z) for x, y, z in riser_coords]
        for m in range(N_ring):
            mn = (m + 1) % N_ring
            mb.add_quad(prev_ring[m], prev_ring[mn], riser_ring[mn], riser_ring[m], "corbelled_vault")
        prev_ring = riser_ring

    # Final inward chamfer to capstone ring & flat capstone closure at CAPSTONE_Z
    cap_ring = [mb.add_vertex(x, y, z) for x, y, z in vault_ring_coords(CAPSTONE_Z)]
    for m in range(N_ring):
        mn = (m + 1) % N_ring
        mb.add_quad(prev_ring[m], prev_ring[mn], cap_ring[mn], cap_ring[m], "corbelled_vault")

    cap_center = mb.add_vertex(0.0, yc_chamber, CAPSTONE_Z)
    for m in range(N_ring):
        mn = (m + 1) % N_ring
        mb.add_tri(cap_center, cap_ring[m], cap_ring[mn], "corbelled_vault")

    # E) Passage (y = 1.50 -> 18.95) + Entrance Doorway (0.0 -> 1.50) + Roof-Box (0.0 -> 1.50)
    # Cross-section vertical indices k = 0..10 and horizontal indices i = 0..4
    fz_150 = float(floor_z(ENTRANCE_DOOR_LEN))
    Z_150 = np.array(
        [
            fz_150,
            fz_150 + (ENTRANCE_DOOR_Z - fz_150) * (1.0 / 6.0),
            fz_150 + (ENTRANCE_DOOR_Z - fz_150) * (2.0 / 6.0),
            fz_150 + (ENTRANCE_DOOR_Z - fz_150) * (3.0 / 6.0),
            fz_150 + (ENTRANCE_DOOR_Z - fz_150) * (4.0 / 6.0),
            fz_150 + (ENTRANCE_DOOR_Z - fz_150) * (5.0 / 6.0),
            ENTRANCE_DOOR_Z,       # k=6: 1.55 m (Doorway top)
            ROOFBOX_Z_MIN,         # k=7: 1.90 m (Roof-box bottom)
            ROOFBOX_SLIT_Z_MIN,    # k=8: 2.16 m (Slit bottom)
            ROOFBOX_SLIT_Z_MAX,    # k=9: 2.42 m (Slit top)
            ROOFBOX_Z_MAX,         # k=10: 2.55 m (Roof-box top)
        ],
        dtype=np.float64,
    )
    t_150 = (Z_150 - Z_150[0]) / (Z_150[-1] - Z_150[0])
    t_core = (Z_CORE - Z_CORE[0]) / (Z_CORE[-1] - Z_CORE[0])
    X_PASS_PORTAL = X_CORE[PASS_I[0] : PASS_I[1] + 1]  # [-0.56, -0.28, 0.0, 0.28, 0.56]
    t_x_portal = X_PASS_PORTAL / 0.56  # [-1.0, -0.5, 0.0, 0.5, 1.0]

    def passage_ring_grid(y_val: float) -> Tuple[np.ndarray, np.ndarray]:
        """Return (5, 11) X and Z coordinates for passage cross-section at y_val in [1.50, 18.95]."""
        u = float(smoothstep(ENTRANCE_DOOR_LEN, PASSAGE_LEN, y_val))
        fz_y = float(floor_z(y_val))
        cz_y = float(passage_ceil_z(y_val))
        tk = (1.0 - u) * t_150 + u * t_core
        z_col = fz_y + tk * (cz_y - fz_y)
        # Ensure exact endpoints at y = 1.50 and y = 18.95
        if abs(y_val - ENTRANCE_DOOR_LEN) < 1e-6:
            z_col = Z_150.copy()
        elif abs(y_val - PASSAGE_LEN) < 1e-6:
            z_col = Z_CORE.copy()

        # Half-width per k level
        x_mat = np.zeros((5, 11), dtype=np.float64)
        z_mat = np.zeros((5, 11), dtype=np.float64)
        for k in range(11):
            zk = float(z_col[k])
            if abs(y_val - PASSAGE_LEN) < 1e-6:
                hw = 0.56
            elif abs(y_val - ENTRANCE_DOOR_LEN) < 1e-6:
                # Smooth match to Roof-Box width 0.50 m
                hw = ROOFBOX_X_HALF if k >= 7 else float(passage_half_width(y_val, zk - fz_y))
            else:
                hw = float(passage_half_width(y_val, zk - fz_y))
            x_mat[:, k] = t_x_portal * hw
            z_mat[:, k] = zk
        return x_mat, z_mat

    y_passage = np.linspace(ENTRANCE_DOOR_LEN, PASSAGE_LEN, 56)

    def add_tube_segment(
        xA: np.ndarray,
        zA: np.ndarray,
        yA: float,
        xB: np.ndarray,
        zB: np.ndarray,
        yB: float,
        k_range: range,
        ceil_mat: str = "greywacke_orthostat",
        wall_mat: str = "greywacke_orthostat",
        floor_mat: str = "compacted_earth_floor",
    ) -> None:
        """Connect cross-section ring at yA to ring at yB (yA < yB) across k_range."""
        k0, k1 = k_range.start, k_range.stop - 1
        # Floor (k = k0, outward -Z) & Ceiling (k = k1, outward +Z)
        for i in range(4):
            # Floor: (i, yA) -> (i, yB) -> (i+1, yB) -> (i+1, yA)
            mb.add_quad(
                mb.add_vertex(xA[i, k0], yA, zA[i, k0]),
                mb.add_vertex(xB[i, k0], yB, zB[i, k0]),
                mb.add_vertex(xB[i + 1, k0], yB, zB[i + 1, k0]),
                mb.add_vertex(xA[i + 1, k0], yA, zA[i + 1, k0]),
                floor_mat,
            )
            # Ceiling: (i, yA) -> (i+1, yA) -> (i+1, yB) -> (i, yB)
            mb.add_quad(
                mb.add_vertex(xA[i, k1], yA, zA[i, k1]),
                mb.add_vertex(xA[i + 1, k1], yA, zA[i + 1, k1]),
                mb.add_vertex(xB[i + 1, k1], yB, zB[i + 1, k1]),
                mb.add_vertex(xB[i, k1], yB, zB[i, k1]),
                ceil_mat,
            )
        # West Wall (i = 0, outward -X) & East Wall (i = 4, outward +X)
        for k in range(k0, k1):
            mb.add_quad(
                mb.add_vertex(xA[0, k], yA, zA[0, k]),
                mb.add_vertex(xA[0, k + 1], yA, zA[0, k + 1]),
                mb.add_vertex(xB[0, k + 1], yB, zB[0, k + 1]),
                mb.add_vertex(xB[0, k], yB, zB[0, k]),
                wall_mat,
            )
            mb.add_quad(
                mb.add_vertex(xA[4, k], yA, zA[4, k]),
                mb.add_vertex(xB[4, k], yB, zB[4, k]),
                mb.add_vertex(xB[4, k + 1], yB, zB[4, k + 1]),
                mb.add_vertex(xA[4, k + 1], yA, zA[4, k + 1]),
                wall_mat,
            )

    prev_x, prev_z = passage_ring_grid(float(y_passage[0]))
    for idx in range(len(y_passage) - 1):
        yA = float(y_passage[idx])
        yB = float(y_passage[idx + 1])
        cur_x, cur_z = passage_ring_grid(yB)
        cmat = "corbelled_vault" if yB > 14.0 else "greywacke_orthostat"
        add_tube_segment(prev_x, prev_z, yA, cur_x, cur_z, yB, range(0, 11), ceil_mat=cmat)
        prev_x, prev_z = cur_x, cur_z

    # Split at y = 1.50 into:
    # 1) Middle solid divider strip k in [6..7] (z in [1.55, 1.90]) capped at y=1.50 (-Y outward)
    x150, z150 = passage_ring_grid(ENTRANCE_DOOR_LEN)
    for i in range(4):
        mb.add_quad(
            mb.add_vertex(x150[i, 6], ENTRANCE_DOOR_LEN, z150[i, 6]),
            mb.add_vertex(x150[i + 1, 6], ENTRANCE_DOOR_LEN, z150[i + 1, 6]),
            mb.add_vertex(x150[i + 1, 7], ENTRANCE_DOOR_LEN, z150[i + 1, 7]),
            mb.add_vertex(x150[i, 7], ENTRANCE_DOOR_LEN, z150[i, 7]),
            "roofbox_quartz",
        )

    # 2) Entrance Doorway (y = 0.0 -> 1.50, k = 0..6)
    y_door = np.linspace(0.0, ENTRANCE_DOOR_LEN, 7)

    def door_ring(yv: float) -> Tuple[np.ndarray, np.ndarray]:
        u = float(smoothstep(0.0, ENTRANCE_DOOR_LEN, yv))
        fz_y = float(floor_z(yv))
        hw = (1.0 - u) * 0.48 + u * float(passage_half_width(ENTRANCE_DOOR_LEN, 0.8))
        xm = np.zeros((5, 7), dtype=np.float64)
        zm = np.zeros((5, 7), dtype=np.float64)
        z_col = np.linspace(fz_y, ENTRANCE_DOOR_Z, 7)
        if abs(yv - ENTRANCE_DOOR_LEN) < 1e-6:
            xm[:, :] = x150[:, :7]
            zm[:, :] = z150[:, :7]
        else:
            for k in range(7):
                xm[:, k] = t_x_portal * hw
                zm[:, k] = z_col[k]
        return xm, zm

    dx_prev, dz_prev = door_ring(0.0)
    for idx in range(len(y_door) - 1):
        dx_cur, dz_cur = door_ring(float(y_door[idx + 1]))
        add_tube_segment(dx_prev, dz_prev, float(y_door[idx]), dx_cur, dz_cur, float(y_door[idx + 1]), range(0, 7))
        dx_prev, dz_prev = dx_cur, dz_cur

    # Cap Entrance Portal at y = 0.0 (outward -Y)
    dx0, dz0 = door_ring(0.0)
    for i in range(4):
        for k in range(6):
            mb.add_quad(
                mb.add_vertex(dx0[i, k], 0.0, dz0[i, k], pinned=True),
                mb.add_vertex(dx0[i + 1, k], 0.0, dz0[i + 1, k], pinned=True),
                mb.add_vertex(dx0[i + 1, k + 1], 0.0, dz0[i + 1, k + 1], pinned=True),
                mb.add_vertex(dx0[i, k + 1], 0.0, dz0[i, k + 1], pinned=True),
                "entrance_portal",
            )

    # 3) Roof-Box (y = 0.0 -> 1.50, k = 7..10 -> relative 0..3)
    y_rb = np.linspace(0.0, ENTRANCE_DOOR_LEN, 7)

    def rb_ring(yv: float) -> Tuple[np.ndarray, np.ndarray]:
        xm = np.zeros((5, 4), dtype=np.float64)
        zm = np.zeros((5, 4), dtype=np.float64)
        z_col = Z_150[7:11]
        if abs(yv - ENTRANCE_DOOR_LEN) < 1e-6:
            xm[:, :] = x150[:, 7:11]
            zm[:, :] = z150[:, 7:11]
        else:
            x_slit = np.array([-ROOFBOX_X_HALF, -ROOFBOX_SLIT_X_HALF, 0.0, ROOFBOX_SLIT_X_HALF, ROOFBOX_X_HALF])
            for k in range(4):
                xm[:, k] = x_slit if yv < 0.1 else t_x_portal * ROOFBOX_X_HALF
                zm[:, k] = z_col[k]
        return xm, zm

    rx_prev, rz_prev = rb_ring(0.0)
    for idx in range(len(y_rb) - 1):
        rx_cur, rz_cur = rb_ring(float(y_rb[idx + 1]))
        add_tube_segment(
            rx_prev,
            rz_prev,
            float(y_rb[idx]),
            rx_cur,
            rz_cur,
            float(y_rb[idx + 1]),
            range(0, 4),
            ceil_mat="roofbox_quartz",
            wall_mat="roofbox_quartz",
            floor_mat="roofbox_quartz",
        )
        rx_prev, rz_prev = rx_cur, rz_cur

    # Cap Roof-Box front at y = 0.0 (k=1..2 and i=1..3 is slit; rest is quartz shutter)
    rx0, rz0 = rb_ring(0.0)
    for i in range(4):
        for k in range(3):
            is_slit = (k == 1) and (1 <= i <= 2)
            mat = "roofbox_slit" if is_slit else "roofbox_quartz"
            mb.add_quad(
                mb.add_vertex(rx0[i, k], 0.0, rz0[i, k], pinned=True),
                mb.add_vertex(rx0[i + 1, k], 0.0, rz0[i + 1, k], pinned=True),
                mb.add_vertex(rx0[i + 1, k + 1], 0.0, rz0[i + 1, k + 1], pinned=True),
                mb.add_vertex(rx0[i, k + 1], 0.0, rz0[i, k + 1], pinned=True),
                mat,
            )

    verts = np.array(mb.verts, dtype=np.float64)
    faces = np.array(mb.faces, dtype=np.int32)
    face_mats = mb.face_mats

    # Apply subtle megalithic surface irregularity (zero on pinned y=0 portals and floor)
    norms = compute_vertex_normals(verts, faces).astype(np.float64)
    disp = (
        0.014 * np.sin(verts[:, 1] * 3.1 + verts[:, 2] * 2.2)
        + 0.010 * np.cos(verts[:, 0] * 4.7 - verts[:, 1] * 1.9)
    )
    # Keep floor, basins, portal thresholds, and corners clean
    pin_arr = np.array(mb.pinned_mask, dtype=bool)
    floor_band = verts[:, 2] <= floor_z(verts[:, 1]) + 0.05
    disp[pin_arr | floor_band] = 0.0
    verts = verts + norms * disp[:, None]

    # Verify strict 2-manifold watertightness & positive enclosed volume
    stats = check_watertight_manifold(verts, faces)
    if not stats["is_watertight_manifold"]:
        raise RuntimeError(f"Acoustic interior mesh failed watertight check: {stats}")

    return {
        "name": "newgrange_acoustic_interior",
        "layer": "acoustic_cavity",
        "verts": verts.astype(np.float32),
        "faces": faces.astype(np.uint32),
        "normals": compute_vertex_normals(verts, faces),
        "face_materials": face_mats,
        "material": "greywacke_orthostat",
        "manifold_stats": stats,
    }


# ---------------------------------------------------------------------------
# 2. Full Architectural Monument Generator
# ---------------------------------------------------------------------------
def _append_box(
    v_list: List[np.ndarray],
    f_list: List[np.ndarray],
    c_list: List[np.ndarray],
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z0: float,
    z1: float,
    rgb: Tuple[float, float, float],
    bevel: float = 0.025,
    rng: np.random.Generator | None = None,
    tilt_x: float = 0.0,
    tilt_y: float = 0.0,
    carve_spiral: bool = False,
    spiral_face: str = "inner_x",
) -> None:
    """Create a finely subdivided, chamfered megalithic block with optional carved spiral relief."""
    nx, ny, nz = (12 if carve_spiral else 3), (12 if carve_spiral else 3), (12 if carve_spiral else 4)
    xs = np.linspace(x0, x1, nx + 1)
    ys = np.linspace(y0, y1, ny + 1)
    zs = np.linspace(z0, z1, nz + 1)
    cx, cy, cz = 0.5 * (x0 + x1), 0.5 * (y0 + y1), 0.5 * (z0 + z1)
    hx, hy, hz = max(0.05, 0.5 * (x1 - x0)), max(0.05, 0.5 * (y1 - y0)), max(0.05, 0.5 * (z1 - z0))

    base_idx = sum(len(v) for v in v_list)
    pts: List[Tuple[float, float, float]] = []
    cols: List[Tuple[float, float, float]] = []
    tris: List[Tuple[int, int, int]] = []

    def add_grid_face(u_vals, v_vals, map_fn, flip: bool = False):
        start = len(pts)
        nu, nv = len(u_vals), len(v_vals)
        for iu, u in enumerate(u_vals):
            for iv, v in enumerate(v_vals):
                px, py, pz, shade = map_fn(u, v)
                # Chamfer edges slightly
                dx = abs(px - cx) / hx
                dy = abs(py - cy) / hy
                dz = abs(pz - cz) / hz
                edge_dist = max(0.0, (dx + dy + dz - 2.35) * bevel)
                px -= math.copysign(min(edge_dist, hx * 0.25), px - cx)
                py -= math.copysign(min(edge_dist, hy * 0.25), py - cy)
                pz -= math.copysign(min(edge_dist, hz * 0.25), pz - cz)
                # Subtle organic stone irregularity
                if rng is not None:
                    jit = 0.012 * math.sin(px * 7.3 + py * 5.1 + pz * 4.7)
                    px += jit
                    py += 0.010 * math.cos(py * 6.2 + pz * 3.9)
                # Apply orthostat lean
                dz_rel = pz - z0
                px += tilt_x * dz_rel
                py += tilt_y * dz_rel
                pts.append((px, py, pz))
                cols.append((rgb[0] * shade, rgb[1] * shade, rgb[2] * shade))
        for iu in range(nu - 1):
            for iv in range(nv - 1):
                a = start + iu * nv + iv
                b = start + (iu + 1) * nv + iv
                c = start + (iu + 1) * nv + (iv + 1)
                d = start + iu * nv + (iv + 1)
                if not flip:
                    tris.append((a, b, c))
                    tris.append((a, c, d))
                else:
                    tris.append((a, c, b))
                    tris.append((a, d, c))

    def relief(u_norm: float, v_norm: float) -> Tuple[float, float]:
        if not carve_spiral:
            return 0.0, 1.0
        # Triple-spiral / lozenge megalithic motif
        centers = [(-0.42, 0.10), (0.42, 0.10), (0.0, -0.35)]
        groove = 0.0
        for scx, scy in centers:
            r = math.hypot(u_norm - scx, v_norm - scy)
            if r < 0.36:
                ang = math.atan2(v_norm - scy, u_norm - scx)
                val = math.sin(r * 26.0 - ang * 1.0)
                groove = max(groove, math.exp(-((r / 0.28) ** 2)) * (0.5 + 0.5 * val))
        return -0.022 * groove, 1.0 - 0.32 * groove

    # 6 faces
    add_grid_face(xs, ys, lambda x, y: (x, y, z0, 0.82), flip=True)
    add_grid_face(xs, ys, lambda x, y: (x, y, z1, 1.04), flip=False)

    def y0_map(x, z):
        dep, sh = relief((x - cx) / hx, (z - cz) / hz) if spiral_face == "y0" else (0.0, 0.94)
        return x, y0 - dep, z, sh

    def y1_map(x, z):
        dep, sh = relief((x - cx) / hx, (z - cz) / hz) if spiral_face == "y1" else (0.0, 0.94)
        return x, y1 + dep, z, sh

    def x0_map(y, z):
        dep, sh = relief((y - cy) / hy, (z - cz) / hz) if spiral_face == "x0" else (0.0, 0.95)
        return x0 - dep, y, z, sh

    def x1_map(y, z):
        dep, sh = relief((y - cy) / hy, (z - cz) / hz) if spiral_face == "x1" else (0.0, 0.95)
        return x1 + dep, y, z, sh

    add_grid_face(xs, zs, y0_map, flip=False)
    add_grid_face(xs, zs, y1_map, flip=True)
    add_grid_face(ys, zs, x0_map, flip=True)
    add_grid_face(ys, zs, x1_map, flip=False)

    v_arr = np.array(pts, dtype=np.float32)
    f_arr = np.array(tris, dtype=np.uint32) + base_idx
    c_arr = np.clip(np.array(cols, dtype=np.float32), 0.0, 1.0)
    v_list.append(v_arr)
    f_list.append(f_arr)
    c_list.append(c_arr)


def _merge_parts(
    name: str,
    layer: str,
    material: str,
    v_list: List[np.ndarray],
    f_list: List[np.ndarray],
    c_list: List[np.ndarray],
) -> Dict[str, object]:
    verts = np.concatenate(v_list, axis=0).astype(np.float32)
    faces = np.concatenate(f_list, axis=0).astype(np.uint32)
    colors = np.concatenate(c_list, axis=0).astype(np.float32)
    return {
        "name": name,
        "layer": layer,
        "material": material,
        "verts": verts,
        "faces": faces,
        "normals": compute_vertex_normals(verts, faces),
        "colors": colors,
    }


def build_full_monument_mesh() -> List[Dict[str, object]]:
    """Build all named architectural sub-meshes of Newgrange."""
    rng = np.random.default_rng(3200)
    submeshes: List[Dict[str, object]] = []

    # 1. Passage & Chamber Orthostats (L1-L22, R1-R21, C1-C17)
    vo, fo, co = [], [], []
    y_edges = np.linspace(0.05, PASSAGE_LEN - 0.05, 23)
    for idx in range(22):
        y0, y1 = float(y_edges[idx]), float(y_edges[idx + 1]) - 0.04
        ym = 0.5 * (y0 + y1)
        fz = float(floor_z(ym))
        cz = float(passage_ceil_z(ym))
        hw = float(passage_half_width(ym, 0.8))
        stone_h = max(1.65, cz - fz)
        lean = 0.03 * math.exp(-0.5 * ((ym - 13.5) / 4.0) ** 2)
        shade_l = 0.90 + 0.16 * float(rng.uniform(-0.5, 0.5))
        shade_r = 0.90 + 0.16 * float(rng.uniform(-0.5, 0.5))
        base_col = ARCH_MATERIALS["greywacke_orthostat"]["rgb"]

        # Left orthostat (L1..L22) — L19 gets carved spirals
        carve_l19 = idx == 18
        _append_box(
            vo,
            fo,
            co,
            -hw - 0.42,
            -hw,
            y0,
            y1,
            fz - 0.12,
            fz + stone_h + 0.08,
            tuple(c * shade_l for c in base_col),
            rng=rng,
            tilt_x=lean,
            carve_spiral=carve_l19,
            spiral_face="x1",
        )
        # Right orthostat (R1..R21)
        if idx < 21:
            _append_box(
                vo,
                fo,
                co,
                hw,
                hw + 0.42,
                y0,
                y1,
                fz - 0.12,
                fz + stone_h + 0.08,
                tuple(c * shade_r for c in base_col),
                rng=rng,
                tilt_x=-lean,
                carve_spiral=(idx == 17),
                spiral_face="x0",
            )

    # Chamber core corner piers & recess orthostats
    c_col = ARCH_MATERIALS["greywacke_orthostat"]["rgb"]
    pier_boxes = [
        # SW & SE portal cheek stones
        (-1.55, -0.58, 18.88, 19.85, 1.85, 5.05, False, "y1"),
        (0.58, 1.55, 18.88, 19.70, 1.85, 5.05, False, "y1"),
        # NW & NE corner megaliths
        (-1.65, -0.84, 21.35, 22.25, 1.85, 5.05, False, "y0"),
        (0.84, 1.65, 21.55, 22.25, 1.85, 5.05, False, "y0"),
        # West recess side & back orthostats
        (-3.45, -3.00, 19.75, 21.45, 1.85, 4.35, True, "x1"),
        (-3.05, -1.45, 19.45, 19.85, 1.85, 4.35, False, "y1"),
        (-3.05, -1.45, 21.35, 21.75, 1.85, 4.35, False, "y0"),
        # East recess side & back orthostats (C10 in East recess)
        (3.55, 4.02, 19.60, 21.65, 1.85, 4.70, True, "x0"),
        (1.45, 3.60, 19.30, 19.70, 1.85, 4.70, False, "y1"),
        (1.45, 3.60, 21.55, 21.95, 1.85, 4.70, False, "y0"),
        # North recess side & back orthostats
        (-1.24, -0.82, 22.15, 24.30, 1.85, 4.50, False, "x1"),
        (0.82, 1.24, 22.15, 24.30, 1.85, 4.50, False, "x0"),
        (-1.15, 1.15, 24.20, 24.65, 1.85, 4.50, True, "y0"),
    ]
    for x0, x1, y0, y1, z0, z1, carve, sface in pier_boxes:
        sh = 0.94 + 0.12 * float(rng.uniform(-0.5, 0.5))
        _append_box(
            vo,
            fo,
            co,
            x0,
            x1,
            y0,
            y1,
            z0,
            z1,
            tuple(c * sh for c in c_col),
            rng=rng,
            carve_spiral=carve,
            spiral_face=sface,
        )

    submeshes.append(_merge_parts("interior_orthostats", "interior", "greywacke_orthostat", vo, fo, co))

    # 2. Passage Roof Slabs (RS1-RS17) + 18-Course Stepped Corbelled Vault + Capstone
    vv, fv, cv = [], [], []
    v_col = ARCH_MATERIALS["corbelled_vault"]["rgb"]
    y_slabs = np.linspace(1.50, PASSAGE_LEN, 18)
    for idx in range(17):
        y0, y1 = float(y_slabs[idx]), float(y_slabs[idx + 1]) - 0.04
        cz = float(passage_ceil_z(0.5 * (y0 + y1)))
        hw = float(passage_half_width(0.5 * (y0 + y1), 1.6)) + 0.45
        sh = 0.92 + 0.14 * float(rng.uniform(-0.5, 0.5))
        _append_box(
            vv, fo_tmp := [], co_tmp := [], -hw, hw, y0, y1, cz, cz + 0.34, tuple(c * sh for c in v_col), rng=rng
        )
        fv.extend(fo_tmp)
        cv.extend(co_tmp)

    # Recess lintel roof slabs
    for rec in (WEST_RECESS, EAST_RECESS, NORTH_RECESS):
        _append_box(
            vv,
            fv,
            cv,
            rec["x_min"] - 0.35,
            rec["x_max"] + 0.35,
            rec["y_min"] - 0.35,
            rec["y_max"] + 0.35,
            rec["z_ceil"],
            rec["z_ceil"] + 0.36,
            v_col,
            rng=rng,
        )

    # 18 Stepped Corbelled Rings around chamber vault (visible inside & outside!)
    z_levels = np.linspace(VAULT_SPRING_Z - 0.15, CAPSTONE_Z, 19)
    n_seg = 28
    thetas = np.linspace(0.0, 2.0 * math.pi, n_seg, endpoint=False)
    yc_c = 20.55
    for s in range(18):
        zlo = float(z_levels[s])
        zhi = float(z_levels[s + 1]) + 0.02
        hx, hy, p_exp = vault_profile_at_z(zlo + 0.08)
        outer_hx, outer_hy = hx + 0.85, hy + 0.85
        sh = 0.88 + 0.18 * float(rng.uniform(-0.5, 0.5))
        rgb_ring = tuple(c * sh for c in v_col)

        base_v = sum(len(v) for v in vv)
        ring_v = []
        ring_c = []
        ring_f = []
        for k_th, th in enumerate(thetas):
            ca, sa = math.cos(th), math.sin(th)
            denom = (abs(ca) ** p_exp + abs(sa) ** p_exp) ** (1.0 / p_exp)
            ix, iy = hx * ca / denom, yc_c + hy * sa / denom
            ox, oy = outer_hx * ca / denom, yc_c + outer_hy * sa / denom
            # 4 corners of slab cross-section at angle th
            ring_v.extend([(ix, iy, zlo), (ox, oy, zlo), (ox, oy, zhi), (ix, iy, zhi)])
            ring_c.extend([tuple(c * 0.85 for c in rgb_ring), rgb_ring, rgb_ring, tuple(c * 1.05 for c in rgb_ring)])
            kn = (k_th + 1) % n_seg
            b0, b1 = k_th * 4, kn * 4
            # bottom, outer, top, inner
            ring_f.extend(
                [
                    (b0 + 0, b0 + 1, b1 + 1),
                    (b0 + 0, b1 + 1, b1 + 0),
                    (b0 + 1, b0 + 2, b1 + 2),
                    (b0 + 1, b1 + 2, b1 + 1),
                    (b0 + 2, b0 + 3, b1 + 3),
                    (b0 + 2, b1 + 3, b1 + 2),
                    (b0 + 3, b0 + 0, b1 + 0),
                    (b0 + 3, b1 + 0, b1 + 3),
                ]
            )
        vv.append(np.array(ring_v, dtype=np.float32))
        cv.append(np.array(ring_c, dtype=np.float32))
        fv.append(np.array(ring_f, dtype=np.uint32) + base_v)

    # Massive Capstone sealing the top
    _append_box(
        vv,
        fv,
        cv,
        -1.05,
        1.05,
        yc_c - 1.10,
        yc_c + 1.10,
        CAPSTONE_Z,
        CAPSTONE_Z + 0.42,
        (0.45, 0.43, 0.39),
        bevel=0.06,
        rng=rng,
    )
    submeshes.append(_merge_parts("corbelled_vault_exterior", "vault", "corbelled_vault", vv, fv, cv))

    # 3. Roof-Box & Entrance Doorway Lintel
    vr, fr, cr = [], [], []
    q_col = ARCH_MATERIALS["roofbox_quartz"]["rgb"]
    # Doorway lintel (between z=1.55 and z=1.90)
    _append_box(vr, fr, cr, -0.82, 0.82, 0.0, 1.54, ENTRANCE_DOOR_Z, ROOFBOX_Z_MIN, (0.52, 0.49, 0.44), rng=rng)
    # Roof-box side jambs & top quartz cap (carved diamond/lozenge front)
    _append_box(vr, fr, cr, -0.82, -ROOFBOX_X_HALF, 0.0, 1.54, ROOFBOX_Z_MIN, ROOFBOX_Z_MAX + 0.25, q_col, rng=rng)
    _append_box(vr, fr, cr, ROOFBOX_X_HALF, 0.82, 0.0, 1.54, ROOFBOX_Z_MIN, ROOFBOX_Z_MAX + 0.25, q_col, rng=rng)
    # Front quartz lintel above slit (z=2.42..2.78) with carved megalithic pattern
    _append_box(
        vr, fr, cr, -0.84, 0.84, -0.08, 1.54, ROOFBOX_SLIT_Z_MAX, ROOFBOX_Z_MAX + 0.32, q_col, rng=rng, carve_spiral=True, spiral_face="y0"
    )
    # Front quartz sill below slit (z=1.90..2.16)
    _append_box(vr, fr, cr, -0.52, 0.52, -0.06, 0.28, ROOFBOX_Z_MIN, ROOFBOX_SLIT_Z_MIN, q_col, rng=rng)
    submeshes.append(_merge_parts("roofbox_structure", "interior", "roofbox_quartz", vr, fr, cr))

    # 4. Granite Basins (West, North, East Lower + Upper Nested)
    vb, fb, cb = [], [], []
    g_col = ARCH_MATERIALS["granite_basin"]["rgb"]

    def build_basin_mesh(cx: float, cy: float, rx: float, ry: float, h_rim: float, h_bowl: float, z_base: float):
        nr, nth = 10, 28
        rs = np.linspace(0.0, 1.0, nr)
        ths = np.linspace(0.0, 2.0 * math.pi, nth, endpoint=False)
        pts_b = []
        cols_b = []
        tris_b = []
        base_idx = sum(len(v) for v in vb)
        # Top surface + outer rim skirt
        for ir, r in enumerate(rs):
            zh = (
                h_bowl + (h_rim - h_bowl) * (r / 0.72) ** 2
                if r < 0.72
                else h_rim * (1.0 - ((r - 0.72) / 0.28) ** 2 * 0.35)
            )
            sh = 0.88 + 0.16 * (r if r < 0.8 else 0.75)
            for th in ths:
                px = cx + rx * r * math.cos(th)
                py = cy + ry * r * math.sin(th)
                pts_b.append((px, py, z_base + zh))
                cols_b.append((g_col[0] * sh, g_col[1] * sh, g_col[2] * sh))
        # Bottom ring
        for th in ths:
            pts_b.append((cx + rx * 0.96 * math.cos(th), cy + ry * 0.96 * math.sin(th), z_base))
            cols_b.append((g_col[0] * 0.72, g_col[1] * 0.72, g_col[2] * 0.72))

        for ir in range(nr):  # last step connects outer rim to bottom ring
            for ith in range(nth):
                ith_n = (ith + 1) % nth
                a = ir * nth + ith
                b = ir * nth + ith_n
                c = (ir + 1) * nth + ith_n
                d = (ir + 1) * nth + ith
                tris_b.append((a, b, c))
                tris_b.append((a, c, d))

        vb.append(np.array(pts_b, dtype=np.float32))
        cb.append(np.array(cols_b, dtype=np.float32))
        fb.append(np.array(tris_b, dtype=np.uint32) + base_idx)

    build_basin_mesh(-2.25, 20.60, 0.56, 0.44, 0.32, 0.22, CHAMBER_FLOOR_Z)
    build_basin_mesh(0.00, 23.20, 0.58, 0.48, 0.26, 0.18, CHAMBER_FLOOR_Z)
    build_basin_mesh(2.55, 20.62, 0.82, 0.56, 0.24, 0.16, CHAMBER_FLOOR_Z)
    build_basin_mesh(2.58, 20.62, 0.50, 0.45, 0.32, 0.19, CHAMBER_FLOOR_Z + 0.16)
    submeshes.append(_merge_parts("granite_basins", "interior", "granite_basin", vb, fb, cb))

    # 5. Chamber & Passage Floor
    vf, ff, cf = [], [], []
    e_col = ARCH_MATERIALS["compacted_earth_floor"]["rgb"]
    # Passage floor grid
    ny_f = 48
    ys_f = np.linspace(-0.2, PASSAGE_LEN, ny_f)
    nx_f = 5
    base_f = 0
    f_pts, f_cols, f_tris = [], [], []
    for iy, yv in enumerate(ys_f):
        fz = float(floor_z(yv))
        hw = float(passage_half_width(yv, 0.0)) + 0.35
        for ix, tx in enumerate(np.linspace(-1.0, 1.0, nx_f)):
            sh = 0.90 + 0.14 * math.sin(yv * 1.7 + tx * 2.5)
            f_pts.append((tx * hw, yv, fz))
            f_cols.append((e_col[0] * sh, e_col[1] * sh, e_col[2] * sh))
    for iy in range(ny_f - 1):
        for ix in range(nx_f - 1):
            a = iy * nx_f + ix
            b = iy * nx_f + ix + 1
            c = (iy + 1) * nx_f + ix + 1
            d = (iy + 1) * nx_f + ix
            f_tris.extend([(a, b, c), (a, c, d)])
    vf.append(np.array(f_pts, dtype=np.float32))
    cf.append(np.array(f_cols, dtype=np.float32))
    ff.append(np.array(f_tris, dtype=np.uint32) + base_f)
    # Chamber & recess floor slab
    _append_box(vf, ff, cf, -3.20, 3.70, 18.90, 24.35, CHAMBER_FLOOR_Z - 0.14, CHAMBER_FLOOR_Z, e_col, bevel=0.0)
    submeshes.append(_merge_parts("chamber_floor", "interior", "compacted_earth_floor", vf, ff, cf))

    # 6. Exterior White Wicklow Quartz Retaining Facade + Dark Granodiorite Cobbles
    vq, fq, cq = [], [], []
    vc, fc, cc = [], [], []
    qf_col = ARCH_MATERIALS["quartz_facade"]["rgb"]
    dc_col = ARCH_MATERIALS["dark_cobble"]["rgb"]

    # Curved wall around entrance from angle -128 deg to -52 deg relative to mound center (0, 22.0)
    # Wait: entrance at (0, 0) is at angle -pi/2 (-90 deg) from (0, 22.0) at radius ~22 m?
    # Wait: Newgrange mound radius is 42.5 m! The entrance & passage penetrate INWARD from the perimeter!
    # Wait: our passage is 18.95 m + 5.25 m chamber = 24.2 m total depth from entrance to back of North recess!
    # In Newgrange, the chamber sits inside the 85 m diameter cairn (about 1/3 of the way in from the SE edge).
    # Let's check: with mound center at (0, 22.0) and radius 42.5 m? Wait: if mound center is (0, 22.0) and radius is 42.5 m,
    # then the SE edge of the mound would be at y = 22.0 - 42.5 = -20.5 m!
    # AHA! Good catch!! The entrance K1 is AT THE PERIMETER of the 85 m mound!
    # Let's place the mound center at (MOUND_CENTER_X=0.0, MOUND_CENTER_Y=41.5)!
    # Check: if center = (0.0, 41.5) and radius = 42.5 m, then the SE perimeter edge is at y = 41.5 - 42.5 = -1.0 m!
    # Then the 18.95 m passage + 5.25 m chamber reaches y = 24.20 m (roughly 58% of the way to the center, matching O'Kelly's excavation plan where the chamber sits slightly in front of the center of the 85 m cairn!!)!
    # Let's use actual mound center (0.0, 41.5) so the entrance portal at y=0 sits RIGHT AT the curved quartz facade & kerbstone perimeter!
    mound_cy = 41.5
    mound_r = MOUND_RADIUS  # 42.5 m

    # Build curved quartz retaining wall (excluding central entrance doorway gap |x| < 1.15 m)
    wall_angs = np.linspace(-math.pi * 0.5 - 0.58, -math.pi * 0.5 + 0.58, 64)
    n_h = 7
    base_q = 0
    q_pts, q_cols, q_tris = [], [], []
    # Build two wings (west wing: x < -0.95, east wing: x > 0.95)
    for wing_ang in [wall_angs[wall_angs < -math.pi * 0.5 - 0.024], wall_angs[wall_angs > -math.pi * 0.5 + 0.024]]:
        start_w = len(q_pts)
        na = len(wing_ang)
        for ia, ang in enumerate(wing_ang):
            # Wall rises gracefully from 1.2 m at ends up to 3.1 m flanking the entrance
            dist_from_ent = abs(ang + math.pi * 0.5) / 0.58
            h_top = 1.4 + 1.75 * (1.0 - dist_from_ent ** 1.6)
            for ih in range(n_h):
                u_h = ih / (n_h - 1)
                z_w = u_h * h_top
                # Slight inward batter (tilts back 0.45 m from bottom to top)
                r_w = (mound_r - 0.65) - 0.45 * u_h
                wx = r_w * math.cos(ang)
                wy = mound_cy + r_w * math.sin(ang)
                sh = 0.88 + 0.16 * (u_h) + 0.08 * math.sin(ia * 2.1 + ih * 1.7)
                q_pts.append((wx, wy, z_w))
                q_cols.append((qf_col[0] * sh, qf_col[1] * sh, qf_col[2] * sh))
        for ia in range(na - 1):
            for ih in range(n_h - 1):
                a = start_w + ia * n_h + ih
                b = start_w + (ia + 1) * n_h + ih
                c = start_w + (ia + 1) * n_h + ih + 1
                d = start_w + ia * n_h + ih + 1
                q_tris.extend([(a, b, c), (a, c, d)])

    vq.append(np.array(q_pts, dtype=np.float32))
    cq.append(np.array(q_cols, dtype=np.float32))
    fq.append(np.array(q_tris, dtype=np.uint32) + base_q)
    # Wing cheek drystone walls curving inward into the doorway
    _append_box(vq, fq, cq, -1.25, -0.55, -1.0, 0.15, 0.0, 2.85, qf_col, rng=rng)
    _append_box(vq, fq, cq, 0.55, 1.25, -1.0, 0.15, 0.0, 2.85, qf_col, rng=rng)
    submeshes.append(_merge_parts("quartz_facade", "exterior", "quartz_facade", vq, fq, cq))

    # Dark rounded granodiorite cobbles embedded in the white quartz facade
    for _ in range(160):
        ang = float(rng.uniform(-math.pi * 0.5 - 0.54, -math.pi * 0.5 + 0.54))
        if abs(ang + math.pi * 0.5) < 0.032:
            continue
        dist_from_ent = abs(ang + math.pi * 0.5) / 0.58
        h_top = 1.4 + 1.75 * (1.0 - dist_from_ent ** 1.6)
        u_h = float(rng.uniform(0.12, 0.88))
        z_c = u_h * h_top
        r_c = (mound_r - 0.65) - 0.45 * u_h - 0.02
        cx = r_c * math.cos(ang)
        cy = mound_cy + r_c * math.sin(ang)
        rad = float(rng.uniform(0.10, 0.18))
        sh = float(rng.uniform(0.80, 1.20))
        _append_box(
            vc,
            fc,
            cc,
            cx - rad,
            cx + rad,
            cy - rad,
            cy + rad,
            z_c - rad * 0.8,
            z_c + rad * 0.8,
            tuple(c * sh for c in dc_col),
            bevel=rad * 0.5,
        )
    submeshes.append(_merge_parts("granodiorite_cobbles", "exterior", "dark_cobble", vc, fc, cc))

    # 7. All 97 Perimeter Kerbstones (K1..K97), with K1 Triple-Spiral Entrance Stone
    vk, fk, ck = [], [], []
    k_col = ARCH_MATERIALS["carved_megalith"]["rgb"]
    for k_idx in range(NUM_KERBSTONES):
        ang = -math.pi * 0.5 + (k_idx / NUM_KERBSTONES) * 2.0 * math.pi
        if k_idx == 0:
            # Entrance Stone K1 across entrance threshold at y = -2.35 m (3.2 x 0.65 x 1.35 m)
            _append_box(
                vk,
                fk,
                ck,
                -1.60,
                1.60,
                -2.65,
                -2.00,
                0.0,
                1.35,
                (0.56, 0.53, 0.47),
                bevel=0.08,
                rng=rng,
                carve_spiral=True,
                spiral_face="y0",
            )
            continue
        r_k = mound_r + 0.10
        kx = r_k * math.cos(ang)
        ky = mound_cy + r_k * math.sin(ang)
        # Tangent & radial local box approximated cleanly via rotated coordinates
        stone_len = 1.25 + 0.25 * float(rng.uniform(-0.5, 0.5))
        stone_h = 1.15 + 0.30 * float(rng.uniform(-0.5, 0.5))
        stone_thk = 0.55
        tx, ty = -math.sin(ang), math.cos(ang)
        rx, ry = math.cos(ang), math.sin(ang)
        sh = 0.88 + 0.16 * float(rng.uniform(-0.5, 0.5))
        col_k = tuple(c * sh for c in ARCH_MATERIALS["greywacke_orthostat"]["rgb"])

        # Build rotated 8-corner bevelled stone slab
        base_k = sum(len(v) for v in vk)
        # 2x2x2 corners -> 6 quads
        corners_local = [
            (-stone_len, -stone_thk, 0.0),
            (stone_len, -stone_thk, 0.0),
            (stone_len, stone_thk, 0.0),
            (-stone_len, stone_thk, 0.0),
            (-stone_len * 0.94, -stone_thk * 0.85, stone_h),
            (stone_len * 0.94, -stone_thk * 0.85, stone_h),
            (stone_len * 0.94, stone_thk * 0.85, stone_h),
            (-stone_len * 0.94, stone_thk * 0.85, stone_h),
        ]
        k_verts = []
        k_cols = []
        for lt, lr, lz in corners_local:
            wx = kx + lt * tx + lr * rx
            wy = ky + lt * ty + lr * ry
            k_verts.append((wx, wy, lz))
            shade_z = 0.82 if lz == 0.0 else 1.04
            k_cols.append((col_k[0] * shade_z, col_k[1] * shade_z, col_k[2] * shade_z))
        k_tris = [
            (0, 3, 2), (0, 2, 1),
            (4, 5, 6), (4, 6, 7),
            (0, 1, 5), (0, 5, 4),
            (1, 2, 6), (1, 6, 5),
            (2, 3, 7), (2, 7, 6),
            (3, 0, 4), (3, 4, 7),
        ]
        vk.append(np.array(k_verts, dtype=np.float32))
        ck.append(np.array(k_cols, dtype=np.float32))
        fk.append(np.array(k_tris, dtype=np.uint32) + base_k)

    submeshes.append(_merge_parts("kerbstones", "exterior", "carved_megalith", vk, fk, ck))

    # 8. Split 85 m Cairn Mound (West Half & East Cutaway Half)
    # Cutaway plane: x = 0.0, with hollow carved smoothly around the tomb interior so it never
    # clips inside the passage or chamber!
    def build_mound_half(name: str, x_sign: float) -> Dict[str, object]:
        nr, nth = 34, 48
        # Angle spans half-circle: West (-1) from pi/2 to 3*pi/2; East (+1) from -pi/2 to pi/2
        if x_sign < 0:
            angs = np.linspace(math.pi * 0.5, math.pi * 1.5, nth)
        else:
            angs = np.linspace(-math.pi * 0.5, math.pi * 0.5, nth)
        rs = np.linspace(0.0, mound_r, nr)
        m_col = ARCH_MATERIALS["turf_mound"]["rgb"]

        m_pts = []
        m_cols = []
        m_tris = []
        for ir, r in enumerate(rs):
            u_r = r / mound_r
            # Dome height profile (flat-topped cairn rising to 12.5 m)
            h_dome = MOUND_HEIGHT * ((1.0 - (u_r ** 2.1)) ** 0.72)
            # Slope down smoothly to facade top near perimeter
            if u_r > 0.85:
                h_dome = max(1.6, h_dome)
            for ia, ang in enumerate(angs):
                mx = r * math.cos(ang)
                my = mound_cy + r * math.sin(ang)
                # Keep hollow around passage & chamber + forecourt opening!
                in_tomb_keepout = (my < 26.0) and (abs(mx) < 4.5)
                if my < 0.0:
                    z_surf = 0.0
                elif in_tomb_keepout and my < 18.0:
                    # Cut open forecourt / notch over entrance roof-box
                    notch = smoothstep(0.0, 2.5, abs(mx) - 0.85)
                    z_surf = max(0.2, h_dome * notch) if my < 1.8 else max(passage_ceil_z(my) + 0.65, h_dome)
                else:
                    z_surf = max(1.5, h_dome)
                sh = 0.84 + 0.22 * (1.0 - u_r) + 0.06 * math.sin(mx * 0.25 + my * 0.25)
                m_pts.append((mx, my, z_surf))
                m_cols.append((m_col[0] * sh, m_col[1] * sh, m_col[2] * sh))

        for ir in range(nr - 1):
            for ia in range(nth - 1):
                a = ir * nth + ia
                b = (ir + 1) * nth + ia
                c = (ir + 1) * nth + ia + 1
                d = ir * nth + ia + 1
                m_tris.extend([(a, b, c), (a, c, d)])

        # Add vertical cutaway cross-section wall along x = 0 (skipping tomb interior cutout!)
        cut_start = len(m_pts)
        ys_cut = np.linspace(0.5, mound_cy + mound_r, 80)
        for iy, cy_val in enumerate(ys_cut):
            r_dist = abs(cy_val - mound_cy)
            u_r = min(1.0, r_dist / mound_r)
            z_top = max(1.5, MOUND_HEIGHT * ((1.0 - (u_r ** 2.1)) ** 0.72))
            # Lower boundary of section wall clears tomb ceiling
            if cy_val <= PASSAGE_LEN:
                z_bot = passage_ceil_z(cy_val) + 0.45
            elif cy_val <= 24.5:
                z_bot = CAPSTONE_Z + 0.48
            else:
                z_bot = 0.0
            z_top = max(z_top, z_bot + 0.15)
            # Cairn rubble stone color inside cut face
            m_pts.append((0.0, cy_val, z_bot))
            m_cols.append((0.35, 0.33, 0.29))
            m_pts.append((0.0, cy_val, z_top))
            m_cols.append((0.44, 0.41, 0.36))
        for iy in range(len(ys_cut) - 1):
            a = cut_start + iy * 2
            b = cut_start + iy * 2 + 1
            c = cut_start + (iy + 1) * 2 + 1
            d = cut_start + (iy + 1) * 2
            if x_sign < 0:
                m_tris.extend([(a, b, c), (a, c, d)])
            else:
                m_tris.extend([(a, c, b), (a, d, c)])

        verts = np.array(m_pts, dtype=np.float32)
        faces = np.array(m_tris, dtype=np.uint32)
        cols = np.clip(np.array(m_cols, dtype=np.float32), 0.0, 1.0)
        return {
            "name": name,
            "layer": "mound_west" if x_sign < 0 else "mound_east",
            "material": "turf_mound",
            "verts": verts,
            "faces": faces,
            "normals": compute_vertex_normals(verts, faces),
            "colors": cols,
        }

    submeshes.append(build_mound_half("mound_west_half", -1.0))
    submeshes.append(build_mound_half("mound_east_half", +1.0))

    # 9. Surrounding Boyne Valley Terrain Apron
    nx_t, ny_t = 44, 44
    xs_t = np.linspace(-58.0, 58.0, nx_t)
    ys_t = np.linspace(-22.0, 96.0, ny_t)
    t_col = ARCH_MATERIALS["boyne_terrain"]["rgb"]
    t_pts, t_cols, t_tris = [], [], []
    for x in xs_t:
        for y in ys_t:
            r_m = math.hypot(x, y - mound_cy)
            # Gentle rolling Boyne ridge depression outside mound
            z_t = -0.05 - 0.35 * max(0.0, (r_m - 45.0) / 30.0) + 0.25 * math.sin(x * 0.08) * math.cos(y * 0.08)
            if r_m < 44.0 and y < 26.0 and abs(x) < 4.0:
                z_t = -0.02
            sh = 0.88 + 0.14 * math.sin(x * 0.15 + y * 0.12)
            t_pts.append((x, y, z_t))
            t_cols.append((t_col[0] * sh, t_col[1] * sh, t_col[2] * sh))
    for ix in range(nx_t - 1):
        for iy in range(ny_t - 1):
            a = ix * ny_t + iy
            b = (ix + 1) * ny_t + iy
            c = (ix + 1) * ny_t + iy + 1
            d = ix * ny_t + iy + 1
            t_tris.extend([(a, b, c), (a, c, d)])
    t_v = np.array(t_pts, dtype=np.float32)
    t_f = np.array(t_tris, dtype=np.uint32)
    submeshes.append(
        {
            "name": "boyne_terrain",
            "layer": "terrain",
            "material": "boyne_terrain",
            "verts": t_v,
            "faces": t_f,
            "normals": compute_vertex_normals(t_v, t_f),
            "colors": np.clip(np.array(t_cols, dtype=np.float32), 0.0, 1.0),
        }
    )

    # 10. Volumetric Winter Solstice Sunbeam Shaft
    # Enters from exterior (-4.0 m) through roof-box slit (y=0, z=2.29) descending 1.0 deg to chamber floor (y=20.62, z=1.95)
    slope = -math.tan(math.radians(1.0))
    y_beam = np.array([-5.0, 0.0, 1.5, 10.0, 18.95, 20.62])
    beam_pts, beam_cols, beam_tris = [], [], []
    sb_col = ARCH_MATERIALS["solstice_beam"]["rgb"]
    for iy, yb in enumerate(y_beam):
        zc = 2.31 + slope * yb
        hw = 0.42 if yb <= 0.0 else (0.34 if yb < 18.95 else 0.48)
        hh = 0.11 if yb <= 1.5 else 0.13
        # 4 corners of beam shaft cross-section
        for dx, dz in [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]:
            beam_pts.append((dx, yb, max(CHAMBER_FLOOR_Z if yb > 18.95 else 0.0, zc + dz)))
            beam_cols.append(sb_col)
    for iy in range(len(y_beam) - 1):
        for k in range(4):
            kn = (k + 1) % 4
            a = iy * 4 + k
            b = iy * 4 + kn
            c = (iy + 1) * 4 + kn
            d = (iy + 1) * 4 + k
            beam_tris.extend([(a, b, c), (a, c, d)])
    b_v = np.array(beam_pts, dtype=np.float32)
    b_f = np.array(beam_tris, dtype=np.uint32)
    submeshes.append(
        {
            "name": "solstice_beam",
            "layer": "solstice",
            "material": "solstice_beam",
            "verts": b_v,
            "faces": b_f,
            "normals": compute_vertex_normals(b_v, b_f),
            "colors": np.array(beam_cols, dtype=np.float32),
        }
    )

    return submeshes


if __name__ == "__main__":
    ac = build_acoustic_interior_mesh()
    print("Acoustic Interior Mesh:", ac["manifold_stats"])
    arch = build_full_monument_mesh()
    for sm in arch:
        print(f"  {sm['name']}: {len(sm['verts'])} verts, {len(sm['faces'])} tris")
