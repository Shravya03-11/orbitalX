/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Mission Control Minimal HUD
 * Unobstructed center, compact left & right edge indicators,
 * and dual primary sci-fi controls at bottom center.
 */

import React from 'react';
import { TelemetryState, ExoplanetTransitData } from '../types/network';
import { SciFiButton } from './SciFiButton';

interface MissionControlHUDProps {
  telemetry: TelemetryState;
  targetSystem: ExoplanetTransitData;
  orbitalPhase: number;
  isInTransit: boolean;
  onInitiateScan: () => void;
  onSimulateDisruption: () => void;
  onOpenNetwork: () => void;
  onOpenExoplanetLab: () => void;
}

export const MissionControlHUD: React.FC<MissionControlHUDProps> = ({
  telemetry,
  targetSystem,
  orbitalPhase,
  isInTransit,
  onInitiateScan,
  onSimulateDisruption,
  onOpenNetwork,
  onOpenExoplanetLab,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 pt-20 pb-6 z-20">
      {/* Upper Flanks: Left & Right Compact Edge HUDs */}
      <div className="w-full max-w-7xl mx-auto flex items-start justify-between gap-4">
        {/* Left Edge: Compact Radio Corridor Status */}
        <div className="pointer-events-auto hud-glass rounded-xl p-3 max-w-[240px] w-full shadow-2xl relative">
          <span className="corner-bracket-tl border-cyan-400" />
          <span className="corner-bracket-br border-cyan-400" />

          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                telemetry.commStatus === 'ONLINE' ? 'bg-emerald-400' : telemetry.commStatus === 'REROUTING' ? 'bg-amber-400' : 'bg-red-400'
              }`} />
              <span className="text-[10px] font-mono font-bold text-slate-200 tracking-wider">
                RADIO CORRIDOR
              </span>
            </div>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
              telemetry.commStatus === 'ONLINE' ? 'bg-emerald-950/80 text-emerald-300' : telemetry.commStatus === 'REROUTING' ? 'bg-amber-950/80 text-amber-300' : 'bg-red-950/80 text-red-300'
            }`}>
              {telemetry.commStatus}
            </span>
          </div>

          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Latency:</span>
              <span className="text-cyan-300 font-semibold">
                {telemetry.commStatus === 'OFFLINE' ? '---' : `${telemetry.estimatedLatencyMs} ms`}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Relays:</span>
              <span className="text-slate-200">{telemetry.availableRelaysCount} / {telemetry.totalRelaysCount} Online</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Route:</span>
              <span className="text-cyan-200 truncate max-w-[120px]">
                {telemetry.routeResult ? `${telemetry.routeResult.hopCount} hop(s)` : 'Severed'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenNetwork}
            className="mt-2 w-full py-1 text-[9px] font-mono text-cyan-400 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/80 rounded transition cursor-pointer flex items-center justify-center gap-1"
          >
            <span>Network Details →</span>
          </button>
        </div>

        {/* Right Edge: Compact Transit Telemetry */}
        <div className="pointer-events-auto hud-glass rounded-xl p-3 max-w-[240px] w-full shadow-2xl relative">
          <span className="corner-bracket-tr border-cyan-400" />
          <span className="corner-bracket-bl border-cyan-400" />

          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isInTransit ? 'bg-cyan-400' : 'bg-amber-400'}`} />
              <span className="text-[10px] font-mono font-bold text-slate-200 tracking-wider">
                TARGET STAR
              </span>
            </div>
            <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/80">
              {targetSystem.targetPlanetName}
            </span>
          </div>

          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Keplerian Φ:</span>
              <span className="text-cyan-300 font-semibold">{orbitalPhase.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Transit State:</span>
              <span className={isInTransit ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                {isInTransit ? 'IN ECLIPSE' : 'BASELINE'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Depth:</span>
              <span className="text-slate-200">{targetSystem.depthPpm} ppm</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenExoplanetLab}
            className="mt-2 w-full py-1 text-[9px] font-mono text-cyan-400 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/80 rounded transition cursor-pointer flex items-center justify-center gap-1"
          >
            <span>Exoplanet Lab →</span>
          </button>
        </div>
      </div>

      {/* Center is 100% UNVOBSTRUCTED for the living 3D universe */}

      {/* Bottom Center: Exactly Two Clear Primary Actions */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-2.5">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 w-full">
          {/* Action 1: INITIATE SCAN */}
          <SciFiButton
            label="INITIATE SCAN"
            sublabel="Glide to transit analysis"
            variant="primary"
            onClick={onInitiateScan}
            icon={
              <svg className="w-4 h-4 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            className="w-52"
          />

          {/* Action 2: SIMULATE DISRUPTION */}
          <SciFiButton
            label="SIMULATE DISRUPTION"
            sublabel="Occlude direct radio corridor"
            variant="danger"
            onClick={onSimulateDisruption}
            icon={
              <svg className="w-4 h-4 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            className="w-52"
          />
        </div>
      </div>
    </div>
  );
};
