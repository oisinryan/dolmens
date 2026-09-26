/** Everything the interactive page can change; every slide receives all of it. */
export type Controls = {
  /** passive receiver gain, dB */
  gainDb: number;
  /** range with no receiver gain, km (the report's experimental reference) */
  refKm: number;
  /** extra air absorption, dB per km (0 = the report's idealised model) */
  absorption: number;
  /** cluster highlighted on the connectivity slide */
  cluster: string;
  /** pulse-code state */
  group: number;
  value: number;
  /** 0 = assembled tomb, 1 = fully exploded */
  explode: number;
  showCairn: boolean;
  /** add Slieve Gullion's summit cairn and the Long Stone as relay points */
  gullionRelays: boolean;
};

export const DEFAULTS: Controls = {
  gainDb: 6,
  refKm: 2.3,
  absorption: 0,
  cluster: "slieve-gullion",
  group: 1,
  value: 3,
  explode: 1,
  showCairn: true,
  gullionRelays: false,
};

/**
 * Range with receiver gain G: spherical spreading gives r = r₀·10^(G/20).
 * With absorption α (dB/km) the extra loss over the longer path eats into the
 * gain, so solve 20·log10(r/r₀) + α·(r − r₀) = G for r by bisection.
 */
export const rangeKm = (gainDb: number, refKm: number, absorption: number): number => {
  const ideal = refKm * 10 ** (gainDb / 20);
  if (absorption <= 0) return ideal;
  const f = (r: number) => 20 * Math.log10(r / refKm) + absorption * (r - refKm) - gainDb;
  let lo = refKm * 0.05;
  let hi = ideal;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
};
