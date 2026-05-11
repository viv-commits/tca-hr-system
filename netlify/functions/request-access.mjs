// netlify/functions/request-access.mjs
// Public endpoint: accepts a "Request access" submission from the login page.
// Stores it in public.access_requests via the Supabase service role, then emails
// management@thecareadvantage.com via Resend with the details.
//
// Required env vars (already configured in Netlify):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   RESEND_ACCESS_REQUESTS_API_KEY
//
// Optional:
//   ACCESS_REQUESTS_FROM_EMAIL  (defaults to TCA HR <no-reply@thecareadvantage.com>)
//   ACCESS_REQUESTS_TO_EMAIL    (defaults to management@thecareadvantage.com)

const FROM_EMAIL_DEFAULT = 'TCA HR <no-reply@thecareadvantage.com>';
const TO_EMAIL_DEFAULT = 'management@thecareadvantage.com';

function corsHeaders(origin) {
  const allow = origin && /^https?:\/\/([a-z0-9-]+\.)*(thecareadvantage\.com|netlify\.app|localhost(:\d+)?)$/i.test(origin)
    ? origin
    : 'https://app.thecareadvantage.com';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function jsonResponse(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()) && s.length <= 320;
}

async function hashIp(ip) {
  try {
    const data = new TextEncoder().encode('tca-access:' + (ip || ''));
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

export default async (req, context) => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, origin);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_ACCESS_REQUESTS_API_KEY;
  const FROM_EMAIL = process.env.ACCESS_REQUESTS_FROM_EMAIL || FROM_EMAIL_DEFAULT;
  const TO_EMAIL = process.env.ACCESS_REQUESTS_TO_EMAIL || TO_EMAIL_DEFAULT;

  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY) {
    return jsonResponse(500, { error: 'Server is not configured for access requests.' }, origin);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' }, origin);
  }

  // Honeypot: bots will often fill hidden "website" field; drop silently with 200.
  if (body && typeof body.website === 'string' && body.website.trim() !== '') {
    return jsonResponse(200, { ok: true }, origin);
  }

  const full_name = (body.full_name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const organisation = (body.organisation || '').trim();
  const role = (body.role || '').trim();
  const message = (body.message || '').trim();

  if (full_name.length < 2 || full_name.length > 120) {
    return jsonResponse(400, { error: 'Please enter your full name.' }, origin);
  }
  if (!isEmail(email)) {
    return jsonResponse(400, { error: 'Please enter a valid email address.' }, origin);
  }
  if (organisation.length > 200 || role.length > 120 || message.length > 2000) {
    return jsonResponse(400, { error: 'One of the fields is too long.' }, origin);
  }

  // Light rate limiting: cap pending requests per email at 3 in 24h.
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const dupUrl = SUPABASE_URL + '/rest/v1/access_requests'
      + '?select=id&status=eq.pending'
      + '&email=eq.' + encodeURIComponent(email)
      + '&created_at=gte.' + encodeURIComponent(since);
    const dupRes = await fetch(dupUrl, {
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY }
    });
    if (dupRes.ok) {
      const rows = await dupRes.json();
      if (Array.isArray(rows) && rows.length >= 3) {
        return jsonResponse(429, { error: 'You already have a request pending. We will be in touch shortly.' }, origin);
      }
    }
  } catch (e) {
    // Non-fatal — proceed.
  }

  const ip = req.headers.get('x-nf-client-connection-ip')
    || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || '';
  const ip_hash = await hashIp(ip);
  const user_agent = (req.headers.get('user-agent') || '').slice(0, 500);

  const insertPayload = {
    full_name,
    email,
    organisation: organisation || null,
    role: role || null,
    message: message || null,
    user_agent: user_agent || null,
    ip_hash: ip_hash || null
  };

  let inserted = null;
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/access_requests', {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(insertPayload)
    });
    if (!r.ok) {
      console.error('[request-access] Supabase insert failed', r.status, await r.text());
      return jsonResponse(500, { error: 'Could not save your request. Please try again later.' }, origin);
    }
    const rows = await r.json();
    inserted = Array.isArray(rows) ? rows[0] : rows;
  } catch (err) {
    console.error('[request-access] Supabase insert threw', err);
    return jsonResponse(500, { error: 'Could not save your request. Please try again later.' }, origin);
  }

  // Build notification email (string concat to keep things simple).
  try {
    const subject = 'New access request — ' + full_name;
    const supabaseAuthLink = 'https://supabase.com/dashboard/project/vhebrkhdgeiyxkpphlut/auth/users';
    const rowHtml = (label, value) =>
      '<tr><td style="padding:8px 12px;color:#64748b;width:140px;">' + esc(label) + '</td>' +
      '<td style="padding:8px 12px;">' + value + '</td></tr>';
    const html =
      '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f2649;max-width:560px;">' +
      '<h2 style="margin:0 0 12px;color:#1C3D6E;">New access request</h2>' +
      '<p style="font-size:14px;color:#475569;margin:0 0 16px;">Someone has requested access to the TCA HR Compliance System.</p>' +
      '<table style="border-collapse:collapse;font-size:14px;width:100%;">' +
        rowHtml('Name', '<strong>' + esc(full_name) + '</strong>') +
        rowHtml('Email', '<a href="mailto:' + esc(email) + '">' + esc(email) + '</a>') +
        rowHtml('Organisation', esc(organisation) || '—') +
        rowHtml('Role / job title', esc(role) || '—') +
        rowHtml('Message', '<span style="white-space:pre-wrap;">' + (esc(message) || '—') + '</span>') +
        rowHtml('Submitted', esc(new Date((inserted && inserted.created_at) || Date.now()).toUTCString())) +
      '</table>' +
      '<p style="font-size:13px;color:#475569;margin:20px 0 0;">' +
        'To approve: open the <a href="' + supabaseAuthLink + '">Supabase Auth users page</a>, invite ' + esc(email) + ', ' +
        'then add a matching row in <code>user_roles</code> with the correct org/role/homes. ' +
        'Mark the request as <code>approved</code> in <code>access_requests</code> once done.' +
      '</p>' +
      '<p style="font-size:12px;color:#94a3b8;margin:24px 0 0;">Request ID: ' + esc((inserted && inserted.id) || '') + '</p>' +
      '</div>';

    const text = [
      'New access request',
      '',
      'Name:         ' + full_name,
      'Email:        ' + email,
      'Organisation: ' + (organisation || '—'),
      'Role:         ' + (role || '—'),
      'Message:      ' + (message || '—'),
      '',
      'Request ID: ' + ((inserted && inserted.id) || '')
    ].join('\n');

    const er = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject,
        html,
        text
      })
    });
    if (!er.ok) {
      console.error('[request-access] Resend failed', er.status, await er.text());
    }
  } catch (err) {
    console.error('[request-access] Resend threw', err);
  }

  return jsonResponse(200, { ok: true, id: inserted && inserted.id }, origin);
};

export const config = {
  path: '/api/request-access'
};
