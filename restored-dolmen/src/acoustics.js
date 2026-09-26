// Acoustic design of the receiving collector and chamber.
// Everything here is plain arithmetic, shared by the dashboard and the notes.

export const C_AIR = 343; // m/s
export const BAND = [250, 300, 400, 500]; // Hz, the report's test band
export const TARGET_DB = 6; // required receiver gain across the band
export const REF_KM = 2.3; // range with no receiver gain (the report's reference)

/** The design point: a conical collector, sized so the band's lowest frequency still clears +6 dB. */
export const DESIGN = {
  mouthD: 1.4, // m
  hornL: 2.0, // m, throat to mouth
  throatD: 0.3, // m, the opening left in the portal packing
  eta: 0.5, // aperture efficiency of a hand-made, slightly leaky horn (0.5 is cautious)
  axisY: 1.15, // m, height of the horn axis and of the listener's ear
  lining: 10, // m² of bracken, fleece and hide in the chamber
};

const sinc = (x) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

/**
 * On-axis directivity gain of the collector at frequency f, in dB.
 * G = η · 4πA/λ² for a mouth of area A, reduced by the phase error of the conical
 * horn's curved wavefront: δ = √(L² + R²) − L at the rim, factor sinc²(δ/λ).
 * This is the signal-to-noise gain against diffuse background noise (wind, vegetation).
 */
export const collectorGain = (f, { mouthD, hornL, eta } = DESIGN) => {
  const lam = C_AIR / f;
  const area = Math.PI * (mouthD / 2) ** 2;
  const delta = Math.sqrt(hornL ** 2 + (mouthD / 2) ** 2) - hornL;
  return 10 * Math.log10(eta * sinc(delta / lam) ** 2 * ((4 * Math.PI * area) / lam ** 2));
};

export const rimPhaseError = ({ mouthD, hornL } = DESIGN) => Math.sqrt(hornL ** 2 + (mouthD / 2) ** 2) - hornL;

/** Bessel J1 by its power series; plenty for the arguments a 1–2 m mouth reaches */
const besselJ1 = (x) => {
  let term = x / 2;
  let sum = term;
  for (let k = 1; k < 40; k++) {
    term *= -(x * x) / (4 * k * (k + 1));
    sum += term;
  }
  return sum;
};

/** Relative response (dB, 0 on axis) of a circular mouth at angle θ off axis: 2·J1(u)/u, u = ka·sinθ */
export const pattern = (f, theta, mouthD = DESIGN.mouthD) => {
  const k = (2 * Math.PI * f) / C_AIR;
  const u = k * (mouthD / 2) * Math.sin(theta);
  const p = Math.abs(u) < 1e-6 ? 1 : (2 * besselJ1(u)) / u;
  return 20 * Math.log10(Math.max(Math.abs(p), 1e-3));
};

/** −3 dB half-angle of the mouth at frequency f, in degrees */
export const halfBeamwidth = (f, mouthD = DESIGN.mouthD) => {
  for (let d = 0.5; d < 90; d += 0.5) if (pattern(f, (d * Math.PI) / 180, mouthD) <= -3) return d;
  return 90;
};

/** relay range with receiver gain G (spherical spreading from the reference range) */
export const rangeKm = (gainDb, refKm = REF_KM) => refKm * 10 ** (gainDb / 20);

export const bandMinimum = (p = DESIGN) => Math.min(...BAND.map((f) => collectorGain(f, p)));

/** the chamber: about 2.2 × 1.5 × 1.5 m of stone */
export const CHAMBER = { length: 2.2, width: 1.5, height: 1.5 };
const V = CHAMBER.length * CHAMBER.width * CHAMBER.height;
const S = 2 * (CHAMBER.length * CHAMBER.width + CHAMBER.length * CHAMBER.height + CHAMBER.width * CHAMBER.height);

/** Sabine reverberation time with `lined` m² of soft lining (α ≈ 0.4 at 250–500 Hz) over bare stone (α ≈ 0.02) */
export const reverbTime = (lined) => {
  const l = Math.min(lined, S);
  return (0.161 * V) / ((S - l) * 0.02 + l * 0.4);
};
export const CHAMBER_VOLUME = V;
export const CHAMBER_SURFACE = S;

/** first axial room modes, f = c / 2L */
export const roomModes = () => [CHAMBER.length, CHAMBER.width, CHAMBER.height].map((l) => C_AIR / (2 * l));

/** the collector's skin: area of the conical frustum, m² */
export const skinArea = ({ mouthD, hornL, throatD } = DESIGN) => {
  const R = mouthD / 2;
  const r = throatD / 2;
  return Math.PI * (R + r) * Math.sqrt(hornL ** 2 + (R - r) ** 2);
};
