import React, { useState } from 'react';
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
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Select } from '@/components/ui/Select';
import {
  Plus, FolderKanban, ArrowRight, Filter, GripVertical, ChevronUp, ChevronDown, Pencil, ArrowUpDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { SubjectStatusSelect, SubjectPrioritySelect, StopPropagation } from '@/components/projects/SubjectControls';
import { useData } from '@/context/DataContext';
import { formatDate, cn } from '@/lib/utils';
import { SUBJECT_SORTS, SUBJECT_STATUSES, sortSubjects, mergeVisibleOrder } from '@/lib/subjects';

export function ProjectsList({ onSelectProject, onOpenCreateProject, onEditProject }) {
  const {
    projects, teams, getProjectProgress, getProjectWorkItems, memberTeams, subjectOrder, saveSubjectOrder, canManageProject,
  } = useData();
  // Any member of a group can add subjects to it.
  const canCreateProjects = memberTeams.length > 0;

  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('custom'); // Custom Order is the default view

  // `projects` already comes in this person's custom order.
  const sorted = sortSubjects(projects, sortBy, subjectOrder);
  const filteredProjects = sorted.filter((p) => {
    if (teamFilter !== 'all' && p.team_id !== teamFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });
  const canReorder = sortBy === 'custom' && filteredProjects.length > 1;

  const sensors = useSensors(
    // A small movement threshold keeps ordinary clicks working.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // On phones, press and hold the handle to start dragging.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Reorder the visible subjects, keep hidden ones where they were, save.
  const saveVisibleOrder = (newVisibleIds) => {
    const fullOrder = projects.map(p => p.id);
    saveSubjectOrder(mergeVisibleOrder(fullOrder, newVisibleIds));
  };

  const visibleIds = filteredProjects.map(p => p.id);

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = visibleIds.indexOf(active.id);
    const to = visibleIds.indexOf(over.id);
    saveVisibleOrder(arrayMove(visibleIds, from, to));
  };

  const moveBy = (id, delta) => {
    const from = visibleIds.indexOf(id);
    const to = from + delta;
    if (to < 0 || to >= visibleIds.length) return;
    saveVisibleOrder(arrayMove(visibleIds, from, to));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Subjects
            <Badge variant="primary">{projects.length}</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Courses, exams and assignments your groups are working on. Status and progress update from the tasks.
          </p>
        </div>

        {canCreateProjects && (
          <Button onClick={onOpenCreateProject} className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" />
            Add Subject
          </Button>
        )}
      </div>

      {/* Filter and sort bar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <Filter className="w-4 h-4" /> Filters:
        </div>

        <Select size="sm" aria-label="Filter by study group"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="w-auto min-w-[8.5rem]"
        >
          <option value="all">All Study Groups</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>

        <Select size="sm" aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-auto min-w-[8.5rem]"
        >
          <option value="all">All Statuses</option>
          {SUBJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 sm:ml-auto">
          <ArrowUpDown className="w-4 h-4" /> Sort:
        </div>
        <Select size="sm" aria-label="Sort subjects"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-auto min-w-[11rem]"
        >
          {SUBJECT_SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      {projects.length > 1 && (
        <p className="text-[11px] text-slate-500 -mt-3">
          {sortBy === 'custom'
            ? 'Drag a subject by its handle, or use the arrows, to set your own study order. It is saved to your account.'
            : 'Switch to Custom Order to rearrange subjects by hand.'}
        </p>
      )}

      {/* Subjects grid */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderKanban className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {projects.length === 0 ? 'No subjects yet' : 'No subjects match these filters'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {projects.length > 0
              ? 'Try another study group or status.'
              : canCreateProjects
                ? 'Add a subject (a course, exam or assignment) and break it into study tasks.'
                : 'Your groups have no subjects yet.'}
          </p>
          {canCreateProjects && projects.length === 0 && (
            <Button onClick={onOpenCreateProject} className="mt-4 gap-1.5 text-xs shadow-sm">
              <Plus className="w-4 h-4" />
              Add First Subject
            </Button>
          )}
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleIds} strategy={rectSortingStrategy} disabled={!canReorder}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((proj, i) => (
                <SortableSubjectCard
                  key={proj.id}
                  project={proj}
                  index={i}
                  total={filteredProjects.length}
                  canReorder={canReorder}
                  team={teams.find(t => t.id === proj.team_id)}
                  progress={getProjectProgress(proj.id)}
                  workItems={getProjectWorkItems(proj.id)}
                  canEdit={canManageProject(proj)}
                  onOpen={() => onSelectProject(proj.id)}
                  onEdit={onEditProject ? () => onEditProject(proj.id) : null}
                  onMoveUp={() => moveBy(proj.id, -1)}
                  onMoveDown={() => moveBy(proj.id, 1)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableSubjectCard({
  project: proj, index, total, canReorder, team, progress, workItems, canEdit, onOpen, onEdit, onMoveUp, onMoveDown,
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: proj.id,
    disabled: !canReorder,
  });
  const completed = workItems.filter(t => t.status === 'Completed').length;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-20 opacity-90')}
    >
      <Card
        index={index}
        animate={!isDragging}
        onClick={onOpen}
        className={cn('flex flex-col group h-full', isDragging && 'shadow-xl ring-2 ring-primary-400')}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
          <div className="flex items-start gap-1.5 min-w-0">
            {canReorder && (
              <StopPropagation className="flex flex-col items-center -ml-2 shrink-0">
                <button
                  type="button"
                  ref={setActivatorNodeRef}
                  {...attributes}
                  {...listeners}
                  aria-label={`Drag to reorder ${proj.name}`}
                  title="Drag to reorder"
                  className="p-1 rounded-md text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-grab active:cursor-grabbing touch-none"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
              </StopPropagation>
            )}
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                {team?.name || 'Study Group'}
              </span>
              <CardTitle className="text-base group-hover:text-primary-600 transition-colors mt-0.5 break-words">
                {proj.name}
              </CardTitle>
            </div>
          </div>
          <SubjectStatusSelect project={proj} />
        </CardHeader>

        <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {proj.description || 'Study tasks and progress for this subject.'}
          </p>

          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Calculated Progress</span>
              <span className="text-primary-600 dark:text-primary-400">{progress}%</span>
            </div>
            <Progress value={progress} />
            <div className="flex justify-between text-[10px] text-slate-400 pt-1">
              <span>{completed} of {workItems.length} tasks done</span>
              <span>Due {formatDate(proj.due_date)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <SubjectPrioritySelect project={proj} />
            <div className="flex items-center gap-1">
              {canReorder && (
                <StopPropagation className="flex items-center">
                  <button
                    type="button"
                    onClick={onMoveUp}
                    disabled={index === 0}
                    aria-label={`Move ${proj.name} up`}
                    title="Move up"
                    className="p-1 rounded-md text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onMoveDown}
                    disabled={index === total - 1}
                    aria-label={`Move ${proj.name} down`}
                    title="Move down"
                    className="p-1 rounded-md text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </StopPropagation>
              )}
              {canEdit && onEdit && (
                <StopPropagation>
                  <button
                    type="button"
                    onClick={onEdit}
                    aria-label={`Edit ${proj.name}`}
                    title="Edit subject"
                    className="p-1 rounded-md text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </StopPropagation>
              )}
              <span className="font-semibold text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 ml-1">
                Open <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
