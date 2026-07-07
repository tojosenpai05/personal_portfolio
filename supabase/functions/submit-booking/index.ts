import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_KEY   = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RATE_SALT    = Deno.env.get('RATE_LIMIT_SALT') ?? '';

const EMAIL_RE = /^[^\s@]+@[^\s@]{2,}\.[^\s@]{2,}$/;
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; detail: string }> {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Portfolio <onboarding@resend.dev>', to, subject, html }),
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

// Edge Functions don't get CORS headers for free the way Supabase's own
// REST API does — the browser preflights any cross-origin POST with a JSON
// body, so OPTIONS must be answered and every response must carry these.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function domainHasMx(email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain || domain.length < 4) return false;
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { signal: AbortSignal.timeout(5000) },
    );
    const data = await res.json();
    return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    // Fail closed: an unresolvable MX lookup is treated as an invalid address.
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ ok: false, reason: 'method_not_allowed' }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid_email' }, 400);
  }

  const trap = typeof payload.trap === 'string' ? payload.trap : '';
  if (trap) return json({ ok: true }, 200);

  const name  = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const workType = typeof payload.work_type === 'string' ? payload.work_type : null;
  const date = typeof payload.date === 'string' ? payload.date : null;
  const time = typeof payload.time === 'string' ? payload.time : null;
  const budget = typeof payload.budget === 'string' ? payload.budget : null;
  const message = typeof payload.message === 'string' && payload.message.trim() ? payload.message.trim() : null;

  if (!EMAIL_RE.test(email)) return json({ ok: false, reason: 'invalid_email' }, 400);
  if (!(await domainHasMx(email))) return json({ ok: false, reason: 'invalid_email' }, 400);

  // Take the LAST hop of x-forwarded-for: that entry is appended by Supabase's
  // own edge and cannot be spoofed by the client; earlier entries can.
  const xff = req.headers.get('x-forwarded-for');
  let clientIp = 'unknown';
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) clientIp = parts[parts.length - 1];
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const ipHash = await sha256Hex(RATE_SALT + clientIp);
    const emailKey = 'email:' + email.toLowerCase();
    const ipKey = 'ip:' + ipHash;
    const cutoff = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

    const { data: hits, error: rlError } = await sb
      .from('rate_limits')
      .select('key')
      .in('key', [ipKey, emailKey])
      .gt('last_submitted_at', cutoff);

    if (rlError) return json({ ok: false, reason: 'server_error' }, 500);
    if (hits && hits.length) return json({ ok: false, reason: 'rate_limited' }, 429);

    const confirmToken = crypto.randomUUID();

    const { error: insErr } = await sb.from('bookings').insert({
      name,
      email,
      work_type: workType,
      date,
      time,
      budget,
      message,
      confirmed_at: null,
      confirm_token: confirmToken,
    });
    if (insErr) return json({ ok: false, reason: 'server_error' }, 500);

    const nowIso = new Date().toISOString();
    const { error: rlUpsertErr } = await sb.from('rate_limits').upsert([
      { key: ipKey, last_submitted_at: nowIso },
      { key: emailKey, last_submitted_at: nowIso },
    ]);
    if (rlUpsertErr) console.error('rate_limits upsert failed:', rlUpsertErr.message);

    const confirmUrl = `${SUPABASE_URL}/functions/v1/confirm-booking?token=${confirmToken}`;
    const body =
      `<tr><td colspan="2" style="padding:24px 32px 16px">
        <p style="margin:0;color:#141414;font-size:22px;font-weight:600">Hi ${name},</p>
        <p style="margin:12px 0 0;color:#888;font-size:14px;line-height:1.6">You started a booking with Anan. Confirm your email address to send it through.</p>
      </td></tr>` +
      row('Interest', workType ?? 'N/A') +
      row('Date',     date ?? 'TBD') +
      row('Time',     time ?? 'TBD') +
      row('Budget',   budget ?? 'Not specified') +
      `<tr><td colspan="2" style="padding:24px 32px 8px">
        <a href="${confirmUrl}" style="display:inline-block;background:#141414;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:6px">Confirm my booking</a>
      </td></tr>` +
      `<tr><td colspan="2" style="padding:0 32px 24px">
        <p style="margin:0;color:#bbb;font-size:12px;line-height:1.6">If you didn't request this, you can ignore this email and nothing will be sent.</p>
      </td></tr>`;

    const sent = await sendEmail(email, 'Confirm your booking with Anan', wrap('Confirm Your Booking', body));
    if (!sent.ok) return json({ ok: false, reason: 'server_error' }, 500);

    return json({ ok: true }, 200);
  } catch (_) {
    return json({ ok: false, reason: 'server_error' }, 500);
  }
});
