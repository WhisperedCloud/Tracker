import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClickOutside, useLayer, usePopoverPosition, useStableId } from './overlay';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Values are plain "YYYY-MM-DD" strings, read and written as local dates.
const pad = (n) => String(n).padStart(2, '0');
const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromKey = (key) => {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const formatDisplay = (date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);

function buildMonthGrid(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export const DatePicker = React.forwardRef(function DatePicker(
  { label, value, onChange, min, max, placeholder = 'Pick a date', error, helperText, disabled, name, id, clearable = true, className },
  forwardedRef
) {
  const selected = fromKey(value);
  const minDate = fromKey(min);
  const maxDate = fromKey(max);
  const todayKey = toKey(new Date());

  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => selected || new Date());
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const baseId = useStableId('date');
  const buttonId = id || `${baseId}-button`;
  const labelId = `${baseId}-label`;

  const { style, placement } = usePopoverPosition(open, triggerRef, panelRef, { matchWidth: false, minWidth: 288 });

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus({ preventScroll: true });
  };
  useLayer(open, () => close());
  useClickOutside(open, [triggerRef, panelRef], () => close(false));

  const setRefs = (node) => {
    triggerRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const isOutOfRange = (date) =>
    (minDate && date < minDate) || (maxDate && date > maxDate);

  const emit = (nextValue) => {
    onChange?.({ target: { value: nextValue, name }, currentTarget: { value: nextValue, name } });
  };

  const pick = (date) => {
    if (isOutOfRange(date)) return;
    emit(toKey(date));
    close();
  };

  const openPicker = () => {
    if (disabled) return;
    setCursor(selected || (minDate && new Date() < minDate ? minDate : new Date()));
    setOpen(true);
  };

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const shiftMonth = (delta) => {
    const target = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    const daysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    setCursor(new Date(target.getFullYear(), target.getMonth(), Math.min(cursor.getDate(), daysInTarget)));
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openPicker();
      }
      return;
    }
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (moves[event.key]) {
      event.preventDefault();
      setCursor(addDays(cursor, moves[event.key]));
    } else if (event.key === 'PageUp') {
      event.preventDefault();
      shiftMonth(-1);
    } else if (event.key === 'PageDown') {
      event.preventDefault();
      shiftMonth(1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pick(cursor);
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label id={labelId} htmlFor={buttonId} className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={setRefs}
          id={buttonId}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={label ? `${labelId} ${buttonId}` : undefined}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          onClick={() => (open ? close() : openPicker())}
          onKeyDown={handleKeyDown}
          className={cn(
            'group w-full h-10 inline-flex items-center gap-2 pl-3.5 text-left text-sm rounded-lg border bg-white dark:bg-slate-900 transition-colors',
            clearable && selected ? 'pr-9' : 'pr-3',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/25 focus-visible:border-primary-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            open ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-slate-300/80 dark:border-slate-700 hover:border-primary-400',
            error && 'border-rose-500'
          )}
        >
          <CalendarDays aria-hidden="true" className={cn('w-4 h-4 shrink-0', open ? 'text-primary-600' : 'text-slate-400 group-hover:text-primary-600')} />
          <span className={cn('truncate', selected ? 'font-medium text-slate-800 dark:text-slate-100' : 'text-slate-400')}>
            {selected ? formatDisplay(selected) : placeholder}
          </span>
        </button>
        {clearable && selected && !disabled && (
          <button
            type="button"
            aria-label="Clear date"
            onClick={() => emit('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}

      {open && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label ? `Choose ${label.replace(/\*/g, '').trim().toLowerCase()}` : 'Choose a date'}
          style={style}
          className={cn('z-[80] w-72 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-900 shadow-popover overflow-auto', placement === 'top' ? 'origin-bottom animate-drop-up' : 'origin-top animate-drop-down')}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="p-1.5 rounded-lg text-slate-500 hover:text-primary-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100" aria-live="polite">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="p-1.5 rounded-lg text-slate-500 hover:text-primary-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1" aria-hidden="true">
            {WEEKDAYS.map(day => (
              <span key={day} className="h-7 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {day}
              </span>
            ))}
          </div>

          <div role="grid" className="grid grid-cols-7 gap-0.5">
            {grid.map((date) => {
              const key = toKey(date);
              const inMonth = date.getMonth() === cursor.getMonth();
              const isSelected = selected && key === toKey(selected);
              const isToday = key === todayKey;
              const isCursor = key === toKey(cursor);
              const outOfRange = isOutOfRange(date);
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected || undefined}
                  aria-label={formatDisplay(date)}
                  disabled={outOfRange}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(date)}
                  className={cn(
                    'h-9 rounded-lg text-xs font-medium transition-[background-color,transform] duration-150 active:scale-95',
                    inMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400/70',
                    !isSelected && !outOfRange && 'hover:bg-slate-100 dark:hover:bg-slate-800',
                    isCursor && !isSelected && 'ring-1 ring-inset ring-primary-400',
                    isToday && !isSelected && 'font-bold text-primary-700 dark:text-primary-300',
                    isSelected && 'bg-primary-600 text-white shadow-sm scale-105',
                    outOfRange && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))}
              disabled={isOutOfRange(fromKey(todayKey))}
              className="text-xs font-semibold text-primary-700 dark:text-primary-300 hover:underline disabled:opacity-40"
            >
              Today
            </button>
            {clearable && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { emit(''); close(); }}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
