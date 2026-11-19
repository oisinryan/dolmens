"""
Master Build Script for Comparative Megalithic Chamber Acoustics (/chambers/)
Runs:
  1. Parametric 3D generation & .glb / WebGL2 bundle exports for all 6 monuments
  2. 3D FDTD & analytical acoustic experiments (Maeshowe, Loughcrew Test #2, Roof-Box Test #4, Helmholtz Test #3)
  3. Automated verification suite
"""

from __future__ import annotations

import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from build_models import build_and_export_all
from simulate_experiments import run_all_chambers_data
from verify_chambers import verify_chambers


def main() -> None:
    build_and_export_all(ROOT)
    run_all_chambers_data(ROOT)
    verify_chambers(ROOT)


if __name__ == "__main__":
    main()
