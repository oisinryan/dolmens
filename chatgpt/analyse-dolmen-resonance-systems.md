# Analyse Dolmen Resonance Systems

Imported from a shared ChatGPT conversation: https://chatgpt.com/share/6ab84152-4c30-83eb-831a-7f6acf713a03
Conversation date: 2026-09-26. This is the conversation that produced `neolithic-acoustic-signal-network.md`.

The text below is every visible message in order. Citation markers are converted to links (tracking parameters removed). ChatGPT's hidden reasoning and raw web-search results are left out. The code it ran and the outputs are in [`analysis-code.md`](analysis-code.md). The generated slide images are not included, because the share page does not expose them.

---

## You

Analyse the layout of all the dolmens in Ireland and calculate how the couldnjave been used as resonance communication systems

## ChatGPT

I’ll treat “dolmens” as Ireland’s **portal tombs** (the archaeological category most often meant by dolmen), separate the Republic and Northern Ireland records, then test what the known spacing, chamber dimensions and acoustics would permit physically. I’ll also distinguish a plausible resonance experiment from the much stronger claim that the monuments formed a communication network.

There is a physically interesting acoustic case here, but the evidence does **not currently support an Ireland-wide dolmen communication network**. What the geometry does support is a narrower hypothesis: some intact portal tombs could have acted as **small resonant chambers**, potentially reinforcing chanting, drumming or other low-frequency sounds for people at or near the monument.

#### 1. What the national layout actually looks like

I am treating “dolmen” as **portal tomb**, rather than including court tombs, passage tombs and wedge tombs.

The exact number is surprisingly slippery. Current archaeological sources generally put Ireland's portal-tomb population at roughly **180–200 surviving/recognised examples**. Heritage Ireland says fewer than 200; recent excavation literature says more than 180. The National Monuments Service maintains the official Republic of Ireland spatial dataset, while Northern Ireland uses NISMR/HERoNI.  ([Kilmogue Portal Tomb | Heritage Ireland](https://heritageireland.ie/unguided-sites/kilmogue-portal-tomb/); [(PDF) Dynamism, use and reuse at an Irish portal tomb: Excavations at Tirnony, Maghera, Co. Derry/ Londonderry](https://www.researchgate.net/publication/395929356_Dynamism_use_and_reuse_at_an_Irish_portal_tomb_Excavations_at_Tirnony_Maghera_Co_Derry_Londonderry); [National Monuments Service - Archaeological Survey of Ireland - Dataset - data.gov.ie](https://data.gov.ie/en_GB/dataset/national-monuments-service-archaeological-survey-of-ireland); [HERoNI - Access Guide to](https://journees-archeologie.eu/userdata/ja_fiche/16/16512/16512_fichier_16512-fichier-dfc-historic-environment-record-of-northern-ireland-access-guide.pdf))

A current all-island compilation based largely on those official records gives county totals that sum to about 207 entries, but it includes some doubtful, destroyed and grouped monuments, so **207 should not be treated as a definitive archaeological total**.  ([Liste der Portal Tombs in Irland – Wikipedia](https://de.wikipedia.org/wiki/Liste_der_Portal_Tombs_in_Irland))

The broad spatial pattern is much more useful:

- There are major concentrations across **Donegal, Tyrone, Leitrim, Cavan, Sligo and Down**, with another strong southeastern concentration, particularly **Waterford/Kilkenny/Carlow**.  ([Liste der Portal Tombs in Irland – Wikipedia](https://de.wikipedia.org/wiki/Liste_der_Portal_Tombs_in_Irland))
- Portal tombs are predominantly a **northern-half phenomenon**, but unlike court tombs they extend strongly down the southeast. Historical analysis found around 70% below 400 ft elevation, with many associated with valleys and river systems.  ([Expedition Magazine | The Megalithic Tombs of Ireland](https://www.penn.museum/sites/expedition/the-megalithic-tombs-of-ireland/))
- Approximately **60% of measurable portal tombs face somewhere between northeast and southeast**. That is significant because it is not what I would expect from a network whose portals were deliberately aimed at neighbouring transmitters.  ([Irish Portal Tombs: A Ritual Perspective 9781407313849, 9781407323008 - DOKUMEN.PUB](https://dokumen.pub/irish-portal-tombs-a-ritual-perspective-9781407313849-9781407323008.html))
- Five particularly clear Irish clusters identified by Kytmannow occur at Malin More, Easkey, Slieve Gullion, Burren in Cavan and Ballyvennaght. They contain three or more portal tombs within roughly **2–3 km**. Importantly, the detailed landscape analysis says there is **normally no intervisibility between tombs within these clusters**.  ([(PDF) Stone, Bone and Belonging: The early Neolithic Portal Tombs at Killaclohane, Co. Kerry](https://www.researchgate.net/publication/354339061_Stone_Bone_and_Belonging_The_early_Neolithic_Portal_Tombs_at_Killaclohane_Co_Kerry))

That last point is one of the strongest arguments against a conventional line-of-sight acoustic signalling system.

#### 2. The chambers are genuinely capable of useful resonance

The interesting part comes from their dimensions.

Kytmannow's survey gives an average portal-tomb internal floor area of about **3.35 m²** and an average separation between portal stones of about **0.88 m**. The chambers are generally cramped and low; one large example, Kilmogue, has an estimated chamber volume of only about **5.3 m³**.  ([Portal Tombs in the Landscape: The Chronology, Morphology and Landscape Setting of the Portal Tombs of Ireland, Wales and Cornwall 9781407302515, 9781407321141 - DOKUMEN.PUB](https://dokumen.pub/portal-tombs-in-the-landscape-the-chronology-morphology-and-landscape-setting-of-the-portal-tombs-of-ireland-wales-and-cornwall-9781407302515-9781407321141.html); [Irish Portal Tombs: A Ritual Perspective 9781407313849, 9781407323008 - DOKUMEN.PUB](https://dokumen.pub/irish-portal-tombs-a-ritual-perspective-9781407313849-9781407323008.html))

Take a plausible intact chamber:

**2.2 m long × 1.5 m wide × 1.5 m high ≈ 5 m³.**

For a crude rectangular acoustic approximation, the fundamental axial resonance is:

$$
f=\frac{c}{2L}
$$

where $c≈343\,m/s$.

This gives:

| Dimension | Approx. resonance |
|---|---:|
| 2.2 m length | **78 Hz** |
| 1.5 m width | **114 Hz** |
| 1.5 m height | **114 Hz** |

So an ordinary portal-tomb-sized chamber naturally produces strong modes around approximately **80–120 Hz**.

That is interesting because acoustic testing of other Neolithic chambers—including Newgrange—has found prominent resonances in approximately the **95–120 Hz region**, often around 110 Hz. Newgrange itself has been reported at roughly 110 Hz.  ([(PDF) Ancient Architectural Acoustic Resonance Patterns and Regional Brain Activity](https://www.researchgate.net/publication/233638157_Ancient_Architectural_Acoustic_Resonance_Patterns_and_Regional_Brain_Activity); [CHAPTER 1. INTRODUCTION: TOWARDS AN ARCHAEOLOGY OF THE](https://durham-repository.worktribe.com/OutputFile/1125345))

But there is an important distinction: **Newgrange is a passage grave**. A portal tomb has a very different acoustic geometry. We should not assume that because Newgrange resonates near 110 Hz every Irish dolmen was intentionally tuned to the same frequency.

Researchers working directly with the acoustics of Newgrange have also cautioned that relatively small changes in stone geometry change resonant frequencies, and there is currently no archaeological evidence for musical instruments from Irish Neolithic tomb complexes.  ([Why the ancient site of Newgrange sounds a lot like my office](https://www.rte.ie/brainstorm/2023/0529/1386206-newgrange-acoustics-technology/))

#### 3. There may also have been a much lower resonance

Originally these monuments were not the exposed stone structures we see today. Many had substantial stone/earth cairns surrounding the chamber.  ([Scheduling of an area around the State Care Portal Tomb in](https://apps.communities-ni.gov.uk/NISMR-PUBLIC/docs/ARM/ARM_028/ARM_028_020/Public/SM7-ARM-028-020_placename_info.pdf); [Kilmogue Portal Tomb | Heritage Ireland](https://heritageireland.ie/unguided-sites/kilmogue-portal-tomb/))

If we model an intact tomb as a roughly 5 m³ enclosed cavity with a restricted entrance, the Helmholtz frequency would be approximately

$$
f_H=\frac{c}{2\pi}\sqrt{\frac{A}{VL_\mathrm{eff}}}
$$

For plausible values:

- chamber $V≈5\,m³$
- opening $A≈0.3–0.5\,m²$
- effective opening length $0.5–0.8\,m$

the resonance falls roughly around **15–30 Hz**.

That is borderline/infrasonic rather than useful speech energy.

Therefore I think the more interesting frequencies for human vocal/percussive use are the **room modes around 70–130 Hz**, rather than treating portal tombs as giant Helmholtz resonators.

Passage graves with long, confined passages are much better candidates for pronounced Helmholtz behaviour. Watson and Keating's experimental archaeology demonstrated substantial acoustic effects in megalithic passage structures, including resonance and unusual sound propagation.  ([Architecture and sound: an acoustic analysis of megalithic monuments in prehistoric Britain | Antiquity | Cambridge Core](https://www.cambridge.org/core/journals/antiquity/article/architecture-and-sound-an-acoustic-analysis-of-megalithic-monuments-in-prehistoric-britain/F37AF50641B26AC288BA756A1C12EA33))

#### 4. Could one dolmen transmit sound to another?

We can calculate an optimistic upper bound.

Assume a sound source produces:

- **100 dB SPL at 1 m**: extremely loud voice / modest percussion
- resonance or architectural radiation provides an optimistic **+6 dB**
- no terrain obstruction
- quiet environment

Spherical spreading gives approximately:

$$
L_2=L_1-20\log_{10}(r_2/r_1)
$$

So a 106 dB effective source would produce approximately:

| Distance | Ideal SPL |
|---:|---:|
| 100 m | **66 dB** |
| 500 m | **52 dB** |
| 1 km | **46 dB** |
| 2 km | **40 dB** |
| 3 km | **36.5 dB** |
| 5 km | **32 dB** |
| 10 km | **26 dB** |

A very strong drum/horn-type source at about **110 dB at 1 m**, with the same optimistic acoustic gain, would theoretically be about:

- **56 dB at 1 km**
- **46.5 dB at 3 km**
- **42 dB at 5 km**
- **36 dB at 10 km**

These are ideal free-field figures.

Irish hills, ridges, trees, uneven ground, wind and atmospheric gradients could easily destroy much of that advantage. Conversely, calm nights and temperature inversions can occasionally make low-frequency sound travel surprisingly far.

The important implication is:

**A 2–3 km signalling link is physically conceivable. A 10–20 km reliable link using human voice is not.**

#### 5. Compare that with the actual spacing

Using about 200 portal tombs distributed over the island's approximately 84,000 km² gives a crude density of:

$$
\frac{200}{84,000}=0.0024\text{ tombs/km²}
$$

If they were randomly distributed, a rough theoretical nearest-neighbour distance would be around **10 km**.

A simple square-spacing approximation gives:

$$
\sqrt{\frac{84,000}{200}}\approx20.5\text{ km}
$$

Neither figure describes the real clustered distribution, but they show the problem with an **island-wide acoustic network**.

Ten to twenty kilometres is already beyond realistic reliable vocal communication. The known **2–3 km clusters**, on the other hand, fall into an acoustically interesting range.

But those clusters present another problem: **they generally cannot see one another.**  ([(PDF) Stone, Bone and Belonging: The early Neolithic Portal Tombs at Killaclohane, Co. Kerry](https://www.researchgate.net/publication/354339061_Stone_Bone_and_Belonging_The_early_Neolithic_Portal_Tombs_at_Killaclohane_Co_Kerry))

Terrain that blocks line of sight often causes significant acoustic diffraction loss as well.

#### 6. The type of information matters

A resonant chamber would actually be rather poor for transmitting speech.

If a tomb strongly reinforces approximately 100–120 Hz, it emphasises one narrow part of the spectrum. Speech intelligibility depends heavily on approximately **500 Hz–4 kHz**.

So a strongly resonant tomb would tend to make:

> speech less clear, but pulses and drones more prominent.

That changes the plausible application considerably.

A hypothetical signalling vocabulary could instead have been things such as:

**one beat — attention**

**two beats — assembly**

**three beats — danger**

or rhythm, repetition and timing.

This is much more physically credible than people speaking messages from dolmen to dolmen.

#### 7. A more interesting possibility: local acoustic gathering points

There is another model that fits the archaeology better.

Rather than:

**Dolmen A → Dolmen B → Dolmen C**

consider:

**person inside chamber → resonant chamber → portal → people gathered outside**

Some archaeological acoustic work on passage graves found that sounds generated internally could be projected through entrances, while their character changed substantially according to listener position.  ([CHAPTER 1. INTRODUCTION: TOWARDS AN ARCHAEOLOGY OF THE](https://durham-repository.worktribe.com/OutputFile/1125345))

Portal tomb architecture would potentially produce a similar but simpler effect.

A low male chant around:

**95–120 Hz**

could excite the chamber mode.

A drum with strong energy around:

**80–120 Hz**

could do so even more effectively.

The stone chamber could produce a noticeably amplified or coloured tone for people close to the entrance.

That would make the tomb an **acoustic ritual device** rather than a telecommunications station.

#### 8. The geographical evidence points away from an engineered network

Several aspects of the layout are difficult to explain as a communication system.

If the tomb builders intended an acoustic network, I would expect to see:

1. entrances preferentially aimed toward neighbouring monuments;
2. regular distances within acoustic range;
3. strong intervisibility or unobstructed valleys between stations;
4. matched chamber dimensions producing similar dominant frequencies;
5. elevated sites where sound coverage is maximised;
6. evidence of acoustic activity or sound-producing objects.

Instead we see portal tombs frequently in **lowlands, hollows, foothills and near water**, approximately 60% with generally easterly orientations, and some deliberately secluded sites.  ([SURVEY OF THE MEGALITHIC TOMBS OF IRELAND VOLU](https://www.archaeology.ie/sites/default/files/media/publications/smi-vol-3-text.pdf); [Irish Portal Tombs: A Ritual Perspective 9781407313849, 9781407323008 - DOKUMEN.PUB](https://dokumen.pub/irish-portal-tombs-a-ritual-perspective-9781407313849-9781407323008.html))

Some coastal monuments are even positioned such that the sea is hidden despite being nearby.  ([Irish Portal Tombs: A Ritual Perspective 9781407313849, 9781407323008 - DOKUMEN.PUB](https://dokumen.pub/irish-portal-tombs-a-ritual-perspective-9781407313849-9781407323008.html))

And the detailed study of the densest clusters says the individual tombs are usually **not intervisible**.  ([(PDF) Stone, Bone and Belonging: The early Neolithic Portal Tombs at Killaclohane, Co. Kerry](https://www.researchgate.net/publication/354339061_Stone_Bone_and_Belonging_The_early_Neolithic_Portal_Tombs_at_Killaclohane_Co_Kerry))

Those characteristics look much more like landscape, burial, territorial and ritual choices than engineering requirements for a relay network.

#### My current technical interpretation

There are therefore several different hypotheses, with very different levels of physical support.

| Hypothesis | Physics | Archaeological evidence |
|---|---|---|
| Chamber enhances chanting/drumming | **Very plausible** | Possible, unproven |
| Sound projected to people near tomb | **Plausible** | Possible |
| Rhythmic signals over 1–3 km | **Physically possible** | No direct evidence |
| Dolmen-to-dolmen coded relay network | Physically difficult | Layout currently argues against it |
| Spoken communication over many kilometres | Very unlikely | None |
| Stone/ground “resonance network” carrying signals through earth | Not realistically viable | None |

The strongest testable idea is therefore **not that the dolmens themselves carried messages through the landscape**, but that their original enclosed chambers may have converted voices or percussion into distinctive low-frequency signals, some of which could potentially have been heard kilometres away under favourable conditions.

The next useful step would be much more rigorous: take the **complete NMS + NISMR coordinate set**, construct a digital elevation model of Ireland, calculate every portal tomb's nearest neighbours, bearing, elevation, intervisibility and terrain diffraction, and then overlay each site's entrance orientation. That would let us determine objectively whether there are statistically significant **acoustic corridors or chains** rather than just visually suggestive clusters. The official Republic dataset exposes longitude/latitude and ITM coordinates specifically for this kind of GIS analysis.  ([National Monuments Service - Archaeological Survey of Ireland - Dataset - data.gov.ie](https://data.gov.ie/en_GB/dataset/national-monuments-service-archaeological-survey-of-ireland); [All Layers and Tables (SMROpenData)](https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/arcgis/rest/services/SMROpenData/FeatureServer/layers))

That analysis could actually produce a map of the hypothetical network and identify which tomb pairs could have communicated at **100 Hz, 250 Hz, 500 Hz and 1 kHz** under realistic prehistoric ambient conditions.

## You

Proceed include northern Ireland and also consider lower frequency simple.communications based on the ogham.language from ancient Ireland, remeber the same technology that designed Newbridge designed these

## ChatGPT

I’ll extend the model to the whole island, including Northern Ireland, and test a **low-frequency pulse-code system** rather than speech. I’ll also separate the acoustic-engineering hypothesis from chronology, because Ogham is far later than the Neolithic tombs; the useful question is whether an **Ogham-like binary/pulse encoding principle** could be imposed on a much earlier signalling system.

## You

Newgrange

## ChatGPT

Yes — **Newgrange**. That correction matters because Newgrange gives us a useful acoustic benchmark for the hypothesis.

Using the Republic’s NMS records, Northern Ireland’s NISMR/HERoNI records, and the published all-island portal-tomb compilation as an initial merged inventory, there are roughly **207 listed portal-tomb locations/groups across 27 counties**, although that figure includes some uncertain classifications and some groups represented as a single entry. About **52 are in Northern Ireland**. The densest counties are Donegal 27, Tyrone 23, Waterford 14, Leitrim 14, Sligo 13, Cavan 12 and Down 11 — together about **55% of the inventory**. The official datasets are continually updated, so I would treat 207 as an analysis set rather than an archaeological absolute.  ([National Monuments Service - Archaeological Survey of Ireland - Dataset - data.gov.ie](https://data.gov.ie/dataset/national-monuments-service-archaeological-survey-of-ireland); [Historic Environment Digital Datasets | Department for Communities](https://www.communities-ni.gov.uk/publications/historic-environment-digital-datasets); [Liste der Portal Tombs in Irland – Wikipedia](https://de.wikipedia.org/wiki/Liste_der_Portal_Tombs_in_Irland))

#### The Newgrange connection is chronologically possible — but needs care

Portal tombs are generally dated to about **3800–3200 BCE** by the National Monuments Service. Newgrange was constructed around **3200 BCE**. That places Newgrange at approximately the end of the portal-tomb tradition.  ([NAtional Monuments Service SEIRBHÍS NA SÉADCHOMHARTHAÍ NÁISIÚNTA - NÓTAÍ RAOIN](https://www.archaeology.ie/app/uploads/2025/03/monument-class-and-scope-notes-v1-1.pdf); [Primary ENG Education Pack PDF](https://heritageireland.ie/assets/uploads/2021/08/History-Primary-School.pdf))

So there absolutely could have been a shared body of Neolithic knowledge covering:

- transport and placement of very large stones;
- chamber construction;
- control of openings and enclosed volumes;
- landscape positioning;
- astronomical orientation;
- knowledge accumulated from generations of building stone monuments.

What we cannot establish from the archaeology is that the **same builders or same architectural tradition** designed both. Portal tombs and passage tombs are structurally different monument classes.

But for the acoustic hypothesis, the overlap is significant.

Newgrange has been reported as having a strong chamber resonance around **110 Hz**. Earlier acoustic work on several British and Irish chambered monuments found strong resonances broadly around **95–120 Hz**, with Newgrange around 110 Hz.  ([(PDF) Ancient Architectural Acoustic Resonance Patterns and Regional Brain Activity](https://www.researchgate.net/publication/233638157_Ancient_Architectural_Acoustic_Resonance_Patterns_and_Regional_Brain_Activity); [Why the ancient site of Newgrange sounds a lot like my office](https://www.rte.ie/brainstorm/2023/0529/1386206-newgrange-acoustics-technology/))

There is an even more interesting result. Watson and Keating calculated a very-low-frequency Helmholtz-type resonance for the complete Newgrange passage/chamber system of approximately **1–2 Hz**.  ([Architecture and sound:](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/F37AF50641B26AC288BA756A1C12EA33/S0003598X00088281a.pdf/architecture_and_sound_an_acoustic_analysis_of_megalithic_monuments_in_prehistoric_britain.pdf))

That does **not** mean Newgrange was transmitting 2 Hz messages. At 1–2 Hz the wavelength is hundreds of metres and efficiently generating airborne sound requires enormous displacement. A human voice, drum and small stone opening are extremely poor infrasound radiators.

But it suggests another way to construct your idea.

### Use a low-frequency carrier with an even slower pulse code

The acoustically sensible system would not transmit speech.

It would use something like:

**80–120 Hz acoustic energy**
modulated by
**0.5–2 Hz rhythmic pulses**

In modern terms:

$$
\text{low-frequency carrier}\times\text{very-low-frequency modulation}
$$

For example, a large drum producing a strong 100 Hz component could be struck once every second.

The useful wavelength at 100 Hz is:

$$
\lambda=\frac{343}{100}=3.43\text{ m}
$$

Compare:

| Frequency | Wavelength |
|---:|---:|
| 20 Hz | 17.2 m |
| 40 Hz | 8.6 m |
| 60 Hz | 5.7 m |
| 80 Hz | 4.3 m |
| **100 Hz** | **3.43 m** |
| **110 Hz** | **3.12 m** |

This is why I would concentrate experiments around **70–120 Hz**, rather than literal infrasonic transmission.

Lower frequencies bend around terrain better, but once you go too low the tomb opening becomes an extremely inefficient acoustic radiator.

#### An Ogham-like communications code fits this surprisingly well

There is an important chronological qualification: **Ogham itself is much later**, principally around the 4th–8th centuries AD. It therefore cannot be evidence for how people communicated at Newgrange around 3200 BCE. Ogham was used to write early forms of Irish, not Neolithic Irish.  ([Stone Corridor | University College Cork](https://www.ucc.ie/en/discover/visit/stone-corridor/); [LANGUAGE AND EPIGRAPHIC CULTURE ‘OGAM’1](https://mural.maynoothuniversity.ie/14583/1/DS_Ogam.pdf))

However, its **encoding structure** is very useful for testing your idea.

Original Ogham has:

$$
4\text{ groups}\times5\text{ positions}=20\text{ symbols}
$$

Each group contains five characters, distinguished principally by **one to five strokes** and their relationship to the stem line.  ([LANGUAGE AND EPIGRAPHIC CULTURE ‘OGAM’1](https://mural.maynoothuniversity.ie/14583/1/DS_Ogam.pdf); [Ogham](https://en.wikipedia.org/wiki/Ogham))

That translates beautifully into pulse communication.

Instead of the four orientations of an Ogham stroke, give each family a number of **long opening beats**:

| Acoustic group | Ogham equivalent | Prefix |
|---|---|---|
| Group 1 | B-family | 1 long beat |
| Group 2 | H-family | 2 long beats |
| Group 3 | M-family | 3 long beats |
| Group 4 | vowel family | 4 long beats |

Then the actual letter is represented by **1–5 short beats**.

So:

**B**
`BOOM — beat`

**L**
`BOOM — beat beat`

**N**
`BOOM — beat beat beat beat beat`

**H**
`BOOM BOOM — beat`

**D**
`BOOM BOOM — beat beat`

and so on.

This creates all twenty basic Ogham symbols while requiring **only one frequency**.

That is much more robust than trying to distinguish four pitches several kilometres away.

### It would be a remarkably efficient primitive signalling protocol

The receiver only needs to distinguish:

1. long versus short pulse;
2. number of long pulses, 1–4;
3. number of short pulses, 1–5;
4. a long silence separating symbols.

That is technologically trivial.

Suppose:

- short beat = 0.5 s;
- inter-beat interval = 0.5 s;
- group/data separator = 1.5 s;
- symbol separator = 2 s.

An average symbol would contain about 2.5 group beats + 3 data beats.

That gives roughly **5–8 seconds per character**.

The information content of twenty possible symbols is:

$$
\log_2(20)=4.32\text{ bits}
$$

So the effective information rate is only approximately:

$$
0.5-0.8\text{ bit/s}
$$

and perhaps **0.25–0.4 bit/s** if every signal is repeated for verification.

That sounds tiny by modern standards, but it is entirely adequate for messages such as:

- gather;
- danger;
- death;
- strangers;
- fire;
- food;
- return;
- ceremony;
- north;
- south;
- one/two/three groups approaching.

In fact, I suspect an alphabet would be unnecessarily sophisticated. A vocabulary of **16–32 predefined pulse messages** would be far more robust.

### Now compare that with actual tomb spacing

This is where the all-island distribution becomes interesting.

It isn't a uniform network. It consists of **clusters**.

A few examples calculated from the listed coordinates:

| Cluster | Approx. spacing |
|---|---:|
| Ballyvennaght, Antrim — three tombs | **0.91–0.95 km** |
| Burren, Cavan pair | **0.12 km** |
| Burren–Moneygashel area | **~1.8 km** |
| Malin More, Donegal | **~0.1–1.8 km** between listed positions |
| Sunnagh More, Leitrim | **0.60 km** |
| Wardhouse, Leitrim | **0.12 km** |
| Crosh–Glenknock, Tyrone | **0.57 km** |
| Ballybrack–Brenanstown–Kiltiernan, Dublin | **2.6–5.7 km** |

The source compilation itself records examples of portal tombs occurring only metres or hundreds of metres apart, and the official archaeology recognises the highly clustered distribution of the class.  ([Liste der Portal Tombs in Irland – Wikipedia](https://de.wikipedia.org/wiki/Liste_der_Portal_Tombs_in_Irland))

Those first six examples are comfortably inside the range of a loud rhythmic signal.

#### A simple acoustic link budget

Take a large drum generating approximately:

$$
110\text{ dB SPL at 1 m}
$$

Ignoring atmospheric absorption initially:

$$
L(r)=L_1-20\log_{10}(r)
$$

If we require roughly **40 dB SPL** at the receiver for a clearly detectable repeated low-frequency pulse:

| Source model | Ideal range | +10 dB terrain loss | +20 dB terrain loss |
|---|---:|---:|---:|
| 105 dB source | 1.8 km | 0.56 km | 0.18 km |
| 110 dB drum | 3.2 km | 1.0 km | 0.32 km |
| 110 dB + hypothetical 6 dB acoustic enhancement | **6.3 km** | **2.0 km** | 0.63 km |
| 120 dB percussion + 6 dB enhancement | 20 km | **6.3 km** | **2.0 km** |

The **6 dB enhancement is an experimental assumption**, not a measured property of Irish portal tombs.

But the result is important.

The approximately **0.1–2 km spacing found in several clusters falls directly inside a credible acoustic signalling radius**.

The 3–6 km links become possible but increasingly dependent upon terrain, wind and source power.

Ten-plus kilometre links would be exceptional rather than something I would design a reliable network around.

### Original tombs matter more than the exposed dolmens we see now

Most people mentally model a portal tomb like Poulnabrone today: several exposed uprights and a capstone.

That is probably the wrong acoustic structure.

Many originally had cairns surrounding the chamber. Kilfeaghan in County Down, for example, retains evidence of a cairn originally about **24.5–27.5 m long**.  ([Kilfeaghan Portal Tomb | Department for Communities](https://www.communities-ni.gov.uk/heritage-sites/kilfeaghan-portal-tomb))

So acoustically we should model:

**stone chamber + cairn + restricted portal**

rather than:

**four exposed stones outdoors**.

That changes everything.

The cairn provides acoustic mass and isolation.

The small chamber provides resonances.

The portal becomes the dominant acoustic aperture.

The structure begins to look much more like a crude:

**resonant enclosure → restricted aperture → exterior radiation system.**

Not a modern horn, obviously, but physically far more interesting than the present exposed remains suggest.

### Newgrange therefore gives us two different acoustic phenomena

We should not collapse them together.

**~110 Hz chamber mode**

This is potentially useful for audible signalling. A drum/chant near the chamber resonance could become substantially more prominent inside the monument.

**~1–2 Hz calculated whole-structure Helmholtz behaviour**

This is infrasonic. I don't think it makes a credible direct communications carrier.

But a **1–2 Hz pulse rate imposed on a 70–110 Hz carrier** is extremely credible.

That distinction may actually reconcile the two ideas.

You could have:

$$
100\text{ Hz carrier}
$$

with:

$$
1\text{ Hz pulse modulation}
$$

producing:

> BOOM … BOOM … BOOM …

The signal remains audible while the information exists in the **timing** rather than the pitch.

### The geographical pattern changes my assessment slightly

I still don't see evidence for a single engineered **Ireland-wide acoustic network**.

Portal-tomb orientation also argues against a conventional transmitter network. Roughly **60% face between northeast and southeast**, rather than consistently pointing at neighbouring tombs.  ([Irish Portal Tombs: A Ritual Perspective 9781407313849, 9781407323008 - DOKUMEN.PUB](https://dokumen.pub/irish-portal-tombs-a-ritual-perspective-9781407313849-9781407323008.html))

But the cluster data makes a different model worth testing:

**local acoustic cells**

rather than

**one national network**.

Something like:

```text
                settlement
                    │
                    ▼
             [portal tomb]
              /     |     \
          0.8 km  1.2 km  1.7 km
            /       |       \
       [tomb]    [tomb]    [tomb]
                     │
                 3–6 km
                     │
                next cluster
```

Within a valley or territory, signals could propagate between gathering points.

For long-distance transmission, humans could then carry information between clusters.

That is much more compatible with the actual archaeological landscape.

#### One particularly useful comparison

Newgrange itself is about **13.8 km** from the listed Rathkenny portal tomb in County Meath.

That's too far for me to regard direct routine acoustic communication as likely without exceptionally powerful sources and favourable atmospheric/terrain conditions.

So I would **not** model Newgrange as the central transmitter of a portal-tomb radio-like network.

Instead I'd consider Newgrange evidence that the same broad Neolithic technological world understood — deliberately or accidentally — that **stone chamber geometry produces dramatic acoustic effects**.

And that is a considerably more defensible hypothesis.

#### What I would test next

The decisive experiment is now quite specific.

Build the all-island GIS from the current **NMS + NISMR datasets**, reconstruct the likely original cairns where dimensions are known, and calculate a graph for every tomb pair at:

**60, 80, 100, 110 and 120 Hz**

with edges at:

**1 km / 2 km / 5 km / 10 km**

Then add:

- digital elevation;
- ridge obstruction/Fresnel-style acoustic diffraction;
- portal orientation;
- prevailing wind;
- valley direction;
- waterways;
- Newgrange, Knowth and Dowth as a separate passage-tomb layer;
- experimentally estimated source levels for voice, frame drum, lithophone and horn.

The key test is whether the real tomb positions produce **significantly more acoustically viable links than randomly generated Neolithic sites in the same habitable landscape**.

If they do, the hypothesis becomes much more interesting. If they don't, it argues strongly that the observed acoustic possibilities are incidental rather than a design objective.

## You

Proceed

## ChatGPT

I’ll build this as a testable all-island model rather than just a plausibility argument: official monument coordinates where available, portal-tomb clusters, Newgrange/Knowth/Dowth as a separate passage-tomb layer, then an acoustic graph using low-frequency pulse signalling. The key result will be whether the real monument pattern is unusually well connected compared with a random landscape baseline.

The first all-island check confirms the earlier total: the current compiled list has **207 grouped portal-tomb locations**, of which **52 are in Northern Ireland and 155 in the Republic**. Seven counties—Donegal, Tyrone, Leitrim, Waterford, Sligo, Cavan and Down—contain 114 of them, about **55%**, so the distribution is strongly clustered rather than uniform.

I’ve reached the point where the official bulk records can be used rather than relying only on monument lists. One important correction from my earlier answer: **Newgrange did not produce the predicted 1–2 Hz Helmholtz resonance in Watson and Keating’s measurements; Maeshowe did.** Newgrange did show standing-wave behaviour, so the useful signalling test remains in the audible low-frequency band, not direct infrasound.

The first quantitative pass produces a more interesting result than the simple “Ireland-wide acoustic network” idea: **several of the recognised portal-tomb clusters have exactly the sort of spacing that could support low-frequency pulse signalling, but the evidence presently fits local communication cells much better than a national relay system.**



#### 1. All-island dataset

For the Republic, the National Monuments Service provides current SMR point data with coordinates and monument classifications; for Northern Ireland, the Historic Environment Division provides the equivalent NISMR point dataset as GeoJSON/Shapefile. The NMS warns that its coordinates are monument centroids derived partly from older mapping, so metre-level conclusions would be inappropriate.  ([https://data.gov.ie/en_GB/dataset/national-monuments-service-archaeological-survey-of-ireland](https://data.gov.ie/en_GB/dataset/national-monuments-service-archaeological-survey-of-ireland); [https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/arcgis/rest/services/SMROpenData/FeatureServer](https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/arcgis/rest/services/SMROpenData/FeatureServer)) Northern Ireland's dataset is maintained separately and updated monthly.  ([https://admin.opendatani.gov.uk/en_AU/dataset/northern-ireland-sites-and-monuments-record](https://admin.opendatani.gov.uk/en_AU/dataset/northern-ireland-sites-and-monuments-record))

A current NMS/NISMR-based all-island compilation gives county totals summing to **207 grouped portal-tomb locations**, including:

| Region | Working count |
|---|---:|
| Republic of Ireland | **155** |
| Northern Ireland | **52** |
| **All island** | **207** |

Close groups are sometimes counted as one entry, and some classifications are uncertain, so this is a **GIS working inventory**, not 207 unquestionably surviving individual chambers. Published heritage sources consequently give somewhat lower totals; Heritage Ireland describes fewer than 200 surviving portal dolmens.  ([https://de.wikipedia.org/wiki/Liste_der_Portal_Tombs_in_Irland](https://de.wikipedia.org/wiki/Liste_der_Portal_Tombs_in_Irland); [https://heritageireland.ie/unguided-sites/kilmogue-portal-tomb/](https://heritageireland.ie/unguided-sites/kilmogue-portal-tomb/))

The concentration is striking. Donegal 27, Tyrone 23, Leitrim 14, Waterford 14, Sligo 13, Cavan 12 and Down 11 together account for **114/207 ≈ 55%** of the working inventory.  ([https://de.wikipedia.org/wiki/Liste_der_Portal_Tombs_in_Irland](https://de.wikipedia.org/wiki/Liste_der_Portal_Tombs_in_Irland))

So these are emphatically **not randomly distributed across Ireland**.

#### 2. The five recognised clusters are the important test

Kytmannow identified five Irish portal-tomb clusters: **Malin More, Easkey, Slieve Gullion, Burren in Cavan and Ballyvennaght**. Subsequent archaeological discussion notes that these contain three or more portal tombs within a few kilometres and that intervisibility is generally poor.  ([https://www.researchgate.net/publication/354339061_Stone_Bone_and_Belonging_The_early_Neolithic_Portal_Tombs_at_Killaclohane_Co_Kerry](https://www.researchgate.net/publication/354339061_Stone_Bone_and_Belonging_The_early_Neolithic_Portal_Tombs_at_Killaclohane_Co_Kerry))

I calculated great-circle distances from the recorded coordinates and then calculated the **minimum transmission range required to make each cluster a connected graph**. In other words, a message does not have to reach every tomb directly; A can signal B, which can relay to C.

| Cluster | Jurisdiction | Furthest pair | Minimum range needed to connect entire cluster |
|---|---|---:|---:|
| Ballyvennaght | Antrim, NI | ~0.95 km | **0.915 km** |
| Malin More | Donegal | ~1.78 km | **0.979 km** |
| Burren | Cavan | ~1.83 km | **1.825 km** |
| Easkey | Sligo | ~3.17 km | **2.622 km** |
| Slieve Gullion | Armagh, NI | ~5.28 km | **4.671 km** |

This result is significant.

**Four of the five established clusters can form a connected relay using links of 2.62 km or less.**

Slieve Gullion is the outlier. It contains one very close pair—Aughadanove to Ballykeel at about **0.81 km**—but connecting the whole group requires a link of roughly **4.67 km**.

That does not prove signalling. But it gives us a genuinely testable physical property rather than a visual coincidence.

#### 3. What kind of sound could cover those distances?

Use an intentionally simple free-field model:

$$
L_r=L_{1m}-20\log_{10}(r)-P
$$

where:

- $L_{1m}$ = acoustic source level at 1 m;
- $r$ = distance in metres;
- $P$ = additional terrain/ground/weather losses.

Take **40 dB SPL** as an illustrative threshold for recognising a repeated low-frequency pulse in a quiet rural environment. It is not a universal hearing threshold.

Then:

| Source at 1 m | Ideal range to 40 dB | With extra 10 dB loss | With extra 20 dB loss |
|---:|---:|---:|---:|
| 100 dB | 1.0 km | 0.32 km | 0.10 km |
| **110 dB** | **3.16 km** | **1.0 km** | 0.32 km |
| **120 dB** | **10 km** | **3.16 km** | **1.0 km** |

These source levels are scenarios, not claims about a particular prehistoric instrument.

Now compare them with the real clusters.

At an idealised **110 dB @ 1 m**, a detectable range of about 3.16 km connects:

**Ballyvennaght → yes**
**Malin More → yes**
**Burren → yes**
**Easkey → yes**
**Slieve Gullion → no**

That numerical correspondence is worth investigating.

At a more severe assumed **10 dB additional propagation loss**, the range collapses to ~1 km. Ballyvennaght remains connected and Malin More remains connected by a relay chain, while Burren, Easkey and Slieve Gullion fragment.

So the hypothesis strongly depends on **actual terrain propagation**.

#### 4. Low frequency helps—but infrasound is probably the wrong mechanism

This is where I need to correct something from my previous answer.

At Newgrange, Watson and Keating predicted a Helmholtz resonance around **1–2 Hz**, but their sensitive measurements found **no infrasonic response**. The 2 Hz Helmholtz resonance was measured at **Maeshowe in Orkney**, not Newgrange. Watson attributes the difference partly to Newgrange's construction absorbing acoustic energy.  ([Newgrange — Dr AARON WATSON](https://www.aaronwatson.co.uk/newgrange); [Notes on the Chambered Mound for Earth Sanctuary](https://earthsanctuary.org/wp-content/uploads/2024/10/Notes-on-Chambered-Mound-by-Aaron-Watson-and-John-Was-27May2021.pdf))

Newgrange nevertheless exhibits **standing-wave resonances** internally. Published archaeoacoustic work on several chambered monuments has reported important resonances broadly around **95–120 Hz**, often near 110 Hz.  ([https://www.researchgate.net/publication/332656297_Exploring_Aural_Architecture_Experience_Resonance_Attunement](https://www.researchgate.net/publication/332656297_Exploring_Aural_Architecture_Experience_Resonance_Attunement))

That makes the more interesting experimental band approximately:

$$
70-120\text{ Hz}
$$

rather than 1–10 Hz.

For reference:

| Frequency | Wavelength |
|---:|---:|
| 60 Hz | 5.72 m |
| 80 Hz | 4.29 m |
| 100 Hz | 3.43 m |
| **110 Hz** | **3.12 m** |
| 120 Hz | 2.86 m |

Those wavelengths are large relative to ordinary obstacles and therefore diffract much better than speech frequencies.

#### 5. Portal-tomb dimensions make ~100 Hz especially interesting

Kytmannow's morphological survey gives an average portal-tomb internal floor area of about **3.35 m²**, while the average gap between portal stones is only about **0.88 m**.  ([https://dokumen.pub/portal-tombs-in-the-landscape-the-chronology-morphology-and-landscape-setting-of-the-portal-tombs-of-ireland-wales-and-cornwall-9781407302515-9781407321141.html](https://dokumen.pub/portal-tombs-in-the-landscape-the-chronology-morphology-and-landscape-setting-of-the-portal-tombs-of-ireland-wales-and-cornwall-9781407302515-9781407321141.html))

An equivalent square chamber with a characteristic dimension

$$
\sqrt{3.35}\approx1.83m
$$

has a crude first half-wave resonance of:

$$
f=\frac{343}{2(1.83)}
$$

$$
f\approx94\text{ Hz}
$$

That is remarkably close to the band in which chambered prehistoric monuments have repeatedly exhibited strong acoustic behaviour.

It does **not** establish deliberate 94–110 Hz tuning. Portal tombs are irregular structures and the complete three-dimensional chamber matters.

But it gives us a sensible experimental prediction:

> **If acoustic enhancement is significant, many intact portal tombs should show disproportionately strong modes somewhere around roughly 80–120 Hz.**

That can be measured.

#### 6. An Ogham-inspired code actually works very well technically

The historical distinction matters. Ogham belongs mainly to approximately the **4th–8th centuries AD**, thousands of years after the construction of the Neolithic tombs. It cannot be used as evidence that Neolithic people used Ogham.  ([https://www.ucc.ie/en/discover/visit/stone-corridor/](https://www.ucc.ie/en/discover/visit/stone-corridor/))

But its structure is ideal for designing an experimental prehistoric-compatible signalling protocol.

Classical Ogham has:

$$
4\text{ families}\times5\text{ positions}=20
$$

The medieval *Scholar's Primer* explicitly describes four divisions of five, while the letters themselves use one through five strokes.  ([https://celt.ucc.ie/published/T502003.html](https://celt.ucc.ie/published/T502003.html))

Instead of trying to transmit different pitches, I would make **every pulse identical**.

For example:

$$
\text{GROUP}\quad|\quad\text{VALUE}
$$

where the group is 1–4 beats and the value is 1–5 beats.

Thus an abstract character could be:

`● | ●`

or

`● ● | ● ● ●`

or

`● ● ● ● | ● ● ● ● ●`

This gives:

$$
4\times5=20
$$

distinguishable symbols using nothing more complicated than **counting beats and recognising a longer pause**.

That's extremely robust.

It requires no pitch discrimination, no speech intelligibility and no sophisticated musical instrument.

#### 7. I would not actually transmit normal language

Twenty-character spelling would be unnecessarily slow.

Information per twenty-state symbol is:

$$
\log_2(20)=4.32\text{ bits}
$$

At around 5–8 seconds per symbol the theoretical throughput is roughly:

$$
0.5-0.9\text{ bits/s}
$$

and perhaps **0.25–0.45 bits/s** after repetition/error checking.

Instead, twenty symbols could represent twenty complete concepts.

For instance, experimentally—not claiming these were actual prehistoric meanings—one code could mean assembly, another danger, another return, another death/funeral, another visitors approaching, another successful hunt, and so forth.

A transmission might therefore be only:

$$
\text{PREAMBLE}\rightarrow\text{CODE}\rightarrow\text{CODE repeated}
$$

and take perhaps **10–20 seconds**.

That is entirely realistic for slow acoustic signalling.

#### 8. The most plausible carrier/modulation system

I'd test approximately **80–110 Hz acoustic bursts**, repeated at roughly **0.5–1.5 pulses per second**.

So instead of transmitting 1 Hz sound:

$$
1\text{ Hz acoustic carrier}
$$

which is extremely difficult to radiate efficiently, use:

$$
100\text{ Hz sound}
$$

turned on and off approximately once per second:

$$
100\text{ Hz carrier}\times1\text{ Hz pulse envelope}
$$

Conceptually:

**BOOM … BOOM … BOOM**

The listener needs only detect the timing pattern.

That is substantially more physically credible.

#### 9. Newgrange is relevant, but not as a “master transmitter”

The sensible connection is technological rather than claiming the same architect.

Portal tombs and Newgrange are different monument traditions. The chronology makes transmission of Neolithic building knowledge entirely plausible, but archaeology does not demonstrate that a single design group built both.

Newgrange is therefore useful as an **acoustic engineering analogue**:

**large stones + enclosed chamber + restricted entrance + massive surrounding cairn → pronounced and unusual acoustic behaviour.**

Watson's measurements show that the Newgrange cairn significantly filters transmission between inside and outside and produces strong standing-wave behaviour internally.  ([https://www.aaronwatson.co.uk/newgrange](https://www.aaronwatson.co.uk/newgrange))

Portal tombs are much smaller, but importantly we should not model them simply as the bare stone “dolmens” visible today. Many originally had cairn material surrounding/supporting their chambers; Poulnabrone itself retains a low cairn.  ([https://visitclare.ie/attractions/poulnabrone-dolmen/](https://visitclare.ie/attractions/poulnabrone-dolmen/))

That could substantially alter the acoustic behaviour.

#### 10. The landscape evidence is the biggest problem for a telecommunications interpretation

The recognised Irish clusters normally lack direct intervisibility between tombs and are strongly associated with streams and particular landscape features.  ([https://www.researchgate.net/publication/354339061_Stone_Bone_and_Belonging_The_early_Neolithic_Portal_Tombs_at_Killaclohane_Co_Kerry](https://www.researchgate.net/publication/354339061_Stone_Bone_and_Belonging_The_early_Neolithic_Portal_Tombs_at_Killaclohane_Co_Kerry))

For a deliberately engineered long-distance signalling network I would expect the opposite:

high points, clear horizons, intentional line-of-sight relationships and repeated directional relationships between stations.

We don't clearly have those.

However, **low-frequency acoustic signalling does not require optical line of sight**. A sheltered valley can sometimes be better for sound propagation than an exposed hilltop, particularly under favourable temperature and wind conditions.

This makes a narrower hypothesis viable:

> **Portal tombs may have occupied local social/ritual landscapes whose spacing also permitted simple acoustic signalling between activity centres.**

That's much more defensible than saying “the dolmens were Ireland's prehistoric telephone network.”

#### 11. Preliminary null-model result

As a crude sanity check only, distribute the 207 working locations uniformly across approximately 84,000 km².

The intensity is:

$$
\lambda\approx0.00245/\text{km}^2
$$

For a two-dimensional Poisson process, expected nearest-neighbour distance is approximately:

$$
E[R]=\frac{1}{2\sqrt{\lambda}}\approx10.1\text{ km}
$$

Compare that with:

- Ballyvennaght: ~0.9 km links
- Malin More: ~1 km relay links
- Burren: ~1.8 km
- Easkey: ~2.6 km
- Slieve Gullion: ~4.7 km

So the recognised clusters are **far more concentrated than an island-wide uniform random distribution**.

But that is not yet evidence for communications because the uniform model is a poor archaeological null model. Settlement, geology, rivers, cultivable land and regional cultural traditions also cause clustering.

The proper Monte-Carlo control must randomise monuments only within **Neolithic-suitable landscapes**, while retaining approximately the observed regional density.

#### Where this leaves the hypothesis

My current evidence ranking would be:

| Proposition | Current result |
|---|---|
| Portal chambers can exhibit useful acoustic resonance | **Physically strong** |
| ~80–120 Hz is a sensible band to investigate | **Strong** |
| Simple pulse coding over ~1 km | **Very plausible physically** |
| ~2–3 km signalling under favourable conditions | **Plausible; needs terrain measurements** |
| Recognised tomb clusters have potentially useful relay spacing | **Yes — quantitatively demonstrated in 4/5 clusters** |
| Ogham itself derives from a Neolithic signalling code | **No evidence** |
| Ogham's 4×5 structure is suitable for recreating such a code | **Yes** |
| All Irish dolmens formed one communications network | **Not demonstrated** |
| Local valley/territory acoustic cells | **Now worth serious testing** |

The strongest new finding is the **minimum connected range**: approximately **0.9, 1.0, 1.8 and 2.6 km for four of the five recognised Irish portal-tomb clusters**. Those are realistic distances for powerful low-frequency repetitive acoustic signals under favourable conditions.

The next decisive calculation is a **terrain-aware all-207-node model** using elevation data: line profiles, diffraction over ridges, 80/100/110-Hz propagation, portal orientation, streams and a 10,000-run environmentally constrained randomisation. I verified the official NMS and NISMR bulk sources, but their bulk files redirect through signed downloads that I could not ingest into the calculation environment in this run, so I have not fabricated that final 207-node result. The cluster calculations above are based on recorded coordinates and are actual distance calculations.  ([https://data.gov.ie/en_GB/dataset/national-monuments-service-archaeological-survey-of-ireland](https://data.gov.ie/en_GB/dataset/national-monuments-service-archaeological-survey-of-ireland); [https://admin.opendatani.gov.uk/en_AU/dataset/northern-ireland-sites-and-monuments-record](https://admin.opendatani.gov.uk/en_AU/dataset/northern-ireland-sites-and-monuments-record))

## You

What about using a carny style horn to signal with enchanted listening technology at each site

## ChatGPT

If you mean a **carnyx-style horn**, that makes the signalling model much more plausible. The strongest version would be a paired system: a directional low-frequency horn for transmission and a passive acoustic collector/listening horn at the receiving monument. I’ll quantify the extra range that combination could provide.

Yes. If by “enhanced listening technology” you mean **passive acoustic amplification at the receiving site**, such as a large listening horn/ear-trumpet coupled to a resonant chamber, the communication hypothesis becomes substantially more physically plausible.

The important distinction is chronological: the **carnyx itself is Iron Age**, roughly 3,000 years later than Newgrange. But the underlying technology—a flared tube acting as an acoustic impedance transformer—does not require metal. A Neolithic equivalent could theoretically have been made from timber, bark, hide, hollowed wood or composite materials. There is currently no archaeological evidence that such devices were installed at portal tombs.

#### Why a carnyx-type horn changes the numbers

The reconstructed Deskford carnyx is about 1.6 m from mouthpiece to head. Measurements show playable notes at **39, 77, 169.5, 266, 526, 623 and 696 Hz**, with particularly strong played notes around **169.5 and 266 Hz**. Its radiation characteristics are complex rather than simply “very deep bass.”  ([CidB](https://www.bruit.fr/revues/78_13131.PDF))

That suggests I would revise our proposed signalling frequencies upward.

Rather than designing around 80–110 Hz, I would test:

**~170 Hz as the primary long-range carrier**

and

**~260–270 Hz as a second signalling tone.**

Their wavelengths are:

$$
\lambda_{170}\approx2.02m
$$

$$
\lambda_{266}\approx1.29m
$$

Those are still low enough to diffract reasonably around modest terrain but are far easier for a practical horn to radiate efficiently than 40–80 Hz.

The carnyx research is especially relevant because the instrument was deliberately investigated as an acoustic system, and the reconstructed instruments have unusually complex resonators.  ([Acoustical and musical properties of the Deskford carnyx reconstruction](https://www.bruit.fr/revues/78_13131.PDF); [(PDF) The Tintignac carnyx: An acoustical study of an early brasswind instrument](https://www.researchgate.net/publication/283775865_The_Tintignac_carnyx_An_acoustical_study_of_an_early_brasswind_instrument))

#### Then put a listening horn at the other end

This is the crucial addition.

A horn works in reverse.

Instead of:

**small source → horn → large sound field**

you can have:

**sound field → large horn mouth → concentrated pressure at the throat → listener**

Modern acoustic research explicitly demonstrates that exponential horns can provide **passive gain at a receiver**, even where the wavelength exceeds the horn dimensions.  ([Characterization of gain and directivity of exponential horn receivers.](https://pubmed.ncbi.nlm.nih.gov/29195467/))

So imagine each monument having:

**transmit horn + listening horn + resonant chamber**

rather than simply a person shouting from beside the stones.

Conceptually:

```text
TRANSMITTER                                       RECEIVER

person                                             listener
  │                                                   ▲
  ▼                                                   │
lip-reed / horn                              narrow listening throat
  │                                                   ▲
  ▼                                                   │
flared acoustic horn  >>>>>>>>>>>>>>>>>>      collecting horn
  │                                                   ▲
  ▼                                                   │
landscape                                         large aperture
```

#### The link-budget improvement becomes large

Our previous simple example was approximately:

**110 dB SPL at 1 m**

with a recognition threshold around:

**40 dB SPL**

giving an ideal free-field distance of roughly:

$$
3.2\text{ km}
$$

Now suppose the transmitting horn provides only a conservative:

**+6 dB useful directional/radiation advantage**

and the listening system gives:

**+10 dB receiver gain.**

The total improvement is:

$$
6+10=16\text{ dB}
$$

Range increases as:

$$
10^{G/20}
$$

so:

$$
10^{16/20}\approx6.3
$$

The theoretical 3.2 km link therefore becomes approximately:

$$
3.2\times6.3\approx20\text{ km}
$$

**in ideal free-field conditions.**

That is not a claim that prehistoric horns communicated reliably over 20 km. Terrain, wind, vegetation, ground absorption and atmospheric variation could consume much of that 16 dB advantage.

A more realistic sensitivity table is:

| System | Approx. viable distance* |
|---|---:|
| Bare 110 dB source | 3.2 km |
| +6 dB transmitter horn | 6.3 km |
| +6 dB TX +10 dB listening horn | **20 km** |
| Same system +10 dB terrain loss | **6.3 km** |
| Same system +20 dB terrain loss | **2.0 km** |

\*Simplified link-budget model, not archaeological evidence.

And that is extremely interesting compared with our portal-tomb cluster results:

- Ballyvennaght: ~0.9 km
- Malin More: ~1 km
- Burren: ~1.8 km
- Easkey: ~2.6 km
- Slieve Gullion: ~4.7 km to connect the full cluster.

A transmitter/receiver horn architecture puts **all five clusters comfortably inside an experimentally credible range** under favourable conditions.

#### Receiver size is important

There is no free amplification.

A useful listening horn at 170 Hz would have to be quite large.

At 170 Hz:

$$
\lambda\approx2m
$$

At 100 Hz:

$$
\lambda\approx3.4m
$$

A horn approaching a significant fraction of those dimensions becomes much more effective.

So a plausible fixed receiver might be something like:

**1–2 m mouth diameter**

**1–3 m horn length**

with the narrow throat positioned near the listener's ear.

That suddenly raises an intriguing architectural possibility.

A portal monument already provides:

- massive rigid boundaries;
- a narrow entrance;
- an enclosed cavity;
- substantial surrounding cairn material;
- dimensions similar to relevant wavelengths.

That does **not** demonstrate that the tomb was an acoustic receiver, but the architecture offers components that could potentially be incorporated into one.

#### There is an Irish Iron Age analogy

Ireland actually provides a particularly interesting later example.

The **Loughnashade Horn**, found near Navan Fort in County Armagh and dated to around the first century BC, is a very large bronze horn. Reconstruction work reports that its terminal bell disc has an **amplifying and focusing effect** on its sound.  ([Intruments – Carnyx & Co](https://carnyx.org.uk/category/intruments/))

Again, this is thousands of years later than the portal tombs.

But technologically it demonstrates something relevant:

> People living in Ireland eventually constructed very large acoustic horns whose geometry affected projection and directionality.

That makes it an excellent experimental analogue, even though it cannot be projected backwards as evidence of Neolithic practice.

#### A better signalling code follows naturally

If the horn can reliably produce two strong notes around:

**170 Hz**

and

**266 Hz**

we no longer even need to depend solely upon timing.

We could construct an extremely robust two-tone pulse protocol.

For example:

**170 Hz = group marker**

**266 Hz = numerical value**

Then an Ogham-inspired twenty-symbol system becomes:

$$
1-4\text{ low blasts}+1-5\text{ high blasts}
$$

Example:

```text
170                       | 266
BOOM                      | BAH
BOOM BOOM                 | BAH BAH
BOOM BOOM BOOM            | BAH BAH BAH
BOOM BOOM BOOM BOOM       | BAH BAH BAH BAH BAH
```

That gives:

$$
4\times5=20
$$

unique signals.

You wouldn't need to hear musical pitch accurately. You only need to distinguish:

**low horn / high horn / silence / number of pulses.**

For reliability you would transmit:

```text
ATTENTION
CODE
CODE
END
```

Possibly three times.

Even in poor acoustic conditions a listener could reconstruct a message from partial repetitions.

#### An even simpler system would probably be better

If these were actual prehistoric signals, I suspect they would not spell language.

They would probably behave more like naval signal flags or military bugle calls.

Twenty patterns could mean twenty complete messages:

- gather;
- danger;
- visitors;
- death;
- ceremony;
- hunting party returning;
- assistance required;
- travel;
- fire;
- food;
- water;
- north;
- south;
- east;
- west;
- acknowledgement;
- repeat message;
- all clear;
- urgent;
- end.

Then a meaningful message might require only **5–15 seconds**.

That is far more practical over several kilometres than spelling words.

#### There's also a possible directional-selection mechanism

A fixed listening horn could point toward a particular neighbouring monument.

Imagine a site connected to three others:

```text
                         Site B
                           ▲
                           │
                    listening horn
                           │
                           │
Site A ◄── horn ── [ DOLMEN ] ── horn ──► Site C
                           │
                           │
                    listening horn
                           ▼
                         Site D
```

Each listening horn could have a different orientation.

A listener could simply move between them and determine:

**which neighbouring site is transmitting.**

That would solve a major communications problem without requiring directional hearing.

And this gives us a very strong archaeological/GIS prediction:

> **If this hypothesis has merit, neighbouring monuments should occur disproportionately close to the axes of possible portal/horn orientations.**

That is testable.

#### The portal chamber might also function as the detector

An even more interesting experiment would eliminate the separate ear trumpet.

Tune a receiving cavity to approximately 170 Hz.

The wavelength is ~2.02 m.

A half-wave dimension is approximately:

$$
\frac{\lambda}{2}\approx1.01m
$$

A quarter-wave dimension is:

$$
\frac{\lambda}{4}\approx0.50m
$$

Those are completely ordinary dimensions inside portal tomb architecture.

An incoming 170 Hz signal could therefore excite a chamber mode, potentially making the signal **more obvious inside the monument than standing outside it**.

The test would be straightforward:

put a calibrated 170 Hz source 500 m–2 km from an intact monument, then simultaneously measure:

- outside SPL;
- portal SPL;
- chamber SPL;
- frequency response;
- signal-to-noise ratio.

Repeat at:

**80 / 100 / 110 / 170 / 266 / 500 Hz.**

If particular tombs repeatedly give **5–15 dB enhancement at certain frequencies**, that would be extremely interesting.

#### This changes what I'd look for archaeologically

Instead of looking only for instruments, I would now search the monument dataset for:

1. **portal orientation toward another monument;**
2. distances of roughly 0.5–6 km;
3. chamber dimensions producing ~100–300 Hz modes;
4. valleys providing acoustic channels;
5. monuments positioned around bends where low frequencies outperform visual signalling;
6. asymmetrical openings that could behave as acoustic apertures;
7. paired monuments with similar resonant modes;
8. unexplained socket holes or structural features that might once have supported perishable wooden components.

The last point is particularly important because **a wooden listening horn would leave almost nothing after 5,000 years**.

So absence of a surviving horn is not itself surprising. But there would still need to be positive archaeological or statistical evidence before concluding that one existed.

#### The strongest version of the hypothesis

The most physically credible system I can construct from your idea is therefore:

$$
\boxed{
\text{170–270 Hz horn transmitter}
\rightarrow
\text{landscape}
\rightarrow
\text{directional acoustic collector}
\rightarrow
\text{resonant chamber/listener}
}
$$

with information carried by:

$$
\boxed{\text{pulse count + two tones}}
$$

rather than speech.

Using reasonable acoustic assumptions, that could turn the **0.9–4.7 km connections in the known Irish portal-tomb clusters from marginal into quite practical signalling distances**.

What remains completely unproven is whether Neolithic people actually built such transmitters or receivers.

That gives us a much sharper hypothesis to test with the all-Ireland GIS model: **not merely “are dolmens near each other?”, but “does each monument have another monument within an acoustically achievable distance and within a plausible transmitting/receiving axis?”**



Video: https://www.youtube.com/shorts/NYjgMircP7I

## You

Proceed

## ChatGPT

I’m extending it into a proper engineering test: all-island monument coordinates, nearest-neighbour graph, horn-transmitter/listening-horn link budgets, and a null comparison against random spacing. I’ll keep the carnyx-like device as an **analogue**, not evidence of Neolithic use.

A stronger piece of evidence has emerged: **Neolithic shell trumpets are archaeologically documented in Catalonia**, and recent tests measured seven of eight playable examples above **100 dBA at 1 m**, with the loudest at **111.5 dBA**. Researchers explicitly consider long-distance signalling a plausible function.

That means we no longer need to assume an Iron-Age carnyx specifically; a powerful horn-based signalling technology demonstrably existed in Neolithic Europe.

The horn-plus-listener model materially strengthens the hypothesis.

The best carrier band is probably **~250–500 Hz**, not infrasound. Neolithic shell trumpets from Catalonia have recently been measured at **91–111.5 dBA at 1 m**, with most above 100 dBA and fundamentals around **395–595 Hz**; the researchers explicitly identify signalling over distance as a plausible function.  ([Signalling and music-making: interpreting the Neolithic shell trumpets of Catalonia (Spain) | Antiquity | Cambridge Core](https://www.cambridge.org/core/journals/antiquity/article/signalling-and-musicmaking-interpreting-the-neolithic-shell-trumpets-of-catalonia-spain/84EE0A2A9B8C1C11E1C6476A4F191E01); [(PDF) Signalling and music-making: interpreting the Neolithic shell trumpets of Catalonia (Spain)](https://www.researchgate.net/publication/398245079_Signalling_and_music-making_interpreting_the_Neolithic_shell_trumpets_of_Catalonia_Spain)) A much older Palaeolithic conch produced about **100 dBA at 1 m**, with notes around 256–285 Hz and strongly directional radiation.  ([First record of the sound produced by the oldest Upper Paleolithic seashell horn - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7875526/))

That is important because it demonstrates that powerful directional horn technology did not require Iron Age bronze.

#### A useful real-world range benchmark

One field experiment with a conch measured roughly:

- **107 dBA at 1 m**
- **45 dBA at 1.55 km**
- strongest acoustic energy around **400 Hz**
- modelled detectability of about **2.3 km at 35 dBA** under low-noise conditions.  ([Iconea 2009-2010: Proceedings of the International Conference of Near Eastern Archaeomusicology. Université de la Sorbonne Paris IV November 25, 26 and 27, 2009 and at the University of London, Senate House December 13, 14 and 15, 2010 9781463233853 - DOKUMEN.PUB](https://dokumen.pub/iconea-2009-2010-proceedings-of-the-international-conference-of-near-eastern-archaeomusicology-universite-de-la-sorbonne-paris-iv-november-25-26-and-27-2009-and-at-the-university-of-london-senate-house-december-13-14-and-15-2010-9781463233853.html))

Another practical test reported a conch audible to about **1.6 km**.  ([A trumpet-call from history - Campus Insight - K.U.Leuven](https://www.kuleuven.be/ci/30/trumpet.html))

So I would use **2.3 km** as a useful experimental baseline for a single horn and an unaided listener—not as a guaranteed prehistoric range.

Now add your listening technology.

Modern acoustics confirms that an exponential horn works perfectly well **in reverse as a passive receiver**, concentrating incoming sound toward its throat. Substantial gain can occur even when the wavelength is larger than the horn.  ([Characterization of gain and directivity of exponential horn receivers.](https://pubmed.ncbi.nlm.nih.gov/29195467/))

The first-order receiver relationship is approximately:

$$
G\approx10\log_{10}\left(\frac{S_\text{mouth}}{S_\text{throat}}\right)
$$

For example, a 1 m diameter collecting horn feeding a 10 cm throat has an area ratio of approximately 100:1:

$$
G_\text{ideal}\approx20\text{ dB}
$$

Real gain would be lower because of diffraction, imperfect construction, impedance mismatch, leakage and off-axis arrival. So I would **not** assume 20 dB. For testing, use conservative receiver gains of **+3, +6, +9 and +12 dB**.

That produces:

| Receiver improvement | Range from 2.3-km baseline |
|---:|---:|
| none | **2.30 km** |
| +3 dB | **3.25 km** |
| +6 dB | **4.59 km** |
| +9 dB | **6.48 km** |
| +12 dB | **9.16 km** |

This follows from:

$$
r_2=r_1\,10^{G/20}
$$

#### Now compare that with the actual recognised Irish clusters

Kytmannow identified five particularly dense Irish portal-tomb clusters: **Malin More, Easkey, Slieve Gullion, Burren and Ballyvennaght**. Archaeological analysis specifically notes that these sites often do **not** have intervisibility.  ([(PDF) Stone, Bone and Belonging: The early Neolithic Portal Tombs at Killaclohane, Co. Kerry](https://www.researchgate.net/publication/354339061_Stone_Bone_and_Belonging_The_early_Neolithic_Portal_Tombs_at_Killaclohane_Co_Kerry); [Portal Tombs in the Landscape: The Chronology, Morphology and Landscape Setting of the Portal Tombs of Ireland, Wales and Cornwall 9781407302515, 9781407321141 - DOKUMEN.PUB](https://dokumen.pub/portal-tombs-in-the-landscape-the-chronology-morphology-and-landscape-setting-of-the-portal-tombs-of-ireland-wales-and-cornwall-9781407302515-9781407321141.html))

Using their recorded coordinates, I calculated the smallest maximum hop needed to connect every monument in each cluster through relays—a minimum-spanning-tree calculation:

| Cluster | Largest required relay hop |
|---|---:|
| Ballyvennaght, Antrim | **0.915 km** |
| Malin More, Donegal | **0.979 km** |
| Burren, Cavan | **1.825 km** |
| Easkey, Sligo | **2.622 km** |
| Slieve Gullion, Armagh | **4.671 km** |

The source coordinates themselves come from the NMS/NISMR-derived portal-tomb inventory.  ([Liste der Portal Tombs in Irland – Wikipedia](https://de.wikipedia.org/wiki/Liste_der_Portal_Tombs_in_Irland))

Now something quite interesting appears.

Starting with the experimentally derived **2.3-km conch range**, the additional receiver gain required to make each complete cluster communicable is approximately:

| Cluster | Additional gain required |
|---|---:|
| Ballyvennaght | **0 dB** |
| Malin More | **0 dB** |
| Burren | **0 dB** |
| Easkey | **~1.1 dB** |
| Slieve Gullion | **~6.2 dB** |

So a receiving device giving only about **6–7 dB useful gain** would, in this simplified propagation model, make **all five recognised portal-tomb clusters connectable by acoustic relay**.

That is considerably more interesting than my original voice/drum model.

#### The architecture I would now test

A plausible experimental reconstruction would be:

```text
TRANSMITTING SITE

human lips
    │
    ▼
lip-reed / conch / wooden horn
    │
    ▼
250–500 Hz directional blast
    │
    │  landscape 1–6 km
    ▼

RECEIVING SITE

large wooden/bark collector
       ╲       ╱
        ╲     ╱
         ╲   ╱
          ╲ ╱
        narrow throat
             │
             ▼
      resonant cavity
             │
             ▼
         listener
```

For an experiment I would build the receiver approximately:

- mouth diameter: **0.8–1.5 m**
- horn length: **1.5–3 m**
- throat: **75–150 mm**
- exponential or tractrix-like flare;
- timber frame;
- hide/bark/thin timber skin;
- listener at the throat or throat coupled into a small chamber.

Nothing there requires metal.

And importantly, the object could be **entirely perishable**.

Five thousand years later there might be virtually nothing left archaeologically unless postholes, sockets or distinctive attachment points survived.

#### The portal tomb itself could form part of the receiver

This is where your idea gets more interesting.

Rather than carrying a separate listening horn everywhere, imagine the collector feeding the existing chamber:

```text
             incoming signal
                   ↓
             \           /
              \         /
               \       /
                \     /
                 \   /
                 throat
                   │
              portal entrance
                   │
          ┌─────────────────┐
          │  STONE CHAMBER  │
          │                 │
          │     listener    │
          └─────────────────┘
```

The external horn performs the acoustic collection.

The stone chamber then acts as a **frequency-selective resonator**.

This gives two stages:

$$
\text{collector gain}+\text{chamber resonance}
$$

You would not want broadband speech. You would deliberately transmit whichever note most strongly excited the receiving site's chamber.

That suggests the builders would not necessarily make every tomb identical. Instead, each station might have a known signalling tone.

#### Something else follows from this

A monument could have several passive receivers pointing toward different neighbours:

```text
                 SITE B
                   │
                 horn
                   ▼

SITE A ──horn──► [TOMB] ◄──horn── SITE C
                   ▲
                 horn
                   │
                 SITE D
```

You wouldn't need sophisticated direction finding.

If sound is strongest in the western listening aperture:

**the message came from the western station.**

This could explain a communications network where monuments aren't mutually visible.

And lack of visibility is precisely one characteristic Kytmannow reports for the clusters.  ([(PDF) Stone, Bone and Belonging: The early Neolithic Portal Tombs at Killaclohane, Co. Kerry](https://www.researchgate.net/publication/354339061_Stone_Bone_and_Belonging_The_early_Neolithic_Portal_Tombs_at_Killaclohane_Co_Kerry))

#### The coding system becomes very simple

I would abandon actual spelling for the first experiment.

Use an **Ogham-like 4 × 5 organisational system**, without claiming Ogham itself existed in the Neolithic.

Use two distinguishable horn tones:

**LOW = group**

**HIGH = value**

For example:

```text
LOW LOW
pause
HIGH HIGH HIGH
```

means:

$$
(2,3)
$$

With four possible low counts and five high counts:

$$
4\times5=20
$$

you get twenty messages.

Each symbol could mean an entire instruction rather than a letter.

The physical protocol could be:

**three long blasts — wake/listen**

**group pulses**

**pause**

**value pulses**

**long pause**

**repeat**

**one acknowledgement blast from receiver**

That creates primitive error checking.

#### Relaying could cover much larger distances

Suppose stations are 3–5 km apart.

Six relays could cross roughly:

$$
6\times4=24\text{ km}
$$

Ten relays:

$$
10\times4=40\text{ km}
$$

A ten-hop message might be transmitted in a few minutes even if each operator waited and repeated the signal.

The communication speed would massively outperform somebody walking.

The real question therefore stops being:

> “Could a horn be heard from one dolmen to another?”

Physics says that is quite plausible at the spacing seen in some clusters.

The stronger question becomes:

> **Does the spatial geometry of Ireland's portal tombs produce chains of 3–7 km hops more frequently than would be expected from ordinary settlement/geological clustering?**

That is the critical statistical test.

#### There is also a striking chronological analogue

The Loughnashade Horn found near Navan Fort in County Armagh is much later—first century BC—but reconstruction/testing reports that its terminal disc provides both an **amplifying and focusing effect**.  ([Intruments – Carnyx & Co](https://carnyx.org.uk/category/intruments/); [Loughnashade Horn | National Museum of Ireland](https://source.museum.ie/en-IE/Collections-Research/Collection/The-Treasury/Artefact/Loughnashade-Horn/8178d988-064f-4640-8fe1-4171e226955f))

It cannot be used as evidence for Neolithic Ireland.

But when combined with the actual **Neolithic shell trumpets from continental Europe**, we now have two separate facts:

**Neolithic people demonstrably possessed very loud horn signalling technology.**

**Later inhabitants of Ireland demonstrably built highly engineered directional acoustic horns.**

What remains missing is evidence connecting that technology specifically to Irish portal tombs.

#### The hypothesis I would now test

It is no longer primarily a “resonant dolmen network.”

It is:

$$
\boxed{
\text{Horn transmitter}
\rightarrow
\text{2–7 km acoustic path}
\rightarrow
\text{passive horn receiver}
\rightarrow
\text{stone resonator}
\rightarrow
\text{human decoder}
}
$$

with relay stations.

The particularly notable numerical result is this:

> **A field-tested prehistoric-type horn model plus only about 6.2 dB of receiving gain is sufficient, on distance alone, to bridge the longest hop required to connect all four portal tombs in the Slieve Gullion cluster.**

That does **not** establish that the tombs were communications stations. Terrain diffraction, wind, woodland, reconstructed Neolithic vegetation and actual monument orientations now become the decisive variables.

At this point the hypothesis is sufficiently specific that it can be **experimentally falsified**: reconstruct one transmitter and one 1-m-class passive receiver, test 250/300/400/500 Hz at 1–6 km, then repeat the test across the actual Ballyvennaght, Burren or Slieve Gullion geometry without disturbing the monuments.

## You

Create a high tech styled remotion presentation of this concept also create remotion exploded models and diagrams where necessary

## ChatGPT

*(ChatGPT generated slide images here. The images aren't included; the prompts are in [`analysis-code.md`](analysis-code.md).)*

## You

Create a github report for this commit and push

## ChatGPT

I’ll identify the most relevant existing GitHub repository from your recent work, add a concise technical report covering the acoustic-network concept and presentation assets, then commit and push it.

*(GitHub tool calls; their output is redacted on the share page.)*

The most plausible destination is `oisinryan/gods-and-fighting-men`, which is a private Remotion-oriented repo and is much closer in subject matter than the other available Remotion project. I’m checking its current branch state before writing the report so I don’t overwrite unrelated work.

*(GitHub tool calls; their output is redacted on the share page.)*

The report is structured as an engineering hypothesis document rather than presenting the communications network as established archaeology. It includes the all-island dataset assumptions, relay distances, horn/listener model, Ogham-inspired pulse coding, Remotion slide architecture, falsification criteria, and source notes.

*(GitHub tool calls; their output is redacted on the share page.)*

Committed and pushed to the private repository `oisinryan/gods-and-fighting-men` on `main`.

Commit: `abdc54f494dda74c9c97f046672c650f968cdeeb`
Message: **Add Neolithic acoustic signal network engineering report**

The report covers the all-Ireland portal-tomb dataset, cluster relay distances, horn transmitter/passive receiver model, pulse-code concept, Remotion presentation structure, archaeological limitations, testable predictions, and proposed GIS/field-validation workflow.

[View the commit on GitHub](https://github.com/oisinryan/gods-and-fighting-men/commit/abdc54f494dda74c9c97f046672c650f968cdeeb)

---

If you want, I can:

- Develop detailed experimental plan for horn communication test
- Outline archaeological predictions for horn receiver sites
- Model signalling code protocols using horn frequencies
