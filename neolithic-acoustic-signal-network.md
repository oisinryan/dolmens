# Neolithic Acoustic Signal Network — Engineering Concept Report

**Status:** Speculative research / presentation concept  
**Scope:** Island of Ireland, including Northern Ireland  
**Prepared:** 2026-09-26  
**Repository:** `oisinryan/gods-and-fighting-men`  
**Base state reviewed:** `996b00944417d8920d8769464f904b173c89a159`

## 1. Executive summary

This report documents a testable engineering hypothesis: clusters of Irish portal tombs may have occupied landscapes in which simple long-distance acoustic signalling was physically possible.

The model does **not** claim that portal tombs were proven communications stations. Instead, it asks whether known monument spacing, chamber geometry, landscape position, horn technology and passive acoustic collection could support a relay system.

The strongest current interpretation is a network of **local acoustic cells**, rather than a single island-wide network.

The proposed signalling chain is:

```text
horn / conch transmitter
        ↓
250–500 Hz acoustic propagation
        ↓
passive listening horn / acoustic collector
        ↓
portal aperture
        ↓
resonant stone chamber
        ↓
human listener / relay operator
```

Information would be carried by slow, repeated pulse sequences rather than intelligible speech.

## 2. Archaeological scope

For this model, "dolmen" is treated as the archaeological class **portal tomb**.

The working all-island inventory currently used for spatial modelling contains approximately:

| Region | Working count |
|---|---:|
| Republic of Ireland | 155 |
| Northern Ireland | 52 |
| **Total** | **207 grouped locations** |

These are working GIS counts, not a claim that 207 intact, independently verified chambers survive. Records may include grouped, uncertain, destroyed or reclassified entries.

The largest concentrations in the working inventory are:

| County | Working count |
|---|---:|
| Donegal | 27 |
| Tyrone | 23 |
| Leitrim | 14 |
| Waterford | 14 |
| Sligo | 13 |
| Cavan | 12 |
| Down | 11 |

Those seven counties contain about **114 of 207 locations (~55%)**, showing strong clustering rather than uniform distribution.

Primary spatial sources:

- National Monuments Service / Archaeological Survey of Ireland
- Northern Ireland Sites and Monuments Record / Historic Environment Record

## 3. Recognised cluster connectivity

Five particularly useful portal-tomb clusters were used as an initial connectivity test.

The metric below is the **largest minimum relay hop** required to keep each cluster connected through a relay graph.

| Cluster | County | Largest required relay hop |
|---|---|---:|
| Ballyvennaght | Antrim | **0.915 km** |
| Malin More | Donegal | **0.979 km** |
| Burren | Cavan | **1.825 km** |
| Easkey | Sligo | **2.622 km** |
| Slieve Gullion | Armagh | **4.671 km** |

### Initial result

- **4 of 5** recognised clusters connect with maximum hops of about **2.62 km or less**.
- Slieve Gullion is the outlier, requiring about **4.67 km**.
- These ranges are compatible with powerful horn signalling under favourable terrain and atmospheric conditions.
- This does not establish intentional communications use; it establishes only that the spacing is physically interesting.

## 4. Transmitter model

A carnyx-style horn is useful as an acoustic analogue, but the Iron Age carnyx is far later than the Neolithic monuments.

A better prehistoric engineering analogue is the broader class of:

- shell trumpets,
- conches,
- wooden horns,
- bark or hide composite horns,
- lip-reed acoustic radiators.

Neolithic European shell trumpets demonstrate that loud horn-based signalling technology existed long before Iron Age metal horns.

For modelling, the preferred test band is approximately:

```text
250 Hz
300 Hz
400 Hz
500 Hz
```

This band is preferable to literal infrasound because it is much easier to generate efficiently with practical horns while retaining useful long-distance propagation.

## 5. Passive receiving system

The receiving concept uses a horn in reverse.

```text
incoming sound field
        ↓
large horn mouth / acoustic collector
        ↓
narrow throat
        ↓
portal aperture
        ↓
stone chamber
        ↓
listener
```

A passive acoustic collector can increase sound pressure at its throat by concentrating acoustic energy over a larger capture area.

For engineering tests, receiver improvement should be evaluated conservatively at:

- +3 dB
- +6 dB
- +9 dB
- +12 dB

Using an experimental reference distance of **2.3 km**, the idealised range scaling is:

```text
r₂ = r₁ × 10^(G/20)
```

| Receiver gain | Idealised range |
|---:|---:|
| 0 dB | 2.30 km |
| +3 dB | 3.25 km |
| +6 dB | 4.59 km |
| +9 dB | 6.48 km |
| +12 dB | 9.16 km |

These values are link-budget scenarios only. Real propagation can be substantially reduced by terrain, vegetation, wind direction, atmospheric structure and ground effects.

A useful result is that roughly **6–7 dB** of additional receiver advantage would, on distance alone, place the longest Slieve Gullion relay hop inside the modelled range.

## 6. Portal tomb as acoustic coupling structure

The present exposed appearance of many portal tombs is not necessarily the correct acoustic reconstruction.

Many monuments originally included cairn or mound material around the chamber.

The conceptual receiving station therefore consists of:

1. **Receiving horn / collector**  
   Concentrates incoming acoustic energy.

2. **Portal aperture**  
   Couples the collector to the chamber.

3. **Upright portal stones**  
   Define the entrance geometry and support the capstone.

4. **Capstone**  
   Forms a massive upper acoustic boundary.

5. **Internal chamber**  
   Provides an enclosed resonant volume.

6. **Cairn / mound envelope**  
   Adds mass, isolation and potentially changes transmission behaviour.

7. **Listener / relay operator**  
   Occupies a high-SNR position in or close to the chamber.

This architecture remains hypothetical. No claim is made that surviving socket holes, apertures or structural features have yet been demonstrated to support acoustic hardware.

## 7. Resonance

Portal tomb chambers are small enough for audible room modes to occur in the same broad frequency region as powerful horns and low-frequency human vocalisation.

A simple characteristic dimension around 1.5–2.0 m gives first-order room modes roughly in the **80–120 Hz** region.

That does not imply deliberate tuning.

The testable prediction is:

> If acoustic use was important, measured intact chambers may show repeatable, functionally useful amplification or increased signal-to-noise ratio at particular frequencies.

The field experiment should measure simultaneously:

- external SPL,
- portal SPL,
- chamber SPL,
- frequency response,
- decay time,
- signal-to-noise ratio,
- bearing sensitivity.

## 8. Pulse-code communication

Ogham itself is much later than the Neolithic and is **not** evidence for Neolithic language or signalling.

However, its four-family / five-position organisational structure provides a useful modern test code.

The proposed experimental code is:

```text
1–4 LOW pulses = group
pause
1–5 HIGH pulses = value
```

This gives:

```text
4 groups × 5 values = 20 message states
```

Rather than spelling words, each state should represent a predefined command.

Example experimental message classes could include:

- attention,
- gather,
- danger,
- visitors,
- return,
- ceremony,
- assistance,
- acknowledgement,
- repeat,
- end.

A practical protocol:

```text
ATTENTION
→ GROUP
→ pause
→ VALUE
→ long pause
→ repeat
→ acknowledgement
```

The objective is **reliable detection**, not speech intelligibility.

## 9. Why pulse signalling is preferable to speech

Speech intelligibility depends heavily on higher-frequency spectral detail and suffers rapidly with distance, reverberation and terrain masking.

Pulse communication requires only:

- detecting a signal,
- distinguishing one or two tone classes,
- counting events,
- recognising pauses.

This greatly lowers the required information bandwidth.

A relay operator could therefore decode a signal that would be far too degraded for meaningful speech.

## 10. Newgrange relevance

Newgrange should be treated as an important **acoustic and architectural analogue**, not as evidence that the same builders designed every portal tomb.

Newgrange demonstrates that Neolithic stone monuments can produce complex standing-wave and chamber acoustic behaviour.

The current model does **not** rely on direct infrasonic communication.

The more credible engineering interpretation is:

- audible low-frequency horn carrier,
- slow pulse-envelope modulation,
- architectural or horn-based receiver gain,
- human relay.

## 11. Landscape model

The decisive next stage is terrain-aware GIS modelling.

Required layers:

- NMS portal-tomb coordinates,
- NISMR / HERoNI coordinates,
- digital elevation model,
- ridgelines,
- valleys,
- watercourses,
- reconstructed vegetation scenarios,
- portal orientation where known,
- chamber dimensions where known,
- local source/receiver elevation.

For every monument pair, calculate:

- distance,
- bearing,
- elevation difference,
- line of sight,
- diffraction penalty,
- predicted SPL at 250 / 300 / 400 / 500 Hz,
- receiver gain scenarios,
- potential relay membership.

## 12. Null hypothesis

Spatial clustering alone is not evidence for communications.

The correct statistical test is not to compare monument locations with points randomly distributed over the whole island.

Instead, run constrained Monte Carlo simulations in landscapes matched for:

- elevation,
- geology,
- proximity to water,
- cultivable land,
- known Neolithic settlement suitability,
- regional monument density.

Then compare:

- number of viable acoustic links,
- network component size,
- relay path length,
- node degree,
- orientation alignment,
- average required gain.

A genuine communications signal should outperform environmentally constrained random distributions.

## 13. Falsification criteria

The concept should be weakened or rejected if terrain-aware analysis finds that:

1. recognised clusters require implausibly high sound levels;
2. portal orientations are statistically unrelated to neighbouring sites;
3. chamber measurements show no useful acoustic enhancement;
4. constrained random site distributions produce equivalent or better connectivity;
5. likely Neolithic vegetation destroys most of the proposed links;
6. required receiving hardware would need dimensions or materials inconsistent with Neolithic technology.

The concept would become more interesting if several independent tests converge:

1. unusually strong acoustic connectivity;
2. repeatable directional relationships;
3. chamber resonance that improves detectability;
4. plausible perishable receiver geometry;
5. field-tested horn signals reliably crossing real cluster distances.

## 14. Remotion presentation architecture

A high-tech Remotion presentation concept has been designed around the following sequence:

1. **Neolithic Acoustic Signal Network**  
   Hero overview and Ireland network map.

2. **All-Island Portal Tomb Model**  
   ROI + NI dataset, concentrations and cluster locations.

3. **Signalling Principle**  
   Horn → landscape → collector → chamber → listener.

4. **Range Model**  
   Receiver gain versus viable relay distance.

5. **Cluster Connectivity**  
   Ballyvennaght, Malin More, Burren, Easkey and Slieve Gullion.

6. **Exploded Model**  
   Portal tomb acoustic-station conceptual reconstruction.

7. **Pulse Code System**  
   Ogham-inspired 4 × 5 experimental command structure.

8. **Test Plan & Conclusion**  
   GIS, acoustic modelling, field tests and falsification.

### Visual system

- 16:9
- black / charcoal base
- cyan / teal technical UI
- orange acoustic highlights
- animated GIS nodes
- wavefront propagation
- exploded stone geometry
- spectrum / waveform overlays
- animated relay links
- subtle topographic grid
- evidence-status labels distinguishing measured data from speculative reconstruction

## 15. Suggested Remotion animation language

Recommended motion system:

- progressive map-node reveal,
- travelling acoustic pulse arcs,
- range rings that expand and decay,
- camera parallax over terrain,
- animated minimum-spanning-tree links,
- exploded tomb components separating along the sound axis,
- resonant standing-wave animation within the chamber,
- low/high pulse-code traces,
- spectrum analyser sweeps,
- smooth number interpolation for range calculations,
- evidence-status tags: `MEASURED`, `MODELLED`, `HYPOTHETICAL`.

## 16. Current conclusion

The strongest defensible statement is:

> Known Irish portal-tomb clusters include relay spacings that are physically compatible with powerful horn signalling, especially if passive acoustic collection is added at the receiving site.

What has **not** been established is that the monuments were constructed for this purpose.

The current model therefore remains:

**physically plausible in local clusters, archaeologically unproven, and experimentally testable.**

## 17. Reference starting points

- National Monuments Service / Archaeological Survey of Ireland:  
  https://data.gov.ie/dataset/national-monuments-service-archaeological-survey-of-ireland
- Northern Ireland Sites and Monuments Record:  
  https://admin.opendatani.gov.uk/dataset/northern-ireland-sites-and-monuments-record
- UCC overview of Ogham / Stone Corridor:  
  https://www.ucc.ie/en/discover/visit/stone-corridor/
- Cambridge Antiquity — architecture and sound in megalithic monuments:  
  https://www.cambridge.org/core/journals/antiquity/article/architecture-and-sound-an-acoustic-analysis-of-megalithic-monuments-in-prehistoric-britain/F37AF50641B26AC288BA756A1C12EA33
- Palaeolithic conch acoustic study:  
  https://pmc.ncbi.nlm.nih.gov/articles/PMC7875526/

---

## Evidence status

This repository report intentionally separates:

- **documented archaeology**
- **measured acoustics**
- **engineering extrapolation**
- **speculative reconstruction**

No archaeological claim in this document should be read as evidence that an acoustic communication network has been demonstrated.
