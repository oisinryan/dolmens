"""
Newgrange Passage Tomb (Bru na Boinne, Co. Meath, Ireland, c. 3200 BCE)
Archaeological & Acoustic Specification (Single Source of Truth)

Primary archaeological reference:
  O'Kelly, M. J. (1982). Newgrange: Archaeology, Art and Legend. Thames & Hudson.
Primary archaeoacoustic references:
  Jahn, R. G., Devereux, P., & Ibison, M. (1996). "Acoustical resonances of assorted
    ancient structures." Journal of the Acoustical Society of America, 99(2), 649-658.
  Watson, A., & Keating, D. (1999). "Architecture and sound: an acoustic analysis of
    megalithic monuments in prehistoric Britain." Antiquity, 73(280), 325-336.

Coordinate System (Z-up, meters):
  Origin (0, 0, 0): Center of entrance portal floor (just inside Entrance Stone K1).
  +Y: Inward along the passage centerline (NW, azimuth ~316 deg), 0.0 -> 24.20 m.
  +X: Transverse West (-X) to East (+X).
  +Z: Vertical Up.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, Tuple

import numpy as np

# ---------------------------------------------------------------------------
# 1. Exact Archaeological Dimensions (meters)
# ---------------------------------------------------------------------------
PASSAGE_LEN = 18.95
CHAMBER_CORE_X_MIN = -1.45
CHAMBER_CORE_X_MAX = 1.45
CHAMBER_CORE_Y_MIN = 18.95
CHAMBER_CORE_Y_MAX = 22.15
CHAMBER_FLOOR_Z = 1.95
VAULT_SPRING_Z = 5.05  # 3.10 m above chamber floor; above all 4 portal openings
CAPSTONE_Z = 7.95      # 6.00 m clear height above chamber floor (1.95 + 6.00)
CAPSTONE_RADIUS = 0.48
VAULT_STEPS = 16

# Cruciform Recesses
WEST_RECESS = {
    "x_min": -3.00,
    "x_max": -1.45,
    "y_min": 19.85,
    "y_max": 21.35,
    "z_floor": CHAMBER_FLOOR_Z,
    "z_ceil": 4.30,  # 2.35 m clear height
}

EAST_RECESS = {
    "x_min": 1.45,
    "x_max": 3.55,   # Total W-E span = 3.00 + 3.55 = 6.55 m
    "y_min": 19.70,
    "y_max": 21.55,
    "z_floor": CHAMBER_FLOOR_Z,
    "z_ceil": 4.65,  # 2.70 m clear height (largest recess)
}

NORTH_RECESS = {
    "x_min": -0.82,
    "x_max": 0.82,
    "y_min": 22.15,
    "y_max": 24.20,  # Total N-S chamber span = 24.20 - 18.95 = 5.25 m
    "z_floor": CHAMBER_FLOOR_Z,
    "z_ceil": 4.45,  # 2.50 m clear height
}

# Entrance & Roof-Box
ENTRANCE_DOOR_LEN = 1.50
ENTRANCE_DOOR_Z = 1.55
ROOFBOX_Y_MIN = 0.00
ROOFBOX_Y_MAX = 1.50
ROOFBOX_X_HALF = 0.50
ROOFBOX_Z_MIN = 1.90
ROOFBOX_Z_MAX = 2.55
ROOFBOX_SLIT_X_HALF = 0.46
ROOFBOX_SLIT_Z_MIN = 2.16
ROOFBOX_SLIT_Z_MAX = 2.42  # 26 cm slit height

# Exterior Mound Context
MOUND_CENTER_X = 0.0
MOUND_CENTER_Y = 22.0
MOUND_RADIUS = 42.5    # 85.0 m diameter
MOUND_HEIGHT = 12.5
NUM_KERBSTONES = 97

# Acoustic material integer codes
MAT_SOLID = 0
MAT_AIR = 1
MAT_ORTHOSTAT = 2
MAT_CORBEL_VAULT = 3
MAT_EARTH_FLOOR = 4
MAT_GRANITE_BASIN = 5
MAT_ROOFBOX_QUARTZ = 6
MAT_ENTRANCE_PORTAL = 7
MAT_ROOFBOX_SLIT = 8
MAT_EXTERIOR_AIR = 9

MATERIAL_NAMES = {
    MAT_ORTHOSTAT: "greywacke_orthostat",
    MAT_CORBEL_VAULT: "corbelled_vault",
    MAT_EARTH_FLOOR: "compacted_earth_floor",
    MAT_GRANITE_BASIN: "granite_basin",
    MAT_ROOFBOX_QUARTZ: "roofbox_quartz",
    MAT_ENTRANCE_PORTAL: "entrance_portal",
    MAT_ROOFBOX_SLIT: "roofbox_slit",
}


# ---------------------------------------------------------------------------
# 2. Subterranean Air Physics & ISO 9613-1 Air Absorption
# ---------------------------------------------------------------------------
OCTAVE_BANDS = np.array([63, 125, 250, 500, 1000, 2000, 4000, 8000], dtype=np.float64)
TEMP_C = 11.0
RH_PCT = 85.0
PRESSURE_KPA = 101.325


def compute_air_properties(
    temp_c: float = TEMP_C, rh_pct: float = RH_PCT, p_kpa: float = PRESSURE_KPA
) -> Dict[str, object]:
    """Compute subterranean speed of sound, air density, and ISO 9613-1 attenuation."""
    T = temp_c + 273.15
    T0 = 293.15
    T01 = 273.16
    p_a = p_kpa / 101.325

    # Saturation vapor pressure ratio (ISO 9613-1 eq. B.1)
    C_sat = -6.8346 * (T01 / T) ** 1.261 + 4.6151
    p_sat_ratio = 10.0 ** C_sat
    h = rh_pct * p_sat_ratio / p_a  # molar concentration of water vapor (%)

    # Speed of sound with humidity correction (Cramer 1993 approximate)
    x_w = h / 100.0
    c = 331.45 * math.sqrt(T / 273.15) * (1.0 + 0.16 * x_w)

    # Air density
    R_dry = 287.058
    rho0 = (p_kpa * 1000.0) / (R_dry * T) * (1.0 - 0.378 * x_w)

    # Relaxation frequencies (Hz)
    fr_O = p_a * (24.0 + 4.04e4 * h * ((0.02 + h) / (0.391 + h)))
    fr_N = (
        p_a
        * ((T / T0) ** (-0.5))
        * (9.0 + 280.0 * h * math.exp(-4.170 * (((T / T0) ** (-1.0 / 3.0)) - 1.0)))
    )

    f = OCTAVE_BANDS
    term1 = 1.84e-11 * (1.0 / p_a) * math.sqrt(T / T0)
    term2 = ((T / T0) ** (-2.5)) * (
        0.01275 * math.exp(-2239.1 / T) / (fr_O + (f**2) / fr_O)
        + 0.1068 * math.exp(-3352.0 / T) / (fr_N + (f**2) / fr_N)
    )
    # Alpha in dB/m per ISO 9613-1:
    alpha_db_per_m = 8.686 * (f**2) * (term1 + term2)
    # Power attenuation coefficient m in Np/m (for intensity I ~ exp(-2*m*d) or energy E ~ exp(-m_energy*d)):
    # Note: 10*log10(exp(-2*alpha_amp*d)) = -alpha_db_per_m * d => energy decay coefficient m_energy = alpha_db_per_m * ln(10)/10
    m_energy_per_m = alpha_db_per_m * (math.log(10.0) / 10.0)

    return {
        "temp_c": temp_c,
        "rh_pct": rh_pct,
        "pressure_kpa": p_kpa,
        "c": c,
        "rho0": rho0,
        "octave_bands_hz": OCTAVE_BANDS.tolist(),
        "air_attenuation_db_per_m": alpha_db_per_m,
        "air_attenuation_energy_np_per_m": m_energy_per_m,
    }


AIR_PROPS = compute_air_properties()
SPEED_OF_SOUND = float(AIR_PROPS["c"])


# ---------------------------------------------------------------------------
# 3. Acoustic Material Properties (63 Hz - 8 kHz Octave Bands)
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class AcousticMaterial:
    code: int
    name: str
    alpha: np.ndarray    # Sabine/energy absorption [8]
    scatter: np.ndarray  # Random-incidence scattering [8]
    rgb: Tuple[float, float, float]


MATERIALS: Dict[str, AcousticMaterial] = {
    "greywacke_orthostat": AcousticMaterial(
        MAT_ORTHOSTAT,
        "greywacke_orthostat",
        np.array([0.020, 0.025, 0.030, 0.035, 0.040, 0.045, 0.050, 0.055]),
        np.array([0.08, 0.12, 0.18, 0.25, 0.35, 0.45, 0.55, 0.60]),
        (0.42, 0.39, 0.35),
    ),
    "corbelled_vault": AcousticMaterial(
        MAT_CORBEL_VAULT,
        "corbelled_vault",
        np.array([0.025, 0.035, 0.045, 0.055, 0.060, 0.065, 0.070, 0.075]),
        np.array([0.12, 0.20, 0.32, 0.48, 0.62, 0.72, 0.78, 0.82]),
        (0.36, 0.34, 0.31),
    ),
    "granite_basin": AcousticMaterial(
        MAT_GRANITE_BASIN,
        "granite_basin",
        np.array([0.010, 0.010, 0.012, 0.015, 0.015, 0.020, 0.020, 0.025]),
        np.array([0.05, 0.08, 0.12, 0.18, 0.22, 0.28, 0.35, 0.40]),
        (0.58, 0.56, 0.52),
    ),
    "compacted_earth_floor": AcousticMaterial(
        MAT_EARTH_FLOOR,
        "compacted_earth_floor",
        np.array([0.060, 0.080, 0.110, 0.150, 0.200, 0.240, 0.280, 0.320]),
        np.array([0.08, 0.12, 0.18, 0.24, 0.30, 0.36, 0.42, 0.48]),
        (0.30, 0.25, 0.20),
    ),
    "roofbox_quartz": AcousticMaterial(
        MAT_ROOFBOX_QUARTZ,
        "roofbox_quartz",
        np.array([0.015, 0.018, 0.020, 0.025, 0.025, 0.030, 0.035, 0.040]),
        np.array([0.10, 0.15, 0.22, 0.30, 0.38, 0.45, 0.50, 0.55]),
        (0.84, 0.82, 0.78),
    ),
    "entrance_portal": AcousticMaterial(
        MAT_ENTRANCE_PORTAL,
        "entrance_portal",
        np.ones(8, dtype=np.float64),
        np.zeros(8, dtype=np.float64),
        (0.12, 0.16, 0.22),
    ),
    "roofbox_slit": AcousticMaterial(
        MAT_ROOFBOX_SLIT,
        "roofbox_slit",
        np.ones(8, dtype=np.float64),
        np.zeros(8, dtype=np.float64),
        (0.95, 0.78, 0.35),
    ),
}

MATERIALS_BY_CODE: Dict[int, AcousticMaterial] = {m.code: m for m in MATERIALS.values()}


# ---------------------------------------------------------------------------
# 4. Acoustic Stations (Source-Receiver Pairs)
# ---------------------------------------------------------------------------
ACOUSTIC_STATIONS = {
    "chamber_center": {
        "label": "Chamber Center (Ritual Core)",
        "description": "Speaker/chanter in central cruciform chamber; listener 0.77 m aside.",
        "src": (0.00, 20.55, 3.35),
        "rec": (0.65, 20.95, 3.45),
        "rec_facing": (0.00, -1.00, 0.00),
    },
    "east_to_west": {
        "label": "East Recess to West Recess",
        "description": "Cross-chamber transmission across the 6.55 m transept axis.",
        "src": (2.45, 20.60, 3.30),
        "rec": (-2.25, 20.60, 3.30),
        "rec_facing": (1.00, 0.00, 0.00),
    },
    "chamber_to_passage": {
        "label": "Chamber to Mid-Passage",
        "description": "Sound radiating from chamber down the narrow megalithic passage (y=10 m).",
        "src": (0.00, 20.55, 3.35),
        "rec": (0.00, 10.00, 2.35),
        "rec_facing": (0.00, 1.00, 0.00),
    },
    "chamber_to_entrance": {
        "label": "Chamber to Entrance Doorway",
        "description": "Transmission from inner sanctum to the entrance threshold (18.95 m).",
        "src": (0.00, 20.55, 3.35),
        "rec": (0.00, 0.55, 1.05),
        "rec_facing": (0.00, 1.00, 0.00),
    },
    "outside_to_chamber": {
        "label": "Exterior Forecourt to Chamber",
        "description": "External drum/horn outside K1 portal heard deep inside the chamber.",
        "src": (0.00, -1.20, 1.25),
        "rec": (0.00, 20.55, 3.35),
        "rec_facing": (0.00, -1.00, 0.00),
    },
}


# ---------------------------------------------------------------------------
# 5. Parametric Floor, Ceiling, Width, Vault & Basin Profiles
# ---------------------------------------------------------------------------
def smoothstep(edge0: float, edge1: float, x: np.ndarray | float) -> np.ndarray | float:
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def floor_z(y: np.ndarray | float) -> np.ndarray | float:
    """Elevation of compacted passage/chamber floor (m). Smoothly rises 0 -> 1.95 m."""
    y_arr = np.asarray(y, dtype=np.float64)
    t = np.clip(y_arr / PASSAGE_LEN, 0.0, 1.0)
    # Follows natural Boyne ridge slope: steeper in inner half while keeping solstice beam clear
    z = CHAMBER_FLOOR_Z * (0.72 * t + 0.28 * (t ** 1.85))
    z = np.where(y_arr <= 0.0, 0.0, z)
    z = np.where(y_arr >= PASSAGE_LEN, CHAMBER_FLOOR_Z, z)
    return float(z) if np.ndim(y) == 0 else z


def passage_ceil_z(y: np.ndarray | float) -> np.ndarray | float:
    """Ceiling height of passage (m). Steps up cleanly to VAULT_SPRING_Z (5.05 m) at y=18.95."""
    y_arr = np.asarray(y, dtype=np.float64)
    # Piecewise C1 smooth interpolation:
    # [0.0, 1.50] entrance doorway lintel = 1.55 m (roof-box sits separately at z=1.90..2.55)
    # [1.50, 14.0] main passage lintels RS2..RS13 rising 2.55 -> 3.25 m
    # [14.0, 18.95] inner corbelled passage RS14..RS17 rising 3.25 -> 5.05 m
    z_main = 2.55 + 0.70 * smoothstep(1.50, 14.0, y_arr)
    z_inner = 3.25 + (VAULT_SPRING_Z - 3.25) * smoothstep(14.0, PASSAGE_LEN, y_arr)
    z = np.where(y_arr < 1.50, ENTRANCE_DOOR_Z, np.where(y_arr < 14.0, z_main, z_inner))
    return float(z) if np.ndim(y) == 0 else z


def passage_half_width(y: np.ndarray | float, z_rel: np.ndarray | float = 0.8) -> np.ndarray | float:
    """Half-width of passage (m) including slight pinch near L15-L19/R15-R18 and inward lean."""
    y_arr = np.asarray(y, dtype=np.float64)
    zr = np.asarray(z_rel, dtype=np.float64)
    # Base half-width ~0.50 m, narrows subtly to 0.44 m around y=14.2 m, widens to 0.56 m at portal
    pinch = 0.06 * np.exp(-0.5 * ((y_arr - 14.2) / 2.2) ** 2)
    portal_flare = 0.06 * smoothstep(16.5, PASSAGE_LEN, y_arr)
    base_hw = 0.50 - pinch + portal_flare
    # Subtle inward lean of orthostats up to ~0.045 m near mid-passage
    lean_strength = np.exp(-0.5 * ((y_arr - 13.0) / 4.5) ** 2)
    lean = 0.045 * lean_strength * np.clip(zr / 1.8, 0.0, 1.0)
    hw = np.maximum(0.39, base_hw - lean)
    return float(hw) if (np.ndim(y) == 0 and np.ndim(z_rel) == 0) else hw


def vault_profile_at_z(z: float) -> Tuple[float, float, float]:
    """
    Cross-section of the stepped corbelled vault at elevation z in [VAULT_SPRING_Z, CAPSTONE_Z].
    Returns (half_x, half_y, superellipse_exponent_p) centered at (0, 20.55).
    """
    u = float(np.clip((z - VAULT_SPRING_Z) / (CAPSTONE_Z - VAULT_SPRING_Z), 0.0, 1.0))
    # Smooth corbelled dome overhang curve (concave inward taper)
    taper = (1.0 - u) ** 0.72
    hx = CAPSTONE_RADIUS + (1.45 - CAPSTONE_RADIUS) * taper
    hy = CAPSTONE_RADIUS + (1.60 - CAPSTONE_RADIUS) * taper
    # Morph from rectangular core (p=18) at z=5.05 to octagonal/circular capstone (p=2.2) at z=7.95
    p_exp = 2.2 + 15.8 * ((1.0 - u) ** 1.35)
    return hx, hy, p_exp


def basin_elevation_grid(x: np.ndarray, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute local stone basin elevation above CHAMBER_FLOOR_Z (m) and boolean basin mask
    for points (x, y) inside the cruciform chamber.
    Includes West, North, and nested Double East granite basins.
    """
    z_add = np.zeros_like(x, dtype=np.float64)
    is_basin = np.zeros_like(x, dtype=bool)

    def add_elliptical_basin(cx, cy, rx, ry, h_rim, h_bowl):
        nonlocal z_add, is_basin
        r = np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
        inside = r <= 1.0
        # Raised rim around r in [0.72, 1.0], concave hollowed dish inside r < 0.72
        rim_profile = np.where(
            r < 0.72,
            h_bowl + (h_rim - h_bowl) * (r / 0.72) ** 2,
            h_rim * (1.0 - ((r - 0.72) / 0.28) ** 2 * 0.35),
        )
        z_add = np.where(inside, np.maximum(z_add, rim_profile), z_add)
        is_basin |= inside

    # West Recess Basin (1.15 x 0.88 x 0.34 m)
    add_elliptical_basin(-2.25, 20.60, 0.56, 0.44, 0.32, 0.22)
    # North Recess Basin (1.30 x 1.00 x 0.26 m)
    add_elliptical_basin(0.00, 23.20, 0.58, 0.48, 0.26, 0.18)
    # East Recess Lower Large Basin (1.70 x 1.12 x 0.28 m)
    add_elliptical_basin(2.55, 20.62, 0.82, 0.56, 0.24, 0.16)
    # East Recess Upper Nested Basin (1.05 x 0.96 x 0.32 m sitting on lower)
    add_elliptical_basin(2.58, 20.62, 0.50, 0.45, 0.48, 0.35)

    return z_add, is_basin


def verify_solstice_ray() -> Dict[str, float]:
    """
    Verify geometric line-of-sight for the Winter Solstice sunbeam:
    Enters roof-box slit at y=0, z=2.31 m descending at 1.0 deg (Boyne valley horizon angle).
    """
    slope = -math.tan(math.radians(1.00))
    y_samples = np.linspace(0.0, 21.5, 220)
    z_ray = 2.31 + slope * y_samples
    fz = floor_z(y_samples)
    cz = np.where(y_samples <= 1.50, ROOFBOX_Z_MAX, passage_ceil_z(y_samples))
    # For y < 1.50, ray must also clear roofbox bottom (1.90 m)
    floor_lim = np.where(y_samples <= 1.50, ROOFBOX_Z_MIN, fz)

    passage_mask = y_samples <= PASSAGE_LEN
    min_floor_clearance = float(np.min(z_ray[passage_mask] - floor_lim[passage_mask]))
    min_ceil_clearance = float(np.min(cz[passage_mask] - z_ray[passage_mask]))
    # Where beam hits chamber floor (z = 1.95 m):
    y_hit = (CHAMBER_FLOOR_Z - 2.31) / slope
    return {
        "entry_z_m": 2.31,
        "descent_deg": 1.00,
        "z_at_chamber_threshold_m": float(2.31 + slope * PASSAGE_LEN),
        "floor_hit_y_m": float(y_hit),
        "min_floor_clearance_passage_m": min_floor_clearance,
        "min_ceil_clearance_passage_m": min_ceil_clearance,
        "clears_passage": bool(min_floor_clearance > 0.0 and min_ceil_clearance > 0.05),
    }


# ---------------------------------------------------------------------------
# 6. Exact Volumetric Cavity Predicate (for 3D FDTD Voxelizer)
# ---------------------------------------------------------------------------
def classify_cavity_points(
    X: np.ndarray, Y: np.ndarray, Z: np.ndarray, include_exterior: bool = True
) -> np.ndarray:
    """
    Classify 3D coordinates (X, Y, Z) into:
      MAT_SOLID (0), MAT_AIR (1), or MAT_EXTERIOR_AIR (9).
    Matches the watertight 3D mesh boundaries exactly.
    """
    grid = np.full(X.shape, MAT_SOLID, dtype=np.int32)

    # 1. Passage air cavity (0 <= y <= 18.95)
    fz = floor_z(Y)
    cz = passage_ceil_z(Y)
    hw = passage_half_width(Y, Z - fz)
    in_passage = (
        (Y >= 0.0)
        & (Y <= PASSAGE_LEN)
        & (np.abs(X) <= hw)
        & (Z >= fz)
        & (Z <= cz)
    )

    # 2. Roof-box cavity (0 <= y <= 1.55, overlaps cleanly into passage at y=1.50)
    in_roofbox_inner = (
        (Y >= 0.08)
        & (Y <= 1.55)
        & (np.abs(X) <= ROOFBOX_X_HALF)
        & (Z >= ROOFBOX_Z_MIN)
        & (Z <= ROOFBOX_Z_MAX)
    )
    in_roofbox_slit = (
        (Y >= 0.0)
        & (Y < 0.08)
        & (np.abs(X) <= ROOFBOX_SLIT_X_HALF)
        & (Z >= ROOFBOX_SLIT_Z_MIN)
        & (Z <= ROOFBOX_SLIT_Z_MAX)
    )

    # 3. Cruciform Chamber Core & Recesses (excluding granite basins)
    basin_z, _ = basin_elevation_grid(X, Y)
    eff_chamber_floor = CHAMBER_FLOOR_Z + basin_z

    in_core = (
        (X >= CHAMBER_CORE_X_MIN)
        & (X <= CHAMBER_CORE_X_MAX)
        & (Y >= CHAMBER_CORE_Y_MIN)
        & (Y <= CHAMBER_CORE_Y_MAX)
        & (Z >= eff_chamber_floor)
        & (Z <= VAULT_SPRING_Z)
    )
    in_west = (
        (X >= WEST_RECESS["x_min"])
        & (X <= WEST_RECESS["x_max"])
        & (Y >= WEST_RECESS["y_min"])
        & (Y <= WEST_RECESS["y_max"])
        & (Z >= eff_chamber_floor)
        & (Z <= WEST_RECESS["z_ceil"])
    )
    in_east = (
        (X >= EAST_RECESS["x_min"])
        & (X <= EAST_RECESS["x_max"])
        & (Y >= EAST_RECESS["y_min"])
        & (Y <= EAST_RECESS["y_max"])
        & (Z >= eff_chamber_floor)
        & (Z <= EAST_RECESS["z_ceil"])
    )
    in_north = (
        (X >= NORTH_RECESS["x_min"])
        & (X <= NORTH_RECESS["x_max"])
        & (Y >= NORTH_RECESS["y_min"])
        & (Y <= NORTH_RECESS["y_max"])
        & (Z >= eff_chamber_floor)
        & (Z <= NORTH_RECESS["z_ceil"])
    )

    # 4. Stepped Corbelled Vault (VAULT_SPRING_Z < Z <= CAPSTONE_Z)
    in_vault = np.zeros(X.shape, dtype=bool)
    vault_z_mask = (Z > VAULT_SPRING_Z) & (Z <= CAPSTONE_Z)
    if np.any(vault_z_mask):
        z_v = Z[vault_z_mask]
        # Quantize slightly to VAULT_STEPS steps to match physical stepped corbel rings
        step_idx = np.floor(
            np.clip((z_v - VAULT_SPRING_Z) / (CAPSTONE_Z - VAULT_SPRING_Z), 0.0, 0.9999)
            * VAULT_STEPS
        )
        z_step_mid = VAULT_SPRING_Z + (step_idx + 0.5) / VAULT_STEPS * (
            CAPSTONE_Z - VAULT_SPRING_Z
        )
        u = np.clip((z_step_mid - VAULT_SPRING_Z) / (CAPSTONE_Z - VAULT_SPRING_Z), 0.0, 1.0)
        taper = (1.0 - u) ** 0.72
        hx = CAPSTONE_RADIUS + (1.45 - CAPSTONE_RADIUS) * taper
        hy = CAPSTONE_RADIUS + (1.60 - CAPSTONE_RADIUS) * taper
        p_exp = 2.2 + 15.8 * ((1.0 - u) ** 1.35)
        norm_r = (
            (np.abs(X[vault_z_mask]) / hx) ** p_exp
            + (np.abs(Y[vault_z_mask] - 20.55) / hy) ** p_exp
        ) ** (1.0 / p_exp)
        in_vault[vault_z_mask] = norm_r <= 1.0

    interior = (
        in_passage | in_roofbox_inner | in_roofbox_slit | in_core | in_west | in_east | in_north | in_vault
    )
    grid[interior] = MAT_AIR

    if include_exterior:
        # Exterior open forecourt radiation domain (y < 0.0)
        in_ext = (Y < 0.0) & (Z >= 0.0)
        grid[in_ext] = MAT_EXTERIOR_AIR

    return grid


def classify_solid_surface_material(x: float, y: float, z: float) -> int:
    """Classify the acoustic material code of a solid voxel bordering an interior air voxel."""
    if y < 1.60 and z >= ROOFBOX_Z_MIN - 0.15:
        return MAT_ROOFBOX_QUARTZ
    fz = float(floor_z(y))
    if y < PASSAGE_LEN and z <= fz + 0.08:
        return MAT_EARTH_FLOOR
    if y >= PASSAGE_LEN:
        _, is_b = basin_elevation_grid(np.array([x]), np.array([y]))
        if bool(is_b[0]) and z <= CHAMBER_FLOOR_Z + 0.55:
            return MAT_GRANITE_BASIN
        if z <= CHAMBER_FLOOR_Z + 0.08:
            return MAT_EARTH_FLOOR
        if z >= VAULT_SPRING_Z - 0.08:
            return MAT_CORBEL_VAULT
    return MAT_ORTHOSTAT


def analytical_acoustics_summary() -> Dict[str, float]:
    """Compute theoretical Helmholtz & Schroeder frequencies for Newgrange."""
    # Effective chamber volume ~ 56-62 m^3, passage area ~ 1.05 m^2, length 18.95 m
    V_chamber = 60.0
    V_total = 92.0
    S_passage = 1.05
    L_eff = PASSAGE_LEN + 0.85 * math.sqrt(S_passage)
    f_helmholtz = (SPEED_OF_SOUND / (2.0 * math.pi)) * math.sqrt(
        S_passage / (V_chamber * L_eff)
    )
    # Approximate Sabine RT60 around 1 kHz (mean alpha ~ 0.06, surface ~ 165 m^2)
    est_rt60_mid = 0.161 * V_total / (165.0 * 0.065)
    f_schroeder = 2000.0 * math.sqrt(est_rt60_mid / V_total)
    # Passage longitudinal half-wavelength harmonics: f_n = n * c / (2 * L_total)
    L_total = PASSAGE_LEN + 5.25
    return {
        "speed_of_sound_m_s": SPEED_OF_SOUND,
        "air_density_kg_m3": float(AIR_PROPS["rho0"]),
        "helmholtz_coupled_hz": round(f_helmholtz, 2),
        "schroeder_crossover_hz": round(f_schroeder, 1),
        "passage_half_wave_fundamental_hz": round(SPEED_OF_SOUND / (2.0 * PASSAGE_LEN), 2),
        "total_tube_110hz_harmonic_order": round(110.0 / (SPEED_OF_SOUND / (2.0 * L_total)), 2),
    }


if __name__ == "__main__":
    print("Air Properties:", {k: (v.tolist() if isinstance(v, np.ndarray) else v) for k, v in AIR_PROPS.items()})
    print("Solstice Ray Verification:", verify_solstice_ray())
    print("Analytical Acoustics:", analytical_acoustics_summary())
