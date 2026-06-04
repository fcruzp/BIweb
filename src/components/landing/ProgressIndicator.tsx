'use client';

import React from 'react';

interface ProgressIndicatorProps {
  scrollProgress: number;
}

export function ProgressIndicator({ scrollProgress }: ProgressIndicatorProps) {
  const percentage = Math.min(Math.max(scrollProgress * 100, 0), 100);
  return (
    <div className="fixed top-0 left-0 w-full h-[3px] bg-slate-900/40 z-[100] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 shadow-[0_0_12px_rgba(100,210,255,0.7)]"
        style={{ width: `${percentage}%`, transition: 'width 0.05s ease-out' }}
      />
    </div>
  );
}
