import React, { useState } from 'react';
import { BrandLogo } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CheckCircle2, Lock, Mail, AlertCircle, RotateCcw, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Login({ onNavigateRegister, onNavigateForgot }) {
  const { login, resendVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const isEmailNotConfirmed = error.toLowerCase().includes('email not confirmed') ||
    error.toLowerCase().includes('confirm your email') ||
    error.toLowerCase().includes('not verified');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResendMessage('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address to resend verification.');
      return;
    }
    setResending(true);
    setResendMessage('');
    try {
      await resendVerification(email);
      setResendMessage('Verification email has been re-sent. Please check your inbox.');
    } catch (err) {
      setResendMessage(err.message || 'Failed to resend verification. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <BrandLogo className="mb-2" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sign in to plan your day and work with your team.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-surface dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5">
          {error && (
            <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {isEmailNotConfirmed && (
                <div className="pt-2 border-t border-rose-200 dark:border-rose-800">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="font-semibold text-rose-700 dark:text-rose-300 underline hover:text-rose-800 text-[11px] flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {resending ? 'Sending email...' : 'Click here to resend verification link'}
                  </button>
                </div>
              )}
            </div>
          )}

          {resendMessage && (
            <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{resendMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email Address"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={onNavigateForgot}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Signing in..." : "Sign in to Dashboard"}
            </Button>
          </form>
        </div>

        <p className="text-xs text-center text-slate-500">
          Don't have an account?{' '}
          <button
            onClick={onNavigateRegister}
            className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}
