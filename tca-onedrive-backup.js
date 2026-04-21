// ============================================================
// TCA HR Compliance — OneDrive Weekly Backup Module
// ============================================================
// HOW IT WORKS:
//   1. User clicks "Connect OneDrive" once → signs in via Microsoft
//   2. A token is stored in localStorage
//   3. Every time the app loads, it checks if a weekly backup is due
//   4. If yes, it exports all Supabase tables as CSV and uploads to
//      OneDrive → TCA HR Backups / YYYY-MM-DD / *.csv
//   5. A small status badge shows the last backup time
//
// SETUP (one-time, 5 minutes):
//   Step 1: Go to https://portal.azure.com → App registrations → New registration
//           Name: "TCA HR Backup"
//           Supported account types: "Accounts in any organizational directory and personal"
//           Redirect URI: Web → https://app.thecareadvantage.com/app.html
//           Click Register. Copy the "Application (client) ID"
//   Step 2: In the app registration → API permissions → Add permission
//           → Microsoft Graph → Delegated → Files.ReadWrite → Add
//           Click "Grant admin consent" if available
//   Step 3: Paste your Client ID into ONEDRIVE_CLIENT_ID below
//   Step 4: Add the <script> and UI snippet (at the bottom of this file)
//           into your app.html before </body>
// ============================================================

const ONEDRIVE_CLIENT_ID = '12d06007-d01b-422b-a87e-e5126bee171b';
const ONEDRIVE_REDIRECT_URI = 'https://app.thecareadvantage.com/app.html';
const ONEDRIVE_SCOPES = 'Files.ReadWrite offline_access User.Read';
const BACKUP_FOLDER = 'TCA HR Backups';
const BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LAST_BACKUP_KEY = 'tca_last_onedrive_backup';
const TOKEN_KEY = 'tca_onedrive_token';
const TOKEN_EXPIRY_KEY = 'tca_onedrive_token_expiry';

// ── Supabase config (already set in your app — adjust if needed) ──
// These are read from window.SUPABASE_URL / window.SUPABASE_KEY
// which your app already defines. If not, set them here:
// const SUPABASE_URL = 'https://vhebrkhdgeiyxkpphlut.supabase.co';
// const SUPABASE_KEY = 'YOUR_ANON_KEY';

// ─────────────────────────────────────────
// AUTH — Microsoft OAuth2 PKCE flow
// ─────────────────────────────────────────

async function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return { verifier, challenge };
}

async function connectOneDrive() {
  const { verifier, challenge } = await generatePKCE();
  localStorage.setItem('pkce_verifier', verifier);

  const params = new URLSearchParams({
    client_id: ONEDRIVE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: ONEDRIVE_REDIRECT_URI,
    scope: ONEDRIVE_SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    response_mode: 'query',
    state: 'onedrive_backup'
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;

  // Use popup window to avoid full page reload losing the auth code
  const popup = window.open(authUrl, 'onedrive_auth', 'width=500,height=650,left=200,top=100');

  showBackupNotification('🔐 Sign in to Microsoft in the popup window…', 'info');

  // Poll for popup to redirect back with auth code
  const poll = setInterval(async () => {
    try {
      if (!popup || popup.closed) {
        clearInterval(poll);
        showBackupNotification('⚠️ Popup was closed. Please try again.', 'warning');
        return;
      }
      let popupUrl = '';
      try { popupUrl = popup.location.href; } catch(e) { return; } // cross-origin — still on MS

      if (popupUrl.includes(ONEDRIVE_REDIRECT_URI) || popupUrl.includes('app.thecareadvantage.com')) {
        clearInterval(poll);
        const urlParams = new URLSearchParams(popup.location.search);
        popup.close();
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        if (error) {
          showBackupNotification('❌ Microsoft sign-in failed: ' + error, 'error');
          return;
        }
        if (code) {
          const token = await exchangeCodeForToken(code);
          if (token) {
            showBackupNotification('✅ OneDrive connected! Running first backup…', 'success');
            updateBackupBadge();
            setTimeout(() => runBackup(true), 1500);
          } else {
            showBackupNotification('❌ OneDrive connection failed. Please try again.', 'error');
          }
        }
      }
    } catch(e) { /* still on MS domain */ }
  }, 500);
}

async function exchangeCodeForToken(code) {
  const verifier = localStorage.getItem('pkce_verifier');
  if (!verifier) return null;

  const body = new URLSearchParams({
    client_id: ONEDRIVE_CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: ONEDRIVE_REDIRECT_URI,
    code_verifier: verifier,
    scope: ONEDRIVE_SCOPES
  });

  const resp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const data = await resp.json();
  if (data.access_token) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + (data.expires_in * 1000));
    if (data.refresh_token) localStorage.setItem('tca_onedrive_refresh', data.refresh_token);
    localStorage.removeItem('pkce_verifier');
    return data.access_token;
  }
  console.error('OneDrive token error:', data);
  return null;
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('tca_onedrive_refresh');
  if (!refreshToken) return null;

  const body = new URLSearchParams({
    client_id: ONEDRIVE_CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: ONEDRIVE_SCOPES
  });

  const resp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const data = await resp.json();
  if (data.access_token) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + (data.expires_in * 1000));
    return data.access_token;
  }
  return null;
}

async function getValidToken() {
  const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0');
  const token = localStorage.getItem(TOKEN_KEY);

  if (token && Date.now() < expiry - 60000) return token; // still valid
  return await refreshAccessToken(); // try refresh
}

function isOneDriveConnected() {
  return !!localStorage.getItem(TOKEN_KEY);
}

function disconnectOneDrive() {
  [TOKEN_KEY, TOKEN_EXPIRY_KEY, 'tca_onedrive_refresh'].forEach(k => localStorage.removeItem(k));
  updateBackupBadge();
}

// ─────────────────────────────────────────
// DATA EXPORT — pull tables from Supabase
// ─────────────────────────────────────────

function arrayToCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = v => {
    if (v === null || v === undefined) return '';
    const str = String(v);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(','))
  ].join('\n');
}

async function fetchTableData(tableName) {
  // Uses your existing Supabase client (window.supabaseClient)
  // or falls back to direct fetch
  try {
    if (window.supabaseClient) {
      const { data, error } = await window.supabaseClient
        .from(tableName)
        .select('*')
        .eq('org_id', 'TCA');
      if (error) throw error;
      return data || [];
    }

    // Fallback: direct REST call
    const url = window.SUPABASE_URL || 'https://vhebrkhdgeiyxkpphlut.supabase.co';
    const key = window.SUPABASE_KEY || window.SUPABASE_ANON_KEY;
    const resp = await fetch(`${url}/rest/v1/${tableName}?org_id=eq.TCA&select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    return await resp.json();
  } catch (err) {
    console.warn(`Could not fetch table "${tableName}":`, err);
    return [];
  }
}

const TABLES_TO_BACKUP = [
  'staff',
  'dbs_records',
  'rtw_records',
  'training_records',
  'contracts',
  'alerts'
];

async function exportAllTables() {
  const exports = {};
  for (const table of TABLES_TO_BACKUP) {
    const rows = await fetchTableData(table);
    exports[table] = arrayToCSV(rows);
  }
  return exports;
}

// ─────────────────────────────────────────
// ONEDRIVE UPLOAD
// ─────────────────────────────────────────

async function ensureFolder(token, folderName, parentPath = '/me/drive/root') {
  // Check if folder exists
  const checkResp = await fetch(
    `https://graph.microsoft.com/v1.0${parentPath}:/${encodeURIComponent(folderName)}:`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (checkResp.ok) {
    const folder = await checkResp.json();
    return folder.id;
  }

  // Create folder
  const createResp = await fetch(
    `https://graph.microsoft.com/v1.0${parentPath}/children`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      })
    }
  );

  if (!createResp.ok) throw new Error(`Failed to create folder: ${folderName}`);
  const folder = await createResp.json();
  return folder.id;
}

async function uploadFileToOneDrive(token, content, fileName, folderId) {
  const blob = new Blob([content], { type: 'text/csv' });
  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(fileName)}:/content`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/csv'
      },
      body: blob
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Upload failed for ${fileName}: ${err}`);
  }
  return await resp.json();
}

// ─────────────────────────────────────────
// MAIN BACKUP FUNCTION
// ─────────────────────────────────────────

async function runBackup(manual = false) {
  if (!isOneDriveConnected()) {
    showBackupNotification('⚠️ OneDrive not connected. Click "Connect OneDrive" first.', 'warning');
    return;
  }

  updateBackupBadge('running');

  try {
    const token = await getValidToken();
    if (!token) {
      showBackupNotification('❌ OneDrive session expired. Please reconnect.', 'error');
      updateBackupBadge();
      return;
    }

    showBackupNotification('📦 Exporting data from Supabase...', 'info');
    const exports = await exportAllTables();

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = new Date().toLocaleString('en-GB');

    showBackupNotification('📁 Creating OneDrive folders...', 'info');
    const rootFolderId = await ensureFolder(token, BACKUP_FOLDER);
    const dateFolderId = await ensureFolder(token, today, `/me/drive/items/${rootFolderId}`);

    showBackupNotification('⬆️ Uploading CSV files...', 'info');
    let uploaded = 0;
    for (const [table, csv] of Object.entries(exports)) {
      if (csv) {
        await uploadFileToOneDrive(token, csv, `${table}.csv`, dateFolderId);
        uploaded++;
      }
    }

    // Upload a summary manifest
    const manifest = [
      `TCA HR Compliance Backup`,
      `Date: ${timestamp}`,
      `Tables: ${uploaded}`,
      `Org: TCA`,
      `Files: ${Object.keys(exports).filter(t => exports[t]).map(t => `${t}.csv`).join(', ')}`,
      `Supabase project: vhebrkhdgeiyxkpphlut`
    ].join('\n');
    await uploadFileToOneDrive(token, manifest, '_backup_info.txt', dateFolderId);

    localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());

    showBackupNotification(
      `✅ Backup complete! ${uploaded} tables saved to OneDrive → ${BACKUP_FOLDER}/${today}`,
      'success'
    );
    updateBackupBadge();

  } catch (err) {
    console.error('Backup error:', err);
    showBackupNotification(`❌ Backup failed: ${err.message}`, 'error');
    updateBackupBadge();
  }
}

// ─────────────────────────────────────────
// AUTO-CHECK on page load
// ─────────────────────────────────────────

async function checkAndAutoBackup() {
  // Clean up any stale pkce_verifier on fresh loads (no auth code in URL)
  const params = new URLSearchParams(window.location.search);
  if (!params.get('code') && !params.get('state')) {
    localStorage.removeItem('pkce_verifier');
  }

  // Check if weekly backup is due
  if (!isOneDriveConnected()) return;

  const lastBackup = parseInt(localStorage.getItem(LAST_BACKUP_KEY) || '0');
  const due = Date.now() - lastBackup > BACKUP_INTERVAL_MS;

  if (due) {
    console.log('[TCA Backup] Weekly backup due — running automatically...');
    setTimeout(() => runBackup(), 3000);
  }
}

// ─────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────

function updateBackupBadge(state = null) {
  const badge = document.getElementById('onedrive-backup-badge');
  if (!badge) return;

  if (!isOneDriveConnected()) {
    badge.innerHTML = `
      <button onclick="connectOneDrive()" class="tca-backup-btn tca-backup-connect">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.003 2a9.998 9.998 0 00-9.374 13.497L5.25 18h13.5l2.621-2.503A9.998 9.998 0 0012.003 2z"/>
        </svg>
        Connect OneDrive
      </button>`;
    return;
  }

  if (state === 'running') {
    badge.innerHTML = `<span class="tca-backup-running">⟳ Backing up...</span>`;
    return;
  }

  const lastBackup = parseInt(localStorage.getItem(LAST_BACKUP_KEY) || '0');
  const lastStr = lastBackup
    ? new Date(lastBackup).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Never';

  badge.innerHTML = `
    <span class="tca-backup-status">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      OneDrive connected · Last: ${lastStr}
    </span>
    <button onclick="runBackup(true)" class="tca-backup-btn tca-backup-now">Backup now</button>
    <button onclick="if(confirm('Disconnect OneDrive backup?')) disconnectOneDrive()" class="tca-backup-btn tca-backup-disconnect">✕</button>`;
}

function showBackupNotification(message, type = 'info') {
  let notif = document.getElementById('tca-backup-notif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'tca-backup-notif';
    document.body.appendChild(notif);
  }

  const colors = {
    info: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444'
  };

  notif.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    background: #1e293b; color: #f1f5f9;
    border-left: 4px solid ${colors[type] || colors.info};
    padding: 12px 18px; border-radius: 8px;
    font-size: 13px; font-family: sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    max-width: 380px; line-height: 1.4;
    transition: opacity 0.3s;
  `;
  notif.textContent = message;
  notif.style.opacity = '1';

  if (type === 'success' || type === 'info') {
    setTimeout(() => { notif.style.opacity = '0'; }, 5000);
  }
}

// ─────────────────────────────────────────
// CSS (injected automatically)
// ─────────────────────────────────────────

(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #onedrive-backup-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .tca-backup-btn {
      padding: 4px 10px;
      border-radius: 5px;
      border: none;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: opacity 0.15s;
    }
    .tca-backup-btn:hover { opacity: 0.85; }
    .tca-backup-connect {
      background: #0078d4;
      color: white;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .tca-backup-now {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
    }
    .tca-backup-disconnect {
      background: transparent;
      color: #64748b;
      padding: 4px 6px;
    }
    .tca-backup-status {
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }
    .tca-backup-running {
      color: #3b82f6;
      font-size: 12px;
      animation: tca-spin 1.5s linear infinite;
    }
    @keyframes tca-spin {
      from { opacity: 1; } 50% { opacity: 0.4; } to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
})();

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    updateBackupBadge();
    checkAndAutoBackup();
  });
} else {
  updateBackupBadge();
  checkAndAutoBackup();
}

// Expose to global scope
window.connectOneDrive = connectOneDrive;
window.disconnectOneDrive = disconnectOneDrive;
window.runBackup = runBackup;

/* ============================================================
   PASTE THIS INTO YOUR app.html
   ============================================================

   1. Before </head>, add:
      <script src="tca-onedrive-backup.js"></script>
      (or paste the full JS inline in a <script> tag)

   2. In your top nav bar (near the "Connected — Supabase" badge),
      add this div:
      <div id="onedrive-backup-badge"></div>

   That's it. The badge will show "Connect OneDrive" until
   the user signs in, then show backup status + "Backup now" button.

   FOLDER STRUCTURE IN ONEDRIVE:
   📁 TCA HR Backups/
     📁 2026-03-29/
       📄 staff.csv
       📄 dbs_records.csv
       📄 rtw_records.csv
       📄 training_records.csv
       📄 contracts.csv
       📄 alerts.csv
       📄 _backup_info.txt
   ============================================================ */
