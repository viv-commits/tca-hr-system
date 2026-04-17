// ================================================================
// TCA Audit Log Module — v2.0
// The Care Advantage Ltd | app.thecareadvantage.com
// Place alongside app.html, add: <script src="tca-audit-module.js"></script>
// ================================================================
(function() {
  'use strict';

  window.buildAuditPage = async function() {
    const page = document.getElementById('page-audit-log');
    if (!page) return;
    page.innerHTML = '<div style="padding:24px"><div style="color:#888;font-size:13px">Loading audit log...</div></div>';
    try {
      const data = await window.sbFetch('audit_log?select=*&order=created_at.desc&limit=500');
      const modules = [...new Set(data.map(r => r.module || '').filter(Boolean))].sort();
      const actions = [...new Set(data.map(r => r.action || '').filter(Boolean))].sort();
      const modOpts = modules.map(m => '<option value="'+m+'">'+m+'</option>').join('');
      const actOpts = actions.map(a => '<option value="'+a+'">'+a+'</option>').join('');

      function actionBadge(action) {
        const a = (action||'').toLowerCase();
        const bg = a.includes('create')||a.includes('add') ? '#d4edda' : a.includes('delete')||a.includes('remove') ? '#f8d7da' : a.includes('update')||a.includes('edit') ? '#cce5ff' : '#f0f0f0';
        const tc = a.includes('create')||a.includes('add') ? '#155724' : a.includes('delete')||a.includes('remove') ? '#721c24' : a.includes('update')||a.includes('edit') ? '#004085' : '#333';
        return '<span style="background:'+bg+';color:'+tc+';padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">'+action+'</span>';
      }

      const rows = data.map(r => {
        const ts = r.created_at ? new Date(r.created_at).toLocaleString('en-GB') : '—';
        const details = typeof r.details === 'object' ? JSON.stringify(r.details).substring(0,80) : (r.details||'').substring(0,80);
        return '<tr data-module="'+(r.module||'')+'" data-action="'+(r.action||'')+'" style="border-bottom:1px solid #f5f5f5">'+
          '<td style="padding:7px 10px;font-size:12px;white-space:nowrap;color:#666">'+ts+'</td>'+
          '<td style="padding:7px 8px;font-size:12px;font-weight:600">'+( r.user_email||r.user||'System')+'</td>'+
          '<td style="padding:7px 8px;font-size:11px">'+actionBadge(r.action||'')+'</td>'+
          '<td style="padding:7px 8px;font-size:11px"><span style="background:#e3f2fd;color:#1565c0;padding:2px 8px;border-radius:10px">'+(r.module||'—')+'</span></td>'+
          '<td style="padding:7px 8px;font-size:11px;color:#666;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+(r.description||'')+'">'+( r.description||details||'—')+'</td>'+
          '</tr>';
      }).join('');

      page.innerHTML = '<div style="padding:24px;font-family:inherit">'+
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">'+
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="36" height="36"><circle cx="22" cy="22" r="21" fill="#1C3D6E"/><path d="M22 5 C12 5 4 13 4 23 C4 33 12 41 22 41 C29 41 35 37.5 38.5 32 L32 28.5 C29.5 32 26 34 22 34 C16 34 10 28.5 10 22 C10 15.5 16 10 22 10 C26 10 29.5 12 32 15.5 L38.5 12 C35 6.5 29 5 22 5 Z" fill="white"/><circle cx="22" cy="22" r="8" fill="#1C3D6E"/><rect x="24" y="1" width="22" height="11" fill="#1C3D6E"/></svg>'+
        '<h2 style="margin:0;font-size:20px;color:#1C3D6E">Audit Log</h2>'+
        '<span style="background:#fff3cd;color:#856404;padding:3px 10px;border-radius:12px;font-size:11px">🔒 Admin only</span>'+
        '<span style="background:#e3f2fd;color:#1565c0;padding:3px 10px;border-radius:12px;font-size:12px">'+data.length+' entries</span>'+
        '</div>'+
        '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">'+
        '<input type="text" id="al-search" placeholder="🔍 Search..." oninput="window._auditFilter()" style="padding:7px 12px;border:1px solid #ccc;border-radius:7px;font-size:12px;width:200px">'+
        '<select id="al-module" onchange="window._auditFilter()" style="padding:7px 10px;border:1px solid #ccc;border-radius:7px;font-size:12px"><option value="">All Modules</option>'+modOpts+'</select>'+
        '<select id="al-action" onchange="window._auditFilter()" style="padding:7px 10px;border:1px solid #ccc;border-radius:7px;font-size:12px"><option value="">All Actions</option>'+actOpts+'</select>'+
        '<button onclick="window.buildAuditPage()" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:7px;padding:7px 12px;cursor:pointer;font-size:11px">🔄 Refresh</button>'+
        '<button onclick="window.tcaExportCSV&&tcaExportCSV('audit')" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:7px;padding:7px 12px;cursor:pointer;font-size:11px">📥 Export CSV</button>'+
        '</div>'+
        '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">'+
        '<div style="overflow:auto;max-height:600px">'+
        '<table style="border-collapse:collapse;width:100%">'+
        '<thead style="position:sticky;top:0;z-index:2"><tr>'+
        '<th style="padding:8px 10px;text-align:left;border-bottom:2px solid #dee2e6;background:#f8f9fa;font-size:11px;min-width:140px">Timestamp</th>'+
        '<th style="padding:8px 8px;text-align:left;border-bottom:2px solid #dee2e6;background:#f8f9fa;font-size:11px;min-width:150px">User</th>'+
        '<th style="padding:8px 8px;text-align:left;border-bottom:2px solid #dee2e6;background:#f8f9fa;font-size:11px;min-width:100px">Action</th>'+
        '<th style="padding:8px 8px;text-align:left;border-bottom:2px solid #dee2e6;background:#f8f9fa;font-size:11px;min-width:100px">Module</th>'+
        '<th style="padding:8px 8px;text-align:left;border-bottom:2px solid #dee2e6;background:#f8f9fa;font-size:11px;min-width:200px">Description</th>'+
        '</tr></thead>'+
        '<tbody id="al-tbody">'+rows+'</tbody>'+
        '</table></div></div></div>';
    } catch(err) {
      page.innerHTML = '<div style="padding:24px"><div style="color:#dc3545">Error loading audit log: '+err.message+'<br><small>Note: Audit Log is only accessible to admin users.</small></div></div>';
    }
  };

  window._auditFilter = function() {
    const s=(document.getElementById('al-search')?.value||'').toLowerCase();
    const m=document.getElementById('al-module')?.value||'';
    const a=document.getElementById('al-action')?.value||'';
    document.querySelectorAll('#al-tbody tr').forEach(row=>{
      const t=row.textContent.toLowerCase();
      row.style.display=((!s||t.includes(s))&&(!m||row.getAttribute('data-module')===m)&&(!a||row.getAttribute('data-action')===a))?'':'none';
    });
  };

  async function init() {
    if(!document.getElementById('page-audit-log')){const d=document.createElement('div');d.id='page-audit-log';d.className='page';document.querySelector('main')?.appendChild(d);}
    window.buildAuditPage();
    document.querySelectorAll('a[href*="audit"],.hdr-btn').forEach(el=>{if((el.textContent||'').toLowerCase().includes('audit')||(el.getAttribute('href')||'').includes('audit')){el.addEventListener('click',e=>{e.preventDefault();window.buildAuditPage();if(typeof showPage==='function')showPage('audit-log');});}});
    console.log('TCA Audit Module v2.0 loaded ✅');
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();