import React, { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Plus, FolderKanban, ArrowRight, Calendar, Users, Filter, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate, getStatusBadgeColor, getPriorityBadgeColor, cn } from '@/lib/utils';

export function ProjectsList({ onSelectProject, onOpenCreateProject }) {
  const { projects, teams, tasks, getProjectProgress, memberTeams } = useData();
  // Any member of a group can add subjects to it.
  const canCreateProjects = memberTeams.length > 0;

  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredProjects = projects.filter((p) => {
    if (teamFilter !== 'all' && p.team_id !== teamFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Subjects
            <Badge variant="primary">{projects.length}</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Courses, exams and assignments your groups are working on. Progress updates from completed tasks.
          </p>
        </div>

        {canCreateProjects && (
          <Button onClick={onOpenCreateProject} className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" />
            Add Subject
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <Filter className="w-4 h-4" /> Filters:
        </div>

        <Select size="sm" aria-label="Filter by study group"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="w-auto min-w-[8.5rem]"
        >
          <option value="all">All Study Groups</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>

        <Select size="sm" aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-auto min-w-[8.5rem]"
        >
          <option value="all">All Statuses</option>
          <option value="Planning">Planning</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </Select>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderKanban className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No subjects yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {canCreateProjects
              ? "Add a subject (a course, exam or assignment) and break it into study tasks."
              : "Your groups have no subjects yet."}
          </p>
          {canCreateProjects && (
            <Button onClick={onOpenCreateProject} className="mt-4 gap-1.5 text-xs shadow-sm">
              <Plus className="w-4 h-4" />
              Add First Subject
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((proj, i) => {
          const team = teams.find(t => t.id === proj.team_id);
          const progress = getProjectProgress(proj.id);
          const projectTasks = tasks.filter(t => t.project_id === proj.id);
          const completedTasks = projectTasks.filter(t => t.status === 'Completed').length;

          return (
            <Card
              key={proj.id}
              index={i}
              onClick={() => onSelectProject(proj.id)}
              className="flex flex-col group"
            >
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                    {team?.name || 'Study Group'}
                  </span>
                  <CardTitle className="text-base group-hover:text-primary-600 transition-colors mt-0.5">
                    {proj.name}
                  </CardTitle>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0', getStatusBadgeColor(proj.status))}>
                  {proj.status}
                </span>
              </CardHeader>

              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {proj.description || "Study tasks and progress for this subject."}
                </p>

                {/* Automatic Progress Section */}
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-400">Calculated Progress</span>
                    <span className="text-primary-600 dark:text-primary-400">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                    <span>{completedTasks} of {projectTasks.length} subtasks done</span>
                    <span>Due {formatDate(proj.due_date)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getPriorityBadgeColor(proj.priority))}>
                    {proj.priority} Priority
                  </span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Subtasks & Plan <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}
    </div>
  );
}
