// TaskSync email sender (Supabase Edge Function).
//
// The app calls this after it saves something (team created, member invited,
// project created, task assigned or reviewed). The request only names the
// event and the record id. This function checks that the caller is allowed
// to trigger that event, looks up the recipients itself and sends through
// Gmail SMTP, so it cannot be used to email arbitrary addresses.
//
// Secrets (supabase secrets set ...):
//   GMAIL_USER          the Gmail address that sends the mail
//   GMAIL_APP_PASSWORD  a Google App Password for that account
//   APP_URL             where the app runs, used for links (e.g. http://localhost:5173)
//   MAIL_FROM_NAME      optional display name, defaults to "TaskSync"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';
import nodemailer from 'npm:nodemailer@6.9.16';
import { type Mail, escapeHtml, formatDay, renderHtml, renderText } from './template.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? '';
const GMAIL_APP_PASSWORD = (Deno.env.get('GMAIL_APP_PASSWORD') ?? '').replace(/\s+/g, '');
const APP_URL = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/+$/, '');
const FROM_NAME = Deno.env.get('MAIL_FROM_NAME') ?? 'TaskSync';
// Logo in the public "brand" storage bucket (uploaded from public/brand/tasksync-logo-email.png).
const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/brand/tasksync-logo-email.png`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Profile = { id: string; email: string; full_name: string; role: string };

// The email layout lives in template.ts.

async function deliver(mails: Mail[]) {
  const results = await Promise.allSettled(
    mails.map((mail) =>
      transporter.sendMail({
        from: `"${FROM_NAME}" <${GMAIL_USER}>`,
        to: mail.to,
        subject: mail.subject,
        text: renderText(mail),
        html: renderHtml(mail, { logoUrl: LOGO_URL, appUrl: APP_URL }),
      })
    )
  );
  const failed = results
    .map((r, i) => (r.status === 'rejected' ? { to: mails[i].to, error: String(r.reason?.message ?? r.reason) } : null))
    .filter(Boolean);
  return { sent: results.length - failed.length, failed };
}

// ---------------------------------------------------------------------------
// Lookups (service role, so they bypass row-level security; every event
// checks the caller's permission explicitly first).
// ---------------------------------------------------------------------------
async function single<T>(query: PromiseLike<{ data: T | null; error: unknown }>, what: string): Promise<T> {
  const { data, error } = await query;
  if (error || !data) throw new HttpError(404, `${what} not found`);
  return data;
}

async function teamContext(db: SupabaseClient, teamId: string, callerId: string) {
  const team = await single<{ id: string; name: string }>(
    db.from('teams').select('id, name').eq('id', teamId).maybeSingle(), 'Team');
  const { data: members } = await db
    .from('team_members')
    .select('user_id, role, profiles:user_id (id, email, full_name, role)')
    .eq('team_id', teamId);
  const rows = (members ?? []) as unknown as { user_id: string; role: string; profiles: Profile }[];
  const caller = await single<Profile>(
    db.from('profiles').select('id, email, full_name, role').eq('id', callerId).maybeSingle(), 'Your profile');
  const callerMembership = rows.find((m) => m.user_id === callerId);
  return {
    team,
    caller,
    members: rows.map((m) => ({ ...m.profiles, teamRole: m.role })),
    isMember: Boolean(callerMembership),
    // Organizers: the group's creator and anyone they promoted.
    isLeader: ['leader', 'admin'].includes(callerMembership?.role ?? ''),
  };
}

async function taskContext(db: SupabaseClient, taskId: string, callerId: string) {
  const task = await single<{ id: string; title: string; team_id: string; assigned_to: string | null; created_by: string | null; due_date: string | null; project_id: string | null }>(
    db.from('tasks').select('id, title, team_id, assigned_to, created_by, due_date, project_id').eq('id', taskId).maybeSingle(), 'Task');
  const ctx = await teamContext(db, task.team_id, callerId);
  if (!ctx.isMember) throw new HttpError(403, 'You are not in this task\'s study group');
  const assignee = ctx.members.find((m) => m.id === task.assigned_to) ?? null;
  // The creator of a task can review it, like a organizer.
  const canReview = ctx.isLeader || task.created_by === callerId;
  const projectName = task.project_id
    ? (await db.from('projects').select('name').eq('id', task.project_id).maybeSingle()).data?.name ?? ''
    : '';
  return { ...ctx, task, assignee, canReview, projectName };
}

const ensure = (condition: boolean, message: string) => {
  if (!condition) throw new HttpError(403, message);
};

const inviteLink = (token: string) => `${APP_URL}/?invite=${encodeURIComponent(token)}`;

// Details rows escape their own values, so undo the escaping of names
// that were prepared for HTML paragraphs.
const unescape = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const roleName = (role: string) => (['leader', 'admin'].includes(role) ? 'Organizer' : 'Member');

// Group, subject and due date rows for task emails.
function taskDetails(ctx: { team: { name: string }; task: { due_date: string | null }; projectName?: string }) {
  return [
    { label: 'Group', value: ctx.team.name },
    ...(ctx.projectName ? [{ label: 'Subject', value: ctx.projectName }] : []),
    { label: 'Due', value: formatDay(ctx.task.due_date) || 'No due date' },
  ];
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
async function buildMails(db: SupabaseClient, callerId: string, body: Record<string, string>): Promise<Mail[]> {
  switch (body.type) {
    // Confirmation to the person who created the team.
    case 'team_created': {
      const ctx = await teamContext(db, body.team_id, callerId);
      ensure(ctx.isMember, 'Only members of this group can send this email');
      const { data: invites } = await db
        .from('team_invitations').select('email').eq('team_id', body.team_id).eq('status', 'pending');
      const others = ctx.members.filter((m) => m.id !== callerId).map((m) => escapeHtml(m.full_name));
      const pending = (invites ?? []).map((i: { email: string }) => escapeHtml(i.email));
      return [{
        to: ctx.caller.email,
        subject: `Your study group "${ctx.team.name}" is ready`,
        tag: 'Study group created',
        tone: 'moss',
        heading: `${ctx.team.name} is ready`,
        preheader: 'Your new study group is set up. Add subjects and invite classmates.',
        paragraphs: [
          `Hi ${escapeHtml(ctx.caller.full_name)}, your new study group is set up and you are its organizer.`,
        ],
        details: [
          { label: 'Group', value: ctx.team.name },
          { label: 'Members added', value: others.length ? others.map(unescape).join(', ') : 'None yet' },
          ...(pending.length ? [{ label: 'Invitations sent', value: pending.map(unescape).join(', ') }] : []),
        ],
        cta: { label: 'Open your group', url: APP_URL },
        note: 'Next: add a subject and split it into tasks for the group.',
      }];
    }

    // An existing user was added to a team.
    case 'member_added': {
      const ctx = await teamContext(db, body.team_id, callerId);
      ensure(ctx.isMember, 'Only members of this group can add people');
      const member = ctx.members.find((m) => m.id === body.user_id);
      if (!member) throw new HttpError(404, 'That person is not in this study group');
      return [{
        to: member.email,
        subject: `You were added to "${ctx.team.name}" on TaskSync`,
        tag: 'Added to a group',
        heading: `Welcome to ${ctx.team.name}`,
        preheader: `${ctx.caller.full_name} added you to ${ctx.team.name}.`,
        paragraphs: [
          `Hi ${escapeHtml(member.full_name)}, <strong>${escapeHtml(ctx.caller.full_name)}</strong> added you to the study group <strong>${escapeHtml(ctx.team.name)}</strong>.`,
          'Sign in to see the group\'s subjects, sessions and the tasks assigned to you.',
        ],
        details: [
          { label: 'Group', value: ctx.team.name },
          { label: 'Your role', value: roleName(member.teamRole) },
          { label: 'Added by', value: ctx.caller.full_name },
        ],
        cta: { label: 'Open the group', url: APP_URL },
      }];
    }

    // Someone without an account was invited.
    case 'invitation_created': {
      const invite = await single<{ id: string; team_id: string; email: string; role: string; invitation_token: string; status: string }>(
        db.from('team_invitations').select('id, team_id, email, role, invitation_token, status').eq('id', body.invitation_id).maybeSingle(),
        'Invitation');
      const ctx = await teamContext(db, invite.team_id, callerId);
      ensure(ctx.isMember, 'Only members of this group can send invitations');
      if (invite.status !== 'pending') throw new HttpError(409, 'This invitation is no longer pending');
      return [{
        to: invite.email,
        subject: `${ctx.caller.full_name} invited you to "${ctx.team.name}" on TaskSync`,
        tag: 'Invitation',
        heading: `You're invited to join ${ctx.team.name}`,
        preheader: `${ctx.caller.full_name} invited you to study together on TaskSync.`,
        paragraphs: [
          `<strong>${escapeHtml(ctx.caller.full_name)}</strong> invited you to join the study group <strong>${escapeHtml(ctx.team.name)}</strong> on TaskSync, where the group plans subjects, splits tasks and schedules study sessions.`,
          `Create your account with <strong>${escapeHtml(invite.email)}</strong>, then accept the invitation.`,
        ],
        details: [
          { label: 'Group', value: ctx.team.name },
          { label: 'Invited by', value: ctx.caller.full_name },
          { label: 'Role', value: roleName(invite.role) },
          { label: 'Expires', value: 'In 7 days' },
        ],
        cta: { label: 'Accept invitation', url: inviteLink(invite.invitation_token) },
      }];
    }

    // New subject: tell everyone in the group except its creator.
    case 'project_created': {
      const project = await single<{ id: string; name: string; team_id: string; description: string | null; due_date: string | null; priority: string }>(
        db.from('projects').select('id, name, team_id, description, due_date, priority').eq('id', body.project_id).maybeSingle(), 'Project');
      const ctx = await teamContext(db, project.team_id, callerId);
      ensure(ctx.isMember, 'Only members of this group can announce subjects');
      return ctx.members
        .filter((m) => m.id !== callerId)
        .map((m) => ({
          to: m.email,
          subject: `New subject in ${ctx.team.name}: ${project.name}`,
          tag: 'New subject',
          heading: project.name,
          preheader: `${ctx.caller.full_name} added "${project.name}" to ${ctx.team.name}.`,
          paragraphs: [
            `Hi ${escapeHtml(m.full_name)}, <strong>${escapeHtml(ctx.caller.full_name)}</strong> added a new subject to <strong>${escapeHtml(ctx.team.name)}</strong>.`,
          ],
          details: [
            { label: 'Group', value: ctx.team.name },
            { label: 'Priority', value: project.priority },
            { label: 'Target date', value: formatDay(project.due_date) || 'Not set' },
          ],
          quote: project.description ? { label: 'About this subject', text: project.description } : undefined,
          cta: { label: 'View subject', url: APP_URL },
        }));
    }

    case 'task_assigned': {
      const ctx = await taskContext(db, body.task_id, callerId);
      if (!ctx.assignee || ctx.assignee.id === callerId) return [];
      return [{
        to: ctx.assignee.email,
        subject: `New task for you: ${ctx.task.title}`,
        tag: 'New task',
        heading: ctx.task.title,
        preheader: `${ctx.caller.full_name} assigned you a task in ${ctx.team.name}.`,
        paragraphs: [
          `Hi ${escapeHtml(ctx.assignee.full_name)}, <strong>${escapeHtml(ctx.caller.full_name)}</strong> assigned you a task.`,
        ],
        details: taskDetails(ctx),
        cta: { label: 'Open the task', url: APP_URL },
        note: 'When it is done, submit it for review from the task.',
      }];
    }

    case 'task_submitted': {
      const ctx = await taskContext(db, body.task_id, callerId);
      // Reviewers: organizers plus whoever created the task.
      return ctx.members
        .filter((m) => (['leader', 'admin'].includes(m.teamRole) || m.id === ctx.task.created_by) && m.id !== callerId)
        .map((leader) => ({
          to: leader.email,
          subject: `Ready for review: ${ctx.task.title}`,
          tag: 'Ready for review',
          tone: 'ochre',
          heading: ctx.task.title,
          preheader: `${ctx.caller.full_name} submitted a task for your review.`,
          paragraphs: [
            `Hi ${escapeHtml(leader.full_name)}, <strong>${escapeHtml(ctx.caller.full_name)}</strong> finished this task and submitted it for your review.`,
          ],
          details: [{ label: 'Submitted by', value: ctx.caller.full_name }, ...taskDetails(ctx)],
          cta: { label: 'Review task', url: APP_URL },
          note: 'Approve it, or request changes with a short note.',
        }));
    }

    case 'task_approved':
    case 'task_changes_requested': {
      const ctx = await taskContext(db, body.task_id, callerId);
      ensure(ctx.canReview, 'Only the task creator or a organizer can review it');
      if (!ctx.assignee || ctx.assignee.id === callerId) return [];
      const approved = body.type === 'task_approved';
      return [{
        to: ctx.assignee.email,
        subject: approved ? `Approved: ${ctx.task.title}` : `Changes requested: ${ctx.task.title}`,
        tag: approved ? 'Approved' : 'Changes requested',
        tone: approved ? 'moss' : 'terracotta',
        heading: ctx.task.title,
        preheader: approved
          ? `${ctx.caller.full_name} approved your task. Nice work.`
          : `${ctx.caller.full_name} asked for changes on your task.`,
        paragraphs: [
          approved
            ? `Nice work, ${escapeHtml(ctx.assignee.full_name)}. <strong>${escapeHtml(ctx.caller.full_name)}</strong> approved your task and it is now marked <strong>Completed</strong>.`
            : `Hi ${escapeHtml(ctx.assignee.full_name)}, <strong>${escapeHtml(ctx.caller.full_name)}</strong> reviewed your task and asked for a few changes.`,
        ],
        details: [{ label: 'Reviewed by', value: ctx.caller.full_name }, ...taskDetails(ctx)],
        quote: !approved && body.feedback ? { label: 'Feedback', text: body.feedback.slice(0, 1000) } : undefined,
        cta: { label: 'Open the task', url: APP_URL },
        note: approved ? undefined : 'Make the changes, then submit the task for review again.',
      }];
    }

    // New study session: tell everyone in the group except whoever scheduled it.
    case 'session_scheduled': {
      const session = await single<{ id: string; team_id: string; title: string; agenda: string | null; location: string | null; meeting_url: string | null; starts_at: string; duration_minutes: number; project_id: string | null }>(
        db.from('study_sessions').select('id, team_id, title, agenda, location, meeting_url, starts_at, duration_minutes, project_id').eq('id', body.session_id).maybeSingle(),
        'Study session');
      const ctx = await teamContext(db, session.team_id, callerId);
      ensure(ctx.isMember, 'Only members of this group can announce sessions');
      const tz = body.time_zone && /^[A-Za-z_]+\/[A-Za-z_\/+-]+$/.test(body.time_zone) ? body.time_zone : 'UTC';
      const when = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' })
        .format(new Date(session.starts_at));
      const where = [session.location, session.meeting_url].filter(Boolean).join(' or ');
      const subjectName = session.project_id
        ? (await db.from('projects').select('name').eq('id', session.project_id).maybeSingle()).data?.name ?? ''
        : '';
      return ctx.members
        .filter((m) => m.id !== callerId)
        .map((m) => ({
          to: m.email,
          subject: `Study session: ${session.title} (${ctx.team.name})`,
          tag: 'Study session',
          heading: session.title,
          preheader: `${when} · ${ctx.team.name}`,
          paragraphs: [
            `Hi ${escapeHtml(m.full_name)}, <strong>${escapeHtml(ctx.caller.full_name)}</strong> scheduled a study session for <strong>${escapeHtml(ctx.team.name)}</strong>.`,
          ],
          details: [
            { label: 'When', value: when },
            { label: 'Length', value: `${session.duration_minutes} minutes` },
            ...(where ? [{ label: 'Where', value: where }] : []),
            ...(subjectName ? [{ label: 'Subject', value: subjectName }] : []),
          ],
          quote: session.agenda ? { label: 'Agenda', text: session.agenda } : undefined,
          cta: { label: 'Say if you are going', url: APP_URL },
        }));
    }

    default:
      throw new HttpError(400, `Unknown email type: ${body.type}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST');

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth?.user) throw new HttpError(401, 'Please sign in again');

    const body = await req.json().catch(() => ({}));
    const mails = (await buildMails(db, auth.user.id, body)).filter((m) => m.to);
    if (mails.length === 0) return json(200, { sent: 0, failed: [] });

    // Checked after permissions, so a misconfigured server never hides an authorization problem.
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new HttpError(503, 'Email is not set up yet (GMAIL_USER / GMAIL_APP_PASSWORD secrets are missing)');
    }

    const result = await deliver(mails);
    if (result.failed.length) console.error('Some emails failed', result.failed);
    return json(result.failed.length && !result.sent ? 502 : 200, result);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    console.error('send-email error:', err);
    return json(status, { error: err instanceof Error ? err.message : String(err) });
  }
});
