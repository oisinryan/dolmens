"""
Comparative Megalithic Chamber Acoustics Specification & Primary Evidence Dataset
Encodes data from:
  - "The Note in the Stone" (The Nommo, Nov 2026):
    https://thenommo.com/articles/megalithic-chamber-acoustics-newgrange-maeshowe.html
  - Jahn, R. G., Devereux, P., & Ibison, M. (1996). JASA 99(2), 649-658.
  - Watson, A., & Keating, D. (1999). Antiquity 73(280), 325-336; Watson (2001); Watson & Was (2021).
  - Cook, I. A., Pajot, S. K., & Leuchter, A. F. (2008). Time and Mind 1(1), 95-104.
  - Fazenda, B., Scarre, C., Till, R., et al. (2017). JASA 142(3), 1332-1349.
  - Historic Environment Scotland (2025) & World Heritage Ireland (2024).
"""

from __future__ import annotations

import math
from typing import Dict, List


SPEED_OF_SOUND_20C = 344.0
SPEED_OF_SOUND_10C = 337.5
SPEED_OF_SOUND_11C = 338.65
SPEED_OF_SOUND_0C = 331.5


def ideal_box_modes(lx: float, ly: float, lz: float, c: float = SPEED_OF_SOUND_20C, max_hz: float = 130.0) -> List[Dict[str, object]]:
    """
    Compute exact rigid-wall rectangular cavity eigenmodes:
      f(nx, ny, nz) = (c / 2) * sqrt((nx/Lx)^2 + (ny/Ly)^2 + (nz/Lz)^2)
    Returns all non-zero modes strictly below max_hz sorted by frequency.
    """
    nx_max = int(math.ceil(2.0 * max_hz * lx / c)) + 1
    ny_max = int(math.ceil(2.0 * max_hz * ly / c)) + 1
    nz_max = int(math.ceil(2.0 * max_hz * lz / c)) + 1
    modes = []
    for nx in range(nx_max):
        for ny in range(ny_max):
            for nz in range(nz_max):
                if nx == 0 and ny == 0 and nz == 0:
                    continue
                f = 0.5 * c * math.sqrt((nx / lx) ** 2 + (ny / ly) ** 2 + (nz / lz) ** 2)
                if f < max_hz:
                    modes.append({"indices": [nx, ny, nz], "freq_hz": round(f, 2)})
    modes.sort(key=lambda m: m["freq_hz"])
    return modes


SITES: List[Dict[str, object]] = [
    {
        "id": "maeshowe",
        "name": "Maeshowe",
        "location": "Mainland, Orkney, Scotland",
        "era": "Neolithic (c. 2700 BCE)",
        "type": "Square Passage Tomb (Clay-Sealed)",
        "has_3d_model": True,
        "glb_file": "maeshowe.glb",
        "chamber_dims_m": {"width": 4.7, "length": 4.7, "height": 4.5},
        "passage_dims_m": {"length": 11.0, "width": 0.90, "height": 1.35, "hes_notes": "10 m visitor page / ~15 m formal statement; outer rebuilt 1861"},
        "mound_dims_m": {"diameter": 35.0, "height": 7.0},
        "masonry": "Tightly dressed Devonian flagstones ('effectively solid stone'); 4 corner buttress standing stones; 3 raised single-slab side cells; clay-sealed mound.",
        "measured_resonances_hz": [109.8],
        "measured_band_label": "~110 Hz (strongest square standing waves)",
        "helmholtz_measured": {
            "frequency_hz": 2.0,
            "walking_db": 120.0,
            "drum_db": 110.0,
            "wavelength_m": 172.0,
            "status": "Confirmed empirically (Watson & Keating 1998): only Neolithic site with measured Helmholtz resonance",
        },
        "key_features": [
            "Square 4.7 × 4.7 × 4.5 m plan stacks third axial modes (3,0,0) and (0,3,0) onto 109.8 Hz",
            "38 ideal-box modes below 130 Hz; 13 within 95–120 Hz",
            "Recessed blocking stone leaves narrow gap to passage ceiling for acoustic coupling",
        ],
        "camera_preset": {"eye": [11.0, -7.5, 6.2], "target": [0.0, 10.5, 2.3]},
        "clip_default": {"axis": 0, "pos": 0.2},
        "slice_defaults": {"x": 0.0, "z": 2.1},
    },
    {
        "id": "newgrange",
        "name": "Newgrange",
        "location": "Brú na Bóinne, Co. Meath, Ireland",
        "era": "Neolithic (c. 3200 BCE)",
        "type": "Cruciform Passage Tomb (Corbelled)",
        "has_3d_model": True,
        "glb_file": "../newgrange/models/newgrange_monument.glb",
        "chamber_dims_m": {"width": 6.55, "length": 5.25, "height": 6.0},
        "passage_dims_m": {"length": 18.95, "width": 1.0, "height": 1.85, "slope_pct": 8.0},
        "mound_dims_m": {"diameter": 85.0, "height": 12.5},
        "masonry": "Rounded water-rolled Carboniferous greywacke orthostats with permeable gaps; 18-course corbelled vault with rainwater grooves cut in roof slabs; quartz facade.",
        "measured_resonances_hz": [110.0],
        "measured_band_label": "110 Hz (Jahn et al. 1996); 105.4 & 111.5 Hz (3D FDTD)",
        "helmholtz_measured": {
            "frequency_hz": 1.5,
            "walking_db": None,
            "drum_db": None,
            "wavelength_m": None,
            "status": "Predicted 1–2 Hz by Watson & Keating (2001), but measured NO response due to permeable stone joints & roof drains",
        },
        "key_features": [
            "~12 fixed antinode/node pairs (λ/2 ≈ 1.56 m) along the 19 m passage like a wind instrument",
            "Open Roof-Box above entrance doorway acts as Winter Solstice light slot and potential acoustic mouthpiece",
            "West recess corbel bears carved zigzag lines matching nodal loop count (Jahn et al. 1996 observation)",
        ],
        "camera_preset": {"eye": [14.5, 8.5, 8.2], "target": [0.0, 14.5, 2.8]},
        "clip_default": {"axis": 0, "pos": 0.15},
        "slice_defaults": {"x": 0.0, "z": 2.6},
    },
    {
        "id": "loughcrew_l",
        "name": "Loughcrew Cairn L",
        "location": "Slieve na Calliagh, Co. Meath, Ireland",
        "era": "Neolithic (c. 3300 BCE)",
        "type": "Compartmented Passage Tomb (7 Stone Bays)",
        "has_3d_model": True,
        "glb_file": "loughcrew_cairn_l.glb",
        "chamber_dims_m": {"width": 4.2, "length": 4.0, "height": 2.9},
        "passage_dims_m": {"length": 6.4, "width": 0.9, "height": 1.5},
        "mound_dims_m": {"diameter": 41.0, "height": 5.5},
        "masonry": "Radial upright partition orthostats dividing the chamber into 7 stone compartments around an eccentric standing pillar stone.",
        "measured_resonances_hz": [110.0],
        "measured_band_label": "110 Hz (Jahn et al. 1996)",
        "helmholtz_measured": None,
        "key_features": [
            "Jahn et al. (1996) speculated builders may have positioned sector stones to sharpen resonance",
            "Toggleable interior partition orthostats in our 3D model & live FDTD comparison (Test #2)",
        ],
        "camera_preset": {"eye": [8.6, -3.5, 5.2], "target": [0.0, 6.8, 1.6]},
        "clip_default": {"axis": 0, "pos": 0.2},
        "slice_defaults": {"x": 0.0, "z": 1.4},
    },
    {
        "id": "loughcrew_i",
        "name": "Loughcrew Cairn I",
        "location": "Slieve na Calliagh, Co. Meath, Ireland",
        "era": "Neolithic (c. 3300 BCE)",
        "type": "Compartmented Passage Tomb (7 Bays)",
        "has_3d_model": False,
        "glb_file": None,
        "chamber_dims_m": {"width": 3.8, "length": 3.6, "height": 2.5},
        "passage_dims_m": {"length": 5.5, "width": 0.85, "height": 1.4},
        "mound_dims_m": {"diameter": 21.0, "height": 3.0},
        "masonry": "Seven-compartment radial orthostat chamber similar in plan to Cairn L.",
        "measured_resonances_hz": [112.0],
        "measured_band_label": "112 Hz (Jahn et al. 1996)",
        "helmholtz_measured": None,
        "key_features": [
            "Closely matches Cairn L's compartmented resonance despite smaller outer cairn diameter",
        ],
        "camera_preset": None,
        "clip_default": None,
        "slice_defaults": None,
    },
    {
        "id": "waylands_smithy",
        "name": "Wayland's Smithy",
        "location": "Oxfordshire, England",
        "era": "Neolithic (c. 3500 BCE)",
        "type": "Cruciform Long Barrow",
        "has_3d_model": True,
        "glb_file": "waylands_smithy.glb",
        "chamber_dims_m": {"width": 4.2, "length": 3.6, "height": 1.85},
        "passage_dims_m": {"length": 5.0, "width": 0.95, "height": 1.6},
        "mound_dims_m": {"width": 14.0, "length": 56.0, "height": 3.2},
        "masonry": "Large sarsen megaliths forming a cruciform gallery with opposing ~1.5 × 1.5 m East and West transept side chambers.",
        "measured_resonances_hz": [95.0, 112.0],
        "measured_band_label": "95 Hz (West arm) / 112 Hz (East arm)",
        "helmholtz_measured": None,
        "key_features": [
            "Opposing ~1.5 × 1.5 m side chambers naturally fit ~110 Hz half-wavelength (λ/2 ≈ 1.56 m)",
            "Asymmetry between East & West stone clearances shifts the primary standing wave from 112 Hz to 95 Hz",
        ],
        "camera_preset": {"eye": [8.4, -3.5, 4.4], "target": [0.0, 4.8, 1.1]},
        "clip_default": {"axis": 2, "pos": 2.4},
        "slice_defaults": {"x": 0.0, "z": 1.0},
    },
    {
        "id": "chun_quoit",
        "name": "Chûn Quoit",
        "location": "Penwith, Cornwall, England",
        "era": "Neolithic (c. 3500 BCE)",
        "type": "Portal Dolmen (Granite Box)",
        "has_3d_model": True,
        "glb_file": "chun_quoit.glb",
        "chamber_dims_m": {"width": 1.5, "length": 1.5, "height": 1.5},
        "passage_dims_m": {"length": 0.0, "width": 0.5, "height": 1.2},
        "mound_dims_m": {"diameter": 10.0, "height": 2.2},
        "masonry": "Four inward-leaning granite orthostats enclosing a compact ~1.5 m cube under a 3.3 m domed mushroom granite capstone.",
        "measured_resonances_hz": [110.0],
        "measured_band_label": "110 Hz measured (113 Hz Jahn 1.5 m box model)",
        "helmholtz_measured": None,
        "key_features": [
            "Smallest chamber in the 1994 survey (~1.5 m across), demonstrating exact λ/2 ≈ 1.56 m cavity scaling",
            "Jahn et al.'s simple 1.5 m box model predicted 113 Hz vs 110 Hz measured",
        ],
        "camera_preset": {"eye": [4.6, -4.6, 2.8], "target": [0.0, 0.0, 1.0]},
        "clip_default": {"axis": 0, "pos": 0.25},
        "slice_defaults": {"x": 0.0, "z": 0.85},
    },
    {
        "id": "carn_euny",
        "name": "Carn Euny (Fogou Beehive)",
        "location": "Sancreed, Cornwall, England",
        "era": "Iron Age (c. 400 BCE)",
        "type": "Corbelled Beehive Chamber & Fogou",
        "has_3d_model": True,
        "glb_file": "carn_euny.glb",
        "chamber_dims_m": {"width": 4.6, "length": 4.6, "height": 3.0},
        "passage_dims_m": {"length": 9.0, "width": 0.9, "height": 1.4},
        "mound_dims_m": {"diameter": 11.0, "height": 3.4},
        "masonry": "Circular dry-stone corbelled granite beehive chamber (~4.6 m diameter) joined to a curved subterranean stone creep passage.",
        "measured_resonances_hz": [99.0],
        "measured_band_label": "99 Hz (Jahn et al. 1996)",
        "helmholtz_measured": None,
        "key_features": [
            "Iron Age subterranean corbelled chamber ~2,800 years younger than Newgrange yet still inside 95–120 Hz",
        ],
        "camera_preset": {"eye": [7.5, -5.0, 4.4], "target": [0.0, 5.2, 1.5]},
        "clip_default": {"axis": 0, "pos": 0.2},
        "slice_defaults": {"x": 0.0, "z": 1.4},
    },
]


VOICE_BENCHMARKS = {
    "source": "Sydney Voice Lab v4.0 (2025), citing Leung, Oates, Papp & Chan, Journal of Voice 36(3) (2022)",
    "male_mean_hz": 115.0,
    "male_sd_hz": 21.0,
    "male_typical_range_hz": [94.0, 136.0],
    "female_mean_hz": 199.0,
    "band_min_hz": 95.0,
    "band_max_hz": 120.0,
}


NEURO_AND_COMPARATIVE = {
    "eeg_study": {
        "citation": "Cook, I. A., Pajot, S. K., & Leuchter, A. F. (2008), Time and Mind 1(1), 95–104",
        "sample_size": 30,
        "tested_tones_hz": [90, 100, 110, 120, 130],
        "peak_effect_hz": 110,
        "findings": "Relative drop in left temporal brain activity and shift in prefrontal cortex balance from left to right at 110 Hz compared with 90, 100, 120, and 130 Hz.",
        "caveats": "Authors labeled results 'pilot findings'. Watson & Was (2021) noted 'no robust scientific evidence that single frequencies can trigger specific physiological effects' and pointed out significant methodological inconsistencies.",
    },
    "palaeolithic_caves": {
        "citation": "Fazenda, B., Scarre, C., Till, R., et al. (2017), JASA 142(3), 1332–1349",
        "sites_count": 5,
        "region": "Northern Spain (images up to ~40,000 years old)",
        "finding": "Lines and dots were statistically more likely to occur where low-frequency rock acoustics resonated ('a statistically weak but tenable hypothesis').",
    },
    "etruscan_tombs": {
        "citation": "Ortoleva, J., & Forte, M. (Sep 2026), The Conversation",
        "era": "5th century BCE",
        "finding": "Two painted Etruscan tombs exhibited deliberately engineered long reverberation designed to affect living ritual participants.",
    },
}


SOURCES: List[Dict[str, str]] = [
    {"id": "1", "citation": "Jahn, R. G., Devereux, P., & Ibison, M. (1996). 'Acoustical resonances of assorted ancient structures.' Journal of the Acoustical Society of America 99(2), 649–658.", "url": "https://doi.org/10.1121/1.414642"},
    {"id": "2", "citation": "Sydney Voice Lab, University of Sydney (2025). 'Acoustic Analysis Normative Data Reference Sheet' v4.0, citing Leung et al., Journal of Voice 36(3) (2022).", "url": "https://www.sydney.edu.au/content/dam/corporate/documents/faculty-of-medicine-and-health/research/research-centres/sydney-voice-lab/acoustic-analysis-normative-data-reference-sheet-20250416_v4.0-sydney-voice-lab.pdf.coredownload.pdf"},
    {"id": "3", "citation": "World Heritage Ireland (OPW / DHLGH, 2024). Winter Solstice Phenomenon at Newgrange: Research Report.", "url": "https://www.worldheritageireland.ie/wp-content/uploads/2024/12/1314_World-Heritage-Unit_Winter-Solstice-Research-Report_Final.pdf"},
    {"id": "4", "citation": "Watson, A. 'Maeshowe' (acoustic fieldwork account).", "url": "https://www.aaronwatson.co.uk/stones-of-stenness-1"},
    {"id": "5", "citation": "Nave, C. R. 'Speed of Sound in Air.' HyperPhysics, Georgia State University.", "url": "http://hyperphysics.phy-astr.gsu.edu/hbase/Sound/souspe.html"},
    {"id": "6", "citation": "Historic Environment Scotland (updated 2025). Maeshowe Chambered Cairn: Statement of Significance.", "url": "https://www.historicenvironment.scot/publications/all/publication/?publicationId=9c5786c0-ec08-49b1-9a56-a57000d89587"},
    {"id": "7", "citation": "Historic Environment Scotland. 'Maeshowe Chambered Cairn: History and stories.'", "url": "https://www.historicenvironment.scot/visit/all/maeshowe-chambered-cairn/history-and-stories/"},
    {"id": "8", "citation": "Watson, A., & Keating, D. (1999). 'Architecture and sound: an acoustic analysis of megalithic monuments in prehistoric Britain.' Antiquity 73(280), 325–336.", "url": "https://www.cambridge.org/core/journals/antiquity/article/architecture-and-sound-an-acoustic-analysis-of-megalithic-monuments-in-prehistoric-britain/F37AF50641B26AC288BA756A1C12EA33"},
    {"id": "9", "citation": "Watson, A., & Keating, D. (2004). 'Comments by Watson and Keating' on the acoustics of a proposed chambered mound, Earth Sanctuary.", "url": "https://earthsanctuary.org/wp-content/uploads/2024/10/Comments-by-Watson-and-Keating.pdf"},
    {"id": "10", "citation": "Nave, C. R. 'Cavity Resonance.' HyperPhysics, Georgia State University.", "url": "http://hyperphysics.phy-astr.gsu.edu/hbase/Waves/cavity.html"},
    {"id": "11", "citation": "Watson, A. 'Newgrange' (acoustic fieldwork account).", "url": "https://www.aaronwatson.co.uk/newgrange"},
    {"id": "12", "citation": "Watson, A., & Was, J. (2021). 'Notes on Chambered Mound', Earth Sanctuary.", "url": "https://earthsanctuary.org/wp-content/uploads/2024/10/Notes-on-Chambered-Mound-by-Aaron-Watson-and-John-Was-27May2021.pdf"},
    {"id": "13", "citation": "Cook, I. A., Pajot, S. K., & Leuchter, A. F. (2008). 'Ancient architectural acoustic resonance patterns and regional brain activity.' Time and Mind 1(1), 95–104.", "url": "https://doi.org/10.2752/175169608783489099"},
    {"id": "14", "citation": "Fazenda, B., Scarre, C., Till, R., et al. (2017). 'Cave acoustics in prehistory: Exploring the association of Palaeolithic visual motifs and acoustic response.' JASA 142(3), 1332–1349.", "url": "https://eprints.hud.ac.uk/id/eprint/31777/"},
    {"id": "15", "citation": "Ortoleva, J., & Forte, M. (30 Sep 2026). 'Confronting demons: how acoustic and AI technology brought ancient Etruscan tombs back to life.' The Conversation.", "url": "https://theconversation.com/confronting-demons-how-acoustic-and-ai-technology-brought-ancient-etruscan-tombs-back-to-life-293119"},
    {"id": "16", "citation": "UNESCO World Heritage Centre. 'Heart of Neolithic Orkney.'", "url": "https://whc.unesco.org/en/list/514/"},
]


if __name__ == "__main__":
    modes = ideal_box_modes(4.7, 4.7, 4.5, SPEED_OF_SOUND_20C, 130.0)
    in_band = [m for m in modes if 95.0 <= m["freq_hz"] <= 120.0]
    print(f"Maeshowe ideal box (<130 Hz): {len(modes)} modes | in 95-120 Hz: {len(in_band)}")
    print("Modes near 110 Hz:", [m for m in in_band if 105 <= m["freq_hz"] <= 115])
