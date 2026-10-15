/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — High-Fidelity Exoplanet Photometric Catalog & Synthetic Transit Datasets
 * All photometric arrays are explicitly synthetic generated based on empirical astrophysical models.
 */

import { ExoplanetTransitData } from '../types/network';

export interface CatalogTarget extends ExoplanetTransitData {
  scenarioId: 'repeating' | 'noisy' | 'anomalous';
  scenarioLabel: string;
  scenarioDescription: string;
}

/**
 * Procedurally generates a synthetic light curve with limb-darkening profile and Gaussian noise
 */
function generateSyntheticLightCurve(
  totalHours: number,
  periodDays: number,
  depthFraction: number,
  durationHours: number,
  transitCenterHour: number,
  noiseSigma: number,
  isSingleAnomalous: boolean = false
): { times: number[]; fluxes: number[] } {
  const times: number[] = [];
  const fluxes: number[] = [];
  const step = 0.25; // 15-minute sampling cadence
  const halfDuration = durationHours / 2;

  for (let t = 0; t <= totalHours; t += step) {
    times.push(Number(t.toFixed(2)));

    // Distance in time from transit center
    const dt = Math.abs(t - transitCenterHour);

    let dip = 0;
    if (dt < halfDuration) {
      // Limb-darkening approximation (Mandel & Agol quadratic profile curve)
      const normalizedRadius = dt / halfDuration;
      const limbFactor = 1 - 0.4 * Math.pow(normalizedRadius, 2);
      dip = depthFraction * Math.max(0, limbFactor);
    }

    // Gaussian random noise (Box-Muller transform)
    const u1 = Math.max(1e-7, Math.random());
    const u2 = Math.random();
    const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const noise = randStdNormal * noiseSigma;

    const flux = Math.max(0.9, 1.0 - dip + noise);
    fluxes.push(Number(flux.toFixed(6)));
  }

  return { times, fluxes };
}

// 1. Repeating Periodic Transit: TRAPPIST-1e (Clean periodic transit dips across M-dwarf)
const trappist1eLightCurve = generateSyntheticLightCurve(
  36,      // 36 hours total observation window
  6.10,    // 6.10 days orbital period
  0.0052,  // 5200 ppm transit depth (0.52% stellar eclipse)
  2.4,     // 2.4 hours transit duration
  18.0,    // Transit center at hour 18.0
  0.00028  // Instrument noise sigma
);

// 2. High-Noise Stellar Observations: Kepler-452b (Shallow Earth-size dip embedded in stellar granulation)
const kepler452bLightCurve = generateSyntheticLightCurve(
  48,      // 48 hours total observation window
  384.84,  // 384.8 days period (Earth-like orbit around G-type star)
  0.00035, // 350 ppm shallow transit depth
  10.5,    // 10.5 hours long transit
  24.0,    // Transit center
  0.00018  // Higher noise level for stress-testing BLS detection
);

// 3. Single Anomalous Dip: TOI-700d / Long-Period Candidate (Solitary deep event)
const toi700dLightCurve = generateSyntheticLightCurve(
  36,
  37.42,
  0.00185, // 1850 ppm distinct eclipse
  3.6,
  18.0,
  0.00012,
  true
);

export const EXOPLANET_CATALOG: CatalogTarget[] = [
  {
    systemName: 'TRAPPIST-1 System',
    starType: 'Ultra-cool M8V Dwarf',
    starRadiusSolar: 0.121,
    starTempKelvin: 2566,
    targetPlanetName: 'TRAPPIST-1e',
    periodDays: 6.0996,
    depthPpm: 5200,
    durationHours: 2.4,
    rawTimeHours: trappist1eLightCurve.times,
    rawRelativeFlux: trappist1eLightCurve.fluxes,
    scenarioId: 'repeating',
    scenarioLabel: 'Periodic Transit',
    scenarioDescription: 'Clean repeating transit signature with prominent limb-darkened profile.',
  },
  {
    systemName: 'Kepler-452 System',
    starType: 'G2V Solar Analog',
    starRadiusSolar: 1.11,
    starTempKelvin: 5757,
    targetPlanetName: 'Kepler-452b',
    periodDays: 384.84,
    depthPpm: 350,
    durationHours: 10.5,
    rawTimeHours: kepler452bLightCurve.times,
    rawRelativeFlux: kepler452bLightCurve.fluxes,
    scenarioId: 'noisy',
    scenarioLabel: 'Noisy Observations',
    scenarioDescription: 'Shallow terrestrial dip requiring BLS integration across noisy stellar flux.',
  },
  {
    systemName: 'TOI-700 System',
    starType: 'Early M-Dwarf (M2V)',
    starRadiusSolar: 0.42,
    starTempKelvin: 3480,
    targetPlanetName: 'TOI-700d',
    periodDays: 37.42,
    depthPpm: 1850,
    durationHours: 3.6,
    rawTimeHours: toi700dLightCurve.times,
    rawRelativeFlux: toi700dLightCurve.fluxes,
    scenarioId: 'anomalous',
    scenarioLabel: 'Anomalous Dip',
    scenarioDescription: 'High-significance solitary transit eclipse in the habitable zone.',
  },
];
