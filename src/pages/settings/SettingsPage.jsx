import React, { useState } from 'react';
import {
  Settings,
  Database,
  Moon,
  Sun,
  Shield,
  Bell,
  Check,
  Copy,
  RotateCcw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/context/ThemeContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { tablesExist, refresh } = useData();
  const [syncing, setSyncing] = useState(false);

  const [copiedSql, setCopiedSql] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleCopySql = () => {
    const sqlScript = `-- TaskSync Quick Setup
-- Open Supabase Dashboard -> SQL Editor -> New Query -> Paste and Run
-- Full schema available in /supabase/schema.sql in this workspace.`;
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleResync = async () => {
    setSyncing(true);
    // Older versions kept copies of data in localStorage; remove any leftovers.
    Object.keys(localStorage)
      .filter(key => key.startsWith('tasksync_') && !['tasksync_theme', 'tasksync_sidebar_collapsed'].includes(key))
      .forEach(key => localStorage.removeItem(key));
    await refresh();
    setSyncing(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Application Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Customize interface appearance, inspect Supabase database connectivity, and manage storage.
        </p>
      </div>

      {resetSuccess && (
        <div className="p-3 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Data reloaded from Supabase.
        </div>
      )}

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-primary-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            Appearance & Theme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Current Mode: <span className="capitalize text-primary-600 dark:text-primary-400 font-bold">{theme} Theme</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Light theme is default as specified. Switch freely to dark mode anytime.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme} className="text-xs">
              Toggle to {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Supabase Database Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-primary-600" />
            Backend & Database (Supabase PostgreSQL)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Connection State:</span>
                {isSupabaseConfigured ? (
                  <Badge variant={tablesExist ? "success" : "warning"} className="gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected to Supabase ({tablesExist ? "Schema Ready" : "Tables Pending Migration"})
                  </Badge>
                ) : (
                  <Badge variant="warning" className="gap-1">
                    <AlertCircle className="w-3 h-3" /> Not configured
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isSupabaseConfigured
                  ? tablesExist
                    ? "All data is stored in Supabase. Sign-in, realtime updates and row-level security are active."
                    : "Some tables could not be read. Run supabase/schema.sql in the Supabase SQL Editor, then resync."
                  : "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env and restart the app."}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Supabase PostgreSQL Schema
            </h4>
            <p className="text-xs text-slate-500">
              We generated a production-grade SQL file at <code className="text-primary-600 font-mono">/supabase/schema.sql</code> covering all 11 required tables, RLS policies, indexes, and triggers.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={handleCopySql} className="text-xs gap-1.5">
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? "Copied Setup Instructions!" : "Copy SQL Script Location"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache & Sync Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary-600" />
            Cache & Data Synchronization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            Reload all teams, projects and tasks from Supabase. Use this if something looks out of date.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResync}
            disabled={syncing}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {syncing ? 'Reloading...' : 'Reload Data from Supabase'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
