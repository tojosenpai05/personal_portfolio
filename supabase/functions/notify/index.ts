import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const ANAN       = 'tojosenpai05@gmail.com';

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; detail: string }> {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Anan <booking@anansportfolio.work>', to, subject, html, reply_to: 'tojosenpai05@gmail.com' }),
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

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const payload = await req.json();
  const table: string = payload.table;
  const record = payload.record;

  if (table === 'bookings') {
    const ownerBody =
      row('Name',     record.name) +
      row('Email',    record.email) +
      row('Interest', record.work_type ?? 'N/A') +
      row('Date',     record.date ?? 'N/A') +
      row('Time',     record.time ?? 'N/A') +
      row('Budget',   record.budget ?? 'Not specified') +
      row('Message',  record.message ?? '&mdash;');

    const owner = await sendEmail(ANAN, `New booking from ${record.name}`, wrap('New Booking', ownerBody));
    if (!owner.ok) return new Response(`Resend error (owner email): ${owner.detail}`, { status: 500 });

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
  } else if (table === 'contact_messages') {
    const contactBody =
      row('Name',    record.name) +
      row('Email',   record.email) +
      row('Message', record.message);

    const contact = await sendEmail(ANAN, `New message from ${record.name}`, wrap('New Message', contactBody));
    if (!contact.ok) return new Response(`Resend error: ${contact.detail}`, { status: 500 });
  } else {
    return new Response('Unknown table', { status: 400 });
  }

  return new Response('OK', { status: 200 });
});
