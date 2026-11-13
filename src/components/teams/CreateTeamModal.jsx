import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useData } from '@/context/DataContext';
import { useDialog } from '@/components/ui/DialogProvider';

// Creates a study group, or edits one when `team` is passed.
export function CreateTeamModal({ isOpen, onClose, team = null }) {
  const { createTeam, updateTeam, inviteMember, notifyByEmail } = useData();
  const isEditing = Boolean(team);
  const { alert } = useDialog();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [initialInvites, setInitialInvites] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setAvatarUrl('');
    setInitialInvites('');
    setError('');
  };

  useEffect(() => {
    if (!isOpen) return;
    if (team) {
      setName(team.name || '');
      setDescription(team.description || '');
      setAvatarUrl(team.avatar_url || '');
      setInitialInvites('');
      setError('');
    }
  }, [isOpen, team?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }

    if (isEditing) {
      setSaving(true);
      const saved = await updateTeam(team.id, { name, description, avatar_url: avatarUrl.trim() });
      setSaving(false);
      if (saved) onClose();
      else setError('The study group could not be saved. Check the message in the corner and try again.');
      return;
    }

    const emails = initialInvites.split(',').map(e => e.trim()).filter(Boolean);
    const invalid = emails.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (invalid.length) {
      setError(`These emails look invalid: ${invalid.join(', ')}`);
      return;
    }

    setSaving(true);
    const newTeam = await createTeam({
      name: name.trim(),
      description: description.trim(),
      avatar_url: avatarUrl.trim() || `https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80`
    });

    if (!newTeam) {
      setSaving(false);
      setError('The study group could not be created. Check the message in the corner and try again.');
      return;
    }

    // Invitations reference the team, so they are sent after it is saved.
    const results = [];
    for (const email of emails) {
      results.push({ email, ...(await inviteMember({ teamId: newTeam.id, email, role: 'member' })) });
    }
    setSaving(false);

    // Confirmation email to the creator, listing who was added or invited.
    notifyByEmail('team_created', { team_id: newTeam.id });

    const pending = results.filter(r => r.status === 'invited');
    resetForm();
    onClose();
    if (pending.length) {
      alert({
        title: 'Study group created',
        size: 'md',
        message: 'These people have no account yet. An invitation email is on its way; you can also share their links directly.',
        content: (
          <ul className="space-y-2">
            {pending.map(r => (
              <li key={r.email} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{r.email}</p>
                <p className="text-[11px] font-mono text-slate-500 break-all mt-0.5">{r.link}</p>
              </li>
            ))}
          </ul>
        ),
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Study Group' : 'Create a Study Group'}
      description={isEditing ? 'Change the name, description or image of this group.' : 'Bring your classmates together to plan, share notes and study.'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <Input
          label="Group Name *"
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
            placeholder="What does this group study?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-surface dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          />
        </div>

        <Input
          label="Group Image URL (optional)"
          placeholder="https://images.unsplash.com/..."
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />

        {!isEditing && <Input
          label="Invite Members by Email (Comma-separated)"
          placeholder="sarah@tasksync.com, marcus@tasksync.com"
          value={initialInvites}
          onChange={(e) => setInitialInvites(e.target.value)}
          helperText="People with an account are added right away; others get an invite link."
        />}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Study Group'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
