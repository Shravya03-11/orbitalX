/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Cinematic Mission Boot-up Sequence
 * Reliable, non-blocking 1.2-second initialization with fail-safe auto-complete.
 */

import React, { useEffect, useState, useRef } from 'react';

interface BootupSequenceProps {
  onComplete: () => void;
}

export const BootupSequence: React.FC<BootupSequenceProps> = ({ onComplete }) => {
  const [bootStep, setBootStep] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const onCompleteRef = useRef(onComplete);

  // Keep ref updated with latest callback without re-triggering effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Stepped progression
    const t1 = setTimeout(() => setBootStep(1), 200);
    const t2 = setTimeout(() => setBootStep(2), 450);
    const t3 = setTimeout(() => setBootStep(3), 750);
    const t4 = setTimeout(() => {
      setIsFading(true);
    }, 1000);
    const t5 = setTimeout(() => {
      onCompleteRef.current();
    }, 1250);

    // Hard fail-safe timeout: never allow loading screen to block past 1.8 seconds
    const safetyTimer = setTimeout(() => {
      onCompleteRef.current();
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(safetyTimer);
    };
  }, []); // Run ONCE on mount

  const handleSkip = () => {
    setIsFading(true);
    setTimeout(() => {
      onCompleteRef.current();
    }, 100);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 transition-opacity duration-300 pointer-events-auto ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-md hud-glass p-6 rounded-2xl relative shadow-[0_0_50px_rgba(6,182,212,0.3)]">
        <span className="corner-bracket-tl border-cyan-300" />
        <span className="corner-bracket-tr border-cyan-300" />
        <span className="corner-bracket-bl border-cyan-300" />
        <span className="corner-bracket-br border-cyan-300" />

        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/50">
              <svg className="w-4 h-4 animate-spin text-cyan-300" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            </div>
            <div>
              <div className="font-display font-bold text-sm text-white tracking-widest">
                ORBITAL <span className="text-cyan-400">X</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">DEEP-SPACE OBSERVATION SUITE</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="px-2.5 py-1 rounded bg-slate-900/80 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/60 text-[10px] font-mono text-slate-400 hover:text-cyan-300 transition cursor-pointer"
          >
            SKIP →
          </button>
        </div>

        {/* Boot Logs */}
        <div className="space-y-2 text-xs font-mono">
          <div className={`flex items-center gap-2 ${bootStep >= 0 ? 'text-slate-300' : 'opacity-20'}`}>
            <span className="text-cyan-400 font-bold">[ OK ]</span>
            <span>MOUNTING 3D HELIOCENTRIC CELESTIAL CANVAS</span>
          </div>

          <div className={`flex items-center gap-2 ${bootStep >= 1 ? 'text-slate-300' : 'opacity-20'}`}>
            <span className="text-cyan-400 font-bold">[ OK ]</span>
            <span>INITIALIZING 4-NODE AUTONOMOUS RELAY MESH</span>
          </div>

          <div className={`flex items-center gap-2 ${bootStep >= 2 ? 'text-slate-300' : 'opacity-20'}`}>
            <span className="text-cyan-400 font-bold">[ OK ]</span>
            <span>DIJKSTRA GRAPH SOLVER READY (0 PRE-BUILT MODELS)</span>
          </div>

          <div className={`flex items-center gap-2 ${bootStep >= 3 ? 'text-emerald-300 font-bold' : 'opacity-20'}`}>
            <span className="text-emerald-400 font-bold">[ READY ]</span>
            <span>ORBITAL X COMMAND READY // ENGAGING OBSERVATION WINDOW</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex-1 bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${Math.min(100, (bootStep / 3) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {bootStep >= 3 ? '100%' : `${Math.round((bootStep / 3) * 100)}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
