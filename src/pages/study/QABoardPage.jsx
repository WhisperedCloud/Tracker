import React, { useEffect, useMemo, useState } from 'react';
import { MessagesSquare, Plus, CheckCircle2, Trash2, Search, MessageCircle, Send, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { useDialog } from '@/components/ui/DialogProvider';
import { GroupSubjectFields, GroupSubjectFilter, EmptyState } from '@/components/study/GroupSubjectFields';
import { useData } from '@/context/DataContext';
import { useStudy } from '@/context/StudyContext';
import { useAuth } from '@/context/AuthContext';
import { formatTimeAgo, cn } from '@/lib/utils';

// Asks a question, or edits one when `question` is passed.
function AskModal({ isOpen, onClose, defaultTeamId, question = null }) {
  const { memberTeams } = useData();
  const { askQuestion, updateQuestion } = useStudy();
  const isEditing = Boolean(question);
  const [teamId, setTeamId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTeamId(question?.team_id || defaultTeamId || memberTeams[0]?.id || '');
    setProjectId(question?.project_id || '');
    setTitle(question?.title || '');
    setBody(question?.body || '');
    setError('');
  }, [isOpen, question?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError('Write your question.');
    if (!teamId) return setError('Choose a study group.');
    setSaving(true);
    const saved = isEditing
      ? await updateQuestion(question, { title: title.trim(), body: body.trim(), project_id: projectId })
      : await askQuestion({ team_id: teamId, project_id: projectId, title: title.trim(), body: body.trim() });
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit question' : 'Ask the group'}
      description={isEditing ? 'Fix the wording or add details.' : 'Everyone in the study group is notified.'}
      icon={<MessagesSquare className="w-4 h-4" />}
      size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="ask-form" disabled={saving}>{saving ? 'Saving...' : isEditing ? 'Save changes' : 'Post question'}</Button></>}
    >
      <form id="ask-form" onSubmit={submit} className="space-y-4">
        {error && <div role="alert" className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">{error}</div>}
        <Input label="Question *" placeholder="e.g. Why does the integral of 1/x give ln|x|?" value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} />
        <GroupSubjectFields teamId={teamId} projectId={projectId} onTeamChange={setTeamId} onProjectChange={setProjectId} lockTeam={isEditing} />
        <Textarea label="Details" rows={4} placeholder="What have you tried? Where are you stuck?" value={body} onChange={(e) => setBody(e.target.value)} />
      </form>
    </Modal>
  );
}

function QuestionModal({ question, onClose, onEdit }) {
  const { user } = useAuth();
  const { profiles, projects, teams, canManageTeam } = useData();
  const { answers, answerQuestion, acceptAnswer, deleteQuestion, deleteAnswer, updateAnswer, canManage, questions } = useStudy();
  const { confirm } = useDialog();
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [answerDraft, setAnswerDraft] = useState('');

  // Use the live version so accepted answers and edits show immediately.
  const live = question ? questions.find(q => q.id === question.id) || question : null;
  if (!live) return <Modal isOpen={false} onClose={onClose} />;

  const asker = profiles.find(p => p.id === live.created_by);
  const subject = projects.find(p => p.id === live.project_id);
  const team = teams.find(t => t.id === live.team_id);
  const thread = answers
    .filter(a => a.question_id === live.id)
    .sort((a, b) => (a.id === live.accepted_answer_id ? -1 : b.id === live.accepted_answer_id ? 1 : new Date(a.created_at) - new Date(b.created_at)));
  const canAccept = live.created_by === user?.id || canManageTeam(live.team_id);

  const post = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setPosting(true);
    const saved = await answerQuestion(live, reply.trim());
    setPosting(false);
    if (saved) setReply('');
  };

  const removeQuestion = async () => {
    const ok = await confirm({ title: 'Delete this question?', message: 'The question and all of its answers will be removed.', confirmText: 'Delete' });
    if (ok) {
      await deleteQuestion(live);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={Boolean(question)}
      onClose={onClose}
      title={live.title}
      description={`${asker?.full_name || 'A member'} asked in ${team?.name || 'the group'}${subject ? ` · ${subject.name}` : ''}, ${formatTimeAgo(live.created_at)}`}
      icon={<MessagesSquare className="w-4 h-4" />}
      size="lg"
      footer={canManage(live) ? (
        <>
          <Button variant="ghost" onClick={removeQuestion} className="mr-auto text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="w-4 h-4" />Delete question</Button>
          {live.created_by === user?.id && onEdit && (
            <Button variant="outline" onClick={() => onEdit(live)}><Pencil className="w-4 h-4" />Edit question</Button>
          )}
        </>
      ) : null}
    >
      <div className="space-y-5">
        {live.body && <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{live.body}</p>}

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{thread.length} {thread.length === 1 ? 'answer' : 'answers'}</h4>
          <div className="space-y-3">
            {thread.length === 0 && <p className="text-xs text-slate-500 italic">No answers yet. Be the first to help.</p>}
            {thread.map((a) => {
              const author = profiles.find(p => p.id === a.created_by);
              const best = a.id === live.accepted_answer_id;
              return (
                <div key={a.id} className={cn('p-3.5 rounded-xl border transition-colors', best ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900' : 'bg-slate-50/70 border-slate-200/70 dark:bg-slate-800/40 dark:border-slate-800')}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                      <Avatar src={author?.avatar_url} name={author?.full_name} size="xs" />
                      {author?.full_name || 'Member'}
                      <span className="font-normal text-slate-400">{formatTimeAgo(a.created_at)}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {best && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" />Best answer</span>}
                      {canAccept && (
                        <button type="button" onClick={() => acceptAnswer(live, best ? null : a.id)}
                          className="text-[11px] font-semibold px-2 py-1 rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60">
                          {best ? 'Unmark' : 'Mark best'}
                        </button>
                      )}
                      {a.created_by === user?.id && editingAnswerId !== a.id && (
                        <button type="button" onClick={() => { setEditingAnswerId(a.id); setAnswerDraft(a.body); }} aria-label="Edit answer" className="p-1 rounded-md text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(a.created_by === user?.id || canManageTeam(live.team_id)) && (
                        <button type="button" onClick={async () => {
                          const ok = await confirm({ title: 'Delete this answer?', message: 'It will be removed for everyone.', confirmText: 'Delete' });
                          if (ok) deleteAnswer(a);
                        }} aria-label="Delete answer" className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {editingAnswerId === a.id ? (
                    <form
                      className="space-y-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!answerDraft.trim()) return;
                        if (await updateAnswer(a, answerDraft.trim())) setEditingAnswerId(null);
                      }}
                    >
                      <Textarea aria-label="Edit answer" rows={3} value={answerDraft} onChange={(e) => setAnswerDraft(e.target.value)} />
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditingAnswerId(null)}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={!answerDraft.trim()}>Save</Button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {a.body}{a.updated_at && <span className="text-[11px] text-slate-400"> (edited)</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={post} className="space-y-2">
          <Textarea label="Your answer" rows={3} placeholder="Explain it the way you'd want it explained to you." value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={posting || !reply.trim()}><Send className="w-3.5 h-3.5" />{posting ? 'Posting...' : 'Post answer'}</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function QABoardPage({ teamId: fixedTeamId = null }) {
  const { memberTeams, profiles, projects } = useData();
  const { questions, answers } = useStudy();
  const [teamFilter, setTeamFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [asking, setAsking] = useState(false);
  const [openQuestion, setOpenQuestion] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const teamId = fixedTeamId || teamFilter;
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions
      .filter(x => teamId === 'all' || x.team_id === teamId)
      .filter(x => subjectFilter === 'all' || x.project_id === subjectFilter)
      .filter(x => status === 'all' || (status === 'solved' ? x.accepted_answer_id : !answers.some(a => a.question_id === x.id)))
      .filter(x => !q || x.title.toLowerCase().includes(q) || x.body?.toLowerCase().includes(q));
  }, [questions, answers, teamId, subjectFilter, status, search]);

  return (
    <div className="space-y-6">
      {!fixedTeamId && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Q&A Board</h1>
            <p className="text-xs text-slate-500 mt-1">Ask your study groups and help each other out.</p>
          </div>
          <Button onClick={() => setAsking(true)} disabled={memberTeams.length === 0}><Plus className="w-4 h-4" />Ask a question</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions..." aria-label="Search questions"
            className="h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-52" />
        </div>
        <div role="tablist" aria-label="Status" className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
          {[['all', 'All'], ['open', 'Unanswered'], ['solved', 'Solved']].map(([v, label]) => (
            <button key={v} role="tab" aria-selected={status === v} onClick={() => setStatus(v)}
              className={cn('px-3 py-1 rounded-md transition-colors', status === v ? 'bg-surface dark:bg-slate-900 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-slate-600 dark:text-slate-400')}>
              {label}
            </button>
          ))}
        </div>
        <GroupSubjectFilter teamId={teamId} projectId={subjectFilter} onTeamChange={setTeamFilter} onProjectChange={setSubjectFilter} hideTeam={Boolean(fixedTeamId)} />
        {fixedTeamId && <Button size="sm" className="ml-auto" onClick={() => setAsking(true)}><Plus className="w-4 h-4" />Ask</Button>}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No questions here" text="Stuck on something? Ask your group. Someone has probably figured it out."
          action={memberTeams.length > 0 && <Button size="sm" onClick={() => setAsking(true)}><Plus className="w-4 h-4" />Ask a question</Button>} />
      ) : (
        <div className="space-y-3">
          {list.map((q, i) => {
            const asker = profiles.find(p => p.id === q.created_by);
            const count = answers.filter(a => a.question_id === q.id).length;
            const subject = projects.find(p => p.id === q.project_id);
            const team = memberTeams.find(t => t.id === q.team_id);
            return (
              <Card key={q.id} index={i} onClick={() => setOpenQuestion(q)} className="p-4 flex items-start gap-4 group">
                <div className={cn('shrink-0 w-14 py-2 rounded-xl text-center border',
                  q.accepted_answer_id ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
                    : count ? 'bg-primary-50 border-primary-100 text-primary-700 dark:bg-primary-950/40 dark:border-primary-900 dark:text-primary-300'
                      : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/60 dark:border-slate-700')}>
                  <span className="block text-lg font-bold leading-none">{count}</span>
                  <span className="block text-[10px] font-semibold mt-1">{count === 1 ? 'answer' : 'answers'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-300">{q.title}</h3>
                  {q.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{q.body}</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Avatar src={asker?.avatar_url} name={asker?.full_name} size="xs" />{asker?.full_name || 'Member'}</span>
                    <span>{team?.name}{subject ? ` · ${subject.name}` : ''}</span>
                    <span>{formatTimeAgo(q.created_at)}</span>
                    {q.accepted_answer_id && <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" />Solved</span>}
                  </div>
                </div>
                <MessageCircle className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors shrink-0 mt-1" />
              </Card>
            );
          })}
        </div>
      )}

      <AskModal isOpen={asking} onClose={() => setAsking(false)} defaultTeamId={fixedTeamId || (teamFilter !== 'all' ? teamFilter : '')} />
      <QuestionModal question={openQuestion} onClose={() => setOpenQuestion(null)} onEdit={(q) => { setOpenQuestion(null); setEditingQuestion(q); }} />
      <AskModal isOpen={Boolean(editingQuestion)} onClose={() => setEditingQuestion(null)} question={editingQuestion} />
    </div>
  );
}
