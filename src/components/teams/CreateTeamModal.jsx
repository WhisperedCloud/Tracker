import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useData } from '@/context/DataContext';

export function CreateTeamModal({ isOpen, onClose }) {
  const { createTeam, inviteMember } = useData();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [initialInvites, setInitialInvites] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Team name is required.');
      return;
    }

    const newTeam = createTeam({
      name: name.trim(),
      description: description.trim(),
      avatar_url: avatarUrl.trim() || `https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80`
    });

    if (initialInvites.trim()) {
      const emails = initialInvites.split(',').map(e => e.trim()).filter(Boolean);
      emails.forEach(email => {
        inviteMember({ teamId: newTeam.id, email, role: 'member' });
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Team"
      description="Set up a collaborative workspace for your department or project group."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <Input
          label="Team Name *"
          placeholder="e.g. Core Engineering"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="w-full">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Team Description
          </label>
          <textarea
            rows={3}
            placeholder="What does this team do?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          />
        </div>

        <Input
          label="Team Logo / Avatar URL (Optional)"
          placeholder="https://images.unsplash.com/..."
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />

        <Input
          label="Invite Members by Email (Comma-separated)"
          placeholder="sarah@tasksync.com, marcus@tasksync.com"
          value={initialInvites}
          onChange={(e) => setInitialInvites(e.target.value)}
          helperText="Invitations will be created immediately."
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Create Team Workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
}
