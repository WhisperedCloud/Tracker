import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  Sparkles,
  Calendar,
  MessageSquare,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useNotifications } from '@/context/NotificationContext';
import { formatTimeAgo, cn } from '@/lib/utils';

export function NotificationsPage({ onOpenTaskDetails }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const getNotifIcon = (type) => {
    switch (type) {
      case 'task_review':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'task_completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'changes_requested':
        return <RotateCcw className="w-4 h-4 text-amber-600" />;
      case 'task_assigned':
        return <CheckCheck className="w-4 h-4 text-primary-600" />;
      case 'project_assigned':
        return <FolderKanban className="w-4 h-4 text-blue-600" />;
      case 'comment_added':
        return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      case 'deadline_approaching':
      case 'task_overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Notification Center
            {unreadCount > 0 && <Badge variant="danger">{unreadCount} Unread</Badge>}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time activity alerts, task review submissions, assignments, and deadlines.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5 text-xs">
            <CheckCheck className="w-4 h-4" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
            filter === 'all'
              ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
            filter === 'unread'
              ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No notifications found.</p>
          </Card>
        ) : (
          filteredNotifications.map((notif) => (
            <Card
              key={notif.id}
              className={cn(
                'p-4 transition-all flex items-start justify-between gap-4',
                !notif.is_read && 'bg-primary-50/20 dark:bg-primary-950/10 border-primary-200/60 dark:border-primary-900/40'
              )}
            >
              <div className="flex items-start gap-3.5 flex-1">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                  {getNotifIcon(notif.type)}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {notif.title}
                    </h3>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    {formatTimeAgo(notif.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notif.related_task_id && onOpenTaskDetails && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      markAsRead(notif.id);
                      onOpenTaskDetails(notif.related_task_id);
                    }}
                    className="text-xs py-1 text-primary-600 gap-1"
                  >
                    View Task <ExternalLink className="w-3 h-3" />
                  </Button>
                )}

                {!notif.is_read && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => deleteNotification(notif.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
