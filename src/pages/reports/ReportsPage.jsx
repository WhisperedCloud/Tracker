import React, { useMemo, useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { isOverdue, parseDate } from '@/lib/utils';
import { chartTooltipStyle, chartTick, chartCursor } from '@/lib/chartTheme';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users2,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useData } from '@/context/DataContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

export function ReportsPage() {
  const { teams, projects, tasks, teamMembers, profiles, getProjectProgress, getMemberWorkload } = useData();
  const [timeframe, setTimeframe] = useState('monthly'); // 'weekly' | 'monthly'

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const underReviewTasks = tasks.filter(t => t.status === 'Under Review').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // On time = completed on or before the due date. The completion time is
  // taken from updated_at, which is set when a task is approved.
  const completedWithDueDate = tasks.filter(t => t.status === 'Completed' && t.due_date && t.updated_at);
  const onTimeCount = completedWithDueDate.filter(t => {
    const due = parseDate(t.due_date);
    due.setHours(23, 59, 59, 999);
    return new Date(t.updated_at) <= due;
  }).length;
  const onTimeRate = completedWithDueDate.length > 0 ? Math.round((onTimeCount / completedWithDueDate.length) * 100) : null;

  // Past their target date and not finished or cancelled.
  const delayedProjects = projects.filter(p => p.status !== 'Cancelled' && isOverdue(p.due_date, p.status)).length;

  // Chart 1: Project Completion Rates
  const projectRatesData = projects.map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 14) + '...' : p.name,
    rate: getProjectProgress(p.id)
  }));

  // Chart 2: Task Distribution Among Members
  // Only people who are in one of your teams.
  const teamUserIds = new Set(teamMembers.map(tm => tm.user_id));
  const memberDistributionData = profiles
    .filter(member => teamUserIds.has(member.id))
    .map(member => {
      const workload = getMemberWorkload(member.id);
      return {
        name: member.full_name,
        active: workload.activeCount,
        completed: workload.completedCount,
      };
    });

  // Chart 3: tasks created vs completed over the last 6 weeks or months.
  const productivityTrendData = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const back = 5 - i;
      if (timeframe === 'weekly') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - back * 7);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
        return { start, end, period: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(start) };
      }
      const start = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      return { start, end, period: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(start) };
    });
    const inBucket = (value, b) => {
      if (!value) return false;
      const d = new Date(value);
      return d >= b.start && d < b.end;
    };
    return buckets.map(b => ({
      period: b.period,
      created: tasks.filter(t => inBucket(t.created_at, b)).length,
      completed: tasks.filter(t => t.status === 'Completed' && inBucket(t.updated_at, b)).length,
    }));
  }, [tasks, timeframe]);

  const completedThisPeriod = productivityTrendData[productivityTrendData.length - 1]?.completed ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Study Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            How your study groups are progressing: subjects, tasks and who is doing what.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-3 py-1.5 rounded-md transition-all ${timeframe === 'weekly' ? 'bg-surface dark:bg-slate-900 text-primary-600 shadow-xs' : 'text-slate-500'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-md transition-all ${timeframe === 'monthly' ? 'bg-surface dark:bg-slate-900 text-primary-600 shadow-xs' : 'text-slate-500'}`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} label="Completed Tasks" value={completedTasks} hint={`${totalTasks} team tasks tracked`} icon={CheckCircle2} tone="moss" />
        <StatCard index={1} label="Completion Rate" value={completionRate} suffix="%" hint={`${completedThisPeriod} completed this ${timeframe === 'weekly' ? 'week' : 'month'}`} icon={TrendingUp} tone="brown" progress={completionRate} />
        <StatCard
          index={2}
          label="On-Time Completion"
          value={onTimeRate ?? 'N/A'}
          suffix={onTimeRate === null ? '' : '%'}
          hint={onTimeRate === null ? 'No completed tasks with due dates yet' : `${onTimeCount} of ${completedWithDueDate.length} finished by their due date`}
          icon={Clock}
          tone="teal"
          progress={onTimeRate ?? undefined}
        />
        <StatCard index={3} label="Overdue Subjects" value={delayedProjects} hint={delayedProjects > 0 ? 'Past their target date' : 'All subjects on track'} icon={AlertTriangle} tone={delayedProjects > 0 ? 'terracotta' : 'neutral'} />
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Completion Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Completion Rates (%)</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Calculated automatically from finished subtasks</p>
          </CardHeader>
          <CardContent className="h-64">
            {projectRatesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectRatesData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={chartTick} stroke="#D2B48C" />
                  <YAxis domain={[0, 100]} unit="%" tick={chartTick} stroke="#D2B48C" />
                  <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} formatter={(val) => [`${val}%`, 'Completion']} />
                  <Bar dataKey="rate" fill="#7B3F00" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active projects to calculate completion rates.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Productivity & Task Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Member Task Allocation & Completion</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Active vs completed tasks per member</p>
          </CardHeader>
          <CardContent className="h-64">
            {memberDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={chartTick} stroke="#D2B48C" />
                  <YAxis tick={chartTick} stroke="#D2B48C" allowDecimals={false} />
                  <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} />
                  <Bar dataKey="active" fill="#D2B48C" name="Active Tasks" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="#73883F" name="Completed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No member activity recorded yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Velocity Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{timeframe === 'weekly' ? 'Weekly Throughput' : 'Monthly Throughput'}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Group tasks created vs completed, last 6 {timeframe === 'weekly' ? 'weeks' : 'months'}
            </p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productivityTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5D9C6" />
                <XAxis dataKey="period" tick={chartTick} stroke="#D2B48C" />
                <YAxis tick={chartTick} stroke="#D2B48C" allowDecimals={false} />
                <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} />
                <Line type="monotone" dataKey="created" stroke="#D2B48C" strokeWidth={2} dot={{ r: 4 }} name="Created" animationDuration={900} />
                <Line type="monotone" dataKey="completed" stroke="#7B3F00" strokeWidth={3} dot={{ r: 5 }} name="Completed" animationDuration={900} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Member Productivity Scorecard */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Member Scorecard</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Detailed productivity per member</p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Workload Status</th>
                <th className="py-3 px-4">Active Assignments</th>
                <th className="py-3 px-4">Completed</th>
                <th className="py-3 px-4">Productivity Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No member records found.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => {
                  const workload = getMemberWorkload(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 flex items-center gap-2.5">
                        <Avatar src={p.avatar_url} name={p.full_name} size="xs" />
                        <span className="font-semibold text-slate-900 dark:text-white">{p.full_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${workload.badgeColor}`}>
                          {workload.workloadLevel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {workload.activeCount}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">
                        {workload.completedCount}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Progress value={workload.completionRate} className="w-24" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{workload.completionRate}%</span>
                        </div>
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
