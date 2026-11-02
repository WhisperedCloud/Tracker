import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Plus,
  Sun,
  Moon,
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  ChevronDown,
  User,
  Settings as SettingsIcon,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { useData } from '@/context/DataContext';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { formatTimeAgo, cn } from '@/lib/utils';
import { useLayer } from '@/components/ui/overlay';
import { useStudy } from '@/context/StudyContext';
import { Timer } from 'lucide-react';

export function Header({
  setIsMobileOpen,
  onOpenNewTaskModal,
  onOpenNewProjectModal,
  setCurrentTab,
  searchQuery,
  setSearchQuery,
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { memberTeams } = useData();
  const { timer, remainingMs } = useStudy();
  const timerActive = timer.status !== 'idle';
  const clock = `${String(Math.floor(Math.ceil(remainingMs / 1000) / 60)).padStart(2, '0')}:${String(Math.ceil(remainingMs / 1000) % 60).padStart(2, '0')}`;

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  // Escape closes whichever header menu is open.
  useLayer(isNotifOpen || isUserMenuOpen, () => {
    setIsNotifOpen(false);
    setIsUserMenuOpen(false);
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      {/* Left: Mobile Menu Toggle & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, subjects, members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search"
            className="w-full pl-9 pr-4 py-2 text-xs bg-surface dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
          />
        </div>
      </div>

      {/* Right: Actions, Notifications, Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Create Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onOpenNewTaskModal}
            className="hidden sm:flex gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">New Task</span>
          </Button>

          {memberTeams.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenNewProjectModal}
              className="hidden sm:flex gap-1.5 border-slate-200 dark:border-slate-700"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden lg:inline">New Subject</span>
            </Button>
          )}
        </div>

        {/* Running focus timer, visible from every page */}
        {timerActive && (
          <button
            type="button"
            onClick={() => setCurrentTab('focus')}
            aria-label={`${timer.phase === 'focus' ? 'Focus' : 'Break'} timer, ${clock} left. Open the focus timer.`}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold tabular-nums transition-colors animate-pop-in',
              timer.phase === 'focus'
                ? 'border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100 dark:border-primary-900 dark:bg-primary-950/50 dark:text-primary-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
              timer.status === 'paused' && 'opacity-70'
            )}
          >
            <Timer className="w-3.5 h-3.5" />
            {clock}
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsUserMenuOpen(false);
            }}
            aria-haspopup="true"
            aria-expanded={isNotifOpen}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div role="region" aria-label="Recent notifications" className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface dark:bg-slate-900 rounded-2xl shadow-popover border border-slate-200 dark:border-slate-800 py-3 z-50 animate-pop-in origin-top-right">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No notifications yet</p>
                ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <button
                      type="button"
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={cn(
                        'w-full text-left p-3 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start gap-3',
                        !notif.is_read && 'bg-primary-50/40 dark:bg-primary-950/20'
                      )}
                    >
                      <div className="mt-0.5 w-2 h-2 rounded-full shrink-0 bg-primary-600" style={{ opacity: notif.is_read ? 0 : 1 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{notif.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{notif.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{formatTimeAgo(notif.created_at)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="px-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  onClick={() => {
                    setCurrentTab('notifications');
                    setIsNotifOpen(false);
                  }}
                  className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline inline-flex items-center gap-1"
                >
                  View all notifications <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsNotifOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            aria-label="Account menu"
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Avatar src={user?.avatar_url} name={user?.full_name} size="sm" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {isUserMenuOpen && (
            <div role="menu" className="absolute right-0 mt-2 w-56 bg-surface dark:bg-slate-900 rounded-2xl shadow-popover border border-slate-200 dark:border-slate-800 py-2 z-50 animate-pop-in origin-top-right">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user?.full_name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setCurrentTab('profile');
                    setIsUserMenuOpen(false);
                  }}
                  role="menuitem"
                  className="w-full px-4 py-2 text-xs text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Your Profile
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('settings');
                    setIsUserMenuOpen(false);
                  }}
                  role="menuitem"
                  className="w-full px-4 py-2 text-xs text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                  Settings
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  role="menuitem"
                  className="w-full px-4 py-2 text-xs text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
