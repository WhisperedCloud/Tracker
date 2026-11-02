import React, { useState } from 'react';
import { BrandLogo } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';

// Shown when the user arrives from a password-reset email link.
export function ResetPassword() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
    } catch (err) {
      setError(err.message || 'Could not update the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo className="mb-2" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Choose a New Password
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter a new password for your account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-4"
        >
          {error && (
            <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg">
              {error}
            </div>
          )}
          <Input
            type="password"
            label="New Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            label="Confirm New Password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? 'Saving...' : 'Save New Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
