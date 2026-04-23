(function () {
  'use strict';
  // TCA Auth Gate — Supabase Auth integration
  // Gates the app until the user is signed in. Session expires on tab close.

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
        '<div class="tca-auth-footer">© The Care Advantage · Secure login</div>' +
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
        // If setSession failed, fall through to login with error
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
    var session = sess && sess.data && sess.data.session;
    if (!session) {
      buildOverlay();
      return;
    }
    await lookupRoleAndHomes(session.user.email);
    var h = document.getElementById('tca-auth-hide'); if (h) h.remove();
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
