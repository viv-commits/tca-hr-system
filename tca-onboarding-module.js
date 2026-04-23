/* TCA Onboarding Module v1.1 */
(function(){
var SB_URL='https://vhebrkhdgeiyxkpphlut.supabase.co';
var _obPreSelectStaffId=null;
function sbq(path,opts){
  var k=(typeof SUPABASE_KEY!=='undefined')?SUPABASE_KEY:'';
  var ar=(sessionStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')||localStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token'));
  var t=k;try{t=JSON.parse(ar).access_token;}catch(e){}
  var h={'Content-Type':'application/json','apikey':k,'Authorization':'Bearer '+t};
  return fetch(SB_URL+path,Object.assign({headers:h},opts));
}
function gv(id){var e=document.getElementById(id);return e?e.value.trim():'';}
function fmtDate(d){if(!d)return '';var x=new Date(d);return x.toLocaleDateString('en-GB');}
function todayISO(){return new Date().toISOString().split('T')[0];}
function getToken(){try{return JSON.parse((sessionStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')||localStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token'))).access_token;}catch(e){return (typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:'');}}
function getKey(){return (typeof SUPABASE_KEY!=='undefined')?SUPABASE_KEY:'';}
function sbPatch(id,payload){
  return fetch(SB_URL+'/rest/v1/onboarding_checklists?id=eq.'+id,{
    method:'PATCH',
    headers:{'Content-Type':'application/json','apikey':getKey(),'Authorization':'Bearer '+getToken(),'Prefer':'return=minimal'},
    body:JSON.stringify(payload)
  });
}

var SECTIONS=[
  {id:'forms',label:'Forms to Return',color:'#3b5bdb',items:[
    {id:'offer_letter',label:'Offer Letter signed and dated'},
    {id:'safer_recruit',label:'Safer Recruitment: Your Offer and Our Commitment signed'},
    {id:'dbs_consent',label:'DBS Principles and Consent Form (page 2 completed)'},
    {id:'equal_opps',label:'Equal Opportunities Monitoring Form (pages 1 and 2 bottom sections)'},
    {id:'id_badge',label:'Staff ID Badge Form + passport-style photo received'},
    {id:'health_decl',label:'Health Declaration Form (pages 3 4 5 and 6 completed)'},
    {id:'hmrc',label:'HMRC Starter Checklist (all 3 pages completed)'}
  ]},
  {id:'rtw',label:'Right to Work Documents',color:'#0ca678',items:[
    {id:'passport',label:'Passport received and verified'},
    {id:'driving_licence',label:'Driving Licence received'},
    {id:'birth_cert',label:'Full Birth Certificate received'},
    {id:'proof_addr1',label:'Proof of Address 1 (within 3 months)'},
    {id:'proof_addr2',label:'Proof of Address 2 (within 3 months)'},
    {id:'dbs_cert_existing',label:'Current DBS Certificate (if on Update Service)'},
    {id:'ni_proof',label:'Proof of National Insurance'},
    {id:'name_change',label:'Name change documentation (if applicable)'}
  ]},
  {id:'overseas',label:'Overseas Applicants (where applicable)',color:'#e67700',items:[
    {id:'overseas_crc',label:'Overseas Criminal Record Certificate'},
    {id:'brp',label:'Biometric Residence Permit (BRP)'},
    {id:'rtw_check',label:'Online Right to Work Check completed'},
    {id:'english_lang',label:'English Language Proficiency Evidence'},
    {id:'tb_cert',label:'TB Certificate'},
    {id:'ecctis',label:'Ecctis Statement of Comparability (qualified social workers)'}
  ]},
  {id:'prestart',label:'Pre-Start and Induction',color:'#862e9c',items:[
    {id:'ref1_requested',label:'Reference 1 requested'},
    {id:'ref1_received',label:'Reference 1 received'},
    {id:'ref2_requested',label:'Reference 2 requested'},
    {id:'ref2_received',label:'Reference 2 received'},
    {id:'dbs_applied',label:'DBS application submitted via TCA'},
    {id:'dbs_received',label:'DBS certificate received'},
    {id:'dbs_update',label:'Registered on DBS Update Service'},
    {id:'originals_verified',label:'Original documents verified on Day 1'},
    {id:'induction_date',label:'Induction date confirmed'},
    {id:'probation_review',label:'Probation review scheduled'}
  ]}
];

var FIELD_MAP={
  offer_letter:['offerLetter'],
  safer_recruit:['signedContract'],
  dbs_consent:['dbsConsent'],
  health_decl:['health'],
  hmrc:['hmrc','hmrcForm'],
  ref1_requested:['ref1'],
  ref1_received:['ref1v','ref1comp'],
  ref2_requested:['ref2'],
  ref2_received:['ref2v','ref2comp'],
  dbs_applied:['dbsConsent'],
  dbs_received:['dbsNum'],
  dbs_update:['dbsUpdate'],
  passport:['passport','rtwDoc'],
  ni_proof:['ni'],
  brp:['brpNum'],
  tb_cert:['tb'],
  rtw_check:['rtwShareCode','rtwValid']
};

function addObNav(){
  if(document.getElementById('ob-nav-btn'))return;
  var a=document.getElementById('admin-nav-btn');
  if(!a)return;
  var b=document.createElement('button');
  b.className='hdr-btn';b.id='ob-nav-btn';
  b.setAttribute('onclick',"showPage('onboarding',this)");
  b.innerHTML='&#128203; Onboarding';
  a.parentNode.insertBefore(b,a);
}

var _PAGE_B64='PGRpdiBjbGFzcz0icGFnZS1oZWFkZXIiPjxoMSBzdHlsZT0iZm9udC1zaXplOjEuNnJlbTtmb250LXdlaWdodDo3MDA7Y29sb3I6IzFlMjkzYiI+JiMxMjgyMDM7IFN0YWZmIE9uYm9hcmRpbmc8L2gxPjwvZGl2PjxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6MTJweDttYXJnaW4tYm90dG9tOjE4cHg7ZmxleC13cmFwOndyYXAiPjxidXR0b24gb25jbGljaz0ib2JTaG93VGFiKCdsaXN0JykiIGlkPSJvYi10YWItbGlzdCIgc3R5bGU9InBhZGRpbmc6OHB4IDE4cHg7Ym9yZGVyLXJhZGl1czo2cHg7Ym9yZGVyOjJweCBzb2xpZCAjM2I1YmRiO2JhY2tncm91bmQ6IzNiNWJkYjtjb2xvcjojZmZmO2ZvbnQtd2VpZ2h0OjYwMDtjdXJzb3I6cG9pbnRlciI+JiMxMjgxMDE7IEFsbCBTdGFmZjwvYnV0dG9uPjxidXR0b24gb25jbGljaz0ib2JTaG93VGFiKCduZXcnKSIgaWQ9Im9iLXRhYi1uZXciIHN0eWxlPSJwYWRkaW5nOjhweCAxOHB4O2JvcmRlci1yYWRpdXM6NnB4O2JvcmRlcjoycHggc29saWQgIzNiNWJkYjtiYWNrZ3JvdW5kOiNmZmY7Y29sb3I6IzNiNWJkYjtmb250LXdlaWdodDo2MDA7Y3Vyc29yOnBvaW50ZXIiPisgTmV3IENoZWNrbGlzdDwvYnV0dG9uPjxidXR0b24gb25jbGljaz0ib2JFeHBvcnQoKSIgc3R5bGU9InBhZGRpbmc6OHB4IDE4cHg7Ym9yZGVyLXJhZGl1czo2cHg7Ym9yZGVyOjJweCBzb2xpZCAjMGNhNjc4O2JhY2tncm91bmQ6I2ZmZjtjb2xvcjojMGNhNjc4O2ZvbnQtd2VpZ2h0OjYwMDtjdXJzb3I6cG9pbnRlciI+JiMxMjgyMjk7IEV4cG9ydCBBbGw8L2J1dHRvbj48L2Rpdj48ZGl2IGlkPSJvYi10YWItY29udGVudCI+PC9kaXY+';
function buildObPage(){
  return decodeURIComponent(escape(atob(_PAGE_B64)));
}

window.obShowTab=function(tab,preStaffId){
  if(preStaffId)_obPreSelectStaffId=preStaffId;
  var tl=document.getElementById('ob-tab-list');
  var tn=document.getElementById('ob-tab-new');
  if(tl){tl.style.background=tab==='list'?'#3b5bdb':'#fff';tl.style.color=tab==='list'?'#fff':'#3b5bdb';}
  if(tn){tn.style.background=tab==='new'?'#3b5bdb':'#fff';tn.style.color=tab==='new'?'#fff':'#3b5bdb';}
  var c=document.getElementById('ob-tab-content');
  if(!c)return;
  if(tab==='list'){obLoadList(c);}
  else if(tab==='new'){obShowNewForm(c);}
};

window.obLoadList=function(container){
  container.innerHTML='<div style="text-align:center;padding:30px;color:#64748b">Loading...</div>';
  sbq('/rest/v1/onboarding_checklists?select=id,staff_name,staff_role,start_date,status,progress,created_at&order=created_at.desc')
  .then(function(r){return r.json();})
  .then(function(rows){
    // Home filtering for non-admin users
    var _obUserHomes=window._tcaUserHomes||[];var _obUserRole=window._tcaUserRole||'admin';
    if(_obUserRole!=='admin'&&_obUserHomes.length>0&&window.STAFF&&window.STAFF.length){
      var staffLocMap={};window.STAFF.forEach(function(s){staffLocMap[s.id]=s.loc;});
      rows=rows.filter(function(r){return _obUserHomes.includes(staffLocMap[r.staff_id]);});
    }
    if(!Array.isArray(rows)||rows.length===0){
      container.innerHTML='<div style="text-align:center;padding:40px;color:#64748b"><p style="font-size:1.1rem">No onboarding records yet.</p><p>Click <b>+ New Checklist</b> to add your first.</p></div>';
      return;
    }
    var grid=document.createElement('div');
    grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px';
    rows.forEach(function(r){
      var pct=r.progress||0;
      var statusColor=r.status==='cleared'?'#0ca678':r.status==='in_progress'?'#e67700':'#64748b';
      var statusLabel=r.status==='cleared'?'Cleared to Start':r.status==='in_progress'?'In Progress':'Not Started';
      var card=document.createElement('div');
      card.style.cssText='background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,.06)';
      var top=document.createElement('div');
      top.style.cssText='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px';
      var info=document.createElement('div');
      info.innerHTML='<div style="font-weight:700;font-size:1.05rem;color:#1e293b">'+r.staff_name+'</div>'+'<div style="color:#64748b;font-size:.85rem">'+r.staff_role+'</div>'+(r.start_date?'<div style="color:#64748b;font-size:.82rem">Start: '+fmtDate(r.start_date)+'</div>':'')+'</div>';
      var badge=document.createElement('span');
      badge.style.cssText='background:'+statusColor+';color:#fff;padding:3px 10px;border-radius:12px;font-size:.78rem;font-weight:600;white-space:nowrap';
      badge.textContent=statusLabel;
      top.appendChild(info);top.appendChild(badge);
      var prog=document.createElement('div');
      prog.style.cssText='margin-bottom:10px';
      prog.innerHTML='<div style="display:flex;justify-content:space-between;font-size:.82rem;color:#64748b;margin-bottom:4px"><span>Progress</span><span><b>'+pct+'</b>%</span></div><div style="background:#e2e8f0;border-radius:4px;height:8px"><div style="background:'+(pct>=100?'#0ca678':pct>50?'#3b5bdb':'#e67700')+';width:'+pct+'%;height:8px;border-radius:4px"></div></div>';
      var btn=document.createElement('button');
      btn.style.cssText='width:100%;padding:8px;background:#3b5bdb;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer';
      btn.textContent='View Checklist';
      btn.onclick=function(){obOpenChecklist(r.id);};
      var delBtn=document.createElement('button');
      delBtn.style.cssText='width:100%;padding:6px;background:#fff;color:#dc2626;border:1px solid #dc2626;border-radius:6px;font-weight:600;cursor:pointer;margin-top:6px;font-size:.85rem';
      delBtn.textContent='Delete';
      delBtn.onclick=(function(rid,rname){return function(){
        if(confirm('Delete onboarding record for '+rname+'? This cannot be undone.')){
          obDeleteRecord(rid,container);
        }
      };})(r.id,r.staff_name);
      card.appendChild(top);card.appendChild(prog);card.appendChild(btn);card.appendChild(delBtn);
      grid.appendChild(card);
    });
    container.innerHTML='';
    container.appendChild(grid);
  }).catch(function(){container.innerHTML='<div style="color:red;padding:20px">Failed to load. Check Supabase connection.</div>';});
};

window.obShowNewForm=function(container){
  var wrap=document.createElement('div');
  wrap.style.cssText='background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;max-width:560px';
  var fields=[
    {id:'ob-name',label:'STAFF NAME',type:'text',ph:'Full name'},
    {id:'ob-role',label:'JOB ROLE',type:'text',ph:'e.g. Support Worker'},
    {id:'ob-home',label:'HOME / LOCATION',type:'text',ph:'e.g. Cambria, Spring Lodge'},
    {id:'ob-start',label:'PROPOSED START DATE',type:'date',ph:''},
    {id:'ob-email',label:'EMAIL ADDRESS',type:'email',ph:'staff@email.com'}
  ];
  var h='<h3 style="margin:0 0 18px;color:#1e293b;font-size:1.1rem">New Staff Onboarding Checklist</h3><div style="display:grid;gap:14px">';
  fields.forEach(function(f){
    h+='<div><label style="display:block;font-size:.82rem;font-weight:600;color:#374151;margin-bottom:4px">'+f.label+'</label>';
    h+='<input id="'+f.id+'" type="'+f.type+'" placeholder="'+f.ph+'" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:.9rem;box-sizing:border-box"></div>';
  });
  h+='<div><label style="display:block;font-size:.82rem;font-weight:600;color:#374151;margin-bottom:4px">OVERSEAS APPLICANT?</label>';
  h+='<select id="ob-overseas" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:.9rem;box-sizing:border-box"><option value="no">No</option><option value="yes">Yes</option></select></div>';
  h+='<div><label style="display:block;font-size:.82rem;font-weight:600;color:#374151;margin-bottom:4px">LINK TO STAFF PROFILE (optional â enables auto-sync)</label>';
  h+='<select id="ob-staff-id" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:.9rem;box-sizing:border-box" onchange="obAutoFillFromStaff(this.value)">';
  h+='<option value="">-- Select staff member to link --</option>';
  if(window.STAFF&&window.STAFF.length){var _obHomes=window._tcaUserHomes||[];var _obRole=window._tcaUserRole||'admin';var _obFiltered=(_obRole!=='admin'&&_obHomes.length>0)?window.STAFF.filter(function(s){return _obHomes.includes(s.loc);}):window.STAFF;var sorted=[].concat(_obFiltered).sort(function(a,b){return a.name.localeCompare(b.name);});sorted.forEach(function(s){h+='<option value="'+s.id+'">'+s.name+(s.loc?' ('+s.loc+')':'')+'</option>';});}
  h+='</select></div>';
  h+='</div><div style="display:flex;gap:10px;margin-top:20px">';
  wrap.innerHTML=h;
  var createBtn=document.createElement('button');
  createBtn.style.cssText='flex:1;padding:10px;background:#3b5bdb;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:.95rem';
  createBtn.textContent='Create Checklist';
  createBtn.onclick=obCreateChecklist;
  var cancelBtn=document.createElement('button');
  cancelBtn.style.cssText='padding:10px 18px;background:#f1f5f9;color:#374151;border:1px solid #d1d5db;border-radius:6px;font-weight:600;cursor:pointer';
  cancelBtn.textContent='Cancel';
  cancelBtn.onclick=function(){obShowTab('list');};
  var btnRow=document.createElement('div');
  btnRow.style.cssText='display:flex;gap:10px;margin-top:20px';
  btnRow.appendChild(createBtn);btnRow.appendChild(cancelBtn);
  wrap.appendChild(btnRow);
  container.innerHTML='';
  container.appendChild(wrap);
  // Apply preselected staff if set (from "Create & link" button in staff profile)
  if(_obPreSelectStaffId){
    var selEl=document.getElementById('ob-staff-id');
    if(selEl){
      selEl.value=String(_obPreSelectStaffId);
      if(typeof window.obAutoFillFromStaff==='function')window.obAutoFillFromStaff(String(_obPreSelectStaffId));
    }
    _obPreSelectStaffId=null; // clear after use
  }
};

window.obCreateChecklist=function(){
  var name=gv('ob-name'),role=gv('ob-role'),home=gv('ob-home'),start=gv('ob-start'),email=gv('ob-email'),overseas=gv('ob-overseas');
  if(!name){alert('Please enter staff name.');return;}
  var items={};
  SECTIONS.forEach(function(s){s.items.forEach(function(i){items[i.id]={done:false,date:null,by:null};});});
  var sid=gv('ob-staff-id');var payload={staff_name:name,staff_role:role,home_location:home,start_date:start||null,email:email,overseas:overseas==='yes',status:'not_started',progress:0,checklist_data:items,staff_id:sid?parseInt(sid):null};
  sbq('/rest/v1/onboarding_checklists',{method:'POST',body:JSON.stringify(payload),headers:{'Prefer':'return=representation','Content-Type':'application/json','apikey':getKey(),'Authorization':'Bearer '+getToken()}})
  .then(function(r){return r.json();})
  .then(function(d){
    var id=Array.isArray(d)?d[0].id:d.id;
    obOpenChecklist(id);
  }).catch(function(e){alert('Error: '+e.message);});
};

window.obOpenChecklist=function(id){
  var c=document.getElementById('ob-tab-content');
  c.innerHTML='<div style="text-align:center;padding:30px;color:#64748b">Loading checklist...</div>';
  sbq('/rest/v1/onboarding_checklists?id=eq.'+id+'&select=*')
  .then(function(r){return r.json();})
  .then(function(rows){
    if(!rows||!rows[0]){c.innerHTML='<div style="color:red">Record not found.</div>';return;}
    window._obCurrent=rows[0];
    obRenderChecklist(rows[0],c);
  });
};

window.obRenderChecklist=function(rec,container){
  var items=rec.checklist_data||{};
  var overseas=rec.overseas;
  var totalItems=0,doneItems=0;
  SECTIONS.forEach(function(s){
    if(s.id==='overseas'&&!overseas)return;
    s.items.forEach(function(i){totalItems++;if(items[i.id]&&items[i.id].done)doneItems++;});
  });
  var pct=totalItems>0?Math.round((doneItems/totalItems)*100):0;
  var statusColor=pct===100?'#0ca678':pct>0?'#e67700':'#64748b';
  var statusLabel=pct===100?'Cleared to Start':pct>0?'In Progress':'Not Started';
  var wrap=document.createElement('div');
  wrap.style.maxWidth='800px';
  var topBar=document.createElement('div');
  topBar.style.cssText='display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap';
  var backBtn=document.createElement('button');
  backBtn.style.cssText='padding:6px 14px;background:#f1f5f9;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:.85rem';
  backBtn.innerHTML='&#8592; Back';
  backBtn.onclick=function(){obShowTab('list');};
  var nameDiv=document.createElement('div');
  nameDiv.style.flex='1';
  nameDiv.innerHTML='<span style="font-size:1.3rem;font-weight:700;color:#1e293b">'+rec.staff_name+'</span> <span style="color:#64748b;font-size:.9rem">&#8212; '+rec.staff_role+(rec.home_location?' @ '+rec.home_location:'')+'</span>';
  var statusBadge=document.createElement('span');
  statusBadge.style.cssText='background:'+statusColor+';color:#fff;padding:4px 12px;border-radius:12px;font-size:.82rem;font-weight:600';
  statusBadge.textContent=statusLabel;
  topBar.appendChild(backBtn);topBar.appendChild(nameDiv);topBar.appendChild(statusBadge);
  var progBox=document.createElement('div');
  progBox.style.cssText='background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:18px';
  progBox.innerHTML='<div style="display:flex;justify-content:space-between;font-size:.85rem;color:#64748b;margin-bottom:8px"><span>Overall Progress</span><span><b>'+doneItems+'</b> of '+totalItems+' items complete ('+pct+'%)</span></div><div style="background:#e2e8f0;border-radius:6px;height:12px"><div style="background:'+(pct===100?'#0ca678':pct>50?'#3b5bdb':'#e67700')+';width:'+pct+'%;height:12px;border-radius:6px"></div></div>';
  wrap.appendChild(topBar);wrap.appendChild(progBox);
  SECTIONS.forEach(function(s){
    var secEl=document.createElement('div');
    secEl.style.cssText='background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:14px';
    if(s.id==='overseas'&&!overseas){
      secEl.style.opacity='0.5';
      secEl.innerHTML='<div style="font-weight:700;color:#94a3b8;font-size:.95rem">'+s.label+' <span style="font-size:.78rem;font-weight:400">(Not applicable - toggle below to enable)</span></div>';
      wrap.appendChild(secEl);return;
    }
    var secDone=0;
    s.items.forEach(function(i){if(items[i.id]&&items[i.id].done)secDone++;});
    var secHead=document.createElement('div');
    secHead.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:12px';
    secHead.innerHTML='<div style="width:10px;height:10px;border-radius:50%;background:'+s.color+'"></div><span style="font-weight:700;color:#1e293b;font-size:.98rem">'+s.label+'</span><span style="margin-left:auto;font-size:.82rem;color:#64748b">'+secDone+'/'+s.items.length+'</span>';
    secEl.appendChild(secHead);
    s.items.forEach(function(i){
      var iData=items[i.id]||{done:false,date:null,by:null};
      var row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9';
      var chk=document.createElement('input');
      chk.type='checkbox';chk.checked=iData.done;
      chk.style.cssText='width:18px;height:18px;cursor:pointer;accent-color:'+s.color;
      chk.onchange=(function(itemId){return function(){obToggleItem(rec.id,itemId);};})(i.id);
      var lbl=document.createElement('span');
      lbl.style.cssText='flex:1;color:'+(iData.done?'#94a3b8':'#1e293b')+';text-decoration:'+(iData.done?'line-through':'none')+';font-size:.9rem';
      lbl.textContent=i.label;
      row.appendChild(chk);row.appendChild(lbl);
      if(iData.done){
        var meta=document.createElement('span');
        meta.style.cssText='font-size:.78rem;color:#64748b;white-space:nowrap';
        var autoLabel=iData.source==='auto'?'<span style="background:#e0f2fe;color:#0369a1;font-size:.75rem;padding:1px 5px;border-radius:4px;margin-left:4px">&#128279; auto</span>':'';
        meta.innerHTML=(iData.date?fmtDate(iData.date)+' ':'')+(iData.by?'by '+iData.by:'')+autoLabel;
        row.appendChild(meta);
      }
      secEl.appendChild(row);
    });
    wrap.appendChild(secEl);
  });
  var footBar=document.createElement('div');
  footBar.style.cssText='display:flex;gap:10px;margin-top:10px;flex-wrap:wrap';
  var printBtn=document.createElement('button');
  printBtn.style.cssText='padding:10px 18px;background:#1e293b;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer';
  printBtn.innerHTML='&#128424; Print / PDF';
  printBtn.onclick=obPrintChecklist;
  var ovBtn=document.createElement('button');
  ovBtn.style.cssText='padding:10px 18px;background:#e67700;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer';
  ovBtn.textContent=overseas?'Disable Overseas Section':'Enable Overseas Section';
  ovBtn.onclick=function(){obToggleOverseas(rec.id);};
  if(rec.staff_id){
    var syncBtn=document.createElement('button');
    syncBtn.style.cssText='padding:10px 18px;background:#0ca678;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer';
    syncBtn.innerHTML='&#128259; Sync from staff profile';
    syncBtn.onclick=function(){obSyncChecklist(rec.id);};
    footBar.appendChild(syncBtn);
  }
  footBar.appendChild(printBtn);footBar.appendChild(ovBtn);
  wrap.appendChild(footBar);
  container.innerHTML='';
  container.appendChild(wrap);
};

window.obToggleItem=function(recId,itemId){
  var rec=window._obCurrent;
  if(!rec)return;
  var items=rec.checklist_data||{};
  if(!items[itemId])items[itemId]={done:false,date:null,by:null};
  var nowDone=!items[itemId].done;
  var byName='admin';
  try{var u=JSON.parse((sessionStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')||localStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')));byName=u.user&&u.user.email?u.user.email.split('@')[0]:'admin';}catch(e){}
  items[itemId]={done:nowDone,date:nowDone?todayISO():null,by:nowDone?byName:null};
  rec.checklist_data=items;
  var totalItems=0,doneItems=0;
  SECTIONS.forEach(function(s){
    if(s.id==='overseas'&&!rec.overseas)return;
    s.items.forEach(function(i){totalItems++;if(items[i.id]&&items[i.id].done)doneItems++;});
  });
  var pct=totalItems>0?Math.round((doneItems/totalItems)*100):0;
  var status=pct===100?'cleared':pct>0?'in_progress':'not_started';
  sbPatch(recId,{checklist_data:items,progress:pct,status:status}).then(function(){
    obRenderChecklist(rec,document.getElementById('ob-tab-content'));
  });
};

window.obToggleOverseas=function(recId){
  var rec=window._obCurrent;if(!rec)return;
  rec.overseas=!rec.overseas;
  sbPatch(recId,{overseas:rec.overseas}).then(function(){
    obRenderChecklist(rec,document.getElementById('ob-tab-content'));
  });
};

window.obPrintChecklist=function(){
  var rec=window._obCurrent;if(!rec)return;
  var items=rec.checklist_data||{},overseas=rec.overseas;
  var totalItems=0,doneItems=0;
  SECTIONS.forEach(function(s){if(s.id==='overseas'&&!overseas)return;s.items.forEach(function(i){totalItems++;if(items[i.id]&&items[i.id].done)doneItems++;});});
  var pct=totalItems>0?Math.round((doneItems/totalItems)*100):0;
  var pctColor=pct===100?'#0ca678':pct>50?'#3b5bdb':'#e67700';
  var pctLabel=pct===100?'Cleared to Start':pct>0?'In Progress':'Not Started';
  var lines=[];
  lines.push('<!DOCTYPE html><html><head><meta charset=UTF-8>');
  lines.push('<title>Onboarding - '+rec.staff_name+'</title>');
  lines.push('<style>body{font-family:Arial,sans-serif;margin:30px;color:#1e293b}');
  lines.push('.sec{margin-top:20px;page-break-inside:avoid}');
  lines.push('.sec-title{font-weight:700;font-size:1rem;padding:6px 0;border-bottom:2px solid #3b5bdb;margin-bottom:8px}');
  lines.push('.item{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:.88rem}');
  lines.push('.box{width:14px;height:14px;border:1.5px solid #94a3b8;flex-shrink:0;margin-top:1px}');
  lines.push('.dbox{background:#0ca678;border-color:#0ca678}');
  lines.push('.meta{margin-left:auto;color:#94a3b8;font-size:.78rem;padding-left:8px}');
  lines.push('.sk{text-decoration:line-through;color:#94a3b8}</style></head><body>');
  lines.push('<div style="display:flex;justify-content:space-between">');
  lines.push('<div><h1 style="font-size:1.4rem;margin:0">Staff Onboarding Checklist</h1>');
  lines.push('<p style="margin:4px 0;color:#64748b">'+rec.staff_name+' &mdash; '+rec.staff_role+(rec.home_location?' @ '+rec.home_location:'')+'</p>');
  if(rec.start_date)lines.push('<p style="margin:4px 0;font-size:.85rem;color:#64748b">Start: '+fmtDate(rec.start_date)+'</p>');
  lines.push('</div><div style="text-align:right"><div style="font-size:1.8rem;font-weight:700;color:'+pctColor+'">'+pct+'%</div>');
  lines.push('<div style="font-size:.82rem;color:#64748b">'+pctLabel+'</div></div></div>');
  lines.push('<p style="font-size:.78rem;color:#94a3b8">Printed: '+new Date().toLocaleString('en-GB')+'</p>');
  SECTIONS.forEach(function(s){
    if(s.id==='overseas'&&!overseas)return;
    lines.push('<div class=sec><div class=sec-title>'+s.label+'</div>');
    s.items.forEach(function(i){
      var d=items[i.id]||{done:false,date:null,by:null};
      var meta=d.done?((d.date?fmtDate(d.date)+' ':'')+( d.by?'by '+d.by:'')):'';
      lines.push('<div class=item><div class="'+(d.done?'dbox':'box')+'"></div>');
      lines.push('<span class="'+(d.done?'sk':'')+'">'+i.label+'</span>');
      if(meta)lines.push('<div class=meta>'+meta+'</div>');
      lines.push('</div>');
    });
    lines.push('</div>');
  });
  lines.push('</body></html>');
  var w=window.open('','_blank');
  w.document.write(lines.join(''));
  w.document.close();
  w.print();
};

window.obDeleteRecord=function(id,container){
  var k=getKey(),t=getToken();
  fetch(SB_URL+'/rest/v1/onboarding_checklists?id=eq.'+id,{
    method:'DELETE',
    headers:{'Content-Type':'application/json','apikey':k,'Authorization':'Bearer '+t,'Prefer':'return=minimal'}
  }).then(function(r){
    if(r.ok){obLoadList(container||document.getElementById('ob-tab-content'));}
    else{alert('Delete failed. Please try again.');}
  }).catch(function(){alert('Delete failed. Check connection.');});
};

window.obExport=function(){
  sbq('/rest/v1/onboarding_checklists?select=*&order=created_at.desc')
  .then(function(r){return r.json();})
  .then(function(rows){
    if(!Array.isArray(rows)||rows.length===0){alert('No data to export.');return;}
    var allItems=[];
    SECTIONS.forEach(function(s){s.items.forEach(function(i){allItems.push({section:s.label,item:i.label,id:i.id});});});
    var headers=['Staff Name','Role','Home','Start Date','Email','Overseas','Status','Progress %','Created'];
    allItems.forEach(function(i){headers.push(i.section+': '+i.item);headers.push(i.id+'_date');headers.push(i.id+'_by');});
    var csvRows=[headers.join(',')];
    rows.forEach(function(r){
      var cd=r.checklist_data||{};
      var row=['"'+(r.staff_name||'')+'"','"'+(r.staff_role||'')+'"','"'+(r.home_location||'')+'"',
        r.start_date||'','"'+(r.email||'')+'"',r.overseas?'Yes':'No',
        r.status||'',r.progress||0,r.created_at?r.created_at.split('T')[0]:''];
      allItems.forEach(function(i){
        var d=cd[i.id]||{};
        row.push(d.done?'Yes':'No');
        row.push(d.date||'');
        row.push('"'+(d.by||'')+'"');
      });
      csvRows.push(row.join(','));
    });
    var blob=new Blob([csvRows.join('\n')],{type:'text/csv'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;a.download='TCA-Onboarding-'+todayISO()+'.csv';a.click();
    URL.revokeObjectURL(url);
  });
};

function obInitPage(){
  if(document.getElementById('page-onboarding'))return;
  var main=document.querySelector('.main')||document.querySelector('main')||document.body;
  var div=document.createElement('div');
  div.id='page-onboarding';div.className='page';div.style.display='none';
  div.innerHTML=buildObPage();
  main.appendChild(div);
}

window.obAutoFillFromStaff=function(staffId){
  if(!staffId||!window.STAFF)return;
  var s=window.STAFF.find(function(x){return String(x.id)===String(staffId);});
  if(!s)return;
  var nameEl=document.getElementById('ob-name');
  var roleEl=document.getElementById('ob-role');
  var homeEl=document.getElementById('ob-home');
  var startEl=document.getElementById('ob-start');
  var emailEl=document.getElementById('ob-email');
  if(nameEl)nameEl.value=s.name||'';
  if(roleEl)roleEl.value=s.role||'';
  if(homeEl)homeEl.value=s.loc||'';
  if(startEl&&!startEl.value)startEl.value=s.start||'';
  if(emailEl&&!emailEl.value)emailEl.value=s.email||'';
};

function obBuildSyncedItems(staffRec,existingItems){
  var items=JSON.parse(JSON.stringify(existingItems||{}));
  var byName='system';
  try{var u=JSON.parse((sessionStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')||localStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')));byName=u.user&&u.user.email?u.user.email.split('@')[0]:'system';}catch(e){}
  var today=todayISO();
  Object.keys(FIELD_MAP).forEach(function(itemId){
    var fields=FIELD_MAP[itemId];
    var hasValue=fields.some(function(f){return staffRec[f]&&staffRec[f]!==''&&staffRec[f]!=='NA';});
    if(hasValue&&!(items[itemId]&&items[itemId].done)){
      items[itemId]={done:true,date:today,by:byName,source:'auto'};
    }
  });
  return items;
}

window.obSyncChecklist=function(checklistId){
  var rec=window._obCurrent;
  if(!rec||!rec.staff_id){alert('No staff profile linked to this checklist. Please link a staff member first.');return;}
  var staffRec=window.STAFF&&window.STAFF.find(function(s){return s.id===rec.staff_id;});
  if(!staffRec){alert('Linked staff member not found. They may have been removed.');return;}
  var updatedItems=obBuildSyncedItems(staffRec,rec.checklist_data);
  var totalItems=0,doneItems=0;
  SECTIONS.forEach(function(s){
    if(s.id==='overseas'&&!rec.overseas)return;
    s.items.forEach(function(i){totalItems++;if(updatedItems[i.id]&&updatedItems[i.id].done)doneItems++;});
  });
  var pct=totalItems>0?Math.round((doneItems/totalItems)*100):0;
  var status=pct===100?'cleared':pct>0?'in_progress':'not_started';
  sbPatch(checklistId,{checklist_data:updatedItems,progress:pct,status:status,last_synced_at:new Date().toISOString()})
  .then(function(r){
    if(r.ok){rec.checklist_data=updatedItems;rec.progress=pct;rec.status=status;
      var c=document.getElementById('ob-tab-content');
      if(c)obRenderChecklist(rec,c);
      if(typeof toast==='function')toast('Checklist synced from staff profile');
    }else{alert('Sync failed. Please try again.');}
  }).catch(function(e){alert('Sync error: '+e.message);});
};

window.obAutoSync=function(staffId){
  if(!staffId||!window.STAFF)return;
  var staffRec=window.STAFF.find(function(s){return s.id===staffId;});
  if(!staffRec)return;
  var _obQuery=function(){
    return sbq('/rest/v1/onboarding_checklists?staff_id=eq.'+staffId+'&select=*')
      .then(function(r){return r.json();})
      .then(function(rows){
        if(!Array.isArray(rows)||!rows.length){
          var nm=encodeURIComponent(staffRec.name||'');
          return sbq('/rest/v1/onboarding_checklists?staff_name=eq.'+nm+'&select=*').then(function(r2){return r2.json();});
        }
        return rows;
      })
      .catch(function(){
        var nm=encodeURIComponent(staffRec.name||'');
        return sbq('/rest/v1/onboarding_checklists?staff_name=eq.'+nm+'&select=*').then(function(r2){return r2.json();});
      });
  };
  _obQuery()
  .then(function(rows){
    if(!Array.isArray(rows)||!rows[0])return;
    var rec=rows[0];
    var updatedItems=obBuildSyncedItems(staffRec,rec.checklist_data);
    var totalItems=0,doneItems=0;
    SECTIONS.forEach(function(s){
      if(s.id==='overseas'&&!rec.overseas)return;
      s.items.forEach(function(i){totalItems++;if(updatedItems[i.id]&&updatedItems[i.id].done)doneItems++;});
    });
    var pct=totalItems>0?Math.round((doneItems/totalItems)*100):0;
    var status=pct===100?'cleared':pct>0?'in_progress':'not_started';
    sbPatch(rec.id,{checklist_data:updatedItems,progress:pct,status:status,last_synced_at:new Date().toISOString()});
  }).catch(function(){});
};

function boot(){
  addObNav();
  obInitPage();
  // showPage() in app.html now handles all page switching + calls obShowTab('list') when navigating to onboarding
  // No need to override showPage here - removing display manipulation that caused navigation bugs
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',boot);}else{boot();}
})();
