"""
Broadband Hybrid Impulse Response Synthesizer (48 kHz Stereo WAV),
ISO 3382 Room Acoustic Parameter Extractor, and Diagnostic Plotting Suite.

Fuses:
  - 3D Locally-Reacting FDTD Wave Simulation (< 280 Hz)
  - 3D Mesh Diffuse Ray-Tracing + ISO 9613-1 Air Absorption (>= 280 Hz)
via a 4th-order zero-phase Linkwitz-Riley FFT crossover at 280 Hz.
"""

from __future__ import annotations

import json
import math
import os
import wave
from typing import Dict, List, Tuple

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from geometry_spec import (
    ACOUSTIC_STATIONS,
    CAPSTONE_Z,
    CHAMBER_CORE_X_MAX,
    CHAMBER_CORE_X_MIN,
    CHAMBER_CORE_Y_MAX,
    CHAMBER_CORE_Y_MIN,
    CHAMBER_FLOOR_Z,
    EAST_RECESS,
    ENTRANCE_DOOR_LEN,
    ENTRANCE_DOOR_Z,
    NORTH_RECESS,
    OCTAVE_BANDS,
    PASSAGE_LEN,
    ROOFBOX_SLIT_Z_MAX,
    ROOFBOX_SLIT_Z_MIN,
    ROOFBOX_Z_MAX,
    ROOFBOX_Z_MIN,
    SPEED_OF_SOUND,
    VAULT_SPRING_Z,
    WEST_RECESS,
    analytical_acoustics_summary,
    floor_z,
    passage_ceil_z,
    passage_half_width,
    verify_solstice_ray,
)

FS_OUT = 48000
IR_DURATION_S = 3.2
N_OUT = int(FS_OUT * IR_DURATION_S)
CROSSOVER_HZ = 280.0


def _resample_fdtd_to_48k(ir_fdtd: np.ndarray, fs_fdtd: float) -> np.ndarray:
    """Exact band-limited FFT sinc upsampling from fs_fdtd (~5226 Hz) to 48000 Hz."""
    n_in = len(ir_fdtd)
    t_in = n_in / fs_fdtd
    n_target_in = int(round(t_in * FS_OUT))
    X = np.fft.rfft(ir_fdtd)
    n_out_rfft = n_target_in // 2 + 1
    Y = np.zeros(n_out_rfft, dtype=np.complex128)
    n_copy = min(len(X), n_out_rfft)
    Y[:n_copy] = X[:n_copy]
    # Scale for DFT length ratio
    y = np.fft.irfft(Y, n=n_target_in) * (n_target_in / float(n_in))
    out = np.zeros(N_OUT, dtype=np.float64)
    n_use = min(N_OUT, len(y))
    out[:n_use] = y[:n_use]
    # Smooth fade-out at end of FDTD capture window so there's zero truncation click
    fade_start = max(0, n_use - int(0.08 * FS_OUT))
    if n_use > fade_start:
        u = np.linspace(0.0, 1.0, n_use - fade_start)
        out[fade_start:n_use] *= 0.5 * (1.0 + np.cos(math.pi * u))
    return out


def _octave_filterbank_masks(freqs: np.ndarray) -> List[np.ndarray]:
    """
    Build energy-complementary zero-phase octave-band masks centered at
    [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] Hz for ray-traced synthesis.
    Sum of squared magnitudes == 1.0 across [150 Hz, 22 kHz].
    """
    centers = [63.0, 125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0]
    edges = [centers[i] * math.sqrt(2.0) for i in range(len(centers) - 1)]
    masks = []
    for b in range(len(centers)):
        m = np.ones_like(freqs)
        if b > 0:
            fc_lo = edges[b - 1]
            # Smooth raised-cosine transition across +/- 30% of edge frequency
            lo0, lo1 = fc_lo * 0.72, fc_lo * 1.38
            u = np.clip((freqs - lo0) / (lo1 - lo0), 0.0, 1.0)
            m *= np.sin(0.5 * math.pi * u)
        if b < len(centers) - 1:
            fc_hi = edges[b]
            hi0, hi1 = fc_hi * 0.72, fc_hi * 1.38
            u = np.clip((freqs - hi0) / (hi1 - hi0), 0.0, 1.0)
            m *= np.cos(0.5 * math.pi * u)
        masks.append(m)
    return masks


def _synthesize_raytrace_stereo(
    times: np.ndarray,
    energies: np.ndarray,
    dirs: np.ndarray,
    rec_facing: Tuple[float, float, float],
    rng: np.random.Generator,
) -> np.ndarray:
    """
    Convert 8-band ray-traced stereo echogram into a 48 kHz stereo broadband IR
    using discrete early reflections (t < 80 ms) + dense velvet-noise diffuse tail.
    """
    if len(times) == 0:
        return np.zeros((2, N_OUT), dtype=np.float64)

    # Listener right-ear axis for ITD/ILD projection
    fwd = np.array(rec_facing, dtype=np.float64)
    fwd /= max(1e-12, float(np.linalg.norm(fwd)))
    up = np.array([0.0, 0.0, 1.0], dtype=np.float64)
    ear_r = np.cross(fwd, up)
    ear_r /= max(1e-12, float(np.linalg.norm(ear_r)))

    # sin_az > 0 => wave arriving from Right (Right ear receives earlier & louder)
    sin_az = np.clip(np.sum(-dirs * ear_r[None, :], axis=1), -1.0, 1.0)
    dt_ear = 0.00032 * sin_az  # +/- 0.32 ms half-head ITD
    ild_r = 1.0 + 0.22 * sin_az
    ild_l = 1.0 - 0.22 * sin_az

    # Extend 8 bands with 16 kHz high-shelf extrapolated from 8 kHz with extra air roll-off
    e9 = np.zeros((len(times), 9), dtype=np.float64)
    e9[:, :8] = energies
    e9[:, 8] = energies[:, 7] * np.exp(-0.04 * times * SPEED_OF_SOUND)

    n_fft = 1 << int(math.ceil(math.log2(N_OUT * 2)))
    freqs = np.fft.rfftfreq(n_fft, d=1.0 / FS_OUT)
    fb_masks = _octave_filterbank_masks(freqs)

    # Early specular hits (t < 0.08 s) + dense diffuse tail bins (2 ms bins for t >= 0.08 s)
    t0_first = float(times[0])
    early_mask = times < t0_first + 0.085
    late_mask = ~early_mask

    bin_dt = 0.002
    n_bins = int(IR_DURATION_S / bin_dt) + 1
    velvet_rate = 2600.0  # impulses/sec for silky diffuse tail
    n_pulses = int(IR_DURATION_S * velvet_rate)
    grid_step = FS_OUT / velvet_rate
    pulse_pos_l = np.clip(
        np.round((np.arange(n_pulses) + rng.uniform(0.05, 0.95, size=n_pulses)) * grid_step).astype(np.int32),
        0,
        N_OUT - 1,
    )
    pulse_pos_r = np.clip(
        np.round((np.arange(n_pulses) + rng.uniform(0.05, 0.95, size=n_pulses)) * grid_step).astype(np.int32),
        0,
        N_OUT - 1,
    )
    pulse_sign_l = rng.choice([-1.0, 1.0], size=n_pulses)
    pulse_sign_r = rng.choice([-1.0, 1.0], size=n_pulses)
    # Normalize pulse density so sum(amp^2) in each bin equals bin energy
    pulses_per_bin = max(1.0, velvet_rate * bin_dt)

    stereo_spec_l = np.zeros(len(freqs), dtype=np.complex128)
    stereo_spec_r = np.zeros(len(freqs), dtype=np.complex128)

    # Shared random signs for early reflections so L/R share coherent phase
    early_signs = rng.choice([-1.0, 1.0], size=int(np.sum(early_mask)))
    if len(early_signs) > 0:
        early_signs[0] = 1.0  # Direct arrival positive

    for b in range(2, 9):  # Bands 250 Hz .. 16 kHz (FDTD covers < 280 Hz!)
        ch_l = np.zeros(N_OUT, dtype=np.float64)
        ch_r = np.zeros(N_OUT, dtype=np.float64)

        if np.any(early_mask):
            te = times[early_mask]
            ee = e9[early_mask, b]
            amp = np.sqrt(np.maximum(0.0, ee)) * early_signs
            # High-frequency bands get ILD; mid bands mainly ITD
            w_ild = min(1.0, max(0.0, (b - 3) / 3.0))
            gl = 1.0 + w_ild * (ild_l[early_mask] - 1.0)
            gr = 1.0 + w_ild * (ild_r[early_mask] - 1.0)
            idx_l = np.round((te - dt_ear[early_mask]) * FS_OUT).astype(np.int32)
            idx_r = np.round((te + dt_ear[early_mask]) * FS_OUT).astype(np.int32)
            ok_l = (idx_l >= 0) & (idx_l < N_OUT)
            ok_r = (idx_r >= 0) & (idx_r < N_OUT)
            np.add.at(ch_l, idx_l[ok_l], amp[ok_l] * gl[ok_l])
            np.add.at(ch_r, idx_r[ok_r], amp[ok_r] * gr[ok_r])

        if np.any(late_mask):
            tl = times[late_mask]
            el = e9[late_mask, b]
            w_ild = min(1.0, max(0.0, (b - 3) / 3.0))
            gl = 1.0 + w_ild * (ild_l[late_mask] - 1.0)
            gr = 1.0 + w_ild * (ild_r[late_mask] - 1.0)
            bins = np.clip((tl / bin_dt).astype(np.int32), 0, n_bins - 1)
            bin_el = np.bincount(bins, weights=el * (gl ** 2), minlength=n_bins)
            bin_er = np.bincount(bins, weights=el * (gr ** 2), minlength=n_bins)
            # Smooth small jitter gaps over +/- 1 bin
            kern = np.array([0.22, 0.56, 0.22])
            bin_el = np.convolve(bin_el, kern, mode="same")
            bin_er = np.convolve(bin_er, kern, mode="same")

            p_bins_l = np.clip((pulse_pos_l / (FS_OUT * bin_dt)).astype(np.int32), 0, n_bins - 1)
            p_bins_r = np.clip((pulse_pos_r / (FS_OUT * bin_dt)).astype(np.int32), 0, n_bins - 1)
            t_p_l = pulse_pos_l / float(FS_OUT)
            t_p_r = pulse_pos_r / float(FS_OUT)
            on_l = t_p_l >= (t0_first + 0.085)
            on_r = t_p_r >= (t0_first + 0.085)

            amp_l = np.sqrt(bin_el[p_bins_l] / pulses_per_bin) * pulse_sign_l * on_l
            amp_r = np.sqrt(bin_er[p_bins_r] / pulses_per_bin) * pulse_sign_r * on_r
            np.add.at(ch_l, pulse_pos_l, amp_l)
            np.add.at(ch_r, pulse_pos_r, amp_r)

        # Bandpass filter and accumulate into broadband spectrum
        # Multiply by sqrt(band_energy_compensation) -> fb_masks satisfy sum(m^2) == 1 across band
        FL = np.fft.rfft(ch_l, n=n_fft) * fb_masks[b]
        FR = np.fft.rfft(ch_r, n=n_fft) * fb_masks[b]
        # Scale up by bandwidth factor so energy per Hz matches broadband spectrum
        # (A band-limited signal passing through mask m of width ~B loses (1-duty) energy if white)
        # Wait: each ray band energy E[b] ALREADY represents the total energy in octave band b!
        # Wait: if ch_l is white noise of power P_b across [0, Fs/2], filtering by octave band b keeps
        # fraction (BW_b / (Fs/2)) of P_b! So we MUST divide by sqrt(sum(fb_masks[b]^2) / len(freqs))
        # so the filtered octave-band waveform retains TOTAL energy == sum(E_hits[b])!!
        band_frac = max(1e-6, float(np.mean(fb_masks[b] ** 2)))
        norm_bw = 1.0 / math.sqrt(band_frac)
        stereo_spec_l += FL * norm_bw
        stereo_spec_r += FR * norm_bw

    out_l = np.fft.irfft(stereo_spec_l, n=n_fft)[:N_OUT]
    out_r = np.fft.irfft(stereo_spec_r, n=n_fft)[:N_OUT]
    return np.stack([out_l, out_r], axis=0)


def _fuse_fdtd_and_raytrace(
    fdtd_mono: np.ndarray,
    rt_stereo: np.ndarray,
    src_pos: Tuple[float, float, float],
    rec_pos: Tuple[float, float, float],
    rec_facing: Tuple[float, float, float],
) -> np.ndarray:
    """
    Fuse FDTD (< 280 Hz) and Ray-Traced (>= 280 Hz) stereo IRs via 4th-order
    complementary zero-phase Linkwitz-Riley crossover at 280 Hz, after matching
    spectral energy in the 210-330 Hz overlap band.
    """
    # Create subtle binaural stereo from FDTD mono using source-to-receiver ITD + gentle diffuse phase offset
    fwd = np.array(rec_facing, dtype=np.float64)
    fwd /= max(1e-12, float(np.linalg.norm(fwd)))
    ear_r = np.cross(fwd, np.array([0.0, 0.0, 1.0]))
    ear_r /= max(1e-12, float(np.linalg.norm(ear_r)))
    src_vec = np.array(src_pos, dtype=np.float64) - np.array(rec_pos, dtype=np.float64)
    src_vec /= max(1e-12, float(np.linalg.norm(src_vec)))
    sin_az = float(np.clip(np.dot(src_vec, ear_r), -1.0, 1.0))
    shift_samples = int(round(0.00028 * sin_az * FS_OUT))

    fdtd_l = np.roll(fdtd_mono, -shift_samples)
    fdtd_r = np.roll(fdtd_mono, +shift_samples)
    if shift_samples > 0:
        fdtd_l[-shift_samples:] = 0.0
        fdtd_r[:shift_samples] = 0.0
    elif shift_samples < 0:
        s = -shift_samples
        fdtd_l[:s] = 0.0
        fdtd_r[-s:] = 0.0

    n_fft = 1 << int(math.ceil(math.log2(N_OUT * 2)))
    freqs = np.fft.rfftfreq(n_fft, d=1.0 / FS_OUT)

    FL_low = np.fft.rfft(fdtd_l, n=n_fft)
    FR_low = np.fft.rfft(fdtd_r, n=n_fft)
    FL_hi = np.fft.rfft(rt_stereo[0], n=n_fft)
    FR_hi = np.fft.rfft(rt_stereo[1], n=n_fft)

    # Calibrate raytrace level to FDTD in 210-320 Hz overlap band
    ov_mask = (freqs >= 210.0) & (freqs <= 320.0)
    e_low = float(np.mean(np.abs(FL_low[ov_mask]) ** 2 + np.abs(FR_low[ov_mask]) ** 2))
    e_hi = float(np.mean(np.abs(FL_hi[ov_mask]) ** 2 + np.abs(FR_hi[ov_mask]) ** 2))
    gain_rt = math.sqrt(e_low / max(e_hi, 1e-30)) if e_hi > 1e-30 and e_low > 1e-30 else 1.0

    # Zero-phase 4th-order Linkwitz-Riley complementary crossover at 280 Hz
    ratio = freqs / CROSSOVER_HZ
    h_lp = 1.0 / (1.0 + ratio ** 8)
    h_hp = 1.0 - h_lp

    # Gentle sub-sonic DC high-pass at 16 Hz
    hp_16 = np.where(freqs < 16.0, (freqs / 16.0) ** 4, 1.0)
    # Gentle air roll-off smooth ceiling at 19.5 kHz
    lp_top = 1.0 / (1.0 + (freqs / 19500.0) ** 6)

    spec_l = (FL_low * h_lp + FL_hi * gain_rt * h_hp) * hp_16 * lp_top
    spec_r = (FR_low * h_lp + FR_hi * gain_rt * h_hp) * hp_16 * lp_top

    ir_l = np.fft.irfft(spec_l, n=n_fft)[:N_OUT]
    ir_r = np.fft.irfft(spec_r, n=n_fft)[:N_OUT]
    return np.stack([ir_l, ir_r], axis=0)


def _write_wav_16bit(stereo_ir: np.ndarray, wav_path: str) -> float:
    """Peak-normalize to -1.0 dBFS and write 16-bit PCM 48 kHz stereo WAV."""
    os.makedirs(os.path.dirname(wav_path), exist_ok=True)
    peak = float(np.max(np.abs(stereo_ir)))
    scale = 0.89125 / max(peak, 1e-12)
    norm = np.clip(stereo_ir * scale, -1.0, 1.0)
    # Interleave L, R
    pcm = np.empty(norm.shape[1] * 2, dtype=np.int16)
    pcm[0::2] = np.round(norm[0] * 32767.0).astype(np.int16)
    pcm[1::2] = np.round(norm[1] * 32767.0).astype(np.int16)
    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(FS_OUT)
        wf.writeframes(pcm.tobytes())
    return scale


def _compute_iso3382_octave(stereo_ir: np.ndarray) -> Tuple[Dict[str, Dict[str, float]], Dict[str, np.ndarray]]:
    """Compute exact ISO 3382 room acoustic parameters per octave band (63 Hz - 8 kHz)."""
    mono = 0.5 * (stereo_ir[0] + stereo_ir[1])
    n_fft = 1 << int(math.ceil(math.log2(len(mono) * 2)))
    freqs = np.fft.rfftfreq(n_fft, d=1.0 / FS_OUT)
    M = np.fft.rfft(mono, n=n_fft)

    # Detect direct sound onset (first sample exceeding 12% of global peak)
    pk = float(np.max(np.abs(mono)))
    onset_candidates = np.where(np.abs(mono) >= 0.12 * pk)[0]
    i0 = int(onset_candidates[0]) if len(onset_candidates) > 0 else 0

    metrics_by_band: Dict[str, Dict[str, float]] = {}
    edcs_db: Dict[str, np.ndarray] = {}

    for fc in OCTAVE_BANDS:
        f_lo = fc / math.sqrt(2.0)
        f_hi = fc * math.sqrt(2.0)
        # 6th-order Butterworth magnitude octave bandpass
        bp = np.zeros_like(freqs)
        pos = freqs > 0.0
        f_p = freqs[pos]
        bp_pos = (1.0 / np.sqrt(1.0 + (f_lo / f_p) ** 12)) * (1.0 / np.sqrt(1.0 + (f_p / f_hi) ** 12))
        bp[pos] = bp_pos
        h_band = np.fft.irfft(M * bp, n=n_fft)[i0:N_OUT]

        e2 = h_band ** 2
        # Trim tiny noise tail if any at last 0.1 s
        sch = np.cumsum(e2[::-1])[::-1]
        sch /= max(float(sch[0]), 1e-30)
        edc_db = 10.0 * np.log10(np.maximum(sch, 1e-10))
        edcs_db[str(int(fc))] = edc_db

        t_vec = np.arange(len(edc_db), dtype=np.float64) / FS_OUT

        def fit_rt(db_hi: float, db_lo: float) -> float | None:
            mask = (edc_db <= db_hi) & (edc_db >= db_lo)
            if np.sum(mask) < 20:
                return None
            # Use contiguous segment from first crossing of db_hi to first crossing of db_lo
            i_a = int(np.argmax(edc_db <= db_hi))
            below_lo = np.where(edc_db[i_a:] <= db_lo)[0]
            i_b = i_a + int(below_lo[0]) if len(below_lo) > 0 else len(edc_db) - 1
            if i_b <= i_a + 15:
                return None
            t_seg = t_vec[i_a:i_b]
            y_seg = edc_db[i_a:i_b]
            slope, _ = np.polyfit(t_seg, y_seg, 1)
            if slope >= -0.1:
                return None
            return float(-60.0 / slope)

        edt = fit_rt(-0.0, -10.0)
        t20 = fit_rt(-5.0, -25.0)
        t30 = fit_rt(-5.0, -35.0)
        rt60 = t30 if t30 is not None else (t20 if t20 is not None else edt)

        n80 = min(len(e2), int(0.080 * FS_OUT))
        n50 = min(len(e2), int(0.050 * FS_OUT))
        e_tot = max(float(np.sum(e2)), 1e-30)
        e_early80 = float(np.sum(e2[:n80]))
        e_late80 = max(e_tot - e_early80, 1e-30)
        c80 = 10.0 * math.log10(max(e_early80, 1e-30) / e_late80)
        d50 = 100.0 * float(np.sum(e2[:n50])) / e_tot
        ts_ms = 1000.0 * float(np.sum(t_vec * e2)) / e_tot

        metrics_by_band[str(int(fc))] = {
            "t60_s": round(rt60, 3) if rt60 is not None else None,
            "t20_s": round(t20, 3) if t20 is not None else None,
            "t30_s": round(t30, 3) if t30 is not None else None,
            "edt_s": round(edt, 3) if edt is not None else None,
            "c80_db": round(c80, 2),
            "d50_pct": round(d50, 1),
            "ts_ms": round(ts_ms, 1),
        }

    return metrics_by_band, edcs_db


def _generate_plots(
    ac_dir: str,
    fdtd_npz: dict,
    fdtd_summary: dict,
    station_edcs: Dict[str, Dict[str, np.ndarray]],
    station_metrics: Dict[str, Dict[str, Dict[str, float]]],
) -> None:
    """Generate 3 publication-quality diagnostic plots in acoustics/plots/."""
    plots_dir = os.path.join(ac_dir, "plots")
    os.makedirs(plots_dir, exist_ok=True)
    plt.rcParams.update(
        {
            "figure.facecolor": "#121316",
            "axes.facecolor": "#191b20",
            "axes.edgecolor": "#3f4451",
            "axes.labelcolor": "#e5e7eb",
            "text.color": "#e5e7eb",
            "xtick.color": "#cbd5e1",
            "ytick.color": "#cbd5e1",
            "grid.color": "#2d313b",
            "font.size": 10,
        }
    )

    # 1. Architectural Plan & Longitudinal Section
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6.2), gridspec_kw={"width_ratios": [1.0, 1.35]})
    fig.suptitle("Newgrange Passage Tomb — Architectural Plan & Solstice Section (O'Kelly 1982)", fontsize=13, fontweight="bold")

    # Plan View (X vs Y)
    y_p = np.linspace(0.0, PASSAGE_LEN, 120)
    hw_p = passage_half_width(y_p, 0.5)
    ax1.fill_betweenx(y_p, -hw_p, hw_p, color="#334155", alpha=0.75, label="Passage & Chamber Air")
    # Chamber Core + Recesses
    core_rect = plt.Rectangle(
        (CHAMBER_CORE_X_MIN, CHAMBER_CORE_Y_MIN),
        CHAMBER_CORE_X_MAX - CHAMBER_CORE_X_MIN,
        CHAMBER_CORE_Y_MAX - CHAMBER_CORE_Y_MIN,
        color="#334155",
        alpha=0.85,
    )
    ax1.add_patch(core_rect)
    for rec in (WEST_RECESS, EAST_RECESS, NORTH_RECESS):
        r_rect = plt.Rectangle(
            (rec["x_min"], rec["y_min"]),
            rec["x_max"] - rec["x_min"],
            rec["y_max"] - rec["y_min"],
            color="#475569",
            alpha=0.85,
        )
        ax1.add_patch(r_rect)
    # Stone Basins in Plan
    for bx, by, brx, bry in [(-2.25, 20.60, 0.56, 0.44), (0.0, 23.20, 0.58, 0.48), (2.55, 20.62, 0.82, 0.56)]:
        th = np.linspace(0, 2 * math.pi, 60)
        ax1.fill(bx + brx * np.cos(th), by + bry * np.sin(th), color="#94a3b8", alpha=0.9)
    # K1 Entrance Stone
    k1 = plt.Rectangle((-1.6, -2.65), 3.2, 0.65, color="#cbd5e1", alpha=0.85, label="K1 Entrance Stone")
    ax1.add_patch(k1)
    # Plot Acoustic Stations
    for st_key, st in ACOUSTIC_STATIONS.items():
        sx, sy, _ = st["src"]
        rx, ry, _ = st["rec"]
        ax1.plot(sx, sy, marker="*", markersize=9, color="#f59e0b")
        ax1.plot(rx, ry, marker="o", markersize=6, color="#38bdf8")
    ax1.set_xlim(-4.5, 4.5)
    ax1.set_ylim(-3.5, 25.5)
    ax1.set_aspect("equal")
    ax1.set_xlabel("Transverse W–E X (m)")
    ax1.set_ylabel("Longitudinal Passage–Chamber Y (m)")
    ax1.set_title("Plan View (6.55 m W–E × 5.25 m N–S Chamber)")
    ax1.grid(True, linestyle="--", alpha=0.4)

    # Longitudinal Section (Y vs Z)
    y_sec = np.linspace(0.0, PASSAGE_LEN, 160)
    fz_sec = floor_z(y_sec)
    cz_sec = passage_ceil_z(y_sec)
    ax2.fill_between(y_sec, fz_sec, cz_sec, color="#334155", alpha=0.8, label="Passage & Chamber Cavity")
    # Roof-box
    rb = plt.Rectangle((0.0, ROOFBOX_Z_MIN), ENTRANCE_DOOR_LEN, ROOFBOX_Z_MAX - ROOFBOX_Z_MIN, color="#334155", alpha=0.85)
    ax2.add_patch(rb)
    # Central Chamber + Vault profile
    y_ch = np.linspace(CHAMBER_CORE_Y_MIN, NORTH_RECESS["y_max"], 80)
    z_vault_top = np.where(y_ch <= CHAMBER_CORE_Y_MAX, CAPSTONE_Z, NORTH_RECESS["z_ceil"])
    # Tapered corbel envelope in Y-Z
    z_v_grid = np.linspace(VAULT_SPRING_Z, CAPSTONE_Z, 17)
    y_v_left = [20.55 - (0.48 + (1.60 - 0.48) * (1.0 - (zv - VAULT_SPRING_Z) / (CAPSTONE_Z - VAULT_SPRING_Z)) ** 0.72) for zv in z_v_grid]
    y_v_right = [20.55 + (0.48 + (1.60 - 0.48) * (1.0 - (zv - VAULT_SPRING_Z) / (CAPSTONE_Z - VAULT_SPRING_Z)) ** 0.72) for zv in z_v_grid]
    ax2.fill(
        [CHAMBER_CORE_Y_MIN] + y_v_left + y_v_right[::-1] + [CHAMBER_CORE_Y_MAX, NORTH_RECESS["y_max"], NORTH_RECESS["y_max"], CHAMBER_CORE_Y_MIN],
        [CHAMBER_FLOOR_Z] + list(z_v_grid) + list(z_v_grid[::-1]) + [NORTH_RECESS["z_ceil"], NORTH_RECESS["z_ceil"], CHAMBER_FLOOR_Z, CHAMBER_FLOOR_Z],
        color="#334155",
        alpha=0.85,
    )
    # Winter Solstice Sunbeam (1.0 deg descent from roof-box slit)
    y_sol = np.linspace(-2.5, 20.62, 100)
    z_sol = 2.31 - math.tan(math.radians(1.0)) * y_sol
    ax2.plot(y_sol, z_sol, color="#fbbf24", linewidth=2.5, label="Winter Solstice Beam (1.0°)")
    ax2.axhline(CHAMBER_FLOOR_Z, xmin=0.72, xmax=0.95, color="#94a3b8", linestyle=":", linewidth=1.2)
    ax2.set_xlim(-3.0, 25.2)
    ax2.set_ylim(-0.5, 9.0)
    ax2.set_xlabel("Longitudinal Distance Y from Entrance (m)")
    ax2.set_ylabel("Elevation Z (m)")
    ax2.set_title("Longitudinal Section (18.95 m Passage, 1.95 m Floor Rise, 6.00 m Vault)")
    ax2.legend(loc="upper left", framealpha=0.9)
    ax2.grid(True, linestyle="--", alpha=0.4)
    fig.tight_layout()
    fig.savefig(os.path.join(plots_dir, "newgrange_plan_section.png"), dpi=160)
    plt.close(fig)

    # 2. 3D FDTD Frequency Response & Passage Standing-Wave Profile
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12.5, 7.6), gridspec_kw={"height_ratios": [1.15, 1.0]})
    fig.suptitle("Newgrange 3D FDTD Low-Frequency Resonances & Passage Standing Waves", fontsize=13, fontweight="bold")

    freqs = fdtd_npz["freqs_2s"]
    mask_f = (freqs >= 20.0) & (freqs <= 320.0)
    ax1.axvspan(95.0, 120.0, color="#f59e0b", alpha=0.16, label="Jahn, Devereux & Ibison (1996) 95–120 Hz Band")
    ax1.plot(freqs[mask_f], fdtd_npz["frf_chamber_center"][mask_f], color="#38bdf8", linewidth=1.8, label="Chamber Center (FDTD)")
    ax1.plot(freqs[mask_f], fdtd_npz["frf_chamber_to_passage"][mask_f], color="#a78bfa", linewidth=1.2, alpha=0.85, label="Chamber → Mid-Passage (y=10 m)")
    for m in fdtd_summary["eigenmodes"]:
        f_pk = m["freq_hz"]
        spl_pk = m["spl_db"]
        ax1.plot(f_pk, spl_pk, "o", color="#fbbf24", markersize=5.5)
        ax1.annotate(f"{f_pk:.1f} Hz", (f_pk, spl_pk), textcoords="offset points", xytext=(0, 7), ha="center", fontsize=8.5, color="#fde68a")
    ax1.set_xlim(20, 320)
    ax1.set_xlabel("Frequency (Hz)")
    ax1.set_ylabel("SPL (dB re 1 m free-field)")
    ax1.set_title("3D Wave Equation Transfer Function (20–320 Hz)")
    ax1.legend(loc="upper right", framealpha=0.9)
    ax1.grid(True, linestyle="--", alpha=0.4)

    y_pr = fdtd_npz["y_probes"]
    spl_pr = fdtd_npz["probe_spl_db"]
    f_target = float(fdtd_npz["target_110_hz"][0])
    ax2.axvline(PASSAGE_LEN, color="#fb7185", linestyle="--", linewidth=1.3, label="Passage–Chamber Threshold (y = 18.95 m)")
    ax2.plot(y_pr, spl_pr, color="#34d399", linewidth=2.0, label=f"Standing-Wave SPL Profile at {f_target:.2f} Hz")
    ax2.fill_between(y_pr, -42.0, spl_pr, color="#34d399", alpha=0.14)
    ax2.set_xlim(0.0, 24.2)
    ax2.set_ylim(-40.0, 3.0)
    ax2.set_xlabel("Longitudinal Position Y (m) — Entrance (0 m) → Chamber (19–24 m)")
    ax2.set_ylabel("Relative SPL (dB)")
    ax2.set_title(f"Longitudinal Nodal Structure at Primary Resonance ({f_target:.2f} Hz, λ/2 ≈ {SPEED_OF_SOUND / (2 * f_target):.2f} m)")
    ax2.legend(loc="lower right", framealpha=0.9)
    ax2.grid(True, linestyle="--", alpha=0.4)
    fig.tight_layout()
    fig.savefig(os.path.join(plots_dir, "acoustic_frf_modes.png"), dpi=160)
    plt.close(fig)

    # 3. Octave-Band RT60 / EDT & Schroeder Energy Decay Curves
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13.5, 5.6))
    fig.suptitle("Newgrange ISO 3382 Broadband Acoustic Characteristics (Hybrid FDTD + Ray-Trace)", fontsize=13, fontweight="bold")

    bands_str = [str(int(b)) for b in OCTAVE_BANDS]
    x_idx = np.arange(len(bands_str))
    w = 0.27
    cc_t60 = [station_metrics["chamber_center"][b]["t60_s"] or 0.0 for b in bands_str]
    cc_edt = [station_metrics["chamber_center"][b]["edt_s"] or 0.0 for b in bands_str]
    ew_t60 = [station_metrics["east_to_west"][b]["t60_s"] or 0.0 for b in bands_str]
    ax1.bar(x_idx - w, cc_t60, width=w, color="#38bdf8", label="Chamber Center T60 (s)")
    ax1.bar(x_idx, cc_edt, width=w, color="#fbbf24", label="Chamber Center EDT (s)")
    ax1.bar(x_idx + w, ew_t60, width=w, color="#a78bfa", label="East → West T60 (s)")
    ax1.set_xticks(x_idx, [f"{b} Hz" if int(b) < 1000 else f"{int(b)//1000} kHz" for b in bands_str], rotation=20)
    ax1.set_ylabel("Decay Time (seconds)")
    ax1.set_title("Octave-Band Reverberation Time (T60 & EDT)")
    ax1.legend(loc="upper right", framealpha=0.9)
    ax1.grid(True, axis="y", linestyle="--", alpha=0.4)

    t_edc = np.arange(len(next(iter(station_edcs["chamber_center"].values()))), dtype=np.float64) / FS_OUT
    for band_b, col in [("125", "#f59e0b"), ("500", "#34d399"), ("1000", "#38bdf8"), ("4000", "#f472b6")]:
        edc = station_edcs["chamber_center"][band_b]
        ax2.plot(t_edc[: int(2.6 * FS_OUT)], edc[: int(2.6 * FS_OUT)], linewidth=1.8, color=col, label=f"{band_b} Hz Octave")
    ax2.set_xlim(0.0, 2.6)
    ax2.set_ylim(-65.0, 2.0)
    ax2.set_xlabel("Time after Direct Arrival (s)")
    ax2.set_ylabel("Schroeder Decay Level (dB)")
    ax2.set_title("Schroeder Backward-Integrated Energy Decay Curves (Chamber Center)")
    ax2.legend(loc="upper right", framealpha=0.9)
    ax2.grid(True, linestyle="--", alpha=0.4)
    fig.tight_layout()
    fig.savefig(os.path.join(plots_dir, "octave_rt60_edc.png"), dpi=160)
    plt.close(fig)


def run_synthesis_and_report(ac_dir: str) -> Dict[str, object]:
    """Synthesize all 5 48 kHz stereo WAV IRs, compute ISO 3382 report, and generate plots."""
    fdtd_npz = dict(np.load(os.path.join(ac_dir, "fdtd_results.npz")))
    rt_npz = dict(np.load(os.path.join(ac_dir, "raytrace_echograms.npz")))
    with open(os.path.join(ac_dir, "fdtd_summary.json"), "r", encoding="utf-8") as fp:
        fdtd_summary = json.load(fp)

    fs_fdtd = float(fdtd_npz["fs_fdtd"][0])
    rng = np.random.default_rng(3209)

    station_metrics: Dict[str, Dict[str, Dict[str, float]]] = {}
    station_edcs: Dict[str, Dict[str, np.ndarray]] = {}
    station_files: Dict[str, Dict[str, object]] = {}

    for idx_s, (st_key, st_info) in enumerate(ACOUSTIC_STATIONS.items()):
        ir_fdtd = fdtd_npz[f"ir_{st_key}"]
        ir_fdtd_48k = _resample_fdtd_to_48k(ir_fdtd, fs_fdtd)

        rt_times = rt_npz[f"{st_key}_times"]
        rt_energies = rt_npz[f"{st_key}_energies"]
        rt_dirs = rt_npz[f"{st_key}_dirs"]

        ir_rt_stereo = _synthesize_raytrace_stereo(
            rt_times, rt_energies, rt_dirs, st_info["rec_facing"], np.random.default_rng(3210 + idx_s)
        )
        hybrid_stereo = _fuse_fdtd_and_raytrace(
            ir_fdtd_48k,
            ir_rt_stereo,
            st_info["src"],
            st_info["rec"],
            st_info["rec_facing"],
        )

        wav_name = f"ir_{st_key}.wav"
        wav_path = os.path.join(ac_dir, wav_name)
        scale_gain = _write_wav_16bit(hybrid_stereo, wav_path)

        metrics_band, edcs_band = _compute_iso3382_octave(hybrid_stereo)
        station_metrics[st_key] = metrics_band
        station_edcs[st_key] = edcs_band

        # Broad mid-band averages (500 & 1000 Hz)
        t60_mid = round(
            0.5 * ((metrics_band["500"]["t60_s"] or 0.0) + (metrics_band["1000"]["t60_s"] or 0.0)), 3
        )
        t60_low = round(
            0.5 * ((metrics_band["125"]["t60_s"] or 0.0) + (metrics_band["250"]["t60_s"] or 0.0)), 3
        )
        bass_ratio = round(t60_low / max(t60_mid, 0.01), 2)

        station_files[st_key] = {
            "label": st_info["label"],
            "description": st_info["description"],
            "wav_file": wav_name,
            "src_m": list(st_info["src"]),
            "rec_m": list(st_info["rec"]),
            "sample_rate_hz": FS_OUT,
            "duration_s": IR_DURATION_S,
            "t60_mid_s": t60_mid,
            "t60_low_s": t60_low,
            "bass_ratio": bass_ratio,
            "peak_norm_gain": round(scale_gain, 4),
            "octave_metrics": metrics_band,
        }
        print(
            f"[SynthIR] {st_key:20s}: T60(125Hz)={metrics_band['125']['t60_s']}s, "
            f"T60(1kHz)={metrics_band['1000']['t60_s']}s, C80(1kHz)={metrics_band['1000']['c80_db']} dB, "
            f"BassRatio={bass_ratio}"
        )

    _generate_plots(ac_dir, fdtd_npz, fdtd_summary, station_edcs, station_metrics)

    report = {
        "monument": "Newgrange Passage Tomb (Bru na Boinne, Ireland, c. 3200 BCE)",
        "coordinate_frame": "Meters, Z-up, Origin at entrance portal floor center, +Y inward along 18.95 m passage",
        "archaeoacoustic_literature_benchmarks": {
            "jahn_devereux_ibison_1996": {
                "band_hz": [95.0, 120.0],
                "reported_primary_hz": 110.0,
                "simulated_primary_hz": fdtd_summary["target_110_hz"],
                "passage_half_wavelength_at_peak_m": round(SPEED_OF_SOUND / (2.0 * fdtd_summary["target_110_hz"]), 3),
            },
            "solstice_alignment": verify_solstice_ray(),
            "analytical_room_acoustics": analytical_acoustics_summary(),
        },
        "fdtd_simulation": fdtd_summary,
        "stations": station_files,
    }
    report_path = os.path.join(ac_dir, "acoustic_report.json")
    with open(report_path, "w", encoding="utf-8") as fp:
        json.dump(report, fp, indent=2)
    return report


if __name__ == "__main__":
    run_synthesis_and_report("/Users/lightsource/.gemini/antigravity/scratch/newgrange-acoustic-model/acoustics")
