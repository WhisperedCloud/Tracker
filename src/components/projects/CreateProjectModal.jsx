import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useData } from '@/context/DataContext';
import { SUBJECT_PRIORITIES, SUBJECT_STATUSES } from '@/lib/subjects';

// Adds a subject, or edits one when `project` is passed.
export function CreateProjectModal({ isOpen, onClose, initialTeamId = null, project = null }) {
  // Any group you belong to can get a new subject.
  const { memberTeams, teams: allTeams, createProject, updateProject } = useData();
  const isEditing = Boolean(project);
  // A subject stays in its group (its tasks belong to that group).
  const teams = isEditing ? allTeams.filter(t => t.id === project.team_id) : memberTeams;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Planning');
  const [category, setCategory] = useState('Course');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setTeamId(project.team_id);
      setPriority(project.priority || 'Medium');
      setStatus(project.status || 'Planning');
      setCategory(project.category || 'Course');
      setStartDate(project.start_date || '');
      setDueDate(project.due_date || '');
    } else {
      setName('');
      setDescription('');
      setTeamId(initialTeamId || (teams[0] ? teams[0].id : ''));
      setPriority('Medium');
      setStatus('Planning');
      setCategory('Course');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
    }
    setError('');
    // Reset only when the modal opens.
  }, [isOpen, initialTeamId, project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Subject name is required.');
      return;
    }
    if (!teamId) {
      setError('Please choose a study group.');
      return;
    }

    if (dueDate && startDate && dueDate < startDate) {
      setError('The deadline cannot be before the start date.');
      return;
    }

    setSaving(true);
    const fields = {
      name: name.trim(),
      description: description.trim(),
      priority,
      category,
      start_date: startDate,
      due_date: dueDate
    };
    let saved;
    if (isEditing) {
      // Only send the status when it changed, so an automatic subject stays automatic.
      saved = await updateProject(project.id, status !== project.status ? { ...fields, status } : fields);
    } else {
      saved = await createProject({ ...fields, team_id: teamId });
    }
    setSaving(false);

    if (saved) onClose();
    else setError('The subject could not be saved. Check the message in the corner and try again.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Subject' : 'Add a Subject'}
      description={isEditing ? 'Change the details, priority or status of this subject.' : 'Add a course, exam or assignment for the group to work on.'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <Input
          label="Subject Name *"
          placeholder="e.g. Develop an E-commerce Website"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="w-full">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Outline goals, architecture, deliverables, and requirements..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-surface dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Study Group *"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            disabled={isEditing}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Course">Course</option>
            <option value="Exam Prep">Exam Prep</option>
            <option value="Assignment">Assignment</option>
            <option value="Project">Project</option>
            <option value="Revision">Revision</option>
            <option value="Research">Research</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {SUBJECT_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>

          {isEditing ? (
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              helperText={project.status_manual ? `Set by hand. Pick "${project.auto_status}" to follow the tasks again.` : 'Follows the tasks automatically. Pick another status to set it by hand.'}
            >
              {!SUBJECT_STATUSES.includes(project.status) && <option value={project.status} disabled>{project.status}</option>}
              {SUBJECT_STATUSES.map(s => (
                <option key={s} value={s}>{s}{s === project.auto_status ? ' (auto)' : ''}</option>
              ))}
            </Select>
          ) : (
            <div className="w-full">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Status</span>
              <p className="text-xs text-slate-500 leading-relaxed pt-1">
                Starts in Planning and updates by itself as tasks are started and completed.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            type="date"
            label="Target Deadline"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || teams.length === 0}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
