import React from 'react';
import { cn } from '@/lib/utils';

const baseStyles =
  'inline-flex items-center justify-center font-medium rounded-lg transition-[background-color,border-color,color,transform] duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950 ' +
  'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

const variants = {
  default: 'bg-primary-600 hover:bg-primary-700 text-cream shadow-sm focus-visible:ring-primary-500',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 focus-visible:ring-slate-400',
  outline: 'border border-slate-300 dark:border-slate-700 bg-transparent hover:bg-slate-100 hover:border-primary-400 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus-visible:ring-slate-400',
  ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus-visible:ring-slate-400',
  destructive: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus-visible:ring-rose-500',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus-visible:ring-emerald-500',
};

const sizes = {
  sm: 'text-xs h-8 px-3 gap-1.5',
  md: 'text-sm h-10 px-4 gap-2',
  lg: 'text-base h-11 px-5 gap-2.5',
  icon: 'h-9 w-9 text-sm',
};

export function Button({ className, variant = 'default', size = 'md', disabled = false, children, ...props }) {
  return (
    <button
      className={cn(baseStyles, variants[variant] || variants.default, sizes[size] || sizes.md, className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
