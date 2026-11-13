import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { newId } from '@/lib/utils';
import { sendEmail } from '@/lib/email';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { useData } from './DataContext';

// Group-study features: study sessions (+ RSVPs), shared resources, focus
// time logs and the Q&A board. Works like DataContext: changes show at once,
// are saved to Supabase, roll back on error, and arrive live for others.

const StudyContext = createContext();

export const RESOURCES_BUCKET = 'study-resources';
const LOG_HISTORY_DAYS = 120;
const TIMER_KEY = 'tasksync_focus_timer';

const upsertById = (list, row) =>
  list.some(r => r.id === row.id) ? list.map(r => (r.id === row.id ? { ...r, ...row } : r)) : [row, ...list];
const removeById = (list, id) => list.filter(r => r.id !== id);
const nowIso = () => new Date().toISOString();
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Short two-note chime when a timer phase ends.
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // sound is optional
  }
}

const defaultTimer = {
  phase: 'focus',        // 'focus' | 'break'
  status: 'idle',        // 'idle' | 'running' | 'paused'
  focusMinutes: 25,
  breakMinutes: 5,
  endsAt: null,          // ms timestamp while running
  remainingMs: 25 * 60 * 1000,
  phaseStartedAt: null,  // ms timestamp the current focus phase began
  teamId: '',
  projectId: '',
  completedToday: 0,
  completedDay: null,
};

function loadTimer() {
  try {
    const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null');
    return saved ? { ...defaultTimer, ...saved } : defaultTimer;
  } catch {
    return defaultTimer;
  }
}

export function StudyProvider({ children }) {
  const { user } = useAuth();
  const { addNotification, notifyError } = useNotifications();
  const { teams, teamMembers, profiles, canManageTeam } = useData();
  const userId = user?.id;

  const [sessions, setSessions] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [resources, setResources] = useState([]);
  const [studyLogs, setStudyLogs] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async (failureMessage, query) => {
    const { data, error } = await query;
    if (error) {
      console.error(failureMessage, error);
      notifyError(`${failureMessage}: ${error.message}`);
      return { ok: false, error };
    }
    return { ok: true, data };
  }, [notifyError]);

  const notifyByEmail = useCallback((type, payload) => {
    sendEmail(type, payload).then((result) => {
      if (!result.ok) notifyError(result.error, 'Email not sent');
    });
  }, [notifyError]);

  // Reload when the set of visible groups changes (joined or left a group).
  const teamKey = teams.map(t => t.id).sort().join(',');

  const loadAll = useCallback(async () => {
    if (!userId) return;
    const since = new Date(Date.now() - LOG_HISTORY_DAYS * 86400000).toISOString();
    const results = await Promise.all([
      supabase.from('study_sessions').select('*').order('starts_at', { ascending: true }),
      supabase.from('session_rsvps').select('*'),
      supabase.from('study_resources').select('*').order('created_at', { ascending: false }),
      supabase.from('study_logs').select('*').gte('studied_at', since).order('studied_at', { ascending: false }),
      supabase.from('questions').select('*').order('created_at', { ascending: false }),
      supabase.from('answers').select('*').order('created_at', { ascending: true }),
    ]);
    const failed = results.find(r => r.error);
    if (failed) notifyError(`Could not load study data: ${failed.error.message}`);
    const [s, r, res, logs, q, a] = results.map(x => x.data || []);
    setSessions(s);
    setRsvps(r);
    setResources(res);
    setStudyLogs(logs);
    setQuestions(q);
    setAnswers(a);
    setLoading(false);
  }, [userId, notifyError]);

  useEffect(() => {
    loadAll();
  }, [loadAll, teamKey]);

  useEffect(() => {
    if (!userId) return undefined;
    const tables = {
      study_sessions: setSessions,
      session_rsvps: setRsvps,
      study_resources: setResources,
      study_logs: setStudyLogs,
      questions: setQuestions,
      answers: setAnswers,
    };
    const channel = supabase.channel(`tasksync-study-${userId}`);
    Object.entries(tables).forEach(([table, setter]) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (payload.eventType === 'DELETE') {
          if (payload.old?.id) setter(prev => removeById(prev, payload.old.id));
        } else if (payload.new?.id) {
          setter(prev => upsertById(prev, payload.new));
        }
      });
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const groupMemberIds = useCallback(
    (teamId) => teamMembers.filter(tm => tm.team_id === teamId).map(tm => tm.user_id),
    [teamMembers]
  );
  const teamName = (teamId) => teams.find(t => t.id === teamId)?.name || 'your group';
  const canManage = (item) => Boolean(item) && (item.created_by === userId || canManageTeam(item.team_id));

  // ----------------------------------------------------------------------
  // Study sessions
  // ----------------------------------------------------------------------
  const createSession = async (data) => {
    const session = {
      id: newId(),
      team_id: data.team_id,
      project_id: data.project_id || null,
      title: data.title,
      agenda: data.agenda || '',
      location: data.location || '',
      meeting_url: data.meeting_url || '',
      starts_at: data.starts_at,
      duration_minutes: data.duration_minutes || 60,
      created_by: userId,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    setSessions(prev => upsertById(prev, session));
    const saved = await run('Could not schedule the session', supabase.from('study_sessions').insert(session));
    if (!saved.ok) {
      setSessions(prev => removeById(prev, session.id));
      return null;
    }
    await setRsvp(session.id, 'going', { quiet: true });

    groupMemberIds(session.team_id).filter(id => id !== userId).forEach((memberId) => {
      addNotification({
        title: 'New study session',
        message: `${user?.full_name || 'A member'} scheduled "${session.title}" for ${teamName(session.team_id)}.`,
        type: 'session',
        userId: memberId,
      });
    });
    notifyByEmail('session_scheduled', {
      session_id: session.id,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return session;
  };

  const updateSession = async (id, updates) => {
    const previous = sessions.find(s => s.id === id);
    if (!previous) return null;
    const clean = { ...updates, updated_at: nowIso() };
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, ...clean } : s)));
    const saved = await run('Could not update the session', supabase.from('study_sessions').update(clean).eq('id', id));
    if (!saved.ok) {
      setSessions(prev => upsertById(prev, previous));
      return null;
    }
    return { ...previous, ...clean };
  };

  const deleteSession = async (id) => {
    const previous = sessions.find(s => s.id === id);
    setSessions(prev => removeById(prev, id));
    const saved = await run('Could not cancel the session', supabase.from('study_sessions').delete().eq('id', id));
    if (!saved.ok && previous) {
      setSessions(prev => upsertById(prev, previous));
      return;
    }
    if (previous) {
      groupMemberIds(previous.team_id).filter(uid => uid !== userId).forEach((memberId) => {
        addNotification({
          title: 'Session cancelled',
          message: `"${previous.title}" in ${teamName(previous.team_id)} was cancelled.`,
          type: 'session',
          userId: memberId,
        });
      });
    }
  };

  const setRsvp = async (sessionId, status, { quiet = false } = {}) => {
    const existing = rsvps.find(r => r.session_id === sessionId && r.user_id === userId);
    const row = { id: existing?.id || newId(), session_id: sessionId, user_id: userId, status, updated_at: nowIso() };
    setRsvps(prev => upsertById(prev, row));
    const query = existing
      ? supabase.from('session_rsvps').update({ status, updated_at: row.updated_at }).eq('id', existing.id)
      : supabase.from('session_rsvps').insert(row);
    const saved = quiet ? await query : await run('Could not save your answer', query);
    if (saved.error || saved.ok === false) {
      setRsvps(prev => (existing ? upsertById(prev, existing) : removeById(prev, row.id)));
      return false;
    }
    return true;
  };

  // ----------------------------------------------------------------------
  // Resources
  // ----------------------------------------------------------------------
  const addResource = async ({ team_id, project_id, kind, title, description, url, body, file }) => {
    let fileFields = {};
    if (kind === 'file') {
      if (!file) return null;
      const safeName = file.name.replace(/[^\w.-]+/g, '_');
      const path = `${team_id}/${newId()}-${safeName}`;
      const upload = await run('Could not upload the file',
        supabase.storage.from(RESOURCES_BUCKET).upload(path, file, { contentType: file.type || undefined }));
      if (!upload.ok) return null;
      fileFields = { file_path: path, file_name: file.name, file_size: file.size, file_type: file.type || 'application/octet-stream' };
    }
    const resource = {
      id: newId(),
      team_id,
      project_id: project_id || null,
      kind,
      title,
      description: description || '',
      url: kind === 'link' ? url : null,
      body: kind === 'note' ? body : null,
      ...fileFields,
      created_by: userId,
      created_at: nowIso(),
    };
    setResources(prev => upsertById(prev, resource));
    const saved = await run('Could not save the resource', supabase.from('study_resources').insert(resource));
    if (!saved.ok) {
      setResources(prev => removeById(prev, resource.id));
      if (fileFields.file_path) await supabase.storage.from(RESOURCES_BUCKET).remove([fileFields.file_path]);
      return null;
    }
    return resource;
  };

  const deleteResource = async (resource) => {
    setResources(prev => removeById(prev, resource.id));
    const saved = await run('Could not remove the resource', supabase.from('study_resources').delete().eq('id', resource.id));
    if (!saved.ok) {
      setResources(prev => upsertById(prev, resource));
      return;
    }
    if (resource.file_path) {
      const { error } = await supabase.storage.from(RESOURCES_BUCKET).remove([resource.file_path]);
      if (error) console.warn('Resource file not removed:', error.message);
    }
  };

  // Edit a resource's text fields (a file itself is replaced by re-uploading).
  const updateResource = async (id, updates) => {
    const previous = resources.find(r => r.id === id);
    if (!previous) return null;
    const allowed = ['title', 'description', 'url', 'body', 'project_id'];
    const clean = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
    if ('project_id' in clean) clean.project_id = clean.project_id || null;
    setResources(prev => prev.map(r => (r.id === id ? { ...r, ...clean } : r)));
    const saved = await run('Could not update the resource', supabase.from('study_resources').update(clean).eq('id', id));
    if (!saved.ok) {
      setResources(prev => upsertById(prev, previous));
      return null;
    }
    return { ...previous, ...clean };
  };

  const getResourceFileUrl = async (resource) => {
    const result = await run('Could not open the file',
      supabase.storage.from(RESOURCES_BUCKET).createSignedUrl(resource.file_path, 300));
    return result.ok ? result.data.signedUrl : null;
  };

  // ----------------------------------------------------------------------
  // Focus time logs
  // ----------------------------------------------------------------------
  const logStudy = useCallback(async ({ minutes, team_id, project_id, note, studied_at }) => {
    const entry = {
      id: newId(),
      user_id: userId,
      team_id: team_id || null,
      project_id: project_id || null,
      minutes: Math.max(1, Math.min(720, Math.round(minutes))),
      note: note || '',
      studied_at: studied_at || nowIso(),
      created_at: nowIso(),
    };
    setStudyLogs(prev => [entry, ...prev]);
    const saved = await run('Could not log your study time', supabase.from('study_logs').insert(entry));
    if (!saved.ok) {
      setStudyLogs(prev => removeById(prev, entry.id));
      return null;
    }
    return entry;
  }, [userId, run]);

  // Correct your own entry: minutes, note, subject or date.
  const updateLog = async (id, updates) => {
    const previous = studyLogs.find(l => l.id === id);
    if (!previous) return null;
    const clean = { ...updates };
    if ('minutes' in clean) clean.minutes = Math.max(1, Math.min(720, Math.round(clean.minutes)));
    if ('project_id' in clean) clean.project_id = clean.project_id || null;
    if ('team_id' in clean) clean.team_id = clean.team_id || null;
    setStudyLogs(prev => prev.map(l => (l.id === id ? { ...l, ...clean } : l)));
    const saved = await run('Could not update the entry', supabase.from('study_logs').update(clean).eq('id', id));
    if (!saved.ok) {
      setStudyLogs(prev => upsertById(prev, previous));
      return null;
    }
    return { ...previous, ...clean };
  };

  const deleteLog = async (id) => {
    const previous = studyLogs.find(l => l.id === id);
    setStudyLogs(prev => removeById(prev, id));
    const saved = await run('Could not delete the entry', supabase.from('study_logs').delete().eq('id', id));
    if (!saved.ok && previous) setStudyLogs(prev => upsertById(prev, previous));
  };

  // ----------------------------------------------------------------------
  // Q&A
  // ----------------------------------------------------------------------
  const askQuestion = async ({ team_id, project_id, title, body }) => {
    const question = {
      id: newId(), team_id, project_id: project_id || null, title, body: body || '',
      created_by: userId, accepted_answer_id: null, created_at: nowIso(), updated_at: nowIso(),
    };
    setQuestions(prev => upsertById(prev, question));
    const saved = await run('Could not post the question', supabase.from('questions').insert(question));
    if (!saved.ok) {
      setQuestions(prev => removeById(prev, question.id));
      return null;
    }
    groupMemberIds(team_id).filter(id => id !== userId).forEach((memberId) => {
      addNotification({
        title: 'New question',
        message: `${user?.full_name || 'A member'} asked: "${title}"`,
        type: 'question',
        userId: memberId,
      });
    });
    return question;
  };

  const answerQuestion = async (question, body) => {
    const answer = { id: newId(), question_id: question.id, body, created_by: userId, created_at: nowIso() };
    setAnswers(prev => [...prev, answer]);
    const saved = await run('Could not post the answer', supabase.from('answers').insert(answer));
    if (!saved.ok) {
      setAnswers(prev => removeById(prev, answer.id));
      return null;
    }
    if (question.created_by && question.created_by !== userId) {
      addNotification({
        title: 'New answer',
        message: `${user?.full_name || 'Someone'} answered your question "${question.title}".`,
        type: 'question',
        userId: question.created_by,
      });
    }
    return answer;
  };

  const acceptAnswer = async (question, answerId) => {
    const previous = question.accepted_answer_id;
    setQuestions(prev => prev.map(q => (q.id === question.id ? { ...q, accepted_answer_id: answerId } : q)));
    const saved = await run('Could not mark the answer',
      supabase.from('questions').update({ accepted_answer_id: answerId, updated_at: nowIso() }).eq('id', question.id));
    if (!saved.ok) {
      setQuestions(prev => prev.map(q => (q.id === question.id ? { ...q, accepted_answer_id: previous } : q)));
      return;
    }
    const answer = answers.find(a => a.id === answerId);
    if (answer?.created_by && answer.created_by !== userId) {
      addNotification({
        title: 'Best answer',
        message: `Your answer to "${question.title}" was marked as the best answer.`,
        type: 'question',
        userId: answer.created_by,
      });
    }
  };

  const updateQuestion = async (question, { title, body, project_id }) => {
    const changes = { title, body: body || '', project_id: project_id || null, updated_at: nowIso() };
    setQuestions(prev => prev.map(q => (q.id === question.id ? { ...q, ...changes } : q)));
    const saved = await run('Could not update the question', supabase.from('questions').update(changes).eq('id', question.id));
    if (!saved.ok) {
      setQuestions(prev => upsertById(prev, question));
      return null;
    }
    return { ...question, ...changes };
  };

  const updateAnswer = async (answer, body) => {
    const changes = { body, updated_at: nowIso() };
    setAnswers(prev => prev.map(a => (a.id === answer.id ? { ...a, ...changes } : a)));
    const saved = await run('Could not update the answer', supabase.from('answers').update(changes).eq('id', answer.id));
    if (!saved.ok) {
      setAnswers(prev => prev.map(a => (a.id === answer.id ? answer : a)));
      return null;
    }
    return { ...answer, ...changes };
  };

  const deleteQuestion = async (question) => {
    setQuestions(prev => removeById(prev, question.id));
    const saved = await run('Could not delete the question', supabase.from('questions').delete().eq('id', question.id));
    if (!saved.ok) setQuestions(prev => upsertById(prev, question));
  };

  const deleteAnswer = async (answer) => {
    setAnswers(prev => removeById(prev, answer.id));
    const saved = await run('Could not delete the answer', supabase.from('answers').delete().eq('id', answer.id));
    if (!saved.ok) setAnswers(prev => [...prev, answer]);
  };

  // ----------------------------------------------------------------------
  // Focus timer (persists across pages and reloads)
  // ----------------------------------------------------------------------
  const [timer, setTimer] = useState(loadTimer);
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef(timer);
  timerRef.current = timer;

  useEffect(() => {
    localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
  }, [timer]);

  // Keep several open tabs in step: adopt the timer another tab saved.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== TIMER_KEY || !event.newValue) return;
      try {
        setTimer({ ...defaultTimer, ...JSON.parse(event.newValue) });
        setNow(Date.now());
      } catch {
        // ignore malformed values
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (timer.status !== 'running') return undefined;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [timer.status]);

  const remainingMs = timer.status === 'running' && timer.endsAt
    ? Math.max(0, timer.endsAt - now)
    : timer.remainingMs;

  // When a phase reaches zero: log the focus time, chime, switch phase.
  useEffect(() => {
    const t = timerRef.current;
    if (t.status !== 'running' || !t.endsAt || now < t.endsAt) return;
    // If another tab already finished this phase, take its state instead of
    // logging the same block twice.
    try {
      const stored = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null');
      if (stored && (stored.phase !== t.phase || stored.endsAt !== t.endsAt)) {
        setTimer({ ...defaultTimer, ...stored });
        return;
      }
    } catch {
      // fall through and handle it here
    }
    const today = dayKey(new Date());
    const claim = (next) => {
      localStorage.setItem(TIMER_KEY, JSON.stringify(next)); // claim before other tabs act
      setTimer(next);
    };
    if (t.phase === 'focus') {
      playChime();
      addNotification({ title: 'Focus session complete', message: `${t.focusMinutes} minutes logged. Time for a ${t.breakMinutes}-minute break.`, type: 'focus' });
      const breakMs = t.breakMinutes * 60000;
      claim({
        ...t,
        phase: 'break',
        status: 'running',
        endsAt: Date.now() + breakMs,
        remainingMs: breakMs,
        phaseStartedAt: null,
        completedToday: (t.completedDay === today ? t.completedToday : 0) + 1,
        completedDay: today,
      });
      // Logged after claiming, so only the tab that claimed the block logs it.
      logStudy({ minutes: t.focusMinutes, team_id: t.teamId, project_id: t.projectId, studied_at: new Date(t.endsAt).toISOString() });
    } else {
      playChime();
      addNotification({ title: 'Break over', message: 'Ready for the next focus session?', type: 'focus' });
      claim({ ...t, phase: 'focus', status: 'idle', endsAt: null, remainingMs: t.focusMinutes * 60000, phaseStartedAt: null });
    }
  }, [now, logStudy, addNotification]);

  const timerControls = useMemo(() => ({
    start: () => setTimer(t => {
      const ms = t.status === 'paused' ? t.remainingMs : (t.phase === 'focus' ? t.focusMinutes : t.breakMinutes) * 60000;
      setNow(Date.now());
      return {
        ...t,
        status: 'running',
        endsAt: Date.now() + ms,
        remainingMs: ms,
        phaseStartedAt: t.phase === 'focus' ? (t.phaseStartedAt || Date.now()) : null,
      };
    }),
    pause: () => setTimer(t => (t.status === 'running'
      ? { ...t, status: 'paused', remainingMs: Math.max(0, t.endsAt - Date.now()), endsAt: null }
      : t)),
    reset: () => setTimer(t => ({
      ...t, phase: 'focus', status: 'idle', endsAt: null, remainingMs: t.focusMinutes * 60000, phaseStartedAt: null,
    })),
    skipBreak: () => setTimer(t => ({
      ...t, phase: 'focus', status: 'idle', endsAt: null, remainingMs: t.focusMinutes * 60000, phaseStartedAt: null,
    })),
    configure: (changes) => setTimer(t => {
      const next = { ...t, ...changes };
      if (t.status === 'idle') next.remainingMs = (next.phase === 'focus' ? next.focusMinutes : next.breakMinutes) * 60000;
      return next;
    }),
  }), []);

  // Stop a focus phase early and log the minutes studied so far.
  const stopAndLog = async () => {
    const t = timerRef.current;
    if (t.phase !== 'focus' || t.status === 'idle') return null;
    const total = t.focusMinutes * 60000;
    const left = t.status === 'running' ? Math.max(0, t.endsAt - Date.now()) : t.remainingMs;
    const minutes = Math.floor((total - left) / 60000);
    timerControls.reset();
    if (minutes < 1) return null;
    return logStudy({ minutes, team_id: t.teamId, project_id: t.projectId });
  };

  // ----------------------------------------------------------------------
  // Study statistics
  // ----------------------------------------------------------------------
  const myLogs = studyLogs.filter(l => l.user_id === userId);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // Monday

  const sumMinutes = (logs) => logs.reduce((total, l) => total + (l.minutes || 0), 0);
  const minutesToday = sumMinutes(myLogs.filter(l => new Date(l.studied_at) >= startOfToday));
  const minutesThisWeek = sumMinutes(myLogs.filter(l => new Date(l.studied_at) >= startOfWeek));

  // Consecutive days with study time, counting back from today (or yesterday
  // if nothing has been logged yet today).
  const streakDays = (() => {
    const days = new Set(myLogs.map(l => dayKey(new Date(l.studied_at))));
    const cursor = new Date(startOfToday);
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (days.has(dayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  })();

  const getLeaderboard = (teamId, days = 7) => {
    const since = new Date(startOfToday);
    since.setDate(since.getDate() - (days - 1));
    const memberIds = groupMemberIds(teamId);
    return memberIds
      .map((memberId) => ({
        userId: memberId,
        profile: profiles.find(p => p.id === memberId),
        minutes: sumMinutes(studyLogs.filter(l => l.user_id === memberId && l.team_id === teamId && new Date(l.studied_at) >= since)),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  };

  const upcomingSessions = sessions
    .filter(s => new Date(s.starts_at).getTime() + s.duration_minutes * 60000 >= Date.now())
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  return (
    <StudyContext.Provider
      value={{
        loading,
        refresh: loadAll,
        canManage,
        // sessions
        sessions,
        upcomingSessions,
        rsvps,
        createSession,
        updateSession,
        deleteSession,
        setRsvp,
        // resources
        resources,
        addResource,
        updateResource,
        deleteResource,
        getResourceFileUrl,
        // focus
        studyLogs,
        logStudy,
        updateLog,
        deleteLog,
        timer,
        remainingMs,
        timerControls,
        stopAndLog,
        minutesToday,
        minutesThisWeek,
        streakDays,
        getLeaderboard,
        // Q&A
        questions,
        answers,
        askQuestion,
        answerQuestion,
        acceptAnswer,
        updateQuestion,
        updateAnswer,
        deleteQuestion,
        deleteAnswer,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used within StudyProvider');
  return context;
}

export function formatMinutes(total) {
  const minutes = Math.round(total || 0);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
