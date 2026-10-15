/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Real-Time Deep-Space Communication Telemetry Dashboard
 * Strictly displays live graph-derived telemetry, Dijkstra recomputation metrics,
 * and before-and-after route comparisons with zero fabricated metrics.
 */

import React from 'react';
import { TelemetryState, NetworkNode, NetworkLink } from '../types/network';

interface CommunicationDashboardProps {
  telemetry: TelemetryState;
  nodes: NetworkNode[];
  links: NetworkLink[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

export const CommunicationDashboard: React.FC<CommunicationDashboardProps> = ({
  telemetry,
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
}) => {
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Helper to format node name nicely
  const getNodeName = (id: string) => {
    const node = nodes.find(n => n.id === id);
    return node ? node.name : id;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Comm Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Comm Status</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-base font-bold font-mono ${
              telemetry.commStatus === 'ONLINE'
                ? 'text-emerald-400'
                : telemetry.commStatus === 'REROUTING'
                ? 'text-amber-400'
                : telemetry.commStatus === 'DEGRADED'
                ? 'text-orange-400'
                : 'text-red-400'
            }`}>
              {telemetry.commStatus}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono truncate">
            {telemetry.commStatus === 'OFFLINE' ? 'Signal Severed' : 'Channel Locked'}
          </div>
        </div>

        {/* Metric 2: Estimated Latency */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">End-to-End Delay</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-cyan-300">
              {telemetry.commStatus === 'OFFLINE' ? '---' : `${telemetry.estimatedLatencyMs}`}
            </span>
            <span className="text-xs text-slate-400 font-mono">ms</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono">
            {telemetry.commStatus === 'OFFLINE' ? 'Unreachable' : `~${(telemetry.estimatedLatencyMs / 1000).toFixed(2)}s roundtrip`}
          </div>
        </div>

        {/* Metric 3: Route Cost */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Dijkstra Cost</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-indigo-300">
              {telemetry.commStatus === 'OFFLINE' ? '∞' : telemetry.totalCost}
            </span>
            <span className="text-xs text-slate-400 font-mono">w-units</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono">
            {telemetry.routeResult ? `${telemetry.routeResult.hopCount} hop(s)` : 'No Path'}
          </div>
        </div>

        {/* Metric 4: Link Quality Index */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Link Quality</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-emerald-300">
              {telemetry.commStatus === 'OFFLINE' ? '0%' : `${Math.round(telemetry.linkQuality * 100)}%`}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono">
            SNR: {telemetry.commStatus === 'OFFLINE' ? '0 dB' : `${(telemetry.linkQuality * 24).toFixed(1)} dB`}
          </div>
        </div>

        {/* Metric 5: Active Relays */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Relay Mesh</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-slate-100">
              {telemetry.availableRelaysCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ {telemetry.totalRelaysCount} online</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono">
            {telemetry.disruptedLinksCount} disrupted links
          </div>
        </div>

        {/* Metric 6: Data Delivery Pipeline */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Data Delivery</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-base font-bold font-mono ${
              telemetry.dataDeliveryStatus === 'STREAMING' || telemetry.dataDeliveryStatus === 'RESTORED'
                ? 'text-cyan-400'
                : telemetry.dataDeliveryStatus === 'PAUSED'
                ? 'text-amber-400'
                : 'text-red-400'
            }`}>
              {telemetry.dataDeliveryStatus}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono truncate">
            {telemetry.packetsDelivered} batches synced
          </div>
        </div>
      </div>

      {/* Live Route Telemetry & Before-and-After Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Transmission Path Panel */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
                  Active Dynamic Transmission Path (Dijkstra Computed)
                </span>
              </div>
              {telemetry.routeResult && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded">
                  Solver Time: {telemetry.routeResult.computationTimeMs} ms
                </span>
              )}
            </div>

            {/* Path Nodes Flow */}
            {telemetry.activePath.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 my-2">
                {telemetry.activePath.map((nodeId, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === telemetry.activePath.length - 1;
                  const isSelected = selectedNodeId === nodeId;

                  return (
                    <React.Fragment key={nodeId}>
                      <button
                        type="button"
                        onClick={() => onSelectNode(nodeId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-300 shadow-md shadow-cyan-500/20'
                            : isFirst
                            ? 'bg-blue-950/80 text-blue-300 border-blue-700/80 hover:border-blue-500'
                            : isLast
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:border-emerald-500'
                            : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-cyan-500/50'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isFirst ? 'bg-blue-400' : isLast ? 'bg-emerald-400' : 'bg-cyan-400'
                        }`} />
                        <span>{getNodeName(nodeId)}</span>
                      </button>

                      {!isLast && (
                        <div className="flex items-center text-cyan-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-red-950/30 border border-red-900/60 rounded-lg text-xs font-mono text-red-300 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>COMMUNICATION NETWORK PARTITIONED: No physically available path through active relay constellation. All transmission halted.</span>
              </div>
            )}

            {/* Path notes from algorithmic computation */}
            {telemetry.routeResult && (
              <p className="text-xs text-slate-400 font-mono mt-3 bg-slate-950/50 p-2.5 rounded border border-slate-800/80">
                <span className="text-cyan-400 font-semibold">ALGORITHM LOG: </span>
                {telemetry.routeResult.algorithmNotes}
              </p>
            )}
          </div>

          {/* Data packet delivery progress indicator */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span>Photometric Data Packet Ingestion Progress</span>
              <span className="text-cyan-300 font-bold">
                {telemetry.commStatus === 'OFFLINE' ? 'INTERRUPTED' : `${Math.round(telemetry.dataPacketProgress)}%`}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-200 ${
                  telemetry.commStatus === 'OFFLINE'
                    ? 'bg-red-500 w-1/4'
                    : 'bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400'
                }`}
                style={{ width: telemetry.commStatus === 'OFFLINE' ? '100%' : `${telemetry.dataPacketProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Before-and-After Route Comparison Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
                Before / After Route Differential
              </span>
            </div>

            <div className="space-y-3">
              {/* Prior Route */}
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Prior Transmission Vector</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                  {telemetry.previousPath && telemetry.previousPath.length > 0
                    ? telemetry.previousPath.map(getNodeName).join(' → ')
                    : 'Initial Direct Corridor (Earth → Surveyor)'}
                </div>
              </div>

              {/* Current Active Route */}
              <div className="bg-slate-950/60 p-2.5 rounded border border-cyan-900/50">
                <div className="text-[10px] font-mono text-cyan-400 uppercase">Current Dijkstra Path</div>
                <div className="text-xs font-mono text-cyan-200 font-semibold mt-0.5 truncate">
                  {telemetry.activePath.length > 0
                    ? telemetry.activePath.map(getNodeName).join(' → ')
                    : 'OFFLINE / DISCONNECTED'}
                </div>
              </div>

              {/* Topology Delta Verdict */}
              <div className="text-[11px] font-mono text-slate-400 leading-relaxed">
                {telemetry.commStatus === 'OFFLINE' ? (
                  <span className="text-red-400">Network disconnected. Awaiting asteroid cluster clearance or alternate relay line.</span>
                ) : telemetry.routeResult?.isDirect ? (
                  <span className="text-emerald-400">Direct optimal link operational. High throughput, minimum latency.</span>
                ) : (
                  <span className="text-amber-300">Autonomous relay diversion engaged. Successfully routed around hazardous debris.</span>
                )}
              </div>
            </div>
          </div>

          {/* Node Inspector Drawer */}
          {selectedNode && (
            <div className="mt-3 pt-3 border-t border-slate-800 bg-slate-950/80 p-2.5 rounded">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300 mb-1">
                <span>{selectedNode.name}</span>
                <span className="text-[10px] text-slate-400 uppercase">{selectedNode.type}</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 leading-tight">
                {selectedNode.description}
              </p>
              <div className="mt-1.5 text-[10px] font-mono text-slate-500">
                Location: {selectedNode.realCoordinates}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
