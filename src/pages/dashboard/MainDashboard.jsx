import React, { useState } from 'react';
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
  const { user, role } = useAuth();
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
    approveTaskReview
  } = useData();

  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  const stats = getTeamStats(selectedTeamFilter === 'all' ? null : selectedTeamFilter);

  // Filtered Tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedTeamFilter !== 'all' && t.team_id !== selectedTeamFilter) return false;
    if (selectedStatusFilter !== 'all' && t.status !== selectedStatusFilter) return false;
    return true;
  });

  // My assigned tasks
  const myAssignedTasks = tasks.filter((t) => t.assigned_to === user?.id);
  const myDueToday = myAssignedTasks.filter((t) => isDueToday(t.due_date));
  const myCompleted = myAssignedTasks.filter((t) => t.status === 'Completed');
  const myProductivityPercentage = myAssignedTasks.length > 0
    ? Math.round((myCompleted.length / myAssignedTasks.length) * 100)
    : 100;

  // Pending task approvals for leader / admin
  const pendingApprovals = tasks.filter((t) => t.status === 'Under Review');

  // Chart Data: Task Status Breakdown
  const statusCounts = {
    'To Do': tasks.filter(t => t.status === 'To Do').length,
    'In Progress': tasks.filter(t => t.status === 'In Progress').length,
    'Under Review': tasks.filter(t => t.status === 'Under Review').length,
    'Completed': tasks.filter(t => t.status === 'Completed').length,
    'Blocked': tasks.filter(t => t.status === 'Blocked' || t.status === 'Changes Requested').length,
  };

  const statusPieData = [
    { name: 'To Do', value: statusCounts['To Do'], color: '#94a3b8' },
    { name: 'In Progress', value: statusCounts['In Progress'], color: '#6366f1' },
    { name: 'Under Review', value: statusCounts['Under Review'], color: '#a855f7' },
    { name: 'Completed', value: statusCounts['Completed'], color: '#22c55e' },
    { name: 'Blocked/Changes', value: statusCounts['Blocked'], color: '#f43f5e' },
  ].filter(d => d.value > 0);

  // Chart Data: Project Progress
  const projectProgressData = projects.map((p) => ({
    name: p.name.length > 18 ? p.name.substring(0, 16) + '...' : p.name,
    progress: getProjectProgress(p.id),
  }));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-800 p-6 sm:p-8 text-white shadow-xl shadow-primary-500/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                {role === 'admin' ? 'Platform Administrator' : role === 'team_leader' ? 'Team Leader Workspace' : 'Personal & Team Hub'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name}! 👋
            </h1>
            <p className="text-sm text-primary-100 max-w-xl">
              {role === 'team_leader'
                ? `You have ${pendingApprovals.length} task(s) awaiting your review and ${stats.activeProjectsCount} active team projects in progress.`
                : `You've achieved ${myProductivityPercentage}% productivity with ${myCompleted.length} of ${myAssignedTasks.length} tasks completed.`}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={onOpenNewTaskModal}
              className="bg-white text-primary-700 hover:bg-primary-50 shadow-md font-semibold"
            >
              <Plus className="w-4 h-4" />
              Assign New Task
            </Button>
            {(role === 'team_leader' || role === 'admin') && (
              <Button
                variant="outline"
                onClick={onOpenNewProjectModal}
                className="bg-primary-800/60 border-primary-400/40 text-white hover:bg-primary-800"
              >
                Create Project
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Projects</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.activeProjectsCount}</h3>
            <span className="text-[11px] text-slate-400 mt-1 block">{stats.totalProjectsCount} total initiatives</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400 flex items-center justify-center">
            <FolderKanban className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Completion</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.completionPercentage}%</h3>
            <span className="text-[11px] text-slate-400 mt-1 block">{stats.completedCount} of {stats.totalTasksCount} completed</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</p>
            <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.inProgressCount}</h3>
            <span className="text-[11px] text-slate-400 mt-1 block">{stats.underReviewCount} under review</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Tasks</p>
            <h3 className={cn("text-2xl font-bold mt-1", stats.overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200")}>
              {stats.overdueCount}
            </h3>
            <span className="text-[11px] text-slate-400 mt-1 block">Requires attention</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Pending Approvals Review Section (High priority for Team Leaders) */}
      {(role === 'team_leader' || role === 'admin') && pendingApprovals.length > 0 && (
        <Card className="border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base text-purple-950 dark:text-purple-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Pending Task Reviews ({pendingApprovals.length})
              </CardTitle>
              <p className="text-xs text-purple-700/80 dark:text-purple-300 mt-0.5">
                Tasks submitted by team members waiting for leader verification & sign-off.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingApprovals.map((task) => {
              const assignee = profiles.find(p => p.id === task.assigned_to);
              return (
                <div
                  key={task.id}
                  className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200/80 dark:border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
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
              <CardTitle>Project Execution Progress</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Automatic progress calculated from completed subtasks</p>
            </div>
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">Formula: (Done / Total) &times; 100</span>
          </CardHeader>
          <CardContent className="h-64">
            {projectProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(val) => [`${val}%`, 'Progress']} />
                  <Bar dataKey="progress" fill="#4F46E5" radius={[6, 6, 0, 0]} />
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
                  <RechartsTooltip />
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
            <CardTitle>Assigned Team Tasks</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Quick action to update task status without opening full modal</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="all">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="all">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Changes Requested">Changes Requested</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Task Name</th>
                <th className="py-3 px-4">Project</th>
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
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No tasks match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.slice(0, 8).map((task) => {
                  const proj = projects.find(p => p.id === task.project_id);
                  const assignee = profiles.find(p => p.id === task.assigned_to);
                  const isTaskOverdue = isOverdue(task.due_date, task.status);

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
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
                        {role === 'team_leader' || role === 'admin' ? (
                          <select
                            value={task.status}
                            onChange={(e) => updateTask(task.id, { status: e.target.value })}
                            className="text-xs p-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Changes Requested">Changes Requested</option>
                            <option value="Completed">Completed</option>
                            <option value="Blocked">Blocked</option>
                          </select>
                        ) : task.assigned_to === user?.id ? (
                          <select
                            value={task.status}
                            onChange={(e) => updateTask(task.id, { status: e.target.value })}
                            className="text-xs p-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Under Review">Submit for Review</option>
                            <option value="Blocked">Blocked</option>
                          </select>
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
