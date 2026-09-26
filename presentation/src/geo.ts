import { MERCATOR } from "./ireland";

export type LatLon = readonly [number, number];

/** latitude/longitude → pixel position on the IRELAND_PATH map (same d3 Mercator) */
export const project = ([lat, lon]: LatLon): [number, number] => {
  const lambda = (lon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + phi / 2));
  return [MERCATOR.tx + MERCATOR.scale * lambda, MERCATOR.ty - MERCATOR.scale * y];
};

/** great-circle distance in km (the same haversine the analysis used) */
export const haversineKm = ([lat1, lon1]: LatLon, [lat2, lon2]: LatLon): number => {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(a));
};

export type Edge = { a: number; b: number; km: number };

/** Kruskal minimum spanning tree over every pair of sites */
export const minimumSpanningTree = (pts: readonly LatLon[]): Edge[] => {
  const edges: Edge[] = [];
  for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) edges.push({ a, b, km: haversineKm(pts[a], pts[b]) });
  edges.sort((x, y) => x.km - y.km);
  const parent = pts.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  return edges.filter(({ a, b }) => {
    const [ra, rb] = [find(a), find(b)];
    if (ra === rb) return false;
    parent[ra] = rb;
    return true;
  });
};
