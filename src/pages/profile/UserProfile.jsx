import React, { useState } from 'react';
import { User, Mail, Shield, CheckCircle2, Key, Save, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

export function UserProfile() {
  const { user, role, updateProfile } = useAuth();
  const { getMemberWorkload } = useData();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const workload = user ? getMemberWorkload(user.id) : null;

  const handleSave = (e) => {
    e.preventDefault();
    updateProfile({
      full_name: fullName.trim(),
      avatar_url: avatarUrl.trim()
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          User Profile
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your account information, personal credentials, and view performance metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="p-6 text-center space-y-4">
          <Avatar src={avatarUrl || user?.avatar_url} name={fullName || user?.full_name} size="xl" className="mx-auto shadow-md" />
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{fullName || user?.full_name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
            <div className="mt-2.5">
              <Badge variant="primary" className="capitalize">
                {role?.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {workload && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Active Tasks:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{workload.activeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Overdue Tasks:</span>
                <span className="font-semibold text-rose-600">{workload.overdueCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Completion Rate:</span>
                <span className="font-semibold text-emerald-600">{workload.completionRate}%</span>
              </div>
            </div>
          )}
        </Card>

        {/* Edit Details Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            {savedSuccess && (
              <div className="p-3 mb-4 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Profile updated successfully!
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="Email Address (Read-only)"
                value={user?.email || ''}
                disabled
                helperText="Account email is tied to authentication."
              />

              <Input
                label="Profile Avatar URL"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button type="submit" className="gap-1.5 shadow-sm text-xs">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
