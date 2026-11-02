import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useData } from '@/context/DataContext';

export function CreateProjectModal({ isOpen, onClose, initialTeamId = null }) {
  // Any group you belong to can get a new subject.
  const { memberTeams: teams, createProject } = useData();

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
    if (isOpen) {
      setName('');
      setDescription('');
      setTeamId(initialTeamId || (teams[0] ? teams[0].id : ''));
      setPriority('Medium');
      setStatus('Planning');
      setCategory('Course');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setError('');
    }
    // Reset only when the modal opens.
  }, [isOpen, initialTeamId]);

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
    const created = await createProject({
      name: name.trim(),
      description: description.trim(),
      team_id: teamId,
      priority,
      status,
      category,
      start_date: startDate,
      due_date: dueDate
    });
    setSaving(false);

    if (created) onClose();
    else setError('The subject could not be saved. Check the message in the corner and try again.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add a Subject"
      description="Add a course, exam or assignment for the group to work on."
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
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </Select>

          <Select
            label="Initial Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Planning">Planning</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
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
            {saving ? 'Saving...' : 'Add Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
