import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle,
  Briefcase,
  ChevronRight,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatDate, cn } from '@/lib/utils';

export function SmartWorkloadBalancer({ teamId, selectedMemberId, onSelectMember }) {
  const { teamMembers, profiles, getMemberWorkload, getRecommendedAssignee } = useData();

  const { recommended, allMembers } = getRecommendedAssignee(teamId);

  return (
    <div className="space-y-4">
      {/* Smart Recommendation Banner */}
      {recommended && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary-50 to-indigo-50/80 dark:from-primary-950/40 dark:to-indigo-950/20 border border-primary-200/80 dark:border-primary-800/60 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-600 text-white rounded-lg shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
                    Smart Workload Recommendation
                  </span>
                  <span className="text-[10px] bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 px-1.5 py-0.5 rounded font-semibold">
                    Optimal Assignee
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  Recommended: {recommended.profile?.full_name}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Has {recommended.workload.activeCount} active task{recommended.workload.activeCount === 1 ? '' : 's'} and {recommended.workload.overdueCount} overdue tasks. Currently at{' '}
                  <strong className="text-slate-900 dark:text-slate-200">{recommended.workload.workloadLevel}</strong> ({recommended.workload.description}).
                </p>
              </div>
            </div>

            {onSelectMember && (
              <button
                type="button"
                onClick={() => onSelectMember(recommended.user_id)}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-xs"
              >
                Assign
              </button>
            )}
          </div>
        </div>
      )}

      {/* Member Workload Matrix */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
          <span>Team Capacity & Bandwidth Breakdown</span>
          <span>{allMembers.length} Members</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allMembers.length === 0 ? (
            <div className="col-span-2 p-6 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
              No team members enrolled in this workspace yet. Invite members to balance team workload.
            </div>
          ) : (
            allMembers.map((item) => {
              const isSelected = selectedMemberId === item.user_id;
              const isRec = recommended?.user_id === item.user_id;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectMember && onSelectMember(item.user_id)}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all text-left',
                    onSelectMember ? 'cursor-pointer hover:border-primary-400 hover:shadow-xs' : '',
                    isSelected
                      ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-950/20 ring-2 ring-primary-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={item.profile?.avatar_url} name={item.profile?.full_name} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {item.profile?.full_name}
                          </span>
                          {isRec && (
                            <Sparkles className="w-3 h-3 text-primary-600 dark:text-primary-400" title="Recommended" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 capitalize">{item.role}</span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                        item.workload.badgeColor
                      )}
                    >
                      {item.workload.workloadLevel}
                    </span>
                  </div>

                  {/* Workload Stats Bars */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-center">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg">
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        {item.workload.activeCount}
                      </span>
                      <span className="text-[10px] text-slate-500">Active</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg">
                      <span className={cn('block text-xs font-bold', item.workload.overdueCount > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200')}>
                        {item.workload.overdueCount}
                      </span>
                      <span className="text-[10px] text-slate-500">Overdue</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg">
                      <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {item.workload.completionRate}%
                      </span>
                      <span className="text-[10px] text-slate-500">Completed</span>
                    </div>
                  </div>

                  {/* Upcoming Deadlines preview */}
                  {item.workload.upcomingDeadlines.length > 0 && (
                    <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        Next: {item.workload.upcomingDeadlines[0].title} ({formatDate(item.workload.upcomingDeadlines[0].due_date)})
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
