(function () {
  'use strict';
  // TCA Auth Gate — Supabase Auth integration
  // Gates the app until the user is signed in. Session expires on tab close.

  var SB_URL = window.SUPABASE_URL;
  var SB_KEY = window.SUPABASE_KEY;
  if (!SB_URL || !SB_KEY || !window.supabase || !window.supabase.createClient) {
    console.error('[auth-gate] Missing Supabase globals; cannot gate app.');
    return;
  }

  // Use sessionStorage so closing the tab = logout
  var sb = window.supabase.createClient(SB_URL, SB_KEY, {
    auth: {
      storage: window.sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  window.TCA_SB = sb;

  // --- UI ---------------------------------------------------------------
  var STYLE = [
    '#tca-auth-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
    '#tca-auth-overlay .tca-auth-left{flex:1;display:flex;align-items:center;justify-content:center;padding:40px;background:#fff}',
    '#tca-auth-overlay .tca-auth-right{flex:1;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f766e 0%,#134e4a 100%);color:#fff;padding:40px}',
    '#tca-auth-overlay .tca-auth-card{width:100%;max-width:380px}',
    '#tca-auth-overlay .tca-auth-logo{width:72px;height:72px;border-radius:16px;background:#0f766e;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:28px;margin-bottom:32px;letter-spacing:1px}',
    '#tca-auth-overlay h1{font-size:14px;font-weight:500;color:#6b7280;margin:0 0 4px;letter-spacing:0.5px;text-transform:uppercase}',
    '#tca-auth-overlay h2{font-size:28px;font-weight:700;color:#111827;margin:0 0 32px}',
    '#tca-auth-overlay label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px}',
    '#tca-auth-overlay input[type=email],#tca-auth-overlay input[type=password]{width:100%;padding:11px 14px;font-size:15px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:16px;background:#f9fafb;box-sizing:border-box;transition:border-color .15s}',
    '#tca-auth-overlay input[type=email]:focus,#tca-auth-overlay input[type=password]:focus{outline:none;border-color:#0f766e;background:#fff;box-shadow:0 0 0 3px rgba(15,118,110,0.1)}',
    '#tca-auth-overlay button.tca-auth-primary{width:100%;padding:12px;font-size:15px;font-weight:600;color:#fff;background:#0f766e;border:none;border-radius:8px;cursor:pointer;transition:background .15s}',
    '#tca-auth-overlay button.tca-auth-primary:hover{background:#0d5d56}',
    '#tca-auth-overlay button.tca-auth-primary:disabled{background:#9ca3af;cursor:not-allowed}',
    '#tca-auth-overlay .tca-auth-forgot{display:block;text-align:center;margin-top:14px;font-size:13px;color:#0f766e;text-decoration:none;cursor:pointer;background:none;border:none;width:100%;padding:6px}',
    '#tca-auth-overlay .tca-auth-forgot:hover{text-decoration:underline}',
    '#tca-auth-overlay .tca-auth-error{color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;padding:10px 12px;border-radius:6px;font-size:13px;margin-bottom:14px}',
    '#tca-auth-overlay .tca-auth-info{color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;padding:10px 12px;border-radius:6px;font-size:13px;margin-bottom:14px}',
    '#tca-auth-overlay .tca-auth-footer{margin-top:28px;font-size:11px;color:#9ca3af;text-align:center}',
    '#tca-auth-overlay .tca-auth-big-logo{font-size:64px;font-weight:700;letter-spacing:2px;margin-bottom:16px}',
    '#tca-auth-overlay .tca-auth-tagline{font-size:16px;opacity:0.9;max-width:320px;text-align:center;line-height:1.5}',
    '@media(max-width:900px){#tca-auth-overlay .tca-auth-right{display:none}}'
  ].join('');

  function buildOverlay() {
    var s = document.createElement('style'); s.textContent = STYLE; document.head.appendChild(s);
    var o = document.createElement('div'); o.id = 'tca-auth-overlay';
    o.innerHTML =
      '<div class="tca-auth-left"><div class="tca-auth-card">' +
        '<div class="tca-auth-logo">TCA</div>' +
        '<h1>Welcome back</h1>' +
        '<h2>Log in</h2>' +
        '<div id="tca-auth-msg" style="display:none"></div>' +
        '<form id="tca-auth-form" autocomplete="on">' +
          '<label for="tca-auth-email">Email</label>' +
          '<input type="email" id="tca-auth-email" required autocomplete="email" />' +
          '<label for="tca-auth-pass">Password</label>' +
          '<input type="password" id="tca-auth-pass" required autocomplete="current-password" />' +
          '<button type="submit" class="tca-auth-primary" id="tca-auth-submit">Log in</button>' +
        '</form>' +
        '<button class="tca-auth-forgot" id="tca-auth-forgot-btn" type="button">Forgot your password?</button>' +
        '<div class="tca-auth-footer">\u00A9 The Care Advantage \u00B7 Secure login</div>' +
      '</div></div>' +
      '<div class="tca-auth-right">' +
        '<div style="text-align:center">' +
          '<div class="tca-auth-big-logo">TCA</div>' +
          '<div class="tca-auth-tagline">HR Compliance System</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(o);

    var form = o.querySelector('#tca-auth-form');
    var emailEl = o.querySelector('#tca-auth-email');
    var passEl = o.querySelector('#tca-auth-pass');
    var btn = o.querySelector('#tca-auth-submit');
    var msg = o.querySelector('#tca-auth-msg');
    var forgot = o.querySelector('#tca-auth-forgot-btn');

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
        // Success: reload so the app boots with session in place
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

    emailEl.focus();
  }

  function showLoggingOut() {
    var s = document.createElement('style');
    s.textContent = '#tca-auth-logout{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111827;flex-direction:column;gap:16px}#tca-auth-logout .l{font-size:32px;font-weight:700}#tca-auth-logout .bar{width:240px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden}#tca-auth-logout .bar>div{height:100%;background:#0f766e;width:30%;animation:tca-bar 1s linear infinite}@keyframes tca-bar{0%{margin-left:-30%}100%{margin-left:100%}}';
    document.head.appendChild(s);
    var d = document.createElement('div'); d.id = 'tca-auth-logout';
    d.innerHTML = '<div class="l">Logging out\u2026</div><div class="bar"><div></div></div>';
    document.body.appendChild(d);
  }

  async function attachLogoutHook() {
    // Listen for any click on an element whose text contains "Sign out" / "Log out" / "Logout"
    document.addEventListener('click', async function (e) {
      var el = e.target;
      for (var i = 0; i < 4 && el; i++, el = el.parentElement) {
        var t = (el.innerText || '').trim().toLowerCase();
        if (t === 'sign out' || t === 'log out' || t === 'logout' || t === 'sign out of tca hr compliance system?') {
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
        // Map DB role values to legacy role strings used in index.html
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

  async function boot() {
    // Hide body until we know the session state
    var hideStyle = document.createElement('style');
    hideStyle.id = 'tca-auth-hide';
    hideStyle.textContent = 'body>*:not(#tca-auth-overlay):not(#tca-auth-logout){visibility:hidden!important}';
    document.head.appendChild(hideStyle);

    var sess = await sb.auth.getSession();
    var session = sess && sess.data && sess.data.session;
    if (!session) {
      buildOverlay();
      return; // body stays hidden; login overlay visible
    }
    // Session exists — look up role, reveal app
    await lookupRoleAndHomes(session.user.email);
    var h = document.getElementById('tca-auth-hide'); if (h) h.remove();
    attachLogoutHook();

    // Auto sign-out when token expires
    sb.auth.onAuthStateChange(function (evt) {
      if (evt === 'SIGNED_OUT' || evt === 'TOKEN_REFRESHED_FAILED') {
        location.reload();
      }
    });
  }

  // Boot ASAP
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
