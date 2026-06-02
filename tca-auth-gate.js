(function () {
'use strict';
// TCA Auth Gate — Supabase Auth integration
// Gates the app until the user is signed in. Session expires on tab close.
// Also hosts the public "Request access" form (POST /api/request-access).

function extractSupabaseConfig() {
var scripts = document.querySelectorAll('script');
for (var i = 0; i < scripts.length; i++) {
var txt = scripts[i].textContent || '';
if (txt.indexOf('SUPABASE_URL') >= 0 && txt.indexOf('createClient') >= 0) {
var urlM = txt.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
var keyM = txt.match(/(?:SUPABASE_ANON_KEY|SUPABASE_KEY)\s*=\s*['"]([^'"]+)['"]/);
if (urlM && keyM) return { url: urlM[1], key: keyM[1] };
}
}
return null;
}

var cfg = extractSupabaseConfig();
if (!cfg || !window.supabase || !window.supabase.createClient) {
console.error('[auth-gate] Missing Supabase config or library; cannot gate app.');
return;
}
var SB_URL = cfg.url;
var SB_KEY = cfg.key;

var sb = window.supabase.createClient(SB_URL, SB_KEY, {
auth: {
storage: window.sessionStorage,
autoRefreshToken: true,
persistSession: true,
detectSessionInUrl: true
}
});
window.TCA_SB = sb;

var STYLE = [
'@import url(https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap);',
'#tca-auth-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;background:#f7f8fb;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1C3D6E}',
'#tca-auth-overlay .tca-auth-left{flex:1;display:flex;align-items:center;justify-content:center;padding:48px 32px;background:#fff;position:relative;z-index:2;overflow-y:auto}',
'#tca-auth-overlay .tca-auth-right{flex:1.1;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 20% 20%,#254b7f 0%,#1C3D6E 45%,#0f2649 100%);color:#fff;padding:40px;position:relative;overflow:hidden}',
'#tca-auth-overlay .tca-auth-right::before{content:"";position:absolute;width:720px;height:720px;border-radius:50%;border:1px solid rgba(255,255,255,0.08);top:-180px;right:-180px;pointer-events:none}',
'#tca-auth-overlay .tca-auth-right::after{content:"";position:absolute;width:420px;height:420px;border-radius:50%;border:1px solid rgba(255,255,255,0.06);bottom:-120px;left:-120px;pointer-events:none}',
'#tca-auth-overlay .tca-auth-card{width:100%;max-width:420px}',
'#tca-auth-overlay .tca-auth-logo-img{display:block;width:180px;height:auto;margin:0 0 40px;user-select:none}',
'#tca-auth-overlay .tca-auth-big-logo-img{display:block;width:300px;max-width:70%;height:auto;margin:0 auto 24px;user-select:none;position:relative;z-index:1;background:#fff;padding:28px 36px;border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,0.25),0 0 0 1px rgba(255,255,255,0.05);box-sizing:border-box}',
'#tca-auth-overlay h1{font-size:12px;font-weight:600;color:#6b7b95;margin:0 0 6px;letter-spacing:1.2px;text-transform:uppercase}',
'#tca-auth-overlay h2{font-size:30px;font-weight:700;color:#0f2649;margin:0 0 28px;letter-spacing:-0.5px}',
'#tca-auth-overlay label{display:block;font-size:13px;font-weight:500;color:#475569;margin:14px 0 6px}',
'#tca-auth-overlay input[type=email],#tca-auth-overlay input[type=password],#tca-auth-overlay input[type=text],#tca-auth-overlay textarea{width:100%;padding:12px 14px;font-size:15px;font-family:inherit;color:#0f2649;border:1.5px solid #e2e8f0;border-radius:10px;background:#f8fafc;box-sizing:border-box;transition:border-color .15s,box-shadow .15s,background .15s}',
'#tca-auth-overlay textarea{resize:vertical;min-height:88px;line-height:1.4}',
'#tca-auth-overlay input[type=email]:focus,#tca-auth-overlay input[type=password]:focus,#tca-auth-overlay input[type=text]:focus,#tca-auth-overlay textarea:focus{outline:none;border-color:#1C3D6E;background:#fff;box-shadow:0 0 0 4px rgba(28,61,110,0.08)}',
'#tca-auth-overlay button.tca-auth-primary{width:100%;margin-top:22px;padding:13px;font-size:15px;font-weight:600;font-family:inherit;color:#fff;background:#1C3D6E;border:none;border-radius:10px;cursor:pointer;transition:background .15s,transform .1s,box-shadow .15s;letter-spacing:0.2px;box-shadow:0 2px 6px rgba(28,61,110,0.15)}',
'#tca-auth-overlay button.tca-auth-primary:hover{background:#254b7f;box-shadow:0 4px 12px rgba(28,61,110,0.25)}',
'#tca-auth-overlay button.tca-auth-primary:active{transform:translateY(1px)}',
'#tca-auth-overlay button.tca-auth-primary:disabled{background:#94a3b8;cursor:not-allowed;box-shadow:none}',
'#tca-auth-overlay .tca-auth-forgot{display:block;text-align:center;margin-top:14px;font-size:13px;font-weight:500;color:#1C3D6E;text-decoration:none;cursor:pointer;background:none;border:none;width:100%;padding:8px;font-family:inherit}',
'#tca-auth-overlay .tca-auth-forgot:hover{text-decoration:underline}',
'#tca-auth-overlay .tca-auth-divider{display:flex;align-items:center;gap:12px;margin:18px 0 6px;color:#94a3b8;font-size:12px;font-weight:500;letter-spacing:0.6px;text-transform:uppercase}',
'#tca-auth-overlay .tca-auth-divider::before,#tca-auth-overlay .tca-auth-divider::after{content:"";flex:1;height:1px;background:#e2e8f0}',
'#tca-auth-overlay .tca-auth-request{display:block;width:100%;text-align:center;margin-top:6px;padding:12px;font-size:14px;font-weight:600;font-family:inherit;color:#1C3D6E;background:#fff;border:1.5px solid #cbd5e1;border-radius:10px;cursor:pointer;transition:background .15s,border-color .15s,box-shadow .15s}',
'#tca-auth-overlay .tca-auth-request:hover{background:#f1f5f9;border-color:#94a3b8;box-shadow:0 1px 3px rgba(15,38,73,0.08)}',
'#tca-auth-overlay .tca-auth-request small{display:block;font-size:11px;font-weight:500;color:#64748b;margin-top:2px;letter-spacing:0.2px}',
'#tca-auth-overlay .tca-auth-back{display:inline-flex;align-items:center;gap:6px;margin:0 0 18px;font-size:13px;font-weight:500;color:#475569;background:none;border:none;padding:0;cursor:pointer;font-family:inherit}',
'#tca-auth-overlay .tca-auth-back:hover{color:#1C3D6E;text-decoration:underline}',
'#tca-auth-overlay .tca-auth-error{color:#991b1b;background:#fef2f2;border:1px solid #fecaca;padding:10px 12px;border-radius:8px;margin-bottom:16px;font-size:13px;line-height:1.4}',
'#tca-auth-overlay .tca-auth-info{color:#075985;background:#eff6ff;border:1px solid #bfdbfe;padding:10px 12px;border-radius:8px;margin-bottom:16px;font-size:13px;line-height:1.4}',
'#tca-auth-overlay .tca-auth-success{color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;padding:14px 16px;border-radius:10px;margin:16px 0;font-size:14px;line-height:1.5}',
'#tca-auth-overlay .tca-auth-success strong{display:block;margin-bottom:4px;font-size:15px;color:#064e3b}',
'#tca-auth-overlay .tca-auth-help{font-size:12px;color:#94a3b8;margin-top:4px;line-height:1.4}',
'#tca-auth-overlay .tca-auth-honeypot{position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0}',
'#tca-auth-overlay .tca-auth-footer{margin-top:32px;font-size:11px;color:#94a3b8;text-align:center;letter-spacing:0.3px}',
'#tca-auth-overlay .tca-auth-hero{text-align:center;position:relative;z-index:1}',
'#tca-auth-overlay .tca-auth-hero-title{font-size:20px;font-weight:500;opacity:0.92;letter-spacing:0.3px;margin-top:8px}',
'#tca-auth-overlay .tca-auth-hero-sub{font-size:13px;opacity:0.6;margin-top:20px;letter-spacing:0.8px;text-transform:uppercase}',
'@media(max-width:900px){#tca-auth-overlay .tca-auth-right{display:none}#tca-auth-overlay .tca-auth-left{flex:1;padding:32px 24px}}'
].join('');

function buildOverlay() {
var s = document.createElement('style'); s.textContent = STYLE; document.head.appendChild(s);
var o = document.createElement('div'); o.id = 'tca-auth-overlay';
o.innerHTML =
'<div class="tca-auth-left"><div class="tca-auth-card">' +
'<img class="tca-auth-logo-img" src="/tca-logo.png" alt="The Care Advantage" />' +
'<h1>Welcome back</h1>' +
'<h2>Sign in to your account</h2>' +
'<div id="tca-auth-msg" style="display:none"></div>' +
'<form id="tca-auth-form" autocomplete="on">' +
'<label for="tca-auth-email">Email address</label>' +
'<input type="email" id="tca-auth-email" required autocomplete="email" placeholder="you@example.com" />' +
'<label for="tca-auth-pass">Password</label>' +
'<input type="password" id="tca-auth-pass" required autocomplete="current-password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />' +
'<button type="submit" class="tca-auth-primary" id="tca-auth-submit">Sign in</button>' +
'</form>' +
'<button class="tca-auth-forgot" id="tca-auth-forgot-btn" type="button">Forgot your password?</button>' +
'<div class="tca-auth-divider">New to TCA?</div>' +
'<button class="tca-auth-request" id="tca-auth-request-btn" type="button">Request access<small>We will email management to set up your account</small></button>' +
'<div class="tca-auth-footer">\u00A9 The Care Advantage \u00B7 HR Compliance System</div>' +
'</div></div>' +
'<div class="tca-auth-right">' +
'<div class="tca-auth-hero">' +
'<img class="tca-auth-big-logo-img" src="/tca-logo.png" alt="The Care Advantage" />' +
'<div class="tca-auth-hero-sub">HR Compliance System</div>' +
'</div>' +
'</div>';
document.body.appendChild(o);

var form = o.querySelector('#tca-auth-form');
var emailEl = o.querySelector('#tca-auth-email');
var passEl = o.querySelector('#tca-auth-pass');
var btn = o.querySelector('#tca-auth-submit');
var msg = o.querySelector('#tca-auth-msg');
var forgot = o.querySelector('#tca-auth-forgot-btn');
var requestBtn = o.querySelector('#tca-auth-request-btn');

function showMsg(text, type) {
msg.style.display = 'block';
msg.className = type === 'info' ? 'tca-auth-info' : 'tca-auth-error';
msg.textContent = text;
}

form.addEventListener('submit', async function (e) {
e.preventDefault();
msg.style.display = 'none';
btn.disabled = true; btn.textContent = 'Signing in\u2026';
try {
var r = await sb.auth.signInWithPassword({ email: emailEl.value.trim(), password: passEl.value });
if (r.error) { showMsg(r.error.message || 'Login failed', 'error'); btn.disabled = false; btn.textContent = 'Log in'; return; }
showMsg('Signed in. Loading\u2026', 'info');
setTimeout(function () { location.reload(); }, 400);
} catch (err) {
showMsg(err.message || 'Unexpected error', 'error');
btn.disabled = false; btn.textContent = 'Log in';
}
});

forgot.addEventListener('click', async function () {
var email = (emailEl.value || '').trim();
if (!email) { showMsg('Enter your email above, then click "Forgot your password?"', 'error'); emailEl.focus(); return; }
msg.style.display = 'none';
forgot.disabled = true;
try {
var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
if (r.error) showMsg(r.error.message || 'Could not send reset email', 'error');
else showMsg('Password reset email sent to ' + email + '. Check your inbox.', 'info');
} catch (err) { showMsg(err.message || 'Unexpected error', 'error'); }
forgot.disabled = false;
});

requestBtn.addEventListener('click', function () {
var existing = document.getElementById('tca-auth-overlay');
if (existing) existing.remove();
buildRequestAccessOverlay();
});

emailEl.focus();
}

function buildRequestAccessOverlay() {
var s = document.createElement('style'); s.textContent = STYLE; document.head.appendChild(s);
var o = document.createElement('div'); o.id = 'tca-auth-overlay';
o.innerHTML =
'<div class="tca-auth-left"><div class="tca-auth-card">' +
'<img class="tca-auth-logo-img" src="/tca-logo.png" alt="The Care Advantage" />' +
'<button class="tca-auth-back" id="tca-req-back" type="button">&larr; Back to sign in</button>' +
'<h1>Get started</h1>' +
'<h2>Request access</h2>' +
'<div id="tca-req-msg" style="display:none"></div>' +
'<form id="tca-req-form" autocomplete="on" novalidate>' +
'<label for="tca-req-name">Full name</label>' +
'<input type="text" id="tca-req-name" required maxlength="120" autocomplete="name" placeholder="Your full name" />' +
'<label for="tca-req-email">Work email address</label>' +
'<input type="email" id="tca-req-email" required maxlength="320" autocomplete="email" placeholder="you@yourcompany.com" />' +
'<label for="tca-req-org">Organisation</label>' +
'<input type="text" id="tca-req-org" maxlength="200" autocomplete="organization" placeholder="Which care provider you work for" />' +
'<label for="tca-req-role">Role</label>' +
'<select id="tca-req-role" required>' +
'<option value="" disabled selected>Select your role…</option>' +
'<option value="Registered Manager">Registered Manager</option>' +
'<option value="Deputy Manager">Deputy Manager</option>' +
'<option value="Senior Support Worker">Senior Support Worker</option>' +
'<option value="Support Worker">Support Worker</option>' +
'<option value="Residential Care Worker">Residential Care Worker</option>' +
'</select>' +
'<label for="tca-req-msg-input">Anything we should know? <span style="color:#94a3b8;font-weight:400">(optional)</span></label>' +
'<textarea id="tca-req-msg-input" maxlength="2000" placeholder="Why you need access, who referred you, etc."></textarea>' +
'<div class="tca-auth-honeypot" aria-hidden="true">' +
'<label for="tca-req-website">Website (leave blank)</label>' +
'<input type="text" id="tca-req-website" tabindex="-1" autocomplete="off" />' +
'</div>' +
'<button type="submit" class="tca-auth-primary" id="tca-req-submit">Submit request</button>' +
'<div class="tca-auth-help" style="margin-top:14px;text-align:center">Management reviews requests within one business day. You will receive an email once your account is set up.</div>' +
'</form>' +
'<div class="tca-auth-footer">\u00A9 The Care Advantage \u00B7 HR Compliance System</div>' +
'</div></div>' +
'<div class="tca-auth-right">' +
'<div class="tca-auth-hero">' +
'<img class="tca-auth-big-logo-img" src="/tca-logo.png" alt="The Care Advantage" />' +
'<div class="tca-auth-hero-sub">HR Compliance System</div>' +
'</div>' +
'</div>';
document.body.appendChild(o);

var form = o.querySelector('#tca-req-form');
var nameEl = o.querySelector('#tca-req-name');
var emailEl = o.querySelector('#tca-req-email');
var orgEl = o.querySelector('#tca-req-org');
var roleEl = o.querySelector('#tca-req-role');
var msgEl = o.querySelector('#tca-req-msg-input');
var honeyEl = o.querySelector('#tca-req-website');
var btn = o.querySelector('#tca-req-submit');
var msg = o.querySelector('#tca-req-msg');
var back = o.querySelector('#tca-req-back');

function showMsg(text, type) {
msg.style.display = 'block';
msg.className = type === 'info' ? 'tca-auth-info' : 'tca-auth-error';
msg.textContent = text;
}

back.addEventListener('click', function () {
var existing = document.getElementById('tca-auth-overlay');
if (existing) existing.remove();
buildOverlay();
});

function isEmail(s) {
return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || '').trim());
}

form.addEventListener('submit', async function (e) {
e.preventDefault();
msg.style.display = 'none';
var full_name = (nameEl.value || '').trim();
var email = (emailEl.value || '').trim();
var organisation = (orgEl.value || '').trim();
var role = (roleEl.value || '').trim();
var message = (msgEl.value || '').trim();

if (full_name.length < 2) { showMsg('Please enter your full name.', 'error'); nameEl.focus(); return; }
if (!isEmail(email)) { showMsg('Please enter a valid email address.', 'error'); emailEl.focus(); return; }
if (!role) { showMsg('Please choose your role.', 'error'); roleEl.focus(); return; }

btn.disabled = true; btn.textContent = 'Sending\u2026';
try {
var r = await fetch('/api/request-access', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
full_name: full_name,
email: email,
organisation: organisation,
role: role,
message: message,
website: honeyEl ? (honeyEl.value || '') : ''
})
});
var data = null;
try { data = await r.json(); } catch (_) { data = null; }
if (!r.ok) {
var errMsg = (data && data.error) || 'Could not submit your request. Please try again.';
showMsg(errMsg, 'error');
btn.disabled = false; btn.textContent = 'Submit request';
return;
}
// Replace form area with a clean success message.
var card = o.querySelector('.tca-auth-card');
if (card) {
card.innerHTML =
'<img class="tca-auth-logo-img" src="/tca-logo.png" alt="The Care Advantage" />' +
'<h1>Thanks for your interest</h1>' +
'<h2>Request received</h2>' +
'<div class="tca-auth-success">' +
'<strong>We have it from here.</strong>' +
'A member of TCA management will review your request and email you at <strong>' + email.replace(/[<>&"]/g, '') + '</strong> within one business day to set up your account.' +
'</div>' +
'<button class="tca-auth-request" id="tca-req-done" type="button">Back to sign in</button>' +
'<div class="tca-auth-footer">\u00A9 The Care Advantage \u00B7 HR Compliance System</div>';
var done = card.querySelector('#tca-req-done');
if (done) done.addEventListener('click', function () {
var existing = document.getElementById('tca-auth-overlay');
if (existing) existing.remove();
buildOverlay();
});
}
} catch (err) {
showMsg(err.message || 'Network error. Please try again.', 'error');
btn.disabled = false; btn.textContent = 'Submit request';
}
});

nameEl.focus();
}

function showLoggingOut() {
var s = document.createElement('style');
s.textContent = '#tca-auth-logout{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111827;flex-direction:column;gap:16px}#tca-auth-logout .l{font-size:32px;font-weight:700}#tca-auth-logout .bar{width:240px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden}#tca-auth-logout .bar>div{height:100%;background:#1C3D6E;width:30%;animation:tca-bar 1s linear infinite}@keyframes tca-bar{0%{margin-left:-30%}100%{margin-left:100%}}';
document.head.appendChild(s);
var d = document.createElement('div'); d.id = 'tca-auth-logout';
d.innerHTML = '<div class="l">Logging out\u2026</div><div class="bar"><div></div></div>';
document.body.appendChild(d);
}

async function attachLogoutHook() {
document.addEventListener('click', async function (e) {
var el = e.target;
for (var i = 0; i < 4 && el; i++, el = el.parentElement) {
var t = (el.innerText || '').trim().toLowerCase();
if (t === 'sign out' || t === 'log out' || t === 'logout') {
e.preventDefault(); e.stopPropagation();
showLoggingOut();
try { await sb.auth.signOut(); } catch (err) { console.warn(err); }
sessionStorage.clear();
setTimeout(function () { location.reload(); }, 800);
return;
}
}
}, true);
}

async function lookupRoleAndHomes(email) {
try {
var r = await fetch(SB_URL + '/rest/v1/user_roles?select=role,homes,display_name&email=eq.' + encodeURIComponent(email), {
headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
});
var rows = await r.json();
if (rows && rows.length) {
var row = rows[0];
var role = (row.role || '').toLowerCase();
if (role === 'admin') window.USER_ROLE = 'admin';
else if (role === 'registered_manager' || role === 'rm' || role === 'deputy_manager') window.USER_ROLE = 'manager';
else window.USER_ROLE = 'readonly';
window.USER_HOMES = Array.isArray(row.homes) ? row.homes : [];
window.USER_DISPLAY_NAME = row.display_name || email;
} else {
window.USER_ROLE = 'readonly';
window.USER_HOMES = [];
window.USER_DISPLAY_NAME = email;
}
} catch (err) {
console.warn('[auth-gate] role lookup failed:', err);
window.USER_ROLE = 'readonly';
window.USER_HOMES = [];
}
}

function __tcaParseHash() {
try {
var h = (window.location.hash || '').replace(/^#/, '');
if (!h) return { type: 'none', params: {} };
var params = {};
h.split('&').forEach(function (pair) {
var eq = pair.indexOf('=');
if (eq > 0) params[decodeURIComponent(pair.substring(0, eq))] = decodeURIComponent(pair.substring(eq + 1));
});
if (params.error || params.error_code || params.error_description) return { type: 'error', params: params };
if (params.type === 'recovery' && params.access_token) return { type: 'recovery', params: params };
return { type: 'none', params: params };
} catch (err) { return { type: 'none', params: {} }; }
}

function __tcaClearHash() {
try {
if (window.history && window.history.replaceState) {
window.history.replaceState(null, '', window.location.pathname + window.location.search);
} else {
window.location.hash = '';
}
} catch (err) { /* ignore */ }
}

function buildResetOverlay() {
var s = document.createElement('style'); s.textContent = STYLE; document.head.appendChild(s);
var o = document.createElement('div'); o.id = 'tca-auth-overlay';
o.innerHTML =
'<div class="tca-auth-left"><div class="tca-auth-card">' +
'<div class="tca-auth-logo">TCA</div>' +
'<div class="tca-auth-welcome">SET A NEW PASSWORD</div>' +
'<h1 class="tca-auth-title">Reset password</h1>' +
'<div id="tca-auth-msg" class="tca-auth-info" style="display:none"></div>' +
'<form id="tca-auth-form" autocomplete="off">' +
'<label class="tca-auth-label" for="tca-reset-pass">New password</label>' +
'<input id="tca-reset-pass" type="password" minlength="8" required autocomplete="new-password" />' +
'<label class="tca-auth-label" for="tca-reset-pass2">Confirm new password</label>' +
'<input id="tca-reset-pass2" type="password" minlength="8" required autocomplete="new-password" />' +
'<button id="tca-auth-submit" type="submit">Update password</button>' +
'</form>' +
'<div class="tca-auth-footer">\u00A9 The Care Advantage \u00B7 Secure login</div>' +
'</div></div>' +
'<div class="tca-auth-right"><div class="tca-auth-big-logo">TCA</div>' +
'<div class="tca-auth-tagline">HR Compliance System</div>' +
'</div>';
document.body.appendChild(o);
var form = o.querySelector('#tca-auth-form');
var p1 = o.querySelector('#tca-reset-pass');
var p2 = o.querySelector('#tca-reset-pass2');
var btn = o.querySelector('#tca-auth-submit');
var msg = o.querySelector('#tca-auth-msg');
function showMsg(text, type) {
msg.style.display = 'block';
msg.className = type === 'info' ? 'tca-auth-info' : 'tca-auth-error';
msg.textContent = text;
}
form.addEventListener('submit', async function (e) {
e.preventDefault();
msg.style.display = 'none';
if (p1.value.length < 8) { showMsg('Password must be at least 8 characters.', 'error'); return; }
if (p1.value !== p2.value) { showMsg('Passwords do not match.', 'error'); return; }
btn.disabled = true; btn.textContent = 'Updating\u2026';
try {
var r = await sb.auth.updateUser({ password: p1.value });
if (r.error) {
showMsg(r.error.message || 'Could not update password. Request a new reset link.', 'error');
btn.disabled = false; btn.textContent = 'Update password';
return;
}
showMsg('Password updated. Signing you in\u2026', 'info');
setTimeout(function () { __tcaClearHash(); location.reload(); }, 900);
} catch (err) {
showMsg(err.message || 'Unexpected error', 'error');
btn.disabled = false; btn.textContent = 'Update password';
}
});
p1.focus();
}

async function boot() {
var hideStyle = document.createElement('style');
hideStyle.id = 'tca-auth-hide';
hideStyle.textContent = 'body>*:not(#tca-auth-overlay):not(#tca-auth-logout){visibility:hidden!important}';
document.head.appendChild(hideStyle);

// Handle password-reset email link and auth errors in URL hash
var __hashInfo = __tcaParseHash();
if (__hashInfo.type === 'recovery') {
try {
var setR = await sb.auth.setSession({ access_token: __hashInfo.params.access_token, refresh_token: __hashInfo.params.refresh_token || '' });
__tcaClearHash();
if (!setR.error) {
var h0 = document.getElementById('tca-auth-hide'); if (h0) h0.remove();
buildResetOverlay();
return;
}
buildOverlay();
try {
var ov0 = document.getElementById('tca-auth-overlay');
var msg0 = ov0 && ov0.querySelector('#tca-auth-msg');
if (msg0) { msg0.style.display = 'block'; msg0.className = 'tca-auth-error'; msg0.textContent = 'That reset link is no longer valid. Please request a new one below.'; }
} catch(e){}
return;
} catch (err) {
__tcaClearHash();
buildOverlay();
return;
}
}
if (__hashInfo.type === 'error') {
__tcaClearHash();
buildOverlay();
try {
var ov = document.getElementById('tca-auth-overlay');
var msgEl = ov && ov.querySelector('#tca-auth-msg');
if (msgEl) {
msgEl.style.display = 'block';
msgEl.className = 'tca-auth-error';
var code = __hashInfo.params.error_code || __hashInfo.params.error || '';
if (code.indexOf('expired') >= 0 || code === 'access_denied') {
msgEl.textContent = 'That password reset link has expired or was already used. Request a new one below.';
} else {
msgEl.textContent = (__hashInfo.params.error_description || 'Sign-in error. Please try again.').replace(/\+/g, ' ');
}
}
} catch(e){}
return;
}

var sess = await sb.auth.getSession();
if (sess && sess.error) {
// Clear any corrupted stored session before showing the login form
try { await sb.auth.signOut(); } catch(_) {}
sessionStorage.clear();
buildOverlay();
var ov = document.getElementById('tca-auth-overlay');
var msgEl = ov && ov.querySelector('#tca-auth-msg');
if (msgEl) { msgEl.style.display = 'block'; msgEl.className = 'tca-auth-error'; msgEl.textContent = sess.error.message || 'Session error — please sign in again.'; }
return;
}
var session = sess && sess.data && sess.data.session;
if (!session) {
buildOverlay();
return;
}
await lookupRoleAndHomes(session.user.email);
var h = document.getElementById('tca-auth-hide'); if (h) h.remove();
      if (window.showPage) showPage('dashboard');
attachLogoutHook();

sb.auth.onAuthStateChange(function (evt) {
if (evt === 'SIGNED_OUT' || evt === 'TOKEN_REFRESHED_FAILED') {
location.reload();
}
});
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
