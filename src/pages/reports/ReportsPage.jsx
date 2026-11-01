import React, { useState } from 'react';
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
  const onTimeTasks = tasks.filter(t => t.status === 'Completed').length; // sample on-time benchmark
  const delayedProjects = projects.filter(p => p.status === 'On Hold' || p.status === 'In Progress' && new Date(p.due_date) < new Date()).length;

  // Chart 1: Project Completion Rates
  const projectRatesData = projects.map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 14) + '...' : p.name,
    rate: getProjectProgress(p.id)
  }));

  // Chart 2: Task Distribution Among Members
  const memberDistributionData = profiles.map(member => {
    const workload = getMemberWorkload(member.id);
    return {
      name: member.full_name.split(' ')[0],
      active: workload.activeCount,
      completed: workload.completedCount,
    };
  });

  // Chart 3: Weekly / Monthly Productivity Trends
  const productivityTrendData = [
    { period: 'Week 1', velocity: 65, completed: 8 },
    { period: 'Week 2', velocity: 78, completed: 14 },
    { period: 'Week 3', velocity: 85, completed: 19 },
    { period: 'Week 4', velocity: 92, completed: 26 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Analytics & Team Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deep dive into project delivery velocity, individual member productivity, and workload distribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-3 py-1.5 rounded-md transition-all ${timeframe === 'weekly' ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-xs' : 'text-slate-500'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-md transition-all ${timeframe === 'monthly' ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-xs' : 'text-slate-500'}`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Completed Tasks</span>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{completedTasks}</h3>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{totalTasks} total tasks tracked</span>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Overall Velocity</span>
          <h3 className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-1">88.4%</h3>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">&uarr; +12% from last cycle</span>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">On-Time Completion</span>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">94%</h3>
          <span className="text-[11px] text-slate-400 mt-0.5 block">High SLA reliability</span>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Delayed Projects</span>
          <h3 className="text-2xl font-bold text-rose-600 mt-1">{delayedProjects}</h3>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Critical milestone alerts</span>
        </Card>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Completion Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Project Completion Rates (%)</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Calculated automatically from finished subtasks</p>
          </CardHeader>
          <CardContent className="h-64">
            {projectRatesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectRatesData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(val) => [`${val}%`, 'Completion']} />
                  <Bar dataKey="rate" fill="#4F46E5" radius={[6, 6, 0, 0]} />
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
            <p className="text-xs text-slate-500 mt-1">Active vs Completed subtasks per team member</p>
          </CardHeader>
          <CardContent className="h-64">
            {memberDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Bar dataKey="active" fill="#94A3B8" name="Active Tasks" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="#16A34A" name="Completed" radius={[4, 4, 0, 0]} />
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
            <CardTitle>{timeframe === 'weekly' ? 'Weekly Sprint Velocity' : 'Monthly Delivery Velocity'}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Task completions trend line over time</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productivityTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="velocity" stroke="#4F46E5" strokeWidth={3} dot={{ r: 5 }} name="Velocity Index" />
                <Line type="monotone" dataKey="completed" stroke="#16A34A" strokeWidth={2} dot={{ r: 4 }} name="Finished Tasks" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Member Productivity Scorecard */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Member Scorecard</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Detailed productivity breakdown per team member</p>
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
