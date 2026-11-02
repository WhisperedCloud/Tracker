import React from 'react';
import { cn } from '@/lib/utils';

// Logo assets live in /public/brand (generated from the supplied TaskSync logo).
//   BrandMark: compact calendar + team mark for small places (sidebar, loaders).
//   BrandLogo: full logo with the TaskSync wordmark (auth screens).
// The artwork is dark brown, so in dark mode it sits on a cream tile.

export function BrandMark({ size = 36, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center shrink-0 rounded-xl bg-surface dark:bg-cream border border-slate-200/80 dark:border-transparent',
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src="/brand/tasksync-mark-192.png"
        alt=""
        aria-hidden="true"
        width={Math.round(size * 0.82)}
        height={Math.round(size * 0.82)}
        draggable="false"
      />
    </span>
  );
}

export function BrandLogo({ className, imgClassName }) {
  return (
    <span className={cn('inline-flex items-center justify-center dark:bg-cream dark:rounded-2xl dark:px-5 dark:py-3', className)}>
      <img
        src="/brand/tasksync-logo.png"
        alt="TaskSync"
        className={cn('h-24 w-auto select-none', imgClassName)}
        draggable="false"
      />
    </span>
  );
}

// "Task" in dark brown, "Sync" in caramel, like the logo's wordmark.
export function BrandWordmark({ className }) {
  return (
    <span className={cn('font-extrabold tracking-tight', className)}>
      <span className="text-[#55301A] dark:text-cream">Task</span>
      <span className="text-primary-500 dark:text-primary-300">Sync</span>
    </span>
  );
}
