import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, User, Users2, Flag, CheckCircle2, CalendarClock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SessionModal } from '@/components/study/SessionModal';
import { SessionCard } from '@/pages/study/StudySessionsPage';
import { useStudy } from '@/context/StudyContext';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CalendarTaskModal } from '@/components/tasks/CalendarTaskModal';
import { useData } from '@/context/DataContext';
import { getPriorityBadgeColor, cn } from '@/lib/utils';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_ITEMS_IN_CELL = 3;

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d) => addDays(d, -d.getDay());
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const typeMeta = {
  team_task: { label: 'Group task', Icon: Users2 },
  personal_task: { label: 'Personal', Icon: User },
  project_deadline: { label: 'Subject deadline', Icon: Flag },
  session: { label: 'Study session', Icon: CalendarClock },
};

export function CalendarView({ onOpenTaskDetails }) {
  const { tasks, personalTasks, projects } = useData();
  const { sessions } = useStudy();
  const [sessionModal, setSessionModal] = useState({ open: false, date: '' });
  const [openSession, setOpenSession] = useState(null);

  const [view, setView] = useState('month'); // 'month' | 'week' | 'day'
  const [focusDate, setFocusDate] = useState(() => startOfDay(new Date()));
  const [filterType, setFilterType] = useState('all'); // 'all' | 'team' | 'personal' | 'projects'
  const [modal, setModal] = useState({ open: false, date: null, personalTask: null });

  const todayKey = toKey(new Date());

  // Everything with a due date, grouped by day.
  const itemsByDate = useMemo(() => {
    const items = [];
    if (filterType === 'all' || filterType === 'team') {
      tasks.forEach(t => t.due_date && items.push({
        id: t.id, title: t.title, date: t.due_date, type: 'team_task', priority: t.priority, status: t.status, source: t,
      }));
    }
    if (filterType === 'all' || filterType === 'personal') {
      personalTasks.forEach(pt => pt.due_date && items.push({
        id: pt.id, title: pt.title, date: pt.due_date, type: 'personal_task', priority: pt.priority, status: pt.status, source: pt,
      }));
    }
    if (filterType === 'all' || filterType === 'projects') {
      projects.forEach(p => p.due_date && items.push({
        id: p.id, title: p.name, date: p.due_date, type: 'project_deadline', priority: p.priority, status: p.status, source: p,
      }));
    }
    if (filterType === 'all' || filterType === 'sessions') {
      sessions.forEach((s) => {
        const start = new Date(s.starts_at);
        const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(start);
        items.push({ id: s.id, title: `${time} ${s.title}`, date: toKey(start), type: 'session', priority: 'session', status: '', source: s, sortTime: start.getTime() });
      });
    }
    // Sessions first (by time), then everything else.
    items.sort((a, b) => (a.type === 'session' ? 0 : 1) - (b.type === 'session' ? 0 : 1) || (a.sortTime || 0) - (b.sortTime || 0));
    return items.reduce((map, item) => {
      (map[item.date] ||= []).push(item);
      return map;
    }, {});
  }, [tasks, personalTasks, projects, sessions, filterType]);

  const openAdd = (dateKey) => setModal({ open: true, date: dateKey, personalTask: null });

  const openItem = (item) => {
    if (item.type === 'session') setOpenSession(item.source);
    else if (item.type === 'team_task') onOpenTaskDetails(item.id);
    else if (item.type === 'personal_task') setModal({ open: true, date: item.date, personalTask: item.source });
  };

  const move = (direction) => {
    if (view === 'month') setFocusDate(new Date(focusDate.getFullYear(), focusDate.getMonth() + direction, 1));
    else if (view === 'week') setFocusDate(addDays(focusDate, 7 * direction));
    else setFocusDate(addDays(focusDate, direction));
  };

  let heading;
  if (view === 'month') heading = `${MONTHS[focusDate.getMonth()]} ${focusDate.getFullYear()}`;
  else if (view === 'week') {
    const s = startOfWeek(focusDate);
    const e = addDays(s, 6);
    heading = s.getMonth() === e.getMonth()
      ? `${MONTHS[s.getMonth()]} ${s.getDate()} to ${e.getDate()}, ${e.getFullYear()}`
      : `${MONTHS[s.getMonth()].slice(0, 3)} ${s.getDate()} to ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getDate()}, ${e.getFullYear()}`;
  } else {
    heading = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(focusDate);
  }

  // Month grid: whole weeks, Sunday first, including days from neighbouring months.
  const monthDays = useMemo(() => {
    const first = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
    const start = startOfWeek(first);
    const last = new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 0);
    const weeks = Math.ceil((first.getDay() + last.getDate()) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  }, [focusDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(focusDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [focusDate]);

  const renderItem = (item, compact = true) => {
    const { Icon, label } = typeMeta[item.type];
    const done = item.status === 'Completed';
    const clickable = item.type !== 'project_deadline';
    return (
      <button
        type="button"
        key={`${item.type}-${item.id}`}
        onClick={(e) => {
          e.stopPropagation();
          if (clickable) openItem(item);
        }}
        title={`${label}: ${item.title}`}
        className={cn(
          'w-full flex items-center gap-1.5 rounded-md border text-left font-semibold transition-colors',
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-2 text-xs',
          item.type === 'session'
            ? 'bg-primary-600 text-cream border-primary-600 dark:bg-primary-700 dark:border-primary-700'
            : done
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              : getPriorityBadgeColor(item.priority),
          clickable ? 'cursor-pointer hover:brightness-95' : 'cursor-default',
          item.type === 'project_deadline' && 'border-dashed'
        )}
      >
        {done ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <Icon className="w-3 h-3 shrink-0 opacity-70" />}
        <span className={cn('truncate', done && 'line-through opacity-80')}>{item.title}</span>
        {!compact && <span className="ml-auto shrink-0 text-[10px] font-medium opacity-70">{label}</span>}
      </button>
    );
  };

  const renderDayCell = (date, { tall = false } = {}) => {
    const key = toKey(date);
    const items = itemsByDate[key] || [];
    const inMonth = view !== 'month' || date.getMonth() === focusDate.getMonth();
    const isToday = key === todayKey;
    const visible = tall ? items : items.slice(0, MAX_ITEMS_IN_CELL);
    const hidden = items.length - visible.length;

    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        aria-label={`${new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(date)}: ${items.length} item(s). Press Enter to add a task.`}
        onClick={() => openAdd(key)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openAdd(key);
          }
        }}
        className={cn(
          'group relative flex flex-col gap-1 p-2 rounded-xl border text-left cursor-pointer transition-colors',
          tall ? 'min-h-[22rem]' : 'min-h-[7rem]',
          inMonth ? 'bg-surface dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-900/40',
          isToday ? 'border-primary-500 ring-1 ring-primary-500/30' : 'border-slate-200/80 dark:border-slate-800 hover:border-primary-300'
        )}
      >
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'inline-flex items-center justify-center text-xs font-bold rounded-full w-6 h-6',
              isToday ? 'bg-primary-600 text-cream' : inMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
            )}
          >
            {date.getDate()}
          </span>
          <span
            aria-hidden="true"
            className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity w-6 h-6 rounded-md flex items-center justify-center text-primary-700 bg-primary-50 dark:bg-primary-950/60 dark:text-primary-300"
          >
            <Plus className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="space-y-1">
          {visible.map(item => renderItem(item))}
          {hidden > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFocusDate(date);
                setView('day');
              }}
              className="text-[10px] font-semibold text-primary-700 dark:text-primary-300 hover:underline px-1"
            >
              +{hidden} more
            </button>
          )}
        </div>
      </div>
    );
  };

  const dayItems = itemsByDate[toKey(focusDate)] || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Calendar</h1>
          <p className="text-xs text-slate-500 mt-1">
            Click any day to add a task or schedule a study session. Click an item to open it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">
          <div role="tablist" aria-label="Calendar view" className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
            {['month', 'week', 'day'].map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 rounded-md capitalize transition-colors',
                  view === v
                    ? 'bg-surface dark:bg-slate-900 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <Select size="sm" aria-label="Filter calendar items" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-auto min-w-[9.5rem]">
            <option value="all">All items</option>
            <option value="team">Group tasks</option>
            <option value="personal">Personal tasks</option>
            <option value="sessions">Study sessions</option>
            <option value="projects">Subject deadlines</option>
          </Select>

          <Button size="sm" onClick={() => openAdd(toKey(view === 'month' && focusDate.getMonth() !== new Date().getMonth() ? focusDate : view === 'month' ? new Date() : focusDate))}>
            <Plus className="w-4 h-4" />
            Add task
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white min-w-[12rem]">{heading}</h2>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(-1)} aria-label={`Previous ${view}`} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => move(1)} aria-label={`Next ${view}`} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <Button size="sm" variant="outline" onClick={() => setFocusDate(startOfDay(new Date()))}>
              Today
            </Button>
          </div>

          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary-600" /> Session</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Urgent</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> High</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Medium</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Low</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Done</span>
          </div>
        </CardHeader>

        <CardContent>
          {view !== 'day' && (
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200/70 dark:border-slate-800">
              {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
            </div>
          )}

          {view === 'month' && (
            <div className="grid grid-cols-7 gap-2 pt-2">
              {monthDays.map(date => renderDayCell(date))}
            </div>
          )}

          {view === 'week' && (
            <div className="grid grid-cols-7 gap-2 pt-2">
              {weekDays.map(date => renderDayCell(date, { tall: true }))}
            </div>
          )}

          {view === 'day' && (
            <div className="space-y-2">
              {dayItems.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-500">Nothing due on this day.</p>
                  <Button size="sm" className="mt-3" onClick={() => openAdd(toKey(focusDate))}>
                    <Plus className="w-4 h-4" />
                    Add a task for this day
                  </Button>
                </div>
              ) : (
                <>
                  {dayItems.map(item => renderItem(item, false))}
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => openAdd(toKey(focusDate))}>
                    <Plus className="w-4 h-4" />
                    Add another task
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CalendarTaskModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, date: null, personalTask: null })}
        date={modal.date}
        personalTask={modal.personalTask}
        onScheduleSession={(date) => {
          setModal({ open: false, date: null, personalTask: null });
          setSessionModal({ open: true, date });
        }}
      />

      <SessionModal isOpen={sessionModal.open} session={sessionModal.session || null} defaultDate={sessionModal.date} onClose={() => setSessionModal({ open: false, date: '' })} />

      <Modal isOpen={Boolean(openSession)} onClose={() => setOpenSession(null)} title="Study session" size="lg" bodyClassName="p-4">
        {openSession && (
          <SessionCard
            session={sessions.find(s => s.id === openSession.id) || openSession}
            onEdit={(session) => {
              setOpenSession(null);
              setSessionModal({ open: true, date: '', session });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
