import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Users2,
  FolderKanban,
  Bell,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Crown,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

export function Sidebar({ currentTab, setCurrentTab, isMobileOpen, setIsMobileOpen }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, role, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'calendar', label: 'My Calendar', icon: Calendar },
    { id: 'teams', label: 'My Teams', icon: Users2 },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    ...(role === 'admin' ? [{ id: 'admin', label: 'Admin Console', icon: ShieldCheck }] : []),
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getRoleIcon = (r) => {
    switch (r) {
      case 'admin':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'team_leader':
        return <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      default:
        return <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case 'admin': return 'Admin';
      case 'team_leader': return 'Team Leader';
      default: return 'Team Member';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-20' : 'w-64',
          // Mobile responsive placement
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 dark:border-slate-800/80">
          <div
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
            onClick={() => { setCurrentTab('dashboard'); setIsMobileOpen(false); }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-md shadow-primary-500/20 shrink-0">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  TaskSync
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Personal & Team</span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group relative',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  )}
                />
                {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                {!isCollapsed && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            );
          })}
        </div>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatar_url} name={user?.full_name} size="sm" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {user?.full_name || 'User'}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {getRoleIcon(role)}
                  <span className="capitalize">{getRoleLabel(role)}</span>
                </div>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
