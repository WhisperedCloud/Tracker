import { describe, it, expect } from 'vitest';
import { buildPeriods, throughput } from './reports';

describe('report periods (requirement 3)', () => {
  const now = new Date(2026, 10, 13); // Fri 13 Nov 2026
  it('monthly: last N calendar months ending this month', () => {
    const periods = buildPeriods('monthly', 3, now);
    expect(periods.map(p => [p.start.getMonth(), p.end.getMonth()])).toEqual([[8, 9], [9, 10], [10, 11]]);
  });
  it('weekly: weeks start on Sunday and end with the current week', () => {
    const periods = buildPeriods('weekly', 2, now);
    expect(periods[1].start).toEqual(new Date(2026, 10, 8));
    expect(periods[1].end).toEqual(new Date(2026, 10, 15));
    expect(periods[0].start).toEqual(new Date(2026, 10, 1));
  });
  it('counts created and completed tasks per period', () => {
    const periods = buildPeriods('monthly', 2, now);
    const tasks = [
      { status: 'Completed', created_at: '2026-10-05T10:00:00', updated_at: '2026-11-02T10:00:00' },
      { status: 'To Do', created_at: '2026-11-03T10:00:00', updated_at: '2026-11-03T10:00:00' },
      { status: 'In Progress', created_at: '2026-11-04T10:00:00', updated_at: '2026-11-09T10:00:00' },
    ];
    expect(throughput(tasks, periods).map(r => [r.created, r.completed, r.net])).toEqual([[1, 0, -1], [2, 1, -1]]);
  });
});
