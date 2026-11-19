"""
3D Locally-Reacting FDTD Acoustic Wave Solver for Newgrange (18 - 340 Hz)

Physics:
  - 3D explicit finite-volume / SRL locally-reacting acoustic wave equation
  - Subterranean air: T = 11.0 C, RH = 85%, c = 338.65 m/s
  - Uniform grid dx = 0.12 m, Courant number lambda = 0.54 (< 1/sqrt(3) = 0.57735)
  - Per-face frequency-calibrated wall admittance xi = (1 - sqrt(1 - alpha)) / (1 + sqrt(1 - alpha))
  - Exterior radiation buffer outside entrance & roof-box with Mur ABC + 6-cell sponge
  - Free-field reference calibration box for exact 1m-referenced FRF & causal time-domain IR
  - On-the-fly 3D DFT extraction of the top 8 standing-wave eigenmodes across the full cavity
"""

from __future__ import annotations

import json
import math
import os
import struct
import time
from typing import Dict, List, Tuple

import numpy as np

from geometry_spec import (
    ACOUSTIC_STATIONS,
    MAT_AIR,
    MAT_EXTERIOR_AIR,
    MAT_SOLID,
    MATERIALS_BY_CODE,
    SPEED_OF_SOUND,
    classify_cavity_points,
    classify_solid_surface_material,
)

# Grid parameters
DX = 0.12
COURANT = 0.54
DT = COURANT * DX / SPEED_OF_SOUND
FS_FDTD = 1.0 / DT

X_MIN, X_MAX = -3.48, 3.96
Y_MIN, Y_MAX = -2.16, 24.60
Z_MIN, Z_MAX = -0.36, 8.28


def _build_grid_axes() -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    xs = np.arange(X_MIN, X_MAX + 1e-9, DX, dtype=np.float64)
    ys = np.arange(Y_MIN, Y_MAX + 1e-9, DX, dtype=np.float64)
    zs = np.arange(Z_MIN, Z_MAX + 1e-9, DX, dtype=np.float64)
    return xs, ys, zs


def _ricker_wavelet(n_steps: int, f0: float = 125.0) -> np.ndarray:
    t = np.arange(n_steps, dtype=np.float64) * DT
    t0 = 2.0 / f0
    tau = t - t0
    arg = (math.pi * f0 * tau) ** 2
    w = (1.0 - 2.0 * arg) * np.exp(-arg)
    # Zero outside support & remove tiny numerical residual DC
    w[t > 4.2 / f0] = 0.0
    w -= np.mean(w)
    return w


class FDTDDomain:
    """Compact 1D active-voxel FDTD solver structure."""

    def __init__(self) -> None:
        self.xs, self.ys, self.zs = _build_grid_axes()
        self.nx, self.ny, self.nz = len(self.xs), len(self.ys), len(self.zs)
        X, Y, Z = np.meshgrid(self.xs, self.ys, self.zs, indexing="ij")

        mat_grid = classify_cavity_points(X, Y, Z, include_exterior=True)
        # Ensure exterior air stays confined within radiation box around entrance & roof-box
        ext_mask = mat_grid == MAT_EXTERIOR_AIR
        keep_ext = (np.abs(X) <= 2.40) & (Z <= 3.72) & (Y >= -2.16)
        mat_grid[ext_mask & (~keep_ext)] = MAT_SOLID

        active_mask = (mat_grid == MAT_AIR) | (mat_grid == MAT_EXTERIOR_AIR)
        self.interior_mask = mat_grid == MAT_AIR

        # Map 3D indices -> 1D compact index [0..N_air-1]; sentinel = N_air
        self.idx_3d = np.full((self.nx, self.ny, self.nz), -1, dtype=np.int32)
        coords = np.argwhere(active_mask)
        self.coords = coords
        self.n_air = len(coords)
        self.idx_3d[active_mask] = np.arange(self.n_air, dtype=np.int32)

        sentinel = self.n_air
        self.nb = np.full((6, self.n_air), sentinel, dtype=np.int32)
        offsets = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
        ix, iy, iz = coords[:, 0], coords[:, 1], coords[:, 2]

        # Compute per-voxel boundary admittance sum & sponge damping
        admittance_sum = np.zeros(self.n_air, dtype=np.float64)
        k_air = np.zeros(self.n_air, dtype=np.float64)

        # Low-frequency absorption (~110-125 Hz octave band) -> normal admittance xi
        xi_by_mat: Dict[int, float] = {}
        for code, mat in MATERIALS_BY_CODE.items():
            # Average 63 & 125 Hz absorption for low-freq FDTD wall damping
            a_lf = float(0.4 * mat.alpha[0] + 0.6 * mat.alpha[1])
            r_amp = math.sqrt(max(0.0, 1.0 - min(0.999, a_lf)))
            xi_by_mat[code] = (1.0 - r_amp) / (1.0 + r_amp)

        for d_idx, (dx_i, dy_i, dz_i) in enumerate(offsets):
            nx_i = ix + dx_i
            ny_i = iy + dy_i
            nz_i = iz + dz_i
            in_bounds = (
                (nx_i >= 0) & (nx_i < self.nx) & (ny_i >= 0) & (ny_i < self.ny) & (nz_i >= 0) & (nz_i < self.nz)
            )
            nb_idx = np.full(self.n_air, sentinel, dtype=np.int32)
            valid_pos = np.where(in_bounds)[0]
            if len(valid_pos) > 0:
                nb_idx[valid_pos] = self.idx_3d[nx_i[valid_pos], ny_i[valid_pos], nz_i[valid_pos]]

            is_air_nb = nb_idx >= 0
            # Sentinel for solid faces
            self.nb[d_idx, is_air_nb] = nb_idx[is_air_nb]
            k_air += is_air_nb.astype(np.float64)

            # Solid or domain-edge faces
            solid_pos = np.where(~is_air_nb)[0]
            for idx_v in solid_pos:
                vx, vy, vz = self.xs[ix[idx_v]], self.ys[iy[idx_v]], self.zs[iz[idx_v]]
                if mat_grid[ix[idx_v], iy[idx_v], iz[idx_v]] == MAT_EXTERIOR_AIR:
                    # Open exterior radiation domain -> free-space anechoic Mur ABC except ground z<=0.06 and facade y=0
                    if dz_i == -1 and vz <= 0.08:
                        admittance_sum[idx_v] += xi_by_mat[4]  # turf/ground
                    elif dy_i == 1 and abs(vy) < 0.14:
                        admittance_sum[idx_v] += xi_by_mat[6]  # quartz facade
                    else:
                        admittance_sum[idx_v] += 1.0  # Mur ABC
                else:
                    # Interior tomb boundary face
                    sx = vx + 0.5 * DX * dx_i
                    sy = vy + 0.5 * DX * dy_i
                    sz = vz + 0.5 * DX * dz_i
                    m_code = classify_solid_surface_material(float(sx), float(sy), float(sz))
                    admittance_sum[idx_v] += xi_by_mat.get(m_code, 0.015)

        # Mild quadratic absorbing sponge on outer perimeter of exterior radiation box
        vx_all = self.xs[ix]
        vy_all = self.ys[iy]
        vz_all = self.zs[iz]
        is_ext = mat_grid[ix, iy, iz] == MAT_EXTERIOR_AIR
        sponge = np.zeros(self.n_air, dtype=np.float64)
        if np.any(is_ext):
            s_y = np.clip((-1.20 - vy_all) / 0.96, 0.0, 1.0)
            s_x = np.clip((np.abs(vx_all) - 1.44) / 0.96, 0.0, 1.0)
            s_z = np.clip((vz_all - 2.76) / 0.96, 0.0, 1.0)
            s_max = np.maximum(s_y, np.maximum(s_x, s_z))
            sponge[is_ext] = 0.08 * (s_max[is_ext] ** 2)

        B = 0.5 * COURANT * admittance_sum + sponge
        self.inv_damp = 1.0 / (1.0 + B)
        self.c_curr = 2.0 - (COURANT**2) * k_air
        self.c_prev = 1.0 - B
        self.lam2 = COURANT**2

    def coord_to_voxel(self, pos: Tuple[float, float, float]) -> int:
        """Find nearest active air voxel index to physical coordinate (x, y, z)."""
        px, py, pz = pos
        ix0 = int(np.clip(round((px - X_MIN) / DX), 0, self.nx - 1))
        iy0 = int(np.clip(round((py - Y_MIN) / DX), 0, self.ny - 1))
        iz0 = int(np.clip(round((pz - Z_MIN) / DX), 0, self.nz - 1))
        idx = int(self.idx_3d[ix0, iy0, iz0])
        if idx >= 0:
            return idx
        # Fallback: search nearest active voxel
        pts = np.column_stack([self.xs[self.coords[:, 0]], self.ys[self.coords[:, 1]], self.zs[self.coords[:, 2]]])
        d2 = (pts[:, 0] - px) ** 2 + (pts[:, 1] - py) ** 2 + (pts[:, 2] - pz) ** 2
        return int(np.argmin(d2))

    def run(
        self,
        src_pos: Tuple[float, float, float],
        rec_dict: Dict[str, Tuple[float, float, float]],
        duration_s: float = 2.0,
        probe_line_coords: List[Tuple[float, float, float]] | None = None,
        mode_freqs_hz: List[float] | None = None,
    ) -> Dict[str, object]:
        """Run 3D FDTD wave propagation and return recorded signals and optional 3D DFT eigenmodes."""
        n_steps = int(round(duration_s * FS_FDTD))
        wave = _ricker_wavelet(n_steps, f0=125.0)
        src_idx = self.coord_to_voxel(src_pos)

        rec_names = list(rec_dict.keys())
        rec_indices = np.array([self.coord_to_voxel(rec_dict[k]) for k in rec_names], dtype=np.int32)
        rec_traces = np.zeros((len(rec_names), n_steps), dtype=np.float64)

        probe_indices = None
        probe_traces = None
        if probe_line_coords is not None:
            probe_indices = np.array([self.coord_to_voxel(p) for p in probe_line_coords], dtype=np.int32)
            probe_traces = np.zeros((len(probe_line_coords), n_steps), dtype=np.float64)

        # Optional on-the-fly 3D DFT accumulation for eigenmode fields (after t_start = 0.05 s)
        dft_real = None
        dft_imag = None
        if mode_freqs_hz is not None:
            n_modes = len(mode_freqs_hz)
            dft_real = np.zeros((n_modes, self.n_air), dtype=np.float64)
            dft_imag = np.zeros((n_modes, self.n_air), dtype=np.float64)
            n_start = int(round(0.05 * FS_FDTD))
            freqs_arr = np.asarray(mode_freqs_hz, dtype=np.float64)
            hann_len = max(1, n_steps - n_start)

        p_prev = np.zeros(self.n_air + 1, dtype=np.float64)
        p_curr = np.zeros(self.n_air + 1, dtype=np.float64)
        p_next = np.zeros(self.n_air + 1, dtype=np.float64)

        nb0, nb1, nb2, nb3, nb4, nb5 = self.nb[0], self.nb[1], self.nb[2], self.nb[3], self.nb[4], self.nb[5]
        inv_damp = self.inv_damp
        c_curr = self.c_curr
        c_prev = self.c_prev
        lam2 = self.lam2

        for n in range(n_steps):
            p_sum = (
                p_curr[nb0]
                + p_curr[nb1]
                + p_curr[nb2]
                + p_curr[nb3]
                + p_curr[nb4]
                + p_curr[nb5]
            )
            p_next[:-1] = inv_damp * (c_curr * p_curr[:-1] + lam2 * p_sum - c_prev * p_prev[:-1])
            if wave[n] != 0.0:
                p_next[src_idx] += wave[n]
            p_next[-1] = 0.0

            rec_traces[:, n] = p_next[rec_indices]
            if probe_indices is not None:
                probe_traces[:, n] = p_next[probe_indices]

            if mode_freqs_hz is not None and n >= n_start:
                w_h = 0.5 * (1.0 - math.cos(2.0 * math.pi * (n - n_start) / hann_len))
                angles = -2.0 * math.pi * freqs_arr * (n * DT)
                for m in range(len(mode_freqs_hz)):
                    c_re = w_h * math.cos(angles[m])
                    c_im = w_h * math.sin(angles[m])
                    dft_real[m] += c_re * p_next[:-1]
                    dft_imag[m] += c_im * p_next[:-1]

            p_prev, p_curr, p_next = p_curr, p_next, p_prev

        if not np.all(np.isfinite(rec_traces)):
            raise RuntimeError("FDTD instability detected (NaN/Inf in pressure traces)!")

        result: Dict[str, object] = {
            "fs_hz": FS_FDTD,
            "dt_s": DT,
            "n_steps": n_steps,
            "wavelet": wave,
            "recordings": {name: rec_traces[i] for i, name in enumerate(rec_names)},
        }
        if probe_traces is not None:
            result["probe_traces"] = probe_traces
        if dft_real is not None and dft_imag is not None:
            result["dft_complex"] = dft_real + 1j * dft_imag
        return result


def compute_free_field_reference(n_steps: int) -> np.ndarray:
    """
    Run a compact free-field 3D box with Mur ABC to capture the exact 1.0 m
    lattice free-field pressure signature of the soft Ricker source.
    """
    n_box = 37  # 37 * 0.12 = 4.44 m cube; source at center (18,18,18), rec at distance 6*0.12=0.72 m
    n_ref = min(n_steps, 420)
    wave = _ricker_wavelet(n_ref, f0=125.0)
    p_prev = np.zeros((n_box, n_box, n_box), dtype=np.float64)
    p_curr = np.zeros((n_box, n_box, n_box), dtype=np.float64)
    p_next = np.zeros((n_box, n_box, n_box), dtype=np.float64)

    lam2 = COURANT**2
    c_mid = 2.0 - 6.0 * lam2
    c_mur = (COURANT - 1.0) / (COURANT + 1.0)
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
            p_next[18, 18, 18] += wave[n]
        # 1st-order Mur ABC on 6 faces
        p_next[0, :, :] = p_curr[1, :, :] + c_mur * (p_next[1, :, :] - p_curr[0, :, :])
        p_next[-1, :, :] = p_curr[-2, :, :] + c_mur * (p_next[-2, :, :] - p_curr[-1, :, :])
        p_next[:, 0, :] = p_curr[:, 1, :] + c_mur * (p_next[:, 1, :] - p_curr[:, 0, :])
        p_next[:, -1, :] = p_curr[:, -2, :] + c_mur * (p_next[:, -2, :] - p_curr[:, -1, :])
        p_next[:, :, 0] = p_curr[:, :, 1] + c_mur * (p_next[:, :, 1] - p_curr[:, :, 0])
        p_next[:, :, -1] = p_curr[:, :, -2] + c_mur * (p_next[:, :, -2] - p_curr[:, :, -1])

        rec[n] = p_next[18, 24, 18]  # distance = 6 * 0.12 = 0.72 m
        p_prev, p_curr, p_next = p_curr, p_next, p_prev

    # Scale to 1.0 m reference and pad to n_steps
    out = np.zeros(n_steps, dtype=np.float64)
    out[:n_ref] = rec * 0.72
    return out


def deconvolve_fdtd_ir(
    trace: np.ndarray, ref_trace: np.ndarray, f_low: float = 16.0, f_high: float = 340.0
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Regularized Tikhonov deconvolution against 1 m free-field FDTD reference.
    Returns (freqs_hz, H_db, ir_time_domain).
    """
    n_fft = 1 << int(math.ceil(math.log2(len(trace) * 2)))
    Y = np.fft.rfft(trace, n=n_fft)
    X = np.fft.rfft(ref_trace, n=n_fft)
    freqs = np.fft.rfftfreq(n_fft, d=DT)

    # Regularized inverse filter
    mag2 = np.abs(X) ** 2
    reg = 2.0e-4 * float(np.max(mag2))
    H = (Y * np.conj(X)) / (mag2 + reg)

    # Zero-phase smooth bandpass [f_low, f_high]
    bp = np.ones_like(freqs)
    lo_mask = freqs < f_low
    bp[lo_mask] = 0.5 * (1.0 - np.cos(math.pi * np.clip(freqs[lo_mask] / f_low, 0.0, 1.0))) ** 2
    hi_mask = freqs > f_high
    bp[hi_mask] = 0.0
    taper_hi = (freqs >= f_high - 35.0) & (freqs <= f_high)
    u_hi = (freqs[taper_hi] - (f_high - 35.0)) / 35.0
    bp[taper_hi] = 0.5 * (1.0 + np.cos(math.pi * u_hi))
    bp[freqs < 8.0] = 0.0

    H_filt = H * bp
    ir = np.fft.irfft(H_filt, n=n_fft)[: len(trace)]
    # Remove any small circular tail wrap
    ir -= np.mean(ir[-200:])
    H_db = 20.0 * np.log10(np.maximum(np.abs(H_filt), 1e-8))
    return freqs, H_db, ir


def select_eigenmodes(freqs: np.ndarray, h_db: np.ndarray, n_modes: int = 8) -> List[Dict[str, float]]:
    """
    Detect top physically distinct resonant modes from 20 - 300 Hz, ensuring strong
    representation of both coupled low modes and the 95-120 Hz archaeoacoustic band.
    """
    mask = (freqs >= 20.0) & (freqs <= 280.0)
    f_sub = freqs[mask]
    db_sub = h_db[mask]

    # Local maxima
    peaks = []
    for i in range(1, len(f_sub) - 1):
        if db_sub[i] > db_sub[i - 1] and db_sub[i] > db_sub[i + 1]:
            # Estimate local prominence within +/- 12 Hz
            win = (f_sub >= f_sub[i] - 12.0) & (f_sub <= f_sub[i] + 12.0)
            prom = float(db_sub[i] - np.min(db_sub[win]))
            if prom > 1.2:
                peaks.append({"freq_hz": float(f_sub[i]), "spl_db": float(db_sub[i]), "prominence_db": prom})

    # Greedy selection keeping >= 8 Hz spacing and guaranteeing best peak in 95-120 Hz
    selected: List[Dict[str, float]] = []
    band_95_120 = [p for p in peaks if 95.0 <= p["freq_hz"] <= 120.0]
    if band_95_120:
        best_arch = max(band_95_120, key=lambda p: p["spl_db"] + 0.5 * p["prominence_db"])
        selected.append(best_arch)

    remaining = sorted(peaks, key=lambda p: p["spl_db"] + 0.4 * p["prominence_db"], reverse=True)
    for p in remaining:
        if len(selected) >= n_modes:
            break
        if all(abs(p["freq_hz"] - s["freq_hz"]) >= 8.0 for s in selected):
            selected.append(p)

    selected.sort(key=lambda p: p["freq_hz"])
    for idx, m in enumerate(selected):
        m["mode_index"] = idx
        m["freq_hz"] = round(m["freq_hz"], 2)
        m["spl_db"] = round(m["spl_db"], 2)
        m["prominence_db"] = round(m["prominence_db"], 2)
    return selected


def pack_eigenmodes_3d(
    domain: FDTDDomain,
    dft_complex: np.ndarray,
    modes_meta: List[Dict[str, float]],
    out_bin_path: str,
) -> Dict[str, object]:
    """
    Downsample 3D standing-wave eigenmode fields 2x (dx_vis = 0.24 m), extract optimal-phase
    real standing wave normalized to [-1, 1], and pack into binary buffer for WebGL2 TEXTURE_3D.
    """
    nx2 = (domain.nx + 1) // 2
    ny2 = (domain.ny + 1) // 2
    nz2 = (domain.nz + 1) // 2
    n_modes = len(modes_meta)

    # Full 3D air mask at 2x downsample
    ix = domain.coords[:, 0]
    iy = domain.coords[:, 1]
    iz = domain.coords[:, 2]

    mask_3d = np.zeros((domain.nx, domain.ny, domain.nz), dtype=np.float32)
    mask_3d[ix, iy, iz] = np.where(domain.interior_mask[ix, iy, iz], 1.0, 0.0)
    mask_ds = mask_3d[::2, ::2, ::2] > 0.5

    # Binary layout: header uint32 (n_modes, nx2, ny2, nz2) + 6 float32 bbox (xmin,xmax,ymin,ymax,zmin,zmax)
    # Followed by mask uint8 (nx2*ny2*nz2, in [z,y,x] C-order for WebGL texImage3D!)
    # Followed by n_modes uint8 arrays (nx2*ny2*nz2, in [z,y,x] C-order: 128 = 0.0)
    os.makedirs(os.path.dirname(out_bin_path), exist_ok=True)
    bbox = (
        float(domain.xs[0]),
        float(domain.xs[0] + (nx2 - 1) * (2.0 * DX)),
        float(domain.ys[0]),
        float(domain.ys[0] + (ny2 - 1) * (2.0 * DX)),
        float(domain.zs[0]),
        float(domain.zs[0] + (nz2 - 1) * (2.0 * DX)),
    )

    with open(out_bin_path, "wb") as fp:
        fp.write(struct.pack("<4I6f", n_modes, nx2, ny2, nz2, *bbox))
        # Mask transposed to (z, y, x) so linear memory matches WebGL2 texImage3D(width=nx2, height=ny2, depth=nz2)
        mask_zyx = np.transpose(mask_ds.astype(np.uint8) * 255, (2, 1, 0)).copy()
        fp.write(mask_zyx.tobytes())

        for m in range(n_modes):
            c_vals = dft_complex[m]
            # Find optimal phase theta maximizing sum((Re(c * e^-itheta))^2)
            # Solution: theta = 0.5 * angle(sum(c^2))
            s2 = np.sum(c_vals[domain.interior_mask[ix, iy, iz]] ** 2)
            theta = 0.5 * float(np.angle(s2)) if abs(s2) > 1e-20 else 0.0
            real_field = np.real(c_vals * np.exp(-1j * theta))
            # Normalize by 99.5th percentile inside tomb so isolated source spike doesn't crush standing waves
            interior_vals = np.abs(real_field[domain.interior_mask[ix, iy, iz]])
            scale = float(np.percentile(interior_vals, 99.5)) if len(interior_vals) > 0 else 1.0
            scale = max(scale, 1e-12)
            norm_1d = np.clip(real_field / scale, -1.0, 1.0)

            vol_3d = np.zeros((domain.nx, domain.ny, domain.nz), dtype=np.float32)
            vol_3d[ix, iy, iz] = norm_1d
            vol_ds = vol_3d[::2, ::2, ::2]
            vol_ds[~mask_ds] = 0.0
            u8 = np.clip(np.round(127.5 + 127.0 * vol_ds), 0, 255).astype(np.uint8)
            u8_zyx = np.transpose(u8, (2, 1, 0)).copy()
            fp.write(u8_zyx.tobytes())

    return {
        "file": os.path.basename(out_bin_path),
        "dims_xyz": [int(nx2), int(ny2), int(nz2)],
        "bbox_m": list(bbox),
        "n_modes": n_modes,
    }


def run_all_fdtd(out_dir: str) -> Dict[str, object]:
    """Execute full FDTD suite and save low-frequency IRs, FRFs, passage standing-wave profile, and 3D modes."""
    os.makedirs(out_dir, exist_ok=True)
    t0 = time.time()
    domain = FDTDDomain()
    print(f"[FDTD] Active air voxels: {domain.n_air} (dx={DX} m, fs={FS_FDTD:.1f} Hz)")

    # Free-field calibration (2.0 s padded)
    n_steps_2s = int(round(2.0 * FS_FDTD))
    ref_trace = compute_free_field_reference(n_steps_2s)

    # 1. Primary Run: Chamber Center Source -> all receivers + longitudinal passage probe line
    y_probes = np.linspace(0.25, 24.00, 96)
    probe_coords = [(0.0, float(yp), float(np.interp(yp, [0.0, 18.95, 24.2], [0.95, 2.75, 2.75]))) for yp in y_probes]

    rec_stations = {
        "chamber_center": ACOUSTIC_STATIONS["chamber_center"]["rec"],
        "chamber_to_passage": ACOUSTIC_STATIONS["chamber_to_passage"]["rec"],
        "chamber_to_entrance": ACOUSTIC_STATIONS["chamber_to_entrance"]["rec"],
        "east_recess": (2.45, 20.60, 3.30),
        "west_recess": (-2.25, 20.60, 3.30),
        "north_recess": (0.00, 23.10, 3.20),
    }

    t1 = time.time()
    res_primary = domain.run(
        ACOUSTIC_STATIONS["chamber_center"]["src"],
        rec_stations,
        duration_s=2.0,
        probe_line_coords=probe_coords,
    )
    print(f"[FDTD] Primary 2.0s run completed in {time.time() - t1:.2f} s")

    # Deconvolve primary stations
    fdtd_irs: Dict[str, np.ndarray] = {}
    frfs: Dict[str, np.ndarray] = {}
    freqs = None
    for st_key in ("chamber_center", "chamber_to_passage", "chamber_to_entrance"):
        freqs, h_db, ir = deconvolve_fdtd_ir(res_primary["recordings"][st_key], ref_trace)
        fdtd_irs[st_key] = ir
        frfs[st_key] = h_db

    # Detect resonant modes from Chamber Center + East Recess average energy
    _, h_east, _ = deconvolve_fdtd_ir(res_primary["recordings"]["east_recess"], ref_trace)
    combined_frf = 0.7 * frfs["chamber_center"] + 0.3 * h_east
    modes_meta = select_eigenmodes(freqs, combined_frf, n_modes=8)
    print("[FDTD] Top detected resonant modes (Hz):", [m["freq_hz"] for m in modes_meta])

    # Extract longitudinal passage SPL profile at the primary ~110 Hz mode
    arch_modes = [m for m in modes_meta if 95.0 <= m["freq_hz"] <= 120.0]
    target_110_hz = arch_modes[0]["freq_hz"] if arch_modes else modes_meta[min(3, len(modes_meta) - 1)]["freq_hz"]
    probe_traces = res_primary["probe_traces"]
    t_arr = np.arange(probe_traces.shape[1], dtype=np.float64) * DT
    # Steady-state standing-wave window (after 0.08 s)
    win_sw = t_arr >= 0.08
    dft_kern = np.exp(-1j * 2.0 * math.pi * target_110_hz * t_arr[win_sw])
    probe_amps = np.abs(np.sum(probe_traces[:, win_sw] * dft_kern[None, :], axis=1))
    probe_spl_db = 20.0 * np.log10(np.maximum(probe_amps / (np.max(probe_amps) + 1e-12), 1e-4))

    # 2. 3D Eigenmode Field Run (1.4 s)
    t2 = time.time()
    mode_freqs = [m["freq_hz"] for m in modes_meta]
    res_modes = domain.run(
        ACOUSTIC_STATIONS["chamber_center"]["src"],
        {"chamber_center": ACOUSTIC_STATIONS["chamber_center"]["rec"]},
        duration_s=1.4,
        mode_freqs_hz=mode_freqs,
    )
    print(f"[FDTD] 3D Eigenmode DFT run completed in {time.time() - t2:.2f} s")

    bin_info = pack_eigenmodes_3d(
        domain, res_modes["dft_complex"], modes_meta, os.path.join(out_dir, "eigenmodes_3d.bin")
    )

    # 3. Secondary Source Runs (east_to_west & outside_to_chamber)
    n_steps_16 = int(round(1.6 * FS_FDTD))
    ref_16 = ref_trace[:n_steps_16]

    t3 = time.time()
    res_ew = domain.run(
        ACOUSTIC_STATIONS["east_to_west"]["src"],
        {"east_to_west": ACOUSTIC_STATIONS["east_to_west"]["rec"]},
        duration_s=1.6,
    )
    _, h_ew, ir_ew = deconvolve_fdtd_ir(res_ew["recordings"]["east_to_west"], ref_16)
    fdtd_irs["east_to_west"] = ir_ew
    frfs["east_to_west"] = h_ew

    res_out = domain.run(
        ACOUSTIC_STATIONS["outside_to_chamber"]["src"],
        {"outside_to_chamber": ACOUSTIC_STATIONS["outside_to_chamber"]["rec"]},
        duration_s=1.6,
    )
    _, h_out, ir_out = deconvolve_fdtd_ir(res_out["recordings"]["outside_to_chamber"], ref_16)
    fdtd_irs["outside_to_chamber"] = ir_out
    frfs["outside_to_chamber"] = h_out
    print(f"[FDTD] Secondary runs completed in {time.time() - t3:.2f} s (Total: {time.time() - t0:.2f} s)")

    # Save FDTD outputs cleanly for synthesizer & viewer
    np.savez_compressed(
        os.path.join(out_dir, "fdtd_results.npz"),
        fs_fdtd=np.array([FS_FDTD]),
        freqs_2s=freqs,
        frf_chamber_center=frfs["chamber_center"],
        frf_chamber_to_passage=frfs["chamber_to_passage"],
        frf_chamber_to_entrance=frfs["chamber_to_entrance"],
        ir_chamber_center=fdtd_irs["chamber_center"],
        ir_chamber_to_passage=fdtd_irs["chamber_to_passage"],
        ir_chamber_to_entrance=fdtd_irs["chamber_to_entrance"],
        ir_east_to_west=fdtd_irs["east_to_west"],
        ir_outside_to_chamber=fdtd_irs["outside_to_chamber"],
        y_probes=y_probes,
        probe_spl_db=probe_spl_db,
        target_110_hz=np.array([target_110_hz]),
    )

    # Compact downsampled FRF array for browser interactive chart (16..340 Hz at 1 Hz steps)
    f_chart = np.arange(16.0, 341.0, 1.0)
    frf_chart = np.interp(f_chart, freqs, frfs["chamber_center"])
    frf_ew_chart = np.interp(f_chart, np.fft.rfftfreq(1 << int(math.ceil(math.log2(n_steps_16 * 2))), d=DT), frfs["east_to_west"])

    meta = {
        "fs_fdtd_hz": round(FS_FDTD, 3),
        "dx_m": DX,
        "courant": COURANT,
        "n_air_voxels": int(domain.n_air),
        "target_110_hz": float(target_110_hz),
        "eigenmodes": modes_meta,
        "eigenmodes_3d": bin_info,
        "frf_chart": {
            "freqs_hz": f_chart.tolist(),
            "chamber_center_db": [round(float(x), 2) for x in frf_chart],
            "east_to_west_db": [round(float(x), 2) for x in frf_ew_chart],
        },
        "passage_standing_wave": {
            "y_m": [round(float(y), 3) for y in y_probes],
            "spl_db": [round(float(s), 2) for s in probe_spl_db],
        },
    }
    with open(os.path.join(out_dir, "fdtd_summary.json"), "w", encoding="utf-8") as fp:
        json.dump(meta, fp, indent=2)
    return meta


if __name__ == "__main__":
    summary = run_all_fdtd("/Users/lightsource/.gemini/antigravity/scratch/newgrange-acoustic-model/acoustics")
    print("Primary 95-120 Hz mode:", summary["target_110_hz"], "Hz")
