// TCA Safer Recruitment Module v3.0
// Role-aware: Admin sees all, RM sees own homes only + SR Sign-Off per staff member
(function(){
'use strict';
var SURL='https://vhebrkhdgeiyxkpphlut.supabase.co';
var CATS=[
  {key:'rtw',label:'Right To Work',icon:'&#x1FA96;'},
  {key:'dbs',label:'DBS Certificate',icon:'&#x1F50D;'},
  {key:'id',label:'Proof of Identity',icon:'&#x1F4CB;'},
  {key:'refs',label:'References',icon:'&#x1F4DD;'},
  {key:'quals',label:'Qualifications',icon:'&#x1F393;'},
  {key:'contr',label:'Contracts',icon:'&#x270D;'},
  {key:'other',label:'Other',icon:'&#x1F4C1;'}
];
var _role='admin',_homes=[],_email='',_dname='';
function sbH(){
  var k=(typeof SUPABASE_KEY!=='undefined')?SUPABASE_KEY:'';
  var ar=(sessionStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')||localStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token'));
  var t=k;try{t=JSON.parse(ar).access_token;}catch(e){}
  return{'Content-Type':'application/json','apikey':k,'Authorization':'Bearer '+t};
}
function toast(m,c){if(window.showToast){window.showToast(m,c);return;}var el=document.createElement('div');el.style.cssText='position:fixed;bottom:24px;right:24px;background:'+(c||'#1C3D6E')+';color:#fff;padding:12px 20px;border-radius:8px;z-index:99999;font-size:13px;font-weight:600';el.textContent=m;document.body.appendChild(el);setTimeout(function(){el.remove();},3500);}
function eH(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function eJ(s){return(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}

async function loadRole(){
  try{
    var ar=(sessionStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')||localStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token'));
    var em='';try{em=JSON.parse(ar).user.email;}catch(e){}
    if(!em&&window._currentUserEmail)em=window._currentUserEmail;
    if(!em)return;
    _email=em;
    var r=await fetch(SURL+'/rest/v1/user_roles?email=eq.'+encodeURIComponent(em)+'&select=role,homes,display_name',{headers:sbH()});
    var j=await r.json();
    if(j&&j[0]){_role=j[0].role||'admin';_homes=j[0].homes||[];_dname=j[0].display_name||em.split('@')[0];}
    window._tcaUserRole=_role;window._tcaUserHomes=_homes;window._tcaDisplayName=_dname;
  }catch(e){console.warn('SR loadRole:',e);}
}

async function loadDocCounts(){
  try{
    var r=await fetch(SURL+'/rest/v1/staff_documents?select=staff_id,category',{headers:sbH()});
    var j=await r.json();
    if(!Array.isArray(j))return{};
    var map={};
    j.forEach(function(d){if(!map[d.staff_id])map[d.staff_id]={};map[d.staff_id][d.category]=(map[d.staff_id][d.category]||0)+1;});
    return map;
  }catch(e){return{};}
}

window._filterSRTable=function(val){
  document.querySelectorAll('#sr-tbody tr').forEach(function(row){
    var t=(row.querySelector('td:first-child')||{}).textContent||'';
    row.style.display=!val||t.toLowerCase().includes(val.toLowerCase())?'':'none';
  });
};

window._srSignOff=async function(sid,sname,shome,approved){
  if(approved){
    if(!confirm('Remove SR approval for '+sname+'?'))return;
    var r=await fetch(SURL+'/rest/v1/staff?id=eq.'+sid,{method:'PATCH',headers:Object.assign({'Prefer':'return=minimal'},sbH()),body:JSON.stringify({sr_approved:false,sr_approved_by:null,sr_approved_at:null,sr_approved_home:null})});
    if(r.ok){toast('Approval removed','#6c757d');window.buildSaferRecruitmentPage();}
    else toast('Error removing','#dc3545');
    return;
  }
  var h=shome||'this home';
  if(!confirm('SAFER RECRUITMENT SIGN-OFF\n\nI confirm I have reviewed all safer recruitment documents for:\n\n'+sname+' ('+h+')\n\nand approve them to work at '+h+'.\n\nSigning off as: '+(_dname||_email)+'\n\nClick OK to confirm.'))return;
  var r=await fetch(SURL+'/rest/v1/staff?id=eq.'+sid,{method:'PATCH',headers:Object.assign({'Prefer':'return=minimal'},sbH()),body:JSON.stringify({sr_approved:true,sr_approved_by:_dname||_email,sr_approved_at:new Date().toISOString(),sr_approved_home:shome||''})});
  if(r.ok){toast('\u2705 '+sname+' approved by '+(_dname||_email),'#28a745');window.buildSaferRecruitmentPage();}
  else toast('Error saving','#dc3545');
};

window.buildSaferRecruitmentPage=async function(){
  var page=document.getElementById('page-safer-recruitment');
  if(!page){page=document.createElement('div');page.id='page-safer-recruitment';page.className='page';var m=document.querySelector('main')||document.body;m.appendChild(page);}
  page.innerHTML='<div style="padding:24px;color:#888;text-align:center">Loading safer recruitment...</div>';
  try{
    await loadRole();
    var isAdmin=(_role==='admin'||!_role);
    var isRM=(_role==='rm');
    var staffUrl=SURL+'/rest/v1/staff?select=id,name,role,loc,status,sr_approved,sr_approved_by,sr_approved_at,sr_approved_home&order=name.asc&limit=300';
    var r=await fetch(staffUrl,{headers:sbH()});
    var all=await r.json();
    if(!Array.isArray(all))all=[];
    var staff=all.filter(function(s){return !s.status||s.status==='Active'||s.status===null||s.status===''||s.status==='active';});
    if(isRM&&_homes.length>0)staff=staff.filter(function(s){return _homes.indexOf(s.loc)>-1;});
    window._allStaffData=all;
    var docMap=await loadDocCounts();
    var approved=staff.filter(function(s){return s.sr_approved;}).length;
    var withDocs=staff.filter(function(s){var dm=docMap[s.id]||{};return Object.values(dm).reduce(function(a,b){return a+b;},0)>0;}).length;
    var today=new Date().toLocaleDateString('en-GB');
    var rmBanner=isRM?'<div style="background:#e8f4fd;border:1px solid #b8dcf5;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1C3D6E"><b>&#x1F464; Registered Manager:</b> '+eH(_dname)+' &mdash; Homes: <b>'+eH(_homes.join(', '))+'</b></div>':'';
    var rows=staff.map(function(s){
      var dm=docMap[s.id]||{};
      var tot=Object.values(dm).reduce(function(a,b){return a+b;},0);
      var fb=tot>0?'<span style="background:#0d6efd;color:#fff;padding:2px 8px;border-radius:10px;font-size:10px">'+tot+' &#x2713;</span>':'<span style="background:#f8d7da;color:#721c24;padding:2px 8px;border-radius:10px;font-size:10px">None</span>';
      var cats=CATS.map(function(c){var n=dm[c.key]||0;return '<td style="padding:4px;text-align:center"><span style="background:'+(n>0?'#d4edda':'#f5f5f5')+';padding:2px 7px;border-radius:10px;font-size:10px;color:'+(n>0?'#155724':'#999')+'">'+(n>0?n+'&#x2713;':'-')+'</span></td>';}).join('');
      var can=isAdmin||(isRM&&_homes.indexOf(s.loc)>-1);
      var soc;
      if(s.sr_approved){
        var dt=s.sr_approved_at?new Date(s.sr_approved_at).toLocaleDateString('en-GB'):'';
        soc='<td style="padding:4px 6px;text-align:center"><span style="background:#d4edda;color:#155724;padding:3px 8px;border-radius:10px;font-size:10px;font-weight:600;display:block">&#x2705; Approved</span><span style="font-size:9px;color:#555;display:block;margin-top:2px">'+eH(s.sr_approved_by||'')+(dt?' '+dt:'')+'</span>'+(can?'<button onclick="event.stopPropagation();window._srSignOff('+s.id+',\''+eJ(s.name)+'\''+',\''+eJ(s.loc||'')+'\',true)" style="font-size:9px;color:#6c757d;background:none;border:none;cursor:pointer;text-decoration:underline;padding:0">Revoke</button>':'')+'</td>';
      }else{
        soc='<td style="padding:4px 6px;text-align:center">'+(can?'<button onclick="event.stopPropagation();window._srSignOff('+s.id+',\''+eJ(s.name)+'\''+',\''+eJ(s.loc||'')+'\',false)" style="background:#dc3545;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:10px;font-weight:600;white-space:nowrap">&#x270B; Sign Off</button>':'<span style="font-size:10px;color:#aaa">Pending</span>')+'</td>';
      }
      return '<tr style="border-bottom:1px solid #f5f5f5;cursor:pointer" onmouseenter="this.style.backgroundColor=\'#f0f4ff\'" onmouseleave="this.style.backgroundColor=\'\'" onclick="window._openStaffSR('+s.id+',\''+eJ(s.name||'')+'\')">'
        +'<td style="padding:7px 10px;font-weight:600;font-size:12px;position:sticky;left:0;background:inherit;min-width:160px">'+eH(s.name||'?')+'</td>'
        +'<td style="padding:5px 7px;font-size:11px;color:#666">'+eH(s.loc||'-')+'</td>'
        +'<td style="padding:5px 7px;font-size:11px;color:#777;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+eH((s.role||'-').substring(0,22))+'</td>'
        +'<td style="padding:4px 7px;text-align:center">'+fb+'</td>'
        +cats+soc+'</tr>';
    }).join('');
    var adminBar=isAdmin?'<button onclick="window._srShowRMManager()" style="background:#6f42c1;color:#fff;border:none;border-radius:7px;padding:6px 10px;cursor:pointer;font-size:11px">&#x1F464; Manage RMs</button>':'';
    page.innerHTML='<div style="padding:24px;font-family:inherit">'+rmBanner
      +'<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">'
      +'<div><h2 style="margin:0;font-size:21px;color:#1C3D6E">&#x1F4C2; Safer Recruitment</h2><div style="font-size:11px;color:#888;margin-top:3px">'+staff.length+' staff &middot; '+today+'</div></div>'
      +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
      +'<input type="text" placeholder="Search staff..." onkeyup="window._filterSRTable(this.value)" style="padding:6px 11px;border:1px solid #ccc;border-radius:7px;font-size:12px;width:150px">'
      +'<button onclick="window.buildSaferRecruitmentPage()" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:7px;padding:6px 10px;cursor:pointer;font-size:11px">&#x1F504; Refresh</button>'
      +adminBar+'</div></div>'
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">'
      +'<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#0d6efd">'+staff.length+'</div><div style="font-size:11px;color:#888;margin-top:2px">Total Staff</div></div>'
      +'<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#28a745">'+approved+'</div><div style="font-size:11px;color:#888;margin-top:2px">SR Approved</div></div>'
      +'<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#dc3545">'+(staff.length-approved)+'</div><div style="font-size:11px;color:#888;margin-top:2px">Awaiting Sign-Off</div></div>'
      +'<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#6c757d">'+withDocs+'</div><div style="font-size:11px;color:#888;margin-top:2px">With Documents</div></div>'
      +'</div>'
      +'<div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden"><div style="overflow:auto;max-height:560px">'
      +'<table style="border-collapse:collapse;width:100%">'
      +'<thead style="background:#f8f9fa;position:sticky;top:0;z-index:2"><tr>'
      +'<th style="padding:8px 10px;text-align:left;min-width:160px;position:sticky;left:0;background:#f8f9fa;z-index:3;border-bottom:2px solid #dee2e6;font-size:11px">Staff Member</th>'
      +'<th style="padding:8px 6px;text-align:left;min-width:90px;border-bottom:2px solid #dee2e6;font-size:11px">Home</th>'
      +'<th style="padding:8px 6px;text-align:left;min-width:110px;border-bottom:2px solid #dee2e6;font-size:11px">Role</th>'
      +'<th style="padding:8px 6px;text-align:center;min-width:60px;border-bottom:2px solid #dee2e6;font-size:11px">Files</th>'
      +CATS.map(function(c){return'<th style="padding:8px 5px;text-align:center;min-width:60px;border-bottom:2px solid #dee2e6;font-size:10px">'+c.icon+' '+c.label.split(' ')[0]+'</th>';}).join('')
      +'<th style="padding:8px 6px;text-align:center;min-width:90px;border-bottom:2px solid #dee2e6;font-size:11px">&#x270B; SR Sign-Off</th>'
      +'</tr></thead><tbody id="sr-tbody">'+rows+'</tbody></table></div></div></div>';
  }catch(err){page.innerHTML='<div style="padding:24px;color:#dc3545">Error: '+err.message+'</div>';console.error('SR:',err);}
};

window._openStaffSR=function(sid,sname){
  var so=(window._allStaffData||[]).find(function(s){return s.id===sid;});
  if(so&&typeof openForm==='function')openForm(so);else toast('Opening '+sname,'#0d6efd');
};

window._srShowRMManager=async function(){
  var r=await fetch(SURL+'/rest/v1/user_roles?select=email,role,homes,display_name&order=role.asc,email.asc',{headers:sbH()});
  var users=await r.json();
  if(!Array.isArray(users))users=[];
  var rows=users.map(function(u){
    var RLBL={'admin':'Admin','registered_manager':'Reg. Manager','rm':'Reg. Manager','home_owner':'Home Owner','senior_support':'Senior Support','support_worker':'Support Worker','bank':'Bank Staff'};
    var RCLR={'admin':'#6f42c1','registered_manager':'#0d6efd','rm':'#0d6efd','home_owner':'#17a2b8','senior_support':'#20c997','support_worker':'#28a745','bank':'#6c757d'};
    var rLbl=RLBL[u.role]||u.role||'Unknown';
    var rClr=RCLR[u.role]||'#888';
    var badge='<span style="background:'+rClr+';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">'+eH(rLbl)+'</span>';
    var ud=encodeURIComponent(JSON.stringify({email:u.email,role:u.role,homes:u.homes||[],dn:u.display_name||u.email}));
    return '<tr data-ud="'+ud+'" style="border-bottom:1px solid #f0f0f0;cursor:pointer" onclick="var d=JSON.parse(decodeURIComponent(this.dataset.ud));window._srEditRM(d.email,d.role,d.homes,d.dn)">'
      +'<td style="padding:9px 12px;font-size:13px;font-weight:600;color:#1C3D6E">'+eH(u.display_name||u.email)+'<div style="font-size:10px;color:#888;font-weight:400">'+eH(u.email)+'</div></td>'
      +'<td style="padding:9px 8px;text-align:center">'+badge+'</td>'
      +'<td style="padding:9px 8px;font-size:11px;color:#555">'+eH((u.homes||[]).join(', ')||'All homes')+'</td>'
      +'<td style="padding:9px 8px;text-align:center"><button onclick="event.stopPropagation();var tr=this.parentElement.parentElement;var d=JSON.parse(decodeURIComponent(tr.dataset.ud));window._srEditRM(d.email,d.role,d.homes,d.dn)" style="background:#1C3D6E;color:#fff;border:none;border-radius:6px;padding:5px 14px;cursor:pointer;font-size:12px;font-weight:600">&#x270F; Edit</button></td>'
      +'</tr>';
  }).join('');;;;;
  var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:200000;display:flex;align-items:center;justify-content:center';ov.id='rm-mgr-ov';
  ov.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;width:700px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.2)"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><h3 style="margin:0;color:#1C3D6E;font-size:16px">&#x1F464; Manage User Roles &amp; Homes</h3><button onclick="document.getElementById(\'rm-mgr-ov\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#666">&times;</button></div><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f8f9fa"><th style="padding:8px 12px;text-align:left;font-size:11px;border-bottom:2px solid #dee2e6">Name / Email</th><th style="padding:8px 8px;text-align:center;font-size:11px;border-bottom:2px solid #dee2e6">Role</th><th style="padding:8px 8px;font-size:11px;border-bottom:2px solid #dee2e6">Assigned Homes</th><th style="border-bottom:2px solid #dee2e6"></th></tr></thead><tbody>'+rows+'</tbody></table><div style="margin-top:16px;padding-top:14px;border-top:1px solid #eee;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px"><span style="font-size:11px;color:#888">Click any row to edit a user&#39;s role and home assignments.</span><button onclick="window._srAddUserModal()" style="background:#28a745;color:#fff;border:none;border-radius:7px;padding:8px 16px;cursor:pointer;font-size:12px;font-weight:600">+ Add New User</button></div></div>';
  document.body.appendChild(ov);
};

window._srEditRM=function(email,role,homes,dname){
  var HL=['DOM CARE','Maple Lodge','Spring House','Spring Lodge','Dorothy Lodge','Cambria'];
  var hc=HL.map(function(h){return'<label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:6px"><input type="checkbox" value="'+eH(h)+'" '+(homes.indexOf(h)>-1?'checked':'')+' class="rm-hchk"> '+eH(h)+'</label>';}).join('');
  var ov2=document.createElement('div');ov2.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200001;display:flex;align-items:center;justify-content:center';ov2.id='rm-edit-ov';
  ov2.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;width:400px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,.2)"><h3 style="margin:0 0 16px;color:#1C3D6E;font-size:15px">Edit: '+eH(dname||email)+'</h3><label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">Role</label><select id="rm-er" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:14px;box-sizing:border-box">'
    +'<option value="admin"'+(role==='admin'?' selected':'')+'>Admin (full access)</option>'
    +'<option value="registered_manager"'+(role==='registered_manager'||role==='rm'?' selected':'')+'>Registered Manager</option>'
    +'<option value="home_owner"'+(role==='home_owner'?' selected':'')+'>Home Owner</option>'
    +'<option value="senior_support"'+(role==='senior_support'?' selected':'')+'>Senior Support Worker</option>'
    +'<option value="support_worker"'+(role==='support_worker'?' selected':'')+'>Support Worker</option>'
    +'<option value="bank"'+(role==='bank'?' selected':'')+'>Bank Staff</option>'
    +'</select><label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">Assigned Homes</label><div style="border:1px solid #ccc;border-radius:6px;padding:10px;margin-bottom:16px">'+hc+'</div><div id="rm-es" style="font-size:12px;color:#28a745;margin-bottom:10px;display:none">Saved!</div><div style="display:flex;gap:8px;justify-content:flex-end"><button onclick="document.getElementById(\'rm-edit-ov\').remove()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px">Cancel</button><button onclick="window._srSaveRM(\''+eJ(email)+'\')" style="padding:8px 18px;background:#0d6efd;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">Save</button></div></div>';
  document.body.appendChild(ov2);
};

window._srSaveRM=async function(email){
  var role=document.getElementById('rm-er').value;
  var homes=Array.from(document.querySelectorAll('.rm-hchk:checked')).map(function(c){return c.value;});
  var r=await fetch(SURL+'/rest/v1/user_roles?email=eq.'+encodeURIComponent(email),{method:'PATCH',headers:Object.assign({'Prefer':'return=minimal'},sbH()),body:JSON.stringify({role:role,homes:homes})});
  if(r.ok){var s=document.getElementById('rm-es');if(s){s.style.display='block';s.textContent='Saved!';}setTimeout(function(){var o1=document.getElementById('rm-edit-ov');if(o1)o1.remove();var o2=document.getElementById('rm-mgr-ov');if(o2)o2.remove();window._srShowRMManager();},800);}
  else toast('Error saving','#dc3545');
};

window._srAddUserModal=function(){
  var HL=['DOM CARE','Maple Lodge','Spring House','Spring Lodge','Dorothy Lodge','Cambria'];
  var hc=HL.map(function(h){return'<label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:6px"><input type="checkbox" value="'+eH(h)+'" class="rm-nhchk"> '+eH(h)+'</label>';}).join('');
  var ov3=document.createElement('div');ov3.id='rm-add-ov';ov3.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200002;display:flex;align-items:center;justify-content:center';
  ov3.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;width:420px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,.2)"><h3 style="margin:0 0 16px;color:#1C3D6E;font-size:15px">Add New User</h3>'
    +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Full Name</label>'
    +'<input id="rm-na-name" type="text" placeholder="e.g. Jane Smith" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;box-sizing:border-box">'
    +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Email Address</label>'
    +'<input id="rm-na-email" type="email" placeholder="jane@thecareadvantage.com" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;box-sizing:border-box">'
    +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">Role</label>'
    +'<select id="rm-na-role" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:14px;box-sizing:border-box">'
    +'<option value="admin">Admin (full access)</option>'
    +'<option value="registered_manager">Registered Manager</option>'
    +'<option value="home_owner">Home Owner</option>'
    +'<option value="senior_support">Senior Support Worker</option>'
    +'<option value="support_worker" selected>Support Worker</option>'
    +'<option value="bank">Bank Staff</option>'
    +'</select>'
    +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">Assigned Homes</label>'
    +'<div style="border:1px solid #ccc;border-radius:6px;padding:10px;margin-bottom:16px">'+hc+'</div>'
    +'<div id="rm-na-st" style="font-size:12px;color:#28a745;margin-bottom:10px;display:none">User added!</div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end">'
    +'<button onclick="var p=this.parentElement;while(p&&p.id!==\'rm-add-ov\')p=p.parentElement;if(p)p.remove();" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px">Cancel</button>'
    +'<button onclick="window._srSaveNewUser()" style="padding:8px 18px;background:#28a745;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">Add User</button>'
    +'</div></div>';
  document.body.appendChild(ov3);
};

window._srSaveNewUser=async function(){
  var name=document.getElementById('rm-na-name').value.trim();
  var email=document.getElementById('rm-na-email').value.trim().toLowerCase();
  var role=document.getElementById('rm-na-role').value;
  var homes=Array.from(document.querySelectorAll('.rm-nhchk:checked')).map(function(c){return c.value;});
  if(!email||!name){toast('Name and email are required','#dc3545');return;}
  var r=await fetch(SURL+'/rest/v1/user_roles',{method:'POST',headers:Object.assign({'Prefer':'return=minimal'},sbH()),body:JSON.stringify({email:email,role:role,homes:homes,display_name:name})});
  if(r.ok||r.status===201){
    var s=document.getElementById('rm-na-st');if(s){s.style.display='block';s.textContent='User added!';}
    setTimeout(function(){var o3=document.getElementById('rm-add-ov');if(o3)o3.remove();var o2=document.getElementById('rm-mgr-ov');if(o2)o2.remove();window._srShowRMManager();},800);
  } else {
    var errTxt=await r.text();
    if(errTxt&&errTxt.includes('duplicate')){toast('User already exists with this email','#dc3545');}
    else{toast('Error adding user','#dc3545');}
  }
};

async function init(){
  if(!document.getElementById('page-safer-recruitment')){
    var d=document.createElement('div');d.id='page-safer-recruitment';d.className='page';
    var m=document.querySelector('main')||document.body;m.appendChild(d);
  }
  await loadRole();
  if(document.getElementById('page-safer-recruitment').classList.contains('active'))window.buildSaferRecruitmentPage();
  console.log('TCA Safer Recruitment Module v3.0 loaded OK - role:'+_role+' email:'+_email);
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
