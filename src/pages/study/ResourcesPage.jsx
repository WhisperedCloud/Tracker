import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Link2, FileText, StickyNote, Plus, Trash2, ExternalLink, Download, Search, Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { useDialog } from '@/components/ui/DialogProvider';
import { GroupSubjectFields, GroupSubjectFilter, EmptyState } from '@/components/study/GroupSubjectFields';
import { useData } from '@/context/DataContext';
import { useStudy } from '@/context/StudyContext';
import { formatTimeAgo, cn } from '@/lib/utils';

const KINDS = {
  link: { label: 'Link', Icon: Link2, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
  file: { label: 'File', Icon: FileText, tone: 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300' },
  note: { label: 'Note', Icon: StickyNote, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
};
const MAX_FILE_MB = 50;

function AddResourceModal({ isOpen, onClose, defaultTeamId }) {
  const { memberTeams } = useData();
  const { addResource } = useStudy();
  const [kind, setKind] = useState('link');
  const [teamId, setTeamId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setKind('link');
    setTeamId(defaultTeamId || memberTeams[0]?.id || '');
    setProjectId('');
    setTitle('');
    setDescription('');
    setUrl('');
    setBody('');
    setFile(null);
    setError('');
    setSaving(false);
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!teamId) return setError('Choose a study group.');
    if (kind === 'link' && !/^https?:\/\/\S+$/i.test(url.trim())) return setError('Enter a full link starting with https://');
    if (kind === 'file' && !file) return setError('Choose a file to upload.');
    if (kind === 'file' && file.size > MAX_FILE_MB * 1024 * 1024) return setError(`Files must be ${MAX_FILE_MB} MB or smaller.`);
    if (kind === 'note' && !body.trim()) return setError('Write the note first.');
    const finalTitle = title.trim() || (kind === 'file' ? file.name : '');
    if (!finalTitle) return setError('Give it a title.');

    setSaving(true);
    const saved = await addResource({ team_id: teamId, project_id: projectId, kind, title: finalTitle, description: description.trim(), url: url.trim(), body: body.trim(), file });
    setSaving(false);
    if (saved) onClose();
    else setError('It could not be saved. Check the message in the corner and try again.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share a resource"
      description="Links, files and notes are visible to everyone in the study group."
      icon={<BookOpen className="w-4 h-4" />}
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="resource-form" disabled={saving}>{saving ? 'Saving...' : 'Share'}</Button>
        </>
      }
    >
      <form id="resource-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div role="alert" className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">{error}</div>}

        <div role="radiogroup" aria-label="Resource type" className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          {Object.entries(KINDS).map(([value, { label, Icon }]) => (
            <button key={value} type="button" role="radio" aria-checked={kind === value} onClick={() => setKind(value)}
              className={cn('flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-colors',
                kind === value ? 'bg-surface dark:bg-slate-900 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        <GroupSubjectFields teamId={teamId} projectId={projectId} onTeamChange={setTeamId} onProjectChange={setProjectId} />

        <Input label={kind === 'file' ? 'Title (optional)' : 'Title *'} placeholder={kind === 'note' ? 'e.g. Key formulas for thermodynamics' : 'e.g. Lecture 4 slides'} value={title} onChange={(e) => setTitle(e.target.value)} />

        {kind === 'link' && <Input label="Link *" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />}
        {kind === 'file' && (
          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-400 cursor-pointer transition-colors text-center">
            <Upload className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{file ? file.name : 'Choose a file'}</span>
            <span className="text-[11px] text-slate-500">{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `PDF, slides, images, anything up to ${MAX_FILE_MB} MB`}</span>
            <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        )}
        {kind === 'note' && <Textarea label="Note *" rows={6} placeholder="Write your summary, formulas or tips here." value={body} onChange={(e) => setBody(e.target.value)} />}
        {kind !== 'note' && <Textarea label="Description" rows={2} placeholder="Why is this useful?" value={description} onChange={(e) => setDescription(e.target.value)} />}
      </form>
    </Modal>
  );
}

function ResourceCard({ resource, index, onOpenNote }) {
  const { teams, projects, profiles } = useData();
  const { deleteResource, getResourceFileUrl, canManage } = useStudy();
  const { confirm } = useDialog();
  const meta = KINDS[resource.kind] || KINDS.link;
  const author = profiles.find(p => p.id === resource.created_by);
  const team = teams.find(t => t.id === resource.team_id);
  const subject = projects.find(p => p.id === resource.project_id);

  const open = async () => {
    if (resource.kind === 'link') window.open(resource.url, '_blank', 'noopener');
    else if (resource.kind === 'note') onOpenNote(resource);
    else {
      const tab = window.open('', '_blank');
      const signed = await getResourceFileUrl(resource);
      if (signed && tab) tab.location.href = signed;
      else if (tab) tab.close();
    }
  };

  const remove = async () => {
    const ok = await confirm({ title: 'Remove this resource?', message: `"${resource.title}" will be removed for the whole group.`, confirmText: 'Remove' });
    if (ok) deleteResource(resource);
  };

  return (
    <Card index={index} onClick={open} className="p-4 flex flex-col gap-3 group">
      <div className="flex items-start gap-3">
        <div className={cn('shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:-rotate-6', meta.tone)}>
          <meta.Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-primary-700 dark:group-hover:text-primary-300">{resource.title}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{team?.name}{subject ? ` · ${subject.name}` : ''}</p>
        </div>
        {canManage(resource) && (
          <button type="button" onClick={(e) => { e.stopPropagation(); remove(); }} aria-label={`Remove ${resource.title}`}
            className="p-1.5 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-opacity">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {(resource.description || resource.body) && (
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap">{resource.kind === 'note' ? resource.body : resource.description}</p>
      )}
      <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <Avatar src={author?.avatar_url} name={author?.full_name} size="xs" />
          {author?.full_name || 'Member'} · {formatTimeAgo(resource.created_at)}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 dark:text-primary-300">
          {resource.kind === 'link' && <>Open<ExternalLink className="w-3 h-3" /></>}
          {resource.kind === 'file' && <>Download<Download className="w-3 h-3" /></>}
          {resource.kind === 'note' && <>Read</>}
        </span>
      </div>
    </Card>
  );
}

export function ResourcesPage({ teamId: fixedTeamId = null }) {
  const { memberTeams } = useData();
  const { resources } = useStudy();
  const [teamFilter, setTeamFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState(null);

  const teamId = fixedTeamId || teamFilter;
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resources
      .filter(r => teamId === 'all' || r.team_id === teamId)
      .filter(r => subjectFilter === 'all' || r.project_id === subjectFilter)
      .filter(r => kindFilter === 'all' || r.kind === kindFilter)
      .filter(r => !q || [r.title, r.description, r.body, r.file_name].some(v => v?.toLowerCase().includes(q)));
  }, [resources, teamId, subjectFilter, kindFilter, search]);

  return (
    <div className="space-y-6">
      {!fixedTeamId && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Resources</h1>
            <p className="text-xs text-slate-500 mt-1">Notes, files and links your study groups share.</p>
          </div>
          <Button onClick={() => setAdding(true)} disabled={memberTeams.length === 0}><Plus className="w-4 h-4" />Share resource</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources..." aria-label="Search resources"
            className="h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-52" />
        </div>
        <div role="tablist" aria-label="Type" className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
          {[['all', 'All'], ['link', 'Links'], ['file', 'Files'], ['note', 'Notes']].map(([v, label]) => (
            <button key={v} role="tab" aria-selected={kindFilter === v} onClick={() => setKindFilter(v)}
              className={cn('px-3 py-1 rounded-md transition-colors', kindFilter === v ? 'bg-surface dark:bg-slate-900 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-slate-600 dark:text-slate-400')}>
              {label}
            </button>
          ))}
        </div>
        <GroupSubjectFilter teamId={teamId} projectId={subjectFilter} onTeamChange={setTeamFilter} onProjectChange={setSubjectFilter} hideTeam={Boolean(fixedTeamId)} />
        {fixedTeamId && <Button size="sm" className="ml-auto" onClick={() => setAdding(true)}><Plus className="w-4 h-4" />Share</Button>}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nothing shared yet" text="Share notes, past papers, slides or useful links with your group."
          action={memberTeams.length > 0 && <Button size="sm" onClick={() => setAdding(true)}><Plus className="w-4 h-4" />Share resource</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((r, i) => <ResourceCard key={r.id} resource={r} index={i} onOpenNote={setNote} />)}
        </div>
      )}

      <AddResourceModal isOpen={adding} onClose={() => setAdding(false)} defaultTeamId={fixedTeamId || (teamFilter !== 'all' ? teamFilter : '')} />
      <Modal isOpen={Boolean(note)} onClose={() => setNote(null)} title={note?.title} description="Shared note" icon={<StickyNote className="w-4 h-4" />} size="lg">
        <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{note?.body}</div>
      </Modal>
    </div>
  );
}
