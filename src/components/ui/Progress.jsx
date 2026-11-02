import React from 'react';
import { cn } from '@/lib/utils';

export function Progress({ value = 0, max = 100, className, barClassName, showLabel = false }) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const getBarColor = (pct) => {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-primary-600';
    if (pct >= 25) return 'bg-primary-400';
    return 'bg-amber-400';
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className="w-full bg-slate-200/70 dark:bg-slate-800 rounded-full h-2 overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full transition-all duration-500 ease-out rounded-full', getBarColor(percentage), barClassName)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-slate-500 mt-1 font-medium">
          <span>Progress</span>
          <span>{percentage}%</span>
        </div>
      )}
    </div>
  );
}
