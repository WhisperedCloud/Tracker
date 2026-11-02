import React from 'react';
import { cn } from '@/lib/utils';

// Base surface. Cards rise in gently when they appear; pass `index` to stagger
// a row of cards, or `animate={false}` for cards that re-render often.
// Clickable cards (onClick or `interactive`) lift on hover and warm their border.
export function Card({ className, children, index = 0, animate = true, interactive, onClick, style, ...props }) {
  const isInteractive = interactive ?? Boolean(onClick);
  return (
    <div
      className={cn(
        'relative bg-surface dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        animate && 'animate-rise',
        isInteractive && [
          'group/card cursor-pointer overflow-hidden',
          'hover:-translate-y-0.5 hover:shadow-md hover:border-primary-300/70 dark:hover:border-primary-800',
          'focus-visible:-translate-y-0.5 focus-visible:shadow-md',
        ],
        className
      )}
      style={animate && index ? { animationDelay: `${Math.min(index, 8) * 60}ms`, ...style } : style}
      onClick={onClick}
      tabIndex={isInteractive && onClick ? 0 : undefined}
      onKeyDown={isInteractive && onClick ? (e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('p-5 border-b border-slate-200/70 dark:border-slate-800/80', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-sm text-slate-500 dark:text-slate-400 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('p-5 border-t border-slate-200/70 dark:border-slate-800/80 mt-auto', className)} {...props}>
      {children}
    </div>
  );
}
