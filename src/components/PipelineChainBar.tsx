/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — End-to-End Pipeline Chain Visualizer
 * Explicitly tracks and highlights the 7-step sequence:
 * ASTEROID DISRUPTION → LINK FAILURE → GRAPH RECOMPUTATION → ALTERNATE ROUTE → DATA DELIVERY → LIGHT-CURVE ANALYSIS → CANDIDATE REPORT
 */

import React from 'react';
import { CommStatus, TransitAnalysisResult } from '../types/network';

interface PipelineChainBarProps {
  hasDisruption: boolean;
  linkFailed: boolean;
  graphRecomputed: boolean;
  hasAlternateRoute: boolean;
  dataDelivered: boolean;
  analysisCompleted: boolean;
  candidateReport: TransitAnalysisResult | null;
  commStatus: CommStatus;
  currentStepIndex: number;
}

export const PipelineChainBar: React.FC<PipelineChainBarProps> = ({
  hasDisruption,
  linkFailed,
  graphRecomputed,
  hasAlternateRoute,
  dataDelivered,
  analysisCompleted,
  candidateReport,
  commStatus,
  currentStepIndex,
}) => {
  const steps = [
    {
      id: 1,
      title: 'Asteroid Disruption',
      sub: hasDisruption ? 'Debris occluding path' : 'Clear corridor',
      status: hasDisruption ? 'warning' : 'dormant',
    },
    {
      id: 2,
      title: 'Link Failure',
      sub: linkFailed ? 'Corridor severed' : 'Links nominal',
      status: linkFailed ? 'error' : 'nominal',
    },
    {
      id: 3,
      title: 'Graph Recomputation',
      sub: graphRecomputed ? 'Dijkstra evaluated' : 'Standby',
      status: graphRecomputed ? 'active' : 'dormant',
    },
    {
      id: 4,
      title: 'Alternate Route',
      sub: commStatus === 'OFFLINE' ? 'No path (Offline)' : hasAlternateRoute ? 'Relay path locked' : 'Direct path',
      status: commStatus === 'OFFLINE' ? 'error' : hasAlternateRoute ? 'success' : 'nominal',
    },
    {
      id: 5,
      title: 'Data Delivery',
      sub: dataDelivered ? 'Packet received (100%)' : commStatus === 'OFFLINE' ? 'Delivery paused' : 'Ingesting photons',
      status: dataDelivered ? 'success' : commStatus === 'OFFLINE' ? 'error' : 'active',
    },
    {
      id: 6,
      title: 'Light-Curve Analysis',
      sub: analysisCompleted ? 'Transit fit solved' : dataDelivered ? 'Ready to analyze' : 'Waiting on data',
      status: analysisCompleted ? 'success' : dataDelivered ? 'active' : 'dormant',
    },
    {
      id: 7,
      title: 'Candidate Report',
      sub: candidateReport ? `${candidateReport.habitableZoneStatus.split('/')[0]}` : 'Dossier pending',
      status: candidateReport ? 'success' : 'dormant',
    },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Autonomous Resilience Pipeline Chain
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          STEP {Math.min(7, currentStepIndex + 1)} OF 7
        </span>
      </div>

      {/* Horizontal Steps Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {steps.map((step, idx) => {
          const isCurrent = idx === currentStepIndex;

          let badgeColor = 'bg-slate-950 text-slate-400 border-slate-800';
          let textColor = 'text-slate-300';

          if (step.status === 'error') {
            badgeColor = 'bg-red-950/60 text-red-300 border-red-700/80 shadow-md shadow-red-950/40';
            textColor = 'text-red-300';
          } else if (step.status === 'warning') {
            badgeColor = 'bg-amber-950/60 text-amber-300 border-amber-700/80';
            textColor = 'text-amber-300';
          } else if (step.status === 'success') {
            badgeColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-700/80 shadow-md shadow-emerald-950/40';
            textColor = 'text-emerald-300';
          } else if (step.status === 'active') {
            badgeColor = 'bg-cyan-950/80 text-cyan-200 border-cyan-500 shadow-md shadow-cyan-950/40';
            textColor = 'text-cyan-200';
          }

          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-lg border transition-all duration-150 flex flex-col justify-between min-h-[70px] ${badgeColor} ${
                isCurrent ? 'ring-1 ring-cyan-400' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-mono opacity-60">0{step.id}</span>
                {step.status === 'success' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ) : step.status === 'error' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                ) : step.status === 'warning' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                )}
              </div>
              <div>
                <div className={`text-xs font-mono font-semibold leading-tight ${textColor}`}>
                  {step.title}
                </div>
                <div className="text-[10px] font-mono text-slate-400/80 leading-tight mt-0.5 truncate">
                  {step.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
