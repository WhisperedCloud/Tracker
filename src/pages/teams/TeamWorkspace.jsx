import React, { useState } from 'react';
import {
  FolderKanban,
  Users2,
  CheckSquare,
  Activity,
  BarChart2,
  LayoutDashboard,
  ArrowLeft,
  Plus,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { TeamMembers } from './TeamMembers';
import { SmartWorkloadBalancer } from '@/components/tasks/SmartWorkloadBalancer';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import {
  formatDate,
  formatTimeAgo,
  isOverdue,
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
} from 'recharts';

export function TeamWorkspace({
  teamId,
  onBackToTeams,
  onOpenProject,
  onOpenTaskDetails,
  onOpenNewTaskModal,
  onOpenNewProjectModal
}) {
  const { teams, projects, tasks, teamMembers, profiles, activity, getProjectProgress, getTeamStats } = useData();
  const { user, role } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'members' | 'projects' | 'tasks' | 'workload' | 'activity' | 'reports'

  const team = teams.find(t => t.id === teamId);

  if (!team) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Team not found.</p>
        <Button onClick={onBackToTeams} className="mt-4">Back to Teams</Button>
      </div>
    );
  }

  const teamProjects = projects.filter(p => p.team_id === team.id);
  const teamTasks = tasks.filter(t => t.team_id === team.id);
  const teamActivity = activity.filter(a => {
    const task = tasks.find(t => t.id === a.task_id);
    return task && task.team_id === team.id;
  });
  const stats = getTeamStats(team.id);

  const tabs = [
    { id: 'dashboard', label: 'Team Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: `Projects (${teamProjects.length})`, icon: FolderKanban },
    { id: 'tasks', label: `Tasks (${teamTasks.length})`, icon: CheckSquare },
    { id: 'workload', label: 'Workload Balancer', icon: Sparkles },
    { id: 'members', label: 'Members', icon: Users2 },
    { id: 'activity', label: 'Activity Feed', icon: Activity },
    { id: 'reports', label: 'Team Reports', icon: BarChart2 },
  ];

  return (
    <div className="space-y-6">
      {/* Team Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToTeams}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Back to all teams"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Avatar src={team.avatar_url} name={team.name} size="lg" className="rounded-2xl" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {team.name}
                </h1>
                <Badge variant="primary">Active Workspace</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                {team.description || "Centralized hub for all team projects, subtasks, and collaboration."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button size="sm" onClick={() => onOpenNewTaskModal(team.id)} className="gap-1.5 shadow-sm text-xs">
              <Plus className="w-4 h-4" />
              New Task
            </Button>
            {(role === 'team_leader' || role === 'admin') && (
              <Button size="sm" variant="outline" onClick={() => onOpenNewProjectModal(team.id)} className="gap-1.5 text-xs">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            )}
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 mt-6 pt-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all',
                  isActive
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-primary-600' : 'text-slate-400')} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: TEAM DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Projects</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.activeProjectsCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Team Completion</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.completionPercentage}%</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">In Progress Tasks</span>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.inProgressCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Overdue Tasks</span>
              <p className={cn("text-2xl font-bold mt-1", stats.overdueCount > 0 ? "text-rose-600" : "text-slate-800 dark:text-slate-200")}>
                {stats.overdueCount}
              </p>
            </div>
          </div>

          {/* Active Projects in Team */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Team Projects</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setActiveTab('projects')} className="text-xs text-primary-600">
                View all projects &rarr;
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamProjects.map((proj) => {
                const progress = getProjectProgress(proj.id);
                return (
                  <div
                    key={proj.id}
                    onClick={() => onOpenProject(proj.id)}
                    className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-primary-400 cursor-pointer transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{proj.name}</h4>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getStatusBadgeColor(proj.status))}>
                        {proj.status}
                      </span>
                    </div>
                    <Progress value={progress} showLabel />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {teamProjects.map((proj) => {
            const progress = getProjectProgress(proj.id);
            const projTasks = tasks.filter(t => t.project_id === proj.id);
            return (
              <Card key={proj.id} className="p-5 hover:border-primary-400 transition-all cursor-pointer" onClick={() => onOpenProject(proj.id)}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{proj.name}</h3>
                    <span className="text-[11px] text-slate-500">{proj.category} &bull; Due {formatDate(proj.due_date)}</span>
                  </div>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getStatusBadgeColor(proj.status))}>
                    {proj.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">{proj.description}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">{projTasks.length} Subtasks</span>
                    <span className="text-primary-600 font-bold">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* TAB 3: TASKS */}
      {activeTab === 'tasks' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">All Tasks for {team.name}</CardTitle>
            <Button size="sm" onClick={() => onOpenNewTaskModal(team.id)} className="text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Task
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {teamTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => onOpenTaskDetails(t.id)}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 hover:border-primary-400 cursor-pointer transition-all"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">{t.title}</h4>
                  <span className="text-[11px] text-slate-400">Due {formatDate(t.due_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getPriorityBadgeColor(t.priority))}>
                    {t.priority}
                  </span>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getStatusBadgeColor(t.status))}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: WORKLOAD BALANCER */}
      {activeTab === 'workload' && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              Smart Team Workload Balancer
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Rule-based capacity matrix analyzing active tasks, overdue workload, and recommending optimal assignees.
            </p>
          </div>
          <SmartWorkloadBalancer teamId={team.id} />
        </Card>
      )}

      {/* TAB 5: MEMBERS */}
      {activeTab === 'members' && (
        <TeamMembers teamId={team.id} />
      )}

      {/* TAB 6: ACTIVITY FEED */}
      {activeTab === 'activity' && (
        <Card className="p-5">
          <CardTitle className="text-base mb-4">Workspace Activity Feed</CardTitle>
          <div className="space-y-3">
            {teamActivity.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No activity logged for this team yet.</p>
            ) : (
              teamActivity.map((act) => {
                const actor = profiles.find(p => p.id === act.user_id);
                const task = tasks.find(t => t.id === act.task_id);
                return (
                  <div key={act.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 dark:text-white">{actor?.full_name}</strong>{' '}
                      <span className="text-slate-500">{act.action.replace('_', ' ')} on</span>{' '}
                      <span className="font-semibold text-primary-600 dark:text-primary-400">{task?.title}</span>
                      {act.new_value && <span className="ml-1 text-slate-600 dark:text-slate-300">&rarr; {act.new_value}</span>}
                    </div>
                    <span className="text-[10px] text-slate-400">{formatTimeAgo(act.created_at)}</span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* TAB 7: REPORTS */}
      {activeTab === 'reports' && (
        <Card className="p-6">
          <CardTitle className="text-base mb-2">Team Velocity & Completion Report</CardTitle>
          <p className="text-xs text-slate-500 mb-6">Aggregate performance metrics across all projects in this workspace.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={teamProjects.map(p => ({ name: p.name.substring(0, 14), progress: getProjectProgress(p.id) }))}
              >
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <RechartsTooltip formatter={(val) => [`${val}%`, 'Progress']} />
                <Bar dataKey="progress" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
