import { LatLon, minimumSpanningTree } from "./geo";

/**
 * The working all-island inventory from the report: 207 grouped portal-tomb
 * locations by county. Positions are approximate county centres, not sites.
 */
export type County = { name: string; n: number; at: LatLon; ni?: boolean };
export const COUNTIES: County[] = [
  { name: "Donegal", n: 27, at: [54.92, -7.98] },
  { name: "Tyrone", n: 23, at: [54.6, -7.2], ni: true },
  { name: "Leitrim", n: 14, at: [54.12, -8.0] },
  { name: "Waterford", n: 14, at: [52.2, -7.6] },
  { name: "Sligo", n: 13, at: [54.15, -8.6] },
  { name: "Cavan", n: 12, at: [53.98, -7.3] },
  { name: "Down", n: 11, at: [54.35, -5.95], ni: true },
  { name: "Dublin", n: 9, at: [53.35, -6.27] },
  { name: "Galway", n: 9, at: [53.35, -8.75] },
  { name: "Mayo", n: 9, at: [53.9, -9.3] },
  { name: "Kilkenny", n: 8, at: [52.58, -7.22] },
  { name: "Carlow", n: 7, at: [52.72, -6.83] },
  { name: "Derry", n: 6, at: [54.92, -6.88], ni: true },
  { name: "Antrim", n: 5, at: [54.85, -6.2], ni: true },
  { name: "Armagh", n: 5, at: [54.3, -6.6], ni: true },
  { name: "Clare", n: 4, at: [52.87, -9.0] },
  { name: "Louth", n: 4, at: [53.92, -6.48] },
  { name: "Wicklow", n: 4, at: [52.98, -6.37] },
  { name: "Cork", n: 3, at: [51.95, -8.75] },
  { name: "Longford", n: 3, at: [53.73, -7.72] },
  { name: "Monaghan", n: 3, at: [54.15, -6.95] },
  { name: "Roscommon", n: 3, at: [53.75, -8.25] },
  { name: "Tipperary", n: 3, at: [52.65, -7.85] },
  { name: "Fermanagh", n: 2, at: [54.35, -7.65], ni: true },
  { name: "Kerry", n: 2, at: [52.1, -9.6] },
  { name: "Meath", n: 2, at: [53.62, -6.65] },
  { name: "Wexford", n: 2, at: [52.45, -6.6] },
];
export const TOTAL = COUNTIES.reduce((s, c) => s + c.n, 0);
export const NI_TOTAL = COUNTIES.filter((c) => c.ni).reduce((s, c) => s + c.n, 0);
export const TOP7 = COUNTIES.slice(0, 7);
export const TOP7_TOTAL = TOP7.reduce((s, c) => s + c.n, 0);

/** The five recognised clusters, with the site positions the analysis used */
export type Cluster = { id: string; name: string; county: string; sites: { name: string; at: LatLon }[] };
export const CLUSTERS: Cluster[] = [
  {
    id: "ballyvennaght",
    name: "Ballyvennaght",
    county: "Antrim",
    sites: [
      { name: "Cloughananca 1", at: [55.163362, -6.118192] },
      { name: "Cloughananca 2", at: [55.168381, -6.106028] },
      { name: "Ballyvennaght", at: [55.160173, -6.105019] },
    ],
  },
  {
    id: "malin-more",
    name: "Malin More",
    county: "Donegal",
    sites: [
      { name: "Malin More A", at: [54.689709, -8.775845] },
      { name: "Malin More B", at: [54.695762, -8.764793] },
      { name: "Malin More C", at: [54.69362, -8.75004] },
      { name: "Malin More D", at: [54.69304, -8.74872] },
    ],
  },
  {
    id: "burren",
    name: "Burren",
    county: "Cavan",
    sites: [
      { name: "Calf House", at: [54.264722, -7.885] },
      { name: "Burren", at: [54.263889, -7.883889] },
      { name: "Moneygashel", at: [54.25499, -7.90762] },
    ],
  },
  {
    id: "easkey",
    name: "Easkey",
    county: "Sligo",
    sites: [
      { name: "Camcuill", at: [54.226658, -8.925337] },
      { name: "Tawnatruffaun", at: [54.19823, -8.920873] },
      { name: "Knockanbaun", at: [54.222197, -8.917021] },
      { name: "Crowagh", at: [54.211206, -8.887213] },
    ],
  },
  {
    id: "slieve-gullion",
    name: "Slieve Gullion",
    county: "Armagh",
    sites: [
      { name: "Aghmakane", at: [54.166153, -6.438306] },
      { name: "Clonlum", at: [54.124021, -6.400811] },
      { name: "Aughadanove", at: [54.125021, -6.472466] },
      { name: "Ballykeel", at: [54.131429, -6.478222] },
    ],
  },
];

export const CLUSTER_LINKS = CLUSTERS.map((c) => {
  const edges = minimumSpanningTree(c.sites.map((s) => s.at));
  return { ...c, edges, bottleneck: Math.max(...edges.map((e) => e.km)) };
});

export const clusterCentre = (c: Cluster): LatLon => [
  c.sites.reduce((s, x) => s + x.at[0], 0) / c.sites.length,
  c.sites.reduce((s, x) => s + x.at[1], 0) / c.sites.length,
];

/** the Ogham-inspired 4 × 5 test code; unassigned states stay free for tests */
export const MESSAGES: Record<string, string> = {
  "1-1": "Attention",
  "1-2": "Gather",
  "1-3": "Danger",
  "1-4": "Visitors",
  "1-5": "Return",
  "2-1": "Ceremony",
  "2-2": "Assistance",
  "2-3": "Acknowledge",
  "2-4": "Repeat",
  "2-5": "End",
};
export const messageFor = (group: number, value: number) => MESSAGES[`${group}-${value}`] ?? "Unassigned";

/** pulse timing in seconds, shared by the slide and the page's audio */
export const PULSE = { low: 0.8, lowGap: 0.4, pause: 1.2, high: 0.3, highGap: 0.3, lowHz: 250, highHz: 500 };
export type Pulse = { start: number; dur: number; kind: "low" | "high" };
export const pulseTrain = (group: number, value: number): Pulse[] => {
  const out: Pulse[] = [];
  let t = 0;
  for (let i = 0; i < group; i++) {
    out.push({ start: t, dur: PULSE.low, kind: "low" });
    t += PULSE.low + PULSE.lowGap;
  }
  t += PULSE.pause - PULSE.lowGap;
  for (let i = 0; i < value; i++) {
    out.push({ start: t, dur: PULSE.high, kind: "high" });
    t += PULSE.high + PULSE.highGap;
  }
  return out;
};
