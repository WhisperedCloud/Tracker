import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Filter
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useData } from '@/context/DataContext';
import { formatDate, getPriorityBadgeColor, getStatusBadgeColor, cn } from '@/lib/utils';

export function CalendarView({ onOpenTaskDetails }) {
  const { tasks, personalTasks, projects } = useData();

  const [calendarView, setCalendarView] = useState('month'); // 'month' | 'week' | 'day'
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(10); // 0-indexed: 10 is November

  const [filterType, setFilterType] = useState('all'); // 'all' | 'team' | 'personal' | 'projects'

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Build items for calendar
  const allCalendarItems = [];

  if (filterType === 'all' || filterType === 'team') {
    tasks.forEach(t => {
      if (t.due_date) {
        allCalendarItems.push({
          id: t.id,
          title: t.title,
          date: t.due_date,
          type: 'team_task',
          priority: t.priority,
          status: t.status,
          taskId: t.id
        });
      }
    });
  }

  if (filterType === 'all' || filterType === 'personal') {
    personalTasks.forEach(pt => {
      if (pt.due_date) {
        allCalendarItems.push({
          id: pt.id,
          title: pt.title,
          date: pt.due_date,
          type: 'personal_task',
          priority: pt.priority,
          status: pt.status,
          taskId: null
        });
      }
    });
  }

  if (filterType === 'all' || filterType === 'projects') {
    projects.forEach(p => {
      if (p.due_date) {
        allCalendarItems.push({
          id: p.id,
          title: `Project: ${p.name}`,
          date: p.due_date,
          type: 'project_deadline',
          priority: p.priority,
          status: p.status,
          taskId: null
        });
      }
    });
  }

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Calendar & Deadlines
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track personal milestones, project release targets, and upcoming team deliverables.
          </p>
        </div>

        {/* View Switcher: Monthly, Weekly, Daily */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
            {['month', 'week', 'day'].map((v) => (
              <button
                key={v}
                onClick={() => setCalendarView(v)}
                className={cn(
                  'px-3 py-1.5 rounded-md capitalize transition-all',
                  calendarView === v
                    ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="all">All Calendar Items</option>
            <option value="team">Team Tasks</option>
            <option value="personal">Personal Tasks</option>
            <option value="projects">Project Deadlines</option>
          </select>
        </div>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Priority Legend */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Urgent
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> High
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {/* Days of week */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-2 border-b border-slate-100 dark:border-slate-800">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 gap-2 pt-2">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] p-2 rounded-xl bg-slate-50/20 dark:bg-slate-900/10" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayItems = allCalendarItems.filter(item => item.date === dateStr);

              return (
                <div
                  key={day}
                  className="min-h-[100px] p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-primary-400 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {day}
                  </span>

                  <div className="space-y-1 mt-1 overflow-y-auto max-h-20">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => item.taskId && onOpenTaskDetails(item.taskId)}
                        className={cn(
                          'p-1 rounded text-[10px] font-semibold truncate border cursor-pointer transition-transform hover:scale-[1.02]',
                          getPriorityBadgeColor(item.priority)
                        )}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
