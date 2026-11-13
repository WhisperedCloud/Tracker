import React, { useEffect, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw, Square, Timer, Flame, CalendarDays, Trophy, Plus, Trash2, Coffee, Clock, Pencil } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { GroupSubjectFields, EmptyState } from '@/components/study/GroupSubjectFields';
import { useData } from '@/context/DataContext';
import { useStudy, formatMinutes } from '@/context/StudyContext';
import { useAuth } from '@/context/AuthContext';
import { chartTooltipStyle, chartTick, chartCursor } from '@/lib/chartTheme';
import { formatTimeAgo, cn } from '@/lib/utils';

const PRESETS = [
  { label: '25 / 5', focus: 25, rest: 5 },
  { label: '50 / 10', focus: 50, rest: 10 },
  { label: '90 / 15', focus: 90, rest: 15 },
];

const formatClock = (ms) => {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

function TimerRing({ progress, phase, children }) {
  const r = 88;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-56 h-56 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="100" cy="100" r={r} fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-800" />
        <circle
          cx="100" cy="100" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          className={cn('transition-[stroke-dashoffset] duration-500 ease-linear', phase === 'focus' ? 'stroke-primary-600' : 'stroke-emerald-500')}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// Logs time studied away from the timer, or corrects an entry when `log` is passed.
function LogTimeModal({ isOpen, onClose, log = null }) {
  const { memberTeams } = useData();
  const { logStudy, updateLog } = useStudy();
  const isEditing = Boolean(log);
  const [minutes, setMinutes] = useState('30');
  const [teamId, setTeamId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setMinutes(log ? String(log.minutes) : '30');
    setTeamId(log?.team_id || '');
    setProjectId(log?.project_id || '');
    setNote(log?.note || '');
    setError('');
  }, [isOpen, log?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(minutes);
    if (!Number.isFinite(value) || value < 1 || value > 720) return setError('Enter between 1 and 720 minutes.');
    setSaving(true);
    const fields = { minutes: value, team_id: teamId || null, project_id: projectId || null, note: note.trim() };
    const saved = isEditing ? await updateLog(log.id, fields) : await logStudy(fields);
    setSaving(false);
    if (saved) {
      setMinutes('30');
      setNote('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit study time' : 'Log study time'}
      description={isEditing ? 'Correct the minutes, subject or note.' : 'Add time you studied away from the timer.'}
      icon={<Clock className="w-4 h-4" />}
      size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="log-form" disabled={saving}>{saving ? 'Saving...' : isEditing ? 'Save changes' : 'Log time'}</Button></>}
    >
      <form id="log-form" onSubmit={submit} className="space-y-4">
        {error && <div role="alert" className="p-3 text-xs text-rose-700 bg-rose-50 rounded-lg border border-rose-200">{error}</div>}
        <Input label="Minutes *" type="number" min="1" max="720" value={minutes} onChange={(e) => { setMinutes(e.target.value); setError(''); }} />
        {memberTeams.length > 0 && (
          <>
            <Select label="Study group" value={teamId} onChange={(e) => { setTeamId(e.target.value); setProjectId(''); }}>
              <option value="">Personal (no group)</option>
              {memberTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            {teamId && <GroupSubjectFields teamId={teamId} projectId={projectId} onTeamChange={setTeamId} onProjectChange={setProjectId} lockTeam />}
          </>
        )}
        <Input label="What did you study?" placeholder="e.g. Past paper 2021, questions 1 to 5" value={note} onChange={(e) => setNote(e.target.value)} />
      </form>
    </Modal>
  );
}

export function FocusPage() {
  const { user } = useAuth();
  const { memberTeams, projects } = useData();
  const {
    timer, remainingMs, timerControls, stopAndLog, studyLogs, deleteLog,
    minutesToday, minutesThisWeek, streakDays, getLeaderboard,
  } = useStudy();
  const [logging, setLogging] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [boardTeam, setBoardTeam] = useState('');
  const leaderboardTeam = boardTeam || memberTeams[0]?.id || '';

  const totalMs = (timer.phase === 'focus' ? timer.focusMinutes : timer.breakMinutes) * 60000;
  const progress = totalMs ? 1 - remainingMs / totalMs : 0;
  const running = timer.status === 'running';
  const locked = timer.status !== 'idle';
  const activePreset = PRESETS.find(p => p.focus === timer.focusMinutes && p.rest === timer.breakMinutes);

  const myLogs = studyLogs.filter(l => l.user_id === user?.id);
  const today = new Date();
  // Same day key format the timer uses for its "completed today" counter.
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const weekBySubject = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const totals = {};
    myLogs.filter(l => new Date(l.studied_at) >= start).forEach((l) => {
      const name = projects.find(p => p.id === l.project_id)?.name || 'General';
      totals[name] = (totals[name] || 0) + l.minutes;
    });
    return Object.entries(totals).map(([name, minutes]) => ({ name, minutes })).sort((a, b) => b.minutes - a.minutes);
  }, [myLogs, projects]);

  const leaderboard = leaderboardTeam ? getLeaderboard(leaderboardTeam, 7) : [];
  const topMinutes = Math.max(1, ...leaderboard.map(r => r.minutes));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Focus Timer</h1>
          <p className="text-xs text-slate-500 mt-1">Study in focused blocks. Every finished block is logged to your study hours.</p>
        </div>
        <Button variant="outline" onClick={() => setLogging(true)}><Plus className="w-4 h-4" />Log time manually</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} label="Today" value={minutesToday} suffix="min" hint={formatMinutes(minutesToday) + ' studied'} icon={Timer} tone="brown" />
        <StatCard index={1} label="This week" value={Math.round(minutesThisWeek / 6) / 10} decimals={1} suffix="h" hint="Since Monday" icon={CalendarDays} tone="teal" />
        <StatCard index={2} label="Study streak" value={streakDays} suffix={streakDays === 1 ? 'day' : 'days'} hint={streakDays ? 'Keep it going' : 'Study today to start one'} icon={Flame} tone={streakDays ? 'ochre' : 'neutral'} />
        <StatCard index={3} label="Blocks today" value={timer.completedDay === todayKey ? timer.completedToday : 0} hint="Finished focus blocks" icon={Coffee} tone="moss" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Timer */}
        <Card className="lg:col-span-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div role="radiogroup" aria-label="Timer length" className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" role="radio" aria-checked={activePreset === p} disabled={locked}
                  onClick={() => timerControls.configure({ focusMinutes: p.focus, breakMinutes: p.rest })}
                  className={cn('px-3 py-1.5 rounded-md transition-colors disabled:opacity-50', activePreset === p ? 'bg-surface dark:bg-slate-900 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-slate-600 dark:text-slate-400')}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Select size="sm" aria-label="Focus minutes" value={String(timer.focusMinutes)} disabled={locked} onChange={(e) => timerControls.configure({ focusMinutes: Number(e.target.value) })} className="w-auto min-w-[7rem]">
                {[15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120].map(m => <option key={m} value={String(m)}>{m} min focus</option>)}
              </Select>
              <Select size="sm" aria-label="Break minutes" value={String(timer.breakMinutes)} disabled={locked} onChange={(e) => timerControls.configure({ breakMinutes: Number(e.target.value) })} className="w-auto min-w-[7rem]">
                {[3, 5, 10, 15, 20, 30].map(m => <option key={m} value={String(m)}>{m} min break</option>)}
              </Select>
            </div>
          </div>

          <TimerRing progress={progress} phase={timer.phase}>
            <span className={cn('text-[11px] font-bold uppercase tracking-[0.2em]', timer.phase === 'focus' ? 'text-primary-700 dark:text-primary-300' : 'text-emerald-600')}>
              {timer.phase === 'focus' ? 'Focus' : 'Break'}
            </span>
            <span className="text-5xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white mt-1" aria-live="polite">{formatClock(remainingMs)}</span>
            <span className="text-[11px] text-slate-500 mt-1">{timer.status === 'paused' ? 'Paused' : running ? 'In progress' : 'Ready'}</span>
          </TimerRing>

          <div className="flex items-center justify-center gap-2 mt-6">
            {running ? (
              <Button size="lg" onClick={timerControls.pause}><Pause className="w-4 h-4" />Pause</Button>
            ) : (
              <Button size="lg" onClick={timerControls.start}><Play className="w-4 h-4" />{timer.status === 'paused' ? 'Resume' : timer.phase === 'focus' ? 'Start focus' : 'Start break'}</Button>
            )}
            {timer.phase === 'focus' && locked && (
              <Button size="lg" variant="outline" onClick={stopAndLog}><Square className="w-4 h-4" />Stop & log</Button>
            )}
            {timer.phase === 'break' && <Button size="lg" variant="outline" onClick={timerControls.skipBreak}>Skip break</Button>}
            {locked && <Button size="lg" variant="ghost" onClick={timerControls.reset} aria-label="Reset timer"><RotateCcw className="w-4 h-4" /></Button>}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200/70 dark:border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Log this time to</p>
            {memberTeams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={timer.teamId} disabled={locked} aria-label="Study group for this timer" onChange={(e) => timerControls.configure({ teamId: e.target.value, projectId: '' })}>
                  <option value="">Personal (no group)</option>
                  {memberTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
                <Select value={timer.projectId} disabled={locked || !timer.teamId} aria-label="Subject for this timer" onChange={(e) => timerControls.configure({ projectId: e.target.value })}>
                  <option value="">Any subject</option>
                  {projects.filter(p => p.team_id === timer.teamId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Time is logged as personal study. Join a study group to count it on the group leaderboard.</p>
            )}
          </div>
        </Card>

        {/* Leaderboard */}
        <Card className="lg:col-span-2" index={1}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-600" />Group leaderboard</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Study hours, last 7 days</p>
            </div>
            {memberTeams.length > 1 && (
              <Select size="sm" aria-label="Leaderboard group" value={leaderboardTeam} onChange={(e) => setBoardTeam(e.target.value)} className="w-auto min-w-[8rem]">
                {memberTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Join a study group to compare study hours.</p>
            ) : leaderboard.map((row, i) => (
              <div key={row.userId} className="flex items-center gap-3">
                <span className={cn('w-6 text-center text-xs font-bold', i === 0 && row.minutes > 0 ? 'text-amber-600' : 'text-slate-400')}>{i + 1}</span>
                <Avatar src={row.profile?.avatar_url} name={row.profile?.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{row.profile?.full_name || 'Member'}{row.userId === user?.id ? ' (you)' : ''}</span>
                    <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">{formatMinutes(row.minutes)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-500 origin-left animate-grow-x" style={{ width: `${(row.minutes / topMinutes) * 100}%`, animationDelay: `${i * 60}ms` }} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card index={2}>
          <CardHeader>
            <CardTitle className="text-base">This week by subject</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Minutes studied since Monday</p>
          </CardHeader>
          <CardContent className="h-60">
            {weekBySubject.length === 0 ? (
              <p className="text-xs text-slate-500 text-center pt-16">No study time logged this week yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekBySubject} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={chartTick} stroke="#D2B48C" />
                  <YAxis tick={chartTick} stroke="#D2B48C" allowDecimals={false} />
                  <RechartsTooltip contentStyle={chartTooltipStyle} cursor={chartCursor} formatter={(v) => [formatMinutes(v), 'Studied']} />
                  <Bar dataKey="minutes" fill="#7B3F00" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card index={3}>
          <CardHeader>
            <CardTitle className="text-base">Recent study log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {myLogs.length === 0 ? (
              <EmptyState icon={Timer} title="No study time yet" text="Start the timer or log time manually." />
            ) : myLogs.slice(0, 15).map((log) => {
              const subject = projects.find(p => p.id === log.project_id);
              const team = memberTeams.find(t => t.id === log.team_id);
              return (
                <div key={log.id} className="group flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{formatMinutes(log.minutes)} · {subject?.name || team?.name || 'Personal'}</p>
                    <p className="text-[11px] text-slate-500 truncate">{log.note || formatTimeAgo(log.studied_at)}</p>
                  </div>
                  <div className="flex items-center opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button type="button" onClick={() => setEditingLog(log)} aria-label="Edit this entry"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteLog(log.id)} aria-label="Delete this entry"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <LogTimeModal isOpen={logging} onClose={() => setLogging(false)} />
      <LogTimeModal isOpen={Boolean(editingLog)} onClose={() => setEditingLog(null)} log={editingLog} />
    </div>
  );
}
