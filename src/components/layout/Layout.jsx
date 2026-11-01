import React, { useState } from 'react';
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
import { AdminManagement } from '@/pages/admin/AdminManagement';

import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { CreateTeamModal } from '@/components/teams/CreateTeamModal';
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal';

import { useNotifications } from '@/context/NotificationContext';
import { Sparkles, Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Layout() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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

  const [activeTaskId, setActiveTaskId] = useState(null);

  const { toastNotification, clearToast } = useNotifications();

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
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-primary-200 dark:border-primary-800 shadow-2xl flex items-start gap-3 max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-2 rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {toastNotification.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
              {toastNotification.message}
            </p>
          </div>
          <button onClick={clearToast} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
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
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:pl-64">
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
              />
            ) : (
              <TeamsList
                onSelectTeam={handleSelectTeam}
                onOpenCreateTeam={() => setIsCreateTeamOpen(true)}
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
              />
            ) : (
              <ProjectsList
                onSelectProject={handleSelectProject}
                onOpenCreateProject={() => handleOpenNewProjectModal()}
              />
            )
          )}

          {currentTab === 'admin' && <AdminManagement />}

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

      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
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
