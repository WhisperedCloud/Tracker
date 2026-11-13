// Reporting periods for the Reports page: the last `count` weeks (starting
// Sunday) or calendar months, oldest first, ending with the current one.
export function buildPeriods(timeframe, count, now = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const back = count - 1 - i;
    if (timeframe === 'weekly') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - back * 7);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
      return { start, end, period: fmt.format(start), label: `${fmt.format(start)} – ${fmt.format(last)}` };
    }
    const start = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return {
      start,
      end,
      period: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(start),
      label: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(start),
    };
  });
}

export function inPeriod(value, period) {
  if (!value) return false;
  const d = new Date(value);
  return d >= period.start && d < period.end;
}

// Tasks created and completed in each period. Completion time is the task's
// updated_at, which is set when it is approved.
export function throughput(tasks, periods) {
  return periods.map(p => {
    const created = tasks.filter(t => inPeriod(t.created_at, p)).length;
    const completed = tasks.filter(t => t.status === 'Completed' && inPeriod(t.updated_at, p)).length;
    return { period: p.period, label: p.label, created, completed, net: completed - created };
  });
}
