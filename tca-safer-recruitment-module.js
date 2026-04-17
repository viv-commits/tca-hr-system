// ================================================================
// TCA Safer Recruitment Module — v2.0
// The Care Advantage Ltd | app.thecareadvantage.com
// Place alongside app.html, add: <script src="tca-safer-recruitment-module.js"></script>
// ================================================================
(function() {
  'use strict';

  const CATEGORIES = [
    {key:'rtw',label:'Right To Work',icon:'🪪',types:['UK Passport','EU/EEA Passport','BRP Card','Share Code','Visa','Birth Certificate + NI','Certificate of Naturalisation','Other RTW Document']},
    {key:'dbs',label:'DBS Certificate',icon:'🔍',types:['Enhanced DBS','Standard DBS','Basic DBS','Update Service Check','Overseas Criminal Record Check']},
    {key:'id',label:'Proof of Identity',icon:'📋',types:['Passport','Driving Licence','National ID Card','Birth Certificate','Bank Statement','Utility Bill','HMRC Letter','Other ID Document']},
    {key:'refs',label:'References',icon:'📝',types:['Professional Reference 1','Professional Reference 2','Character Reference','Employment Reference','Agency Reference']},
    {key:'quals',label:'Qualifications',icon:'🎓',types:['Level 3 Health & Social Care','Level 4 Health & Social Care','First Aid Certificate','Manual Handling','Safeguarding Certificate','Other Qualification']},
    {key:'contracts',label:'Contracts & Offer',icon:'✍',types:['Offer Letter','Employment Contract','Signed Contract','Job Description','Variation of Contract']},
    {key:'other',label:'Other Documents',icon:'📁',types:['Interview Notes','Application Form','CV','Medical Declaration','Equal Opportunities Form','Other']}
  ];

  function getDocs(staffId) { try{return JSON.parse(localStorage.getItem('tca_docs_'+staffId)||'{}');}catch(e){return{};} }
  function saveDocs(staffId,docs) { localStorage.setItem('tca_docs_'+staffId,JSON.stringify(docs)); }
  function catCount(docs,key) { return(docs[key]&&Array.isArray(docs[key]))?docs[key].length:0; }
  function totalCount(docs) { return Object.values(docs).reduce((s,v)=>s+(Array.isArray(v)?v.length:0),0); }
  function showToast(msg,color) { if(window.showToast){window.showToast(msg,color);return;} const t=document.createElement('div'); t.style.cssText='position:fixed;bottom:20px;right:20px;background:'+(color||'#333')+';color:#fff;padding:10px 18px;border-radius:8px;z-index:99999;font-size:13px;font-weight:600'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3000); }

  window._filterSRTable = function(val) {
    document.querySelectorAll('#sr-tbody tr').forEach(row=>{
      const t=(row.querySelector('td:first-child')?.textContent||'').toLowerCase();
      row.style.display=!val||t.includes(val.toLowerCase())?'':'none';
    });
  };

  window._openStaffSR = function(staffId, staffName, openUpload) {
    const staffObj = (window._allStaffData||[]).find(s=>s.id===staffId);
    if(staffObj && typeof openForm==='function'){
      openForm(staffObj);
      setTimeout(()=>{
        document.querySelectorAll('.form-tab').forEach(t=>{ if(t.textContent.includes('Safer Recruitment')) t.click(); });
        if(openUpload){ setTimeout(()=>{ const btns=document.querySelectorAll('button'); for(const b of btns){if(b.textContent.includes('Upload Document')&&b.offsetParent!==null){b.click();break;}} },600); }
      },400);
    } else { showToast('Opening '+staffName,'#0d6efd'); }
  };

  window.buildSaferRecruitmentPage = async function() {
    const page = document.getElementById('page-safer-recruitment');
    if(!page) return;
    try {
      const staff = window._allStaffData || await window.sbFetch('staff?select=id,name,email,role,status,loc,rtwExpiry,dbsNum,ref1,signedContract&order=name.asc&limit=200');
      window._allStaffData = staff;
      let withDocs=0, allFiles=0;
      const rows = staff.map(s=>{
        const docs=getDocs(s.id); const total=totalCount(docs);
        if(total>0)withDocs++; allFiles+=total;
        const totalBadge=total>0?'<span style="background:#0d6efd;color:#fff;padding:2px 8px;border-radius:10px;font-size:10px">'+total+'✓</span>':'<span style="background:#f8d7da;color:#721c24;padding:2px 8px;border-radius:10px;font-size:10px">None</span>';
        const catCells=CATEGORIES.map(c=>{
          const n=catCount(docs,c.key);
          let hint='';
          if(n===0){if(c.key==='rtw'&&s.rtwExpiry&&s.rtwExpiry!=='NA')hint='📅';if(c.key==='dbs'&&s.dbsNum)hint='📋';if(c.key==='refs'&&s.ref1)hint='📝';if(c.key==='contracts'&&s.signedContract)hint='✍';}
          return '<td style="padding:4px;text-align:center"><span style="background:'+(n>0?'#d4edda':hint?'#fff3cd':'#f5f5f5')+';padding:2px 7px;border-radius:10px;font-size:10px;color:'+(n>0?'#155724':hint?'#856404':'#999')+'">'+(n>0?n+'✓':hint||'—')+'</span></td>';
        }).join('');
        const ne=(s.name||'').replace(/'/g,"\'");
        return '<tr style="border-bottom:1px solid #f5f5f5;cursor:pointer" onmouseenter="this.style.background='#f0f4ff'" onmouseleave="this.style.background=''" onclick="window._openStaffSR('+s.id+',''+ne+'')"><td style="padding:7px 10px;font-weight:600;font-size:12px;position:sticky;left:0;background:inherit;min-width:170px">'+(s.name||'?')+'</td><td style="padding:5px 7px;font-size:11px;color:#666">'+(s.loc||'—')+'</td><td style="padding:5px 7px;font-size:11px;color:#777;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(s.role||'—').substring(0,20)+'</td><td style="padding:4px 7px;text-align:center">'+totalBadge+'</td>'+catCells+'<td style="padding:4px 6px;text-align:center"><button onclick="event.stopPropagation();window._openStaffSR('+s.id+',''+ne+'',true)" style="background:#0d6efd;color:#fff;border:none;border-radius:5px;padding:3px 9px;cursor:pointer;font-size:10px">📤 Upload</button></td></tr>';
      }).join('');

      const today=new Date().toLocaleDateString('en-GB');
      page.innerHTML='<div style="padding:24px;font-family:inherit">'+
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">'+
        '<div>'+
        '<div style="display:flex;align-items:center;gap:10px">'+
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="36" height="36"><circle cx="22" cy="22" r="21" fill="#1C3D6E"/><path d="M22 5 C12 5 4 13 4 23 C4 33 12 41 22 41 C29 41 35 37.5 38.5 32 L32 28.5 C29.5 32 26 34 22 34 C16 34 10 28.5 10 22 C10 15.5 16 10 22 10 C26 10 29.5 12 32 15.5 L38.5 12 C35 6.5 29 5 22 5 Z" fill="white"/><circle cx="22" cy="22" r="8" fill="#1C3D6E"/><rect x="24" y="1" width="22" height="11" fill="#1C3D6E"/></svg>'+
        '<h2 style="margin:0;font-size:21px;color:#1C3D6E">Safer Recruitment</h2></div>'+
        '<div style="font-size:11px;color:#888;margin-top:3px">All '+staff.length+' staff · Click row to open profile · '+today+'</div>'+
        '<div style="font-size:11px;color:#666;margin-top:2px">📅📋📝✍ = data in DB record · ✓ = file uploaded · None = no documents yet</div></div>'+
        '<div style="display:flex;gap:8px;align-items:center">'+
        '<input type="text" placeholder="🔍 Search staff..." onkeyup="window._filterSRTable(this.value)" style="padding:6px 11px;border:1px solid #ccc;border-radius:7px;font-size:12px;width:155px">'+
        '<button onclick="window.buildSaferRecruitmentPage()" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:7px;padding:6px 10px;cursor:pointer;font-size:11px">🔄 Refresh</button>'+
        '<button onclick="window.tcaExportCSV&&tcaExportCSV('docs')" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:7px;padding:6px 10px;cursor:pointer;font-size:11px">📥 Export</button></div></div>'+
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">'+
        '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#0d6efd">'+staff.length+'</div><div style="font-size:11px;color:#888;margin-top:2px">Total Staff</div></div>'+
        '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#28a745">'+withDocs+'</div><div style="font-size:11px;color:#888;margin-top:2px">With Uploaded Files</div></div>'+
        '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#dc3545">'+(staff.length-withDocs)+'</div><div style="font-size:11px;color:#888;margin-top:2px">Awaiting Upload</div></div>'+
        '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#6c757d">'+allFiles+'</div><div style="font-size:11px;color:#888;margin-top:2px">Total Files</div></div>'+
        '</div>'+
        '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden"><div style="overflow:auto;max-height:560px"><table style="border-collapse:collapse;width:100%">'+
        '<thead style="background:#f8f9fa;position:sticky;top:0;z-index:2"><tr>'+
        '<th style="padding:8px 10px;text-align:left;min-width:170px;position:sticky;left:0;background:#f8f9fa;z-index:3;border-bottom:2px solid #dee2e6;font-size:11px">Staff Member</th>'+
        '<th style="padding:8px 6px;text-align:left;min-width:90px;border-bottom:2px solid #dee2e6;font-size:11px">Home</th>'+
        '<th style="padding:8px 6px;text-align:left;min-width:110px;border-bottom:2px solid #dee2e6;font-size:11px">Role</th>'+
        '<th style="padding:8px 6px;text-align:center;min-width:60px;border-bottom:2px solid #dee2e6;font-size:11px">Files</th>'+
        CATEGORIES.map(c=>'<th style="padding:8px 5px;text-align:center;min-width:65px;border-bottom:2px solid #dee2e6;font-size:10px">'+c.icon+' '+c.label.split(' ')[0]+'</th>').join('')+
        '<th style="padding:8px 6px;text-align:center;min-width:65px;border-bottom:2px solid #dee2e6;font-size:11px">Action</th>'+
        '</tr></thead><tbody id="sr-tbody">'+rows+'</tbody></table></div></div></div>';
    } catch(err) {
      page.innerHTML = '<div style="padding:24px"><div style="color:#dc3545">Error: '+err.message+'</div></div>';
    }
  };

  async function init() {
    if(!document.getElementById('page-safer-recruitment')){const d=document.createElement('div');d.id='page-safer-recruitment';d.className='page';document.querySelector('main')?.appendChild(d);}
    window.buildSaferRecruitmentPage();
    document.querySelectorAll('.sb-item,[class*="sb-item"]').forEach(el=>{
      if(el.textContent.trim()==='Safer Recruitment'){
        el.style.cursor='pointer';
        el.addEventListener('click',async function(e){e.preventDefault();e.stopPropagation();await window.buildSaferRecruitmentPage();document.querySelectorAll('.page.active').forEach(p=>p.classList.remove('active'));const p=document.getElementById('page-safer-recruitment');if(p){p.classList.add('active');p.style.removeProperty('display');}});
      }
    });
    console.log('TCA Safer Recruitment Module v2.0 loaded ✅');
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();