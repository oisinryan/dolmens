"""
Automated Physical, Geometric, File-Format, and Acoustic Verification Suite
for the Newgrange 3D Acoustic Model.
"""

from __future__ import annotations

import json
import os
import struct
import wave

import numpy as np

from build_mesh import build_acoustic_interior_mesh
from geometry_spec import (
    CAPSTONE_Z,
    CHAMBER_FLOOR_Z,
    EAST_RECESS,
    NORTH_RECESS,
    PASSAGE_LEN,
    WEST_RECESS,
    verify_solstice_ray,
)


def verify_all(root_dir: str) -> None:
    print("=== Running Newgrange 3D & Acoustic Verification Suite ===")

    # 1. Watertight Acoustic Mesh & Archaeological Dimensions
    ac_mesh = build_acoustic_interior_mesh()
    stats = ac_mesh["manifold_stats"]
    assert stats["is_watertight_manifold"], f"Mesh is not watertight: {stats}"
    assert stats["boundary_edges"] == 0, stats
    assert stats["non_manifold_edges"] == 0, stats
    assert 75.0 <= stats["signed_volume_m3"] <= 140.0, f"Unexpected volume: {stats}"

    verts = ac_mesh["verts"]
    y_span = float(verts[:, 1].max() - verts[:, 1].min())
    we_span = float(verts[:, 0].max() - verts[:, 0].min())
    vault_height = float(CAPSTONE_Z - CHAMBER_FLOOR_Z)
    ns_chamber = float(NORTH_RECESS["y_max"] - PASSAGE_LEN)
    assert abs(y_span - 24.20) < 0.08, f"Total length mismatch: {y_span}"
    assert abs(we_span - 6.55) < 0.08, f"W-E span mismatch: {we_span}"
    assert abs(ns_chamber - 5.25) < 0.02, f"N-S chamber span mismatch: {ns_chamber}"
    assert abs(vault_height - 6.00) < 0.02, f"Vault height mismatch: {vault_height}"
    print(f"[PASS] Watertight manifold cavity: {stats['triangles']} tris, V={stats['signed_volume_m3']} m3")
    print(f"[PASS] O'Kelly dimensions: total={y_span:.2f}m, W-E={we_span:.2f}m, N-S={ns_chamber:.2f}m, vault={vault_height:.2f}m")

    # 2. Winter Solstice Line-of-Sight
    sol = verify_solstice_ray()
    assert sol["clears_passage"], f"Solstice ray obstructed: {sol}"
    print(f"[PASS] Winter Solstice beam clears passage (min floor clr={sol['min_floor_clearance_passage_m']:.3f}m, lands y={sol['floor_hit_y_m']:.2f}m)")

    # 3. 3D Exports (STL, GLB, OBJ/MTL, WebGL2 Bundle)
    stl_path = os.path.join(root_dir, "models", "newgrange_acoustic_interior.stl")
    assert os.path.isfile(stl_path), f"Missing {stl_path}"
    with open(stl_path, "rb") as fs:
        fs.seek(80)
        n_tris_stl = struct.unpack("<I", fs.read(4))[0]
    expected_stl_bytes = 84 + 50 * n_tris_stl
    assert os.path.getsize(stl_path) == expected_stl_bytes, "Corrupt binary STL size"
    assert n_tris_stl == stats["triangles"], "STL triangle count mismatch"

    glb_path = os.path.join(root_dir, "models", "newgrange_monument.glb")
    assert os.path.isfile(glb_path), f"Missing {glb_path}"
    with open(glb_path, "rb") as fg:
        magic, ver, length = struct.unpack("<III", fg.read(12))
    assert magic == 0x46546C67 and ver == 2, "Invalid GLB header"
    assert length == os.path.getsize(glb_path), "GLB length mismatch"

    obj_path = os.path.join(root_dir, "models", "newgrange_monument.obj")
    mtl_path = os.path.join(root_dir, "models", "newgrange_monument.mtl")
    assert os.path.isfile(obj_path) and os.path.getsize(obj_path) > 10000
    assert os.path.isfile(mtl_path) and os.path.getsize(mtl_path) > 100

    manifest_path = os.path.join(root_dir, "viewer", "data", "scene_manifest.json")
    bin_path = os.path.join(root_dir, "viewer", "data", "newgrange_scene.bin")
    with open(manifest_path, "r", encoding="utf-8") as fm:
        manifest = json.load(fm)
    assert manifest["totalBytes"] == os.path.getsize(bin_path), "WebGL scene binary size mismatch"
    print(f"[PASS] Verified 3D exports: GLB ({length/1e6:.2f} MB), STL ({expected_stl_bytes/1e3:.1f} KB), OBJ, WebGL2 bundle")

    # 4. 3D FDTD & Eigenmodes Binary
    eig_bin = os.path.join(root_dir, "acoustics", "eigenmodes_3d.bin")
    with open(eig_bin, "rb") as fe:
        n_modes, nx, ny, nz = struct.unpack("<4I", fe.read(16))
    expected_eig = 40 + (n_modes + 1) * nx * ny * nz
    assert os.path.getsize(eig_bin) == expected_eig, "eigenmodes_3d.bin size mismatch"

    report_path = os.path.join(root_dir, "acoustics", "acoustic_report.json")
    with open(report_path, "r", encoding="utf-8") as fr:
        report = json.load(fr)

    modes = report["fdtd_simulation"]["eigenmodes"]
    arch_band_modes = [m for m in modes if 95.0 <= m["freq_hz"] <= 120.0]
    assert len(arch_band_modes) >= 1, "Missing resonance in 95-120 Hz Jahn/Devereux band!"
    sw_spl = np.array(report["fdtd_simulation"]["passage_standing_wave"]["spl_db"])
    sw_mod = float(np.max(sw_spl) - np.min(sw_spl))
    assert np.all(np.isfinite(sw_spl)) and sw_mod > 10.0, f"Invalid passage standing-wave modulation: {sw_mod}"
    print(f"[PASS] 3D FDTD primary 95-120 Hz peak: {arch_band_modes[0]['freq_hz']} Hz (+{arch_band_modes[0]['spl_db']} dB), passage node modulation: {sw_mod:.1f} dB")

    # 5. Hybrid 48 kHz Stereo WAV IRs & ISO 3382 Metrics
    for st_key, st_info in report["stations"].items():
        wav_p = os.path.join(root_dir, "acoustics", st_info["wav_file"])
        assert os.path.isfile(wav_p), f"Missing {wav_p}"
        with wave.open(wav_p, "rb") as wf:
            assert wf.getnchannels() == 2
            assert wf.getsampwidth() == 2
            assert wf.getframerate() == 48000
            n_frames = wf.getnframes()
            assert n_frames >= 48000 * 2
            pcm = np.frombuffer(wf.readframes(n_frames), dtype=np.int16)
            assert np.max(np.abs(pcm)) > 1000, f"Silent WAV: {wav_p}"

        rt1k = st_info["octave_metrics"]["1000"]["t60_s"]
        rt125 = st_info["octave_metrics"]["125"]["t60_s"]
        assert rt1k is not None and 0.6 <= rt1k <= 4.5, f"Unrealistic 1kHz T60 for {st_key}: {rt1k}"
        assert rt125 is not None and 0.8 <= rt125 <= 6.5, f"Unrealistic 125Hz T60 for {st_key}: {rt125}"

    cc_125 = report["stations"]["chamber_center"]["octave_metrics"]["125"]["t60_s"]
    cc_1k = report["stations"]["chamber_center"]["octave_metrics"]["1000"]["t60_s"]
    cc_4k = report["stations"]["chamber_center"]["octave_metrics"]["4000"]["t60_s"]
    assert cc_125 > cc_4k, f"Expected bass warmth (T60 125Hz={cc_125} > 4kHz={cc_4k})"
    print(f"[PASS] All 5 48 kHz stereo WAV IRs & ISO 3382 checks passed (Chamber Center T60: 125Hz={cc_125}s, 1kHz={cc_1k}s, 4kHz={cc_4k}s)")

    # 6. Diagnostic PNG Plots
    for pname in ("newgrange_plan_section.png", "acoustic_frf_modes.png", "octave_rt60_edc.png"):
        pp = os.path.join(root_dir, "acoustics", "plots", pname)
        assert os.path.isfile(pp) and os.path.getsize(pp) > 15000, f"Missing/empty plot {pp}"
    print("[PASS] All 3 diagnostic plots verified.")
    print("=== ALL VERIFICATION CHECKS PASSED ===")


if __name__ == "__main__":
    verify_all(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
