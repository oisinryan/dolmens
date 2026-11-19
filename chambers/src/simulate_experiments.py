"""
3D FDTD & Analytical Acoustic Experiments for Comparative Megalithic Chambers

Simulates:
  1. Maeshowe (Orkney): 3D FDTD on 4.7 x 4.7 x 4.5 m square flagstone chamber + 3 side cells + 11 m passage
  2. Test #2 (Loughcrew Cairn L): 3D FDTD with 7 radial partition stones ON vs OFF
  3. Test #4 (Newgrange Roof-Box Mouthpiece): 3D FDTD source at Roof-Box slit vs Entrance Doorway -> Chamber
  4. Test #3 (Helmholtz Pressure Vessel): Sealed clay mound (Maeshowe 2 Hz) vs Permeable cairn (Newgrange silent)

Outputs:
  - chambers/data/chamber_acoustics_data.json
  - chambers/data/comparative_modes_3d.bin
"""

from __future__ import annotations

import json
import math
import os
import struct
import sys
import time
from typing import Dict, List, Tuple

import numpy as np

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
DOLMENS_ROOT = os.path.abspath(os.path.join(THIS_DIR, "..", ".."))
NEWGRANGE_SRC = os.path.join(DOLMENS_ROOT, "newgrange", "src")
if NEWGRANGE_SRC not in sys.path:
    sys.path.insert(0, NEWGRANGE_SRC)

from acoustic_fdtd import FDTDDomain, compute_free_field_reference, deconvolve_fdtd_ir  # type: ignore
from sites_spec import (
    NEURO_AND_COMPARATIVE,
    SITES,
    SOURCES,
    SPEED_OF_SOUND_11C,
    SPEED_OF_SOUND_20C,
    VOICE_BENCHMARKS,
    ideal_box_modes,
)

C_AIR = SPEED_OF_SOUND_11C
DX_MINI = 0.14
COURANT_MINI = 0.54
DT_MINI = COURANT_MINI * DX_MINI / C_AIR
FS_MINI = 1.0 / DT_MINI


def _ricker(n_steps: int, dt: float, f0: float = 120.0) -> np.ndarray:
    t = np.arange(n_steps, dtype=np.float64) * dt
    t0 = 2.0 / f0
    tau = t - t0
    arg = (math.pi * f0 * tau) ** 2
    w = (1.0 - 2.0 * arg) * np.exp(-arg)
    w[t > 4.2 / f0] = 0.0
    w -= np.mean(w)
    return w


def _mini_free_field_ref(n_steps: int) -> np.ndarray:
    n_box = 33
    n_ref = min(n_steps, 360)
    wave = _ricker(n_ref, DT_MINI, 120.0)
    p_prev = np.zeros((n_box, n_box, n_box), dtype=np.float64)
    p_curr = np.zeros((n_box, n_box, n_box), dtype=np.float64)
    p_next = np.zeros((n_box, n_box, n_box), dtype=np.float64)
    lam2 = COURANT_MINI ** 2
    c_mid = 2.0 - 6.0 * lam2
    c_mur = (COURANT_MINI - 1.0) / (COURANT_MINI + 1.0)
    rec = np.zeros(n_ref, dtype=np.float64)
    for n in range(n_ref):
        p_next[1:-1, 1:-1, 1:-1] = (
            c_mid * p_curr[1:-1, 1:-1, 1:-1]
            + lam2
            * (
                p_curr[2:, 1:-1, 1:-1]
                + p_curr[:-2, 1:-1, 1:-1]
                + p_curr[1:-1, 2:, 1:-1]
                + p_curr[1:-1, :-2, 1:-1]
                + p_curr[1:-1, 1:-1, 2:]
                + p_curr[1:-1, 1:-1, :-2]
            )
            - p_prev[1:-1, 1:-1, 1:-1]
        )
        if wave[n] != 0.0:
            p_next[16, 16, 16] += wave[n]
        p_next[0, :, :] = p_curr[1, :, :] + c_mur * (p_next[1, :, :] - p_curr[0, :, :])
        p_next[-1, :, :] = p_curr[-2, :, :] + c_mur * (p_next[-2, :, :] - p_curr[-1, :, :])
        p_next[:, 0, :] = p_curr[:, 1, :] + c_mur * (p_next[:, 1, :] - p_curr[:, 0, :])
        p_next[:, -1, :] = p_curr[:, -2, :] + c_mur * (p_next[:, -2, :] - p_curr[:, -1, :])
        p_next[:, :, 0] = p_curr[:, :, 1] + c_mur * (p_next[:, :, 1] - p_curr[:, :, 0])
        p_next[:, :, -1] = p_curr[:, :, -2] + c_mur * (p_next[:, :, -2] - p_curr[:, :, -1])
        rec[n] = p_next[16, 21, 16]  # 5 * 0.14 = 0.70 m
        p_prev, p_curr, p_next = p_curr, p_next, p_prev
    out = np.zeros(n_steps, dtype=np.float64)
    out[:n_ref] = rec * 0.70
    return out


class MiniFDTD:
    """Compact 3D locally-reacting FDTD solver for comparative megalithic chambers."""

    def __init__(
        self,
        xs: np.ndarray,
        ys: np.ndarray,
        zs: np.ndarray,
        interior_mask: np.ndarray,
        exterior_mask: np.ndarray,
        alpha_wall: float = 0.02,
        alpha_floor: float = 0.06,
    ) -> None:
        self.xs, self.ys, self.zs = xs, ys, zs
        self.nx, self.ny, self.nz = len(xs), len(ys), len(zs)
        self.interior_mask = interior_mask
        active = interior_mask | exterior_mask
        self.idx_3d = np.full((self.nx, self.ny, self.nz), -1, dtype=np.int32)
        self.coords = np.argwhere(active)
        self.n_air = len(self.coords)
        self.idx_3d[active] = np.arange(self.n_air, dtype=np.int32)

        r_w = math.sqrt(max(0.0, 1.0 - alpha_wall))
        xi_wall = (1.0 - r_w) / (1.0 + r_w)
        r_f = math.sqrt(max(0.0, 1.0 - alpha_floor))
        xi_floor = (1.0 - r_f) / (1.0 + r_f)

        sentinel = self.n_air
        self.nb = np.full((6, self.n_air), sentinel, dtype=np.int32)
        offsets = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
        ix, iy, iz = self.coords[:, 0], self.coords[:, 1], self.coords[:, 2]
        adm = np.zeros(self.n_air, dtype=np.float64)
        k_air = np.zeros(self.n_air, dtype=np.float64)

        for d_idx, (dx_i, dy_i, dz_i) in enumerate(offsets):
            nx_i, ny_i, nz_i = ix + dx_i, iy + dy_i, iz + dz_i
            in_b = (nx_i >= 0) & (nx_i < self.nx) & (ny_i >= 0) & (ny_i < self.ny) & (nz_i >= 0) & (nz_i < self.nz)
            nb_idx = np.full(self.n_air, sentinel, dtype=np.int32)
            vp = np.where(in_b)[0]
            if len(vp) > 0:
                nb_idx[vp] = self.idx_3d[nx_i[vp], ny_i[vp], nz_i[vp]]
            is_air = nb_idx >= 0
            self.nb[d_idx, is_air] = nb_idx[is_air]
            k_air += is_air.astype(np.float64)

            solid = np.where(~is_air)[0]
            for v in solid:
                if exterior_mask[ix[v], iy[v], iz[v]]:
                    adm[v] += xi_floor if (dz_i == -1 and zs[iz[v]] <= 0.14) else 1.0
                else:
                    adm[v] += xi_floor if (dz_i == -1 and zs[iz[v]] <= 0.14) else xi_wall

        B = 0.5 * COURANT_MINI * adm
        self.inv_damp = 1.0 / (1.0 + B)
        self.c_curr = 2.0 - (COURANT_MINI ** 2) * k_air
        self.c_prev = 1.0 - B
        self.lam2 = COURANT_MINI ** 2

    def coord_to_voxel(self, pos: Tuple[float, float, float]) -> int:
        px, py, pz = pos
        ix = int(np.clip(round((px - self.xs[0]) / DX_MINI), 0, self.nx - 1))
        iy = int(np.clip(round((py - self.ys[0]) / DX_MINI), 0, self.ny - 1))
        iz = int(np.clip(round((pz - self.zs[0]) / DX_MINI), 0, self.nz - 1))
        idx = int(self.idx_3d[ix, iy, iz])
        if idx >= 0:
            return idx
        pts = np.column_stack([self.xs[self.coords[:, 0]], self.ys[self.coords[:, 1]], self.zs[self.coords[:, 2]]])
        return int(np.argmin((pts[:, 0] - px) ** 2 + (pts[:, 1] - py) ** 2 + (pts[:, 2] - pz) ** 2))

    def run(
        self,
        src_pos: Tuple[float, float, float],
        rec_pos: Tuple[float, float, float],
        duration_s: float = 1.4,
        capture_mode_hz: float | None = None,
    ) -> Tuple[np.ndarray, np.ndarray | None]:
        n_steps = int(round(duration_s * FS_MINI))
        wave = _ricker(n_steps, DT_MINI, 120.0)
        src_idx = self.coord_to_voxel(src_pos)
        rec_idx = self.coord_to_voxel(rec_pos)
        trace = np.zeros(n_steps, dtype=np.float64)

        p_prev = np.zeros(self.n_air + 1, dtype=np.float64)
        p_curr = np.zeros(self.n_air + 1, dtype=np.float64)
        p_next = np.zeros(self.n_air + 1, dtype=np.float64)
        nb0, nb1, nb2, nb3, nb4, nb5 = self.nb
        inv_damp, c_curr, c_prev, lam2 = self.inv_damp, self.c_curr, self.c_prev, self.lam2

        dft_r = np.zeros(self.n_air, dtype=np.float64) if capture_mode_hz else None
        dft_i = np.zeros(self.n_air, dtype=np.float64) if capture_mode_hz else None
        n_start = int(round(0.05 * FS_MINI))
        hann_len = max(1, n_steps - n_start)

        for n in range(n_steps):
            p_sum = p_curr[nb0] + p_curr[nb1] + p_curr[nb2] + p_curr[nb3] + p_curr[nb4] + p_curr[nb5]
            p_next[:-1] = inv_damp * (c_curr * p_curr[:-1] + lam2 * p_sum - c_prev * p_prev[:-1])
            if wave[n] != 0.0:
                p_next[src_idx] += wave[n]
            p_next[-1] = 0.0
            trace[n] = p_next[rec_idx]

            if capture_mode_hz and n >= n_start:
                w = 0.5 * (1.0 - math.cos(2.0 * math.pi * (n - n_start) / hann_len))
                ang = -2.0 * math.pi * capture_mode_hz * (n * DT_MINI)
                dft_r += (w * math.cos(ang)) * p_next[:-1]
                dft_i += (w * math.sin(ang)) * p_next[:-1]

            p_prev, p_curr, p_next = p_curr, p_next, p_prev

        dft_c = (dft_r + 1j * dft_i) if capture_mode_hz else None
        return trace, dft_c


def _deconvolve_mini(trace: np.ndarray, ref: np.ndarray, f_grid: np.ndarray) -> np.ndarray:
    n_fft = 1 << int(math.ceil(math.log2(len(trace) * 2)))
    Y = np.fft.rfft(trace, n=n_fft)
    X = np.fft.rfft(ref, n=n_fft)
    freqs = np.fft.rfftfreq(n_fft, d=DT_MINI)
    mag2 = np.abs(X) ** 2
    H = (Y * np.conj(X)) / (mag2 + 2.5e-4 * float(np.max(mag2)))
    db = 20.0 * np.log10(np.maximum(np.abs(H), 1e-8))
    return np.interp(f_grid, freqs, db)


def _extract_band_peak(f_grid: np.ndarray, db: np.ndarray, lo: float = 90.0, hi: float = 125.0) -> Dict[str, float]:
    mask = (f_grid >= lo) & (f_grid <= hi)
    fs = f_grid[mask]
    ds = db[mask]
    idx = int(np.argmax(ds))
    pk_f = float(fs[idx])
    pk_db = float(ds[idx])
    # Compute -3 dB bandwidth & Q-factor
    left_f = pk_f
    for k in range(idx, -1, -1):
        if ds[k] <= pk_db - 3.0:
            left_f = float(fs[k])
            break
    right_f = pk_f
    for k in range(idx, len(ds)):
        if ds[k] <= pk_db - 3.0:
            right_f = float(fs[k])
            break
    bw = max(1.0, right_f - left_f)
    return {
        "peak_hz": round(pk_f, 2),
        "peak_db": round(pk_db, 2),
        "bw_3db_hz": round(bw, 2),
        "q_factor": round(pk_f / bw, 1),
    }


def _pack_mode_volume(domain: MiniFDTD, dft_c: np.ndarray) -> Tuple[List[int], List[float], np.ndarray, np.ndarray]:
    ix, iy, iz = domain.coords[:, 0], domain.coords[:, 1], domain.coords[:, 2]
    int_pts = domain.interior_mask[ix, iy, iz]
    s2 = np.sum(dft_c[int_pts] ** 2)
    theta = 0.5 * float(np.angle(s2)) if abs(s2) > 1e-20 else 0.0
    real_f = np.real(dft_c * np.exp(-1j * theta))
    scale = max(1e-12, float(np.percentile(np.abs(real_f[int_pts]), 99.5)))
    norm_1d = np.clip(real_f / scale, -1.0, 1.0)

    vol = np.zeros((domain.nx, domain.ny, domain.nz), dtype=np.float32)
    vol[ix, iy, iz] = norm_1d
    mask = domain.interior_mask.astype(np.uint8) * 255
    u8 = np.clip(np.round(127.5 + 127.0 * vol), 0, 255).astype(np.uint8)
    u8[~domain.interior_mask] = 128

    bbox = [
        float(domain.xs[0]),
        float(domain.xs[-1]),
        float(domain.ys[0]),
        float(domain.ys[-1]),
        float(domain.zs[0]),
        float(domain.zs[-1]),
    ]
    # Transpose to (z, y, x) for WebGL2 texImage3D
    return [domain.nx, domain.ny, domain.nz], bbox, np.transpose(mask, (2, 1, 0)).copy(), np.transpose(u8, (2, 1, 0)).copy()


def run_maeshowe_fdtd(f_grid: np.ndarray) -> Tuple[Dict[str, object], Tuple]:
    t0 = time.time()
    xs = np.arange(-4.20, 4.21, DX_MINI)
    ys = np.arange(-1.40, 17.64, DX_MINI)
    zs = np.arange(0.0, 4.76, DX_MINI)
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")

    in_pass = (Y >= 0.0) & (Y <= 11.0) & (np.abs(X) <= 0.45) & (Z >= 0.0) & (Z <= 1.35)
    # Recessed blocking stone at y in [1.8, 3.0] leaves 18 cm gap at top (z in [1.17, 1.35])
    blocked = (Y >= 1.8) & (Y <= 3.0) & (Z < 1.17)
    in_pass &= ~blocked

    # Square 4.7 x 4.7 m chamber (x in [-2.35, 2.35], y in [11.0, 15.7], tapering above z=2.9 -> 4.5 m)
    u_v = np.clip((Z - 2.9) / (4.5 - 2.9), 0.0, 1.0)
    hx_ch = np.where(Z <= 2.9, 2.35, 2.35 - u_v * 1.50)
    in_ch = (Y >= 11.0) & (Y <= 15.7) & (np.abs(X) <= hx_ch) & (np.abs(Y - 13.35) <= hx_ch) & (Z >= 0.0) & (Z <= 4.5)

    # 3 raised side cells (West, East, North)
    in_w = (X >= -4.05) & (X <= -2.35) & (Y >= 12.55) & (Y <= 14.15) & (Z >= 0.85) & (Z <= 1.95)
    in_e = (X >= 2.35) & (X <= 4.05) & (Y >= 12.55) & (Y <= 14.15) & (Z >= 0.85) & (Z <= 1.95)
    in_n = (X >= -0.80) & (X <= 0.80) & (Y >= 15.7) & (Y <= 17.45) & (Z >= 0.85) & (Z <= 1.95)

    interior = in_pass | in_ch | in_w | in_e | in_n
    exterior = (Y < 0.0) & (np.abs(X) <= 1.5) & (Z >= 0.0) & (Z <= 2.2)

    dom = MiniFDTD(xs, ys, zs, interior, exterior, alpha_wall=0.012, alpha_floor=0.03)
    src = (0.0, 13.35, 1.40)
    rec = (0.85, 13.85, 1.45)
    trace, _ = dom.run(src, rec, duration_s=1.4)
    ref = _mini_free_field_ref(len(trace))
    frf_db = _deconvolve_mini(trace, ref, f_grid)
    pk_info = _extract_band_peak(f_grid, frf_db, 95.0, 120.0)
    # 2nd pass capturing 3D standing-wave field at exact detected Maeshowe peak
    _, dft_c = dom.run(src, rec, duration_s=1.1, capture_mode_hz=pk_info["peak_hz"])
    vol_pack = _pack_mode_volume(dom, dft_c)
    print(f"[FDTD Maeshowe] {dom.n_air} voxels, {time.time() - t0:.2f}s | peak={pk_info}")

    return {
        "frf_db": [round(float(x), 2) for x in frf_db],
        "peak_95_120": pk_info,
    }, vol_pack


def run_loughcrew_experiment(f_grid: np.ndarray) -> Tuple[Dict[str, object], Tuple]:
    """Test #2: Loughcrew Cairn L with 7 radial partition orthostats ON vs OFF."""
    t0 = time.time()
    xs = np.arange(-2.52, 2.53, DX_MINI)
    ys = np.arange(-1.40, 10.92, DX_MINI)
    zs = np.arange(0.0, 3.08, DX_MINI)
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")

    in_pass = (Y >= 0.0) & (Y <= 6.4) & (np.abs(X) <= 0.45) & (Z >= 0.0) & (Z <= 1.50)
    u_v = np.clip((Z - 2.0) / (2.95 - 2.0), 0.0, 1.0)
    r_ch = np.where(Z <= 2.0, 2.05, 2.05 * (1.0 - 0.65 * u_v))
    in_ch = ((X / np.maximum(0.4, r_ch)) ** 2 + ((Y - 8.4) / np.maximum(0.4, r_ch * 0.96)) ** 2 <= 1.0) & (Z >= 0.0) & (Z <= 2.95)
    interior_open = in_pass | in_ch
    exterior = (Y < 0.0) & (np.abs(X) <= 1.4) & (Z >= 0.0) & (Z <= 2.2)

    # Radial partition orthostats + pillar stone
    part_mask = np.zeros_like(interior_open)
    for ang_deg in (-145, -100, -52, 0, 52, 100, 145):
        ang = math.radians(ang_deg) + math.pi * 0.5
        dx_c = np.cos(ang)
        dy_c = np.sin(ang)
        rx = X
        ry = Y - 8.4
        proj_r = rx * dx_c + ry * dy_c
        perp = np.abs(-rx * dy_c + ry * dx_c)
        slab = (proj_r >= 1.02) & (proj_r <= 2.05) & (perp <= 0.14) & (Z <= 1.72)
        part_mask |= slab
    # Pillar stone
    part_mask |= ((X - 0.65) ** 2 + (Y - 8.75) ** 2 <= 0.18 ** 2) & (Z <= 1.85)
    interior_part = interior_open & (~part_mask)

    src = (0.0, 8.35, 1.15)
    rec = (-0.55, 8.65, 1.20)

    dom_open = MiniFDTD(xs, ys, zs, interior_open, exterior, alpha_wall=0.024, alpha_floor=0.06)
    tr_open, _ = dom_open.run(src, rec, duration_s=1.4)
    ref = _mini_free_field_ref(len(tr_open))
    db_open = _deconvolve_mini(tr_open, ref, f_grid)
    pk_open = _extract_band_peak(f_grid, db_open, 90.0, 125.0)

    dom_part = MiniFDTD(xs, ys, zs, interior_part, exterior, alpha_wall=0.024, alpha_floor=0.06)
    tr_part, _ = dom_part.run(src, rec, duration_s=1.4)
    db_part = _deconvolve_mini(tr_part, ref, f_grid)
    pk_part = _extract_band_peak(f_grid, db_part, 90.0, 125.0)

    _, dft_part = dom_part.run(src, rec, duration_s=1.1, capture_mode_hz=pk_part["peak_hz"])
    vol_pack = _pack_mode_volume(dom_part, dft_part)
    print(f"[FDTD Loughcrew Test #2] {time.time() - t0:.2f}s | open={pk_open} | partitioned={pk_part}")

    return {
        "with_partitions_db": [round(float(x), 2) for x in db_part],
        "without_partitions_db": [round(float(x), 2) for x in db_open],
        "with_partitions_peak": pk_part,
        "without_partitions_peak": pk_open,
    }, vol_pack


def run_newgrange_roofbox_test(f_grid: np.ndarray) -> Dict[str, object]:
    """Test #4: Exterior source at Newgrange Roof-Box slit vs Entrance Doorway -> Chamber Center."""
    t0 = time.time()
    dom = FDTDDomain()
    n_steps = int(round(1.25 * (1.0 / (0.54 * 0.12 / 338.6532))))
    ref = compute_free_field_reference(n_steps)
    chamber_rec = {"chamber": (0.0, 20.55, 3.35), "passage": (0.0, 10.0, 2.35)}

    res_rb = dom.run((0.0, -0.18, 2.28), chamber_rec, duration_s=1.25)
    freqs_ng, db_rb_ch, _ = deconvolve_fdtd_ir(res_rb["recordings"]["chamber"], ref)
    _, db_rb_pas, _ = deconvolve_fdtd_ir(res_rb["recordings"]["passage"], ref)

    res_dr = dom.run((0.0, -0.18, 1.05), chamber_rec, duration_s=1.25)
    _, db_dr_ch, _ = deconvolve_fdtd_ir(res_dr["recordings"]["chamber"], ref)

    rb_interp = np.interp(f_grid, freqs_ng, db_rb_ch)
    dr_interp = np.interp(f_grid, freqs_ng, db_dr_ch)
    pas_interp = np.interp(f_grid, freqs_ng, db_rb_pas)

    mask_95_120 = (f_grid >= 95.0) & (f_grid <= 120.0)
    pk_rb = float(np.max(rb_interp[mask_95_120]))
    pk_dr = float(np.max(dr_interp[mask_95_120]))
    print(f"[FDTD Roof-Box Test #4] {time.time() - t0:.2f}s | Roof-box peak(95-120Hz)={pk_rb:.2f} dB vs Doorway={pk_dr:.2f} dB")

    return {
        "roofbox_to_chamber_db": [round(float(x), 2) for x in rb_interp],
        "doorway_to_chamber_db": [round(float(x), 2) for x in dr_interp],
        "roofbox_to_passage_db": [round(float(x), 2) for x in pas_interp],
        "roofbox_peak_95_120_db": round(pk_rb, 2),
        "doorway_peak_95_120_db": round(pk_dr, 2),
        "delta_db": round(pk_rb - pk_dr, 2),
    }


def compute_helmholtz_curves() -> Dict[str, object]:
    """Lumped Helmholtz resonator model comparing sealed Maeshowe (~2.0 Hz) vs permeable Newgrange."""
    freqs = np.linspace(0.2, 8.0, 157)

    def response_curve(f0: float, q_base: float, leak_factor: float) -> List[float]:
        # Higher wall permeability adds parallel acoustic conductance G_leak, crashing Q_eff < 0.5
        q_eff = q_base / (1.0 + leak_factor * q_base)
        mag = 1.0 / np.sqrt((1.0 - (freqs / f0) ** 2) ** 2 + (freqs / (f0 * max(0.25, q_eff))) ** 2)
        return [round(float(20.0 * math.log10(max(m, 1e-4))), 2) for m in mag]

    return {
        "freqs_hz": [round(float(f), 3) for f in freqs],
        "maeshowe_sealed_db": response_curve(f0=2.00, q_base=14.0, leak_factor=0.0),
        "newgrange_permeable_db": response_curve(f0=1.55, q_base=12.0, leak_factor=2.2),
        "maeshowe_parameters": {"volume_m3": 92.0, "f0_hz": 2.00, "measured_walking_db": 120.0, "measured_drum_db": 110.0},
        "newgrange_parameters": {"volume_m3": 108.1, "predicted_f0_hz": 1.55, "measured_response_db": 0.0},
    }


def run_all_chambers_data(chambers_root: str) -> None:
    data_dir = os.path.join(chambers_root, "data")
    os.makedirs(data_dir, exist_ok=True)

    f_grid = np.arange(20.0, 261.0, 1.0)
    maeshowe_res, maeshowe_vol = run_maeshowe_fdtd(f_grid)
    loughcrew_res, loughcrew_vol = run_loughcrew_experiment(f_grid)
    roofbox_res = run_newgrange_roofbox_test(f_grid)
    helmholtz_res = compute_helmholtz_curves()

    # Load pre-computed Newgrange primary FRF & passage standing wave from newgrange/acoustics/acoustic_report.json
    ng_report_path = os.path.join(DOLMENS_ROOT, "newgrange", "acoustics", "acoustic_report.json")
    with open(ng_report_path, "r", encoding="utf-8") as fp:
        ng_rep = json.load(fp)
    ng_frf_freqs = np.array(ng_rep["fdtd_simulation"]["frf_chart"]["freqs_hz"])
    ng_frf_vals = np.array(ng_rep["fdtd_simulation"]["frf_chart"]["chamber_center_db"])
    ng_interp = np.interp(f_grid, ng_frf_freqs, ng_frf_vals)

    # Pack comparative_modes_3d.bin (Maeshowe + Loughcrew L; Newgrange uses ../newgrange/acoustics/eigenmodes_3d.bin)
    bin_path = os.path.join(data_dir, "comparative_modes_3d.bin")
    volumes_meta = {}
    with open(bin_path, "wb") as fb:
        for key, pack in [("maeshowe", maeshowe_vol), ("loughcrew_l", loughcrew_vol)]:
            dims, bbox, mask_zyx, u8_zyx = pack
            offset = fb.tell()
            fb.write(struct.pack("<3I6f", dims[0], dims[1], dims[2], *bbox))
            fb.write(mask_zyx.tobytes())
            fb.write(u8_zyx.tobytes())
            volumes_meta[key] = {
                "byteOffset": offset,
                "dims_xyz": dims,
                "bbox_m": bbox,
            }

    maeshowe_ideal = ideal_box_modes(4.7, 4.7, 4.5, SPEED_OF_SOUND_20C, 130.0)
    maeshowe_in_band = [m for m in maeshowe_ideal if 95.0 <= m["freq_hz"] <= 120.0]

    payload = {
        "article": {
            "title": "The Note in the Stone",
            "url": "https://thenommo.com/articles/megalithic-chamber-acoustics-newgrange-maeshowe.html",
            "published": "2026-11-10",
            "updated": "2026-11-12",
            "summary": "Comparative archaeoacoustic evidence across six Neolithic & Iron Age chambers (95–120 Hz standing waves) and Maeshowe's 2 Hz Helmholtz resonance vs Newgrange's permeable silence.",
        },
        "sites": SITES,
        "voice_benchmarks": VOICE_BENCHMARKS,
        "ideal_box_maeshowe": {
            "dims_m": [4.7, 4.7, 4.5],
            "c_m_s": SPEED_OF_SOUND_20C,
            "total_below_130_hz": len(maeshowe_ideal),
            "in_95_120_hz": len(maeshowe_in_band),
            "stacked_109_8_hz": [m for m in maeshowe_in_band if abs(m["freq_hz"] - 109.79) < 0.1],
            "modes": maeshowe_ideal,
        },
        "fdtd_comparison": {
            "freqs_hz": f_grid.tolist(),
            "maeshowe_db": maeshowe_res["frf_db"],
            "maeshowe_peak": maeshowe_res["peak_95_120"],
            "newgrange_db": [round(float(x), 2) for x in ng_interp],
            "newgrange_primary_hz": ng_rep["fdtd_simulation"]["target_110_hz"],
            "newgrange_passage_standing_wave": ng_rep["fdtd_simulation"]["passage_standing_wave"],
        },
        "experiments": {
            "test1_square_vs_irregular": {
                "maeshowe_peak": maeshowe_res["peak_95_120"],
                "newgrange_peak_hz": ng_rep["fdtd_simulation"]["target_110_hz"],
                "ideal_stacked_hz": 109.79,
            },
            "test2_loughcrew_partitions": loughcrew_res,
            "test3_helmholtz_sealing": helmholtz_res,
            "test4_newgrange_roofbox_mouthpiece": roofbox_res,
        },
        "comparative_3d_volumes": {
            "binary_file": "comparative_modes_3d.bin",
            "volumes": volumes_meta,
        },
        "neuro_and_comparative": NEURO_AND_COMPARATIVE,
        "sources": SOURCES,
    }

    with open(os.path.join(data_dir, "chamber_acoustics_data.json"), "w", encoding="utf-8") as fj:
        json.dump(payload, fj, indent=2)
    print(f"[Simulate] Wrote chamber_acoustics_data.json & comparative_modes_3d.bin")


if __name__ == "__main__":
    run_all_chambers_data(os.path.abspath(os.path.join(THIS_DIR, "..")))
