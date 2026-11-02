import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Paperclip,
  TrendingUp,
  User,
  Trash2,
  Edit2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { SmartWorkloadBalancer } from '@/components/tasks/SmartWorkloadBalancer';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/components/ui/DialogProvider';
import {
  formatDate,
  formatTimeAgo,
  isOverdue,
  getPriorityBadgeColor,
  getStatusBadgeColor,
  cn
} from '@/lib/utils';

export function ProjectDetails({
  projectId,
  onBack,
  onOpenTaskDetails,
  onOpenCreateSubtask
}) {
  const {
    projects,
    teams,
    tasks,
    profiles,
    comments,
    attachments,
    getProjectProgress,
    deleteProject,
    canManageProject
  } = useData();

  const { user } = useAuth();
  const { confirm } = useDialog();
  const [showWorkloadView, setShowWorkloadView] = useState(false);

  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Subject not found.</p>
        <Button onClick={onBack} className="mt-4">Back to Subjects</Button>
      </div>
    );
  }

  const team = teams.find(t => t.id === project.team_id);
  const projectTasks = tasks.filter(t => t.project_id === project.id);
  const parentTasks = projectTasks.filter(t => !t.parent_task_id);
  const subtasks = projectTasks.filter(t => t.parent_task_id !== null);

  // Automatic Progress: (Completed Subtasks / Total Subtasks) * 100
  const progress = getProjectProgress(project.id);
  const completedSubtasks = subtasks.filter(t => t.status === 'Completed').length;
  const isLeader = canManageProject(project);

  return (
    <div className="space-y-6">
      {/* Project Header Banner */}
      <div className="bg-surface dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mt-0.5"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                  {team?.name || 'Workspace'}
                </span>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getStatusBadgeColor(project.status))}>
                  {project.status}
                </span>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getPriorityBadgeColor(project.priority))}>
                  {project.priority} Priority
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
                {project.name}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              size="sm"
              onClick={() => onOpenCreateSubtask(null, project.id, team?.id)}
              className="gap-1.5 shadow-sm text-xs"
            >
              <Plus className="w-4 h-4" />
              Add Subtask
            </Button>
            {isLeader && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Delete this subject?',
                    message: `"${project.name}" and all of its tasks and subtasks will be permanently deleted.`,
                    confirmText: 'Delete subject',
                  });
                  if (ok) {
                    deleteProject(project.id);
                    onBack();
                  }
                }}
                aria-label="Delete subject"
                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Automatic Progress Card */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary-600" />
                Automatic Progress Formula: ({completedSubtasks} / {subtasks.length || projectTasks.length}) &times; 100
              </span>
              <span className="text-base font-extrabold text-primary-600 dark:text-primary-400">{progress}%</span>
            </div>
            <Progress value={progress} barClassName="h-3" />
            <p className="text-[11px] text-slate-400">
              Progress is worked out from completed tasks, so it always reflects real work.
            </p>
          </div>

          <div className="flex md:justify-end items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Target: {formatDate(project.due_date)}</span>
            </div>
            <button
              onClick={() => setShowWorkloadView(!showWorkloadView)}
              className="text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {showWorkloadView ? "Hide Workload" : "Group Workload"}
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Smart Workload Balancer Dropdown/Card */}
      {showWorkloadView && team && (
        <Card className="p-6">
          <CardHeader className="p-0 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-600" />
                Who is doing what in {team.name}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect member availability before breaking down tasks and assigning new work.
              </p>
            </div>
          </CardHeader>
          <SmartWorkloadBalancer teamId={team.id} />
        </Card>
      )}

      {/* Parent Task & Subtask Distribution System */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-600" />
            Task Distribution & Subtask Breakdown
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenCreateSubtask(null, project.id, team?.id)}
            className="text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Subtask
          </Button>
        </div>

        {/* List of Tasks & Nested Subtasks */}
        {parentTasks.length > 0 ? (
          parentTasks.map((parent) => {
            const children = tasks.filter(t => t.parent_task_id === parent.id);
            const parentAssignee = profiles.find(p => p.id === parent.assigned_to);

            return (
              <div key={parent.id} className="space-y-3">
                {/* Parent Epic Card */}
                <div
                  onClick={() => onOpenTaskDetails(parent.id)}
                  className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:border-primary-400 transition-all shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300">
                        Main Task
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{parent.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{parent.description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium">
                      {children.filter(c => c.status === 'Completed').length}/{children.length} subtasks done
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCreateSubtask(parent.id, project.id, team?.id);
                      }}
                      className="text-xs py-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Subtask
                    </Button>
                  </div>
                </div>

                {/* Subtask Children List */}
                <div className="pl-4 sm:pl-8 space-y-2 border-l-2 border-primary-200 dark:border-primary-900/60 ml-3">
                  {children.map((subtask) => {
                    const assignee = profiles.find(p => p.id === subtask.assigned_to);
                    const subtaskComments = comments.filter(c => c.task_id === subtask.id);
                    const subtaskAtts = attachments.filter(a => a.task_id === subtask.id);
                    const taskOverdue = isOverdue(subtask.due_date, subtask.status);

                    return (
                      <div
                        key={subtask.id}
                        onClick={() => onOpenTaskDetails(subtask.id)}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface dark:bg-slate-900 hover:border-primary-400 hover:shadow-xs transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {subtask.status === 'Completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                            )}
                          </div>
                          <div>
                            <h4 className={cn('text-xs font-bold', subtask.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white')}>
                              {subtask.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{subtask.description}</p>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Due {formatDate(subtask.due_date)}
                              </span>
                              {subtaskComments.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" /> {subtaskComments.length}
                                </span>
                              )}
                              {subtaskAtts.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Paperclip className="w-3 h-3" /> {subtaskAtts.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-auto">
                          {/* Assignee Avatar */}
                          <div className="flex items-center gap-2">
                            <Avatar src={assignee?.avatar_url} name={assignee?.full_name} size="xs" />
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                              {assignee?.full_name || 'Unassigned'}
                            </span>
                          </div>

                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getPriorityBadgeColor(subtask.priority))}>
                            {subtask.priority}
                          </span>

                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getStatusBadgeColor(subtask.status))}>
                            {subtask.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-surface dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No tasks created yet</h4>
            <p className="text-xs text-slate-500 mt-1">Break this subject into study tasks for the group.</p>
            <Button
              size="sm"
              onClick={() => onOpenCreateSubtask(null, project.id, team?.id)}
              className="mt-4 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add First Subtask
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
