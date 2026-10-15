/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Mission Report & Executive Dossier Floating Modal
 * Transparent glass overlay displaying the 7-step resilience pipeline and exporting scientific logs.
 */

import React from 'react';
import { TelemetryState, TransitAnalysisResult, ExoplanetTransitData } from '../types/network';
import { SciFiButton } from './SciFiButton';

interface MissionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryState;
  targetSystem: ExoplanetTransitData;
  candidateReport: TransitAnalysisResult | null;
}

export const MissionReportModal: React.FC<MissionReportModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  targetSystem,
  candidateReport,
}) => {
  if (!isOpen) return null;

  const steps = [
    { title: 'Asteroid Ingress', desc: 'Debris swarm enters corridor', active: true },
    { title: 'Link Degradation', desc: 'Hardware flags signal loss', active: telemetry.disruptedLinksCount > 0 },
    { title: 'Dijkstra Recomputation', desc: 'O((V+E)log V) custom solver', active: true },
    { title: 'Relay Path Locking', desc: 'Autonomous microwave handoff', active: telemetry.commStatus !== 'OFFLINE' },
    { title: 'Telemetry Streaming', desc: 'Photometric batches arrive', active: telemetry.commStatus !== 'OFFLINE' },
    { title: 'Light Curve Fit', desc: 'Limb-darkened Mandel-Agol fit', active: candidateReport !== null },
    { title: 'Candidate Dossier', desc: 'Habitable Zone classified', active: candidateReport !== null },
  ];

  const handleExportReport = () => {
    const reportData = {
      mission: 'ORBITAL X — Autonomous Space Communication Recovery & Exoplanet Hunter',
      timestamp: new Date().toISOString(),
      network: {
        status: telemetry.commStatus,
        activePath: telemetry.activePath,
        latencyMs: telemetry.estimatedLatencyMs,
        dijkstraCost: telemetry.totalCost,
        disruptedLinks: telemetry.disruptedLinksCount,
        availableRelays: `${telemetry.availableRelaysCount}/${telemetry.totalRelaysCount}`,
      },
      targetSystem: {
        name: targetSystem.systemName,
        targetPlanet: targetSystem.targetPlanetName,
        starType: targetSystem.starType,
        starRadiusSolar: targetSystem.starRadiusSolar,
        starTempKelvin: targetSystem.starTempKelvin,
      },
      photometricDetection: candidateReport
        ? {
            detectedPeriodDays: candidateReport.detectedPeriodDays,
            transitDepthPpm: candidateReport.transitDepthPpm,
            estimatedPlanetRadiusEarth: candidateReport.estimatedPlanetRadiusEarth,
            semiMajorAxisAu: candidateReport.semiMajorAxisAu,
            equilibriumTempKelvin: candidateReport.equilibriumTempKelvin,
            habitableZoneStatus: candidateReport.habitableZoneStatus,
            signalToNoiseRatio: candidateReport.signalToNoiseRatio,
            confidenceScore: candidateReport.confidenceScore,
          }
        : 'Transit detection pending data ingestion',
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORBITAL_X_MISSION_REPORT_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const csvContent = [
      'PARAMETER,VALUE,UNIT/NOTE',
      `MISSION,ORBITAL X — Autonomous Space Communication Recovery & Exoplanet Hunter,DEEP-SPACE SYSTEM`,
      `TIMESTAMP,${new Date().toISOString()},UTC`,
      `COMMUNICATION_STATUS,${telemetry.commStatus},NETWORK HEALTH`,
      `DIJKSTRA_ACTIVE_PATH,"${telemetry.activePath.join(' -> ')}",AUTONOMOUS ROUTE`,
      `LATENCY_MS,${telemetry.estimatedLatencyMs},MILLISECONDS`,
      `LINK_QUALITY,${Math.round(telemetry.linkQuality * 100)}%,AVERAGE CARRIER`,
      `DISRUPTED_CORRIDORS,${telemetry.disruptedLinksCount},FRESNEL BLOCKADES`,
      `ONLINE_RELAYS,${telemetry.availableRelaysCount}/${telemetry.totalRelaysCount},OPERATIONAL MESH`,
      `TARGET_SYSTEM,${targetSystem.systemName},HOST STELLAR SYSTEM`,
      `TARGET_PLANET,${targetSystem.targetPlanetName},EXOPLANET TARGET`,
      `TRANSIT_DEPTH_PPM,${candidateReport ? candidateReport.transitDepthPpm : targetSystem.depthPpm},PARTS PER MILLION`,
      `PLANET_RADIUS_EARTH,${candidateReport ? candidateReport.estimatedPlanetRadiusEarth : 'PENDING'},EARTH RADII (R_EARTH)`,
      `PLANET_RADIUS_JUPITER,${candidateReport ? candidateReport.estimatedPlanetRadiusJupiter : 'PENDING'},JUPITER RADII (R_JUP)`,
      `SEMI_MAJOR_AXIS_AU,${candidateReport ? candidateReport.semiMajorAxisAu : 'PENDING'},ASTRONOMICAL UNITS (AU)`,
      `EQUILIBRIUM_TEMP_K,${candidateReport ? candidateReport.equilibriumTempKelvin : 'PENDING'},KELVIN (T_EQ)`,
      `HABITABLE_ZONE_STATUS,"${candidateReport ? candidateReport.habitableZoneStatus : 'PENDING'}",KOPPARAPU BOUNDS`,
      `DETECTION_SNR_SIGMA,${candidateReport ? candidateReport.signalToNoiseRatio : 'PENDING'},SIGNIFICANCE (SIGMA)`,
      `CONFIDENCE_SCORE,${candidateReport ? candidateReport.confidenceScore : 'PENDING'},PERCENT`,
      `SOLVER_METRICS,O((V+E)log V) Custom Dijkstra Solver,0 PRE-BUILT MODELS`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORBITAL_X_MISSION_REPORT_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl hud-glass rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <span className="corner-bracket-tl border-cyan-400" />
        <span className="corner-bracket-tr border-cyan-400" />
        <span className="corner-bracket-bl border-cyan-400" />
        <span className="corner-bracket-br border-cyan-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold">
                MISSION DEBRIEF
              </span>
              <span className="text-xs font-mono text-slate-400">
                REF: OX-LOG-{Date.now().toString().slice(-6)}
              </span>
            </div>
            <h2 className="text-lg font-bold font-display text-white mt-1">
              Executive Resilience & Scientific Report
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <SciFiButton
              label="JSON REPORT"
              sublabel="Full Schema"
              variant="primary"
              onClick={handleExportReport}
              icon={
                <svg className="w-4 h-4 text-cyan-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            />
            <SciFiButton
              label="CSV DOSSIER"
              sublabel="Table Data"
              variant="secondary"
              onClick={handleExportCSV}
              icon={
                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 7-Step Sequence Tracker */}
        <div className="mb-5">
          <div className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>7-Step Autonomous Resilience Sequence</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {steps.map((s, idx) => (
              <div
                key={s.title}
                className={`p-2 rounded-lg border text-xs font-mono flex flex-col justify-between min-h-[58px] ${
                  s.active
                    ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] opacity-70">
                  <span>0{idx + 1}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                </div>
                <div>
                  <div className="font-bold text-[10px] truncate">{s.title}</div>
                  <div className="text-[9px] opacity-75 truncate">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Network Resilience Telemetry */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-cyan-300 text-xs mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Network Routing Verification
            </div>
            <div className="space-y-1.5 text-slate-300 text-[11px]">
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span className="text-slate-400">Dijkstra Engine:</span>
                <span className="text-emerald-400 font-bold">100% Custom TypeScript</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span className="text-slate-400">Current Status:</span>
                <span className={telemetry.commStatus === 'OFFLINE' ? 'text-red-400 font-bold' : 'text-cyan-300 font-bold'}>
                  {telemetry.commStatus}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span className="text-slate-400">Traversed Path:</span>
                <span className="text-white truncate max-w-[180px]">
                  {telemetry.activePath.length > 0 ? telemetry.activePath.join(' → ') : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span className="text-slate-400">Latency:</span>
                <span className="text-cyan-300">{telemetry.estimatedLatencyMs} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AI Model Usage:</span>
                <span className="text-emerald-400 font-bold">Zero Pre-Built Models</span>
              </div>
            </div>
          </div>

          {/* Exoplanet Photometric Dossier */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-emerald-300 text-xs mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Photometric Transit Dossier
            </div>
            {candidateReport ? (
              <div className="space-y-1.5 text-slate-300 text-[11px]">
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Candidate:</span>
                  <span className="text-white font-bold">{targetSystem.targetPlanetName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Transit Depth:</span>
                  <span className="text-cyan-300 font-bold">{candidateReport.transitDepthPpm} ppm</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Planet Radius:</span>
                  <span className="text-indigo-300 font-bold">{candidateReport.estimatedPlanetRadiusEarth} R⊕</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Equilibrium Temp:</span>
                  <span className="text-amber-300">{candidateReport.equilibriumTempKelvin} K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Habitable Zone:</span>
                  <span className="text-emerald-400 font-bold">{candidateReport.habitableZoneStatus}</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs py-3 text-center">
                Select EXOPLANET LAB and click ANALYSE LIGHT CURVE to compute transit parameters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
