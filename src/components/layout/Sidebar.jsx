import React from 'react';
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
  X,
  CalendarClock,
  BookOpen,
  MessagesSquare,
  Timer,
} from 'lucide-react';
import { BrandMark, BrandWordmark } from '@/components/ui/Brand';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

// Widths are shared with Layout so the content always lines up with the sidebar.
export const SIDEBAR_WIDTH = 'w-64';
export const SIDEBAR_COLLAPSED_WIDTH = 'lg:w-[72px]';


// Hover label shown next to icons when the sidebar is collapsed (desktop only).
function CollapsedTooltip({ show, children }) {
  if (!show) return null;
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden lg:block whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-cream shadow-md opacity-0 translate-x-[-4px] transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0"
    >
      {children}
    </span>
  );
}

export function Sidebar({ currentTab, setCurrentTab, isMobileOpen, setIsMobileOpen, isCollapsed, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  // The collapsed rail only applies on desktop; the mobile drawer is always full width.
  const collapsed = isCollapsed && !isMobileOpen;
  // Hides text in the collapsed desktop rail while keeping it in the mobile drawer.
  const hideWhenCollapsed = collapsed ? 'lg:hidden' : '';

  const navSections = [
    {
      title: 'Plan',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
      ],
    },
    {
      title: 'Study together',
      items: [
        { id: 'teams', label: 'Study Groups', icon: Users2 },
        { id: 'projects', label: 'Subjects', icon: FolderKanban },
        { id: 'sessions', label: 'Sessions', icon: CalendarClock },
        { id: 'resources', label: 'Resources', icon: BookOpen },
        { id: 'qa', label: 'Q&A Board', icon: MessagesSquare },
      ],
    },
    {
      title: 'Progress',
      items: [
        { id: 'focus', label: 'Focus Timer', icon: Timer },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    {
      title: null,
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const go = (tab) => {
    setCurrentTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/45 z-40 lg:hidden backdrop-blur-[2px] animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-cream-light dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800',
          'transition-[width,transform] duration-300 ease-in-out',
          SIDEBAR_WIDTH,
          collapsed && SIDEBAR_COLLAPSED_WIDTH,
          isMobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className={cn('flex items-center h-16 shrink-0 border-b border-slate-200/70 dark:border-slate-800', collapsed ? 'px-4 lg:justify-center lg:px-0' : 'px-4')}>
          <button
            type="button"
            onClick={() => go('dashboard')}
            className="flex items-center gap-3 min-w-0 rounded-xl"
            aria-label="TaskSync home"
          >
            <BrandMark size={38} />
            <span className={cn('flex flex-col items-start min-w-0', hideWhenCollapsed)}>
              <BrandWordmark className="text-base leading-tight" />
              <span className="text-[11px] text-slate-500 font-medium">Group study planner</span>
            </span>
          </button>

          {/* Close button for the mobile drawer */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="ml-auto lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Collapse toggle: a small round button sitting on the sidebar edge (desktop) */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex absolute top-[52px] -right-3 z-10 w-6 h-6 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-900 text-slate-500 shadow-sm hover:text-primary-700 hover:border-primary-300 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Navigation */}
        <nav className={cn('flex-1 py-4 overflow-y-auto', collapsed ? 'px-3 lg:px-2.5 lg:overflow-visible' : 'px-3')}>
          {navSections.map((section, sectionIndex) => (
            <div key={section.title || `section-${sectionIndex}`} className={cn(sectionIndex > 0 && 'pt-3')}>
              {section.title ? (
                <p className={cn('px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400', hideWhenCollapsed)}>
                  {section.title}
                </p>
              ) : (
                <div className={cn('mx-3 mb-2 border-t border-slate-200/70 dark:border-slate-800', hideWhenCollapsed)} />
              )}
              {collapsed && sectionIndex > 0 && <div className="hidden lg:block mx-2 mb-2 border-t border-slate-200/70 dark:border-slate-800" />}
              <div className="space-y-1">
          {section.items.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  'group relative w-full flex items-center gap-3 h-9 rounded-xl font-medium text-sm transition-colors',
                  collapsed ? 'px-3 lg:justify-center lg:px-0' : 'px-3',
                  isActive
                    ? 'bg-primary-600/10 dark:bg-primary-950/60 text-primary-800 dark:text-primary-200'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  )}
                />
                <span className={cn('flex-1 text-left truncate', hideWhenCollapsed)}>{item.label}</span>
                {item.badge > 0 && (
                  <>
                    <span className={cn('px-2 py-0.5 text-[11px] font-semibold rounded-full bg-rose-600 text-white', hideWhenCollapsed)}>
                      {item.badge}
                    </span>
                    {collapsed && (
                      <span className="hidden lg:block absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-cream-light dark:ring-slate-900" />
                    )}
                  </>
                )}
                <CollapsedTooltip show={collapsed}>
                  {item.label}{item.badge > 0 ? ` (${item.badge})` : ''}
                </CollapsedTooltip>
              </button>
            );
          })}
              </div>
            </div>
          ))}
        </nav>

        {/* Profile footer */}
        <div className={cn('shrink-0 border-t border-slate-200/70 dark:border-slate-800', collapsed ? 'p-3 lg:px-2.5' : 'p-3')}>
          <div className={cn('flex items-center gap-3', collapsed && 'lg:flex-col lg:gap-2')}>
            <button
              type="button"
              onClick={() => go('profile')}
              className="group relative shrink-0 rounded-full"
              aria-label="Your profile"
            >
              <Avatar src={user?.avatar_url} name={user?.full_name} size="sm" />
              <CollapsedTooltip show={collapsed}>{user?.full_name || 'Your profile'}</CollapsedTooltip>
            </button>
            <div className={cn('flex-1 min-w-0', hideWhenCollapsed)}>
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.full_name || 'User'}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="group relative p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
              aria-label="Sign out"
              title={collapsed ? undefined : 'Sign out'}
            >
              <LogOut className="w-4 h-4" />
              <CollapsedTooltip show={collapsed}>Sign out</CollapsedTooltip>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
