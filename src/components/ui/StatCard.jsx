import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Earthy tones for metric cards. Each tone sets the icon chip, the glow in the
// corner, the number colour and the progress line.
const tones = {
  brown: {
    chip: 'bg-primary-100 text-primary-700 dark:bg-primary-950/70 dark:text-primary-300',
    glow: 'from-primary-300/35',
    value: 'text-slate-900 dark:text-white',
    bar: 'bg-primary-600',
    ring: 'group-hover/stat:border-primary-300/80',
  },
  moss: {
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
    glow: 'from-emerald-300/40',
    value: 'text-emerald-700 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    ring: 'group-hover/stat:border-emerald-300/80',
  },
  teal: {
    chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300',
    glow: 'from-indigo-300/40',
    value: 'text-indigo-700 dark:text-indigo-300',
    bar: 'bg-indigo-500',
    ring: 'group-hover/stat:border-indigo-300/80',
  },
  terracotta: {
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
    glow: 'from-rose-300/40',
    value: 'text-rose-700 dark:text-rose-300',
    bar: 'bg-rose-500',
    ring: 'group-hover/stat:border-rose-300/80',
  },
  ochre: {
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
    glow: 'from-amber-300/40',
    value: 'text-amber-700 dark:text-amber-300',
    bar: 'bg-amber-500',
    ring: 'group-hover/stat:border-amber-300/80',
  },
  plum: {
    chip: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300',
    glow: 'from-purple-300/40',
    value: 'text-purple-700 dark:text-purple-300',
    bar: 'bg-purple-500',
    ring: 'group-hover/stat:border-purple-300/80',
  },
  neutral: {
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    glow: 'from-beige/40',
    value: 'text-slate-900 dark:text-white',
    bar: 'bg-slate-400',
    ring: 'group-hover/stat:border-slate-300',
  },
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Counts from the previous value to the new one with an ease-out curve.
export function useCountUp(target, duration = 700) {
  const [display, setDisplay] = useState(prefersReducedMotion() ? target : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (typeof target !== 'number' || Number.isNaN(target) || prefersReducedMotion()) {
      setDisplay(target);
      fromRef.current = target;
      return undefined;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (target - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = target;
    };
  }, [target, duration]);

  return display;
}

/**
 * Metric card: icon chip, label, animated number, hint and optional progress.
 *   <StatCard label="Group completion" value={72} suffix="%" tone="moss" icon={CheckCircle2} progress={72} />
 */
export function StatCard({ label, value, suffix = '', decimals = 0, hint, icon: Icon, tone = 'brown', progress, index = 0, className }) {
  const palette = tones[tone] || tones.brown;
  const numeric = typeof value === 'number';
  const animated = useCountUp(numeric ? value : 0);
  const shown = numeric ? animated.toFixed(decimals) : value;

  return (
    <div
      className={cn(
        'group/stat relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface dark:bg-slate-900',
        'p-4 sm:p-5 shadow-sm animate-rise',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md',
        palette.ring,
        className
      )}
      style={index ? { animationDelay: `${Math.min(index, 8) * 70}ms` } : undefined}
    >
      {/* Soft glow in the corner that blooms on hover */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-bl to-transparent blur-2xl',
          'transition-transform duration-500 ease-out group-hover/stat:scale-125',
          palette.glow
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</p>
          <p className={cn('mt-1.5 text-[1.7rem] leading-none font-bold tabular-nums tracking-tight', palette.value)}>
            {shown}
            {suffix && <span className="text-base font-semibold ml-0.5 opacity-80">{suffix}</span>}
          </p>
          {hint && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">{hint}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
              'transition-transform duration-300 ease-out group-hover/stat:-rotate-6 group-hover/stat:scale-110',
              palette.chip
            )}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>

      {typeof progress === 'number' && (
        <div className="relative mt-4 h-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden" aria-hidden="true">
          <div
            className={cn('h-full rounded-full origin-left animate-grow-x', palette.bar)}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%`, animationDelay: `${150 + Math.min(index, 8) * 70}ms` }}
          />
        </div>
      )}
    </div>
  );
}
