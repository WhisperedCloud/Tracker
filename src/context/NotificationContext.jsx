import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { newId } from '@/lib/utils';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState([]);
  const [toastNotification, setToastNotification] = useState(null);
  const toastTimer = useRef(null);
  // Ids already shown, so a notification we created ourselves is not
  // toasted a second time when realtime echoes it back.
  const seenIds = useRef(new Set());

  const showToast = useCallback((notif) => {
    setToastNotification(notif);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastNotification(null), 5000);
  }, []);

  // Toast-only error message; not stored in the database.
  const notifyError = useCallback((message, title = 'Could not save') => {
    showToast({ id: newId(), title, message, type: 'error' });
  }, [showToast]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('Could not load notifications:', error.message);
          return;
        }
        data.forEach(n => seenIds.current.add(n.id));
        setNotifications(data);
      });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const notif = payload.new;
          if (seenIds.current.has(notif.id)) return;
          seenIds.current.add(notif.id);
          setNotifications(prev => (prev.some(n => n.id === notif.id) ? prev : [notif, ...prev]));
          showToast(notif);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, showToast]);

  // Notifications for the current user appear right away. Notifications for
  // other people are only saved; they arrive on the recipient's screen via realtime.
  const addNotification = useCallback(async ({ title, message, type = 'info', related_task_id = null, userId: targetId = null }) => {
    const recipient = targetId || userId;
    if (!recipient) return;
    const notif = {
      id: newId(),
      user_id: recipient,
      title,
      message,
      type,
      related_task_id,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (recipient === userId) {
      seenIds.current.add(notif.id);
      setNotifications(prev => [notif, ...prev]);
      showToast(notif);
    }

    const { error } = await supabase.from('notifications').insert(notif);
    if (error) console.warn('Notification not saved:', error.message);
  }, [userId, showToast]);

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) console.warn('Could not mark notification read:', error.message);
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) console.warn('Could not mark notifications read:', error.message);
  };

  const deleteNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) console.warn('Could not delete notification:', error.message);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toastNotification,
        addNotification,
        notifyError,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearToast: () => setToastNotification(null),
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
