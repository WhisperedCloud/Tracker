import React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef(({ className, label, error, children, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors disabled:opacity-50',
          error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
