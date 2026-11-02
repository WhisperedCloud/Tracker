import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClickOutside, useLayer, usePopoverPosition, useStableId } from './overlay';

// Reads <option> / <optgroup> children (the same markup a native <select>
// takes) into a flat list, so existing forms switch over without rewrites.
function collectOptions(children, group = null, out = []) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) {
      collectOptions(child.props.children, group, out);
    } else if (child.type === 'optgroup') {
      collectOptions(child.props.children, child.props.label, out);
    } else if (child.type === 'option') {
      const label = child.props.children;
      const rawValue = child.props.value ?? (typeof label === 'string' ? label : '');
      out.push({
        value: String(rawValue),
        label,
        text: typeof label === 'string' ? label : React.Children.toArray(label).join(''),
        disabled: Boolean(child.props.disabled),
        group,
      });
    }
  });
  return out;
}

const sizes = {
  sm: 'h-8 pl-2.5 pr-2 text-xs rounded-lg',
  md: 'h-10 pl-3.5 pr-2.5 text-sm rounded-lg',
};

export const Select = React.forwardRef(function Select(
  {
    label,
    error,
    helperText,
    value: valueProp,
    defaultValue,
    onChange,
    children,
    placeholder = 'Select...',
    disabled = false,
    size = 'md',
    className,
    wrapperClassName,
    name,
    id,
    'aria-label': ariaLabel,
  },
  forwardedRef
) {
  const options = useMemo(() => collectOptions(children), [children]);
  const isControlled = valueProp !== undefined;
  const [innerValue, setInnerValue] = useState(defaultValue ?? options.find(o => !o.disabled)?.value ?? '');
  const value = String(isControlled ? valueProp ?? '' : innerValue);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const typeahead = useRef({ text: '', timer: null });

  const baseId = useStableId('select');
  const buttonId = id || `${baseId}-button`;
  const labelId = `${baseId}-label`;
  const listId = `${baseId}-list`;
  const optionId = (index) => `${baseId}-opt-${index}`;

  const selectedIndex = options.findIndex(o => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const { style, placement } = usePopoverPosition(open, triggerRef, panelRef, { minWidth: 176 });

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

  const enabledIndexes = options.map((o, i) => (o.disabled ? -1 : i)).filter(i => i !== -1);

  const openList = (startIndex) => {
    if (disabled || options.length === 0) return;
    setOpen(true);
    setActiveIndex(startIndex ?? (selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : enabledIndexes[0] ?? -1));
  };

  const commit = (index) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (!isControlled) setInnerValue(option.value);
    if (option.value !== value) {
      onChange?.({ target: { value: option.value, name }, currentTarget: { value: option.value, name } });
    }
    close();
  };

  const move = (delta) => {
    if (enabledIndexes.length === 0) return;
    const position = enabledIndexes.indexOf(activeIndex);
    const next = position === -1
      ? enabledIndexes[delta > 0 ? 0 : enabledIndexes.length - 1]
      : enabledIndexes[Math.min(Math.max(position + delta, 0), enabledIndexes.length - 1)];
    setActiveIndex(next);
  };

  // Type a few letters to jump to the matching option.
  const handleTypeahead = (key) => {
    const state = typeahead.current;
    clearTimeout(state.timer);
    state.text += key.toLowerCase();
    state.timer = setTimeout(() => { state.text = ''; }, 600);
    const match = enabledIndexes.find(i => options[i].text.toLowerCase().startsWith(state.text));
    if (match === undefined) return;
    if (open) setActiveIndex(match);
    else commit(match);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openList();
        else move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openList();
        else move(-1);
        break;
      case 'Home':
        if (open) {
          event.preventDefault();
          setActiveIndex(enabledIndexes[0] ?? -1);
        }
        break;
      case 'End':
        if (open) {
          event.preventDefault();
          setActiveIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open && activeIndex >= 0) commit(activeIndex);
        else if (!open) openList();
        break;
      case 'Tab':
        if (open) close(false);
        break;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          handleTypeahead(event.key);
        }
    }
  };

  // Keep the highlighted option visible while moving with the keyboard.
  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const node = listRef.current.querySelector(`#${CSS.escape(optionId(activeIndex))}`);
    node?.scrollIntoView({ block: 'nearest' });
    // optionId only depends on a stable id, so it is not a dependency.
  }, [open, activeIndex]);

  let lastGroup = null;

  return (
    // Labelled form fields take the full width; bare dropdowns (filters,
    // inline status pickers) size to their content so they can sit in a row.
    <div className={cn(label || /\bw-full\b/.test(className || '') ? 'w-full' : 'inline-block', wrapperClassName)}>
      {label && (
        <label
          id={labelId}
          htmlFor={buttonId}
          className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}

      <button
        ref={setRefs}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={label ? `${labelId} ${buttonId}` : undefined}
        aria-label={!label ? ariaLabel : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleKeyDown}
        className={cn(
          'group w-full inline-flex items-center justify-between gap-2 border bg-white dark:bg-slate-900 text-left font-medium',
          'text-slate-800 dark:text-slate-100 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/25 focus-visible:border-primary-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          open
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'border-slate-300/80 dark:border-slate-700 hover:border-primary-400 dark:hover:border-slate-500',
          error && 'border-rose-500',
          sizes[size] || sizes.md,
          className
        )}
      >
        <span className={cn('truncate', !selected && 'text-slate-400 font-normal')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'shrink-0 text-slate-400 transition-transform duration-150 group-hover:text-primary-600',
            size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4',
            open && 'rotate-180 text-primary-600'
          )}
        />
      </button>

      {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ ...style, maxHeight: typeof style.maxHeight === 'number' ? Math.min(style.maxHeight, 288) : 288 }}
          className={cn('z-[80] flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-900 shadow-popover overflow-hidden', placement === 'top' ? 'origin-bottom animate-drop-up' : 'origin-top animate-drop-down')}
        >
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={label ? labelId : undefined}
            aria-label={!label ? ariaLabel : undefined}
            className="overflow-y-auto overscroll-contain p-1.5 min-h-0"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              const header = option.group && option.group !== lastGroup ? option.group : null;
              lastGroup = option.group;
              return (
                <React.Fragment key={`${option.value}-${index}`}>
                  {header && (
                    <li role="presentation" className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {header}
                    </li>
                  )}
                  <li
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                    onClick={() => commit(index)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 cursor-pointer select-none transition-colors duration-100',
                      size === 'sm' ? 'text-xs' : 'text-sm',
                      option.disabled && 'opacity-45 cursor-not-allowed',
                      isActive && !option.disabled && 'bg-slate-100 dark:bg-slate-800',
                      isSelected ? 'font-semibold text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check aria-hidden="true" className="w-4 h-4 shrink-0 text-primary-600 dark:text-primary-400" />}
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
});
