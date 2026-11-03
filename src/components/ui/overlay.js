import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Layer stack: every open modal, dropdown or date picker registers here so
// Escape only closes the top-most one (e.g. a dropdown inside a modal).
// ---------------------------------------------------------------------------
const layers = [];

function handleGlobalKeyDown(event) {
  if (event.key !== 'Escape' || layers.length === 0) return;
  const top = layers[layers.length - 1];
  event.preventDefault();
  event.stopPropagation();
  top.onEscape?.();
}

/** Closes the top-most open overlay, as Escape would. Returns false when none is open. */
export function closeTopLayer() {
  if (layers.length === 0) return false;
  layers[layers.length - 1].onEscape?.();
  return true;
}

export function useLayer(active, onEscape) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  // Layout effect: the layer exists before the first paint, so Escape works
  // from the very first frame the overlay is visible.
  useLayoutEffect(() => {
    if (!active) return undefined;
    const layer = { onEscape: () => onEscapeRef.current?.() };
    if (layers.length === 0) window.addEventListener('keydown', handleGlobalKeyDown, true);
    layers.push(layer);
    return () => {
      const index = layers.indexOf(layer);
      if (index !== -1) layers.splice(index, 1);
      if (layers.length === 0) window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [active]);
}

// ---------------------------------------------------------------------------
// Scroll lock that survives nested modals.
// ---------------------------------------------------------------------------
let scrollLocks = 0;

export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    scrollLocks += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = '';
    };
  }, [active]);
}

// ---------------------------------------------------------------------------
// Click outside: closes a popover when the pointer goes down anywhere except
// the given elements.
// ---------------------------------------------------------------------------
export function useClickOutside(active, refs, onOutside) {
  const handlerRef = useRef(onOutside);
  handlerRef.current = onOutside;

  useEffect(() => {
    if (!active) return undefined;
    const handle = (event) => {
      const inside = refs.some(ref => ref.current && ref.current.contains(event.target));
      if (!inside) handlerRef.current?.(event);
    };
    document.addEventListener('pointerdown', handle, true);
    return () => document.removeEventListener('pointerdown', handle, true);
    // (refs are stable, so they are not dependencies)
  }, [active]);
}

// ---------------------------------------------------------------------------
// Popover positioning: places a floating panel under its trigger (or above it
// when there is no room), keeps it inside the viewport and follows scrolling.
// The panel is rendered in a portal with position: fixed, so it is never
// clipped by a modal's scroll area.
// ---------------------------------------------------------------------------
const GAP = 6;
const VIEWPORT_MARGIN = 8;

export function usePopoverPosition(open, triggerRef, panelRef, { minWidth = 0, matchWidth = true, align = 'start' } = {}) {
  const [style, setStyle] = useState({ position: 'fixed', top: -9999, left: -9999, visibility: 'hidden' });
  const [placement, setPlacement] = useState('bottom');

  const update = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const rect = trigger.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const width = matchWidth ? Math.max(rect.width, minWidth) : Math.max(panel.offsetWidth, minWidth);
    const panelH = panel.scrollHeight;

    const spaceBelow = viewportH - rect.bottom - GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;
    const placeAbove = panelH > spaceBelow && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, placeAbove ? spaceAbove : spaceBelow);

    setPlacement(placeAbove ? 'top' : 'bottom');
    let left = align === 'end' ? rect.right - width : rect.left;
    left = Math.min(Math.max(VIEWPORT_MARGIN, left), viewportW - width - VIEWPORT_MARGIN);

    setStyle({
      position: 'fixed',
      left,
      width: matchWidth ? width : undefined,
      minWidth: matchWidth ? undefined : minWidth || undefined,
      maxHeight,
      ...(placeAbove
        ? { bottom: viewportH - rect.top + GAP, top: 'auto' }
        : { top: rect.bottom + GAP, bottom: 'auto' }),
      visibility: 'visible',
    });
  }, [triggerRef, panelRef, minWidth, matchWidth, align]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    update();
    let frame = null;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        update();
      });
    };
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [open, update]);

  return { style, update, placement };
}

let idCounter = 0;
export function useStableId(prefix = 'ts') {
  const ref = useRef(null);
  if (ref.current === null) {
    idCounter += 1;
    ref.current = `${prefix}-${idCounter}`;
  }
  return ref.current;
}
