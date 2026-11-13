import React, { useState } from 'react';
import { ListTodo, Hourglass, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertTriangle,
  List,
  Kanban,
  CalendarDays,
  Search,
  Filter,
  Trash2,
  Edit2,
  Tag,
  Bell,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { DndContext, closestCorners, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import {
  SortableList, SortableItem, ReorderControls, SortSelect, ReorderHint, moveId, useReorderSensors,
} from '@/components/ui/Sortable';
import { TASK_SORTS, sortTasks } from '@/lib/subjects';
import {
  formatDate,
  isOverdue,
  getPriorityBadgeColor,
  getStatusBadgeColor,
  cn
} from '@/lib/utils';

export function PersonalTasks() {
  const { user } = useAuth();
  const {
    personalTasks,
    createPersonalTask,
    updatePersonalTask,
    togglePersonalTaskStatus,
    deletePersonalTask,
    taskOrder,
    reorderTasks
  } = useData();
  const [taskSort, setTaskSort] = useState('custom'); // Custom Order is the default view
  const boardSensors = useReorderSensors();

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban' | 'calendar'
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal State for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('To Do');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('General');
  const [reminderDate, setReminderDate] = useState('');

  // Daily Productivity Stats
  const totalTasks = personalTasks.length;
  const completedTasks = personalTasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = personalTasks.filter(t => isOverdue(t.due_date, t.status)).length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter tasks, then put them in the chosen order.
  const filteredTasks = sortTasks(personalTasks, taskSort, taskOrder).filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

  const canReorder = taskSort === 'custom';
  const listIds = filteredTasks.map(t => t.id);
  const move = (ids, id, delta) => { const n = moveId(ids, id, delta); if (n) reorderTasks(n); };

  // Board: drag within a column to reorder, or into another column to change
  // the task's status.
  const BOARD_COLUMNS = ['To Do', 'In Progress', 'Completed'];
  const columnIds = (status) => filteredTasks.filter(t => t.status === status).map(t => t.id);
  const handleBoardDragEnd = ({ active, over }) => {
    if (!over) return;
    const from = active.data.current?.group;
    const to = over.data.current?.group ?? over.data.current?.column;
    if (!from || !to) return;
    if (from === to) {
      if (active.id === over.id) return;
      const ids = columnIds(from);
      reorderTasks(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
      return;
    }
    // Into another column: change status and place it where it was dropped.
    const target = columnIds(to);
    const at = target.indexOf(over.id);
    target.splice(at < 0 ? target.length : at, 0, active.id);
    updatePersonalTask(active.id, { status: to });
    reorderTasks(target);
  };

  const handleOpenCreate = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setStatus('To Do');
    setDueDate(new Date().toISOString().split('T')[0]);
    setCategory('General');
    setReminderDate('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date || '');
    setCategory(task.category || 'General');
    setReminderDate(task.reminder_date || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      updatePersonalTask(editingTask.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        due_date: dueDate,
        category,
        reminder_date: reminderDate || null
      });
    } else {
      createPersonalTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        due_date: dueDate,
        category,
        reminder_date: reminderDate || null
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            My Personal Tasks
            <Badge variant="primary">{personalTasks.length}</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Your own study to-dos, revision plans and reminders. Only you can see these.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="gap-1.5 shadow-sm">
          <Plus className="w-4 h-4" />
          Add Personal Task
        </Button>
      </div>

      {/* Daily Productivity Summary Card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard index={0} label="Total Tasks" value={totalTasks} icon={ListTodo} tone="neutral" />
        <StatCard index={1} label="Completed" value={completedTasks} icon={CheckCircle2} tone="moss" />
        <StatCard index={2} label="Pending" value={pendingTasks} icon={Hourglass} tone="ochre" />
        <StatCard index={3} label="Overdue" value={overdueTasks} icon={AlertTriangle} tone={overdueTasks > 0 ? 'terracotta' : 'neutral'} />
        <StatCard index={4} label="Productivity" value={completionPercentage} suffix="%" icon={TrendingUp} tone="brown" progress={completionPercentage} className="col-span-2 sm:col-span-1" />
      </div>

      {/* Control Bar: View Switcher, Search & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        {/* View Switcher: List, Kanban, Calendar */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              viewMode === 'list'
                ? 'bg-surface dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <List className="w-3.5 h-3.5" />
            List View
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              viewMode === 'kanban'
                ? 'bg-surface dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <Kanban className="w-3.5 h-3.5" />
            Kanban Board
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              viewMode === 'calendar'
                ? 'bg-surface dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Calendar View
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <Select size="sm" aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-auto min-w-[8.5rem]"
          >
            <option value="all">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </Select>

          <Select size="sm" aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-auto min-w-[8.5rem]"
          >
            <option value="all">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </Select>

          <Select size="sm" aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-auto min-w-[8.5rem]"
          >
            <option value="all">All Categories</option>
            <option value="Work">Work</option>
            <option value="Health">Health</option>
            <option value="Learning">Learning</option>
            <option value="Finance">Finance</option>
            <option value="General">General</option>
          </Select>

          {viewMode !== 'calendar' && (
            <SortSelect ariaLabel="Sort tasks" value={taskSort} onChange={setTaskSort} options={TASK_SORTS} />
          )}
        </div>
      </div>
      {viewMode !== 'calendar' && personalTasks.length > 1 && (
        <div className="-mt-3">
          <ReorderHint canReorder={canReorder} what={viewMode === 'kanban' ? 'cards (or into another column to change status)' : 'tasks'} />
        </div>
      )}

      {/* VIEW 1: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center bg-surface dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-sm text-slate-400">No personal tasks found.</p>
              <Button size="sm" onClick={handleOpenCreate} className="mt-3">
                Create your first task
              </Button>
            </div>
          ) : (
            <SortableList ids={listIds} disabled={!canReorder} onReorder={reorderTasks}>
            {filteredTasks.map((t, i) => {
              const overdue = isOverdue(t.due_date, t.status);
              const isCompleted = t.status === 'Completed';

              return (
                <SortableItem key={t.id} id={t.id} disabled={!canReorder}>
                {(handle) => (
                <div
                  className={cn(
                    'p-4 rounded-xl border bg-surface dark:bg-slate-900 flex items-center justify-between gap-4 transition-all hover:shadow-xs group',
                    isCompleted
                      ? 'border-slate-200/60 dark:border-slate-800/60 opacity-70'
                      : 'border-slate-200 dark:border-slate-800'
                  )}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {canReorder && listIds.length > 1 && (
                      <ReorderControls
                        handle={handle}
                        name={t.title}
                        onUp={() => move(listIds, t.id, -1)}
                        onDown={() => move(listIds, t.id, 1)}
                        isFirst={i === 0}
                        isLast={i === listIds.length - 1}
                      />
                    )}
                    <button
                      onClick={() => togglePersonalTaskStatus(t.id)}
                      className="shrink-0 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5 hover:border-emerald-500" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm font-semibold truncate',
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'
                          )}
                        >
                          {t.title}
                        </span>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getPriorityBadgeColor(t.priority))}>
                          {t.priority}
                        </span>
                        {t.category && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {t.category}
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{t.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {t.due_date && (
                      <span className={cn('text-xs flex items-center gap-1', overdue ? 'text-rose-600 font-semibold' : 'text-slate-500')}>
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(t.due_date)}
                      </span>
                    )}

                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                      title="Edit task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => deletePersonalTask(t.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                )}
                </SortableItem>
              );
            })}
            </SortableList>
          )}
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <DndContext sensors={boardSensors} collisionDetection={closestCorners} onDragEnd={handleBoardDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BOARD_COLUMNS.map((columnStatus) => {
            const columnTasks = filteredTasks.filter(t => t.status === columnStatus);
            const ids = columnTasks.map(t => t.id);
            return (
              <BoardColumn key={columnStatus} status={columnStatus} disabled={!canReorder}>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {columnStatus}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {columnTasks.length}
                  </span>
                </div>

                <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={!canReorder}>
                <div className="space-y-3 flex-1 overflow-y-auto min-h-[4rem]">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 italic">
                      {canReorder ? `Drop a task here to mark it ${columnStatus}` : `No tasks in ${columnStatus}`}
                    </div>
                  ) : (
                    columnTasks.map((t, i) => (
                      <SortableItem key={t.id} id={t.id} group={columnStatus} disabled={!canReorder}>
                      {(handle) => (
                      <div
                        className="p-3.5 rounded-xl bg-surface dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 min-w-0">
                            {canReorder && (
                              <ReorderControls
                                handle={handle}
                                name={t.title}
                                onUp={() => move(ids, t.id, -1)}
                                onDown={() => move(ids, t.id, 1)}
                                isFirst={i === 0}
                                isLast={i === ids.length - 1}
                              />
                            )}
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {t.title}
                            </span>
                          </div>
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0', getPriorityBadgeColor(t.priority))}>
                            {t.priority}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                          <span>{formatDate(t.due_date)}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => togglePersonalTaskStatus(t.id)}
                              className="text-[10px] text-primary-600 hover:underline font-semibold"
                            >
                              {t.status === 'Completed' ? 'Mark To Do' : 'Complete'}
                            </button>
                          </div>
                        </div>
                      </div>
                      )}
                      </SortableItem>
                    ))
                  )}
                </div>
                </SortableContext>
              </BoardColumn>
            );
          })}
        </div>
        </DndContext>
      )}

      {/* VIEW 3: CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-surface dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">November 2026 Deadlines</h3>
            <span className="text-xs text-slate-500">Visual Timeline View</span>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-2">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 30 }, (_, i) => {
              const day = i + 1;
              const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
              const dayTasks = filteredTasks.filter(t => t.due_date === dateStr);
              return (
                <div
                  key={day}
                  className="min-h-[75px] p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-left flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{day}</span>
                  <div className="space-y-1 mt-1">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className={cn('text-[9px] font-semibold px-1 py-0.5 rounded truncate border', getPriorityBadgeColor(t.priority))}
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[9px] text-slate-400 block font-medium">+{dayTasks.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? "Edit Personal Task" : "Add Personal Task"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title *"
            placeholder="e.g. Prepare Sprint Review Slides"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Task details and notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </Select>

            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Due Date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="General">General</option>
              <option value="Work">Work</option>
              <option value="Health">Health</option>
              <option value="Learning">Learning</option>
              <option value="Finance">Finance</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingTask ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// A board column that also accepts drops when it is empty.
function BoardColumn({ status, disabled, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}`, data: { column: status }, disabled });
  return (
    <div
      ref={setNodeRef}
      data-column={status}
      className={cn(
        'bg-slate-100/70 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col transition-colors',
        isOver && 'border-primary-400 bg-primary-50/60 dark:bg-primary-950/30'
      )}
    >
      {children}
    </div>
  );
}
