import React from 'react';
import { cn } from '@/lib/utils';
import { DatePicker } from './DatePicker';

const fieldClasses =
  'w-full h-10 px-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700 rounded-lg ' +
  'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-colors ' +
  'hover:border-primary-400 dark:hover:border-slate-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ' +
  'disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:hover:border-slate-300/80';

export const inputBaseClasses = fieldClasses;

export const Input = React.forwardRef(({ className, type = 'text', label, error, helperText, id, ...props }, ref) => {
  // Date fields use the design-system date picker instead of the browser popup.
  if (type === 'date') {
    return (
      <DatePicker
        ref={ref}
        id={id}
        label={label}
        error={error}
        helperText={helperText}
        value={props.value}
        onChange={props.onChange}
        min={props.min}
        max={props.max}
        name={props.name}
        disabled={props.disabled}
        placeholder={props.placeholder}
        className={className}
      />
    );
  }

  const inputId = id || (label ? `input-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={cn(fieldClasses, error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20', className)}
        ref={ref}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export const Textarea = React.forwardRef(({ className, label, error, helperText, id, rows = 3, ...props }, ref) => {
  const fieldId = id || (label ? `textarea-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        ref={ref}
        rows={rows}
        className={cn(fieldClasses, 'h-auto py-2 leading-relaxed resize-y', error && 'border-rose-500', className)}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';
