import React, { useEffect, useState } from 'react';
import { User, Users2, Trash2, CalendarClock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useDialog } from '@/components/ui/DialogProvider';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatLong = (key) => {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(y, m - 1, d));
};

// Add a personal or team task from the calendar, or edit a personal task.
export function CalendarTaskModal({ isOpen, onClose, date, personalTask = null, onScheduleSession }) {
  const {
    memberTeams: teams, projects, teamMembers, profiles,
    createTask, createPersonalTask, updatePersonalTask, deletePersonalTask, isMemberOf,
  } = useData();
  const { user } = useAuth();
  const { confirm } = useDialog();

  const isEditing = Boolean(personalTask);
  const [kind, setKind] = useState('personal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('General');
  const [status, setStatus] = useState('To Do');
  const [teamId, setTeamId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSaving(false);
    if (personalTask) {
      setKind('personal');
      setTitle(personalTask.title || '');
      setDescription(personalTask.description || '');
      setPriority(personalTask.priority || 'Medium');
      setDueDate(personalTask.due_date || '');
      setCategory(personalTask.category || 'General');
      setStatus(personalTask.status || 'To Do');
    } else {
      setKind('personal');
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setDueDate(date || todayKey());
      setCategory('General');
      setStatus('To Do');
      setTeamId(teams[0]?.id || '');
      setProjectId('');
      setAssignedTo(user?.id || '');
    }
    // Reset only when the modal opens or switches target.
  }, [isOpen, date, personalTask]);

  // Any member of the group can assign the task to anyone in it.
  const isLeaderOfTeam = isMemberOf(teamId);
  const teamProjects = projects.filter(p => p.team_id === teamId);
  const members = teamMembers.filter(tm => tm.team_id === teamId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Give the task a title.');
      return;
    }
    if (kind === 'team' && !teamId) {
      setError('Choose a study group.');
      return;
    }

    setSaving(true);
    let saved;
    if (kind === 'personal') {
      const fields = { title: title.trim(), description: description.trim(), priority, due_date: dueDate, category, status };
      saved = isEditing ? await updatePersonalTask(personalTask.id, fields) : await createPersonalTask(fields);
    } else {
      const today = todayKey();
      saved = await createTask({
        title: title.trim(),
        description: description.trim(),
        team_id: teamId,
        project_id: projectId || null,
        assigned_to: isLeaderOfTeam ? (assignedTo || null) : user?.id,
        priority,
        status: 'To Do',
        // A task due in the past still needs a start date on or before its due date.
        start_date: dueDate && dueDate < today ? dueDate : today,
        due_date: dueDate,
      });
    }
    setSaving(false);
    if (saved) onClose();
    else setError('The task could not be saved. Check the message in the corner and try again.');
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete this task?',
      message: `"${personalTask.title}" will be permanently deleted.`,
      confirmText: 'Delete task',
    });
    if (!ok) return;
    await deletePersonalTask(personalTask.id);
    onClose();
  };

  const kindOption = (value, label, Icon, disabled = false) => (
    <button
      type="button"
      role="radio"
      aria-checked={kind === value}
      disabled={disabled}
      onClick={() => setKind(value)}
      className={cn(
        'flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-colors',
        kind === value
          ? 'bg-surface dark:bg-slate-900 text-primary-700 dark:text-primary-300 shadow-sm'
          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit personal task' : 'Add task'}
      description={dueDate ? `Due ${formatLong(dueDate)}` : 'No due date'}
      size="md"
      footer={
        <>
          {isEditing && (
            <Button type="button" variant="ghost" onClick={handleDelete} className="mr-auto text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="calendar-task-form" disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Add task'}
          </Button>
        </>
      }
    >
      <form id="calendar-task-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        {!isEditing && (
          <div>
            <div role="radiogroup" aria-label="Task type" className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {kindOption('personal', 'Personal', User)}
              {kindOption('team', 'Group task', Users2, teams.length === 0)}
              {onScheduleSession && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={false}
                  disabled={teams.length === 0}
                  onClick={() => onScheduleSession(dueDate)}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-40"
                >
                  <CalendarClock className="w-4 h-4" />
                  Session
                </button>
              )}
            </div>
            {teams.length === 0 && (
              <p className="text-[11px] text-slate-500 mt-1.5">Join or create a study group to add group tasks and sessions.</p>
            )}
          </div>
        )}

        <Input
          label="Title *"
          placeholder={kind === 'personal' ? 'e.g. Book dentist appointment' : 'e.g. Prepare sprint demo'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Textarea
          label="Notes"
          rows={2}
          placeholder="Optional details"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input type="date" label="Due date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </Select>
        </div>

        {kind === 'personal' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="General">General</option>
              <option value="Work">Work</option>
              <option value="Health">Health</option>
              <option value="Learning">Learning</option>
              <option value="Finance">Finance</option>
            </Select>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </Select>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Study group *"
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setProjectId('');
                  setAssignedTo(user?.id || '');
                }}
              >
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <Select label="Subject" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No subject</option>
                {teamProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            {isLeaderOfTeam ? (
              <Select label="Assignee" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map(tm => {
                  const p = profiles.find(pr => pr.id === tm.user_id);
                  return (
                    <option key={tm.id} value={tm.user_id}>
                      {p?.full_name || 'Member'}{tm.user_id === user?.id ? ' (you)' : ''}
                    </option>
                  );
                })}
              </Select>
            ) : (
              <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                This task will be assigned to you. Team leaders can reassign it.
              </p>
            )}
          </>
        )}
      </form>
    </Modal>
  );
}
