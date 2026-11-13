import React, { useEffect, useMemo, useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { isOverdue, parseDate, formatDate, getStatusBadgeColor, getPriorityBadgeColor, cn } from '@/lib/utils';
import { chartTooltipStyle, chartTick, chartCursor } from '@/lib/chartTheme';
import { buildPeriods, inPeriod, throughput } from '@/lib/reports';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Maximize2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Avatar } from '@/components/ui/Avatar';
import { useData } from '@/context/DataContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  LabelList,
} from 'recharts';

const TIMEFRAME_KEY = 'tasksync_reports_timeframe';
const STATUS_COLORS = { Completed: '#73883F', 'In Progress': '#7B3F00', Planning: '#D2B48C', 'On Hold': '#9C8B7A' };
const statusColor = (status) => STATUS_COLORS[status] || '#B8A58F';

function loadTimeframe() {
  try {
    const saved = localStorage.getItem(TIMEFRAME_KEY);
    return saved === 'weekly' || saved === 'monthly' ? saved : 'monthly';
  } catch {
    return 'monthly';
  }
}

// True on phone-width screens, so detail charts give the bars more room.
function useNarrow() {
  const query = '(max-width: 639px)';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return undefined;
    const onChange = () => setNarrow(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

const shortName = (name, max = 15) => (name.length > max ? `${name.substring(0, max - 1)}…` : name);

export function ReportsPage() {
  const { teams, projects, tasks, teamMembers, profiles, getProjectProgress, getProjectWorkItems, getMemberWorkload } = useData();
  // The chosen period is kept while charts are opened and closed, and
  // remembered on this device for the next visit.
  const [timeframe, setTimeframeState] = useState(loadTimeframe); // 'weekly' | 'monthly'
  const [expanded, setExpanded] = useState(null); // null | 'subjects' | 'members' | 'throughput'

  const setTimeframe = (value) => {
    setTimeframeState(value);
    try { localStorage.setItem(TIMEFRAME_KEY, value); } catch { /* optional */ }
  };
  const periodWord = timeframe === 'weekly' ? 'week' : 'month';

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
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

  const periods = useMemo(() => buildPeriods(timeframe, 12), [timeframe]);
  const currentPeriod = periods[periods.length - 1];

  // Subject-wise detail, in the person's custom subject order.
  const subjectRows = projects.map((p) => {
    const items = getProjectWorkItems(p.id);
    const completed = items.filter(t => t.status === 'Completed').length;
    const inProgress = items.filter(t => t.status !== 'Completed' && t.status !== 'To Do').length;
    return {
      id: p.id,
      name: p.name,
      short: shortName(p.name),
      group: teams.find(t => t.id === p.team_id)?.name || '',
      status: p.status,
      manual: Boolean(p.status_manual),
      priority: p.priority,
      due: p.due_date,
      overdue: isOverdue(p.due_date, p.status),
      total: items.length,
      completed,
      inProgress,
      notStarted: items.length - completed - inProgress,
      completedThisPeriod: items.filter(t => t.status === 'Completed' && inPeriod(t.updated_at, currentPeriod)).length,
      rate: getProjectProgress(p.id),
    };
  });

  // Member-wise allocation. Only people who are in one of your groups.
  const teamUserIds = new Set(teamMembers.map(tm => tm.user_id));
  const memberRows = profiles
    .filter(member => teamUserIds.has(member.id))
    .map((member) => {
      const w = getMemberWorkload(member.id);
      return {
        id: member.id,
        name: member.full_name,
        short: shortName(member.full_name || 'Member', 14),
        avatar: member.avatar_url,
        workloadLevel: w.workloadLevel,
        badgeColor: w.badgeColor,
        allocated: w.totalAssigned,
        completed: w.completedCount,
        pending: w.activeCount,
        underReview: w.underReviewCount,
        overdue: w.overdueCount,
        completedThisPeriod: tasks.filter(t => t.assigned_to === member.id && t.status === 'Completed' && inPeriod(t.updated_at, currentPeriod)).length,
        rate: w.completionRate,
      };
    });

  const throughputAll = useMemo(() => throughput(tasks, periods), [tasks, periods]);
  const throughputRecent = throughputAll.slice(-6);
  const completedThisPeriod = throughputAll[throughputAll.length - 1]?.completed ?? 0;

  const openChart = (key) => () => setExpanded(key);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Study Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            How your study groups are progressing. Click any chart for the full view and its data.
          </p>
        </div>
        <TimeframeToggle value={timeframe} onChange={setTimeframe} />
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} label="Completed Tasks" value={completedTasks} hint={`${totalTasks} team tasks tracked`} icon={CheckCircle2} tone="moss" />
        <StatCard index={1} label="Completion Rate" value={completionRate} suffix="%" hint={`${completedThisPeriod} completed this ${periodWord}`} icon={TrendingUp} tone="brown" progress={completionRate} />
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

      {/* Charts: each opens a detailed view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Subject Completion Rates (%)"
          subtitle="Calculated automatically from finished tasks"
          onOpen={openChart('subjects')}
        >
          {subjectRows.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectRows} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="short" tick={chartTick} stroke="#D2B48C" />
                <YAxis domain={[0, 100]} unit="%" tick={chartTick} stroke="#D2B48C" />
                <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} formatter={(val) => [`${val}%`, 'Completion']} labelFormatter={(_, p) => p?.[0]?.payload?.name} />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                  {subjectRows.map(r => <Cell key={r.id} fill={statusColor(r.status)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart text="No subjects yet to calculate completion rates." />
          )}
        </ChartCard>

        <ChartCard
          title="Member Task Allocation & Completion"
          subtitle="Pending vs completed tasks per member"
          onOpen={openChart('members')}
        >
          {memberRows.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberRows} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="short" tick={chartTick} stroke="#D2B48C" />
                <YAxis tick={chartTick} stroke="#D2B48C" allowDecimals={false} />
                <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} labelFormatter={(_, p) => p?.[0]?.payload?.name} />
                <Bar dataKey="pending" fill="#D2B48C" name="Pending" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#73883F" name="Completed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart text="No member activity recorded yet." />
          )}
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title={timeframe === 'weekly' ? 'Weekly Throughput' : 'Monthly Throughput'}
          subtitle={`Group tasks created vs completed, last 6 ${periodWord}s`}
          onOpen={openChart('throughput')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={throughputRecent} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5D9C6" />
              <XAxis dataKey="period" tick={chartTick} stroke="#D2B48C" />
              <YAxis tick={chartTick} stroke="#D2B48C" allowDecimals={false} />
              <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} />
              <Line type="monotone" dataKey="created" stroke="#D2B48C" strokeWidth={2} dot={{ r: 4 }} name="Created" animationDuration={900} />
              <Line type="monotone" dataKey="completed" stroke="#7B3F00" strokeWidth={3} dot={{ r: 5 }} name="Completed" animationDuration={900} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
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
              {memberRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No member records found.
                  </td>
                </tr>
              ) : (
                memberRows.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 flex items-center gap-2.5">
                      <Avatar src={m.avatar} name={m.name} size="xs" />
                      <span className="font-semibold text-slate-900 dark:text-white">{m.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.badgeColor}`}>
                        {m.workloadLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{m.pending}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600">{m.completed}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Progress value={m.rate} className="w-24" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{m.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Detailed views */}
      <Modal
        isOpen={expanded === 'subjects'}
        onClose={() => setExpanded(null)}
        size="full"
        title="Subject Completion Rates"
        description="Subject-wise completion, worked out from each subject's tasks."
      >
        <SubjectDetail rows={subjectRows} periodWord={periodWord} timeframe={timeframe} onTimeframe={setTimeframe} />
      </Modal>

      <Modal
        isOpen={expanded === 'members'}
        onClose={() => setExpanded(null)}
        size="full"
        title="Member Task Allocation & Completion"
        description="Tasks allocated to each member, and how many are completed and pending."
      >
        <MemberDetail rows={memberRows} periodWord={periodWord} timeframe={timeframe} onTimeframe={setTimeframe} />
      </Modal>

      <Modal
        isOpen={expanded === 'throughput'}
        onClose={() => setExpanded(null)}
        size="full"
        title={timeframe === 'weekly' ? 'Weekly Throughput' : 'Monthly Throughput'}
        description={`Tasks created versus completed in each ${periodWord}, last 12 ${periodWord}s.`}
      >
        <ThroughputDetail rows={throughputAll} periodWord={periodWord} timeframe={timeframe} onTimeframe={setTimeframe} />
      </Modal>
    </div>
  );
}

function TimeframeToggle({ value, onChange }) {
  return (
    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold self-start" role="group" aria-label="Reporting period">
      {['weekly', 'monthly'].map(v => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 rounded-md transition-all capitalize ${value === v ? 'bg-surface dark:bg-slate-900 text-primary-600 shadow-xs' : 'text-slate-500'}`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

// A chart card that opens its detailed view on click or Enter.
function ChartCard({ title, subtitle, onOpen, className, children }) {
  return (
    <Card
      className={cn('group', className)}
      onClick={onOpen}
      role="button"
      aria-label={`${title}: open detailed view`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-primary-600 transition-colors shrink-0">
          <Maximize2 className="w-3.5 h-3.5" /> Expand
        </span>
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ text }) {
  return <div className="h-full flex items-center justify-center text-xs text-slate-400">{text}</div>;
}

function Stat({ label, value, hint }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function DetailTable({ columns, rows, empty }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {columns.map(c => (
              <th key={c.key} className={cn('py-2.5 px-3 whitespace-nowrap', c.align === 'right' && 'text-right')}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="py-8 text-center text-slate-400">{empty}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={row.id || row.period || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              {columns.map(c => (
                <td key={c.key} className={cn('py-2.5 px-3 text-slate-700 dark:text-slate-300', c.align === 'right' && 'text-right tabular-nums')}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailToolbar({ timeframe, onTimeframe, note }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-500">{note}</p>
      <TimeframeToggle value={timeframe} onChange={onTimeframe} />
    </div>
  );
}

function SubjectDetail({ rows, periodWord, timeframe, onTimeframe }) {
  const narrow = useNarrow();
  const withTasks = rows.filter(r => r.total > 0);
  const avg = withTasks.length ? Math.round(withTasks.reduce((s, r) => s + r.rate, 0) / withTasks.length) : 0;
  const byStatus = (s) => rows.filter(r => r.status === s).length;
  const chartHeight = Math.max(260, rows.length * 38 + 40);

  return (
    <div className="space-y-5">
      <DetailToolbar timeframe={timeframe} onTimeframe={onTimeframe} note={`"Done this ${periodWord}" uses the selected period.`} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Subjects" value={rows.length} />
        <Stat label="Average completion" value={`${avg}%`} hint="Subjects with tasks" />
        <Stat label="Completed" value={byStatus('Completed')} />
        <Stat label="In progress" value={byStatus('In Progress')} hint={`${byStatus('Planning')} planning · ${byStatus('On Hold')} on hold`} />
        <Stat label="Overdue" value={rows.filter(r => r.overdue).length} />
      </div>

      {rows.length > 0 && (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 48, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5D9C6" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={chartTick} stroke="#D2B48C" />
              <YAxis type="category" dataKey={narrow ? 'short' : 'name'} width={narrow ? 96 : 170} tick={{ ...chartTick, fontSize: narrow ? 11 : 12 }} stroke="#D2B48C" />
              <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} formatter={(val, _, p) => [`${val}% (${p.payload.completed}/${p.payload.total} tasks)`, 'Completion']} />
              <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={22}>
                {rows.map(r => <Cell key={r.id} fill={statusColor(r.status)} />)}
                <LabelList dataKey="rate" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 12, fill: '#76634F', fontWeight: 500 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 justify-center text-[11px] text-slate-500 mt-1">
            {Object.entries(STATUS_COLORS).map(([s, c]) => (
              <span key={s} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{s}</span>
            ))}
          </div>
        </div>
      )}

      <DetailTable
        empty="No subjects yet."
        rows={rows}
        columns={[
          { key: 'name', label: 'Subject', render: r => <span className="font-semibold text-slate-900 dark:text-white">{r.name}</span> },
          { key: 'group', label: 'Group' },
          {
            key: 'status', label: 'Status', render: r => (
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap', getStatusBadgeColor(r.status))}>
                {r.status}{r.manual ? ' · manual' : ''}
              </span>
            ),
          },
          { key: 'priority', label: 'Priority', render: r => <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getPriorityBadgeColor(r.priority))}>{r.priority}</span> },
          { key: 'due', label: 'Due', render: r => <span className={cn('whitespace-nowrap', r.overdue && 'text-rose-600 font-semibold')}>{r.due ? formatDate(r.due) : '—'}</span> },
          { key: 'total', label: 'Tasks', align: 'right' },
          { key: 'completed', label: 'Done', align: 'right' },
          { key: 'inProgress', label: 'In progress', align: 'right' },
          { key: 'notStarted', label: 'Not started', align: 'right' },
          { key: 'completedThisPeriod', label: `Done this ${periodWord}`, align: 'right' },
          { key: 'rate', label: 'Completion', align: 'right', render: r => <span className="font-bold text-slate-900 dark:text-white">{r.rate}%</span> },
        ]}
      />
    </div>
  );
}

function MemberDetail({ rows, periodWord, timeframe, onTimeframe }) {
  const narrow = useNarrow();
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const allocated = sum('allocated');
  const completed = sum('completed');
  const chartHeight = Math.max(260, rows.length * 44 + 60);

  return (
    <div className="space-y-5">
      <DetailToolbar timeframe={timeframe} onTimeframe={onTimeframe} note={`"Done this ${periodWord}" uses the selected period.`} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Members" value={rows.length} />
        <Stat label="Tasks allocated" value={allocated} />
        <Stat label="Completed" value={completed} hint={allocated ? `${Math.round((completed / allocated) * 100)}% of allocated` : undefined} />
        <Stat label="Pending" value={sum('pending')} hint={`${sum('underReview')} under review`} />
        <Stat label="Overdue" value={sum('overdue')} />
      </div>

      {rows.length > 0 && (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5D9C6" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={chartTick} stroke="#D2B48C" />
              <YAxis type="category" dataKey={narrow ? 'short' : 'name'} width={narrow ? 90 : 150} tick={{ ...chartTick, fontSize: narrow ? 11 : 12 }} stroke="#D2B48C" />
              <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="completed" stackId="a" fill="#73883F" name="Completed" barSize={22}>
                <LabelList dataKey="completed" position="center" style={{ fontSize: 11, fill: '#fff', fontWeight: 500 }} formatter={(v) => (v ? v : '')} />
              </Bar>
              <Bar dataKey="pending" stackId="a" fill="#D2B48C" name="Pending" radius={[0, 6, 6, 0]} barSize={22}>
                <LabelList dataKey="pending" position="center" style={{ fontSize: 11, fill: '#3B200B', fontWeight: 500 }} formatter={(v) => (v ? v : '')} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <DetailTable
        empty="No members in your groups yet."
        rows={rows}
        columns={[
          {
            key: 'name', label: 'Member', render: r => (
              <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                <Avatar src={r.avatar} name={r.name} size="xs" />{r.name}
              </span>
            ),
          },
          { key: 'workloadLevel', label: 'Workload', render: r => <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${r.badgeColor}`}>{r.workloadLevel}</span> },
          { key: 'allocated', label: 'Allocated', align: 'right' },
          { key: 'completed', label: 'Completed', align: 'right' },
          { key: 'pending', label: 'Pending', align: 'right' },
          { key: 'underReview', label: 'Under review', align: 'right' },
          { key: 'overdue', label: 'Overdue', align: 'right', render: r => <span className={cn(r.overdue > 0 && 'text-rose-600 font-semibold')}>{r.overdue}</span> },
          { key: 'completedThisPeriod', label: `Done this ${periodWord}`, align: 'right' },
          { key: 'rate', label: 'Completion', align: 'right', render: r => <span className="font-bold text-slate-900 dark:text-white">{r.rate}%</span> },
        ]}
      />
    </div>
  );
}

function ThroughputDetail({ rows, periodWord, timeframe, onTimeframe }) {
  const created = rows.reduce((s, r) => s + r.created, 0);
  const completed = rows.reduce((s, r) => s + r.completed, 0);
  const busiest = rows.reduce((best, r) => (r.completed > (best?.completed ?? -1) ? r : best), null);

  return (
    <div className="space-y-5">
      <DetailToolbar timeframe={timeframe} onTimeframe={onTimeframe} note="Switch between weekly and monthly; the Reports page keeps your choice." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Created" value={created} hint={`Last 12 ${periodWord}s`} />
        <Stat label="Completed" value={completed} hint={`Last 12 ${periodWord}s`} />
        <Stat label={`Average per ${periodWord}`} value={(completed / rows.length).toFixed(1)} hint="Completed" />
        <Stat label={`Best ${periodWord}`} value={busiest && busiest.completed > 0 ? busiest.label : '—'} hint={busiest && busiest.completed > 0 ? `${busiest.completed} completed` : undefined} />
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5D9C6" />
            <XAxis dataKey="period" tick={{ ...chartTick, fontSize: 12 }} stroke="#D2B48C" />
            <YAxis tick={{ ...chartTick, fontSize: 12 }} stroke="#D2B48C" allowDecimals={false} />
            <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} labelFormatter={(_, p) => p?.[0]?.payload?.label} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="created" stroke="#D2B48C" strokeWidth={2} dot={{ r: 4 }} name="Created">
              <LabelList dataKey="created" position="top" style={{ fontSize: 11, fill: '#76634F' }} />
            </Line>
            <Line type="monotone" dataKey="completed" stroke="#7B3F00" strokeWidth={3} dot={{ r: 5 }} name="Completed">
              <LabelList dataKey="completed" position="top" style={{ fontSize: 11, fill: '#7B3F00', fontWeight: 500 }} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <DetailTable
        empty="No tasks yet."
        rows={[...rows].reverse()}
        columns={[
          { key: 'label', label: timeframe === 'weekly' ? 'Week' : 'Month', render: r => <span className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">{r.label}</span> },
          { key: 'created', label: 'Created', align: 'right' },
          { key: 'completed', label: 'Completed', align: 'right' },
          {
            key: 'net', label: 'Completed − created', align: 'right', render: r => (
              <span className={cn('font-semibold', r.net > 0 ? 'text-emerald-600' : r.net < 0 ? 'text-rose-600' : 'text-slate-500')}>
                {r.net > 0 ? `+${r.net}` : r.net}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
