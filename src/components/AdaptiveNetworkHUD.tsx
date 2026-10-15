/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Adaptive Network Clean Floating HUD
 * Unobstructed center, compact left-edge communication telemetry HUD,
 * and dual primary physical actions at bottom center.
 */

import React from 'react';
import { TelemetryState, NetworkNode, NetworkLink, AsteroidCluster } from '../types/network';
import { SciFiButton } from './SciFiButton';

interface AdaptiveNetworkHUDProps {
  telemetry: TelemetryState;
  nodes: NetworkNode[];
  links: NetworkLink[];
  asteroidClusters: AsteroidCluster[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSimulateDisruption: () => void;
  onTriggerSecondDisruption: () => void;
  onRestoreCommunication: () => void;
  onResetNetwork: () => void;
}

export const AdaptiveNetworkHUD: React.FC<AdaptiveNetworkHUDProps> = ({
  telemetry,
  nodes,
  links,
  asteroidClusters,
  selectedNodeId,
  onSelectNode,
  onSimulateDisruption,
  onTriggerSecondDisruption,
  onRestoreCommunication,
  onResetNetwork,
}) => {
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const isDirectSevered = asteroidClusters.some(c => c.id === 'cluster-apophis-omega' && c.active);

  const getNodeName = (id: string) => {
    const node = nodes.find(n => n.id === id);
    return node ? node.name.split(' ')[0] : id;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 pt-20 pb-6 z-20">
      {/* Upper Flanks: Left Edge Compact Telemetry HUD & Optional Selected Node Details */}
      <div className="w-full max-w-7xl mx-auto flex items-start justify-between gap-4">
        {/* Left Edge: One Compact Telemetry HUD */}
        <div className="pointer-events-auto hud-glass rounded-xl p-3.5 max-w-[280px] w-full shadow-2xl relative">
          <span className="corner-bracket-tl border-cyan-400" />
          <span className="corner-bracket-br border-cyan-400" />

          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                telemetry.commStatus === 'ONLINE' ? 'bg-cyan-400' : telemetry.commStatus === 'REROUTING' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'
              }`} />
              <span className="text-[10px] font-mono font-bold text-slate-200 tracking-wider">
                NETWORK TOPOLOGY
              </span>
            </div>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
              telemetry.commStatus === 'ONLINE' ? 'bg-emerald-950/80 text-emerald-300' : telemetry.commStatus === 'REROUTING' ? 'bg-amber-950/80 text-amber-300' : 'bg-red-950/80 text-red-300'
            }`}>
              {telemetry.commStatus}
            </span>
          </div>

          {/* Active Route Hops */}
          <div className="mb-2">
            <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Active Dijkstra Path:
            </div>
            {telemetry.activePath.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                {telemetry.activePath.map((nodeId, idx) => {
                  const isLast = idx === telemetry.activePath.length - 1;
                  return (
                    <React.Fragment key={nodeId}>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-200 border border-cyan-800/60 text-[10px] font-mono">
                        {getNodeName(nodeId)}
                      </span>
                      {!isLast && <span className="text-cyan-400 text-[10px]">→</span>}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="text-[10px] font-mono text-red-400 font-bold bg-red-950/50 p-1.5 rounded border border-red-800/60">
                OFFLINE — NETWORK PARTITIONED
              </div>
            )}
          </div>

          {/* Compact Telemetry Readouts */}
          <div className="space-y-1 text-[11px] font-mono border-t border-slate-800/60 pt-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Latency (Delay):</span>
              <span className="text-cyan-300 font-semibold">{telemetry.commStatus === 'OFFLINE' ? '---' : `${telemetry.estimatedLatencyMs} ms`}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Link Quality:</span>
              <span className="text-emerald-300 font-semibold">{telemetry.commStatus === 'OFFLINE' ? '0%' : `${Math.round(telemetry.linkQuality * 100)}%`}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Disrupted Corridors:</span>
              <span className={telemetry.disruptedLinksCount > 0 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                {telemetry.disruptedLinksCount} link(s)
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Dijkstra Cost:</span>
              <span className="text-indigo-300 font-semibold">{telemetry.commStatus === 'OFFLINE' ? '∞' : telemetry.totalCost}</span>
            </div>
          </div>

          {/* Algorithmic Log */}
          {telemetry.routeResult && (
            <div className="mt-2 text-[9px] font-mono text-slate-400 bg-slate-950/80 p-1.5 rounded border border-slate-800 leading-tight">
              <span className="text-cyan-400 font-semibold">SOLVER: </span>
              <span>{telemetry.routeResult.algorithmNotes}</span>
            </div>
          )}
        </div>

        {/* Right Edge: Optional Node Details Drawer if selected */}
        {selectedNode && (
          <div className="pointer-events-auto hud-glass rounded-xl p-3 max-w-[260px] w-full text-xs font-mono relative shadow-2xl">
            <span className="corner-bracket-tr border-cyan-400" />
            <span className="corner-bracket-bl border-cyan-400" />
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-1.5">
              <span className="font-bold text-cyan-300 text-[11px]">{selectedNode.name}</span>
              <button
                type="button"
                onClick={() => onSelectNode(null)}
                className="text-slate-400 hover:text-white p-0.5 text-[10px]"
              >
                ✕
              </button>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">{selectedNode.description}</p>
            <div className="mt-1 text-[9px] text-slate-500 font-mono">Location: {selectedNode.realCoordinates}</div>
          </div>
        )}
      </div>

      {/* Center is 100% UNOBSTRUCTED for the living 3D network beams */}

      {/* Bottom Center: Clear Primary Physical Actions */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-2">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 w-full">
          {/* SIMULATE DISRUPTION */}
          <SciFiButton
            label="SIMULATE DISRUPTION"
            sublabel="Move asteroid swarm into corridor"
            variant="danger"
            onClick={onSimulateDisruption}
            icon={
              <svg className="w-4 h-4 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            className="w-52"
          />

          {/* RESTORE COMMUNICATION */}
          <SciFiButton
            label="RESTORE COMMUNICATION"
            sublabel="Clear debris & reopen direct line"
            variant="success"
            onClick={onRestoreCommunication}
            icon={
              <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            className="w-52"
          />
        </div>

        {/* Secondary quiet controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onTriggerSecondDisruption}
            className="px-2.5 py-1 rounded bg-slate-900/60 hover:bg-slate-800 text-[10px] font-mono text-purple-300 border border-slate-800 hover:border-purple-500/50 transition cursor-pointer"
          >
            Trigger Comet Storm (Offline)
          </button>
          <button
            type="button"
            onClick={onResetNetwork}
            className="px-2.5 py-1 rounded bg-slate-900/60 hover:bg-slate-800 text-[10px] font-mono text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer"
          >
            Reset Graph
          </button>
        </div>
      </div>
    </div>
  );
};
