import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isNativeApp, siteLink } from '@/lib/platform';

const AuthContext = createContext();

// Supabase puts the result of an email link in the URL: tokens on success,
// error_description when the link is used up or expired.
function readLinkParams(url) {
  const u = new URL(url);
  const params = new URLSearchParams(u.hash.replace(/^#/, ''));
  u.searchParams.forEach((value, key) => { if (!params.has(key)) params.set(key, value); });
  return params;
}

function linkErrorMessage(params) {
  const description = params.get('error_description');
  if (!description) return '';
  if (params.get('error_code') === 'otp_expired') {
    return 'That email link has expired or was already used. Sign in, or ask for a new link below.';
  }
  return description;
}

// Every account is the same; there are no admin or leader accounts.

async function fetchOrCreateProfile(authUser) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (profile) return profile;
  if (error) console.warn('Could not load profile:', error.message);

  // The sign-up trigger normally creates the profile. If it is missing
  // (for example the account predates the trigger), create it now.
  const fallback = {
    id: authUser.id,
    email: (authUser.email || '').toLowerCase(),
    full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
    role: 'team_member',
    avatar_url: authUser.user_metadata?.avatar_url || '',
  };
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .upsert(fallback)
    .select()
    .maybeSingle();
  if (insertError) console.warn('Could not create profile:', insertError.message);
  return created || fallback;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  // Shown on the sign-in screen when an email link failed (for example it expired).
  const [linkError, setLinkError] = useState(() =>
    typeof window !== 'undefined' && window.location.hash.includes('error_description')
      ? linkErrorMessage(readLinkParams(window.location.href))
      : ''
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    // onAuthStateChange fires INITIAL_SESSION right away, so it covers page load too.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);

      if (!newSession?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Supabase warns against awaiting its own calls inside this callback
      // (it can deadlock), so load the profile on the next tick.
      const authUser = newSession.user;
      setTimeout(async () => {
        const profile = await fetchOrCreateProfile(authUser);
        setUser(profile);
        setLoading(false);
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  // In the Android app, email links (verify email, reset password, invites) open the app
  // through Android App Links. The browser would read the tokens from the URL by itself;
  // the app has to hand them to Supabase.
  useEffect(() => {
    if (!isSupabaseConfigured || !isNativeApp) return undefined;
    let cancelled = false;
    const handled = new Set();

    const handleUrl = async (url) => {
      if (!url || handled.has(url)) return;
      handled.add(url);
      let params;
      try { params = readLinkParams(url); } catch { return; }

      const message = linkErrorMessage(params);
      if (message) { setLinkError(message); return; }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        if (params.get('type') === 'recovery') setIsPasswordRecovery(true);
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) setLinkError(error.message);
        else setLinkError('');
      } else if (params.get('code')) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.get('code'));
        if (error) setLinkError(error.message);
      }

      const invite = params.get('invite');
      if (invite) {
        window.history.replaceState({}, '', `/?invite=${encodeURIComponent(invite)}`);
        window.dispatchEvent(new Event('tasksync:invite'));
      }
    };

    const listener = NativeApp.addListener('appUrlOpen', ({ url }) => handleUrl(url));
    NativeApp.getLaunchUrl().then((launch) => { if (!cancelled && launch?.url) handleUrl(launch.url); }).catch(() => {});

    return () => {
      cancelled = true;
      listener.then((l) => l.remove()).catch(() => {});
    };
  }, []);

  const requireClient = () => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Add your keys to .env.');
  };

  const login = async (email, password) => {
    requireClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    setLinkError('');
    return data;
  };

  const signup = async (fullName, email, password) => {
    requireClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName.trim())}`,
        },
        emailRedirectTo: siteLink('/'),
      },
    });
    if (error) throw error;
    return data;
  };

  const resendVerification = async (email) => {
    requireClient();
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: siteLink('/') },
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const forgotPassword = async (email) => {
    requireClient();
    // The link brings the user back to the app, which then fires PASSWORD_RECOVERY.
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: siteLink('/'),
    });
    if (error) throw error;
    return data;
  };

  const updatePassword = async (newPassword) => {
    requireClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setIsPasswordRecovery(false);
  };

  // Only name and avatar are editable.
  const updateProfile = async ({ full_name, avatar_url }) => {
    requireClient();
    const updates = { full_name, avatar_url };
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    const updated = data || { ...user, ...updates };
    setUser(updated);
    return updated;
  };

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const profile = await fetchOrCreateProfile(session.user);
    setUser(profile);
  }, [session?.user]);


  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: Boolean(user),
        isPasswordRecovery,
        linkError,
        clearLinkError: () => setLinkError(''),
        login,
        signup,
        resendVerification,
        logout,
        forgotPassword,
        updatePassword,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
