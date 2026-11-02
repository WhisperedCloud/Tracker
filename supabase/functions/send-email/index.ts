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
type Mail = { to: string; subject: string; heading: string; paragraphs: string[]; cta?: { label: string; url: string } };

// ---------------------------------------------------------------------------
// Email template: cream page, brown button, matching the app.
// ---------------------------------------------------------------------------
const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function renderHtml(mail: Mail) {
  const paragraphs = mail.paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#483B31;">${p}</p>`)
    .join('');
  const button = mail.cta
    ? `<p style="margin:24px 0 8px;"><a href="${escapeHtml(mail.cta.url)}" style="display:inline-block;background:#7B3F00;color:#F6F1E9;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">${escapeHtml(mail.cta.label)}</a></p>
       <p style="margin:12px 0 0;font-size:12px;color:#76634F;">Or open this link: <a href="${escapeHtml(mail.cta.url)}" style="color:#7B3F00;">${escapeHtml(mail.cta.url)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F6F1E9;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F1E9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFCF8;border:1px solid #E5D9C6;border-radius:16px;">
        <tr><td style="padding:20px 28px;border-bottom:1px solid #E5D9C6;">
          <img src="${LOGO_URL}" alt="TaskSync" width="140" style="display:block;width:140px;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#231C17;">${escapeHtml(mail.heading)}</h1>
          ${paragraphs}
          ${button}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #E5D9C6;font-size:12px;color:#9A8268;">
          You received this because of activity in your TaskSync study groups.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function renderText(mail: Mail) {
  const strip = (s: string) => s.replace(/<[^>]+>/g, '');
  return [mail.heading, '', ...mail.paragraphs.map(strip), mail.cta ? `\n${mail.cta.label}: ${mail.cta.url}` : '']
    .join('\n');
}

async function deliver(mails: Mail[]) {
  const results = await Promise.allSettled(
    mails.map((mail) =>
      transporter.sendMail({
        from: `"${FROM_NAME}" <${GMAIL_USER}>`,
        to: mail.to,
        subject: mail.subject,
        text: renderText(mail),
        html: renderHtml(mail),
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
  return { ...ctx, task, assignee, canReview };
}

const ensure = (condition: boolean, message: string) => {
  if (!condition) throw new HttpError(403, message);
};

const inviteLink = (token: string) => `${APP_URL}/?invite=${encodeURIComponent(token)}`;

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
        heading: `"${ctx.team.name}" has been created`,
        paragraphs: [
          `Hi ${escapeHtml(ctx.caller.full_name)}, your new study group is ready and you are its organizer.`,
          others.length ? `Members added: <strong>${others.join(', ')}</strong>.` : 'No other members have been added yet.',
          pending.length ? `Invitations sent to: <strong>${pending.join(', ')}</strong>.` : '',
        ].filter(Boolean),
        cta: { label: 'Open TaskSync', url: APP_URL },
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
        heading: `Welcome to ${ctx.team.name}`,
        paragraphs: [
          `Hi ${escapeHtml(member.full_name)}, <strong>${escapeHtml(ctx.caller.full_name)}</strong> added you to the study group <strong>${escapeHtml(ctx.team.name)}</strong> as a ${escapeHtml(member.teamRole)}.`,
          'Sign in to see the group\'s subjects, sessions and the tasks assigned to you.',
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
        heading: `You're invited to join ${ctx.team.name}`,
        paragraphs: [
          `<strong>${escapeHtml(ctx.caller.full_name)}</strong> invited you to join the study group <strong>${escapeHtml(ctx.team.name)}</strong> on TaskSync as a ${escapeHtml(invite.role)}.`,
          `Create your account with this email address (<strong>${escapeHtml(invite.email)}</strong>), then accept the invitation on the Teams page. The invitation expires in 7 days.`,
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
          heading: `New subject: ${project.name}`,
          paragraphs: [
            `Hi ${escapeHtml(m.full_name)}, <strong>${escapeHtml(ctx.caller.full_name)}</strong> added a new subject to your study group <strong>${escapeHtml(ctx.team.name)}</strong>.`,
            project.description ? escapeHtml(project.description) : '',
            `Priority: <strong>${escapeHtml(project.priority)}</strong>${project.due_date ? ` · Target date: <strong>${escapeHtml(project.due_date)}</strong>` : ''}`,
          ].filter(Boolean),
          cta: { label: 'View subject', url: APP_URL },
        }));
    }

    case 'task_assigned': {
      const ctx = await taskContext(db, body.task_id, callerId);
      if (!ctx.assignee || ctx.assignee.id === callerId) return [];
      return [{
        to: ctx.assignee.email,
        subject: `New task for you: ${ctx.task.title}`,
        heading: 'A task was assigned to you',
        paragraphs: [
          `Hi ${escapeHtml(ctx.assignee.full_name)}, <strong>${escapeHtml(ctx.caller.full_name)}</strong> assigned you <strong>${escapeHtml(ctx.task.title)}</strong> in ${escapeHtml(ctx.team.name)}.`,
          ctx.task.due_date ? `Due: <strong>${escapeHtml(ctx.task.due_date)}</strong>` : '',
        ].filter(Boolean),
        cta: { label: 'Open TaskSync', url: APP_URL },
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
          heading: 'A task is waiting for your review',
          paragraphs: [
            `<strong>${escapeHtml(ctx.caller.full_name)}</strong> submitted <strong>${escapeHtml(ctx.task.title)}</strong> in ${escapeHtml(ctx.team.name)} for review.`,
            'Approve it or request changes from the task details.',
          ],
          cta: { label: 'Review task', url: APP_URL },
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
        heading: approved ? 'Your task was approved' : 'Changes were requested on your task',
        paragraphs: [
          approved
            ? `<strong>${escapeHtml(ctx.caller.full_name)}</strong> approved <strong>${escapeHtml(ctx.task.title)}</strong>. It is now marked Completed.`
            : `<strong>${escapeHtml(ctx.caller.full_name)}</strong> asked for changes on <strong>${escapeHtml(ctx.task.title)}</strong>.`,
          !approved && body.feedback ? `Feedback: “${escapeHtml(body.feedback.slice(0, 1000))}”` : '',
        ].filter(Boolean),
        cta: { label: 'Open the task', url: APP_URL },
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
      const where = [session.location, session.meeting_url].filter(Boolean).map((v) => escapeHtml(v)).join(' or ');
      return ctx.members
        .filter((m) => m.id !== callerId)
        .map((m) => ({
          to: m.email,
          subject: `Study session: ${session.title} (${ctx.team.name})`,
          heading: session.title,
          paragraphs: [
            `Hi ${escapeHtml(m.full_name)}, <strong>${escapeHtml(ctx.caller.full_name)}</strong> scheduled a study session for <strong>${escapeHtml(ctx.team.name)}</strong>.`,
            `<strong>When:</strong> ${escapeHtml(when)} (${session.duration_minutes} minutes)`,
            where ? `<strong>Where:</strong> ${where}` : '',
            session.agenda ? `<strong>Agenda:</strong> ${escapeHtml(session.agenda)}` : '',
            'Open TaskSync to say whether you are going.',
          ].filter(Boolean),
          cta: { label: 'RSVP in TaskSync', url: APP_URL },
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
