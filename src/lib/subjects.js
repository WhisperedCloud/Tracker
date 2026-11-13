// Subject (project) rules shared by every page: automatic status, progress,
// and ordering. Kept free of React so they can be unit tested, and mirrored
// in SQL by public.compute_project_status() in supabase/schema.sql.

export const SUBJECT_STATUSES = ['Planning', 'In Progress', 'Completed', 'On Hold'];
export const SUBJECT_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const PRIORITY_RANK = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

export const SUBJECT_SORTS = [
  { value: 'custom', label: 'Custom Order' },
  { value: 'name', label: 'Subject Name (A–Z)' },
  { value: 'priority', label: 'Priority (High to Low)' },
  { value: 'due', label: 'Due Date' },
];

// The units of work that make up a subject: every task in it that has no
// subtasks of its own. A main task with subtasks is represented by its
// subtasks; a main task without any counts by itself.
export function getWorkItems(projectId, tasks) {
  const inSubject = tasks.filter(t => t.project_id === projectId);
  const parentIds = new Set(tasks.map(t => t.parent_task_id).filter(Boolean));
  return inSubject.filter(t => !parentIds.has(t.id));
}

// Planning    - nothing started (or no tasks yet)
// In Progress - anything started, or some finished and some not
// Completed   - every task finished
export function computeSubjectStatus(workItems) {
  if (workItems.length === 0) return 'Planning';
  const completed = workItems.filter(t => t.status === 'Completed').length;
  if (completed === workItems.length) return 'Completed';
  const started = workItems.some(t => t.status !== 'To Do');
  return started ? 'In Progress' : 'Planning';
}

export function computeSubjectProgress(workItems) {
  if (workItems.length === 0) return 0;
  const completed = workItems.filter(t => t.status === 'Completed').length;
  return Math.round((completed / workItems.length) * 100);
}

// The status a subject shows: a manual choice wins until it is reset,
// otherwise the status follows the tasks.
export function effectiveStatus(project, autoStatus) {
  return project.status_manual ? project.status : autoStatus;
}

// What the database should store when someone picks a status. Picking the
// status the tasks already give keeps the subject automatic.
export function statusChange(newStatus, autoStatus) {
  return newStatus === autoStatus
    ? { status: autoStatus, status_manual: false }
    : { status: newStatus, status_manual: true };
}

// Custom order: subjects the user has placed come in their saved order;
// subjects they have not placed yet (new ones) come first, newest first.
export function applyCustomOrder(projects, order = []) {
  const position = new Map(order.map((id, i) => [id, i]));
  const unplaced = projects
    .filter(p => !position.has(p.id))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const placed = projects
    .filter(p => position.has(p.id))
    .sort((a, b) => position.get(a.id) - position.get(b.id));
  return [...unplaced, ...placed];
}

const dueValue = (p) => (p.due_date ? p.due_date : '9999-12-31');

// Sort subjects or tasks the same way. `order` is the person's saved custom
// order (ids); `nameOf` reads the name to sort A–Z.
export function sortItems(items, sortBy, order, nameOf = (x) => x.name) {
  const list = [...applyCustomOrder(items, order)];
  switch (sortBy) {
    case 'name':
      return list.sort((a, b) => String(nameOf(a) || '').localeCompare(String(nameOf(b) || ''), undefined, { sensitivity: 'base', numeric: true }));
    case 'priority':
      return list.sort((a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0));
    case 'due':
      // Earliest deadline first; items with no deadline go last.
      return list.sort((a, b) => dueValue(a).localeCompare(dueValue(b)));
    default:
      return list;
  }
}

export function sortSubjects(projects, sortBy, order) {
  return sortItems(projects, sortBy, order, p => p.name);
}

export const TASK_SORTS = [
  { value: 'custom', label: 'Custom Order' },
  { value: 'name', label: 'Task Name (A–Z)' },
  { value: 'priority', label: 'Priority (High to Low)' },
  { value: 'due', label: 'Due Date' },
];

export function sortTasks(tasks, sortBy, order) {
  return sortItems(tasks, sortBy, order, t => t.title);
}

// Move one item inside a list.
export function moveItem(list, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

// When a filter hides some subjects, the user reorders only the visible
// ones. Put the visible subjects back into the slots they occupied in the
// full order, so hidden subjects keep their places.
export function mergeVisibleOrder(fullOrder, newVisibleOrder) {
  const visible = new Set(newVisibleOrder);
  const queue = [...newVisibleOrder];
  return fullOrder.map(id => (visible.has(id) ? queue.shift() : id));
}
