import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_NOTIFICATIONS } from '@/lib/mockData';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('tasksync_notifications');
    if (saved) {
      if (saved.includes('notif-1') || saved.includes('user-alex-1')) {
        localStorage.removeItem('tasksync_notifications');
        return [];
      }
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }
    return [];
  });

  const [toastNotification, setToastNotification] = useState(null);

  useEffect(() => {
    localStorage.setItem('tasksync_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Initial fetch of user's notifications from Supabase
  useEffect(() => {
    async function fetchUserNotifications() {
      if (isSupabaseConfigured && supabase && user?.id) {
        try {
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (data) setNotifications(data);
        } catch (err) {
          console.warn("Could not fetch notifications:", err);
        }
      }
    }
    fetchUserNotifications();
  }, [user?.id]);

  // Supabase Realtime subscription for notifications
  useEffect(() => {
    if (isSupabaseConfigured && supabase && user?.id) {
      const channel = supabase
        .channel(`public:notifications:user_id=eq.${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications(prev => [payload.new, ...prev]);
            showToast(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const showToast = (notif) => {
    setToastNotification(notif);
    setTimeout(() => {
      setToastNotification(null);
    }, 5000);
  };

  const addNotification = ({ title, message, type = 'info', related_task_id = null, userId = null }) => {
    const targetUserId = userId || user?.id;
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: targetUserId,
      title,
      message,
      type,
      related_task_id,
      is_read: false,
      created_at: new Date().toISOString()
    };

    setNotifications(prev => [newNotif, ...prev]);
    showToast(newNotif);

    if (isSupabaseConfigured && supabase) {
      supabase.from('notifications').insert(newNotif).then();
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    if (isSupabaseConfigured && supabase) {
      supabase.from('notifications').update({ is_read: true }).eq('id', id).then();
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );
    if (isSupabaseConfigured && supabase && user?.id) {
      supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).then();
    }
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (isSupabaseConfigured && supabase) {
      supabase.from('notifications').delete().eq('id', id).then();
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toastNotification,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearToast: () => setToastNotification(null)
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
