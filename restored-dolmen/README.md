# Restored dolmen receiver

A fully restored portal tomb, with its cairn, fitted with a passive collector sized to give **at least +6 dB of receiver gain across the 250–500 Hz band** of [the report](../neolithic-acoustic-signal-network.md). Everything is built from materials available in Neolithic Ireland.

- **`index.html`**: the interactive dashboard. Orbit the 3D model, switch between restored, cutaway (a section along the axis) and exploded views, play the build sequence, change the collector and chamber lining, and select materials to find them in the model. It loads three.js from jsdelivr, so it needs a network connection. `#cutaway` or `#exploded` on the URL opens that view.
- **`dolmen-restored.glb`**: the assembled model at the design point, in metres, one named node per part, for Blender or any glTF viewer.

This is a design study for a hypothesis. No collector of this kind is known from the archaeology.

## The collector

A cone seated in a 0.3 m throat left in the portal's dry-stone packing, on two trestles, turned toward the sending site.

| | |
|---|---|
| Mouth diameter | 1.40 m |
| Length, throat to mouth | 2.00 m |
| Throat | 0.30 m, at 1.15 m above the chamber floor |
| Rim phase error | 11.9 cm (a quarter wavelength at 500 Hz is 17 cm) |
| Skin | about 5.5 m² |

**Gain.** The design metric is the collector's directivity gain, which is the signal-to-noise gain against diffuse background noise such as wind in vegetation:

G = η · 4πA / λ² · sinc²(δ/λ)

- A is the mouth area.
- η = 0.5 is the aperture efficiency, a cautious figure for a hand-made, slightly leaky horn.
- δ is the extra path to the rim of a cone's curved wavefront.

| Frequency | Wavelength | Gain | Beam, −3 dB |
|---:|---:|---:|---:|
| 250 Hz | 1.37 m | **+7.0 dB** | ±30.5° |
| 300 Hz | 1.14 m | +8.5 dB | ±25° |
| 400 Hz | 0.86 m | +10.9 dB | ±18.5° |
| 500 Hz | 0.69 m | +12.7 dB | ±15° |

The band's weakest point, 250 Hz, clears the target with 1 dB in hand. With the report's 2.3 km reference and spreading only, +7 dB gives a relay range of **5.15 km**. That exceeds every cluster's longest hop, including Slieve Gullion's 4.67 km. Air absorption and terrain will reduce it (see the report's range model).

Not counted, and possibly adding to the gain:
- **Throat pressure:** any pressure gain at the throat.
- **The chamber's quiet:** a cairn-covered chamber shuts out wind noise.

The beam narrows with frequency. At 250 Hz a ±30° beam is forgiving, but at 500 Hz the collector needs to be aimed within about ±15° of the sender, hence the trestles.

## The chamber

| | |
|---|---|
| Size | 2.2 × 1.5 × 1.5 m, 5.0 m³ |
| First room modes | 78, 114, 114 Hz: below the band |
| Helmholtz resonance through the throat | about 7.5 Hz: far below the band |
| Reverberation, bare stone | about 2.3 s |
| Reverberation, 10 m² lined | about 0.2 s |

Bare stone rings for about 2.3 s. The ring would take about 0.75 s to fall 20 dB, longer than the 0.3 s gaps between high pulses, so the pulses would run together. Lining about 10 m² of the floor and lower walls with bracken, heather, fleece and hides (α ≈ 0.4) brings it down to about 0.2 s. The listener sits on a low stone with the ear on the collector's axis, 1.15 m up.

## The restored tomb

| Part | Size |
|---|---|
| Portal stones | 2.3 m, with a 0.9 m gap |
| Doorstone | 0.85 m high |
| Dry-stone packing | fills the portal gap above the doorstone, leaving the throat |
| Side stones and backstone | 1.75–1.85 m |
| Capstone | about 3.4 × 2.4 × 0.6 m, 10 t, sloping from the portal to the back |
| Long cairn | about 14 × 9 m, 3 m high at the portal, open at the forecourt, with a boulder kerb |

## Materials of the period (c. 3800–3200 BC)

| Part | Material | Where it comes from | Amount |
|---|---|---|---|
| Capstone and uprights | Local bedrock or glacial erratics, e.g. granophyre and granite around Slieve Gullion | Nearest outcrop; split with wedges and levers, moved on timber rollers and earth ramps | About 10 t capstone; seven uprights of 1–3 t |
| Cairn and kerb | Field stones, earth, turf; larger boulders for the kerb | Field clearance | About 150 m³ |
| Packing and throat collar | Dry-stone walling and turf; a carved alder ring sealed with clay | Cairn stone; alder from wet ground | About 0.4 m³; one ring |
| Collector frame | 16 split hazel or ash staves on 7 bent ash hoops, lashed with rawhide or willow | Coppiced hazel and ash | About 35 m of staves, 20 m of hoop |
| Collector skin | Cattle hide sewn over the frame, or overlapped birch-bark sheets | Cattle arrived with farming; birch on poorer and upland ground | About 5.5 m², two or three hides |
| Seams | Birch-bark tar, pine resin or hide glue | Birch-bark tar is a well-attested Neolithic adhesive in Europe | Under 1 kg |
| Trestles | Oak or ash A-frames with a cradle | Split poles | Six poles of about 2 m |
| Chamber lining | Bracken, heather, fleece, hides | Cut locally; sheep arrived with farming | About 10 m² |
| Tools | Polished stone axes, flint, antler picks, levers, hide ropes | Porcellanite axes from Tievebulliagh and Rathlin; Antrim flint | |

The materials are all of the period. Their use in a collector is not attested: wattle, hide and bark rarely survive.

## Build sequence

1. Portal stones
2. Side stones and backstone
3. Capstone
4. Doorstone and packing, leaving the throat
5. Chamber lining and seat stone
6. Cairn
7. Kerb
8. Collector on its trestles
9. Listener

The dashboard animates these steps.

## Working on it

```sh
npm ci
npm run build   # index.html (and out/artifact.html, out/test.html) from page.html and src/
npm run glb     # dolmen-restored.glb
```

- `src/acoustics.js`: every formula and the design point.
- `src/model.js`: the three.js model.
- `src/materials.js`: the materials table.
- `src/dashboard.js`: the page.

To try `out/test.html` offline, serve this folder, e.g. `python3 -m http.server`, so it can load three.js from `node_modules`.
