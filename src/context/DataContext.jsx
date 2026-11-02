import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';
import { isOverdue, getWorkloadLevel, newId, emptyToNull } from '@/lib/utils';
import { sendEmail } from '@/lib/email';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

const DataContext = createContext();

export const ATTACHMENTS_BUCKET = 'task-attachments';
const LEADER_ROLES = ['leader', 'admin'];
const DATE_FIELDS = ['start_date', 'due_date', 'reminder_date'];

const nowIso = () => new Date().toISOString();

const upsertById = (list, row) =>
  list.some(r => r.id === row.id)
    ? list.map(r => (r.id === row.id ? { ...r, ...row } : r))
    : [row, ...list];

const removeById = (list, id) => list.filter(r => r.id !== id);

// Blank date inputs must be saved as NULL.
const cleanDates = (record) => {
  const out = { ...record };
  DATE_FIELDS.forEach((field) => {
    if (field in out) out[field] = emptyToNull(out[field]);
  });
  return out;
};

// Ids of a task and every subtask nested under it.
const collectTaskTree = (tasks, rootId) => {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    tasks.forEach((t) => {
      if (t.parent_task_id && ids.has(t.parent_task_id) && !ids.has(t.id)) {
        ids.add(t.id);
        grew = true;
      }
    });
  }
  return ids;
};

export function DataProvider({ children }) {
  const { user } = useAuth();
  const { addNotification, notifyError } = useNotifications();
  const userId = user?.id;

  const [profiles, setProfiles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamInvitations, setTeamInvitations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [personalTasks, setPersonalTasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState(true);

  // Realtime handlers need the latest lists without re-subscribing.
  const teamMembersRef = useRef(teamMembers);
  teamMembersRef.current = teamMembers;
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  // Run a Supabase query; on failure show the error and return ok: false.
  const run = useCallback(async (failureMessage, query) => {
    const { data, error } = await query;
    if (error) {
      console.error(failureMessage, error);
      notifyError(`${failureMessage}: ${error.message}`);
      return { ok: false, error };
    }
    return { ok: true, data };
  }, [notifyError]);

  // ----------------------------------------------------
  // Loading
  // ----------------------------------------------------
  const loadAll = useCallback(async () => {
    if (!userId) return;
    const results = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('teams').select('*').order('created_at', { ascending: false }),
      supabase.from('team_members').select('*'),
      supabase.from('team_invitations').select('*').eq('status', 'pending'),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('personal_tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('task_comments').select('*').order('created_at', { ascending: true }),
      supabase.from('task_attachments').select('*').order('created_at', { ascending: false }),
      supabase.from('task_activity').select('*').order('created_at', { ascending: false }),
    ]);

    const failed = results.find(r => r.error);
    if (failed) {
      console.error('Error loading data from Supabase:', failed.error);
      setTablesExist(false);
      notifyError(`Could not load your study groups: ${failed.error.message}`);
    } else {
      setTablesExist(true);
    }

    const [p, t, tm, inv, pr, tk, pt, c, a, act] = results.map(r => r.data || []);
    setProfiles(p);
    setTeams(t);
    setTeamMembers(tm);
    setTeamInvitations(inv);
    setProjects(pr);
    setTasks(tk);
    setPersonalTasks(pt);
    setComments(c);
    setAttachments(a);
    setActivity(act);
    setLoading(false);
  }, [userId, notifyError]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Fire-and-forget email; a failure shows a toast but never undoes the save.
  const notifyByEmail = useCallback((type, payload) => {
    sendEmail(type, payload).then((result) => {
      if (!result.ok) {
        console.warn(`Email "${type}" not sent:`, result.error);
        notifyError(result.error, 'Email not sent');
      }
    });
  }, [notifyError]);

  const ensureProfile = useCallback(async (profileId) => {
    if (!profileId || profilesRef.current.some(p => p.id === profileId)) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle();
    if (data) setProfiles(prev => upsertById(prev, data));
  }, []);

  // ----------------------------------------------------
  // Realtime: apply other people's changes as they happen
  // ----------------------------------------------------
  useEffect(() => {
    if (!userId) return undefined;

    const simpleTables = {
      teams: setTeams,
      team_invitations: setTeamInvitations,
      projects: setProjects,
      tasks: setTasks,
      personal_tasks: setPersonalTasks,
      task_comments: setComments,
      task_attachments: setAttachments,
      task_activity: setActivity,
    };

    const channel = supabase.channel(`tasksync-data-${userId}`);

    Object.entries(simpleTables).forEach(([table, setter]) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (payload.eventType === 'DELETE') {
          if (payload.old?.id) setter(prev => removeById(prev, payload.old.id));
        } else if (payload.new?.id) {
          setter(prev => upsertById(prev, payload.new));
        }
      });
    });

    // Joining or leaving a team changes which teams, projects and tasks this
    // user may see, so reload everything in that case.
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        const removedId = payload.old?.id;
        const wasMine = teamMembersRef.current.some(m => m.id === removedId && m.user_id === userId);
        if (wasMine) {
          loadAll();
        } else if (removedId) {
          setTeamMembers(prev => removeById(prev, removedId));
        }
        return;
      }
      const row = payload.new;
      const isNewForMe = row.user_id === userId && !teamMembersRef.current.some(m => m.id === row.id);
      if (isNewForMe) {
        loadAll();
        return;
      }
      setTeamMembers(prev => upsertById(prev, row));
      ensureProfile(row.user_id);
    });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, loadAll, ensureProfile]);

  // ----------------------------------------------------
  // Permissions (mirror the database rules so the UI only offers allowed actions)
  // ----------------------------------------------------
  const myTeamRole = (teamId) =>
    teamMembers.find(tm => tm.team_id === teamId && tm.user_id === userId)?.role || null;

  // Organizers of a group: whoever created it, plus anyone they made an organizer.
  const canManageTeam = (teamId) => Boolean(teamId) && LEADER_ROLES.includes(myTeamRole(teamId));

  const manageableTeams = teams.filter(t => canManageTeam(t.id));

  // Study groups: every member can add subjects, tasks, sessions, resources
  // and questions. Managing a specific item is for its creator or a leader.
  const isMemberOf = (teamId) => Boolean(teamId) && Boolean(myTeamRole(teamId));
  const memberTeams = teams.filter(t => isMemberOf(t.id));
  const canManageItem = (item) => Boolean(item) && (canManageTeam(item.team_id) || item.created_by === userId);
  const canManageTask = canManageItem;
  const canManageProject = canManageItem;

  const teamLeaderIds = (teamId) =>
    teamMembers.filter(tm => tm.team_id === teamId && LEADER_ROLES.includes(tm.role)).map(tm => tm.user_id);

  const myPendingInvitations = teamInvitations.filter(
    inv => inv.status === 'pending' && inv.email?.toLowerCase() === user?.email?.toLowerCase()
  );

  // ----------------------------------------------------
  // Activity log
  // ----------------------------------------------------
  const logActivity = async (taskId, action, oldValue = '', newValue = '') => {
    const entry = {
      id: newId(),
      task_id: taskId,
      user_id: userId,
      action,
      old_value: oldValue ?? '',
      new_value: newValue ?? '',
      created_at: nowIso(),
    };
    setActivity(prev => [entry, ...prev]);
    const { error } = await supabase.from('task_activity').insert(entry);
    if (error) {
      console.warn('Activity not logged:', error.message);
      setActivity(prev => removeById(prev, entry.id));
    }
  };

  // ----------------------------------------------------
  // Calculations
  // Project progress = completed subtasks / total subtasks x 100
  // ----------------------------------------------------
  const getProjectProgress = (projectId) => {
    const projectTasks = tasks.filter(t => t.project_id === projectId);
    const subtasks = projectTasks.filter(t => t.parent_task_id);
    const basis = subtasks.length > 0 ? subtasks : projectTasks;
    if (basis.length === 0) return 0;
    const completed = basis.filter(t => t.status === 'Completed').length;
    return Math.round((completed / basis.length) * 100);
  };

  const getSubtasks = (parentTaskId) => tasks.filter(t => t.parent_task_id === parentTaskId);

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
        .slice(0, 3),
    };
  };

  // Recommend the member with the lowest load (active x 2 + overdue x 5).
  const getRecommendedAssignee = (teamId) => {
    const membersInTeam = teamMembers
      .filter(tm => tm.team_id === teamId)
      .map((tm) => {
        const workload = getMemberWorkload(tm.user_id);
        return {
          ...tm,
          profile: profiles.find(p => p.id === tm.user_id),
          workload,
          score: workload.activeCount * 2 + workload.overdueCount * 5,
        };
      })
      .sort((a, b) => a.score - b.score);

    return { recommended: membersInTeam[0] || null, allMembers: membersInTeam };
  };

  const getTeamStats = (teamId = null) => {
    const filteredProjects = teamId ? projects.filter(p => p.team_id === teamId) : projects;
    const filteredTasks = teamId ? tasks.filter(t => t.team_id === teamId) : tasks;
    const filteredMembers = teamId ? teamMembers.filter(tm => tm.team_id === teamId) : teamMembers;

    const completed = filteredTasks.filter(t => t.status === 'Completed').length;
    return {
      activeProjectsCount: filteredProjects.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled').length,
      totalProjectsCount: filteredProjects.length,
      membersCount: filteredMembers.length,
      totalTasksCount: filteredTasks.length,
      completedCount: completed,
      inProgressCount: filteredTasks.filter(t => t.status === 'In Progress').length,
      underReviewCount: filteredTasks.filter(t => t.status === 'Under Review').length,
      overdueCount: filteredTasks.filter(t => isOverdue(t.due_date, t.status)).length,
      pendingCount: filteredTasks.length - completed,
      completionPercentage: filteredTasks.length > 0 ? Math.round((completed / filteredTasks.length) * 100) : 0,
    };
  };

  // ----------------------------------------------------
  // Teams & members
  // ----------------------------------------------------
  const createTeam = async ({ name, description, avatar_url }) => {
    const team = {
      id: newId(),
      name,
      description: description || '',
      avatar_url: avatar_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
      created_by: userId,
      created_at: nowIso(),
    };
    const membership = { id: newId(), team_id: team.id, user_id: userId, role: 'leader', joined_at: nowIso() };

    setTeams(prev => upsertById(prev, team));
    setTeamMembers(prev => upsertById(prev, membership));

    const teamResult = await run('Could not create the study group', supabase.from('teams').insert(team));
    if (!teamResult.ok) {
      setTeams(prev => removeById(prev, team.id));
      setTeamMembers(prev => removeById(prev, membership.id));
      return null;
    }
    const memberResult = await run('Study group created, but you could not be added as its leader',
      supabase.from('team_members').insert(membership));
    if (!memberResult.ok) setTeamMembers(prev => removeById(prev, membership.id));

    addNotification({ title: 'Study group created', message: `You created the study group "${name}".`, type: 'team_invite' });
    return team;
  };

  // Adds an existing user straight away; otherwise stores an invitation that
  // the person can accept after signing up with that email.
  const inviteMember = async ({ teamId, email, role = 'member' }) => {
    const normalized = email.trim().toLowerCase();
    const team = teams.find(t => t.id === teamId);
    // Any member can invite; only organizers can invite another organizer.
    const teamRole = role === 'leader' && canManageTeam(teamId) ? 'leader' : 'member';

    const lookup = await run('Could not look up that email',
      supabase.from('profiles').select('*').eq('email', normalized).maybeSingle());
    if (!lookup.ok) return { status: 'error', message: lookup.error.message };

    const existing = lookup.data;
    if (existing) {
      setProfiles(prev => upsertById(prev, existing));
      if (teamMembers.some(tm => tm.team_id === teamId && tm.user_id === existing.id)) {
        return { status: 'already_member', message: `${existing.full_name} is already in this team.` };
      }
      const membership = { id: newId(), team_id: teamId, user_id: existing.id, role: teamRole, joined_at: nowIso() };
      setTeamMembers(prev => upsertById(prev, membership));
      const added = await run('Could not add the member', supabase.from('team_members').insert(membership));
      if (!added.ok) {
        setTeamMembers(prev => removeById(prev, membership.id));
        return { status: 'error', message: added.error.message };
      }
      addNotification({
        title: 'Added to a study group',
        message: `${user?.full_name || 'A group member'} added you to "${team?.name || 'a study group'}".`,
        type: 'team_invite',
        userId: existing.id,
      });
      notifyByEmail('member_added', { team_id: teamId, user_id: existing.id });
      return { status: 'added', message: `${existing.full_name} was added to the team and emailed.` };
    }

    const already = teamInvitations.find(
      inv => inv.team_id === teamId && inv.status === 'pending' && inv.email.toLowerCase() === normalized
    );
    if (already) {
      notifyByEmail('invitation_created', { invitation_id: already.id });
      return {
        status: 'invited',
        link: `${window.location.origin}/?invite=${already.invitation_token}`,
        message: `${normalized} was already invited, so the invitation email was sent again.`,
      };
    }

    const invite = {
      id: newId(),
      team_id: teamId,
      team_name: team?.name || null,
      email: normalized,
      role: teamRole,
      invited_by: userId,
      invitation_token: newId(),
      status: 'pending',
      created_at: nowIso(),
    };
    setTeamInvitations(prev => upsertById(prev, invite));
    const saved = await run('Could not create the invitation', supabase.from('team_invitations').insert(invite));
    if (!saved.ok) {
      setTeamInvitations(prev => removeById(prev, invite.id));
      return { status: 'error', message: saved.error.message };
    }
    notifyByEmail('invitation_created', { invitation_id: invite.id });
    return {
      status: 'invited',
      link: `${window.location.origin}/?invite=${invite.invitation_token}`,
      message: `${normalized} has no account yet, so an invitation email is on its way. You can also share this link; after signing up with that email they can accept.`,
    };
  };

  const cancelInvitation = async (invitationId) => {
    const previous = teamInvitations.find(i => i.id === invitationId);
    setTeamInvitations(prev => removeById(prev, invitationId));
    const result = await run('Could not cancel the invitation',
      supabase.from('team_invitations').delete().eq('id', invitationId));
    if (!result.ok && previous) setTeamInvitations(prev => upsertById(prev, previous));
  };

  const acceptInvitation = async (invitation) => {
    const membership = {
      id: newId(),
      team_id: invitation.team_id,
      user_id: userId,
      role: invitation.role || 'member',
      joined_at: nowIso(),
    };
    const joined = await run('Could not join the group', supabase.from('team_members').insert(membership));
    if (!joined.ok) return false;
    await run('Joined, but could not update the invitation',
      supabase.from('team_invitations').update({ status: 'accepted' }).eq('id', invitation.id));
    await loadAll();
    addNotification({
      title: 'Joined study group',
      message: `You joined "${invitation.team_name || 'the group'}".`,
      type: 'team_invite',
    });
    return true;
  };

  const declineInvitation = async (invitation) => {
    setTeamInvitations(prev => prev.map(i => (i.id === invitation.id ? { ...i, status: 'rejected' } : i)));
    const result = await run('Could not decline the invitation',
      supabase.from('team_invitations').update({ status: 'rejected' }).eq('id', invitation.id));
    if (!result.ok) setTeamInvitations(prev => upsertById(prev, invitation));
  };

  const removeMember = async (teamId, memberUserId) => {
    const membership = teamMembers.find(tm => tm.team_id === teamId && tm.user_id === memberUserId);
    if (!membership) return;
    setTeamMembers(prev => removeById(prev, membership.id));
    const result = await run('Could not remove the member',
      supabase.from('team_members').delete().eq('id', membership.id));
    if (!result.ok) {
      setTeamMembers(prev => upsertById(prev, membership));
      return;
    }
    const team = teams.find(t => t.id === teamId);
    addNotification({
      title: 'Removed from study group',
      message: `You were removed from "${team?.name || 'a study group'}".`,
      type: 'info',
      userId: memberUserId,
    });
  };

  const updateMemberRole = async (teamId, memberUserId, newRole) => {
    const membership = teamMembers.find(tm => tm.team_id === teamId && tm.user_id === memberUserId);
    if (!membership) return;
    setTeamMembers(prev => prev.map(tm => (tm.id === membership.id ? { ...tm, role: newRole } : tm)));
    const result = await run('Could not change the member role',
      supabase.from('team_members').update({ role: newRole }).eq('id', membership.id));
    if (!result.ok) setTeamMembers(prev => upsertById(prev, membership));
  };

  // ----------------------------------------------------
  // Projects
  // ----------------------------------------------------
  const createProject = async (projectData) => {
    const project = cleanDates({
      id: newId(),
      team_id: projectData.team_id,
      name: projectData.name,
      description: projectData.description || '',
      priority: projectData.priority || 'Medium',
      status: projectData.status || 'Planning',
      category: projectData.category || 'Course',
      start_date: projectData.start_date || new Date().toISOString().split('T')[0],
      due_date: projectData.due_date,
      created_by: userId,
      created_at: nowIso(),
    });
    setProjects(prev => upsertById(prev, project));
    const result = await run('Could not add the subject', supabase.from('projects').insert(project));
    if (!result.ok) {
      setProjects(prev => removeById(prev, project.id));
      return null;
    }
    addNotification({
      title: 'Subject added',
      message: `Subject "${project.name}" was added. The group is being emailed.`,
      type: 'project_assigned',
    });
    notifyByEmail('project_created', { project_id: project.id });
    return project;
  };

  const updateProject = async (projectId, updates) => {
    const previous = projects.find(p => p.id === projectId);
    if (!previous) return null;
    const clean = cleanDates({ ...updates, updated_at: nowIso() });
    setProjects(prev => prev.map(p => (p.id === projectId ? { ...p, ...clean } : p)));
    const result = await run('Could not update the subject',
      supabase.from('projects').update(clean).eq('id', projectId));
    if (!result.ok) {
      setProjects(prev => upsertById(prev, previous));
      return null;
    }
    return { ...previous, ...clean };
  };

  const deleteProject = async (projectId) => {
    const previousProject = projects.find(p => p.id === projectId);
    const previousTasks = tasks.filter(t => t.project_id === projectId);
    setProjects(prev => removeById(prev, projectId));
    setTasks(prev => prev.filter(t => t.project_id !== projectId));
    const result = await run('Could not delete the subject',
      supabase.from('projects').delete().eq('id', projectId));
    if (!result.ok) {
      if (previousProject) setProjects(prev => upsertById(prev, previousProject));
      setTasks(prev => [...previousTasks, ...prev]);
    }
  };

  // ----------------------------------------------------
  // Tasks & review workflow
  // ----------------------------------------------------
  const createTask = async (taskData) => {
    const task = cleanDates({
      id: newId(),
      project_id: taskData.project_id || null,
      team_id: taskData.team_id,
      parent_task_id: taskData.parent_task_id || null,
      title: taskData.title,
      description: taskData.description || '',
      assigned_to: taskData.assigned_to || null,
      created_by: userId,
      priority: taskData.priority || 'Medium',
      status: taskData.status || 'To Do',
      progress: taskData.progress || 0,
      start_date: taskData.start_date || new Date().toISOString().split('T')[0],
      due_date: taskData.due_date,
      created_at: nowIso(),
      updated_at: nowIso(),
    });

    setTasks(prev => upsertById(prev, task));
    const result = await run('Could not create the task', supabase.from('tasks').insert(task));
    if (!result.ok) {
      setTasks(prev => removeById(prev, task.id));
      return null;
    }

    // The task now exists, so rows that reference it can be saved.
    logActivity(task.id, 'created', '', task.title);
    if (task.assigned_to && task.assigned_to !== userId) {
      addNotification({
        title: 'New task assigned',
        message: `${user?.full_name || 'A group member'} assigned you "${task.title}".`,
        type: 'task_assigned',
        related_task_id: task.id,
        userId: task.assigned_to,
      });
      notifyByEmail('task_assigned', { task_id: task.id });
    }
    return task;
  };

  // statusAction lets callers label the status change in the activity log.
  const updateTask = async (taskId, updates, { statusAction = 'status_change' } = {}) => {
    const existing = tasks.find(t => t.id === taskId);
    if (!existing) return null;

    const clean = cleanDates({ ...updates, updated_at: nowIso() });
    const updatedTask = { ...existing, ...clean };
    setTasks(prev => prev.map(t => (t.id === taskId ? updatedTask : t)));

    const result = await run('Could not update the task', supabase.from('tasks').update(clean).eq('id', taskId));
    if (!result.ok) {
      setTasks(prev => prev.map(t => (t.id === taskId ? existing : t)));
      return null;
    }

    if (clean.status && clean.status !== existing.status) {
      logActivity(taskId, statusAction, existing.status, clean.status);
    }
    if ('assigned_to' in clean && clean.assigned_to !== existing.assigned_to) {
      const newAssignee = profiles.find(p => p.id === clean.assigned_to);
      logActivity(taskId, 'reassigned', '', newAssignee?.full_name || 'Unassigned');
      if (clean.assigned_to && clean.assigned_to !== userId) {
        addNotification({
          title: 'Task assigned to you',
          message: `"${existing.title}" was assigned to you.`,
          type: 'task_assigned',
          related_task_id: taskId,
          userId: clean.assigned_to,
        });
        notifyByEmail('task_assigned', { task_id: taskId });
      }
    }
    return updatedTask;
  };

  const submitTaskForReview = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updated = await updateTask(
      taskId,
      { status: 'Under Review', progress: Math.max(task.progress || 0, 90) },
      { statusAction: 'submitted_for_review' }
    );
    if (!updated) return;

    // Reviewers: the person who created the task plus the organizers.
    const reviewers = [...new Set([...teamLeaderIds(task.team_id), task.created_by].filter(id => id && id !== userId))];
    if (reviewers.length) notifyByEmail('task_submitted', { task_id: taskId });
    reviewers.forEach((reviewerId) => {
      addNotification({
        title: 'Task ready for review',
        message: `${user?.full_name || 'A member'} submitted "${task.title}" for review.`,
        type: 'task_review',
        related_task_id: taskId,
        userId: reviewerId,
      });
    });
    if (reviewers.length === 0) {
      addNotification({
        title: 'Submitted for review',
        message: `"${task.title}" is waiting for review.`,
        type: 'task_review',
        related_task_id: taskId,
      });
    }
  };

  const approveTaskReview = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updated = await updateTask(taskId, { status: 'Completed', progress: 100 }, { statusAction: 'approved' });
    if (!updated) return;

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#7B3F00', '#D2B48C', '#F6F1E9', '#73883F', '#B08024'],
      });
    } catch {
      // confetti is decoration only
    }

    if (task.assigned_to && task.assigned_to !== userId) {
      addNotification({
        title: 'Task approved',
        message: `Your task "${task.title}" was approved and marked Completed.`,
        type: 'task_completed',
        related_task_id: taskId,
        userId: task.assigned_to,
      });
      notifyByEmail('task_approved', { task_id: taskId });
    }
  };

  const requestChangesReview = async (taskId, feedbackComment) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updated = await updateTask(taskId, { status: 'Changes Requested' }, { statusAction: 'changes_requested' });
    if (!updated) return;

    if (feedbackComment) await addComment(taskId, `Review feedback: ${feedbackComment}`, { notify: false });

    if (task.assigned_to && task.assigned_to !== userId) {
      addNotification({
        title: 'Changes requested',
        message: `${user?.full_name || 'The task creator'} requested changes on "${task.title}". See the comments for feedback.`,
        type: 'changes_requested',
        related_task_id: taskId,
        userId: task.assigned_to,
      });
      notifyByEmail('task_changes_requested', { task_id: taskId, feedback: feedbackComment || '' });
    }
  };

  const deleteTask = async (taskId) => {
    const ids = collectTaskTree(tasks, taskId);
    const removed = tasks.filter(t => ids.has(t.id));
    setTasks(prev => prev.filter(t => !ids.has(t.id)));
    // Subtasks are removed by ON DELETE CASCADE.
    const result = await run('Could not delete the task', supabase.from('tasks').delete().eq('id', taskId));
    if (!result.ok) setTasks(prev => [...removed, ...prev]);
  };

  // ----------------------------------------------------
  // Personal tasks
  // ----------------------------------------------------
  const createPersonalTask = async (data) => {
    const task = cleanDates({
      id: newId(),
      user_id: userId,
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'Medium',
      status: data.status || 'To Do',
      due_date: data.due_date,
      category: data.category || 'General',
      reminder_date: data.reminder_date,
      created_at: nowIso(),
    });
    setPersonalTasks(prev => upsertById(prev, task));
    const result = await run('Could not save the task', supabase.from('personal_tasks').insert(task));
    if (!result.ok) {
      setPersonalTasks(prev => removeById(prev, task.id));
      return null;
    }
    return task;
  };

  const updatePersonalTask = async (id, updates) => {
    const previous = personalTasks.find(pt => pt.id === id);
    if (!previous) return null;
    const clean = cleanDates({ ...updates, updated_at: nowIso() });
    setPersonalTasks(prev => prev.map(pt => (pt.id === id ? { ...pt, ...clean } : pt)));
    const result = await run('Could not update the task', supabase.from('personal_tasks').update(clean).eq('id', id));
    if (!result.ok) {
      setPersonalTasks(prev => upsertById(prev, previous));
      return null;
    }
    return { ...previous, ...clean };
  };

  const togglePersonalTaskStatus = (id) => {
    const task = personalTasks.find(pt => pt.id === id);
    if (!task) return null;
    return updatePersonalTask(id, { status: task.status === 'Completed' ? 'To Do' : 'Completed' });
  };

  const deletePersonalTask = async (id) => {
    const previous = personalTasks.find(pt => pt.id === id);
    setPersonalTasks(prev => removeById(prev, id));
    const result = await run('Could not delete the task', supabase.from('personal_tasks').delete().eq('id', id));
    if (!result.ok && previous) setPersonalTasks(prev => upsertById(prev, previous));
  };

  // ----------------------------------------------------
  // Comments & attachments
  // ----------------------------------------------------
  const addComment = async (taskId, text, { notify = true } = {}) => {
    const comment = { id: newId(), task_id: taskId, user_id: userId, comment: text, created_at: nowIso() };
    setComments(prev => [...prev, comment]);
    const result = await run('Could not post the comment', supabase.from('task_comments').insert(comment));
    if (!result.ok) {
      setComments(prev => removeById(prev, comment.id));
      return null;
    }

    logActivity(taskId, 'comment_added', '', text.substring(0, 40));

    const task = tasks.find(t => t.id === taskId);
    if (notify && task) {
      const recipients = new Set([task.assigned_to, task.created_by].filter(id => id && id !== userId));
      recipients.forEach((recipientId) => {
        addNotification({
          title: 'New comment',
          message: `${user?.full_name || 'Someone'} commented on "${task.title}".`,
          type: 'comment_added',
          related_task_id: taskId,
          userId: recipientId,
        });
      });
    }
    return comment;
  };

  // Uploads the file to Supabase Storage, then records it on the task.
  const addAttachment = async (taskId, file) => {
    const safeName = file.name.replace(/[^\w.-]+/g, '_');
    const path = `${taskId}/${newId()}-${safeName}`;

    const upload = await run('Could not upload the file',
      supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, { contentType: file.type || undefined }));
    if (!upload.ok) return null;

    const attachment = {
      id: newId(),
      task_id: taskId,
      uploaded_by: userId,
      file_name: file.name,
      file_url: path,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream',
      created_at: nowIso(),
    };
    const saved = await run('Could not attach the file', supabase.from('task_attachments').insert(attachment));
    if (!saved.ok) {
      await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
      return null;
    }
    setAttachments(prev => upsertById(prev, attachment));
    logActivity(taskId, 'attachment_added', '', file.name);
    return attachment;
  };

  // The bucket is private, so downloads use a short-lived signed URL.
  const getAttachmentUrl = async (attachment) => {
    if (/^https?:\/\//.test(attachment.file_url)) return attachment.file_url;
    const result = await run('Could not open the file',
      supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(attachment.file_url, 300));
    return result.ok ? result.data.signedUrl : null;
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
        loading,
        tablesExist,
        refresh: loadAll,
        notifyByEmail,
        // Permissions
        myTeamRole,
        canManageTeam,
        manageableTeams,
        memberTeams,
        isMemberOf,
        canManageItem,
        canManageTask,
        canManageProject,
        myPendingInvitations,
        // Calculations
        getProjectProgress,
        getSubtasks,
        getMemberWorkload,
        getRecommendedAssignee,
        getTeamStats,
        // Teams
        createTeam,
        inviteMember,
        cancelInvitation,
        acceptInvitation,
        declineInvitation,
        removeMember,
        updateMemberRole,
        // Projects
        createProject,
        updateProject,
        deleteProject,
        // Tasks
        createTask,
        updateTask,
        submitTaskForReview,
        approveTaskReview,
        requestChangesReview,
        deleteTask,
        // Personal tasks
        createPersonalTask,
        updatePersonalTask,
        togglePersonalTaskStatus,
        deletePersonalTask,
        // Comments & attachments
        addComment,
        addAttachment,
        getAttachmentUrl,
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
