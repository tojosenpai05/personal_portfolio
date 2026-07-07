import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_KEY   = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANAN         = 'tojosenpai05@gmail.com';

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; detail: string }> {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Anan <booking@anansportfolio.work>', to, subject, html }),
  });
  const detail = await r.text();
  if (!r.ok) console.error(`Resend ${r.status} for ${to}: ${detail}`);
  return { ok: r.ok, detail };
}

const row = (label: string, value: string) =>
  `<tr>
    <td style="padding:12px 32px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid #f0f0f0;white-space:nowrap;width:120px">${label}</td>
    <td style="padding:12px 32px 12px 0;color:#141414;font-size:14px;border-bottom:1px solid #f0f0f0">${value}</td>
  </tr>`;

const wrap = (header: string, body: string) =>
  `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-top:3px solid #141414;max-width:600px;width:100%">
          <tr><td style="padding:32px 32px 24px">
            <p style="margin:0;color:#141414;font-size:11px;letter-spacing:.15em;text-transform:uppercase">${header}</p>
          </td></tr>
          <tr><td>
            <table width="100%" cellpadding="0" cellspacing="0">${body}</table>
          </td></tr>
          <tr><td style="padding:24px 32px">
            <p style="margin:0;color:#bbb;font-size:11px">tojosenpai05@gmail.com</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;

// Supabase forces Content-Type: text/plain (plus a locked-down CSP) on
// verify_jwt=false function responses regardless of what we set here — an
// anti-abuse measure so unauthenticated functions can't host arbitrary HTML
// on a trusted *.supabase.co domain. So this renders as plain text, not a page.
function page(title: string, message: string): Response {
  const body = `${title.toUpperCase()}\n\n${message}`;
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return page('Invalid link', 'This confirmation link is invalid or has already been used.');
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: rows, error } = await sb
      .from('bookings')
      .select('*')
      .eq('confirm_token', token)
      .is('confirmed_at', null)
      .limit(1);

    if (error) throw error;
    if (!rows || !rows.length) {
      return page('Invalid link', 'This confirmation link is invalid or has already been used.');
    }

    const record = rows[0];

    const { error: updErr } = await sb
      .from('bookings')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', record.id);
    if (updErr) throw updErr;

    const ownerBody =
      row('Name',     record.name) +
      row('Email',    record.email) +
      row('Interest', record.work_type ?? 'N/A') +
      row('Date',     record.date ?? 'N/A') +
      row('Time',     record.time ?? 'N/A') +
      row('Budget',   record.budget ?? 'Not specified') +
      row('Message',  record.message ?? '&mdash;');

    const owner = await sendEmail(ANAN, `New booking from ${record.name}`, wrap('New Booking', ownerBody));
    if (!owner.ok) throw new Error('owner email failed');

    if (record.email) {
      const clientBody =
        `<tr><td colspan="2" style="padding:24px 32px 16px">
          <p style="margin:0;color:#141414;font-size:22px;font-weight:600">Hi ${record.name},</p>
          <p style="margin:12px 0 0;color:#888;font-size:14px;line-height:1.6">Thanks for reaching out. Here's a summary of your booking.</p>
        </td></tr>` +
        row('Interest', record.work_type ?? 'N/A') +
        row('Date',     record.date ?? 'TBD') +
        row('Time',     record.time ?? 'TBD') +
        row('Budget',   record.budget ?? 'Not specified') +
        row('Message',  record.message ?? '&mdash;') +
        `<tr><td colspan="2" style="padding:24px 32px">
          <p style="margin:0;color:#888;font-size:13px">Anan will be in touch shortly to confirm the details.</p>
        </td></tr>`;

      await sendEmail(record.email, 'Your booking with Anan is confirmed', wrap('Booking Confirmed', clientBody));
    }

    return page('Booking confirmed', 'Thanks, your booking is confirmed. Anan will be in touch shortly.');
  } catch (_) {
    return page('Something went wrong', 'We could not confirm your booking right now. Please try again later.');
  }
});
