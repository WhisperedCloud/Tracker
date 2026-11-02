import React, { useMemo, useState } from 'react';
import { CalendarClock, MapPin, Video, Plus, Pencil, Trash2, Check, HelpCircle, X as XIcon, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useDialog } from '@/components/ui/DialogProvider';
import { SessionModal } from '@/components/study/SessionModal';
import { GroupSubjectFilter, EmptyState } from '@/components/study/GroupSubjectFields';
import { useData } from '@/context/DataContext';
import { useStudy } from '@/context/StudyContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const RSVP_OPTIONS = [
  { value: 'going', label: 'Going', Icon: Check, on: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'maybe', label: 'Maybe', Icon: HelpCircle, on: 'bg-amber-500 text-white border-amber-500' },
  { value: 'declined', label: "Can't", Icon: XIcon, on: 'bg-slate-600 text-white border-slate-600' },
];

export function SessionCard({ session, index = 0, onEdit }) {
  const { user } = useAuth();
  const { teams, projects, profiles } = useData();
  const { rsvps, setRsvp, deleteSession, canManage } = useStudy();
  const { confirm } = useDialog();

  const start = new Date(session.starts_at);
  const end = new Date(start.getTime() + session.duration_minutes * 60000);
  const isPast = end.getTime() < Date.now();
  const isLive = start.getTime() <= Date.now() && !isPast;
  const team = teams.find(t => t.id === session.team_id);
  const subject = projects.find(p => p.id === session.project_id);
  const sessionRsvps = rsvps.filter(r => r.session_id === session.id);
  const mine = sessionRsvps.find(r => r.user_id === user?.id)?.status;
  const going = sessionRsvps.filter(r => r.status === 'going');
  const maybe = sessionRsvps.filter(r => r.status === 'maybe').length;

  const timeLabel = `${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(start)} to ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(end)}`;

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Cancel this session?', message: `"${session.title}" will be removed for everyone in the group.`, confirmText: 'Cancel session', cancelText: 'Keep it' });
    if (ok) deleteSession(session.id);
  };

  return (
    <Card index={index} className={cn('p-5 flex flex-col sm:flex-row gap-5', isPast && 'opacity-75')}>
      {/* Date tile */}
      <div className={cn(
        'shrink-0 w-16 h-[4.5rem] rounded-2xl flex flex-col items-center justify-center border',
        isLive ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-primary-50 border-primary-100 text-primary-800 dark:bg-primary-950/50 dark:border-primary-900 dark:text-primary-200'
      )}>
        <span className="text-[10px] font-bold uppercase tracking-wider">{new Intl.DateTimeFormat(undefined, { month: 'short' }).format(start)}</span>
        <span className="text-2xl font-bold leading-none mt-0.5">{start.getDate()}</span>
        <span className="text-[10px] font-medium mt-0.5">{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(start)}</span>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-300">
              {team?.name || 'Study group'}{subject ? ` · ${subject.name}` : ''}
            </p>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">{session.title}</h3>
          </div>
          <div className="flex items-center gap-1">
            {isLive && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Happening now</span>}
            {canManage(session) && !isPast && (
              <>
                <button type="button" onClick={() => onEdit(session)} aria-label="Edit session" className="p-1.5 rounded-lg text-slate-400 hover:text-primary-700 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="w-4 h-4" /></button>
                <button type="button" onClick={handleDelete} aria-label="Cancel session" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{timeLabel} ({session.duration_minutes} min)</span>
          {session.location && <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{session.location}</span>}
          {session.meeting_url && (
            <a href={session.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-primary-700 dark:text-primary-300 hover:underline">
              <Video className="w-3.5 h-3.5" />Join meeting
            </a>
          )}
        </div>

        {session.agenda && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{session.agenda}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {going.slice(0, 5).map(r => {
                const p = profiles.find(pr => pr.id === r.user_id);
                return <Avatar key={r.id} src={p?.avatar_url} name={p?.full_name} size="xs" className="ring-2 ring-surface dark:ring-slate-900" />;
              })}
            </div>
            <span className="text-[11px] text-slate-500">
              {going.length} going{maybe ? `, ${maybe} maybe` : ''}
            </span>
          </div>

          {!isPast && (
            <div role="radiogroup" aria-label="Your answer" className="flex items-center gap-1.5">
              {RSVP_OPTIONS.map(({ value, label, Icon, on }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mine === value}
                  onClick={() => setRsvp(session.id, value)}
                  className={cn(
                    'inline-flex items-center gap-1 h-8 px-3 rounded-lg border text-xs font-semibold transition-colors',
                    mine === value ? on : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function StudySessionsPage({ teamId: fixedTeamId = null }) {
  const { memberTeams } = useData();
  const { sessions } = useStudy();
  const [tab, setTab] = useState('upcoming');
  const [teamFilter, setTeamFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [modal, setModal] = useState({ open: false, session: null });

  const teamId = fixedTeamId || teamFilter;
  const list = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter(s => teamId === 'all' || s.team_id === teamId)
      .filter(s => subjectFilter === 'all' || s.project_id === subjectFilter)
      .filter(s => {
        const ended = new Date(s.starts_at).getTime() + s.duration_minutes * 60000 < now;
        return tab === 'upcoming' ? !ended : ended;
      })
      .sort((a, b) => (tab === 'upcoming' ? 1 : -1) * (new Date(a.starts_at) - new Date(b.starts_at)));
  }, [sessions, teamId, subjectFilter, tab]);

  return (
    <div className="space-y-6">
      {!fixedTeamId && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Study Sessions</h1>
            <p className="text-xs text-slate-500 mt-1">Plan group study time, share the agenda and see who is coming.</p>
          </div>
          <Button onClick={() => setModal({ open: true, session: null })} disabled={memberTeams.length === 0}>
            <Plus className="w-4 h-4" />Schedule session
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Sessions" className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
          {[['upcoming', 'Upcoming'], ['past', 'Past']].map(([v, label]) => (
            <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
              className={cn('px-3 py-1.5 rounded-md transition-colors', tab === v ? 'bg-surface dark:bg-slate-900 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-slate-600 dark:text-slate-400')}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <GroupSubjectFilter teamId={teamId} projectId={subjectFilter} onTeamChange={setTeamFilter} onProjectChange={setSubjectFilter} hideTeam={Boolean(fixedTeamId)} />
          {fixedTeamId && (
            <Button size="sm" onClick={() => setModal({ open: true, session: null })}>
              <Plus className="w-4 h-4" />Schedule
            </Button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={tab === 'upcoming' ? 'No upcoming sessions' : 'No past sessions yet'}
          text={tab === 'upcoming' ? 'Schedule a session so your group can study together.' : 'Finished sessions show up here.'}
          action={tab === 'upcoming' && memberTeams.length > 0 && (
            <Button size="sm" onClick={() => setModal({ open: true, session: null })}><Plus className="w-4 h-4" />Schedule session</Button>
          )}
        />
      ) : (
        <div className="space-y-3">
          {list.map((s, i) => <SessionCard key={s.id} session={s} index={i} onEdit={(session) => setModal({ open: true, session })} />)}
        </div>
      )}

      <SessionModal
        isOpen={modal.open}
        session={modal.session}
        defaultTeamId={fixedTeamId || (teamFilter !== 'all' ? teamFilter : '')}
        onClose={() => setModal({ open: false, session: null })}
      />
    </div>
  );
}
