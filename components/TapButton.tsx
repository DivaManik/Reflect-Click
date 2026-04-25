'use client';

import { useEffect, useRef } from 'react';

interface TapButtonProps {
  onTap: () => void;
  disabled?: boolean;
  tapped?: boolean;
  reactionMs?: number;
}

export function TapButton({ onTap, disabled, tapped, reactionMs }: TapButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Whole-screen tap handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled || tapped) return;

    const handler = () => onTap();
    el.addEventListener('touchstart', handler, { passive: true });
    el.addEventListener('mousedown', handler);
    return () => {
      el.removeEventListener('touchstart', handler);
      el.removeEventListener('mousedown', handler);
    };
  }, [disabled, tapped, onTap]);

  return (
    <div
      ref={containerRef}
      className="flex flex-1 flex-col items-center justify-center select-none"
      style={{ touchAction: 'none' }}
    >
      {!tapped ? (
        <>
          {/* Ripple rings */}
          <div className="relative flex items-center justify-center">
            <div className="absolute h-64 w-64 rounded-full border-2 border-white/20 animate-ripple" />
            <div
              className="absolute h-64 w-64 rounded-full border-2 border-white/20 animate-ripple"
              style={{ animationDelay: '0.6s' }}
            />
            {/* Main circle */}
            <div className="relative flex h-56 w-56 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-transform active:scale-95">
              <span className="text-7xl font-black uppercase tracking-tight text-white">
                TAP
              </span>
            </div>
          </div>
          <p className="mt-8 text-sm font-medium text-white/60">
            Tap anywhere or press the button
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 animate-pop-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" strokeWidth={3}>
              <polyline points="20 6 9 17 4 12" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {reactionMs !== undefined && (
            <p className="text-5xl font-black text-white">
              {reactionMs.toLocaleString()}
              <span className="ml-1 text-2xl font-bold text-white/70">ms</span>
            </p>
          )}
          <p className="text-sm font-medium text-white/60">
            Tap submitted — waiting for others
          </p>
        </div>
      )}
    </div>
  );
}
