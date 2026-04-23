// netlify/functions/supervision-reminders.mjs
// Scheduled function: runs daily. Emails the registered manager of each home
// when a staff member's next supervision is 7 days or 1 day away.
// Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, REMINDER_FROM_EMAIL

export default async (req, context) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_KEY   = process.env.RESEND_API_KEY;
  const FROM_EMAIL   = process.env.REMINDER_FROM_EMAIL;

  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY || !FROM_EMAIL) {
    return new Response(JSON.stringify({ error: 'Missing required env vars' }), { status: 500 });
  }

  // --- helpers ---
  const sb = async (path, opts = {}) => {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      ...opts,
      headers: {
        apikey: SERVICE_KEY,
        Authorization: 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: opts.method === 'POST' ? 'return=representation' : '',
        ...(opts.headers || {})
      }
    });
    if (!r.ok) throw new Error('SB ' + path + ': ' + r.status + ' ' + await r.text());
    return r.json();
  };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (n) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() + n); return d; };

  const target7 = iso(addDays(7));
  const target1 = iso(addDays(1));
  const targets = [{ date: target7, label: 'in 7 days' }, { date: target1, label: 'tomorrow' }];

  // --- fetch supervisions due on either target date ---
  const inList = '(' + target7 + ',' + target1 + ')';
  const sups = await sb('supervisions?next_supervision_date=in.' + encodeURIComponent(inList) + '&select=id,staff_id,supervision_date,next_supervision_date,conducted_by,notes');

  if (!sups.length) {
    return new Response(JSON.stringify({ ok: true, checked: [target7, target1], reminders_sent: 0, note: 'No supervisions due' }), { status: 200 });
  }

  // --- fetch staff records for all matching supervisions ---
  const staffIds = [...new Set(sups.map(s => s.staff_id))];
  const idsCsv = '(' + staffIds.map(id => '"' + id + '"').join(',') + ')';
  const staff = await sb('staff?id=in.' + encodeURIComponent(idsCsv) + '&select=id,name,loc');

  // --- fetch user_roles to find registered managers per home ---
  const roles = await sb('user_roles?role=in.(registered_manager,rm,admin)&select=email,role,homes,display_name');

  // Case-insensitive home matcher
  const managersForHome = (home) => {
    if (!home) return [];
    const normHome = home.trim().toLowerCase();
    return roles.filter(u => Array.isArray(u.homes) && u.homes.some(h => (h || '').trim().toLowerCase() === normHome));
  };

  // --- send emails via Resend ---
  const sendEmail = async (to, subject, html) => {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
    });
    if (!r.ok) throw new Error('Resend ' + r.status + ' ' + await r.text());
    return r.json();
  };

  let sent = 0;
  const errors = [];
  const results = [];

  for (const sup of sups) {
    const who = staff.find(s => s.id === sup.staff_id);
    if (!who) { errors.push({ sup: sup.id, err: 'staff not found' }); continue; }

    const label = (sup.next_supervision_date === target7) ? 'in 7 days' : 'tomorrow';
    const managers = managersForHome(who.loc);
    if (!managers.length) { errors.push({ sup: sup.id, staff: who.name, home: who.loc, err: 'no manager found for home' }); continue; }

    const humanDate = new Date(sup.next_supervision_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const subject = 'Supervision due ' + label + ' — ' + who.name;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0c1424;">
        <h2 style="color:#0f1c2e;margin:0 0 12px;">Supervision reminder</h2>
        <p style="font-size:15px;">A monthly supervision is due <strong>${label}</strong>:</p>
        <table style="border-collapse:collapse;font-size:14px;margin:12px 0;">
          <tr><td style="padding:6px 12px;color:#64748b;">Staff member</td><td style="padding:6px 12px;font-weight:600;">${who.name}</td></tr>
          <tr><td style="padding:6px 12px;color:#64748b;">Home</td><td style="padding:6px 12px;">${who.loc || '—'}</td></tr>
          <tr><td style="padding:6px 12px;color:#64748b;">Due date</td><td style="padding:6px 12px;">${humanDate}</td></tr>
          <tr><td style="padding:6px 12px;color:#64748b;">Last supervision</td><td style="padding:6px 12px;">${sup.supervision_date || '—'}</td></tr>
        </table>
        <p style="font-size:13px;color:#64748b;margin:16px 0 0;">Log in to TCA HR to record the supervision: <a href="https://app.thecareadvantage.com">app.thecareadvantage.com</a></p>
      </div>
    `;

    for (const mgr of managers) {
      try {
        await sendEmail(mgr.email, subject, html);
        sent++;
        results.push({ to: mgr.email, staff: who.name, home: who.loc, due: sup.next_supervision_date });
      } catch (e) {
        errors.push({ sup: sup.id, to: mgr.email, err: e.message });
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, target7, target1, results, errors }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const config = {
  schedule: '@daily'
};
