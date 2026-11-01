import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users2,
  FolderKanban,
  CheckCircle2,
  Activity,
  UserCheck,
  Crown,
  Search,
  Filter,
  Check,
  AlertTriangle,
  Sparkles,
  Building
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatDate, formatTimeAgo, cn } from '@/lib/utils';

export function AdminManagement() {
  const { user, role, isAdmin } = useAuth();
  const { teams, projects, tasks } = useData();

  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [updateStatus, setUpdateStatus] = useState('');

  // Fetch all registered users from Supabase profiles table
  const fetchUsers = async () => {
    setLoadingUsers(true);
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setAllUsers(data);
        }
      } catch (err) {
        console.warn('Error loading users:', err);
      } finally {
        setLoadingUsers(false);
      }
    } else {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update user role
  const handleRoleChange = async (userId, newRole) => {
    setUpdateStatus(`Updating role...`);
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', userId);

        if (error) throw error;

        setAllUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
        );
        setUpdateStatus(`User access level updated to ${newRole.replace('_', ' ')}!`);
        setTimeout(() => setUpdateStatus(''), 3000);
      } catch (err) {
        setUpdateStatus(`Error updating user: ${err.message}`);
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-rose-200">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-xs text-slate-500 mt-1">This section requires Platform Administrator privileges.</p>
      </div>
    );
  }

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Admin Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-lg space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200">
            Platform Administration
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-purple-400" />
          Admin Console & User Directory
        </h1>
        <p className="text-xs text-purple-200 max-w-2xl leading-relaxed">
          Manage all registered platform accounts, govern team workspaces, assign user permission levels, and monitor system-wide activity.
        </p>
      </div>

      {updateStatus && (
        <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          {updateStatus}
        </div>
      )}

      {/* Platform Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Registered Users</span>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{allUsers.length}</h3>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Managed accounts</span>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Team Workspaces</span>
          <h3 className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-1">{teams.length}</h3>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Active environments</span>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Projects</span>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{projects.length}</h3>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Across all teams</span>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Global Tasks</span>
          <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{tasks.length}</h3>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Active tracking</span>
        </Card>
      </div>

      {/* User Management Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users2 className="w-4 h-4 text-primary-600" />
              Registered User Directory & Role Access
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign Admin, Team Leader, or Team Member roles to configure user capabilities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="team_leader">Team Leaders</option>
              <option value="team_member">Team Members</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4">Change Access Level</th>
                <th className="py-3 px-4 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingUsers ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Loading user directory...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No registered users found.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentLoggedUser = u.id === user?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {u.full_name} {isCurrentLoggedUser && '(You)'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {u.email}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={u.role === 'admin' ? 'primary' : u.role === 'team_leader' ? 'warning' : 'default'}
                          className="capitalize"
                        >
                          {u.role?.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={u.role || 'team_member'}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={isCurrentLoggedUser}
                          className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium capitalize disabled:opacity-50"
                        >
                          <option value="team_member">Team Member</option>
                          <option value="team_leader">Team Leader</option>
                          <option value="admin">Platform Admin</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-400">
                        {formatDate(u.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
