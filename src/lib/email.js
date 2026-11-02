import { supabase } from '@/lib/supabase';

// Asks the send-email Edge Function to email the people involved in an event.
// Only the event type and record id are sent; the function checks permissions
// and looks up the recipients itself.
//
// Types: team_created, member_added, invitation_created, project_created,
//        task_assigned, task_submitted, task_approved, task_changes_requested
export async function sendEmail(type, payload = {}) {
  const { data, error } = await supabase.functions.invoke('send-email', { body: { type, ...payload } });
  if (error) {
    let message = error.message;
    // FunctionsHttpError carries the function's JSON response.
    try {
      const body = await error.context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      // keep the generic message
    }
    return { ok: false, error: message };
  }
  if (data?.failed?.length) {
    return { ok: data.sent > 0, error: `Could not email ${data.failed.map(f => f.to).join(', ')}`, data };
  }
  return { ok: true, data };
}
