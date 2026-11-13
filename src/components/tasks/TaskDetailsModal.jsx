import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { Select } from '@/components/ui/Select';
import {
  Calendar,
  Clock,
  User,
  Paperclip,
  Send,
  CheckCircle,
  AlertCircle,
  History,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  FileText,
  Download,
  Pencil,
  X,
  Check
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/components/ui/DialogProvider';
import {
  formatDate,
  formatTimeAgo,
  isOverdue,
  getPriorityBadgeColor,
  getStatusBadgeColor,
  humanizeAction,
  cn
} from '@/lib/utils';

export function TaskDetailsModal({ isOpen, onClose, taskId, onOpenCreateSubtask }) {
  const {
    tasks,
    projects,
    teams,
    profiles,
    comments,
    attachments,
    activity,
    updateTask,
    submitTaskForReview,
    approveTaskReview,
    requestChangesReview,
    deleteTask,
    addComment,
    updateComment,
    deleteComment,
    addAttachment,
    deleteAttachment,
    getAttachmentUrl,
    getSubtasks,
    canManageTask,
    teamMembers
  } = useData();

  const { user } = useAuth();
  const { confirm, alert } = useDialog();
  const [uploading, setUploading] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'attachments' | 'subtasks' | 'activity'
  // Editing the task's own details (title, description, dates).
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', start_date: '', due_date: '' });
  const [editError, setEditError] = useState('');
  // Editing one comment.
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');

  const task = tasks.find(t => t.id === taskId);

  // Leave edit mode when another task is opened or the modal closes.
  useEffect(() => {
    setIsEditing(false);
    setEditingCommentId(null);
    setEditError('');
  }, [taskId, isOpen]);

  if (!task) return null;

  const project = projects.find(p => p.id === task.project_id);
  const team = teams.find(t => t.id === task.team_id);
  const assignee = profiles.find(p => p.id === task.assigned_to);
  const creator = profiles.find(p => p.id === task.created_by);
  const taskComments = comments.filter(c => c.task_id === task.id);
  const taskAttachments = attachments.filter(a => a.task_id === task.id);
  const taskActivity = activity.filter(a => a.task_id === task.id);
  const subtasks = getSubtasks(task.id);

  const isAssignedToMe = task.assigned_to === user?.id;
  // The task's creator or a organizer manages it (review, reassign, delete).
  const isLeader = canManageTask(task);
  const canComment = isLeader || teamMembers.some(tm => tm.team_id === task.team_id && tm.user_id === user?.id);
  const teamMemberOptions = teamMembers.filter(tm => tm.team_id === task.team_id);
  const taskIsOverdue = isOverdue(task.due_date, task.status);

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment(task.id, newComment.trim());
    setNewComment('');
  };

  const handleFileUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert({ title: 'File too large', message: 'Attachments must be 50 MB or smaller.' });
      input.value = '';
      return;
    }
    setUploading(true);
    await addAttachment(task.id, file);
    setUploading(false);
    input.value = '';
  };

  const handleOpenAttachment = async (att) => {
    // Open the tab first so the browser does not block it as a pop-up.
    const tab = window.open('', '_blank');
    const url = await getAttachmentUrl(att);
    if (url && tab) tab.location.href = url;
    else if (tab) tab.close();
  };

  const startEditing = () => {
    setDraft({
      title: task.title || '',
      description: task.description || '',
      start_date: task.start_date || '',
      due_date: task.due_date || '',
    });
    setEditError('');
    setIsEditing(true);
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return setEditError('The title is required.');
    if (draft.start_date && draft.due_date && draft.due_date < draft.start_date) {
      return setEditError('The due date cannot be before the start date.');
    }
    const saved = await updateTask(task.id, {
      title: draft.title.trim(),
      description: draft.description.trim(),
      start_date: draft.start_date,
      due_date: draft.due_date,
    });
    if (saved) setIsEditing(false);
    else setEditError('The task could not be saved. Check the message in the corner and try again.');
  };

  const handleSaveComment = async (e) => {
    e.preventDefault();
    if (!commentDraft.trim()) return;
    const saved = await updateComment(editingCommentId, commentDraft.trim());
    if (saved) setEditingCommentId(null);
  };

  const handleDeleteComment = async (c) => {
    const ok = await confirm({ title: 'Delete this comment?', message: 'The comment will be removed for everyone.', confirmText: 'Delete comment' });
    if (ok) deleteComment(c.id);
  };

  const handleDeleteAttachment = async (att) => {
    const ok = await confirm({ title: 'Remove this attachment?', message: `"${att.file_name}" will be deleted for everyone.`, confirmText: 'Remove file' });
    if (ok) deleteAttachment(att);
  };

  const handleRequestChangesSubmit = (e) => {
    e.preventDefault();
    if (!feedbackComment.trim()) return;
    requestChangesReview(task.id, feedbackComment.trim());
    setFeedbackComment('');
    setIsRequestingChanges(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      bodyClassName="p-0 max-h-[calc(90vh-2rem)]"
    >
      {/* Top Banner / Breadcrumb */}
      <div className="p-6 pr-14 border-b border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>{team?.name || 'Study Group'}</span>
            {project && (
              <>
                <ArrowRight className="w-3 h-3" />
                <span className="text-primary-600 dark:text-primary-400 font-semibold">{project.name}</span>
              </>
            )}
            {task.parent_task_id && (
              <>
                <ArrowRight className="w-3 h-3" />
                <span className="text-slate-600 dark:text-slate-400">Subtask</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', getPriorityBadgeColor(task.priority))}>
              {task.priority} Priority
            </span>
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', getStatusBadgeColor(task.status))}>
              {task.status}
            </span>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveDetails} className="space-y-3 mt-1">
            {editError && (
              <div className="p-2.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">{editError}</div>
            )}
            <Input label="Title *" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-surface dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input type="date" label="Start Date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
              <Input type="date" label="Due Date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="submit" size="sm">Save Changes</Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {task.title}
              </h2>
              {canManageTask(task) && (
                <Button size="sm" variant="outline" onClick={startEditing} className="gap-1.5 text-xs shrink-0">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                {task.description}
              </p>
            )}
          </>
        )}

        {/* Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5 font-medium">
            <span>Task Completion Progress</span>
            <span className="font-bold text-slate-900 dark:text-slate-200">{task.progress}%</span>
          </div>
          <Progress value={task.progress} />
        </div>
      </div>

      {/* Main Content & Workflow */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Tabs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Workflow Action Bar */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-primary-600" />
                Workflow Action Center
              </span>
              {taskIsOverdue && (
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Overdue
                </span>
              )}
            </div>

            {/* Member Review Submission */}
            {task.status !== 'Completed' && task.status !== 'Under Review' && (isAssignedToMe || isLeader) && (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => submitTaskForReview(task.id)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Sparkles className="w-4 h-4" />
                  Submit for Review
                </Button>
                <span className="text-xs text-slate-500">
                  Ask the task creator or a organizer to check it.
                </span>
              </div>
            )}

            {/* Review actions (task creator or organizer) */}
            {task.status === 'Under Review' && (
              <div className="space-y-3">
                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                  This task is waiting for review by its creator or a organizer.
                </p>
                {isLeader ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      onClick={() => approveTaskReview(task.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Mark Completed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRequestingChanges(true)}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Request Changes
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Awaiting a review decision.
                  </p>
                )}
              </div>
            )}

            {/* Changes Requested Feedback Box */}
            {isRequestingChanges && (
              <form onSubmit={handleRequestChangesSubmit} className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-semibold text-amber-800 dark:text-amber-400">
                  Provide Change Request Feedback:
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain what needs to be modified before approval..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-surface dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setIsRequestingChanges(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    Submit Feedback
                  </Button>
                </div>
              </form>
            )}

            {task.status === 'Completed' && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                This task was approved and completed!
              </div>
            )}
          </div>

          {/* Navigation Tabs (Subtasks, Comments, Attachments, Activity) */}
          <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6">
            <button
              onClick={() => setActiveTab('comments')}
              className={cn(
                'pb-2.5 text-xs font-semibold transition-colors border-b-2',
                activeTab === 'comments'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              Comments ({taskComments.length})
            </button>
            <button
              onClick={() => setActiveTab('subtasks')}
              className={cn(
                'pb-2.5 text-xs font-semibold transition-colors border-b-2',
                activeTab === 'subtasks'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              Subtasks ({subtasks.length})
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={cn(
                'pb-2.5 text-xs font-semibold transition-colors border-b-2',
                activeTab === 'attachments'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              Attachments ({taskAttachments.length})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={cn(
                'pb-2.5 text-xs font-semibold transition-colors border-b-2',
                activeTab === 'activity'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              Activity History ({taskActivity.length})
            </button>
          </div>

          {/* Tab 1: Comments */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {taskComments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No comments yet. Start the conversation!</p>
                ) : (
                  taskComments.map((c) => {
                    const author = profiles.find(p => p.id === c.user_id);
                    return (
                      <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                        <Avatar src={author?.avatar_url} name={author?.full_name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {author?.full_name || 'Member'}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">
                                {formatTimeAgo(c.created_at)}{c.updated_at ? ' · edited' : ''}
                              </span>
                              {c.user_id === user?.id && editingCommentId !== c.id && (
                                <button type="button" onClick={() => { setEditingCommentId(c.id); setCommentDraft(c.comment); }}
                                  aria-label="Edit comment" title="Edit comment"
                                  className="p-1 rounded-md text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                              {(c.user_id === user?.id || isLeader) && (
                                <button type="button" onClick={() => handleDeleteComment(c)}
                                  aria-label="Delete comment" title="Delete comment"
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          </div>
                          {editingCommentId === c.id ? (
                            <form onSubmit={handleSaveComment} className="flex gap-1.5">
                              <input
                                autoFocus
                                aria-label="Edit comment text"
                                value={commentDraft}
                                onChange={(e) => setCommentDraft(e.target.value)}
                                className="flex-1 px-2.5 py-1.5 text-xs bg-surface dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              />
                              <button type="submit" aria-label="Save comment" className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" aria-label="Cancel editing" onClick={() => setEditingCommentId(null)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-3.5 h-3.5" /></button>
                            </form>
                          ) : (
                            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{c.comment}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment Input */}
              {canComment && (
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-surface dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <Button type="submit" size="sm" className="gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  Post
                </Button>
              </form>
              )}
            </div>
          )}

          {/* Tab 2: Subtasks Breakdown */}
          {activeTab === 'subtasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {subtasks.filter(s => s.status === 'Completed').length} of {subtasks.length} Completed
                </span>
                {onOpenCreateSubtask && (
                  <Button size="sm" variant="outline" onClick={() => onOpenCreateSubtask(task.id)} className="gap-1 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Add Subtask
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {subtasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No subtasks defined yet.</p>
                ) : (
                  subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-surface dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', st.status === 'Completed' ? 'bg-emerald-500' : 'bg-primary-500')} />
                        <span className={cn('text-xs font-medium truncate', st.status === 'Completed' && 'line-through text-slate-400')}>
                          {st.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getStatusBadgeColor(st.status))}>
                          {st.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Attachments */}
          {activeTab === 'attachments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Uploaded Files</span>
                {canComment && (
                  <label className={cn(
                    'text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-600 text-white transition-colors inline-flex items-center gap-1.5',
                    uploading ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:bg-primary-700'
                  )}>
                    <Paperclip className="w-3.5 h-3.5" />
                    {uploading ? 'Uploading...' : 'Upload Attachment'}
                    <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                {taskAttachments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No attachments uploaded yet.</p>
                ) : (
                  taskAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-surface dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="w-4 h-4 text-primary-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{att.file_name}</p>
                          <span className="text-[10px] text-slate-400">{Math.round((att.file_size || 1024) / 1024)} KB</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenAttachment(att)}
                          title="Open file"
                          aria-label={`Open ${att.file_name}`}
                          className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {(att.uploaded_by === user?.id || isLeader) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att)}
                            title="Remove file"
                            aria-label={`Remove ${att.file_name}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Activity History */}
          {activeTab === 'activity' && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {taskActivity.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No activity logged yet.</p>
              ) : (
                taskActivity.map((act) => {
                  const actor = profiles.find(p => p.id === act.user_id);
                  return (
                    <div key={act.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          <strong className="text-slate-800 dark:text-slate-200">{actor?.full_name || 'System'}</strong>:{' '}
                          <span className="text-slate-600 dark:text-slate-400 capitalize">{humanizeAction(act.action)}</span>
                          {act.new_value && (
                            <span className="font-semibold text-primary-600 dark:text-primary-400 ml-1">
                              &rarr; {act.new_value}
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatTimeAgo(act.created_at)}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Column: Meta Attributes & Controls */}
        <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Task Metadata
          </h4>

          {/* Quick Status Selector */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
            {isLeader ? (
              <Select size="sm" aria-label="Task status"
                value={task.status}
                onChange={(e) => updateTask(task.id, { status: e.target.value })}
                className="w-full"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Under Review">Under Review</option>
                <option value="Changes Requested">Changes Requested</option>
                <option value="Completed">Completed</option>
                <option value="Blocked">Blocked</option>
              </Select>
            ) : isAssignedToMe ? (
              <Select size="sm" aria-label="Task status"
                value={task.status}
                onChange={(e) => {
                  if (e.target.value === 'Under Review') {
                    submitTaskForReview(task.id);
                  } else {
                    updateTask(task.id, { status: e.target.value });
                  }
                }}
                className="w-full"
              >
                {['Changes Requested', 'Completed'].includes(task.status) && (
                  <option value={task.status} disabled>{task.status}</option>
                )}
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Under Review">Submit for Review</option>
                <option value="Blocked">Blocked</option>
              </Select>
            ) : (
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {task.status}
              </div>
            )}
          </div>

          {/* Quick Priority Selector */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Priority</label>
            {isLeader ? (
              <Select size="sm" aria-label="Task priority"
                value={task.priority}
                onChange={(e) => updateTask(task.id, { priority: e.target.value })}
                className="w-full"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </Select>
            ) : (
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {task.priority} Priority
              </div>
            )}
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Assigned Member</label>
            {isLeader && (
              <Select size="sm" aria-label="Assignee"
                value={task.assigned_to || ''}
                onChange={(e) => updateTask(task.id, { assigned_to: e.target.value || null })}
                className="w-full mb-2"
              >
                <option value="">Unassigned</option>
                {teamMemberOptions.map((tm) => {
                  const p = profiles.find(pr => pr.id === tm.user_id);
                  return (
                    <option key={tm.id} value={tm.user_id}>
                      {p?.full_name || 'Member'}
                    </option>
                  );
                })}
              </Select>
            )}
            <div className="flex items-center gap-2.5 p-2 bg-surface dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <Avatar src={assignee?.avatar_url} name={assignee?.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {assignee?.full_name || 'Unassigned'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{assignee?.email}</p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Start Date:
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(task.start_date)}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Due Date:
              </span>
              <span className={cn('font-semibold', taskIsOverdue ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200')}>
                {formatDate(task.due_date)}
              </span>
            </div>
          </div>

          {/* Delete Task */}
          {isLeader && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={async () => {
                  const subtaskNote = subtasks.length ? ` Its ${subtasks.length} subtask(s) will be deleted too.` : '';
                  const ok = await confirm({
                    title: 'Delete this task?',
                    message: `"${task.title}" will be permanently deleted.${subtaskNote}`,
                    confirmText: 'Delete task',
                  });
                  if (ok) {
                    deleteTask(task.id);
                    onClose();
                  }
                }}
                className="w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Task
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
