/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Exoplanet Lab Clean Floating HUD
 * Unobstructed central stellar transit view, minimal left scenario picker,
 * compact right-edge light-curve HUD with synchronized marker, and bottom controls.
 */

import React, { useState } from 'react';
import { CatalogTarget, EXOPLANET_CATALOG } from '../data/exoplanetCatalog';
import { TransitAnalysisResult, CommStatus } from '../types/network';
import { analyzeTransitPhotometry } from '../algorithms/transitDetection';
import { SciFiButton } from './SciFiButton';

interface ExoplanetLabHUDProps {
  commStatus: CommStatus;
  dataDelivered: boolean;
  dataPacketProgress: number;
  orbitalPhase: number;
  isOrbitPlaying: boolean;
  onToggleOrbitPlay: () => void;
  onOrbitalPhaseChange: (phase: number) => void;
  targetSystem: CatalogTarget;
  onSelectTargetSystem: (system: CatalogTarget) => void;
  candidateReport: TransitAnalysisResult | null;
  onAnalysisSuccess: (result: TransitAnalysisResult) => void;
}

export const ExoplanetLabHUD: React.FC<ExoplanetLabHUDProps> = ({
  commStatus,
  dataDelivered,
  dataPacketProgress,
  orbitalPhase,
  isOrbitPlaying,
  onToggleOrbitPlay,
  onOrbitalPhaseChange,
  targetSystem,
  onSelectTargetSystem,
  candidateReport,
  onAnalysisSuccess,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const rows = ['time_hours,relative_flux,flux_err'];
    targetSystem.rawTimeHours.forEach((t, i) => {
      const f = targetSystem.rawRelativeFlux[i];
      const err = (targetSystem.rawFluxErrors && targetSystem.rawFluxErrors[i]) || 0.00015;
      rows.push(`${t.toFixed(4)},${f.toFixed(6)},${err.toFixed(6)}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetSystem.targetPlanetName.replace(/\s+/g, '_')}_light_curve.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      const times: number[] = [];
      const fluxes: number[] = [];
      const errors: number[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (/[a-zA-Z]/.test(line)) continue;
        const parts = line.split(/[,\t\s]+/);
        if (parts.length >= 2) {
          const t = parseFloat(parts[0]);
          const f = parseFloat(parts[1]);
          const err = parts.length >= 3 ? parseFloat(parts[2]) : 0.00015;
          if (!isNaN(t) && !isNaN(f)) {
            times.push(t);
            fluxes.push(f);
            errors.push(isNaN(err) ? 0.00015 : err);
          }
        }
      }

      if (times.length > 5) {
        const minF = Math.min(...fluxes);
        const depthPpm = Math.max(10, Math.round((1.0 - minF) * 1000000));
        const customTarget: CatalogTarget = {
          ...targetSystem,
          targetPlanetName: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
          systemName: 'User Imported Observation',
          scenarioLabel: 'Custom CSV Dataset',
          scenarioDescription: `Custom observation containing ${times.length} cadence points.`,
          depthPpm,
          rawTimeHours: times,
          rawRelativeFlux: fluxes,
          rawFluxErrors: errors,
        };
        onSelectTargetSystem(customTarget);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRunAnalysis = () => {
    if (!dataDelivered || commStatus === 'OFFLINE') return;
    setIsAnalyzing(true);
    setTimeout(() => {
      try {
        const result = analyzeTransitPhotometry(targetSystem);
        onAnalysisSuccess(result);
      } catch (err) {
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 400);
  };

  // Light curve plot dimensions (compact, razor-sharp)
  const minFlux = Math.min(...targetSystem.rawRelativeFlux);
  const maxFlux = Math.max(...targetSystem.rawRelativeFlux);
  const fluxRange = maxFlux - minFlux || 0.01;

  const svgWidth = 420;
  const svgHeight = 140;
  const padding = { top: 14, right: 18, bottom: 22, left: 44 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const minTime = Math.min(...targetSystem.rawTimeHours);
  const maxTime = Math.max(...targetSystem.rawTimeHours);
  const timeRange = maxTime - minTime || 1;

  const points = targetSystem.rawTimeHours.map((t, idx) => {
    const f = targetSystem.rawRelativeFlux[idx];
    const x = padding.left + ((t - minTime) / timeRange) * plotWidth;
    const y = padding.top + plotHeight - ((f - (minFlux - 0.0003)) / (fluxRange + 0.0006)) * plotHeight;
    return { x, y, t, f };
  });

  // Synchronized observation marker tracking in real-time with orbital phase
  const currentMarkerX = padding.left + orbitalPhase * plotWidth;
  const sampleIdx = Math.min(points.length - 1, Math.max(0, Math.floor(orbitalPhase * points.length)));
  const currentY = points[sampleIdx] ? points[sampleIdx].y : padding.top + plotHeight / 2;
  const currentFlux = points[sampleIdx] ? points[sampleIdx].f : 1.0;
  const isInTransit = currentFlux < 0.998;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 pt-20 pb-6 z-20">
      {/* Upper Flanks: Left Scenario Picker & Right Compact Light-Curve HUD */}
      <div className="w-full max-w-7xl mx-auto flex items-start justify-between gap-4">
        {/* Left Edge: Observation Scenario Selector */}
        <div className="pointer-events-auto hud-glass rounded-xl p-3 max-w-[240px] w-full shadow-2xl relative">
          <span className="corner-bracket-tl border-cyan-400" />
          <span className="corner-bracket-br border-cyan-400" />

          <div className="text-[10px] font-mono font-bold text-slate-200 border-b border-slate-800/80 pb-1.5 mb-2 flex items-center justify-between">
            <span>OBSERVATION SCENARIO</span>
            <span className="text-cyan-400 font-normal">[SYNTHETIC]</span>
          </div>

          <div className="space-y-1.5">
            {EXOPLANET_CATALOG.map(sys => {
              const isSelected = targetSystem.targetPlanetName === sys.targetPlanetName;
              return (
                <button
                  key={sys.targetPlanetName}
                  type="button"
                  onClick={() => onSelectTargetSystem(sys)}
                  className={`w-full text-left p-2 rounded-lg text-xs font-mono transition cursor-pointer border ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{sys.targetPlanetName}</span>
                    <span className="text-[9px] opacity-75">{sys.scenarioLabel}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">{sys.scenarioDescription}</div>
                </button>
              );
            })}
          </div>

          {/* CSV Light Curve Data Ingestion & Export */}
          <div className="pt-2.5 mt-2 border-t border-slate-800/80 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex-1 py-1 px-1.5 rounded bg-slate-900/80 hover:bg-cyan-950 border border-slate-700/80 hover:border-cyan-500/60 text-[9px] font-mono text-slate-300 hover:text-cyan-300 transition flex items-center justify-center gap-1 cursor-pointer"
              title="Download light curve CSV dataset"
            >
              <span>↓ EXPORT CSV</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-1 px-1.5 rounded bg-slate-900/80 hover:bg-cyan-950 border border-slate-700/80 hover:border-cyan-500/60 text-[9px] font-mono text-slate-300 hover:text-cyan-300 transition flex items-center justify-center gap-1 cursor-pointer"
              title="Upload custom light curve CSV"
            >
              <span>↑ UPLOAD CSV</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Right Edge: Compact Light-Curve HUD & Synchronized Marker */}
        <div className="pointer-events-auto hud-glass rounded-xl p-3.5 max-w-[430px] w-full shadow-2xl relative">
          <span className="corner-bracket-tr border-cyan-400" />
          <span className="corner-bracket-bl border-cyan-400" />

          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-2">
            <div>
              <div className="text-[11px] font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isInTransit ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'}`} />
                <span>LIGHT CURVE // PHOTOMETRIC FLUX</span>
              </div>
              <div className="text-[9px] font-mono text-slate-400">
                Target: {targetSystem.targetPlanetName} | Expected Depth: {targetSystem.depthPpm} ppm
              </div>
            </div>

            <div className="text-right">
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                isInTransit ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' : 'bg-slate-900 text-slate-400'
              }`}>
                {isInTransit ? 'ECLIPSE DETECTED' : 'BASELINE'}
              </span>
            </div>
          </div>

          {/* SVG Light Curve Graph */}
          <div className="w-full bg-slate-950/90 rounded-lg border border-slate-800/80 p-1">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto font-mono">
              <line x1={padding.left} y1={padding.top + plotHeight * 0.2} x2={svgWidth - padding.right} y2={padding.top + plotHeight * 0.2} stroke="#1e293b" strokeDasharray="3 3" />
              <line x1={padding.left} y1={padding.top + plotHeight * 0.8} x2={svgWidth - padding.right} y2={padding.top + plotHeight * 0.8} stroke="#1e293b" strokeDasharray="3 3" />

              <text x={padding.left - 6} y={padding.top + plotHeight * 0.2 + 3} fill="#64748b" fontSize="8" textAnchor="end">1.0000</text>
              <text x={padding.left - 6} y={padding.top + plotHeight * 0.8 + 3} fill="#64748b" fontSize="8" textAnchor="end">{(1.0 - (targetSystem.depthPpm / 1000000)).toFixed(4)}</text>

              {/* Transit Curve line */}
              <path
                d={points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.8"
                strokeOpacity="0.85"
              />

              {/* Photometric Points */}
              {points.map((pt, i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="1.8" fill={pt.f < 0.998 ? '#38bdf8' : '#64748b'} opacity="0.65" />
              ))}

              {/* Synchronized Marker Line */}
              <line x1={currentMarkerX} y1={padding.top} x2={currentMarkerX} y2={padding.top + plotHeight} stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="2 2" />
              <circle cx={currentMarkerX} cy={currentY} r="3" fill="#f59e0b" />
            </svg>
          </div>

          {/* Compact Candidate Dossier if analyzed */}
          {candidateReport ? (
            <div className="mt-2.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] font-mono grid grid-cols-3 gap-1.5">
              <div>
                <span className="text-slate-400">Radius: </span>
                <span className="text-indigo-300 font-bold">{candidateReport.estimatedPlanetRadiusEarth} R⊕</span>
              </div>
              <div>
                <span className="text-slate-400">Teq: </span>
                <span className="text-amber-300 font-bold">{candidateReport.equilibriumTempKelvin} K</span>
              </div>
              <div>
                <span className="text-slate-400">Habitable: </span>
                <span className="text-emerald-400 font-bold truncate">{candidateReport.habitableZoneStatus.split('/')[0]}</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[10px] font-mono text-slate-400 text-center">
              Click ANALYSE LIGHT CURVE to compute transit depth, planet radius & habitable zone.
            </div>
          )}
        </div>
      </div>

      {/* Center is 100% UNOBSTRUCTED for the glowing amber star and transit */}

      {/* Bottom Center: ANALYSE LIGHT CURVE Button & Orbital Kinematic Scrubber */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-2">
        <div className="pointer-events-auto flex items-center justify-center gap-3 w-full">
          {/* Play/Pause Orbit Animation */}
          <button
            type="button"
            onClick={onToggleOrbitPlay}
            className="px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-mono transition cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            {isOrbitPlaying ? '❚❚ PAUSE' : '▶ PLAY'}
          </button>

          {/* Primary Action: ANALYSE LIGHT CURVE */}
          <SciFiButton
            label="ANALYSE LIGHT CURVE"
            sublabel="Fit transit depth & calculate radius"
            variant="primary"
            onClick={handleRunAnalysis}
            disabled={!dataDelivered || commStatus === 'OFFLINE'}
            isLoading={isAnalyzing}
            loadingLabel="SOLVING BLS FIT..."
            className="w-56"
            icon={
              <svg className="w-4 h-4 text-cyan-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />

          {/* Mid-Transit Snap */}
          <button
            type="button"
            onClick={() => onOrbitalPhaseChange(0.5)}
            className="px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono transition cursor-pointer shadow-md"
          >
            Mid-Transit
          </button>
        </div>

        {/* Orbital Scrubber Slider */}
        <div className="pointer-events-auto flex items-center gap-2 max-w-sm w-full bg-slate-950/70 hud-glass px-3 py-1 rounded-full text-[10px] font-mono text-slate-400">
          <span>Phase (Φ):</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={orbitalPhase}
            onChange={e => onOrbitalPhaseChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <span className="text-cyan-300 font-bold w-8 text-right">{orbitalPhase.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
