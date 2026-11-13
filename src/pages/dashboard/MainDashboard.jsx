import React, { useState } from 'react';
import { CalendarClock, Timer, Flame } from 'lucide-react';
import { SessionCard } from '@/pages/study/StudySessionsPage';
import { useStudy, formatMinutes } from '@/context/StudyContext';
import { StatCard } from '@/components/ui/StatCard';
import { chartTooltipStyle, chartTick, chartCursor } from '@/lib/chartTheme';
import { Select } from '@/components/ui/Select';
import {
  FolderKanban,
  Users2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Filter,
  CheckSquare,
  PlayCircle,
  Eye,
  RotateCcw,
  Plus
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { SortableList, SortableItem, ReorderControls, SortSelect, moveId } from '@/components/ui/Sortable';
import { TASK_SORTS, sortTasks } from '@/lib/subjects';
import {
  formatDate,
  formatTimeAgo,
  isOverdue,
  isDueToday,
  getPriorityBadgeColor,
  getStatusBadgeColor,
  cn
} from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export function MainDashboard({
  onOpenTaskDetails,
  onOpenNewTaskModal,
  onOpenNewProjectModal,
  setCurrentTab,
}) {
  const { user } = useAuth();
  const {
    teams,
    projects,
    tasks,
    personalTasks,
    teamMembers,
    profiles,
    activity,
    getProjectProgress,
    getMemberWorkload,
    getTeamStats,
    updateTask,
    approveTaskReview,
    submitTaskForReview,
    canManageTask,
    memberTeams,
    taskOrder,
    reorderTasks
  } = useData();

  const { upcomingSessions, minutesToday, minutesThisWeek, streakDays, timer } = useStudy();
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [taskSort, setTaskSort] = useState('custom'); // Custom Order is the default view

  const stats = getTeamStats(selectedTeamFilter === 'all' ? null : selectedTeamFilter);

  // Filtered Tasks
  const filteredTasks = sortTasks(tasks, taskSort, taskOrder).filter((t) => {
    if (selectedTeamFilter !== 'all' && t.team_id !== selectedTeamFilter) return false;
    if (selectedStatusFilter !== 'all' && t.status !== selectedStatusFilter) return false;
    return true;
  });

  // The table shows the first 8; reordering moves tasks within those.
  const shownTasks = filteredTasks.slice(0, 8);
  const shownIds = shownTasks.map(t => t.id);

  // My assigned tasks
  const myAssignedTasks = tasks.filter((t) => t.assigned_to === user?.id);
  const myDueToday = myAssignedTasks.filter((t) => isDueToday(t.due_date));
  const myCompleted = myAssignedTasks.filter((t) => t.status === 'Completed');
  const myProductivityPercentage = myAssignedTasks.length > 0
    ? Math.round((myCompleted.length / myAssignedTasks.length) * 100)
    : 100;

  // Tasks waiting for this user's review (they created them or lead the group)
  const pendingApprovals = tasks.filter((t) => t.status === 'Under Review' && canManageTask(t) && t.assigned_to !== user?.id);
  const canCreateProjects = memberTeams.length > 0;

  // Chart Data: Task Status Breakdown
  const statusCounts = {
    'To Do': tasks.filter(t => t.status === 'To Do').length,
    'In Progress': tasks.filter(t => t.status === 'In Progress').length,
    'Under Review': tasks.filter(t => t.status === 'Under Review').length,
    'Completed': tasks.filter(t => t.status === 'Completed').length,
    'Blocked': tasks.filter(t => t.status === 'Blocked' || t.status === 'Changes Requested').length,
  };

  const statusPieData = [
    { name: 'To Do', value: statusCounts['To Do'], color: '#D2B48C' },
    { name: 'In Progress', value: statusCounts['In Progress'], color: '#507671' },
    { name: 'Under Review', value: statusCounts['Under Review'], color: '#8A5A69' },
    { name: 'Completed', value: statusCounts['Completed'], color: '#73883F' },
    { name: 'Blocked/Changes', value: statusCounts['Blocked'], color: '#B04E35' },
  ].filter(d => d.value > 0);

  // Chart Data: Project Progress
  const projectProgressData = projects.map((p) => ({
    name: p.name.length > 18 ? p.name.substring(0, 16) + '...' : p.name,
    progress: getProjectProgress(p.id),
  }));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-primary-700 p-6 sm:p-8 text-cream shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-cream/15 border border-cream/20">
                Your Study Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name}! 👋
            </h1>
            <p className="text-sm text-primary-100/90 max-w-xl">
              {pendingApprovals.length > 0
                ? `You have ${pendingApprovals.length} task(s) awaiting your review and ${stats.activeProjectsCount} active subjects in your groups.`
                : `You've achieved ${myProductivityPercentage}% productivity with ${myCompleted.length} of ${myAssignedTasks.length} tasks completed.`}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={onOpenNewTaskModal}
              className="bg-cream text-primary-800 hover:bg-white shadow-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              {canCreateProjects ? 'Assign New Task' : 'New Task'}
            </Button>
            {canCreateProjects && (
              <Button
                variant="outline"
                onClick={onOpenNewProjectModal}
                className="bg-transparent border-cream/40 text-cream hover:bg-primary-800 hover:border-cream/60"
              >
                Add Subject
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} label="Active Subjects" value={stats.activeProjectsCount} hint={`${stats.totalProjectsCount} total initiatives`} icon={FolderKanban} tone="brown" />
        <StatCard index={1} label="Group Completion" value={stats.completionPercentage} suffix="%" hint={`${stats.completedCount} of ${stats.totalTasksCount} completed`} icon={CheckCircle2} tone="moss" progress={stats.completionPercentage} />
        <StatCard index={2} label="In Progress" value={stats.inProgressCount} hint={`${stats.underReviewCount} under review`} icon={Clock} tone="teal" />
        <StatCard index={3} label="Overdue Tasks" value={stats.overdueCount} hint={stats.overdueCount > 0 ? 'Needs attention' : 'All on schedule'} icon={AlertTriangle} tone={stats.overdueCount > 0 ? 'terracotta' : 'neutral'} />
      </div>

      {/* Group study: next sessions and today's study time */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" index={4}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="w-4 h-4 text-primary-600" />Upcoming study sessions</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Your groups' next sessions</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCurrentTab('sessions')}>View all</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500">No sessions planned yet.</p>
                <Button size="sm" className="mt-3" onClick={() => setCurrentTab('sessions')}>Schedule a session</Button>
              </div>
            ) : upcomingSessions.slice(0, 3).map((s, i) => <SessionCard key={s.id} session={s} index={i} onEdit={() => setCurrentTab('sessions')} />)}
          </CardContent>
        </Card>

        <Card index={5} className="p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Timer className="w-4 h-4 text-primary-600" />Your study time</h3>
            {streakDays > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <Flame className="w-3 h-3" />{streakDays}-day streak
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Today</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{formatMinutes(minutesToday)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">This week</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{formatMinutes(minutesThisWeek)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            {timer.status === 'idle' ? 'Start a focus block and it is added to your study hours when it ends.' : `Your ${timer.phase} timer is running.`}
          </p>
          <Button className="mt-auto pt-0" onClick={() => setCurrentTab('focus')}>
            <Timer className="w-4 h-4" />{timer.status === 'idle' ? 'Start focusing' : 'Open timer'}
          </Button>
        </Card>
      </div>

      {/* Pending Approvals Review Section (tasks you created or organize) */}
      {pendingApprovals.length > 0 && (
        <Card className="border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base text-purple-950 dark:text-purple-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Pending Task Reviews ({pendingApprovals.length})
              </CardTitle>
              <p className="text-xs text-purple-700/80 dark:text-purple-300 mt-0.5">
                Work submitted by your group, waiting for you to approve it or ask for changes.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingApprovals.map((task) => {
              const assignee = profiles.find(p => p.id === task.assigned_to);
              return (
                <div
                  key={task.id}
                  className="p-3 bg-surface dark:bg-slate-900 rounded-xl border border-purple-200/80 dark:border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={assignee?.avatar_url} name={assignee?.full_name} size="sm" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-primary-600 cursor-pointer" onClick={() => onOpenTaskDetails(task.id)}>
                        {task.title}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Submitted by <span className="font-semibold text-slate-700 dark:text-slate-300">{assignee?.full_name}</span> &bull; Due {formatDate(task.due_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenTaskDetails(task.id)}
                      className="text-xs py-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveTaskReview(task.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Visual Analytics Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Progress Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Subject Progress</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Automatic progress calculated from completed subtasks</p>
            </div>
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">Formula: (Done / Total) &times; 100</span>
          </CardHeader>
          <CardContent className="h-64">
            {projectProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={chartTick} stroke="#D2B48C" />
                  <YAxis domain={[0, 100]} unit="%" tick={chartTick} stroke="#D2B48C" />
                  <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} formatter={(val) => [`${val}%`, 'Progress']} />
                  <Bar dataKey="progress" fill="#7B3F00" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active projects to display
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Status Distribution Donut */}
        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
            <p className="text-xs text-slate-500 mt-1">By workflow state</p>
          </CardHeader>
          <CardContent className="h-64 flex flex-col items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="75%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No task data available
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 mt-2">
              {statusPieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Tasks & Quick Status Update Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Group Tasks</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Quick action to update task status without opening full modal</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SortSelect ariaLabel="Sort tasks" value={taskSort} onChange={setTaskSort} options={TASK_SORTS} />
            <Select size="sm" aria-label="Filter by study group"
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="w-auto min-w-[8.5rem]"
            >
              <option value="all">All Study Groups</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>

            <Select size="sm" aria-label="Filter by status"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-auto min-w-[8.5rem]"
            >
              <option value="all">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Changes Requested">Changes Requested</option>
              <option value="Completed">Completed</option>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {taskSort === 'custom' && <th className="py-3 pl-3 pr-0 w-8"><span className="sr-only">Order</span></th>}
                <th className="py-3 px-4">Task Name</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Quick Status Update</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={taskSort === 'custom' ? 8 : 7} className="py-8 text-center text-slate-400">
                    No tasks match the filter criteria.
                  </td>
                </tr>
              ) : (
                <SortableList ids={shownIds} disabled={taskSort !== 'custom'} onReorder={reorderTasks}>
                {shownTasks.map((task, i) => {
                  const proj = projects.find(p => p.id === task.project_id);
                  const assignee = profiles.find(p => p.id === task.assigned_to);
                  const isTaskOverdue = isOverdue(task.due_date, task.status);

                  return (
                    <SortableItem as="tr" key={task.id} id={task.id} disabled={taskSort !== 'custom'} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors bg-surface dark:bg-slate-900">
                    {(handle) => (
                    <>
                      {taskSort === 'custom' && (
                        <td className="py-3.5 pl-3 pr-0 w-8">
                          {shownIds.length > 1 && (
                            <ReorderControls
                              handle={handle}
                              name={task.title}
                              onUp={() => { const n = moveId(shownIds, task.id, -1); if (n) reorderTasks(n); }}
                              onDown={() => { const n = moveId(shownIds, task.id, 1); if (n) reorderTasks(n); }}
                              isFirst={i === 0}
                              isLast={i === shownIds.length - 1}
                            />
                          )}
                        </td>
                      )}
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                        <button
                          onClick={() => onOpenTaskDetails(task.id)}
                          className="hover:text-primary-600 dark:hover:text-primary-400 text-left font-semibold"
                        >
                          {task.title}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {proj ? proj.name : <span className="text-slate-400">Standalone</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar src={assignee?.avatar_url} name={assignee?.full_name} size="xs" />
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {assignee?.full_name || 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getPriorityBadgeColor(task.priority))}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={cn('font-medium', isTaskOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-600 dark:text-slate-400')}>
                          {formatDate(task.due_date)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {/* Quick Action Status Selector with role-based restriction */}
                        {canManageTask(task) ? (
                          <Select size="sm" aria-label="Task status"
                            value={task.status}
                            onChange={(e) => updateTask(task.id, { status: e.target.value })}
                            className="w-auto min-w-[8.5rem]"
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Changes Requested">Changes Requested</option>
                            <option value="Completed">Completed</option>
                            <option value="Blocked">Blocked</option>
                          </Select>
                        ) : task.assigned_to === user?.id ? (
                          <Select size="sm" aria-label="Task status"
                            value={task.status}
                            onChange={(e) => (
                              e.target.value === 'Under Review'
                                ? submitTaskForReview(task.id)
                                : updateTask(task.id, { status: e.target.value })
                            )}
                            className="w-auto min-w-[8.5rem]"
                          >
                            {/* Keep the current value selectable even if members cannot set it */}
                            {['Changes Requested', 'Completed'].includes(task.status) && (
                              <option value={task.status} disabled>{task.status}</option>
                            )}
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Under Review">Submit for Review</option>
                            <option value="Blocked">Blocked</option>
                          </Select>
                        ) : (
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getStatusBadgeColor(task.status))}>
                            {task.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onOpenTaskDetails(task.id)}
                          className="text-xs px-2 py-1 text-primary-600"
                        >
                          Details &rarr;
                        </Button>
                      </td>
                    </>
                    )}
                    </SortableItem>
                  );
                })}
                </SortableList>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
