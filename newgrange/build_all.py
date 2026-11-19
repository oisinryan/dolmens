"""
Master Build Pipeline: Newgrange Acoustically Accurate 3D Model
Runs:
  1. Parametric 3D watertight acoustic cavity & full monument generation
  2. Binary STL, multi-material OBJ/MTL, Binary glTF 2.0 (.glb), and WebGL2 bundle exports
  3. 3D Locally-Reacting FDTD Wave Solver (18 - 340 Hz) + 3D Eigenmodes
  4. 3D Mesh Ray-Tracer with Diffuse Scattering & ISO 9613-1 Air Attenuation (250 Hz - 20 kHz)
  5. Hybrid 48 kHz Stereo IR Synthesis, ISO 3382 Report, and Diagnostic Plots
  6. Automated Verification Suite
"""

from __future__ import annotations

import os
import sys
import time

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(ROOT_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

os.environ.setdefault("MPLCONFIGDIR", "/tmp/mpl-cache")

from acoustic_fdtd import run_all_fdtd
from acoustic_raytrace import run_all_raytracing
from build_mesh import ARCH_MATERIALS, build_acoustic_interior_mesh, build_full_monument_mesh
from export_3d import write_binary_stl, write_glb, write_obj_mtl, write_webgl_bundle
from synthesize_ir import run_synthesis_and_report
from verify_model import verify_all


def main() -> None:
    t_start = time.time()
    models_dir = os.path.join(ROOT_DIR, "models")
    acoustics_dir = os.path.join(ROOT_DIR, "acoustics")
    viewer_data_dir = os.path.join(ROOT_DIR, "viewer", "data")

    print("=== Step 1/5: Generating Parametric 3D Meshes ===")
    ac_mesh = build_acoustic_interior_mesh()
    arch_meshes = build_full_monument_mesh()
    print(f"  Acoustic Cavity: {ac_mesh['manifold_stats']}")

    print("=== Step 2/5: Exporting STL, OBJ/MTL, GLB, and WebGL2 Bundle ===")
    write_binary_stl(
        ac_mesh["verts"],
        ac_mesh["faces"],
        os.path.join(models_dir, "newgrange_acoustic_interior.stl"),
        "Newgrange Watertight Acoustic Interior Cavity (m)",
    )
    write_obj_mtl(
        [ac_mesh],
        os.path.join(models_dir, "newgrange_acoustic_interior.obj"),
        os.path.join(models_dir, "newgrange_acoustic_interior.mtl"),
        ARCH_MATERIALS,
    )
    write_obj_mtl(
        arch_meshes,
        os.path.join(models_dir, "newgrange_monument.obj"),
        os.path.join(models_dir, "newgrange_monument.mtl"),
        ARCH_MATERIALS,
    )
    write_glb(
        arch_meshes,
        os.path.join(models_dir, "newgrange_monument.glb"),
        ARCH_MATERIALS,
        convert_z_up_to_y_up=True,
    )
    write_glb(
        [ac_mesh],
        os.path.join(models_dir, "newgrange_acoustic_interior.glb"),
        ARCH_MATERIALS,
        convert_z_up_to_y_up=True,
    )
    write_webgl_bundle(arch_meshes + [ac_mesh], viewer_data_dir, ARCH_MATERIALS)

    print("=== Step 3/5: Running 3D Locally-Reacting FDTD Solver ===")
    run_all_fdtd(acoustics_dir)

    print("=== Step 4/5: Running 3D Mesh Ray-Tracer ===")
    run_all_raytracing(acoustics_dir, acoustic_mesh=ac_mesh)

    print("=== Step 5/5: Synthesizing 48 kHz Stereo IRs & ISO 3382 Report ===")
    run_synthesis_and_report(acoustics_dir)

    verify_all(ROOT_DIR)
    print(f"\nBuild complete in {time.time() - t_start:.2f} s")


if __name__ == "__main__":
    main()
