import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SmartWorkloadBalancer } from './SmartWorkloadBalancer';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Calendar, Layers } from 'lucide-react';

export function CreateTaskModal({ isOpen, onClose, initialProjectId = null, initialTeamId = null, initialParentTaskId = null }) {
  const { memberTeams: teams, projects, tasks, teamMembers, profiles, createTask, isMemberOf } = useData();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [parentTaskId, setParentTaskId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [showWorkloadBalancer, setShowWorkloadBalancer] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Anyone in the selected group can assign the task to any member of it.
  const isLeader = isMemberOf(teamId);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      const defaultTeamId = initialTeamId || (teams[0] ? teams[0].id : '');
      setTeamId(defaultTeamId);
      setProjectId(initialProjectId || '');
      setParentTaskId(initialParentTaskId || '');
      setAssignedTo(user?.id || '');
      setPriority('Medium');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setShowWorkloadBalancer(false);
      setError('');
    }
    // Reset only when the modal opens, not on every data change.
  }, [isOpen, initialProjectId, initialTeamId, initialParentTaskId]);

  const filteredProjects = teamId ? projects.filter(p => p.team_id === teamId) : projects;
  const filteredParentTasks = projectId ? tasks.filter(t => t.project_id === projectId && !t.parent_task_id) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!teamId) {
      setError('Please choose a study group.');
      return;
    }

    if (dueDate && startDate && dueDate < startDate) {
      setError('Due date cannot be before the start date.');
      return;
    }

    setSaving(true);
    const created = await createTask({
      title: title.trim(),
      description: description.trim(),
      team_id: teamId,
      project_id: projectId || null,
      parent_task_id: parentTaskId || null,
      assigned_to: isLeader ? (assignedTo || null) : user?.id,
      priority,
      status: 'To Do',
      progress: 0,
      start_date: startDate,
      due_date: dueDate,
    });
    setSaving(false);

    if (created) onClose();
    else setError('The task could not be saved. Check the message in the corner and try again.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={parentTaskId ? "Add Subtask" : "Create New Task"}
      description="Share study work, set deadlines and spread it fairly across the group."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        {teams.length === 0 && (
          <div className="p-3 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800">
            You need to be in a team to create team tasks. Use My Tasks for personal to-dos.
          </div>
        )}

        <Input
          label="Task Title *"
          placeholder="e.g. Implement Responsive Navigation Menu"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="w-full">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Provide context, acceptance criteria, or technical details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-surface dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Study Group *"
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setProjectId('');
              setParentTaskId('');
            }}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>

          <Select
            label="Subject (optional)"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setParentTaskId('');
            }}
          >
            <option value="">No subject</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Parent Task Selector for Subtasks */}
        {projectId && filteredParentTasks.length > 0 && (
          <Select
            label="Nest Under Parent Task (Optional)"
            value={parentTaskId}
            onChange={(e) => setParentTaskId(e.target.value)}
          >
            <option value="">None (Top-level task)</option>
            {filteredParentTasks.map((pt) => (
              <option key={pt.id} value={pt.id}>
                Main: {pt.title}
              </option>
            ))}
          </Select>
        )}

        {/* Workload balancer and assignee picker (any group member) */}
        {isLeader && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                Smart Workload Balancer
              </span>
              <button
                type="button"
                onClick={() => setShowWorkloadBalancer(!showWorkloadBalancer)}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                {showWorkloadBalancer ? "Hide Capacity Breakdown" : "View group workload"}
              </button>
            </div>

            {showWorkloadBalancer && teamId && (
              <div className="mb-3">
                <SmartWorkloadBalancer
                  teamId={teamId}
                  selectedMemberId={assignedTo}
                  onSelectMember={(uid) => setAssignedTo(uid)}
                />
              </div>
            )}

            <Select
              label="Assignee"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Unassigned</option>
              {teamMembers
                .filter(tm => tm.team_id === teamId)
                .map(tm => {
                  const profile = profiles.find(p => p.id === tm.user_id);
                  return (
                    <option key={tm.id} value={tm.user_id}>
                      {profile?.full_name || 'Member'}{tm.role === 'member' ? '' : ' (organizer)'}
                    </option>
                  );
                })}
            </Select>
          </div>
        )}

        {!isLeader && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Assignee
            </label>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
              {user?.full_name} (Self-assigned)
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              You can assign tasks once you are a member of this group.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </Select>

          <Input
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            type="date"
            label="Due Date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || teams.length === 0}>
            {saving ? 'Saving...' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
