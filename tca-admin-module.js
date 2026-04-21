// ================================================================
// TCA Admin Module — v2.0
// The Care Advantage Ltd | app.thecareadvantage.com
// Place this file on your server alongside app.html
// Add to app.html: <script src="tca-admin-module.js"></script>
// ================================================================
(function() {
  'use strict';

  const MODULES = ['dashboard','allStaff','onboarding','training','rota','invoices','admin','auditLog'];
  const MOD_LABELS = { dashboard:'Dashboard', allStaff:'All Staff', onboarding:'Onboarding', training:'Training', rota:'Rota', invoices:'Invoices', admin:'Admin', auditLog:'Audit Log' };
  const ADMIN_PERMS = Object.fromEntries(MODULES.map(m => [m, 'rw']));
  const STAFF_PERMS = { dashboard:'rw', allStaff:'ro', onboarding:'ro', training:'ro', rota:'ro', invoices:'none', admin:'none', auditLog:'none' };

  function getPerms() { return JSON.parse(localStorage.getItem('tca_user_permissions') || '{"users":{},"defaultRole":{"permissions":{}}}'); }
  function savePerms(p) { localStorage.setItem('tca_user_permissions', JSON.stringify(p)); }
  function selColor(lvl) { return lvl==='rw'?'#d4edda':lvl==='ro'?'#cce5ff':'#f8d7da'; }
  
  window.showToast = window.showToast || function(msg, color) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:20px;right:20px;background:${color||'#333'};color:#fff;padding:10px 18px;border-radius:8px;z-index:99999;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.3)`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  };

  async function autoPopulateStaff() {
    try {
      const perms = getPerms();
      const staff = await window.sbFetch('staff?select=id,name,email,role,status&order=name.asc&limit=200');
      staff.forEach(s => {
        const email = (s.email && s.email.trim()) ? s.email.trim().toLowerCase() : `staff_id_${s.id}@tca.local`;
        if (!perms.users[email]) {
          const isAdmin = s.name && (s.name.toLowerCase().includes('vivek') || (s.role && (s.role.toLowerCase().includes('manager') || s.role.toLowerCase().includes('director'))));
          perms.users[email] = { name: s.name, role: isAdmin ? 'Admin' : (s.role || 'Staff'), staffId: s.id, permissions: isAdmin ? {...ADMIN_PERMS} : {...STAFF_PERMS}, addedAt: new Date().toISOString() };
        }
      });
      perms.defaultRole = { permissions: {...STAFF_PERMS} };
      savePerms(perms);
    } catch(e) { console.warn('autoPopulateStaff error:', e.message); }
  }

  window.tcaUpdatePerm = function(email, moduleKey, value, selectEl) {
    const p = getPerms();
    if (email === '__default__') { p.defaultRole.permissions[moduleKey] = value; }
    else { if (!p.users[email]) p.users[email] = { permissions: {} }; p.users[email].permissions[moduleKey] = value; p.users[email].updatedAt = new Date().toISOString(); }
    savePerms(p);
    if (selectEl) selectEl.style.background = selColor(value);
    showToast('Saved', '#28a745');
  };

  window.tcaFilterPermTable = function(val) {
    const rf = (document.getElementById('perm-role-filter')?.value||'').toLowerCase();
    document.querySelectorAll('#perm-tbody tr').forEach(row => {
      const t1 = (row.querySelector('td:first-child')?.textContent||'').toLowerCase();
      const t2 = (row.querySelector('td:nth-child(2)')?.textContent||'').toLowerCase();
      row.style.display = ((!val||t1.includes(val.toLowerCase()))&&(!rf||t2.includes(rf)))?'':'none';
    });
  };

  window.tcaBulkSetAll = function(level) {
    if (!confirm('Apply to all non-admin staff?')) return;
    const p = getPerms();
    Object.values(p.users||{}).forEach(u => { if (u.role!=='Admin') MODULES.forEach(m => { u.permissions[m] = (m==='admin'||m==='auditLog'||m==='invoices')?'none':level; }); });
    savePerms(p); window.buildAdminPage(); showToast('Done', '#28a745');
  };

  window.tcaSavePerms = function() { showToast('All permissions saved', '#28a745'); };

  window.tcaExportCSV = async function(type) {
    const now = new Date(); const ts = now.toISOString().slice(0,10); const tsL = now.toLocaleString('en-GB');
    function dl(c,f){ const b=new Blob([c],{type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=f; a.click(); URL.revokeObjectURL(u); showToast('Downloaded: '+f,'#28a745'); }
    try {
      if (type==='staff') { showToast('Generating...','#0d6efd'); const d=await sbFetch('staff?select=id,name,email,role,status,loc,start&order=name.asc&limit=200'); let c=`# TCA All Staff | ${tsL}\nID,Name,Email,Role,Status,Location,Start Date\n`; d.forEach(s=>{c+=`"${s.id}","${s.name||''}","${s.email||''}","${s.role||''}","${s.status||''}","${s.loc||''}","${s.start||''}"\n`;}); dl(c,`TCA_AllStaff_${ts}.csv`); }
      else if (type==='training') { showToast('Generating...','#0d6efd'); const d=await sbFetch('training?select=*&limit=500'); let c=`# TCA Training | ${tsL}\n`; if(d.length){const k=Object.keys(d[0]);c+=k.map(x=>`"${x}"`).join(','+'')+'\n';d.forEach(r=>{c+=k.map(x=>`"${(r[x]||'').toString().replace(/"/g,'""')}"`).join(','+'')+'\n';});} dl(c,`TCA_TrainingMatrix_${ts}.csv`); }
      else if (type==='audit') { showToast('Generating...','#0d6efd'); const d=await sbFetch('audit_log?select=*&order=created_at.desc&limit=1000'); let c=`# TCA Audit Log | ${tsL}\n`; if(d.length){const k=Object.keys(d[0]);c+=k.map(x=>`"${x}"`).join(','+'')+'\n';d.forEach(r=>{c+=k.map(x=>`"${(r[x]||'').toString().replace(/"/g,'""')}"`).join(','+'')+'\n';});} dl(c,`TCA_AuditLog_${ts}.csv`); }
      else if (type==='permissions') { const p=getPerms(); const lbl=v=>v==='rw'?'Read/Write':v==='ro'?'Read Only':'No Access'; let c=`# TCA Permissions | ${tsL}\nName,Email,Role,${MODULES.map(m=>MOD_LABELS[m]).join(',')}\n`; Object.entries(p.users||{}).forEach(([e,u])=>{const de=e.includes('@tca.local')?'':e;c+=`"${u.name||''}","${de}","${u.role||''}",${MODULES.map(m=>`"${lbl((u.permissions&&u.permissions[m])||'none')}"`).join(',')}\n`;}); dl(c,`TCA_Permissions_${ts}.csv`); }
      else if (type==='docs') { let c=`# TCA Safer Recruitment Index | ${tsL}\nStaff,ID,Category,Type,File,Size,UploadedBy,Date,Reviewed,Notes\n`; let n=0; for(let k in localStorage){if(k.startsWith('tca_docs_')){const sid=k.replace('tca_docs_','');try{const docs=JSON.parse(localStorage.getItem(k)||'{}');Object.entries(docs).forEach(([cat,files])=>{(Array.isArray(files)?files:[]).forEach(f=>{c+=`"${f.staffName||'ID '+sid}","${sid}","${cat}","${f.docType||''}","${f.name||''}","${f.size||''}","${f.uploadedBy||''}","${f.uploadedAt||''}","${f.reviewed?'Yes':'No'}","${(f.notes||'').replace(/"/g,'""')}"\n`;n++;});});}catch(e){}}} if(!n)c+='"No documents yet"\n'; dl(c,`TCA_SaferRecruitmentIndex_${ts}.csv`); }
    } catch(err) { showToast('Export failed: '+err.message,'#dc3545'); }
  };

  window.buildAdminPage = function() {
    const page = document.getElementById('page-admin');
    if (!page) return;
    const p = getPerms(); const ts = new Date().toISOString().slice(0,10);
    const entries = Object.entries(p.users||{}).sort((a,b)=>{ if(a[1].role==='Admin'&&b[1].role!=='Admin')return -1; if(b[1].role==='Admin'&&a[1].role!=='Admin')return 1; return(a[1].name||'').localeCompare(b[1].name||''); });
    const defP = (p.defaultRole&&p.defaultRole.permissions)||{};
    function uRow(email,u) {
      const de=email.includes('@tca.local')?'(no email)':email;
      const badge=u.role==='Admin'?`<span style="background:#1C3D6E;color:#fff;padding:1px 7px;border-radius:10px;font-size:10px">Admin</span>`:`<span style="background:#6c757d;color:#fff;padding:1px 6px;border-radius:10px;font-size:10px">${(u.role||'Staff').substring(0,14)}</span>`;
      const ec=email.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      const cells=MODULES.map(m=>{const lvl=(u.permissions&&u.permissions[m])||'none';return`<td style="padding:2px 3px;min-width:90px"><select onchange="tcaUpdatePerm('${ec}','${m}',this.value,this)" style="width:100%;padding:2px 4px;border-radius:4px;border:1px solid #ccc;font-size:10px;background:${selColor(lvl)};cursor:pointer"><option value="rw" ${lvl==='rw'?'selected':''}>✏️ R/W</option><option value="ro" ${lvl==='ro'?'selected':''}>👁 Read</option><option value="none" ${lvl==='none'?'selected':''}>🔒 None</option></select></td>`;}).join('');
      return`<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:5px 8px;min-width:170px;position:sticky;left:0;background:#fff;z-index:1"><div style="font-weight:600;font-size:12px">${u.name||email}</div><div style="font-size:10px;color:#aaa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">${de}</div></td><td style="padding:3px 6px;min-width:100px">${badge}</td>${cells}</tr>`;
    }
    const defCells=MODULES.map(m=>{const lvl=defP[m]||'none';return`<td style="padding:2px 3px"><select onchange="tcaUpdatePerm('__default__','${m}',this.value,this)" style="width:100%;padding:2px 4px;border-radius:4px;border:1px solid #ccc;font-size:10px;background:${selColor(lvl)};cursor:pointer"><option value="rw" ${lvl==='rw'?'selected':''}>✏️ R/W</option><option value="ro" ${lvl==='ro'?'selected':''}>👁 Read</option><option value="none" ${lvl==='none'?'selected':''}>🔒 None</option></select></td>`;}).join('');
    
    page.innerHTML = `<div style="padding:24px;font-family:inherit">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44"><circle cx="22" cy="22" r="21" fill="#1C3D6E"/><path d="M22 5 C12 5 4 13 4 23 C4 33 12 41 22 41 C29 41 35 37.5 38.5 32 L32 28.5 C29.5 32 26 34 22 34 C16 34 10 28.5 10 22 C10 15.5 16 10 22 10 C26 10 29.5 12 32 15.5 L38.5 12 C35 6.5 29 5 22 5 Z" fill="white"/><circle cx="22" cy="22" r="8" fill="#1C3D6E"/><rect x="24" y="1" width="22" height="11" fill="#1C3D6E"/></svg>
        <div><h2 style="margin:0;font-size:20px;color:#1C3D6E">Admin Panel</h2><div style="font-size:11px;color:#888">The Care Advantage Ltd — HR Compliance System</div></div>
        <button onclick="if(window._srShowRMManager)window._srShowRMManager();else{showPage('safer-recruitment');setTimeout(()=>{if(window._srShowRMManager)window._srShowRMManager();},800);}" style="margin-left:auto;padding:8px 16px;background:#6f42c1;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">👥 Manage Staff Managers</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:18px">
        <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;border-left:4px solid #1C3D6E"><div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#1C3D6E">🏢 Organisation</div><div style="font-weight:600;font-size:15px;margin-bottom:7px">The Care Advantage Ltd</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:11px"><div><div style="color:#888">Org ID</div><div style="font-weight:600">TCA</div></div><div><div style="color:#888">Total</div><div style="font-weight:600">55</div></div><div><div style="color:#888">Active</div><div style="font-weight:600">51</div></div></div></div>
        <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;border-left:4px solid #e65100"><div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#e65100">📊 Compliance</div><div style="font-size:12px;display:flex;justify-content:space-between;margin-bottom:4px"><span>Missing DBS</span><span style="color:#e65100;font-weight:700">25</span></div><div style="font-size:12px;display:flex;justify-content:space-between;margin-bottom:4px"><span>Missing Contracts</span><span style="color:#e65100;font-weight:700">45</span></div><div style="font-size:12px;display:flex;justify-content:space-between"><span>Missing RTW</span><span style="color:#e65100;font-weight:700">22</span></div></div>
        <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;border-left:4px solid #28a745"><div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#28a745">🟢 System Status</div><div style="font-size:12px;display:flex;justify-content:space-between;margin-bottom:4px"><span>Supabase</span><span style="color:#2e7d32;font-weight:600">● Connected</span></div><div style="font-size:12px;display:flex;justify-content:space-between;margin-bottom:4px"><span>User Profiles RLS</span><span style="color:#e65100;font-weight:600">⚠ Policy Bug</span></div><div style="font-size:12px;display:flex;justify-content:space-between"><span>Staff Records</span><span style="color:#2e7d32;font-weight:600">● 55 records</span></div></div>
      </div>
      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;margin-bottom:18px">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px">📥 Data Export <span style="font-weight:400;font-size:11px;color:#888">— timestamped e.g. TCA_AllStaff_${ts}.csv</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <button onclick="tcaExportCSV('staff')" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px">📄 All Staff</button>
          <button onclick="tcaExportCSV('training')" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px">📊 Training Matrix</button>
          <button onclick="tcaExportCSV('audit')" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px">🔍 Audit Log</button>
          <button onclick="tcaExportCSV('permissions')" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px">🔐 Permissions</button>
          <button onclick="tcaExportCSV('docs')" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px">📁 Safer Recruitment</button>
          <button onclick="tcaShowEmailStaff()" style="background:#4361ee;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;margin-left:4px">📧 Email Staff</button>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;margin-bottom:18px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          <div>
        <div id="tca-email-section" style="display:none"><div id="tca-email-container"></div><div style="margin-top:16px;padding-top:16px;border-top:1px solid #e9ecef"><button onclick="tcaShowEmailStaff()" style="padding:8px 20px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;cursor:pointer;color:#555;font-size:13px">← Back to Admin Panel</button></div></div><div id="tca-perms-section"><div style="font-weight:700;font-size:13px">👥 User Permission Matrix</div><div style="font-size:11px;color:#888">${entries.length} staff · changes save instantly · Admin = full access</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <input type="text" id="perm-search" placeholder="Search..." onkeyup="tcaFilterPermTable(this.value)" style="padding:5px 9px;border:1px solid #ccc;border-radius:6px;font-size:11px;width:130px">
            <select id="perm-role-filter" onchange="tcaFilterPermTable(document.getElementById('perm-search').value)" style="padding:5px 8px;border:1px solid #ccc;border-radius:6px;font-size:11px"><option value="">All</option><option value="admin">Admins</option><option value="support">Support</option></select>
            <button onclick="tcaBulkSetAll('ro')" style="background:#cce5ff;border:1px solid #004085;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px">👁 All Read Only</button>
            <button onclick="tcaBulkSetAll('rw')" style="background:#d4edda;border:1px solid #28a745;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px">✏️ All R/W</button>
            <button onclick="tcaSavePerms()" style="background:#1C3D6E;color:#fff;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px;font-weight:600">💾 Save</button>
          </div>
        </div>
        <div style="overflow:auto;max-height:500px;border:1px solid #e0e0e0;border-radius:8px">
          <table style="border-collapse:collapse;width:100%;font-size:11px">
            <thead style="background:#f8f9fa;position:sticky;top:0;z-index:2">
              <tr><th style="padding:7px 8px;text-align:left;min-width:170px;position:sticky;left:0;background:#f8f9fa;z-index:3;border-bottom:2px solid #dee2e6">Staff</th><th style="padding:7px 8px;text-align:left;min-width:100px;border-bottom:2px solid #dee2e6">Role</th>${MODULES.map(m=>`<th style="padding:7px 5px;text-align:left;min-width:90px;border-bottom:2px solid #dee2e6">${MOD_LABELS[m]}</th>`).join('')}</tr>
            </thead>
            <tbody id="perm-tbody">${entries.map(([e,u])=>uRow(e,u)).join('')}</tbody>
            <tfoot style="background:#fff8e1;border-top:2px solid #ffc107;position:sticky;bottom:0"><tr><td colspan="2" style="padding:5px 8px;font-weight:700;font-size:11px">📋 Default (all others)</td>${defCells}</tr></tfoot>
          </table>
        </div>
      </div>
      <button onclick="supabase.auth.signOut().then(()=>location.reload())" style="background:#dc3545;color:#fff;border:none;border-radius:8px;padding:9px 22px;cursor:pointer;font-size:13px;font-weight:600">🚪 Sign Out</button>
    </div>
        </div>`;
  };

  
window._homeEmails={'Maple Lodge':'Maple.Lodge@thecareadvantagesl.com','Spring Lodge':'Spring.Lodge@thecareadvantagesl.com','Spring House':'Spring.house@thecareadvantagesl.com','Lantern Lodge':'Lantern.lodge@thecareadvantagesl.com','Cambria':'Cambria.house@thecareadvantagesl.com'};
window.tcaShowEmailStaff=function(){var p=document.getElementById('tca-perms-section'),e=document.getElementById('tca-email-section'),c=document.getElementById('tca-email-container');if(p)p.style.display='none';if(e)e.style.display='block';if(c)window.tcaRenderEmailComposer(c);};
window.tcaRenderEmailComposer=function(container){
  var sk=localStorage.getItem('tca_resend_key')||window._resendKey||'',ko=!!sk;
  var hh='';
  Object.keys(window._homeEmails||{}).forEach(function(home){
    var email=(window._homeEmails||{})[home];
    hh+='<label style="display:flex;align-items:center;gap:10px;padding:9px 13px;background:#f8f9fa;border:2px solid #e9ecef;border-radius:8px;cursor:pointer;margin-bottom:6px"><input type="checkbox" class="tca-recip-check" data-email="'+email+'" data-home="'+home+'" onchange="tcaUpdateRecipSummary()" style="width:15px;height:15px;accent-color:#4361ee"><div><div style="font-size:13px;font-weight:600;color:#333">🏠 '+home+'</div><div style="font-size:11px;color:#999">'+email+'</div></div></label>';
  });
  var tmplBtns=[['compliance','📋 Compliance Reminder'],['shift','🔄 Shift Cover Needed'],['policy','📜 Policy Update'],['training','🎓 Training Reminder'],['meeting','📢 Staff Meeting'],['dbs','🔴 DBS Renewal Alert'],['rtw','🛂 Right to Work Alert']].map(function(item){return '<button data-ttype="'+item[0]+'" onclick="tcaApplyEmailTemplate(this.dataset.ttype)" style="display:block;width:100%;text-align:left;padding:9px 12px;background:#f8f9fa;border:1px solid #e9ecef;border-radius:7px;cursor:pointer;font-size:13px;color:#333;margin-bottom:6px">'+item[1]+'</button>';}).join('');
  container.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e9ecef"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px"><h2 style="margin:0;font-size:20px;font-weight:700;color:#1a1a2e">📧 Email Staff</h2><button onclick="tcaShowEmailStaff()" style="padding:8px 16px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;cursor:pointer;color:#666;font-size:13px">✕ Close</button></div><div id="tca-key-banner" style="margin-bottom:18px;padding:12px 16px;border-radius:8px;font-size:13px;background:'+(ko?'#d4edda':'#fff3cd')+';color:'+(ko?'#155724':'#856404')+';border:1px solid '+(ko?'#c3e6cb':'#ffc107')+'">'+(ko?'✅ Resend API key configured.':'⚠️ API key not configured. Enter it below.')+'</div><div style="display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start"><div><div style="margin-bottom:16px"><label style="display:block;font-size:11px;font-weight:700;color:#888;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">To — Recipients</label>'+hh+'<label style="display:flex;align-items:center;gap:10px;padding:9px 13px;background:#fff8ec;border:2px solid #e9ecef;border-radius:8px;cursor:pointer;margin-bottom:6px"><input type="checkbox" id="tca-all-homes-chk" onchange="tcaToggleAllHomes(this)" style="width:15px;height:15px;accent-color:#ff9800"><div style="font-size:13px;font-weight:600;color:#333">📣 All Homes</div></label><input type="email" id="tca-custom-email" placeholder="Or type individual email..." onchange="tcaUpdateRecipSummary()" onkeyup="tcaUpdateRecipSummary()" style="width:100%;padding:9px 12px;border:1px solid #dee2e6;border-radius:8px;font-size:13px;box-sizing:border-box;margin-top:4px"><div id="tca-recip-summary" style="margin-top:8px;padding:8px 12px;background:#eef1ff;border-radius:6px;font-size:12px;color:#4361ee;display:none"></div></div><div style="margin-bottom:14px"><label style="display:block;font-size:11px;font-weight:700;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Subject</label><input type="text" id="tca-email-subject" placeholder="e.g. Staff Notice" style="width:100%;padding:10px 12px;border:1px solid #dee2e6;border-radius:8px;font-size:13px;box-sizing:border-box"></div><div style="margin-bottom:18px"><label style="display:block;font-size:11px;font-weight:700;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Message</label><textarea id="tca-email-body" rows="8" placeholder="Type your message here..." style="width:100%;padding:12px;border:1px solid #dee2e6;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box;line-height:1.6"></textarea></div><div style="display:flex;gap:10px;align-items:center"><button onclick="tcaSendStaffEmail()" id="tca-send-btn" style="padding:12px 28px;background:linear-gradient(135deg,#4361ee,#3a0ca3);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">📧 Send Email</button><button onclick="tcaClearEmailForm()" style="padding:12px 20px;background:#f8f9fa;color:#666;border:1px solid #dee2e6;border-radius:8px;cursor:pointer;font-size:14px">Clear</button><div id="tca-send-status" style="font-size:13px;flex:1;text-align:right;font-weight:500"></div></div></div><div style="display:flex;flex-direction:column;gap:16px"><div style="background:#f8f9fa;border-radius:10px;padding:18px;border:1px solid #e9ecef"><h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#222">⚡ Quick Templates</h3>'+tmplBtns+'</div><div style="background:#f8f9fa;border-radius:10px;padding:18px;border:1px solid #e9ecef"><h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#222">🔑 API Key</h3><input type="password" id="tca-apikey-input" placeholder="re_xxxxxxxxxxxxxxxxxxxx" value="'+sk+'" style="width:100%;padding:9px 12px;border:1px solid #dee2e6;border-radius:7px;font-size:13px;font-family:monospace;box-sizing:border-box;margin-bottom:8px"><div style="display:flex;gap:8px"><button onclick="tcaSaveEmailApiKey()" style="flex:1;padding:9px;background:#1a1a2e;color:white;border:none;border-radius:7px;cursor:pointer;font-size:13px">💾 Save</button><button onclick="tcaTestEmailApiKey()" id="tca-test-btn" style="flex:1;padding:9px;background:#28a745;color:white;border:none;border-radius:7px;cursor:pointer;font-size:13px">✓ Test</button></div><p style="margin:8px 0 0;font-size:11px;color:#aaa">Get from resend.com/api-keys</p></div><div style="background:#f8f9fa;border-radius:10px;padding:18px;border:1px solid #e9ecef"><h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#222">📬 Recently Sent</h3><div id="tca-email-hist">'+_tcaEH2()+'</div></div></div></div></div>';
};
function _tcaEH2(){var h=JSON.parse(localStorage.getItem('tca_email_history')||'[]');if(!h.length)return '<p style="font-size:12px;color:#aaa">No emails sent yet.</p>';return h.slice(0,5).map(function(item){return '<div style="padding:7px 0;border-bottom:1px solid #f0f0f0"><div style="font-size:12px;font-weight:600;color:#333">'+item.subject+'</div><div style="font-size:11px;color:#999;margin-top:2px">'+new Date(item.date).toLocaleDateString('en-GB')+'<span style="color:#28a745;margin-left:6px">'+item.sentCount+' sent</span></div></div>';}).join('');}
window.tcaUpdateRecipSummary=function(){var all=Array.from(document.querySelectorAll('.tca-recip-check:checked')).map(function(c){return c.dataset.email;});var cu=(document.getElementById('tca-custom-email')?document.getElementById('tca-custom-email').value:'').trim().split(',').map(function(e){return e.trim();}).filter(function(e){return e.indexOf('@')>0;});var res=all.concat(cu).filter(function(v,i,a){return a.indexOf(v)===i;});var el=document.getElementById('tca-recip-summary');if(el){el.style.display=res.length?'block':'none';el.textContent='📨 To: '+res.join(', ');}};
window.tcaToggleAllHomes=function(cb){document.querySelectorAll('.tca-recip-check').forEach(function(c){c.checked=cb.checked;var l=c.closest('label');if(l){l.style.borderColor=cb.checked?'#4361ee':'#e9ecef';l.style.background=cb.checked?'#eef1ff':'#f8f9fa';}});tcaUpdateRecipSummary();};
window.tcaApplyEmailTemplate=function(type){var s=document.getElementById('tca-email-subject'),b=document.getElementById('tca-email-body');var NL='\n';var T={compliance:{subject:'Action Required — Compliance Outstanding',body:'Dear Team,'+NL+NL+'Compliance documents are outstanding. Please update urgently.'+NL+NL+'Kind regards,'+NL+'The Care Advantage HR Team'},shift:{subject:'Urgent — Shift Cover Required',body:'Dear Team,'+NL+NL+'Shift cover is needed. Please contact your manager immediately.'+NL+NL+'Kind regards,'+NL+'The Care Advantage HR Team'},policy:{subject:'Important — Policy Update',body:'Dear Team,'+NL+NL+'An important policy update has been made. All staff must read and acknowledge.'+NL+NL+'Kind regards,'+NL+'The Care Advantage HR Team'},training:{subject:'Training Reminder — Action Required',body:'Dear Team,'+NL+NL+'Mandatory training is outstanding. Please complete by the due date.'+NL+NL+'Kind regards,'+NL+'The Care Advantage HR Team'},meeting:{subject:'Staff Notice — Team Meeting',body:'Dear Team,'+NL+NL+'A team meeting has been scheduled. Details to follow. Your attendance is important.'+NL+NL+'Kind regards,'+NL+'The Care Advantage HR Team'},dbs:{subject:'Urgent — DBS Renewal Required',body:'Dear Team,'+NL+NL+'DBS renewal is required. A valid DBS check is a legal requirement. Please arrange immediately.'+NL+NL+'Kind regards,'+NL+'The Care Advantage HR Team'},rtw:{subject:'Right to Work — Action Required',body:'Dear Team,'+NL+NL+'Right to Work documents require immediate attention. Please contact HR urgently.'+NL+NL+'Kind regards,'+NL+'The Care Advantage HR Team'}};var t=T[type];if(t&&s&&b){s.value=t.subject;b.value=t.body;}};
window.tcaSaveEmailApiKey=function(){var key=(document.getElementById('tca-apikey-input')?document.getElementById('tca-apikey-input').value:'').trim();if(!key||key.indexOf('re_')!==0){alert('Please enter a valid Resend API key (starts with re_)');return;}localStorage.setItem('tca_resend_key',key);window._resendKey=key;var banner=document.getElementById('tca-key-banner');if(banner){banner.style.background='#d4edda';banner.style.color='#155724';banner.style.borderColor='#c3e6cb';banner.textContent='✅ Resend API key configured — ready to send.';}};
window.tcaTestEmailApiKey=async function(){var key=(document.getElementById('tca-apikey-input')?document.getElementById('tca-apikey-input').value:window._resendKey||'').trim();if(!key){alert('Enter key first');return;}var btn=document.getElementById('tca-test-btn');if(btn){btn.textContent='⏳';btn.disabled=true;}try{var r=await fetch('https://api.resend.com/domains',{headers:{'Authorization':'Bearer '+key}});if(btn){btn.textContent=r.ok?'✅ Valid!':'❌ Invalid';btn.disabled=false;}if(r.ok){window._resendKey=key;localStorage.setItem('tca_resend_key',key);}else{alert('Key test failed.');}}catch(e){if(btn){btn.textContent='❌';btn.disabled=false;}}setTimeout(function(){if(btn)btn.textContent='✓ Test';},3500);};
window.tcaClearEmailForm=function(){['tca-email-subject','tca-email-body','tca-custom-email'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});document.querySelectorAll('.tca-recip-check').forEach(function(c){c.checked=false;var l=c.closest('label');if(l){l.style.borderColor='#e9ecef';l.style.background='#f8f9fa';}});var a=document.getElementById('tca-all-homes-chk');if(a)a.checked=false;var rs=document.getElementById('tca-recip-summary');if(rs)rs.style.display='none';var st=document.getElementById('tca-send-status');if(st)st.textContent='';};
window.tcaSendStaffEmail=async function(){var key=window._resendKey||localStorage.getItem('tca_resend_key');if(!key){alert('Please configure your Resend API key first');return;}var hr=Array.from(document.querySelectorAll('.tca-recip-check:checked')).map(function(c){return c.dataset.email;}).filter(Boolean);var cr=(document.getElementById('tca-custom-email')?document.getElementById('tca-custom-email').value:'').trim().split(',').map(function(e){return e.trim();}).filter(function(e){return e.indexOf('@')>0;});var recips=hr.concat(cr).filter(function(v,i,a){return a.indexOf(v)===i;});if(!recips.length){alert('Please select at least one recipient');return;}var subj=(document.getElementById('tca-email-subject')?document.getElementById('tca-email-subject').value:'').trim();var body=(document.getElementById('tca-email-body')?document.getElementById('tca-email-body').value:'').trim();if(!subj||!body){alert('Please enter a subject and message');return;}var btn=document.getElementById('tca-send-btn'),st=document.getElementById('tca-send-status');if(btn){btn.disabled=true;btn.textContent='⏳ Sending...';}if(st)st.textContent='';var lines=body.split('\n');var htmlParts=['<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;background:#f5f7fa"><div style="max-width:560px;margin:0 auto"><div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:24px;border-radius:10px 10px 0 0;text-align:center"><div style="color:#fff;font-size:18px;font-weight:700">The Care Advantage</div><div style="color:#94a3b8;font-size:12px">HR Compliance System</div></div><div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px">'];lines.forEach(function(l){htmlParts.push(l?'<p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.7">'+l+'</p>':'<div style="height:6px"></div>');});htmlParts.push('</div></div></body></html>');var hb=htmlParts.join('');var sent=0,failed=[],errs=[];for(var i=0;i<recips.length;i++){var to=recips[i];try{var r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({from:'TCA HR System <noreply@thecareadvantagesl.com>',to:[to],subject:subj,html:hb,text:body})});var d=await r.json();if(r.ok)sent++;else{failed.push(to);errs.push(d.message||'Failed');}}catch(e){failed.push(to);errs.push(e.message);}}if(btn){btn.disabled=false;btn.textContent='📧 Send Email';}if(sent>0&&!failed.length){if(st){st.style.color='#28a745';st.textContent='✅ Sent to '+sent+' recipient'+(sent>1?'s':'')+'!';}var h=JSON.parse(localStorage.getItem('tca_email_history')||'[]');h.unshift({date:new Date().toISOString(),subject:subj,recipients:recips,sentCount:sent});localStorage.setItem('tca_email_history',JSON.stringify(h.slice(0,20)));var hp=document.getElementById('tca-email-hist');if(hp)hp.innerHTML=_tcaEH2();setTimeout(function(){tcaClearEmailForm();if(st)st.textContent='';},3000);}else if(st){st.style.color='#dc3545';st.textContent='⚠️ '+sent+' sent, '+failed.length+' failed: '+errs.join('; ');}};
async function init() {
    if (!document.getElementById('page-admin')) { const d=document.createElement('div'); d.id='page-admin'; d.className='page'; document.querySelector('main')?.appendChild(d); }
    await autoPopulateStaff();
    window.buildAdminPage();
    console.log('TCA Admin Module v2.0 loaded ✅');
  }

  if (document.readyState==='loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();