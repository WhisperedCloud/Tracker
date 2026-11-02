import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { GroupSubjectFields } from './GroupSubjectFields';
import { useData } from '@/context/DataContext';
import { useStudy } from '@/context/StudyContext';

const pad = (n) => String(n).padStart(2, '0');
const toDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Times every 15 minutes, shown in 12-hour format.
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const value = `${pad(h)}:${pad(m)}`;
  const label = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, h, m));
  return { value, label };
});
const DURATIONS = [30, 45, 60, 90, 120, 180, 240];

// 90 -> "1 hour 30 min", 120 -> "2 hours", 45 -> "45 minutes"
export const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = `${h} hour${h === 1 ? '' : 's'}`;
  return m ? `${hours} ${m} min` : hours;
};

const nextRoundedHour = () => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
};

// Schedule or edit a study session.
export function SessionModal({ isOpen, onClose, session = null, defaultTeamId = '', defaultDate = '' }) {
  const { memberTeams } = useData();
  const { createSession, updateSession } = useStudy();
  const isEditing = Boolean(session);

  const [teamId, setTeamId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [agenda, setAgenda] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState('60');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSaving(false);
    if (session) {
      const start = new Date(session.starts_at);
      setTeamId(session.team_id);
      setProjectId(session.project_id || '');
      setTitle(session.title);
      setAgenda(session.agenda || '');
      setDate(toDateKey(start));
      setTime(`${pad(start.getHours())}:${pad(Math.floor(start.getMinutes() / 15) * 15)}`);
      setDuration(String(session.duration_minutes));
      setLocation(session.location || '');
      setMeetingUrl(session.meeting_url || '');
    } else {
      const start = nextRoundedHour();
      setTeamId(defaultTeamId || memberTeams[0]?.id || '');
      setProjectId('');
      setTitle('');
      setAgenda('');
      setDate(defaultDate || toDateKey(start));
      setTime(`${pad(start.getHours())}:00`);
      setDuration('60');
      setLocation('');
      setMeetingUrl('');
    }
    // Reset only when the modal opens or switches session.
  }, [isOpen, session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError('Give the session a title.');
    if (!teamId) return setError('Choose a study group.');
    if (!date) return setError('Pick a date.');
    if (meetingUrl && !/^https?:\/\//i.test(meetingUrl.trim())) return setError('The meeting link should start with https://');

    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const startsAt = new Date(y, m - 1, d, hh, mm);
    if (!isEditing && startsAt.getTime() < Date.now() - 5 * 60000) return setError('That time has already passed.');

    const fields = {
      team_id: teamId,
      project_id: projectId || null,
      title: title.trim(),
      agenda: agenda.trim(),
      location: location.trim(),
      meeting_url: meetingUrl.trim(),
      starts_at: startsAt.toISOString(),
      duration_minutes: Number(duration),
    };
    setSaving(true);
    const saved = isEditing ? await updateSession(session.id, fields) : await createSession(fields);
    setSaving(false);
    if (saved) onClose();
    else setError('The session could not be saved. Check the message in the corner and try again.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit study session' : 'Schedule a study session'}
      description="Everyone in the group gets a notification and an email."
      icon={<CalendarClock className="w-4 h-4" />}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="session-form" disabled={saving || memberTeams.length === 0}>
            {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Schedule session'}
          </Button>
        </>
      }
    >
      <form id="session-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}
        {memberTeams.length === 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            Join or create a study group first.
          </p>
        )}

        <Input label="Title *" placeholder="e.g. Chapter 5 revision before the quiz" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <GroupSubjectFields
          teamId={teamId}
          projectId={projectId}
          onTeamChange={setTeamId}
          onProjectChange={setProjectId}
          lockTeam={isEditing}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input type="date" label="Date *" value={date} onChange={(e) => setDate(e.target.value)} min={isEditing ? undefined : toDateKey(new Date())} />
          <Select label="Start time" value={time} onChange={(e) => setTime(e.target.value)}>
            {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Select label="Length" value={duration} onChange={(e) => setDuration(e.target.value)}>
            {DURATIONS.map(d => (
              <option key={d} value={String(d)}>{formatDuration(d)}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Place" placeholder="e.g. Library room 2B" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input label="Meeting link" placeholder="https://meet.google.com/..." value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
        </div>

        <Textarea label="Agenda" rows={3} placeholder="What will you cover? e.g. Go through past paper 2019, then quiz each other." value={agenda} onChange={(e) => setAgenda(e.target.value)} />
      </form>
    </Modal>
  );
}
