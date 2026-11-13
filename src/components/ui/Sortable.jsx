import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

// Shared drag-and-drop for every reorderable list (subjects, tasks, subtasks,
// personal tasks). Works with a mouse, touch (press and hold the handle) and
// the keyboard (focus the handle, Space, arrow keys, Space).

export function useReorderSensors() {
  return useSensors(
    // A small movement threshold keeps ordinary clicks working.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}

// New id list with `id` moved one place up (-1) or down (+1), or null at an end.
export function moveId(ids, id, delta) {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  return arrayMove(ids, from, to);
}

// The "Sort:" dropdown shown above a reorderable list.
export function SortSelect({ value, onChange, options, ariaLabel = 'Sort', className }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
        <ArrowUpDown className="w-4 h-4" /> Sort:
      </span>
      <Select size="sm" aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} className="w-auto min-w-[11rem]">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </span>
  );
}

// One reorderable list. `onReorder(newIds)` gets the full new order of `ids`.
export function SortableList({ ids, disabled, onReorder, grid = false, children }) {
  const sensors = useReorderSensors();
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };
  return (
    // Screen-reader helpers go to <body> so lists inside tables stay valid HTML.
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{ container: typeof document !== 'undefined' ? document.body : undefined }}
    >
      <SortableContext items={ids} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy} disabled={disabled}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

// A draggable item. `children(handle)` decides where the handle goes.
// `as` lets table rows (`tr`) be sortable too.
export function SortableItem({ id, group, disabled, as: Tag = 'div', className, children }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
    data: { group },
  });
  return (
    <Tag
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-20 opacity-90 shadow-lg', className)}
    >
      {children({ attributes, listeners, setActivatorNodeRef, isDragging })}
    </Tag>
  );
}

// Drag handle plus move up / move down buttons. Clicks here never open the row.
export function ReorderControls({ handle, name, onUp, onDown, isFirst, isLast, className }) {
  const stop = (e) => e.stopPropagation();
  const btn = 'p-0.5 rounded text-slate-400 hover:text-primary-600 hover:bg-slate-200/70 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none';
  return (
    <div className={cn('flex flex-col items-center shrink-0 -my-1', className)} onClick={stop} onPointerDown={stop}>
      <button type="button" onClick={onUp} disabled={isFirst} aria-label={`Move ${name} up`} title="Move up" className={btn}>
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        ref={handle.setActivatorNodeRef}
        {...handle.attributes}
        {...handle.listeners}
        aria-label={`Drag to reorder ${name}`}
        title="Drag to reorder"
        className={cn(btn, 'cursor-grab active:cursor-grabbing touch-none')}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onDown} disabled={isLast} aria-label={`Move ${name} down`} title="Move down" className={btn}>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// One-line hint under a sort control.
export function ReorderHint({ canReorder, what = 'items' }) {
  return (
    <p className="text-[11px] text-slate-500">
      {canReorder
        ? `Drag ${what} by the handle, or use the arrows, to set your own order. It is saved to your account.`
        : `Switch to Custom Order to rearrange ${what} by hand.`}
    </p>
  );
}
