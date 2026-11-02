import React from 'react';
import { Select } from '@/components/ui/Select';
import { useData } from '@/context/DataContext';

// "Study group" + "Subject" pickers used by the study forms. The subject list
// follows the chosen group.
export function GroupSubjectFields({ teamId, projectId, onTeamChange, onProjectChange, lockTeam = false, subjectLabel = 'Subject' }) {
  const { memberTeams, projects } = useData();
  const subjects = projects.filter(p => p.team_id === teamId);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Select
        label="Study group *"
        value={teamId}
        disabled={lockTeam}
        onChange={(e) => {
          onTeamChange(e.target.value);
          onProjectChange('');
        }}
      >
        {memberTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
      <Select label={subjectLabel} value={projectId} onChange={(e) => onProjectChange(e.target.value)}>
        <option value="">Any subject</option>
        {subjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </Select>
    </div>
  );
}

// Filter row for study pages: group + subject.
export function GroupSubjectFilter({ teamId, projectId, onTeamChange, onProjectChange, hideTeam = false }) {
  const { memberTeams, projects } = useData();
  const subjects = projects.filter(p => (teamId === 'all' ? true : p.team_id === teamId));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hideTeam && (
        <Select size="sm" aria-label="Filter by study group" value={teamId} onChange={(e) => { onTeamChange(e.target.value); onProjectChange('all'); }} className="w-auto min-w-[10rem]">
          <option value="all">All study groups</option>
          {memberTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      )}
      <Select size="sm" aria-label="Filter by subject" value={projectId} onChange={(e) => onProjectChange(e.target.value)} className="w-auto min-w-[9rem]">
        <option value="all">All subjects</option>
        {subjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </Select>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="py-14 px-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-surface/60 dark:bg-slate-900/40 animate-rise">
      {Icon && (
        <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-300 flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {text && <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
