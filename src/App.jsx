import React, { useState } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { DataProvider } from '@/context/DataContext';
import { StudyProvider } from '@/context/StudyContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { DialogProvider } from '@/components/ui/DialogProvider';
import { BrandLogo, BrandMark } from '@/components/ui/Brand';
import { Layout } from '@/components/layout/Layout';
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { ResetPassword } from '@/pages/auth/ResetPassword';

function SetupRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-lg w-full bg-surface dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <BrandLogo imgClassName="h-16" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Connect TaskSync to Supabase</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          TaskSync stores its data in Supabase. Create a <code className="font-mono">.env</code> file in the
          project folder with your project URL and anon key, then restart the dev server.
        </p>
        <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto text-slate-800 dark:text-slate-200">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p className="text-xs text-slate-500">
          Then run <code className="font-mono">supabase/schema.sql</code> in the Supabase SQL Editor.
        </p>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, loading, isPasswordRecovery } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'forgot'

  if (!isSupabaseConfigured) return <SetupRequired />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4" role="status">
          <BrandMark size={64} className="rounded-2xl shadow-sm" />
          <div className="w-6 h-6 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading TaskSync...</p>
        </div>
      </div>
    );
  }

  if (isPasswordRecovery) return <ResetPassword />;

  if (!isAuthenticated) {
    if (authView === 'register') {
      return <Register onNavigateLogin={() => setAuthView('login')} />;
    }
    if (authView === 'forgot') {
      return <ForgotPassword onNavigateLogin={() => setAuthView('login')} />;
    }
    return (
      <Login
        onNavigateRegister={() => setAuthView('register')}
        onNavigateForgot={() => setAuthView('forgot')}
      />
    );
  }

  return (
    <NotificationProvider>
      <DataProvider>
        <StudyProvider>
          <Layout />
        </StudyProvider>
      </DataProvider>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DialogProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </DialogProvider>
    </ThemeProvider>
  );
}
