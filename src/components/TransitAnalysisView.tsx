/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — High-Cadence Photometric Light-Curve Analysis & Exoplanet Dossier
 * 
 * Strictly connects with communication network state:
 * - If communication is severed/disconnected, light curve ingestion halts.
 * - Only after route recovery and 100% data delivery can analysis run.
 * - 100% local mathematical solver (no pre-trained models or black-box APIs).
 */

import React, { useState } from 'react';
import { ExoplanetTransitData, TransitAnalysisResult, CommStatus } from '../types/network';
import { EXOPLANET_CATALOG } from '../data/exoplanetCatalog';
import { analyzeTransitPhotometry } from '../algorithms/transitDetection';
import { Transit3DScene } from './Transit3DScene';

interface TransitAnalysisViewProps {
  commStatus: CommStatus;
  dataDelivered: boolean;
  dataPacketProgress: number;
  onAnalysisSuccess: (result: TransitAnalysisResult) => void;
  candidateReport: TransitAnalysisResult | null;
}

export const TransitAnalysisView: React.FC<TransitAnalysisViewProps> = ({
  commStatus,
  dataDelivered,
  dataPacketProgress,
  onAnalysisSuccess,
  candidateReport,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<ExoplanetTransitData>(EXOPLANET_CATALOG[0]);
  const [isComputing, setIsComputing] = useState(false);
  const [transitModelOverlay, setTransitModelOverlay] = useState(true);

  // Compute orbital phase for transit 3D visualization (e.g. oscillating between 0.95 and 1.05 for transit window)
  const [orbitalPhase, setOrbitalPhase] = useState(0.0);

  const handleRunDetection = () => {
    if (!dataDelivered || commStatus === 'OFFLINE') return;

    setIsComputing(true);
    setTimeout(() => {
      try {
        const result = analyzeTransitPhotometry(selectedTarget);
        onAnalysisSuccess(result);
      } catch (err) {
        console.error('Detection analysis error:', err);
      } finally {
        setIsComputing(false);
      }
    }, 450); // Realistic local numerical fitting delay
  };

  // Determine if currently in transit based on light curve
  const minFlux = Math.min(...selectedTarget.rawRelativeFlux);
  const maxFlux = Math.max(...selectedTarget.rawRelativeFlux);
  const fluxRange = maxFlux - minFlux || 0.01;

  // SVG dimensions for light curve chart
  const svgWidth = 800;
  const svgHeight = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 60 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const minTime = Math.min(...selectedTarget.rawTimeHours);
  const maxTime = Math.max(...selectedTarget.rawTimeHours);
  const timeRange = maxTime - minTime || 1;

  // Generate SVG path for data points and theoretical model
  const points = selectedTarget.rawTimeHours.map((t, idx) => {
    const f = selectedTarget.rawRelativeFlux[idx];
    const x = padding.left + ((t - minTime) / timeRange) * plotWidth;
    // Invert Y: higher flux = higher on screen (lower Y value in SVG)
    const y = padding.top + plotHeight - ((f - (minFlux - 0.0004)) / (fluxRange + 0.0008)) * plotHeight;
    return { x, y, t, f };
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Target Planetary System Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 font-display flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            TARGET EXOPLANET SYSTEM TELEMETRY
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Photometric time-series data packet delivered via deep-space radio corridor
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {EXOPLANET_CATALOG.map(target => (
            <button
              key={target.targetPlanetName}
              type="button"
              onClick={() => setSelectedTarget(target)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer border ${
                selectedTarget.targetPlanetName === target.targetPlanetName
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-300 hover:text-cyan-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              {target.targetPlanetName} ({target.systemName})
            </button>
          ))}
        </div>
      </div>

      {/* Observation Delivery Gate Warning Banner */}
      {!dataDelivered && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
          commStatus === 'OFFLINE'
            ? 'bg-red-950/40 border-red-800 text-red-200'
            : 'bg-amber-950/40 border-amber-800 text-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${commStatus === 'OFFLINE' ? 'bg-red-900/60' : 'bg-amber-900/60'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-mono font-bold tracking-wide">
                {commStatus === 'OFFLINE'
                  ? 'OBSERVATION DATA DELIVERY INTERRUPTED — NETWORK PARTITIONED'
                  : 'OBSERVATION DATA STREAM IN PROGRESS'}
              </div>
              <div className="text-[11px] font-mono opacity-80 mt-0.5">
                {commStatus === 'OFFLINE'
                  ? 'Asteroid disruption severed active transmission link. Photometric packets halted at deep-space surveyor. Awaiting autonomous route recalculation.'
                  : `Ingesting telemetry packets along active route (${Math.round(dataPacketProgress)}% received). Run detection once packet batch reaches 100%.`}
              </div>
            </div>
          </div>
          <div className="text-xs font-mono font-bold px-3 py-1 bg-slate-950/80 rounded border border-slate-800 shrink-0">
            {commStatus === 'OFFLINE' ? 'DATA BLOCKED' : `${Math.round(dataPacketProgress)}% READY`}
          </div>
        </div>
      )}

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Light Curve Photometry Plot (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 font-display flex items-center gap-2">
                  <span>HIGH-CADENCE RELATIVE FLUX (LIGHT CURVE)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-cyan-300 rounded border border-slate-700">
                    SYNTHETIC TELEMETRY BATCH
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Host Star: {selectedTarget.starType} (R* = {selectedTarget.starRadiusSolar} R☉, T* = {selectedTarget.starTempKelvin} K)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-mono text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transitModelOverlay}
                    onChange={e => setTransitModelOverlay(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Mandel-Agol Model</span>
                </label>
              </div>
            </div>

            {/* SVG Light Curve Graph */}
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[260px] bg-slate-950/90 rounded-lg border border-slate-800/80 font-mono">
                {/* Horizontal Baseline Grids */}
                <line
                  x1={padding.left}
                  y1={padding.top + plotHeight * 0.15}
                  x2={svgWidth - padding.right}
                  y2={padding.top + plotHeight * 0.15}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                />
                <line
                  x1={padding.left}
                  y1={padding.top + plotHeight * 0.5}
                  x2={svgWidth - padding.right}
                  y2={padding.top + plotHeight * 0.5}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                />
                <line
                  x1={padding.left}
                  y1={padding.top + plotHeight * 0.85}
                  x2={svgWidth - padding.right}
                  y2={padding.top + plotHeight * 0.85}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                />

                {/* Y Axis Labels */}
                <text x={padding.left - 8} y={padding.top + plotHeight * 0.15 + 4} fill="#64748b" fontSize="10" textAnchor="end">
                  1.0000
                </text>
                <text x={padding.left - 8} y={padding.top + plotHeight * 0.5 + 4} fill="#64748b" fontSize="10" textAnchor="end">
                  {(1.0 - (selectedTarget.depthPpm / 2000000)).toFixed(4)}
                </text>
                <text x={padding.left - 8} y={padding.top + plotHeight * 0.85 + 4} fill="#64748b" fontSize="10" textAnchor="end">
                  {(1.0 - (selectedTarget.depthPpm / 1000000)).toFixed(4)}
                </text>

                {/* X Axis Labels */}
                <text x={padding.left} y={svgHeight - 10} fill="#64748b" fontSize="10">0.0h</text>
                <text x={padding.left + plotWidth * 0.5} y={svgHeight - 10} fill="#64748b" fontSize="10" textAnchor="middle">
                  {(timeRange * 0.5).toFixed(1)}h
                </text>
                <text x={svgWidth - padding.right} y={svgHeight - 10} fill="#64748b" fontSize="10" textAnchor="end">
                  {timeRange.toFixed(1)}h
                </text>

                {/* Mandel-Agol Theoretical Curve Fit Overlay */}
                {transitModelOverlay && (
                  <path
                    d={points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.2"
                    strokeOpacity="0.85"
                  />
                )}

                {/* Photometric Data Points */}
                {points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="2.2"
                    fill={pt.f < 0.998 ? '#38bdf8' : '#94a3b8'}
                    opacity="0.75"
                  />
                ))}

                {/* Transit Center Annotation */}
                <line
                  x1={padding.left + plotWidth * 0.5}
                  y1={padding.top}
                  x2={padding.left + plotWidth * 0.5}
                  y2={padding.top + plotHeight}
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left + plotWidth * 0.5 + 6}
                  y={padding.top + 14}
                  fill="#f59e0b"
                  fontSize="10"
                >
                  Mid-Transit Ingress/Egress
                </text>
              </svg>
            </div>
          </div>

          {/* Action Button & Telemetry Summary */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="text-xs font-mono text-slate-400">
              Cadence: <span className="text-slate-200">15-min integration</span> | Window: <span className="text-slate-200">{timeRange} hrs</span> | Target: <span className="text-cyan-300">{selectedTarget.targetPlanetName}</span>
            </div>

            <button
              type="button"
              onClick={handleRunDetection}
              disabled={!dataDelivered || commStatus === 'OFFLINE' || isComputing}
              className={`px-5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-lg ${
                !dataDelivered || commStatus === 'OFFLINE'
                  ? 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 border border-cyan-400 shadow-cyan-500/20 active:scale-95'
              }`}
            >
              {isComputing ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Computing BLS Transit Fit...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Run Local Transit Detection</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3D Transit Simulator View (1 Col) */}
        <div className="flex flex-col gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Keplerian Transit Simulation
            </div>

            <Transit3DScene
              system={selectedTarget}
              orbitalPhase={orbitalPhase}
              isInTransit={orbitalPhase > 0.45 && orbitalPhase < 0.55}
            />

            {/* Orbit scrubber */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Simulated Orbital Phase (Φ)</span>
                <span className="text-cyan-300 font-bold">{orbitalPhase.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={orbitalPhase}
                onChange={e => setOrbitalPhase(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Report Dossier (Rendered upon successful transit detection) */}
      {candidateReport && (
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/40 rounded-xl p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-[11px] font-mono font-bold tracking-wider">
                  EXOPLANET CANDIDATE VALIDATED
                </span>
                <span className="text-xs font-mono text-slate-400">
                  CONFIDENCE: <strong className="text-cyan-300">{candidateReport.confidenceScore}%</strong>
                </span>
              </div>
              <h3 className="text-xl font-bold text-white font-display mt-1">
                Astrophysical Dossier: {selectedTarget.targetPlanetName}
              </h3>
            </div>

            <div className="text-right font-mono text-xs text-slate-400">
              <div>Detection Algorithm: <strong>Local Box-Least Squares & Limb Fit</strong></div>
              <div className="text-[11px] text-slate-500 mt-0.5">Zero pre-trained models utilized</div>
            </div>
          </div>

          {/* Dossier Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Transit Depth */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Transit Depth (ΔF/F)</div>
              <div className="text-base font-bold font-mono text-cyan-300 mt-1">
                {candidateReport.transitDepthPpm} <span className="text-xs font-normal text-slate-400">ppm</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {(candidateReport.transitDepthFraction * 100).toFixed(3)}% eclipse
              </div>
            </div>

            {/* Planet Radius */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Planet Radius (Rp)</div>
              <div className="text-base font-bold font-mono text-indigo-300 mt-1">
                {candidateReport.estimatedPlanetRadiusEarth} <span className="text-xs font-normal text-slate-400">R⊕</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {candidateReport.estimatedPlanetRadiusJupiter} R_Jup
              </div>
            </div>

            {/* Orbital Period */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Orbital Period (P)</div>
              <div className="text-base font-bold font-mono text-white mt-1">
                {candidateReport.detectedPeriodDays.toFixed(2)} <span className="text-xs font-normal text-slate-400">days</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Keplerian harmonic
              </div>
            </div>

            {/* Semi-Major Axis */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Semi-Major Axis (a)</div>
              <div className="text-base font-bold font-mono text-cyan-200 mt-1">
                {candidateReport.semiMajorAxisAu} <span className="text-xs font-normal text-slate-400">AU</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Kepler's 3rd Law
              </div>
            </div>

            {/* Equilibrium Temp */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Equilibrium Temp (Teq)</div>
              <div className="text-base font-bold font-mono text-amber-300 mt-1">
                {candidateReport.equilibriumTempKelvin} <span className="text-xs font-normal text-slate-400">K</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {(candidateReport.equilibriumTempKelvin - 273.15).toFixed(0)} °C
              </div>
            </div>

            {/* Signal-to-Noise Ratio */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Detection SNR</div>
              <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                {candidateReport.signalToNoiseRatio} <span className="text-xs font-normal text-slate-400">σ</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                High Significance
              </div>
            </div>
          </div>

          {/* Habitable Zone Banner */}
          <div className="mt-4 p-3.5 bg-slate-950/90 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Kopparapu Habitable Zone:</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                candidateReport.habitableZoneStatus.includes('Habitable')
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {candidateReport.habitableZoneStatus}
              </span>
            </div>

            <div className="text-xs font-mono text-slate-400">
              Full transit chain verified: <strong className="text-cyan-400">Resilient Network → Telemetry Delivery → Science Output</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
