import React, { useState } from 'react';
import { Plus, Users2, ArrowRight, Shield, FolderKanban, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';

export function TeamsList({ onSelectTeam, onOpenCreateTeam }) {
  const { teams, teamMembers, projects, tasks, profiles } = useData();
  const { user, role } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            My Teams & Workspaces
            <Badge variant="primary">{teams.length}</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Collaborative team hubs for distributing projects, subtasks, and tracking velocity.
          </p>
        </div>

        {(role === 'team_leader' || role === 'admin') && (
          <Button onClick={onOpenCreateTeam} className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" />
            Create Team
          </Button>
        )}
      </div>

      {teams.length === 0 ? (
        <Card className="p-12 text-center">
          <Users2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No teams created yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {role === 'team_leader' || role === 'admin'
              ? "Create a collaborative team workspace to invite teammates, share projects, and assign subtasks."
              : "You haven't been added to any team workspace yet."}
          </p>
          {(role === 'team_leader' || role === 'admin') && (
            <Button onClick={onOpenCreateTeam} className="mt-4 gap-1.5 text-xs shadow-sm">
              <Plus className="w-4 h-4" />
              Create First Team
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => {
            const members = teamMembers.filter(tm => tm.team_id === team.id);
            const teamProjects = projects.filter(p => p.team_id === team.id);
            const teamTasks = tasks.filter(t => t.team_id === team.id);
            const completedTasks = teamTasks.filter(t => t.status === 'Completed').length;
            const completionRate = teamTasks.length > 0 ? Math.round((completedTasks / teamTasks.length) * 100) : 0;
            const myMembership = members.find(tm => tm.user_id === user?.id);

            return (
              <Card
                key={team.id}
                className="flex flex-col hover:border-primary-400/80 hover:shadow-md transition-all group cursor-pointer"
                onClick={() => onSelectTeam(team.id)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={team.avatar_url} name={team.name} size="md" className="rounded-xl" />
                    <div>
                      <CardTitle className="text-base group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {team.name}
                      </CardTitle>
                      {myMembership && (
                        <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 capitalize">
                          {myMembership.role}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {team.description || "Active collaboration workspace for projects and subtask management."}
                  </p>

                  {/* Team Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-white">{members.length}</span>
                      <span className="text-[10px] text-slate-400">Members</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-white">{teamProjects.length}</span>
                      <span className="text-[10px] text-slate-400">Projects</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">{completionRate}%</span>
                      <span className="text-[10px] text-slate-400">Done</span>
                    </div>
                  </div>

                  {/* Member Avatars Stack */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex -space-x-2 overflow-hidden">
                      {members.slice(0, 4).map((m) => {
                        const profile = profiles.find(p => p.id === m.user_id);
                        return (
                          <Avatar
                            key={m.id}
                            src={profile?.avatar_url}
                            name={profile?.full_name}
                            size="xs"
                            className="ring-2 ring-white dark:ring-slate-900"
                          />
                        );
                      })}
                      {members.length > 4 && (
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                          +{members.length - 4}
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Open Workspace <ArrowRight className="w-3.5 h-3.5" />
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
