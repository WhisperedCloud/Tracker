import { describe, it, expect } from 'vitest';
import {
  getWorkItems,
  computeSubjectStatus,
  computeSubjectProgress,
  effectiveStatus,
  statusChange,
  applyCustomOrder,
  sortSubjects,
  sortTasks,
  moveItem,
  mergeVisibleOrder,
} from './subjects';

const P = 'subject-1';
const task = (id, status, parent = null, project = P) => ({ id, status, parent_task_id: parent, project_id: project });

describe('getWorkItems', () => {
  it('uses subtasks in place of a main task that has them', () => {
    const tasks = [task('main', 'To Do'), task('a', 'Completed', 'main'), task('b', 'To Do', 'main')];
    expect(getWorkItems(P, tasks).map(t => t.id)).toEqual(['a', 'b']);
  });

  it('counts a main task without subtasks by itself', () => {
    const tasks = [task('m1', 'To Do'), task('m2', 'To Do'), task('s', 'Completed', 'm2')];
    expect(getWorkItems(P, tasks).map(t => t.id).sort()).toEqual(['m1', 's']);
  });

  it('ignores tasks of other subjects', () => {
    expect(getWorkItems(P, [task('x', 'Completed', null, 'other')])).toEqual([]);
  });
});

describe('computeSubjectStatus (requirement 1)', () => {
  const status = (...statuses) => computeSubjectStatus(statuses.map((s, i) => task(String(i), s)));

  it('no tasks -> Planning', () => expect(status()).toBe('Planning'));
  it('no subtasks started -> Planning', () => expect(status('To Do', 'To Do')).toBe('Planning'));
  it('one subtask In Progress -> In Progress', () => expect(status('In Progress', 'To Do')).toBe('In Progress'));
  it('some completed, others pending -> In Progress', () => expect(status('Completed', 'To Do')).toBe('In Progress'));
  it('under review counts as started', () => expect(status('Under Review', 'To Do')).toBe('In Progress'));
  it('all completed -> Completed', () => expect(status('Completed', 'Completed')).toBe('Completed'));
  it('completed subtask reopened -> back to In Progress', () => {
    expect(status('Completed', 'Completed')).toBe('Completed');
    expect(status('Completed', 'In Progress')).toBe('In Progress');
  });
});

describe('computeSubjectProgress', () => {
  it('is the share of completed work items', () => {
    expect(computeSubjectProgress([task('a', 'Completed'), task('b', 'To Do'), task('c', 'To Do')])).toBe(33);
    expect(computeSubjectProgress([])).toBe(0);
  });
});

describe('manual status (requirement 4)', () => {
  it('automatic subjects show the status from their tasks', () => {
    expect(effectiveStatus({ status: 'Planning', status_manual: false }, 'In Progress')).toBe('In Progress');
  });
  it('a manual status wins until reset', () => {
    expect(effectiveStatus({ status: 'On Hold', status_manual: true }, 'In Progress')).toBe('On Hold');
  });
  it('picking a different status makes it manual', () => {
    expect(statusChange('On Hold', 'In Progress')).toEqual({ status: 'On Hold', status_manual: true });
  });
  it('picking the automatic status keeps it automatic', () => {
    expect(statusChange('In Progress', 'In Progress')).toEqual({ status: 'In Progress', status_manual: false });
  });
});

const subjects = [
  { id: 'a', name: 'biology', priority: 'Low', due_date: '2026-12-10', created_at: '2026-01-01' },
  { id: 'b', name: 'Algebra', priority: 'Urgent', due_date: null, created_at: '2026-01-02' },
  { id: 'c', name: 'Chemistry', priority: 'High', due_date: '2026-11-20', created_at: '2026-01-03' },
  { id: 'd', name: 'Drama', priority: 'Medium', due_date: '2026-11-25', created_at: '2026-01-04' },
];
const ids = list => list.map(s => s.id);

describe('custom order (requirement 2)', () => {
  it('follows the saved order', () => {
    expect(ids(applyCustomOrder(subjects, ['c', 'a', 'd', 'b']))).toEqual(['c', 'a', 'd', 'b']);
  });
  it('puts subjects not yet placed first, newest first', () => {
    expect(ids(applyCustomOrder(subjects, ['a', 'b']))).toEqual(['d', 'c', 'a', 'b']);
  });
  it('ignores ids of deleted subjects', () => {
    expect(ids(applyCustomOrder(subjects, ['gone', 'b', 'a', 'c', 'd']))).toEqual(['b', 'a', 'c', 'd']);
  });
});

describe('sortSubjects', () => {
  const order = ['d', 'c', 'b', 'a'];
  it('custom is the saved order', () => expect(ids(sortSubjects(subjects, 'custom', order))).toEqual(order));
  it('name A–Z ignores case', () => expect(ids(sortSubjects(subjects, 'name', order))).toEqual(['b', 'a', 'c', 'd']));
  it('priority high to low', () => expect(ids(sortSubjects(subjects, 'priority', order))).toEqual(['b', 'c', 'd', 'a']));
  it('due date soonest first, no date last', () => expect(ids(sortSubjects(subjects, 'due', order))).toEqual(['c', 'd', 'a', 'b']));
});

describe('moving subjects', () => {
  it('moves up and down', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });
  it('does nothing past either end', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 2)).toEqual(['a', 'b']);
  });
  it('reordering a filtered view keeps hidden subjects in place', () => {
    // full: a b c d e, visible: b d e (a and c hidden), user moves e to the top
    expect(mergeVisibleOrder(['a', 'b', 'c', 'd', 'e'], ['e', 'b', 'd'])).toEqual(['a', 'e', 'c', 'b', 'd']);
  });
});

describe('task sorting (same options on the subject page)', () => {
  const tasks = [
    { id: 't1', title: 'Section 10 revision', priority: 'Low', due_date: '2026-12-05', created_at: '2026-01-01' },
    { id: 't2', title: 'Section 2 notes', priority: 'Urgent', due_date: null, created_at: '2026-01-02' },
    { id: 't3', title: 'Section 1 summary', priority: 'High', due_date: '2026-11-20', created_at: '2026-01-03' },
  ];
  const order = ['t2', 't1', 't3'];
  it('custom follows the saved order', () => expect(ids(sortTasks(tasks, 'custom', order))).toEqual(['t2', 't1', 't3']));
  it('name sorts by title with numbers in natural order', () => expect(ids(sortTasks(tasks, 'name', order))).toEqual(['t3', 't2', 't1']));
  it('priority high to low', () => expect(ids(sortTasks(tasks, 'priority', order))).toEqual(['t2', 't3', 't1']));
  it('due date soonest first, none last', () => expect(ids(sortTasks(tasks, 'due', order))).toEqual(['t3', 't1', 't2']));
});
