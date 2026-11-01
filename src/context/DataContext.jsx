import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  INITIAL_PROFILES,
  INITIAL_TEAMS,
  INITIAL_TEAM_MEMBERS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_PERSONAL_TASKS,
  INITIAL_COMMENTS,
  INITIAL_ATTACHMENTS,
  INITIAL_ACTIVITY,
} from '@/lib/mockData';
import { isOverdue, getWorkloadLevel } from '@/lib/utils';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import confetti from 'canvas-confetti';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const cleanCache = (key) => {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    if (saved.includes('user-alex-1') || saved.includes('task-parent-1') || saved.includes('proj-ecommerce-1') || saved.includes('pt-1') || saved.includes('Prepare Sprint Review')) {
      localStorage.removeItem(key);
      return [];
    }
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  };

  // 1. Data States with LocalStorage Persistence
  const [profiles, setProfiles] = useState(() => cleanCache('tasksync_profiles'));
  const [teams, setTeams] = useState(() => cleanCache('tasksync_teams'));
  const [teamMembers, setTeamMembers] = useState(() => cleanCache('tasksync_team_members'));
  const [teamInvitations, setTeamInvitations] = useState(() => cleanCache('tasksync_team_invitations'));
  const [projects, setProjects] = useState(() => cleanCache('tasksync_projects'));
  const [tasks, setTasks] = useState(() => cleanCache('tasksync_tasks'));
  const [personalTasks, setPersonalTasks] = useState(() => cleanCache('tasksync_personal_tasks'));
  const [comments, setComments] = useState(() => cleanCache('tasksync_comments'));
  const [attachments, setAttachments] = useState(() => cleanCache('tasksync_attachments'));
  const [activity, setActivity] = useState(() => cleanCache('tasksync_activity'));

  const [tablesExist, setTablesExist] = useState(true);

  // Initial load from Supabase if configured
  useEffect(() => {
    async function loadSupabaseData() {
      if (isSupabaseConfigured && supabase) {
        try {
          // Profiles
          const { data: dbProfiles } = await supabase.from('profiles').select('*');
          if (dbProfiles) setProfiles(dbProfiles);

          // Teams
          const { data: dbTeams, error: teamsError } = await supabase.from('teams').select('*');
          if (teamsError) {
            console.warn('Supabase query notice:', teamsError.message);
            setTablesExist(false);
            return;
          }
          setTablesExist(true);
          if (dbTeams) setTeams(dbTeams);

          // Projects
          const { data: dbProjects } = await supabase.from('projects').select('*');
          if (dbProjects) setProjects(dbProjects);

          // Tasks
          const { data: dbTasks } = await supabase.from('tasks').select('*');
          if (dbTasks) setTasks(dbTasks);

          // Members
          const { data: dbMembers } = await supabase.from('team_members').select('*');
          if (dbMembers) setTeamMembers(dbMembers);

          // Personal Tasks
          if (user?.id) {
            const { data: dbPersonal } = await supabase
              .from('personal_tasks')
              .select('*')
              .eq('user_id', user.id);
            if (dbPersonal) setPersonalTasks(dbPersonal);
          }

          // Comments
          const { data: dbComments } = await supabase.from('task_comments').select('*');
          if (dbComments) setComments(dbComments);

          // Attachments
          const { data: dbAttachments } = await supabase.from('task_attachments').select('*');
          if (dbAttachments) setAttachments(dbAttachments);

          // Activity
          const { data: dbActivity } = await supabase.from('task_activity').select('*');
          if (dbActivity) setActivity(dbActivity);
        } catch (e) {
          console.warn('Error loading Supabase data:', e);
          setTablesExist(false);
        }
      }
    }
    loadSupabaseData();
  }, [user?.id]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('tasksync_profiles', JSON.stringify(profiles));
    localStorage.setItem('tasksync_teams', JSON.stringify(teams));
    localStorage.setItem('tasksync_team_members', JSON.stringify(teamMembers));
    localStorage.setItem('tasksync_team_invitations', JSON.stringify(teamInvitations));
    localStorage.setItem('tasksync_projects', JSON.stringify(projects));
    localStorage.setItem('tasksync_tasks', JSON.stringify(tasks));
    localStorage.setItem('tasksync_personal_tasks', JSON.stringify(personalTasks));
    localStorage.setItem('tasksync_comments', JSON.stringify(comments));
    localStorage.setItem('tasksync_attachments', JSON.stringify(attachments));
    localStorage.setItem('tasksync_activity', JSON.stringify(activity));
  }, [profiles, teams, teamMembers, teamInvitations, projects, tasks, personalTasks, comments, attachments, activity]);

  // Realtime Supabase listeners if configured
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const taskChannel = supabase
        .channel('public:tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => (t.id === payload.new.id ? payload.new : t)));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id === payload.old.id));
          }
        })
        .subscribe();

      const commentsChannel = supabase
        .channel('public:task_comments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setComments(prev => [...prev, payload.new]);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(taskChannel);
        supabase.removeChannel(commentsChannel);
      };
    }
  }, []);

  // ----------------------------------------------------
  // Helper: Log Activity
  // ----------------------------------------------------
  const logActivity = (taskId, action, oldValue = '', newValue = '') => {
    const newEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      task_id: taskId,
      user_id: user?.id || 'system',
      action,
      old_value: oldValue,
      new_value: newValue,
      created_at: new Date().toISOString()
    };
    setActivity(prev => [newEntry, ...prev]);
    if (isSupabaseConfigured && supabase) {
      supabase.from('task_activity').insert(newEntry).then();
    }
  };

  // ----------------------------------------------------
  // Automatic Progress Calculations
  // Formula: Project Progress = (Completed Subtasks / Total Subtasks) * 100
  // ----------------------------------------------------
  const getProjectProgress = (projectId) => {
    const projectSubtasks = tasks.filter(t => t.project_id === projectId && t.parent_task_id !== null);
    if (projectSubtasks.length > 0) {
      const completed = projectSubtasks.filter(t => t.status === 'Completed').length;
      return Math.round((completed / projectSubtasks.length) * 100);
    }
    // If no explicit subtasks, use all tasks in the project
    const allProjectTasks = tasks.filter(t => t.project_id === projectId);
    if (allProjectTasks.length === 0) return 0;
    const completed = allProjectTasks.filter(t => t.status === 'Completed').length;
    return Math.round((completed / allProjectTasks.length) * 100);
  };

  const getSubtasks = (parentTaskId) => {
    return tasks.filter(t => t.parent_task_id === parentTaskId);
  };

  // ----------------------------------------------------
  // Member Productivity & Workload Calculations
  // ----------------------------------------------------
  const getMemberWorkload = (memberId) => {
    const memberTasks = tasks.filter(t => t.assigned_to === memberId);
    const activeTasks = memberTasks.filter(t => t.status !== 'Completed');
    const overdueTasks = activeTasks.filter(t => isOverdue(t.due_date, t.status));
    const completedTasks = memberTasks.filter(t => t.status === 'Completed');
    const underReviewTasks = memberTasks.filter(t => t.status === 'Under Review');

    const workloadInfo = getWorkloadLevel(activeTasks.length, overdueTasks.length);

    return {
      totalAssigned: memberTasks.length,
      activeCount: activeTasks.length,
      overdueCount: overdueTasks.length,
      completedCount: completedTasks.length,
      underReviewCount: underReviewTasks.length,
      completionRate: memberTasks.length > 0 ? Math.round((completedTasks.length / memberTasks.length) * 100) : 0,
      workloadLevel: workloadInfo.level,
      badgeColor: workloadInfo.color,
      description: workloadInfo.description,
      upcomingDeadlines: activeTasks
        .filter(t => t.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 3)
    };
  };

  // Smart Workload Balancer: Recommend assignee
  const getRecommendedAssignee = (teamId) => {
    const membersInTeam = teamMembers
      .filter(tm => tm.team_id === teamId)
      .map(tm => {
        const profile = profiles.find(p => p.id === tm.user_id);
        const workload = getMemberWorkload(tm.user_id);
        return {
          ...tm,
          profile,
          workload,
          // Workload score: lower is better
          score: workload.activeCount * 2 + workload.overdueCount * 5
        };
      })
      .sort((a, b) => a.score - b.score);

    return {
      recommended: membersInTeam[0] || null,
      allMembers: membersInTeam
    };
  };

  // ----------------------------------------------------
  // Team Stats for Dashboard
  // ----------------------------------------------------
  const getTeamStats = (teamId = null) => {
    const filteredProjects = teamId ? projects.filter(p => p.team_id === teamId) : projects;
    const filteredTasks = teamId ? tasks.filter(t => t.team_id === teamId) : tasks;
    const filteredMembers = teamId ? teamMembers.filter(tm => tm.team_id === teamId) : teamMembers;

    const completed = filteredTasks.filter(t => t.status === 'Completed').length;
    const inProgress = filteredTasks.filter(t => t.status === 'In Progress').length;
    const underReview = filteredTasks.filter(t => t.status === 'Under Review').length;
    const overdue = filteredTasks.filter(t => isOverdue(t.due_date, t.status)).length;
    const pending = filteredTasks.length - completed;
    const completionPercentage = filteredTasks.length > 0 ? Math.round((completed / filteredTasks.length) * 100) : 0;

    return {
      activeProjectsCount: filteredProjects.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled').length,
      totalProjectsCount: filteredProjects.length,
      membersCount: filteredMembers.length,
      totalTasksCount: filteredTasks.length,
      completedCount: completed,
      inProgressCount: inProgress,
      underReviewCount: underReview,
      overdueCount: overdue,
      pendingCount: pending,
      completionPercentage
    };
  };

  // ----------------------------------------------------
  // CRUD Actions: Teams & Members
  // ----------------------------------------------------
  const createTeam = ({ name, description, avatar_url }) => {
    const newTeamId = `team-${Date.now()}`;
    const newTeam = {
      id: newTeamId,
      name,
      description: description || '',
      avatar_url: avatar_url || `https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80`,
      created_by: user?.id,
      created_at: new Date().toISOString()
    };
    setTeams(prev => [newTeam, ...prev]);

    // Automatically make creator the team leader
    const newMembership = {
      id: `tm-${Date.now()}`,
      team_id: newTeamId,
      user_id: user?.id,
      role: 'leader',
      joined_at: new Date().toISOString()
    };
    setTeamMembers(prev => [...prev, newMembership]);

    addNotification({
      title: "Team Created",
      message: `You created team "${name}".`,
      type: "team_invite"
    });

    return newTeam;
  };

  const inviteMember = ({ teamId, email, role = 'member' }) => {
    const existing = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    const token = `inv-${Math.random().toString(36).substr(2, 9)}`;
    const newInvite = {
      id: `inv-${Date.now()}`,
      team_id: teamId,
      email,
      invited_by: user?.id,
      invitation_token: token,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    setTeamInvitations(prev => [newInvite, ...prev]);

    // If user already exists in profiles, add them as member
    if (existing) {
      const alreadyMember = teamMembers.some(tm => tm.team_id === teamId && tm.user_id === existing.id);
      if (!alreadyMember) {
        const newMember = {
          id: `tm-${Date.now()}`,
          team_id: teamId,
          user_id: existing.id,
          role,
          joined_at: new Date().toISOString()
        };
        setTeamMembers(prev => [...prev, newMember]);
      }
    }

    addNotification({
      title: "Invitation Sent",
      message: `Invitation link generated for ${email}.`,
      type: "team_invite"
    });

    return { invite: newInvite, link: `${window.location.origin}/invite/${token}` };
  };

  const removeMember = (teamId, userId) => {
    setTeamMembers(prev => prev.filter(tm => !(tm.team_id === teamId && tm.user_id === userId)));
    addNotification({
      title: "Member Removed",
      message: `Member removed from team workspace.`,
      type: "info"
    });
  };

  const updateMemberRole = (teamId, userId, newRole) => {
    setTeamMembers(prev =>
      prev.map(tm => (tm.team_id === teamId && tm.user_id === userId ? { ...tm, role: newRole } : tm))
    );
  };

  // ----------------------------------------------------
  // CRUD Actions: Projects
  // ----------------------------------------------------
  const createProject = (projectData) => {
    const newProj = {
      id: `proj-${Date.now()}`,
      team_id: projectData.team_id,
      name: projectData.name,
      description: projectData.description || '',
      priority: projectData.priority || 'Medium',
      status: projectData.status || 'Planning',
      category: projectData.category || 'Development',
      start_date: projectData.start_date || new Date().toISOString().split('T')[0],
      due_date: projectData.due_date || '',
      created_by: user?.id,
      created_at: new Date().toISOString()
    };
    setProjects(prev => [newProj, ...prev]);

    addNotification({
      title: "New Project Created",
      message: `Project "${newProj.name}" was created successfully.`,
      type: "project_assigned"
    });

    return newProj;
  };

  const updateProject = (projectId, updates) => {
    setProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, ...updates } : p))
    );
  };

  const deleteProject = (projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.filter(t => t.project_id !== projectId));
  };

  // ----------------------------------------------------
  // CRUD Actions: Tasks & Review Workflow
  // ----------------------------------------------------
  const createTask = (taskData) => {
    const newTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      project_id: taskData.project_id || null,
      team_id: taskData.team_id,
      parent_task_id: taskData.parent_task_id || null,
      title: taskData.title,
      description: taskData.description || '',
      assigned_to: taskData.assigned_to || null,
      created_by: user?.id,
      priority: taskData.priority || 'Medium',
      status: taskData.status || 'To Do',
      progress: taskData.progress || 0,
      start_date: taskData.start_date || new Date().toISOString().split('T')[0],
      due_date: taskData.due_date || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    logActivity(newTask.id, 'created', '', newTask.title);

    // Notify assigned member
    if (newTask.assigned_to && newTask.assigned_to !== user?.id) {
      addNotification({
        title: "New Task Assigned",
        message: `You were assigned: "${newTask.title}"`,
        type: "task_assigned",
        related_task_id: newTask.id,
        userId: newTask.assigned_to
      });
    }

    return newTask;
  };

  const updateTask = (taskId, updates) => {
    const existing = tasks.find(t => t.id === taskId);
    if (!existing) return;

    // Track status change for activity log
    if (updates.status && updates.status !== existing.status) {
      logActivity(taskId, 'status_change', existing.status, updates.status);
    }
    if (updates.assigned_to && updates.assigned_to !== existing.assigned_to) {
      const newAssignee = profiles.find(p => p.id === updates.assigned_to);
      logActivity(taskId, 'reassigned', existing.assigned_to, newAssignee?.full_name || updates.assigned_to);

      addNotification({
        title: "Task Reassigned",
        message: `Task "${existing.title}" was reassigned.`,
        type: "task_assigned",
        related_task_id: taskId,
        userId: updates.assigned_to
      });
    }

    const updatedTask = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    setTasks(prev => prev.map(t => (t.id === taskId ? updatedTask : t)));

    if (isSupabaseConfigured && supabase) {
      supabase.from('tasks').update(updates).eq('id', taskId).then();
    }

    return updatedTask;
  };

  const submitTaskForReview = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    updateTask(taskId, {
      status: 'Under Review',
      progress: Math.max(task.progress, 90)
    });

    logActivity(taskId, 'submitted_for_review', task.status, 'Under Review');

    // Notify team leader/creator
    addNotification({
      title: "Task Submitted for Review",
      message: `"${task.title}" was submitted for review by ${user?.full_name || 'member'}.`,
      type: "task_review",
      related_task_id: taskId
    });
  };

  const approveTaskReview = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    updateTask(taskId, {
      status: 'Completed',
      progress: 100
    });

    logActivity(taskId, 'approved_completed', task.status, 'Completed');

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    // Notify assignee
    if (task.assigned_to) {
      addNotification({
        title: "Task Approved!",
        message: `Your task "${task.title}" has been approved and marked as Completed!`,
        type: "task_completed",
        related_task_id: taskId,
        userId: task.assigned_to
      });
    }
  };

  const requestChangesReview = (taskId, feedbackComment) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    updateTask(taskId, {
      status: 'Changes Requested'
    });

    logActivity(taskId, 'changes_requested', task.status, 'Changes Requested');

    if (feedbackComment) {
      addComment(taskId, `Review Feedback: ${feedbackComment}`);
    }

    // Notify assignee
    if (task.assigned_to) {
      addNotification({
        title: "Changes Requested on Task",
        message: `Team leader requested changes on "${task.title}". Check comments for feedback.`,
        type: "changes_requested",
        related_task_id: taskId,
        userId: task.assigned_to
      });
    }
  };

  const deleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId && t.parent_task_id !== taskId));
    if (isSupabaseConfigured && supabase) {
      supabase.from('tasks').delete().eq('id', taskId).then();
    }
  };

  // ----------------------------------------------------
  // CRUD Actions: Personal Tasks
  // ----------------------------------------------------
  const createPersonalTask = (data) => {
    const newPt = {
      id: `pt-${Date.now()}`,
      user_id: user?.id,
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'Medium',
      status: data.status || 'To Do',
      due_date: data.due_date || '',
      category: data.category || 'General',
      reminder_date: data.reminder_date || null,
      created_at: new Date().toISOString()
    };
    setPersonalTasks(prev => [newPt, ...prev]);
    return newPt;
  };

  const updatePersonalTask = (id, updates) => {
    setPersonalTasks(prev =>
      prev.map(pt => (pt.id === id ? { ...pt, ...updates } : pt))
    );
  };

  const togglePersonalTaskStatus = (id) => {
    setPersonalTasks(prev =>
      prev.map(pt => {
        if (pt.id === id) {
          const nextStatus = pt.status === 'Completed' ? 'To Do' : 'Completed';
          return { ...pt, status: nextStatus };
        }
        return pt;
      })
    );
  };

  const deletePersonalTask = (id) => {
    setPersonalTasks(prev => prev.filter(pt => pt.id !== id));
  };

  // ----------------------------------------------------
  // Comments & Attachments
  // ----------------------------------------------------
  const addComment = (taskId, text) => {
    const newComment = {
      id: `comment-${Date.now()}`,
      task_id: taskId,
      user_id: user?.id,
      comment: text,
      created_at: new Date().toISOString()
    };
    setComments(prev => [...prev, newComment]);
    logActivity(taskId, 'comment_added', '', text.substring(0, 30));

    // Notify task assignee if someone else commented
    const task = tasks.find(t => t.id === taskId);
    if (task && task.assigned_to && task.assigned_to !== user?.id) {
      addNotification({
        title: "New Comment on Task",
        message: `${user?.full_name || 'Someone'} commented on "${task.title}"`,
        type: "comment_added",
        related_task_id: taskId,
        userId: task.assigned_to
      });
    }

    return newComment;
  };

  const addAttachment = (taskId, file) => {
    const newAttachment = {
      id: `att-${Date.now()}`,
      task_id: taskId,
      uploaded_by: user?.id,
      file_name: file.name,
      file_url: file.url || URL.createObjectURL(file),
      file_size: file.size || 102400,
      file_type: file.type || 'application/octet-stream',
      created_at: new Date().toISOString()
    };
    setAttachments(prev => [newAttachment, ...prev]);
    logActivity(taskId, 'attachment_added', '', file.name);
    return newAttachment;
  };

  return (
    <DataContext.Provider
      value={{
        profiles,
        teams,
        teamMembers,
        teamInvitations,
        projects,
        tasks,
        personalTasks,
        comments,
        attachments,
        activity,
        tablesExist,
        // Calculation & stats functions
        getProjectProgress,
        getSubtasks,
        getMemberWorkload,
        getRecommendedAssignee,
        getTeamStats,
        // Teams actions
        createTeam,
        inviteMember,
        removeMember,
        updateMemberRole,
        // Projects actions
        createProject,
        updateProject,
        deleteProject,
        // Tasks actions
        createTask,
        updateTask,
        submitTaskForReview,
        approveTaskReview,
        requestChangesReview,
        deleteTask,
        // Personal tasks actions
        createPersonalTask,
        updatePersonalTask,
        togglePersonalTaskStatus,
        deletePersonalTask,
        // Comments & Attachments
        addComment,
        addAttachment,
        logActivity,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
