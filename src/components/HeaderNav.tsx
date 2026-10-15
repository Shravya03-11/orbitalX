/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Minimal Floating Navigation Bar
 * Features: MISSION CONTROL, ADAPTIVE NETWORK, EXOPLANET LAB, and MISSION REPORT.
 */

import React from 'react';
import { CommStatus, ScenarioType } from '../types/network';

export type NavSection = 'overview' | 'network' | 'exoplanet';

interface HeaderNavProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  commStatus: CommStatus;
  activeScenario: ScenarioType;
  onSelectScenario: (scenario: ScenarioType) => void;
  onResetView: () => void;
  onOpenReport: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeSection,
  onSelectSection,
  commStatus,
  activeScenario,
  onSelectScenario,
  onResetView,
  onOpenReport,
}) => {
  const navItems: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
    {
      id: 'overview',
      label: 'MISSION CONTROL',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'network',
      label: 'ADAPTIVE NETWORK',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'exoplanet',
      label: 'EXOPLANET LAB',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
  ];

  return (
    <header className="fixed top-3 inset-x-0 z-40 px-4 pointer-events-none flex justify-center">
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Left: Futuristic ORBITAL X Emblem */}
        <div className="pointer-events-auto hud-glass px-3 py-1.5 rounded-xl flex items-center gap-2.5 shadow-2xl">
          <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-900 flex items-center justify-center border border-cyan-300/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <span className="corner-bracket-tl border-cyan-200" />
            <span className="corner-bracket-br border-cyan-200" />
            <svg className="w-3.5 h-3.5 text-slate-950 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xs font-bold tracking-widest text-white drop-shadow">
                ORBITAL <span className="text-cyan-400">X</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/80">
                DEEP-SPACE
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <span>STATUS:</span>
              <span className={`font-bold ${
                commStatus === 'ONLINE'
                  ? 'text-emerald-400'
                  : commStatus === 'REROUTING'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}>
                {commStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Minimal Floating Glass Nav Bar */}
        <nav className="pointer-events-auto hud-glass p-1 rounded-xl flex items-center gap-1 shadow-2xl">
          {navItems.map(item => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/80 shadow-[0_0_14px_rgba(6,182,212,0.35)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                {isActive && (
                  <span className="absolute bottom-0 inset-x-2 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                )}
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Mission Report Button */}
          <button
            type="button"
            onClick={onOpenReport}
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-cyan-300 hover:bg-slate-800/40 transition cursor-pointer flex items-center gap-1.5 border border-transparent hover:border-cyan-500/40"
          >
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>REPORT</span>
          </button>
        </nav>

        {/* Right: Judge Benchmark Scenario Quick Switcher & Reset View */}
        <div className="pointer-events-auto hud-glass px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 hidden xl:inline">BENCHMARK:</span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Scenario 1: Direct link online"
              onClick={() => onSelectScenario('scenario-1-normal')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                activeScenario === 'scenario-1-normal'
                  ? 'bg-cyan-500 text-slate-950 font-bold border border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-cyan-300 bg-slate-900/60 border border-slate-800'
              }`}
            >
              1. Normal
            </button>

            <button
              type="button"
              title="Scenario 2: Asteroid disrupts direct link, Dijkstra reroutes"
              onClick={() => onSelectScenario('scenario-2-direct-blocked')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                activeScenario === 'scenario-2-direct-blocked'
                  ? 'bg-amber-500 text-slate-950 font-bold border border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-amber-300 bg-slate-900/60 border border-slate-800'
              }`}
            >
              2. Disrupted
            </button>

            <button
              type="button"
              title="Scenario 3: Severe debris clouds partition the network"
              onClick={() => onSelectScenario('scenario-3-disconnected')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                activeScenario === 'scenario-3-disconnected'
                  ? 'bg-red-500 text-slate-950 font-bold border border-red-300 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                  : 'text-slate-400 hover:text-red-300 bg-slate-900/60 border border-slate-800'
              }`}
            >
              3. Offline
            </button>
          </div>

          <div className="h-3.5 w-[1px] bg-slate-800 mx-0.5 hidden sm:block" />

          {/* Reset Camera View Button */}
          <button
            type="button"
            onClick={onResetView}
            title="Reset perspective camera to default framing"
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition cursor-pointer border border-slate-800"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
