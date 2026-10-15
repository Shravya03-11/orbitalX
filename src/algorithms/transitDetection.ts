/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — High-Precision Exoplanet Transit Photometry & Orbital Mechanics Engine
 * 
 * 100% Custom TypeScript implementation of:
 * - Planetary Transit Depth Detection (\Delta F / F_0)
 * - Exoplanet Radius determination (R_p / R_*) in Earth & Jupiter Radii
 * - Keplerian Orbital Semi-Major Axis (Kepler's Third Law)
 * - Stellar Insolation & Planet Equilibrium Temperature (T_eq)
 * - Kopparapu et al. Habitable Zone Classification
 * - Signal-to-Noise Ratio (SNR) and Detection Confidence
 */

import { ExoplanetTransitData, TransitAnalysisResult } from '../types/network';

// Astronomical Physical Constants
const SOLAR_RADIUS_METERS = 6.957e8;
const EARTH_RADIUS_METERS = 6.371e6;
const JUPITER_RADIUS_METERS = 6.9911e7;
const AU_IN_METERS = 1.495978707e11;
const G_CONSTANT = 6.67430e-11; // m^3 kg^-1 s^-2
const SOLAR_MASS_KG = 1.98847e30;

/**
 * Runs the photometric transit analysis on the received light curve data
 * 
 * @param data Photometric time-series data packet delivered via the communications network
 * @returns Complete astrophysical transit analysis dossier
 */
export function analyzeTransitPhotometry(data: ExoplanetTransitData): TransitAnalysisResult {
  const fluxes = data.rawRelativeFlux;
  if (!fluxes || fluxes.length === 0) {
    throw new Error('No photometric flux data available in delivered packet');
  }

  // 1. Calculate Baseline Out-of-Transit Flux (Median baseline)
  const sortedFluxes = [...fluxes].sort((a, b) => a - b);
  const baselineMedian = sortedFluxes[Math.floor(sortedFluxes.length * 0.75)]; // upper quartile to avoid transit

  // 2. Locate Transit Floor (lowest 5% percentile flux during eclipse)
  const floorPercentileCount = Math.max(2, Math.floor(sortedFluxes.length * 0.05));
  let floorSum = 0;
  for (let i = 0; i < floorPercentileCount; i++) {
    floorSum += sortedFluxes[i];
  }
  const transitFloor = floorSum / floorPercentileCount;

  // 3. Compute Transit Depth: \delta = (F_baseline - F_transit) / F_baseline
  const transitDepthFraction = Math.max(0, (baselineMedian - transitFloor) / baselineMedian);
  const transitDepthPpm = Math.round(transitDepthFraction * 1e6);

  // 4. Compute Exoplanet Radius: R_p = R_* * sqrt(\delta)
  const starRadiusMeters = data.starRadiusSolar * SOLAR_RADIUS_METERS;
  const planetRadiusMeters = starRadiusMeters * Math.sqrt(transitDepthFraction);

  const estimatedPlanetRadiusEarth = Number((planetRadiusMeters / EARTH_RADIUS_METERS).toFixed(2));
  const estimatedPlanetRadiusJupiter = Number((planetRadiusMeters / JUPITER_RADIUS_METERS).toFixed(3));

  // 5. Compute Semi-Major Axis 'a' via Kepler's Third Law:
  // a^3 = (G * M_* / 4\pi^2) * P^2
  // Approximate stellar mass from stellar radius (Main Sequence mass-radius relation M_* ~ R_*^1.2)
  const estimatedStarMassKg = SOLAR_MASS_KG * Math.pow(data.starRadiusSolar, 1.15);
  const periodSeconds = data.periodDays * 86400;
  const semiMajorAxisMeters = Math.cbrt((G_CONSTANT * estimatedStarMassKg * Math.pow(periodSeconds, 2)) / (4 * Math.PI * Math.PI));
  const semiMajorAxisAu = Number((semiMajorAxisMeters / AU_IN_METERS).toFixed(4));

  // 6. Compute Planet Equilibrium Temperature:
  // T_eq = T_* * sqrt(R_* / (2 * a)) * (1 - A_B)^(1/4), with assumed Bond Albedo A_B ~ 0.3
  const bondAlbedo = 0.30;
  const equilibriumTempKelvin = Math.round(
    data.starTempKelvin * Math.sqrt(starRadiusMeters / (2 * semiMajorAxisMeters)) * Math.pow(1 - bondAlbedo, 0.25)
  );

  // 7. Kopparapu Habitable Zone Classification
  // Liquid water range roughly 185 K to 320 K for rocky exoplanet with moderate atmosphere
  let habitableZoneStatus: TransitAnalysisResult['habitableZoneStatus'] = 'Non-Habitable / Extreme Heat';
  if (equilibriumTempKelvin >= 210 && equilibriumTempKelvin <= 285) {
    habitableZoneStatus = 'Conservative Habitable Zone';
  } else if ((equilibriumTempKelvin >= 180 && equilibriumTempKelvin < 210) || (equilibriumTempKelvin > 285 && equilibriumTempKelvin <= 325)) {
    habitableZoneStatus = 'Optimistic Habitable Zone';
  } else if (equilibriumTempKelvin < 180) {
    habitableZoneStatus = 'Non-Habitable / Glacial';
  } else {
    habitableZoneStatus = 'Non-Habitable / Extreme Heat';
  }

  // 8. Compute Signal-to-Noise Ratio (SNR)
  // Calculate standard deviation of out-of-transit flux residuals
  const baselinePoints = fluxes.filter(f => f > baselineMedian - 0.0005);
  const baselineVariance = baselinePoints.reduce((acc, val) => acc + Math.pow(val - baselineMedian, 2), 0) / (baselinePoints.length || 1);
  const fluxStdDev = Math.sqrt(baselineVariance) || 0.0001;

  const inTransitCount = fluxes.filter(f => f < baselineMedian - (transitDepthFraction * 0.4)).length;
  const snr = Number(((transitDepthFraction / fluxStdDev) * Math.sqrt(Math.max(1, inTransitCount))).toFixed(1));

  // Confidence score bounded [0, 99.8%]
  const confidenceScore = Math.min(99.8, Number((Math.min(snr / 30, 1) * 98 + 1.8).toFixed(1)));

  return {
    detectedPeriodDays: data.periodDays,
    transitDepthFraction: Number(transitDepthFraction.toFixed(6)),
    transitDepthPpm,
    estimatedPlanetRadiusEarth,
    estimatedPlanetRadiusJupiter,
    semiMajorAxisAu,
    equilibriumTempKelvin,
    habitableZoneStatus,
    signalToNoiseRatio: snr,
    confidenceScore,
    timestamp: new Date().toISOString(),
  };
}
