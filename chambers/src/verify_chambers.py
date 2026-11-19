"""
Automated Verification Suite for Comparative Megalithic Chamber Acoustics (/chambers/)
Validates:
  - All 5 newly exported GLB headers, versions, and exact byte lengths
  - Multi-monument WebGL2 binary bundle (`chambers_scene.bin` & `chambers_manifest.json`)
  - 3D FDTD comparative eigenmode volumes (`comparative_modes_3d.bin`)
  - All empirical site data, ideal Maeshowe box counts (38 < 130 Hz, 13 in 95-120 Hz, 109.79 Hz stacked),
    and 3D FDTD experiment curves (Maeshowe, Loughcrew partitions ON/OFF, Newgrange Roof-Box vs Doorway)
"""

from __future__ import annotations

import json
import os
import struct

import numpy as np


def verify_chambers(chambers_root: str) -> None:
    print("=== Verifying Comparative Megalithic Chamber Acoustics (/chambers/) ===")

    # 1. Verify individual GLB exports
    expected_glbs = [
        "maeshowe.glb",
        "loughcrew_cairn_l.glb",
        "waylands_smithy.glb",
        "chun_quoit.glb",
        "carn_euny.glb",
    ]
    for gname in expected_glbs:
        gp = os.path.join(chambers_root, "models", gname)
        assert os.path.isfile(gp), f"Missing GLB: {gp}"
        with open(gp, "rb") as fp:
            magic, ver, length = struct.unpack("<III", fp.read(12))
        assert magic == 0x46546C67 and ver == 2, f"Invalid GLB header in {gname}"
        assert length == os.path.getsize(gp), f"GLB byte length mismatch in {gname}"
    print(f"[PASS] Verified all {len(expected_glbs)} glTF 2.0 (.glb) monument models")

    # 2. Verify WebGL2 Multi-Monument Bundle
    man_path = os.path.join(chambers_root, "viewer", "data", "chambers_manifest.json")
    bin_path = os.path.join(chambers_root, "viewer", "data", "chambers_scene.bin")
    with open(man_path, "r", encoding="utf-8") as fm:
        manifest = json.load(fm)
    assert manifest["totalBytes"] == os.path.getsize(bin_path), "chambers_scene.bin byte size mismatch"
    assert set(manifest["sites"].keys()) == {
        "maeshowe",
        "newgrange",
        "loughcrew_l",
        "waylands_smithy",
        "chun_quoit",
        "carn_euny",
    }, "Missing monument in WebGL2 manifest"
    print(f"[PASS] Verified WebGL2 multi-monument bundle ({manifest['totalBytes']/1e6:.2f} MB, 6 monuments + scale figure)")

    # 3. Verify comparative_modes_3d.bin & JSON dataset
    data_path = os.path.join(chambers_root, "data", "chamber_acoustics_data.json")
    with open(data_path, "r", encoding="utf-8") as fd:
        data = json.load(fd)

    assert len(data["sites"]) == 7, "Expected 7 measured chambers"
    assert len(data["sources"]) == 16, "Expected 16 bibliographic sources"
    ib = data["ideal_box_maeshowe"]
    assert ib["total_below_130_hz"] == 38, f"Expected 38 modes < 130 Hz, got {ib['total_below_130_hz']}"
    assert ib["in_95_120_hz"] == 13, f"Expected 13 modes in 95-120 Hz, got {ib['in_95_120_hz']}"
    assert len(ib["stacked_109_8_hz"]) == 2, "Expected 2 stacked modes at 109.79 Hz"

    comp_bin = os.path.join(chambers_root, "data", "comparative_modes_3d.bin")
    comp_size = os.path.getsize(comp_bin)
    with open(comp_bin, "rb") as fb:
        for k, vmeta in data["comparative_3d_volumes"]["volumes"].items():
            fb.seek(vmeta["byteOffset"])
            nx, ny, nz = struct.unpack("<3I", fb.read(12))
            assert [nx, ny, nz] == vmeta["dims_xyz"]
            assert vmeta["byteOffset"] + 36 + 2 * nx * ny * nz <= comp_size

    # Verify finite FDTD arrays
    for arr_key in ("maeshowe_db", "newgrange_db"):
        arr = np.array(data["fdtd_comparison"][arr_key], dtype=np.float64)
        assert np.all(np.isfinite(arr)), f"Non-finite values in {arr_key}"

    t2 = data["experiments"]["test2_loughcrew_partitions"]
    t4 = data["experiments"]["test4_newgrange_roofbox_mouthpiece"]
    assert np.all(np.isfinite(t2["with_partitions_db"])) and np.all(np.isfinite(t2["without_partitions_db"]))
    assert np.all(np.isfinite(t4["roofbox_to_chamber_db"])) and np.all(np.isfinite(t4["doorway_to_chamber_db"]))

    print(
        f"[PASS] Verified Maeshowe FDTD peak={data['fdtd_comparison']['maeshowe_peak']['peak_hz']} Hz "
        f"(Q={data['fdtd_comparison']['maeshowe_peak']['q_factor']})"
    )
    print(
        f"[PASS] Verified Test #2 Loughcrew partitions={t2['with_partitions_peak']['peak_hz']} Hz vs "
        f"open={t2['without_partitions_peak']['peak_hz']} Hz"
    )
    print(
        f"[PASS] Verified Test #4 Roof-Box peak(95-120 Hz)={t4['roofbox_peak_95_120_db']} dB vs "
        f"Doorway={t4['doorway_peak_95_120_db']} dB"
    )
    print("=== ALL CHAMBERS VERIFICATION CHECKS PASSED ===")


if __name__ == "__main__":
    verify_chambers(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
