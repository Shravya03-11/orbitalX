/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Asteroid & Comet Disruption Simulation Engine
 * Controls procedural debris insertion, link occlusion calculations,
 * and triggers autonomous graph recalculation via custom Dijkstra algorithm.
 */

import React from 'react';
import { AsteroidCluster, ScenarioType, CommStatus } from '../types/network';

interface DisruptionControllerProps {
  asteroidClusters: AsteroidCluster[];
  commStatus: CommStatus;
  activeScenario: ScenarioType;
  onSimulateDisruption: () => void;
  onTriggerSecondDisruption: () => void;
  onRestoreNormal: () => void;
  onResetNetwork: () => void;
  onSelectScenario: (scenario: ScenarioType) => void;
}

export const DisruptionController: React.FC<DisruptionControllerProps> = ({
  asteroidClusters,
  commStatus,
  activeScenario,
  onSimulateDisruption,
  onTriggerSecondDisruption,
  onRestoreNormal,
  onResetNetwork,
  onSelectScenario,
}) => {
  const isDirectBlocked = asteroidClusters.some(c => c.id === 'cluster-apophis-omega' && c.active);
  const isMultipleBlocked = asteroidClusters.every(c => c.active);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
      {/* Title & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 font-display tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            DISRUPTION VECTOR & CORRIDOR INJECTION
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Simulate physical asteroid occlusion across deep-space transmission lines
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">STATUS:</span>
          <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider ${
            commStatus === 'ONLINE'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : commStatus === 'REROUTING'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : commStatus === 'DEGRADED'
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
              : 'bg-red-500/20 text-red-400 border border-red-500/40'
          }`}>
            {commStatus}
          </span>
        </div>
      </div>

      {/* Prominent Primary Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Button 1: SIMULATE ASTEROID DISRUPTION */}
        <button
          type="button"
          onClick={onSimulateDisruption}
          className={`py-3 px-4 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer shadow-lg ${
            isDirectBlocked && !isMultipleBlocked
              ? 'bg-amber-600/30 text-amber-300 border-2 border-amber-500 shadow-amber-500/20'
              : 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white border border-red-400 shadow-red-950/40 active:scale-95'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-amber-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Simulate Asteroid Disruption</span>
          </div>
          <span className="text-[10px] text-amber-200/80 font-normal">Occlude Direct Corridor</span>
        </button>

        {/* Button 2: TRIGGER ANOTHER DISRUPTION */}
        <button
          type="button"
          onClick={onTriggerSecondDisruption}
          className={`py-3 px-4 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer shadow-lg ${
            isMultipleBlocked
              ? 'bg-red-950/60 text-red-300 border-2 border-red-500 shadow-red-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Trigger Another Disruption</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">Inject Comet Coma Cloud</span>
        </button>

        {/* Button 3: RESTORE NORMAL CONDITIONS */}
        <button
          type="button"
          onClick={onRestoreNormal}
          className="py-3 px-4 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-800 hover:bg-slate-700 hover:text-emerald-300 text-slate-200 border border-slate-700 active:scale-95 shadow-md"
        >
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Restore Normal Conditions</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">Clear Debris & Reopen Direct Line</span>
        </button>

        {/* Button 4: RESET NETWORK */}
        <button
          type="button"
          onClick={onResetNetwork}
          className="py-3 px-4 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 active:scale-95"
        >
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reset Network</span>
          </div>
          <span className="text-[10px] text-slate-500 font-normal">Re-initialize Graph Baseline</span>
        </button>
      </div>

      {/* Required Hackathon Demonstration Scenarios Quick Select (For Judges) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">
            JUDGE BENCHMARK SCENARIOS:
          </span>
          <span className="text-[11px] text-slate-400">Instant deterministic validation</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Scenario 1 */}
          <button
            type="button"
            onClick={() => onSelectScenario('scenario-1-normal')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition cursor-pointer border ${
              activeScenario === 'scenario-1-normal'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md shadow-cyan-500/30'
                : 'bg-slate-900 text-slate-300 hover:text-cyan-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            1. Normal Comm
          </button>

          {/* Scenario 2 */}
          <button
            type="button"
            onClick={() => onSelectScenario('scenario-2-direct-blocked')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition cursor-pointer border ${
              activeScenario === 'scenario-2-direct-blocked'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/30'
                : 'bg-slate-900 text-slate-300 hover:text-amber-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            2. Direct Blocked (Dijkstra Relay)
          </button>

          {/* Scenario 3 */}
          <button
            type="button"
            onClick={() => onSelectScenario('scenario-3-disconnected')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition cursor-pointer border ${
              activeScenario === 'scenario-3-disconnected'
                ? 'bg-red-500 text-slate-950 font-bold border-red-400 shadow-md shadow-red-500/30'
                : 'bg-slate-900 text-slate-300 hover:text-red-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            3. Network Disconnected (Offline)
          </button>
        </div>
      </div>
    </div>
  );
};
