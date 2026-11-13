import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MainDashboard } from '@/pages/dashboard/MainDashboard';
import { PersonalTasks } from '@/pages/tasks/PersonalTasks';
import { CalendarView } from '@/pages/calendar/CalendarView';
import { TeamsList } from '@/pages/teams/TeamsList';
import { TeamWorkspace } from '@/pages/teams/TeamWorkspace';
import { ProjectsList } from '@/pages/projects/ProjectsList';
import { ProjectDetails } from '@/pages/projects/ProjectDetails';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { UserProfile } from '@/pages/profile/UserProfile';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { StudySessionsPage } from '@/pages/study/StudySessionsPage';
import { ResourcesPage } from '@/pages/study/ResourcesPage';
import { QABoardPage } from '@/pages/study/QABoardPage';
import { FocusPage } from '@/pages/study/FocusPage';

import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { CreateTeamModal } from '@/components/teams/CreateTeamModal';
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal';

import { useNotifications } from '@/context/NotificationContext';
import { useData } from '@/context/DataContext';
import { Bell, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Layout() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Desktop sidebar collapse, remembered between visits.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('tasksync_sidebar_collapsed') === 'true'
  );
  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      localStorage.setItem('tasksync_sidebar_collapsed', String(!prev));
      return !prev;
    });
  };
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Team & Project detail navigation state
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Modals state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskTeamId, setCreateTaskTeamId] = useState(null);
  const [createTaskProjectId, setCreateTaskProjectId] = useState(null);
  const [createTaskParentId, setCreateTaskParentId] = useState(null);

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createProjectTeamId, setCreateProjectTeamId] = useState(null);

  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState(null);
  const [editTeamId, setEditTeamId] = useState(null);
  const { projects, teams } = useData();
  const editProject = projects.find(p => p.id === editProjectId) || null;
  const editTeam = teams.find(t => t.id === editTeamId) || null;

  const [activeTaskId, setActiveTaskId] = useState(null);

  const { toastNotification, clearToast } = useNotifications();

  // Invite links look like /?invite=<token>. Open the Teams page, where the
  // pending invitation is shown with Accept / Decline, and tidy the URL.
  // In the Android app an invite link can also arrive while the app is open.
  useEffect(() => {
    const openInvite = () => {
      const params = new URLSearchParams(window.location.search);
      if (!params.has('invite')) return;
      setSelectedTeamId(null);
      setCurrentTab('teams');
      params.delete('invite');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    };
    openInvite();
    window.addEventListener('tasksync:invite', openInvite);
    return () => window.removeEventListener('tasksync:invite', openInvite);
  }, []);

  // Android Back button (sent by src/lib/native.js once no popup is open):
  // close the menu, leave a group or subject page, then return to the dashboard.
  useEffect(() => {
    const onBack = (event) => {
      if (isMobileOpen) setIsMobileOpen(false);
      else if (currentTab === 'teams' && selectedTeamId) setSelectedTeamId(null);
      else if (currentTab === 'projects' && selectedProjectId) setSelectedProjectId(null);
      else if (currentTab !== 'dashboard') setCurrentTab('dashboard');
      else return;
      event.preventDefault();
      window.scrollTo(0, 0);
    };
    window.addEventListener('tasksync:back', onBack);
    return () => window.removeEventListener('tasksync:back', onBack);
  }, [isMobileOpen, currentTab, selectedTeamId, selectedProjectId]);

  const isErrorToast = toastNotification?.type === 'error';

  // Handlers
  const handleOpenTaskDetails = (taskId) => {
    setActiveTaskId(taskId);
  };

  const handleOpenNewTaskModal = (teamId = null, projId = null) => {
    setCreateTaskTeamId(teamId || selectedTeamId);
    setCreateTaskProjectId(projId || selectedProjectId);
    setCreateTaskParentId(null);
    setIsCreateTaskOpen(true);
  };

  const handleOpenCreateSubtask = (parentId, projId = null, teamId = null) => {
    setCreateTaskParentId(parentId);
    setCreateTaskProjectId(projId || selectedProjectId);
    setCreateTaskTeamId(teamId || selectedTeamId);
    setIsCreateTaskOpen(true);
  };

  const handleOpenNewProjectModal = (teamId = null) => {
    setCreateProjectTeamId(teamId || selectedTeamId);
    setIsCreateProjectOpen(true);
  };

  const handleSelectTeam = (teamId) => {
    setSelectedTeamId(teamId);
    setCurrentTab('teams');
  };

  const handleSelectProject = (projId) => {
    setSelectedProjectId(projId);
    setCurrentTab('projects');
  };

  const handleTabChange = (tabId) => {
    if (tabId === 'teams') {
      setSelectedTeamId(null);
    }
    if (tabId === 'projects') {
      setSelectedProjectId(null);
    }
    setCurrentTab(tabId);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors">
      {/* Toast Notification Banner */}
      {toastNotification && (
        <div
          key={toastNotification.id}
          role={isErrorToast ? 'alert' : 'status'}
          className={cn(
            'fixed bottom-5 right-5 z-[90] w-[min(24rem,calc(100vw-2.5rem))] p-4 rounded-2xl bg-surface dark:bg-slate-900 border shadow-popover flex items-start gap-3 overflow-hidden animate-toast-in',
            isErrorToast ? 'border-rose-300 dark:border-rose-800' : 'border-primary-200 dark:border-primary-800'
          )}
        >
          <div className={cn(
            'p-2 rounded-xl shrink-0',
            isErrorToast
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              : 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
          )}>
            {isErrorToast ? <AlertCircle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {toastNotification.title}
            </h4>
            <p className={cn('text-xs text-slate-600 dark:text-slate-400 mt-0.5', isErrorToast ? 'line-clamp-4' : 'line-clamp-2')}>
              {toastNotification.message}
            </p>
          </div>
          <button onClick={clearToast} aria-label="Dismiss" className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Collapsible Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className={cn('flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-in-out', isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <Header
          setIsMobileOpen={setIsMobileOpen}
          onOpenNewTaskModal={() => handleOpenNewTaskModal()}
          onOpenNewProjectModal={() => handleOpenNewProjectModal()}
          setCurrentTab={handleTabChange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <MainDashboard
              onOpenTaskDetails={handleOpenTaskDetails}
              onOpenNewTaskModal={() => handleOpenNewTaskModal()}
              onOpenNewProjectModal={() => handleOpenNewProjectModal()}
              setCurrentTab={handleTabChange}
            />
          )}

          {currentTab === 'my-tasks' && <PersonalTasks />}

          {currentTab === 'calendar' && (
            <CalendarView onOpenTaskDetails={handleOpenTaskDetails} />
          )}

          {currentTab === 'teams' && (
            selectedTeamId ? (
              <TeamWorkspace
                teamId={selectedTeamId}
                onBackToTeams={() => setSelectedTeamId(null)}
                onOpenProject={(pId) => {
                  setSelectedProjectId(pId);
                  setCurrentTab('projects');
                }}
                onOpenTaskDetails={handleOpenTaskDetails}
                onOpenNewTaskModal={(tId) => handleOpenNewTaskModal(tId)}
                onOpenNewProjectModal={(tId) => handleOpenNewProjectModal(tId)}
                onEditTeam={setEditTeamId}
                onEditProject={setEditProjectId}
              />
            ) : (
              <TeamsList
                onSelectTeam={handleSelectTeam}
                onOpenCreateTeam={() => setIsCreateTeamOpen(true)}
                onEditTeam={setEditTeamId}
              />
            )
          )}

          {currentTab === 'projects' && (
            selectedProjectId ? (
              <ProjectDetails
                projectId={selectedProjectId}
                onBack={() => setSelectedProjectId(null)}
                onOpenTaskDetails={handleOpenTaskDetails}
                onOpenCreateSubtask={(parentId, pId, tId) => handleOpenCreateSubtask(parentId, pId, tId)}
                onEditProject={setEditProjectId}
              />
            ) : (
              <ProjectsList
                onSelectProject={handleSelectProject}
                onOpenCreateProject={() => handleOpenNewProjectModal()}
                onEditProject={setEditProjectId}
              />
            )
          )}

          {currentTab === 'sessions' && <StudySessionsPage />}

          {currentTab === 'resources' && <ResourcesPage />}

          {currentTab === 'qa' && <QABoardPage />}

          {currentTab === 'focus' && <FocusPage />}

          {currentTab === 'notifications' && (
            <NotificationsPage onOpenTaskDetails={handleOpenTaskDetails} />
          )}

          {currentTab === 'reports' && <ReportsPage />}

          {currentTab === 'profile' && <UserProfile />}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        initialTeamId={createTaskTeamId}
        initialProjectId={createTaskProjectId}
        initialParentTaskId={createTaskParentId}
      />

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        initialTeamId={createProjectTeamId}
      />

      <CreateProjectModal
        isOpen={Boolean(editProject)}
        onClose={() => setEditProjectId(null)}
        project={editProject}
      />

      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
      />

      <CreateTeamModal
        isOpen={Boolean(editTeam)}
        onClose={() => setEditTeamId(null)}
        team={editTeam}
      />

      <TaskDetailsModal
        isOpen={Boolean(activeTaskId)}
        onClose={() => setActiveTaskId(null)}
        taskId={activeTaskId}
        onOpenCreateSubtask={(parentId) => {
          setActiveTaskId(null);
          handleOpenCreateSubtask(parentId);
        }}
      />
    </div>
  );
}
