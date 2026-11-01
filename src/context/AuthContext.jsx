import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('tasksync_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }
    return null; // Clean initial state: no mock user
  });

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      localStorage.setItem('tasksync_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('tasksync_user');
    }
  }, [user]);

  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          setSession(currentSession);
          if (currentSession?.user) {
            // Fetch profile from public.profiles
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', currentSession.user.id)
              .single();

            if (profile) {
              setUser(profile);
            } else {
              const fallbackUser = {
                id: currentSession.user.id,
                email: currentSession.user.email,
                full_name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'User',
                role: currentSession.user.user_metadata?.role || 'team_member',
                avatar_url: currentSession.user.user_metadata?.avatar_url || '',
              };
              setUser(fallbackUser);
              supabase.from('profiles').upsert(fallbackUser).then();
            }
          } else {
            setUser(null);
          }
        } catch (err) {
          console.warn('Error fetching Supabase session:', err);
          setUser(null);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          setSession(newSession);
          if (newSession?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newSession.user.id)
              .single();
            if (profile) {
              setUser(profile);
            } else {
              const fallbackUser = {
                id: newSession.user.id,
                email: newSession.user.email,
                full_name: newSession.user.user_metadata?.full_name || newSession.user.email?.split('@')[0] || 'User',
                role: newSession.user.user_metadata?.role || 'team_member',
                avatar_url: newSession.user.user_metadata?.avatar_url || '',
              };
              setUser(fallbackUser);
              supabase.from('profiles').upsert(fallbackUser).then();
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            localStorage.removeItem('tasksync_user');
          }
        });

        setLoading(false);
        return () => subscription?.unsubscribe();
      } else {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        if (profile) {
          setUser(profile);
        } else {
          const fallbackUser = {
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || email.split('@')[0],
            role: data.user.user_metadata?.role || 'team_member',
            avatar_url: data.user.user_metadata?.avatar_url || '',
          };
          setUser(fallbackUser);
          supabase.from('profiles').upsert(fallbackUser).then();
        }
      }
      return data;
    }
    throw new Error('Supabase client not initialized.');
  };

  const signup = async (fullName, email, password, role = 'team_member') => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          },
          emailRedirectTo: `${window.location.origin}/`,
        }
      });
      if (error) throw error;

      // Automatically sync profile to public.profiles if user was created
      if (data?.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            email: email,
            role: role,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`
          });
        } catch (e) {
          console.warn("Profile table sync warning:", e);
        }
      }

      return data;
    }
    throw new Error('Supabase client not initialized.');
  };

  const resendVerification = async (email) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      return data;
    }
    throw new Error('Supabase client not initialized.');
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('tasksync_user');
  };

  const forgotPassword = async (email) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return data;
    }
    throw new Error('Supabase client not initialized.');
  };

  const updateProfile = async (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    if (isSupabaseConfigured && supabase && user?.id) {
      await supabase.from('profiles').update(updates).eq('id', user.id);
    }
    return updated;
  };

  const role = user?.role || 'team_member';
  const isAdmin = role === 'admin';
  const isLeader = role === 'team_leader' || role === 'admin';
  const isMember = role === 'team_member';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isLeader,
        isMember,
        session,
        loading,
        isAuthenticated: Boolean(user),
        login,
        signup,
        resendVerification,
        logout,
        forgotPassword,
        updateProfile,
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
