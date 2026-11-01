import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  CheckCircle2,
  Mail,
  ArrowRight,
  ShieldCheck,
  Crown,
  UserCheck,
  RotateCcw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Register({ onNavigateLogin }) {
  const { signup, resendVerification } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('team_member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Post-registration Verification Alert State
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await signup(fullName, email, password, role);
      setRegisteredEmail(email);
      setVerificationSent(true);
    } catch (err) {
      setError(err.message || 'Failed to sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResending(true);
    setResendStatus('');
    try {
      await resendVerification(registeredEmail);
      setResendStatus('Verification email re-sent successfully! Check your inbox.');
    } catch (err) {
      setResendStatus(err.message || 'Failed to resend. Please wait a minute and try again.');
    } finally {
      setResending(false);
    }
  };

  // If verification email was dispatched, show the dedicated verification alert
  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shadow-md">
              <Mail className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Verify Your Email Address
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Account created successfully!
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
            {/* Alert box */}
            <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Confirmation Email Dispatched
              </div>
              <p className="leading-relaxed">
                We've sent a verification link to <strong className="font-semibold underline">{registeredEmail}</strong>.
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80">
                Please check your inbox (and spam/junk folder) and click the confirmation link to activate your account before logging in.
              </p>
            </div>

            {resendStatus && (
              <div className="p-3 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium text-center">
                {resendStatus}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button onClick={onNavigateLogin} className="w-full gap-2">
                Go to Sign In
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={resending}
                className="w-full text-xs gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {resending ? 'Resending email...' : 'Resend Verification Email'}
              </Button>
            </div>
          </div>

          <p className="text-xs text-center text-slate-500">
            Already verified?{' '}
            <button
              onClick={onNavigateLogin}
              className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
            >
              Sign in now
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30">
            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Create your TaskSync account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Personal productivity + collaborative team execution
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5">
          {error && (
            <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              label="Full Name"
              placeholder="e.g. Alex Rivera"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              type="email"
              label="Email Address"
              placeholder="name@tasksync.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Select
              label="Choose Your Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="team_member">Team Member (Personal tasks & team assignments)</option>
              <option value="team_leader">Team Leader (Manage projects, assign tasks & review)</option>
              <option value="admin">Admin (Full platform management & access control)</option>
            </Select>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </div>

        <p className="text-xs text-center text-slate-500">
          Already have an account?{' '}
          <button
            onClick={onNavigateLogin}
            className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
