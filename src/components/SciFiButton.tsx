/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORBITAL X — Futuristic Physical Control Buttons
 * Features luminous travelling light streak, ambient glow, corner brackets,
 * hover energy pulse, and click ripple feedback.
 */

import React, { useState } from 'react';

interface SciFiButtonProps {
  label: string;
  sublabel?: string;
  variant?: 'primary' | 'danger' | 'success' | 'secondary';
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  className?: string;
}

export const SciFiButton: React.FC<SciFiButtonProps> = ({
  label,
  sublabel,
  variant = 'primary',
  icon,
  onClick,
  disabled = false,
  isLoading = false,
  loadingLabel = 'PROCESSING...',
  className = '',
}) => {
  const [isRippling, setIsRippling] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    setIsRippling(true);
    setTimeout(() => setIsRippling(false), 450);
    onClick();
  };

  // Variant themes
  let baseStyle = 'scifi-btn-primary animate-pulse-glow text-cyan-100';
  let borderStreak = 'from-transparent via-cyan-300 to-transparent';
  let bracketColor = 'border-cyan-400';

  if (variant === 'danger') {
    baseStyle = 'scifi-btn-danger animate-pulse-red-glow text-red-100';
    borderStreak = 'from-transparent via-red-300 to-transparent';
    bracketColor = 'border-red-400';
  } else if (variant === 'success') {
    baseStyle = 'bg-emerald-950/40 border border-emerald-500/60 hover:border-emerald-400 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.3)] hover:shadow-[0_0_26px_rgba(16,185,129,0.55)]';
    borderStreak = 'from-transparent via-emerald-300 to-transparent';
    bracketColor = 'border-emerald-400';
  } else if (variant === 'secondary') {
    baseStyle = 'bg-slate-900/60 border border-slate-700/80 hover:border-cyan-500/60 text-slate-300 hover:text-white shadow-[0_0_12px_rgba(0,0,0,0.5)]';
    borderStreak = 'from-transparent via-cyan-400/40 to-transparent';
    bracketColor = 'border-slate-500';
  }

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={handleClick}
      className={`group relative select-none rounded-lg py-2.5 px-4 font-mono text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 ${baseStyle} ${
        disabled ? 'opacity-40 cursor-not-allowed hover:transform-none hover:shadow-none' : ''
      } ${className}`}
    >
      {/* Sci-Fi Corner Brackets */}
      <span className={`corner-bracket-tl ${bracketColor}`} />
      <span className={`corner-bracket-tr ${bracketColor}`} />
      <span className={`corner-bracket-bl ${bracketColor}`} />
      <span className={`corner-bracket-br ${bracketColor}`} />

      {/* Traveling Luminous Light Streak on Border */}
      {!disabled && !isLoading && (
        <div
          className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${borderStreak} animate-light-streak pointer-events-none opacity-80`}
        />
      )}

      {/* Click Ripple Expanding Circle */}
      {isRippling && (
        <span className="absolute inset-0 rounded-lg bg-white/20 animate-ping pointer-events-none" />
      )}

      {/* Loading Scanning Reticle or Icon */}
      {isLoading ? (
        <svg className="w-4 h-4 animate-spin text-cyan-300 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      ) : icon ? (
        <span className="shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6">
          {icon}
        </span>
      ) : null}

      {/* Text Label & Sublabel */}
      <div className="flex flex-col items-start text-left">
        <span className="font-bold tracking-widest text-shadow">
          {isLoading ? loadingLabel : label}
        </span>
        {sublabel && (
          <span className="text-[9px] opacity-70 tracking-normal font-sans lowercase">
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
};
