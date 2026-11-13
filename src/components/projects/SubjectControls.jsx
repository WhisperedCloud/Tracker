import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { useData } from '@/context/DataContext';
import { SUBJECT_PRIORITIES, SUBJECT_STATUSES } from '@/lib/subjects';
import { getPriorityBadgeColor, getStatusBadgeColor, cn } from '@/lib/utils';

// Stops clicks inside the controls from opening the card they sit on. React
// events from the dropdown's portal bubble through here too. Key presses are
// left alone: the card only reacts to keys pressed on the card itself, and
// keyboard dragging needs arrow keys to reach the document.
export function StopPropagation({ children, className }) {
  const stop = (e) => e.stopPropagation();
  return (
    <div className={className} onClick={stop} onPointerDown={stop}>
      {children}
    </div>
  );
}

// Priority: an editable dropdown for people allowed to edit the subject,
// a badge for everyone else.
export function SubjectPrioritySelect({ project, className }) {
  const { canManageProject, updateProject } = useData();
  if (!canManageProject(project)) {
    return (
      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getPriorityBadgeColor(project.priority), className)}>
        {project.priority} Priority
      </span>
    );
  }
  return (
    <StopPropagation className={className}>
      <Select
        size="sm"
        aria-label={`Priority of ${project.name}`}
        value={project.priority}
        onChange={(e) => updateProject(project.id, { priority: e.target.value })}
        className={cn('w-auto min-w-[7.5rem] font-semibold', getPriorityBadgeColor(project.priority))}
      >
        {SUBJECT_PRIORITIES.map(p => <option key={p} value={p}>{p} Priority</option>)}
      </Select>
    </StopPropagation>
  );
}

// Status: follows the subject's tasks automatically. Picking a different
// status sets it by hand (for example On Hold) until it is reset.
export function SubjectStatusSelect({ project, className, showHint = true }) {
  const { canManageProject, setProjectStatus, resetProjectStatus } = useData();
  const isManual = Boolean(project.status_manual);
  const hint = isManual
    ? `Set by hand. Tasks would make it "${project.auto_status}".`
    : 'Automatic: follows the tasks';

  if (!canManageProject(project)) {
    return (
      <span
        title={hint}
        className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0', getStatusBadgeColor(project.status), className)}
      >
        {project.status}{isManual ? ' · manual' : ''}
      </span>
    );
  }

  // Older subjects may still carry a status that is no longer offered.
  const options = SUBJECT_STATUSES.includes(project.status) ? SUBJECT_STATUSES : [project.status, ...SUBJECT_STATUSES];

  return (
    <StopPropagation className={cn('flex flex-col items-end gap-1', className)}>
      <Select
        size="sm"
        aria-label={`Status of ${project.name}`}
        value={project.status}
        onChange={(e) => setProjectStatus(project.id, e.target.value)}
        className={cn('w-auto min-w-[8rem] font-semibold', getStatusBadgeColor(project.status))}
      >
        {options.map(s => (
          <option key={s} value={s} disabled={!SUBJECT_STATUSES.includes(s)}>
            {s}{s === project.auto_status ? ' (auto)' : ''}
          </option>
        ))}
      </Select>
      {showHint && (
        isManual ? (
          <button
            type="button"
            onClick={() => resetProjectStatus(project.id)}
            title={hint}
            className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Manual · use automatic ({project.auto_status})
          </button>
        ) : (
          <span className="text-[10px] text-slate-400">Automatic</span>
        )
      )}
    </StopPropagation>
  );
}
