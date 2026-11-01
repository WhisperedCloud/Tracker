import React, { useState } from 'react';
import {
  Users2,
  Mail,
  Copy,
  Check,
  UserPlus,
  Trash2,
  ShieldCheck,
  Crown,
  UserCheck,
  Sparkles,
  Link2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate, cn } from '@/lib/utils';

export function TeamMembers({ teamId }) {
  const { teamMembers, profiles, inviteMember, removeMember, updateMemberRole, getMemberWorkload } = useData();
  const { user, role } = useAuth();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const members = teamMembers.filter(tm => tm.team_id === teamId);
  const isLeaderOrAdmin = role === 'team_leader' || role === 'admin';

  const handleInviteSubmit = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setError('Email address is required.');
      return;
    }

    const res = inviteMember({ teamId, email: inviteEmail.trim(), role: inviteRole });
    setGeneratedLink(res.link);
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCloseModal = () => {
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setGeneratedLink('');
    setCopied(false);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Team Members
            <Badge variant="primary">{members.length}</Badge>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage collaborators, assign roles, monitor individual workloads, and invite teammates.
          </p>
        </div>

        {isLeaderOrAdmin && (
          <Button onClick={() => setIsInviteModalOpen(true)} className="gap-1.5 shadow-sm text-xs">
            <UserPlus className="w-4 h-4" />
            Invite Team Member
          </Button>
        )}
      </div>

      {/* Members Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Team Role</th>
                <th className="py-3 px-4">Workload Status</th>
                <th className="py-3 px-4">Active Tasks</th>
                <th className="py-3 px-4">Completion Rate</th>
                <th className="py-3 px-4">Joined Date</th>
                {isLeaderOrAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {members.map((m) => {
                const profile = profiles.find(p => p.id === m.user_id);
                const workload = getMemberWorkload(m.user_id);
                const isSelf = m.user_id === user?.id;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={profile?.avatar_url} name={profile?.full_name} size="sm" />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {profile?.full_name || 'Member'} {isSelf && '(You)'}
                          </p>
                          <p className="text-[11px] text-slate-400">{profile?.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {isLeaderOrAdmin && !isSelf ? (
                        <select
                          value={m.role}
                          onChange={(e) => updateMemberRole(teamId, m.user_id, e.target.value)}
                          className="text-xs p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 capitalize font-medium"
                        >
                          <option value="member">Member</option>
                          <option value="leader">Leader</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">
                          {m.role}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', workload.badgeColor)}>
                        {workload.workloadLevel}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {workload.activeCount} active ({workload.overdueCount} overdue)
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      {workload.completionRate}%
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDate(m.joined_at)}
                    </td>

                    {isLeaderOrAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Remove ${profile?.full_name} from this team?`)) {
                                removeMember(teamId, m.user_id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={handleCloseModal}
        title="Invite Member to Team"
        description="Send an email invitation or generate a sharable onboarding link."
        size="md"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-600 bg-rose-50 rounded-lg">{error}</div>
          )}

          <Input
            type="email"
            label="Email Address *"
            placeholder="colleague@tasksync.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />

          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Assigned Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="member">Team Member</option>
              <option value="leader">Team Leader</option>
            </select>
          </div>

          <Button type="submit" className="w-full gap-1.5">
            <Mail className="w-4 h-4" />
            Send Invitation Link
          </Button>

          {/* Generated Shareable Link Preview */}
          {generatedLink && (
            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5" /> Sharable Invitation Link Generated:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 flex-1 font-mono text-slate-700 dark:text-slate-200"
                />
                <Button type="button" size="sm" onClick={handleCopyLink} className="shrink-0 gap-1 text-xs">
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
