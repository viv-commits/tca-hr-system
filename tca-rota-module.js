// ================================================================
// TCA Rota Module v3.0 — Supabase Backend + Custom Shifts + Open Shift Email
// ================================================================
(function() {
  'use strict';
  const SURL='https://vhebrkhdgeiyxkpphlut.supabase.co';
  const SANONKEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoZWJya2hkZ2VpeXhrcHBobHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTIyMjQsImV4cCI6MjA5MDI4ODIyNH0.8ux8cztStNiGEt1fRsVZYubhE2inx24iQaCiZdQV3lk';
  const HOMES=['DOM Care','Maple Lodge','Spring House','Spring Lodge','Dorothy Lodge','Cambria'];
  const DEFAULT_SHIFTS=[
    {key:'',label:'Off',bg:'#f5f5f5',tc:'#999',ts:'',te:''},
    {key:'E',label:'Early',bg:'#fff3cd',tc:'#856404',ts:'08:00',te:'20:00'},
    {key:'D',label:'Day',bg:'#fff8e1',tc:'#e65100',ts:'07:00',te:'19:00'},
    {key:'L',label:'Late',bg:'#cce5ff',tc:'#004085',ts:'14:00',te:'22:00'},
    {key:'N',label:'Night',bg:'#d4edda',tc:'#155724',ts:'22:00',te:'08:00'},
    {key:'S',label:'Sleep-in',bg:'#e2d9f3',tc:'#4a235a',ts:'22:00',te:'08:00'},
    {key:'W',label:'Wake Night',bg:'#f8d7da',tc:'#721c24',ts:'22:00',te:'08:00'},
    {key:'A',label:'Annual Leave',bg:'#fce4ec',tc:'#880e4f',ts:'',te:''},
    {key:'T',label:'Training',bg:'#e3f2fd',tc:'#0d47a1',ts:'',te:''},
    {key:'X',label:'Taxi',bg:'#fff3e0',tc:'#5d4037',ts:'',te:''},
    {key:'O',label:'Off Sick',bg:'#ffebee',tc:'#b71c1c',ts:'',te:''}
  ];
  let SHIFTS=[...DEFAULT_SHIFTS];
  let currentHome=HOMES[0];
  let currentDate=new Date();
  let rotaStaff=[];
  let shiftPatterns={};

  function sbH(){
    try{const t=JSON.parse(localStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')||'{}');const at=t.access_token||SANONKEY;return{'apikey':SANONKEY,'Authorization':'Bearer '+at,'Content-Type':'application/json','Prefer':'return=minimal'};}
    catch(e){return{'apikey':SANONKEY,'Authorization':'Bearer '+SANONKEY,'Content-Type':'application/json','Prefer':'return=minimal'};}
  }
  function daysIn(y,m){return new Date(y,m+1,0).getDate();}
  function isWeekend(y,m,d){const day=new Date(y,m,d).getDay();return day===0||day===6;}
  function dayName(y,m,d){return['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(y,m,d).getDay()];}
  function fmtDate(y,m,d){return y+'-'+(m+1<10?'0':'')+(m+1)+'-'+(d<10?'0':'')+d;}
  function showToast(msg,color){const t=document.createElement('div');t.style.cssText='position:fixed;bottom:20px;right:20px;background:'+(color||'#333')+';color:#fff;padding:10px 18px;border-radius:8px;z-index:99999;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.2)';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3000);}

  async function loadStaffForHome(home){
    try{const all=await window.sbFetch('staff?select=id,name,role,status,loc,email&order=name.asc&limit=300');return all.filter(s=>s.loc===home&&(!s.status||s.status===''||s.status==='Active'));}catch(e){return[];}
  }

  async function loadShiftPatterns(home){
    try{
      const r=await fetch(SURL+'/rest/v1/shift_patterns?home=eq.'+encodeURIComponent(home)+'&order=shift_key.asc',{headers:sbH()});
      const j=await r.json();
      if(Array.isArray(j)&&j.length>0){
        shiftPatterns[home]=j;
        SHIFTS=DEFAULT_SHIFTS.map(ds=>{const p=j.find(x=>x.shift_key===ds.key);return p?{key:ds.key,label:p.label,bg:p.bg_color||ds.bg,tc:p.text_color||ds.tc,ts:p.time_start||ds.ts,te:p.time_end||ds.te}:ds;});
      } else {SHIFTS=[...DEFAULT_SHIFTS];}
    }catch(e){SHIFTS=[...DEFAULT_SHIFTS];}
  }

  async function loadRotaFromDB(home,y,m){
    try{
      const from=fmtDate(y,m,1);const to=fmtDate(y,m,daysIn(y,m));
      const r=await fetch(SURL+'/rest/v1/rota_entries?home=eq.'+encodeURIComponent(home)+'&date=gte.'+from+'&date=lte.'+to+'&select=staff_id,date,shift_key,time_start,time_end,notes,is_open_shift',{headers:sbH()});
      const j=await r.json();
      if(!Array.isArray(j))return{};
      const map={};
      j.forEach(e=>{const d=parseInt(e.date.split('-')[2]);map[e.staff_id+'_'+d]={key:e.shift_key||'',ts:e.time_start||'',te:e.time_end||'',notes:e.notes||'',isOpen:e.is_open_shift||false};});
      return map;
    }catch(ex){return{};}
  }

  async function saveRotaCell(home,staffId,y,m,d,shiftKey,ts,te,notes){
    try{
      const dateStr=fmtDate(y,m,d);
      const payload={home,staff_id:staffId,date:dateStr,shift_key:shiftKey,time_start:ts||'',time_end:te||'',notes:notes||'',is_open_shift:false,updated_at:new Date().toISOString()};
      await fetch(SURL+'/rest/v1/rota_entries',{method:'POST',headers:Object.assign({'Prefer':'resolution=merge-duplicates,return=minimal'},sbH()),body:JSON.stringify(payload)});
    }catch(e){console.error('saveRotaCell error:',e);}
  }

  window._rotaSetHome=function(home){currentHome=home;window.buildRotaPage();};
  window._rotaNav=function(dir){currentDate.setMonth(currentDate.getMonth()+dir);window.buildRotaPage();};
  window._rotaGoToday=function(){currentDate=new Date();window.buildRotaPage();};

  window._rotaCellClick=async function(el){
    const staffId=parseInt(el.dataset.sid);const day=parseInt(el.dataset.day);const staffName=el.dataset.sname||'';
    const y=currentDate.getFullYear();const m=currentDate.getMonth();
    if(!window._rotaData)window._rotaData={};
    const key=staffId+'_'+day;
    const cur=window._rotaData[key]||{key:'',ts:'',te:'',notes:''};
    const curShift=SHIFTS.find(s=>s.key===cur.key)||SHIFTS[0];
    const nextIdx=(SHIFTS.findIndex(s=>s.key===cur.key)+1)%SHIFTS.length;
    const nextShift=SHIFTS[nextIdx];
    const newEntry={key:nextShift.key,ts:nextShift.ts,te:nextShift.te,notes:cur.notes||''};
    window._rotaData[key]=newEntry;
    const cell=document.getElementById('cell_'+staffId+'_'+day);
    if(cell){
      cell.textContent=nextShift.key||'';
      cell.style.background=nextShift.bg;
      cell.style.color=nextShift.tc;
      const sub=cell.querySelector('.cell-time');
      if(sub&&nextShift.ts)sub.textContent=nextShift.ts+(nextShift.te?'-'+nextShift.te:'');
      else if(sub)sub.textContent='';
    }
    await saveRotaCell(currentHome,staffId,y,m,day,nextShift.key,nextShift.ts,nextShift.te,cur.notes||'');
    if(nextShift.key)showToast(nextShift.label+' ('+(nextShift.ts||'')+(nextShift.te?'-'+nextShift.te:'')+')'+(nextShift.ts?'':''),'#1C3D6E');
  };

  window._rotaCellEdit=function(el){
    const staffId=parseInt(el.dataset.sid);const day=parseInt(el.dataset.day);const staffName=el.dataset.sname||'';
    const key=staffId+'_'+day;
    const cur=window._rotaData?window._rotaData[key]:{};
    const curShift=SHIFTS.find(s=>s.key===(cur?cur.key:''))||SHIFTS[0];
    const daysInMonth=new Date(currentDate.getFullYear(),currentDate.getMonth()+1,0).getDate();
    const shiftOpts=SHIFTS.map(function(s){var sel=s.key===(cur?cur.key:'')?'selected':'';var tm=s.ts?(s.ts+(s.te?'-'+s.te:'')):'';var lbl=s.key?(s.key+' - '+s.label+(tm?' ('+tm+')':'')):s.label;return'<option value="'+s.key+'" data-ts="'+s.ts+'" data-te="'+s.te+'" '+sel+'>'+lbl+'</option>';}).join('');
    const dateStr=new Date(currentDate.getFullYear(),currentDate.getMonth(),day).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
    let dayOpts='';for(let d=1;d<=daysInMonth;d++){dayOpts+='<option value="'+d+'" '+(d===day?'selected':'')+'>'+d+'</option>';}
    const ov=document.createElement('div');ov.id='rota-cell-edit-ov';ov.dataset.sid=String(staffId);ov.dataset.day=String(day);ov.dataset.sname=staffName;ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200100;display:flex;align-items:center;justify-content:center';
    ov.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;width:420px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.25)">'
      +'<h3 style="margin:0 0 4px;color:#1C3D6E;font-size:15px">&#x270F; Edit Shift</h3>'
      +'<div style="font-size:12px;color:#888;margin-bottom:16px">'+staffName+' &mdash; '+dateStr+'</div>'
      +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Shift Type</label>'
      +'<select id="rce-shift" onchange="var o=this.options[this.selectedIndex];document.getElementById(\'rce-ts\').value=o.dataset.ts||\'\';document.getElementById(\'rce-te\').value=o.dataset.te||\'\';" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;box-sizing:border-box">'+shiftOpts+'</select>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
      +'<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Start Time</label><input type="time" id="rce-ts" value="'+(cur?cur.ts||'':'')+'" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box"></div>'
      +'<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">End Time</label><input type="time" id="rce-te" value="'+(cur?cur.te||'':'')+'" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box"></div>'
      +'</div>'
      +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Notes</label>'
      +'<input type="text" id="rce-notes" value="'+(cur?cur.notes||'':'')+'" placeholder="Optional note..." style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:14px;box-sizing:border-box">'
      +'<div style="background:#f0f7ff;border-radius:8px;padding:12px;margin-bottom:14px">'
      +'<div style="font-size:12px;font-weight:700;color:#1C3D6E;margin-bottom:8px">&#x1F4CB; Apply to Date Range</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
      +'<div><label style="font-size:11px;color:#666;display:block;margin-bottom:3px">From Day</label>'
      +'<select id="rce-from" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:5px;font-size:12px;box-sizing:border-box">'+dayOpts+'</select></div>'
      +'<div><label style="font-size:11px;color:#666;display:block;margin-bottom:3px">To Day</label>'
      +'<select id="rce-to" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:5px;font-size:12px;box-sizing:border-box">'+dayOpts+'</select></div>'
      +'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
      +'<button onclick="window._rceQuick(\'today\')" style="padding:4px 10px;font-size:11px;border:1px solid #1C3D6E;border-radius:4px;background:#fff;color:#1C3D6E;cursor:pointer">Today</button>'
      +'<button onclick="window._rceQuick(\'week\')" style="padding:4px 10px;font-size:11px;border:1px solid #1C3D6E;border-radius:4px;background:#fff;color:#1C3D6E;cursor:pointer">This week</button>'
      +'<button onclick="window._rceQuick(\'month\')" style="padding:4px 10px;font-size:11px;border:1px solid #1C3D6E;border-radius:4px;background:#fff;color:#1C3D6E;cursor:pointer">Full month</button>'
      +'<button onclick="window._rceQuick(\'weekdays\')" style="padding:4px 10px;font-size:11px;border:1px solid #1C3D6E;border-radius:4px;background:#fff;color:#1C3D6E;cursor:pointer">Weekdays</button>'
      +'</div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end">'
      +'<button onclick="document.getElementById(\'rota-cell-edit-ov\').remove()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px">Cancel</button>'
      +'<button onclick="window._rotaSaveCellEdit()" style="padding:8px 18px;background:#1C3D6E;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">Save</button>'
      +'</div></div>';
    document.body.appendChild(ov);
  };

  window._rceQuick=function(preset){
    const ov=document.getElementById('rota-cell-edit-ov');
    if(!ov)return;
    const day=parseInt(ov.dataset.day);
    const daysInMonth=new Date(currentDate.getFullYear(),currentDate.getMonth()+1,0).getDate();
    const fromSel=document.getElementById('rce-from');
    const toSel=document.getElementById('rce-to');
    if(!fromSel||!toSel)return;
    if(preset==='today'){fromSel.value=day;toSel.value=day;}
    else if(preset==='month'){fromSel.value=1;toSel.value=daysInMonth;}
    else if(preset==='week'){
      const dow=new Date(currentDate.getFullYear(),currentDate.getMonth(),day).getDay();
      const mon=Math.max(1,day-(dow===0?6:dow-1));
      const sun=Math.min(daysInMonth,mon+6);
      fromSel.value=mon;toSel.value=sun;
    } else if(preset==='weekdays'){fromSel.value=1;toSel.value=daysInMonth;ov.dataset.weekdaysOnly='1';showToast('Weekdays only - will skip weekends on save','#1C3D6E');}
    if(preset!=='weekdays')delete ov.dataset.weekdaysOnly;
  };

  window._rotaSaveCellEdit=async function(){
    const _editModal=document.getElementById('rota-cell-edit-ov');
    const staffId=parseInt(_editModal&&_editModal.dataset.sid||'0');
    const origDay=parseInt(_editModal&&_editModal.dataset.day||'0');
    const staffName=_editModal&&_editModal.dataset.sname||'';
    const weekdaysOnly=_editModal&&_editModal.dataset.weekdaysOnly==='1';
    const shiftKey=document.getElementById('rce-shift').value;
    const ts=document.getElementById('rce-ts').value;
    const te=document.getElementById('rce-te').value;
    const notes=document.getElementById('rce-notes').value;
    const fromDay=parseInt((document.getElementById('rce-from')||{}).value)||origDay;
    const toDay=parseInt((document.getElementById('rce-to')||{}).value)||origDay;
    const shift=SHIFTS.find(s=>s.key===shiftKey)||SHIFTS[0];
    const y=currentDate.getFullYear();const m=currentDate.getMonth();
    window._rotaData=window._rotaData||{};
    const savePromises=[];
    const savedDays=[];
    for(let d=Math.min(fromDay,toDay);d<=Math.max(fromDay,toDay);d++){
      const dow=new Date(y,m,d).getDay();
      if(weekdaysOnly&&(dow===0||dow===6))continue;
      const key=staffId+'_'+d;
      window._rotaData[key]={key:shiftKey,ts,te,notes};
      const cell=document.getElementById('cell_'+staffId+'_'+d);
      if(cell){
        cell.textContent=shiftKey||'';
        cell.style.background=shift.bg;cell.style.color=shift.tc;
        let sub=cell.querySelector('.cell-time');
        if(!sub&&ts){sub=document.createElement('div');sub.className='cell-time';sub.style.cssText='font-size:8px;font-weight:400;margin-top:1px;opacity:.8';cell.appendChild(sub);}
        if(sub)sub.textContent=ts?(ts+(te?'-'+te:'')):'';
        else if(sub)sub.textContent='';
      }
      savePromises.push(saveRotaCell(currentHome,staffId,y,m,d,shiftKey,ts,te,notes));
      savedDays.push(d);
    }
    await Promise.all(savePromises);
    // Update Hrs column live
    const hrsCell=document.getElementById('hrs_'+staffId);
    if(hrsCell){const {total,mins,totalMins}=tcaCalcHours(staffId,y,m);hrsCell.textContent=mins>0?total+'h '+mins+'m':total+'h';hrsCell.style.background=totalMins>0?'#e8f5e9':'#f9f9f9';hrsCell.style.color=totalMins>0?'#2e7d32':'#999';}
    document.getElementById('rota-cell-edit-ov').remove();
    const rangeMsg=savedDays.length>1?' ('+savedDays.length+' days)':'';
    showToast((shiftKey?shift.label+' shift':'Shift cleared')+' saved'+rangeMsg,'#28a745');
  };



  window._rotaShiftSettings=function(){
    const home=currentHome;
    const sp=shiftPatterns[home]||DEFAULT_SHIFTS.filter(s=>s.key);
    const rows=DEFAULT_SHIFTS.filter(s=>s.key).map(ds=>{
      const p=sp.find(x=>x.shift_key===ds.key)||ds;
      const ts=p.time_start||p.ts||'';const te=p.time_end||p.te||'';
      return '<tr><td style="padding:8px 10px;font-size:12px;font-weight:600"><span style="background:'+ds.bg+';color:'+ds.tc+';padding:2px 8px;border-radius:10px">'+ds.key+'</span> '+ds.label+'</td>'
        +'<td style="padding:8px 6px"><input type="time" class="sp-ts" data-key="'+ds.key+'" value="'+ts+'" style="padding:4px 8px;border:1px solid #ccc;border-radius:6px;font-size:12px;width:90px"></td>'
        +'<td style="padding:8px 6px"><input type="time" class="sp-te" data-key="'+ds.key+'" value="'+te+'" style="padding:4px 8px;border:1px solid #ccc;border-radius:6px;font-size:12px;width:90px"></td>'
        +'</tr>';
    }).join('');
    const ov=document.createElement('div');ov.id='rota-settings-ov';ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200100;display:flex;align-items:center;justify-content:center';
    ov.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;width:480px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.25)">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      +'<h3 style="margin:0;color:#1C3D6E;font-size:15px">⚙ Shift Patterns — '+home+'</h3>'
      +'<button onclick="document.getElementById(\'rota-settings-ov\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#666">&times;</button></div>'
      +'<p style="font-size:12px;color:#666;margin:0 0 14px">Set default start/end times for each shift type. These apply to '+home+' only and can still be overridden per cell.</p>'
      +'<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f8f9fa"><th style="padding:8px 10px;text-align:left;font-size:11px;border-bottom:2px solid #dee2e6">Shift</th><th style="padding:8px 6px;font-size:11px;border-bottom:2px solid #dee2e6">Start</th><th style="padding:8px 6px;font-size:11px;border-bottom:2px solid #dee2e6">End</th></tr></thead><tbody>'+rows+'</tbody></table>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:14px;border-top:1px solid #eee">'
      +'<button onclick="document.getElementById(\'rota-settings-ov\').remove()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px">Cancel</button>'
      +'<button onclick="window._rotaSaveShiftPatterns()" style="padding:8px 18px;background:#1C3D6E;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">Save Patterns</button>'
      +'</div></div>';
    document.body.appendChild(ov);
  };

  window._rotaSaveShiftPatterns=async function(){
    const home=currentHome;
    const updates=[];
    document.querySelectorAll('.sp-ts').forEach(el=>{
      const key=el.dataset.key;const ts=el.value;
      const teEl=document.querySelector('.sp-te[data-key="'+key+'"]');
      const te=teEl?teEl.value:'';
      updates.push({home,shift_key:key,time_start:ts,time_end:te});
    });
    let saved=0;
    for(const u of updates){
      const r=await fetch(SURL+'/rest/v1/shift_patterns?home=eq.'+encodeURIComponent(home)+'&shift_key=eq.'+u.shift_key,{method:'PATCH',headers:Object.assign({'Prefer':'return=minimal'},sbH()),body:JSON.stringify({time_start:u.time_start,time_end:u.time_end})});
      if(r.ok)saved++;
    }
    document.getElementById('rota-settings-ov').remove();
    showToast('Shift patterns saved for '+home,'#28a745');
    await loadShiftPatterns(home);
    window.buildRotaPage();
  };

  window._rotaPublishOpenShift=function(){
    const y=currentDate.getFullYear();const m=currentDate.getMonth();
    const shiftOpts=DEFAULT_SHIFTS.filter(function(s){return s.key;}).map(function(s){var tm=s.ts?(s.ts+(s.te?'-'+s.te:'')):'';return'<option value="'+s.key+'">'+s.key+' - '+s.label+(tm?' ('+tm+')':'')+'</option>';}).join('');
    const days=daysIn(y,m);
    const dateOpts=Array.from({length:days},(_,i)=>{const d=i+1;const dt=new Date(y,m,d);return '<option value="'+fmtDate(y,m,d)+'">'+dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+'</option>';}).join('');
    const ov=document.createElement('div');ov.id='rota-open-ov';ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200100;display:flex;align-items:center;justify-content:center';
    ov.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;width:440px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,.25)">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      +'<h3 style="margin:0;color:#1C3D6E;font-size:15px">📢 Publish Open Shift</h3>'
      +'<button onclick="document.getElementById(\'rota-open-ov\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#666">&times;</button></div>'
      +'<p style="font-size:12px;color:#555;margin:0 0 14px;background:#fff3cd;padding:10px;border-radius:8px;border:1px solid #f0c040">An email will be sent to all staff at <strong>'+currentHome+'</strong> asking if anyone can cover this shift.</p>'
      +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Date</label>'
      +'<select id="os-date" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;box-sizing:border-box">'+dateOpts+'</select>'
      +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Shift Type</label>'
      +'<select id="os-shift" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;box-sizing:border-box">'+shiftOpts+'</select>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
      +'<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Start Time</label><input type="time" id="os-ts" value="08:00" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box"></div>'
      +'<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">End Time</label><input type="time" id="os-te" value="20:00" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box"></div>'
      +'</div>'
      +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Additional Notes (optional)</label>'
      +'<input type="text" id="os-notes" placeholder="e.g. Urgent cover needed, bank staff welcome" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:16px;box-sizing:border-box">'
      +'<div id="os-status" style="font-size:12px;color:#28a745;margin-bottom:10px;display:none"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end">'
      +'<button onclick="document.getElementById(\'rota-open-ov\').remove()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px">Cancel</button>'
      +'<button onclick="window._rotaSendOpenShift()" style="padding:8px 18px;background:#e83e8c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">📧 Send to All Staff</button>'
      +'</div></div>';
    document.body.appendChild(ov);
  };

  window._rotaSendOpenShift=async function(){
    const date=document.getElementById('os-date').value;
    const shiftKey=document.getElementById('os-shift').value;
    const ts=document.getElementById('os-ts').value;
    const te=document.getElementById('os-te').value;
    const notes=document.getElementById('os-notes').value;
    const shift=DEFAULT_SHIFTS.find(s=>s.key===shiftKey)||{label:shiftKey};
    const st=document.getElementById('os-status');
    if(st){st.style.display='block';st.textContent='Sending emails...';}
    
    // Get all staff emails for this home
    let staffEmails=[];
    try{
      const all=await window.sbFetch('staff?select=name,email,loc,status&loc=eq.'+encodeURIComponent(currentHome)+'&limit=200');
      staffEmails=all.filter(s=>s.email&&(!s.status||s.status==='Active'));
    }catch(e){console.warn('Could not load staff emails:',e);}
    
    // Save open shift record to DB
    try{
      const dateObj=new Date(date);const fmtD=dateObj.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
      await fetch(SURL+'/rest/v1/open_shifts',{method:'POST',headers:Object.assign({'Prefer':'return=minimal'},sbH()),body:JSON.stringify({home:currentHome,date,shift_key:shiftKey,time_start:ts,time_end:te,notes,status:'open',published_by:window._tcaDisplayName||window._tcaUserRole||'Manager'})});
      
      // Send emails via Resend API (if available) or log
      let emailsSent=0;
      const subject='Open Shift Available — '+currentHome+' on '+new Date(date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
      const body='<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto"><div style="background:#1C3D6E;color:#fff;padding:20px;border-radius:8px 8px 0 0"><h2 style="margin:0">Open Shift Available</h2><p style="margin:4px 0 0;opacity:.8">The Care Advantage Ltd</p></div><div style="background:#f8f9fa;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none"><p style="margin:0 0 16px">An open shift has been posted at <strong>'+currentHome+'</strong>. If you can cover this shift, please reply to this email or contact your manager.</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px;background:#fff;border:1px solid #e0e0e0;font-weight:600">Date</td><td style="padding:8px;background:#fff;border:1px solid #e0e0e0">'+new Date(date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</td></tr><tr><td style="padding:8px;background:#f8f9fa;border:1px solid #e0e0e0;font-weight:600">Shift</td><td style="padding:8px;background:#f8f9fa;border:1px solid #e0e0e0">'+shift.label+'</td></tr><tr><td style="padding:8px;background:#fff;border:1px solid #e0e0e0;font-weight:600">Time</td><td style="padding:8px;background:#fff;border:1px solid #e0e0e0">'+ts+' – '+te+'</td></tr><tr><td style="padding:8px;background:#f8f9fa;border:1px solid #e0e0e0;font-weight:600">Location</td><td style="padding:8px;background:#f8f9fa;border:1px solid #e0e0e0">'+currentHome+'</td></tr>'+(notes?'<tr><td style="padding:8px;background:#fff;border:1px solid #e0e0e0;font-weight:600">Notes</td><td style="padding:8px;background:#fff;border:1px solid #e0e0e0">'+notes+'</td></tr>':'')+'</table><p style="margin:16px 0 0;font-size:12px;color:#888">Please reply to this email or contact your line manager to confirm availability. First come, first served.</p></div></div>';

      // Try Resend API
      const RESEND_KEY=window._resendKey||'';
      if(RESEND_KEY&&staffEmails.length>0){
        for(const s of staffEmails){
          if(!s.email)continue;
          try{
            const er=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+RESEND_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:'TCA HR System <hr@thecareadvantage.com>',to:s.email,subject,html:body})});
            if(er.ok)emailsSent++;
          }catch(e){}
        }
        if(st){st.textContent=emailsSent+' email'+(emailsSent!==1?'s':'')+' sent to '+currentHome+' staff!';}
      } else {
        // No Resend key — show email list for manual sending
        const emails=staffEmails.map(s=>s.email).filter(Boolean).join(', ');
        if(st){st.innerHTML='<strong>Open shift saved.</strong><br>No email API configured. Copy these emails to send manually:<br><small style="word-break:break-all;color:#333">'+emails+'</small>';}
        if(st)st.style.color='#856404';
      }
    }catch(e){if(st){st.textContent='Error: '+e.message;st.style.color='#dc3545';}}
  };

  window.buildRotaPage=async function(){
    const page=document.getElementById('page-rota');if(!page)return;
    const y=currentDate.getFullYear();const m=currentDate.getMonth();
    const monthName=currentDate.toLocaleString('en-GB',{month:'long',year:'numeric'});
    const days=daysIn(y,m);const today=new Date();
    page.innerHTML='<div style="padding:20px"><div style="color:#888;font-size:13px">Loading rota for '+currentHome+'...</div></div>';

    const _rUserHomes=window._tcaUserHomes||[];const _rUserRole=window._tcaUserRole||'admin';
    const _visibleHomes=(_rUserRole!=='admin'&&_rUserRole!=='rm'&&_rUserRole!=='registered_manager'&&_rUserRole!=='deputy_manager'&&_rUserHomes.length>0)?HOMES.filter(h=>_rUserHomes.includes(h)):HOMES;
    const isManager=(_rUserRole==='admin'||_rUserRole==='rm'||_rUserRole==='registered_manager'||_rUserRole==='deputy_manager');
    if(!isManager&&_rUserHomes.length>0&&!_rUserHomes.includes(currentHome))currentHome=_rUserHomes[0]||HOMES[0];

    await loadShiftPatterns(currentHome);
    rotaStaff=await loadStaffForHome(currentHome);
    window._rotaData=await loadRotaFromDB(currentHome,y,m);
    if(!rotaStaff.length)rotaStaff=[{id:0,name:'No active staff at '+currentHome,role:'',email:''}];

    const homeOpts=_visibleHomes.map(h=>'<option value="'+h+'" '+(h===currentHome?'selected':'')+'>'+h+'</option>').join('');
    const shiftLegend=SHIFTS.map(function(s){var tm=s.ts?' '+s.ts:'';return'<span style="background:'+s.bg+';color:'+s.tc+';padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;white-space:nowrap">'+(s.key||'OFF')+' = '+s.label+tm+'</span>';}).join(' ');
    const dayHdrs=Array.from({length:days},(_,i)=>{
      const d=i+1;const isTd=(today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===d);const isSat=isWeekend(y,m,d);
      const bg=isTd?'#1C3D6E':isSat?'#f0f0f0':'#f8f9fa';const clr=isTd?'#fff':'#333';
      return '<th style="padding:4px 2px;text-align:center;min-width:36px;font-size:10px;background:'+bg+';color:'+clr+';border-bottom:2px solid #dee2e6"><div>'+dayName(y,m,d)+'</div><div style="font-weight:700">'+d+'</div></th>';
    }).join('');

    window._rotaCurrentStaff=rotaStaff;window._rotaCurrentHome=currentHome;window._rotaCurrentDate=currentDate;
    const staffRows=rotaStaff.map(s=>{
      const cells=Array.from({length:days},(_,i)=>{
        const d=i+1;const key=s.id+'_'+d;const entry=window._rotaData[key]||{key:'',ts:'',te:''};
        const val=entry.key||'';const shift=SHIFTS.find(sh=>sh.key===val)||SHIFTS[0];
        const isTd=(today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===d);
        const bdr=isTd?'border:2px solid #1C3D6E;':'border:1px solid #e0e0e0;';
        const timeStr=entry.ts?(entry.ts+(entry.te?'-'+entry.te:'')):'';
        const sName=s.name.replace(/'/g,'');
        const clickFn=isManager?'window._rotaCellEdit(this)':'window._rotaCellClick(this)';
        return '<td id="cell_'+s.id+'_'+d+'" data-sid="'+s.id+'" data-day="'+d+'" data-sname="'+sName+'" onclick="'+clickFn+'" style="padding:3px 2px;text-align:center;min-width:36px;font-size:11px;font-weight:700;background:'+shift.bg+';color:'+shift.tc+';cursor:pointer;'+bdr+'vertical-align:top">'
          +'<div>'+val+'</div>'+(timeStr?'<div class="cell-time" style="font-size:8px;font-weight:400;opacity:.8">'+timeStr+'</div>':'')
          +'</td>';
      }).join('');
      return '<tr><td style="padding:6px 10px;min-width:150px;position:sticky;left:0;background:#fff;z-index:1;border-bottom:1px solid #f0f0f0"><div style="font-weight:600;font-size:12px">'+s.name+'</div><div style="font-size:10px;color:#888">'+(s.role||'').substring(0,22)+'</div></td>'+cells+tcaHrsCell(s.id)+'</tr>';
    }).join('');

    const managerBtns=isManager
      ?'<button onclick="window._rotaShiftSettings()" style="background:#6f42c1;color:#fff;border:none;border-radius:7px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600">⚙ Shift Patterns</button>'
       +'<button onclick="window._rotaPublishOpenShift()" style="background:#e83e8c;color:#fff;border:none;border-radius:7px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600">📢 Open Shift</button>'
       +'<button onclick="window._rotaExport()" style="background:#28a745;color:#fff;border:none;border-radius:7px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600">⬇ Export</button>'
      +'<button onclick="window._rotaPayroll()" style="background:#6f42c1;color:#fff;border:none;border-radius:7px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600">&#128202; Payroll</button>'
      +'<button onclick="window._rotaPayRates()" style="background:#fd7e14;color:#fff;border:none;border-radius:7px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600">&#x1F4B7; Pay Rates</button>'
      :''

    page.innerHTML='<div style="padding:20px;font-family:inherit">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">'
      +'<h2 style="margin:0;font-size:20px;color:#1C3D6E">☰ Rota</h2>'
      +'<select onchange="window._rotaSetHome(this.value)" style="padding:6px 10px;border:1px solid #ccc;border-radius:7px;font-size:13px;font-weight:600">'+homeOpts+'</select>'
      +'<div style="display:flex;align-items:center;gap:6px;margin-left:auto;flex-wrap:wrap">'
      +managerBtns
      +'<button onclick="window._rotaNav(-1)" style="background:#f0f0f0;border:1px solid #ccc;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:14px">◀</button>'
      +'<span style="font-weight:700;font-size:14px;min-width:150px;text-align:center">'+monthName+'</span>'
      +'<button onclick="window._rotaNav(1)" style="background:#f0f0f0;border:1px solid #ccc;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:14px">▶</button>'
      +'<button onclick="window._rotaGoToday()" style="background:#1C3D6E;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px">Today</button>'
      +'</div></div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;background:#f8f9fa;padding:8px 12px;border-radius:8px;align-items:center">'
      +shiftLegend
      +(isManager?'<span style="font-size:11px;color:#888;margin-left:8px">Click cell to edit shift & times</span>':'<span style="font-size:11px;color:#888;margin-left:8px">Click to cycle shifts</span>')
      +'</div>'
      +'<div style="overflow-x:auto;border:1px solid #e0e0e0;border-radius:10px;background:#fff"><table style="border-collapse:collapse;width:100%;font-size:12px">'
      +'<thead style="background:#f8f9fa;position:sticky;top:0;z-index:2"><tr>'
      +'<th style="padding:7px 10px;text-align:left;min-width:150px;position:sticky;left:0;background:#f8f9fa;z-index:3;border-bottom:2px solid #dee2e6">Staff Member</th>'+dayHdrs+'<th style="background:#1a3a5c;color:#fff;padding:4px 6px;min-width:55px;text-align:center;white-space:nowrap;font-weight:600">Hrs</th></tr></thead>'
      +'<tbody>'+staffRows+'</tbody></table></div></div>';
  };



  // ============================================================
  // TCA PAYROLL HELPERS v1.0 — Monthly hours & payroll summary
  // ============================================================
  function tcaCalcHours(staffId, y, m) {
    const SHIFT_HOURS = {E:12,D:12,L:8,N:10,S:10,W:10,A:0,T:8,X:0,O:0,'':0};
    const data = window._rotaData || {};
    let totalMins = 0, counts = {};
    const days = new Date(y, m+1, 0).getDate();
    function parseTime(t){if(!t)return null;const p=t.split(':');return parseInt(p[0])*60+(parseInt(p[1])||0);}
    for(let d=1; d<=days; d++) {
      const key = staffId+'_'+d;
      const entry = data[key];
      if(entry && entry.key) {
        let mins = 0;
        if(entry.ts && entry.te) {
          let sm=parseTime(entry.ts), em=parseTime(entry.te);
          if(em<sm) em+=1440;
          mins = Math.max(0, em-sm);
        } else {
          mins = (SHIFT_HOURS[entry.key]||0)*60;
        }
        totalMins += mins;
        if(entry.key) counts[entry.key] = (counts[entry.key]||0) + 1;
      }
    }
    const total = Math.floor(totalMins/60);
    const mins = totalMins%60;
    return {total, mins, totalMins, counts};
  }

  function tcaHrsCell(staffId) {
    const d = window._rotaCurrentDate || new Date();
    const {total, mins, totalMins} = tcaCalcHours(staffId, d.getFullYear(), d.getMonth());
    const bg = totalMins > 0 ? '#e8f5e9' : '#f9f9f9';
    const clr = totalMins > 0 ? '#2e7d32' : '#999';
    const label = mins > 0 ? total+'h '+mins+'m' : total+'h';
    return '<td id="hrs_'+staffId+'" style="background:'+bg+';color:'+clr+';font-weight:700;text-align:center;padding:4px 6px;min-width:55px;white-space:nowrap;border-left:2px solid #dee2e6;position:sticky;right:0">'+label+'</td>';
  }

  window._rotaPayroll = async function() {
    const d = window._rotaCurrentDate || new Date();
    const y = d.getFullYear(), m = d.getMonth();
    const staff = window._rotaCurrentStaff || [];
    const home = window._rotaCurrentHome || '';
    const _rUserRole = window._tcaUserRole || 'admin';
    const isManager = (_rUserRole==='admin'||_rUserRole==='rm'||_rUserRole==='registered_manager'||_rUserRole==='deputy_manager');
    const SHIFT_LABELS = {E:'Early',D:'Day',L:'Late',N:'Night',S:'Sleep',W:'WakeN',A:'AL',T:'Train',O:'Sick'};
    const SH = {E:12,D:12,L:8,N:10,S:10,W:10,A:0,T:8,O:0,'':0};
    const RATE_KEYS = {E:'rate_e',D:'rate_d',L:'rate_l',N:'rate_n',S:'rate_s',W:'rate_w',T:'rate_t',X:'rate_x'};
    const monthName = d.toLocaleString('en-GB',{month:'long',year:'numeric'});
    let ratesMap = window._payRatesCache || {};
    if(isManager) { try { ratesMap = await tcaLoadPayRates(home); } catch(e){} }
    let totalAllHrs = 0, totalAllPay = 0;
    const rows = staff.map(function(sv) {
      const {total, mins: rowMins, totalMins, counts} = tcaCalcHours(sv.id, y, m);
      totalAllHrs += total;
      const breakdown = Object.keys(counts).map(function(k){return (SHIFT_LABELS[k]||k)+': '+counts[k];}).join(', ') || '&mdash;';
      let estPay = 0;
      const r = ratesMap[sv.id] || {};
      if(isManager) {
        Object.keys(counts).forEach(function(k) {
          const hrs = SH[k]||0;
          const rk = RATE_KEYS[k];
          const rate = rk ? (parseFloat(r[rk])||parseFloat(r.base_rate)||0) : (parseFloat(r.base_rate)||0);
          estPay += (k==='T'||k==='X') ? (rate * counts[k]) : (rate * hrs * counts[k]);
        });
        totalAllPay += estPay;
      }
      const payCell = isManager ? '<td style="padding:8px 10px;text-align:right;font-weight:700;color:'+(estPay>0?'#1C3D6E':'#999')+'">'+( estPay>0?'&pound;'+estPay.toFixed(2):'&mdash;')+'</td>' : '';
      return '<tr style="border-bottom:1px solid #eee"><td style="padding:8px 10px;font-weight:500">'+sv.name+'</td><td style="padding:8px 10px;color:#666;font-size:12px">'+(sv.role||'&mdash;')+'</td><td style="padding:8px 10px;text-align:center;font-weight:700;font-size:15px;color:'+(totalMins>0?'#2e7d32':'#999')+'">'+(rowMins>0?total+'h '+rowMins+'m':total+'h')+'</td><td style="padding:8px 10px;font-size:11px;color:#555">'+breakdown+'</td>'+payCell+'</tr>';
    }).join('');
    const payHeader = isManager ? '<th style="padding:8px 10px;text-align:right;font-weight:600">Est. Pay</th>' : '';
    const payTotal = isManager ? '<span style="background:#fff3cd;color:#856404;font-weight:700;padding:3px 10px;border-radius:20px">Pay: &pound;'+totalAllPay.toFixed(2)+'</span>' : '';
    const ov = document.createElement('div');
    ov.id = 'rota-payroll-ov';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto';
    ov.innerHTML = '<div style="background:#fff;border-radius:12px;padding:24px;width:min(760px,95vw);max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3)">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="margin:0;font-size:18px;color:#1a3a5c">&#128202; Monthly Payroll Summary</h2><button onclick="document.getElementById(\'rota-payroll-ov\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666">&times;</button></div>'
      +'<div style="background:#f0f7ff;border-radius:8px;padding:10px 16px;margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center"><span style="font-weight:700;color:#1a3a5c">'+home+'</span><span style="color:#555">'+monthName+'</span><span style="background:#e8f5e9;color:#2e7d32;font-weight:700;padding:3px 10px;border-radius:20px">Total: '+totalAllHrs+'h / '+staff.length+' staff</span>'+payTotal+'</div>'
      +'<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f5f5;font-size:11px;text-transform:uppercase;color:#888"><th style="padding:8px 10px;text-align:left">Staff Member</th><th style="padding:8px 10px;text-align:left">Role</th><th style="padding:8px 10px;text-align:center">Total Hours</th><th style="padding:8px 10px;text-align:left">Breakdown</th>'+payHeader+'</tr></thead>'
      +'<tbody>'+rows+'</tbody>'
      +'<tfoot><tr style="background:#f5f5f5;font-weight:700"><td colspan="2" style="padding:8px 10px">TOTAL</td><td style="padding:8px 10px;text-align:center;color:#2e7d32">'+totalAllHrs+'h</td><td></td>'+(isManager?'<td style="padding:8px 10px;text-align:right;color:#1C3D6E">&pound;'+totalAllPay.toFixed(2)+'</td>':'')+'</tr></tfoot></table>'
      +'<div style="margin-top:14px;background:#fff8e1;border-radius:8px;padding:10px 14px;font-size:11px;color:#856404"><strong>Hours:</strong> Early/Day=12h &bull; Late=8h &bull; Night/Sleep-in/Wake Night=10h &bull; Training=8h &bull; AL/Sick=0h'+(isManager?' &bull; <em>Pay = rates &times; hours (set in Pay Rates)</em>':'')+'</div>'
      +'<div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">'
      +(isManager?'<button onclick="window._rotaPayRates()" style="padding:8px 16px;background:#fd7e14;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">&#x1F4B7; Pay Rates</button>':'')
      +'<button onclick="window.tcaExportPayrollCSV()" style="padding:8px 16px;background:#28a745;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">&#x2B07; Export CSV</button>'
      +'<button onclick="document.getElementById(\'rota-payroll-ov\').remove()" style="background:#6c757d;color:#fff;border:none;border-radius:7px;padding:8px 16px;cursor:pointer;font-size:13px">Close</button>'
      +'</div></div>';
    document.body.appendChild(ov);
  };

  // ===== PAY RATES =====
  async function tcaLoadPayRates(home) {
    try {
      const ids=(window._rotaCurrentStaff||[]).map(s=>s.id);
      if(!ids.length)return{};
      const resp=await fetch(SURL+'/rest/v1/staff_pay_rates?staff_id=in.('+ids.join(',')+')',{headers:{'apikey':SANONKEY,'Authorization':'Bearer '+SANONKEY}});
      if(!resp.ok)return{};
      const rows=await resp.json();
      const map={};rows.forEach(function(r){map[r.staff_id]=r;});
      window._payRatesCache=map;return map;
    }catch(e){return{};}
  }
  async function tcaSavePayRate(staffId,staffName,rates) {
    try {
      const existing=window._payRatesCache&&window._payRatesCache[staffId];
      const payload=Object.assign({staff_id:staffId,staff_name:staffName,updated_at:new Date().toISOString()},rates);
      const url=existing&&existing.id?SURL+'/rest/v1/staff_pay_rates?id=eq.'+existing.id:SURL+'/rest/v1/staff_pay_rates';
      const method=existing&&existing.id?'PATCH':'POST';
      const resp=await fetch(url,{method,headers:{'apikey':SANONKEY,'Authorization':'Bearer '+SANONKEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(payload)});
      return resp.ok;
    }catch(e){return false;}
  }
  window._rotaPayRates = async function() {
    const _rUserRole=window._tcaUserRole||'admin';
    const isManager=(_rUserRole==='admin'||_rUserRole==='rm'||_rUserRole==='registered_manager'||_rUserRole==='deputy_manager');
    if(!isManager){showToast('Pay rates: managers & admins only','#dc3545');return;}
    const staff=window._rotaCurrentStaff||[];
    if(!staff.length){showToast('No staff loaded','#dc3545');return;}
    showToast('Loading pay rates...','#1C3D6E');
    const ratesMap=await tcaLoadPayRates(window._rotaCurrentHome||'');
    const SK=['base_rate','E','D','L','N','S','W','T','X'];
    const SN={base_rate:'Base/Hr',E:'Early',D:'Day',L:'Late',N:'Night',S:'Sleep-in',W:'Wake Night',T:'Training',X:'Taxi'};
    const hdrCells=SK.map(k=>'<th style="padding:6px 8px;font-size:10px;text-align:center;background:#f5f5f5;color:#555;white-space:nowrap">'+SN[k]+'</th>').join('');
    const rowsHtml=staff.map(function(sv){
      const r=ratesMap[sv.id]||{};
      const cells=SK.map(function(k){
        const col=k==='base_rate'?'base_rate':'rate_'+k.toLowerCase();
        const val=r[col]||'';
        return '<td style="padding:4px 6px;text-align:center"><div style="display:flex;align-items:center;border:1px solid #ddd;border-radius:4px;background:#fff;overflow:hidden"><span style="padding:3px 4px;font-size:11px;color:#888;background:#f9f9f9;border-right:1px solid #ddd">&pound;</span><input type="number" step="0.01" min="0" max="999" value="'+val+'" data-sid="'+sv.id+'" data-col="'+col+'" data-name="'+sv.name.replace(/"/g,'&quot;')+'" style="width:52px;padding:3px 5px;border:none;font-size:12px;outline:none" onfocus="this.select()"></div></td>';
      }).join('');
      return '<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:6px 10px;font-weight:500;font-size:13px;white-space:nowrap">'+sv.name+'</td><td style="padding:6px 10px;font-size:11px;color:#666">'+(sv.role||'&mdash;')+'</td>'
        +'<td style="padding:6px 10px"><input type="text" placeholder="Notes..." value="'+(r.notes||'')+'" data-sid="'+sv.id+'" data-col="notes" data-name="'+sv.name.replace(/"/g,'&quot;')+'" style="width:100px;padding:3px 6px;border:1px solid #ddd;border-radius:4px;font-size:11px"></td>'
        +cells+'</tr>';
    }).join('');
    const ov=document.createElement('div');ov.id='rota-payrates-ov';
    ov.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:30px;overflow-y:auto;box-sizing:border-box';
    ov.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;width:min(900px,98vw);max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3)">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><h2 style="margin:0;font-size:17px;color:#1a3a5c">&#x1F4B7; Staff Pay Rates &mdash; '+(window._rotaCurrentHome||'')+'</h2><button onclick="document.getElementById(\'rota-payrates-ov\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666">&times;</button></div>'
      +'<div style="font-size:12px;color:#888;margin-bottom:16px">Set hourly rates per shift type. Rates are per hour worked. Staff with no specific rate will use their Base/Hr rate. <strong>Managers &amp; Admins only.</strong></div>'
      +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:700px"><thead><tr style="background:#f5f5f5"><th style="padding:8px 10px;text-align:left;font-size:11px;color:#555">Staff</th><th style="padding:8px 10px;text-align:left;font-size:11px;color:#555">Role</th><th style="padding:8px 10px;text-align:left;font-size:11px;color:#555">Notes</th>'+hdrCells+'</tr></thead><tbody>'+rowsHtml+'</tbody></table></div>'
      +'<div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;align-items:center"><span id="pr-save-msg" style="font-size:12px;color:#28a745"></span><button onclick="document.getElementById(\'rota-payrates-ov\').remove()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px">Cancel</button><button onclick="window._rotaSavePayRates()" style="padding:8px 20px;background:#fd7e14;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">&#128190; Save All Rates</button></div></div>';
    document.body.appendChild(ov);
  };
  window._rotaSavePayRates = async function() {
    const ov=document.getElementById('rota-payrates-ov');if(!ov)return;
    const inputs=ov.querySelectorAll('input[data-sid]');
    const byStaff={};
    inputs.forEach(function(inp){
      const sid=parseInt(inp.dataset.sid);const col=inp.dataset.col;const name=inp.dataset.name;
      if(!byStaff[sid])byStaff[sid]={name,rates:{}};
      byStaff[sid].rates[col]=inp.type==='number'?parseFloat(inp.value)||0:inp.value;
    });
    const msgEl=document.getElementById('pr-save-msg');if(msgEl)msgEl.textContent='Saving...';
    const results=await Promise.all(Object.keys(byStaff).map(function(sid){const {name,rates}=byStaff[sid];return tcaSavePayRate(parseInt(sid),name,rates);}));
    const ok=results.every(Boolean);
    await tcaLoadPayRates(window._rotaCurrentHome||'');
    if(msgEl){msgEl.innerHTML=ok?'&#10003; Saved!':'Some failed to save';msgEl.style.color=ok?'#28a745':'#dc3545';}
    showToast(ok?'Pay rates saved':'Error saving rates',ok?'#28a745':'#dc3545');
  };

  window.tcaExportPayrollCSV = async function() {
    const d=window._rotaCurrentDate||new Date();
    const y=d.getFullYear(),m=d.getMonth();
    const staff=window._rotaCurrentStaff||[];
    const home=window._rotaCurrentHome||'';
    const _rUserRole=window._tcaUserRole||'admin';
    const isManager=(_rUserRole==='admin'||_rUserRole==='rm'||_rUserRole==='registered_manager'||_rUserRole==='deputy_manager');
    const monthName=d.toLocaleString('en-GB',{month:'long',year:'numeric'});
    const ratesMap=isManager?(await tcaLoadPayRates(home)):{};
    const SH={E:12,D:12,L:8,N:10,S:10,W:10,A:0,T:8,O:0,'':0};
    const RK={E:'rate_e',D:'rate_d',L:'rate_l',N:'rate_n',S:'rate_s',W:'rate_w',T:'rate_t'};
    const payCol=isManager?',Est. Pay (GBP)':'';
    let csv='Monthly Payroll Summary\nHome: '+home+'\nMonth: '+monthName+'\n\n';
    csv+='Staff Name,Role,Total Hours,Early (12h),Day (12h),Late (8h),Night (10h),Sleep-in (10h),Wake Night (10h),Annual Leave,Training (8h),Off Sick'+payCol+'\n';
    let totalHrs=0,totalPay=0;
    staff.forEach(function(sv){
      const {total,counts}=tcaCalcHours(sv.id,y,m);totalHrs+=total;
      let estPay=0;const r=ratesMap[sv.id]||{};
      if(isManager){['E','D','L','N','S','W','T'].forEach(function(k){const rate=RK[k]?(parseFloat(r[RK[k]])||parseFloat(r.base_rate)||0):0;estPay+=rate*(SH[k]||0)*(counts[k]||0);});totalPay+=estPay;}
      const payVal=isManager?','+(estPay>0?estPay.toFixed(2):''):'';
      csv+=[sv.name,sv.role||'',total,counts.E||0,counts.D||0,counts.L||0,counts.N||0,counts.S||0,counts.W||0,counts.A||0,counts.T||0,counts.O||0].join(',')+payVal+'\n';
    });
    csv+='TOTAL,,'+totalHrs+',,,,,,,,,'+( isManager?','+totalPay.toFixed(2):'' )+'\n';
    csv+='\nHours guide: Early/Day=12h, Late=8h, Night/Sleep-in/Wake Night=10h, Training=8h, AL/Sick=0h\n';
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
    a.download=home.replace(/\s+/g,'-')+'-Payroll-'+monthName.replace(/\s+/g,'-')+'.csv';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    showToast('Payroll exported','#28a745');
  };



  window._rotaExport=function(){
    const y=currentDate.getFullYear();const m=currentDate.getMonth();const days=daysIn(y,m);
    const monthName=currentDate.toLocaleString('en-GB',{month:'long',year:'numeric'});
    let csv='Staff,Role,'+Array.from({length:days},(_,i)=>dayName(y,m,i+1)+' '+(i+1)).join(',')+'\n';
    rotaStaff.forEach(s=>{
      const row=[s.name,s.role||''];
      Array.from({length:days},(_,i)=>{const e=(window._rotaData||{})[s.id+'_'+(i+1)]||{key:''};row.push(e.key||(e.ts?e.ts+'-'+e.te:''));});
      csv+=row.map(v=>'"'+String(v).replace(/"/g,'\"')+'"').join(',')+'\n';
    });
    const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='rota-'+currentHome.replace(/\s/g,'_')+'-'+monthName.replace(/\s/g,'-')+'.csv';a.click();URL.revokeObjectURL(url);
    showToast('Rota exported','#28a745');
  };

  async function init(){
    if(!document.getElementById('page-rota')){const d=document.createElement('div');d.id='page-rota';d.className='page';document.querySelector('main')?.appendChild(d);}
    window.buildRotaPage();
    console.log('TCA Rota Module v3.0 loaded ✅');
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();