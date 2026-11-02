import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLayer, useScrollLock, useStableId } from './overlay';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  footer,
  children,
  size = 'md',
  className,
  bodyClassName,
  closeOnBackdrop = true,
}) {
  const dialogRef = useRef(null);
  const titleId = useStableId('modal-title');
  const descriptionId = useStableId('modal-desc');

  useLayer(isOpen, onClose);
  useScrollLock(isOpen);

  // Exit animation as a small state machine: 'open' -> 'closing' -> 'closed'.
  // Each step reacts to the current phase, so nothing depends on a value
  // captured by an earlier render. While closing, the last content is shown
  // (callers often clear their data as soon as the modal closes).
  const EXIT_MS = 160;
  const [phase, setPhase] = useState(isOpen ? 'open' : 'closed');
  const lastContent = useRef(null);
  if (isOpen) lastContent.current = { title, description, icon, footer, children };

  useLayoutEffect(() => {
    if (isOpen) setPhase('open');
    else setPhase(prev => (prev === 'open' ? 'closing' : prev));
  }, [isOpen]);

  useEffect(() => {
    if (phase !== 'closing') return undefined;
    // Fallback in case the animationend event does not fire (e.g. reduced motion).
    const timer = setTimeout(() => setPhase(prev => (prev === 'closing' ? 'closed' : prev)), EXIT_MS + 120);
    return () => clearTimeout(timer);
  }, [phase]);

  const closing = !isOpen && phase === 'closing';
  const finishExit = (event) => {
    if (closing && event.target === event.currentTarget) setPhase('closed');
  };

  // Move focus into the dialog when it opens and give it back when it closes.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      // If the person already clicked into a field, leave their focus alone;
      // otherwise a late frame would pull them back to the first field mid-typing.
      if (dialog.contains(document.activeElement) && document.activeElement !== dialog) return;
      const preferred = dialog.querySelector('[data-autofocus]');
      const firstField = dialog.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled])');
      (preferred || firstField || dialog).focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  // Keep Tab inside the dialog.
  const handleKeyDown = (event) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE))
      .filter(el => el.offsetParent !== null || el === document.activeElement);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!isOpen && phase === 'closed') return null;
  const content = isOpen ? { title, description, icon, footer, children } : lastContent.current || {};
  const hasHeader = Boolean(content.title || content.description);

  return createPortal(
    <div className={cn('fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto', closing && 'pointer-events-none')}>
      <div
        className={cn('fixed inset-0 bg-slate-950/45 backdrop-blur-[2px]', closing ? 'animate-fade-out' : 'animate-fade-in')}
        onClick={closeOnBackdrop && !closing ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={content.title ? titleId : undefined}
        aria-describedby={content.description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onAnimationEnd={finishExit}
        className={cn(
          'relative w-full my-8 bg-surface dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden focus:outline-none',
          closing ? 'animate-dialog-out' : 'animate-dialog-in',
          sizeClasses[size],
          className
        )}
      >
        {hasHeader ? (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-200/70 dark:border-slate-800">
            <div className="flex items-start gap-3 min-w-0">
              {content.icon && (
                <div className="mt-0.5 shrink-0 w-10 h-10 rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 flex items-center justify-center animate-ring">
                  {content.icon}
                </div>
              )}
              <div className="min-w-0">
                {content.title && (
                  <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {content.title}
                  </h2>
                )}
                {content.description && (
                  <p id={descriptionId} className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {content.description}
                  </p>
                )}
              </div>
            </div>
            <CloseButton onClick={onClose} />
          </div>
        ) : (
          <div className="absolute top-3 right-3 z-10">
            <CloseButton onClick={onClose} />
          </div>
        )}

        <div className={cn('p-6 max-h-[calc(85vh-8rem)] overflow-y-auto', bodyClassName)}>
          {content.children}
        </div>

        {content.footer && (
          <div className="px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-wrap items-center justify-end gap-2">
            {content.footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  );
}
