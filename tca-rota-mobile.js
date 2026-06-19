// ================================================================
// TCA Rota Mobile v1.0 — Mobile-friendly "My Shifts" card view
// ----------------------------------------------------------------
// Wraps window.buildRotaPage so that on viewports <= 768px it
// renders a vertical card list of the logged-in user's next 14
// days of shifts (read from rota_entries) instead of the wide
// desktop grid. Managers on mobile get a "Switch to grid" toggle
// to fall back to the existing grid (horizontal scroll).
// ================================================================
(function(){
  'use strict';
  var SURL='https://vhebrkhdgeiyxkpphlut.supabase.co';
  var SANONKEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoZWJya2hkZ2VpeXhrcHBobHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTIyMjQsImV4cCI6MjA5MDI4ODIyNH0.8ux8cztStNiGEt1fRsVZYubhE2inx24iQaCiZdQV3lk';
  var MOBILE_MQ='(max-width:768px)';
  var SHIFT_META={
    '':{label:'Off',bg:'#f5f5f5',tc:'#999'},
    E:{label:'Early',bg:'#fff3cd',tc:'#856404'},
    D:{label:'Day',bg:'#fff8e1',tc:'#e65100'},
    L:{label:'Late',bg:'#cce5ff',tc:'#004085'},
    N:{label:'Night',bg:'#d4edda',tc:'#155724'},
    S:{label:'Sleep-in',bg:'#e2d9f3',tc:'#4a235a'},
    W:{label:'Wake Night',bg:'#f8d7da',tc:'#721c24'},
    A:{label:'Annual Leave',bg:'#fce4ec',tc:'#880e4f'},
    T:{label:'Training',bg:'#e3f2fd',tc:'#0d47a1'},
    X:{label:'Taxi',bg:'#fff3e0',tc:'#5d4037'},
    O:{label:'Off Sick',bg:'#ffebee',tc:'#b71c1c'}
  };

  function isMobile(){
    try{return window.matchMedia(MOBILE_MQ).matches;}catch(e){return window.innerWidth<=768;}
  }
  function sbH(){
    try{
      var raw=sessionStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')||localStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')||'{}';
      var t=JSON.parse(raw);
      var at=(t&&t.access_token)||SANONKEY;
      return {'apikey':SANONKEY,'Authorization':'Bearer '+at,'Content-Type':'application/json'};
    }catch(e){return {'apikey':SANONKEY,'Authorization':'Bearer '+SANONKEY,'Content-Type':'application/json'};}
  }
  function currentUserEmail(){
    try{
      var raw=sessionStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')||localStorage.getItem('sb-vhebrkhdgeiyxkpphlut-auth-token')||'{}';
      var t=JSON.parse(raw);
      return (t&&t.user&&t.user.email)?String(t.user.email).toLowerCase():'';
    }catch(e){return '';}
  }
  function pad(n){return n<10?'0'+n:''+n;}
  function fmtDate(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function dayLabel(d){
    var today=new Date();today.setHours(0,0,0,0);
    var tomorrow=new Date(today.getTime()+86400000);
    var that=new Date(d.getFullYear(),d.getMonth(),d.getDate());
    if(that.getTime()===today.getTime())return 'Today';
    if(that.getTime()===tomorrow.getTime())return 'Tomorrow';
    return d.toLocaleDateString('en-GB',{weekday:'long'});
  }

  async function findMyStaffRecord(email){
    if(!email)return null;
    try{
      var r=await fetch(SURL+'/rest/v1/staff?select=id,name,role,loc,email&email=ilike.'+encodeURIComponent(email)+'&limit=1',{headers:sbH()});
      var j=await r.json();
      if(Array.isArray(j)&&j.length)return j[0];
    }catch(e){}
    return null;
  }
  async function loadMyShifts(staffId,fromDate,toDate){
    try{
      var r=await fetch(SURL+'/rest/v1/rota_entries?select=date,shift_key,time_start,time_end,notes,home,is_open_shift&staff_id=eq.'+staffId+'&date=gte.'+fmtDate(fromDate)+'&date=lte.'+fmtDate(toDate)+'&order=date.asc',{headers:sbH()});
      var j=await r.json();
      return Array.isArray(j)?j:[];
    }catch(e){return [];}
  }

  function escapeHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  function renderHeader(staff,isManager){
    var btn=isManager?'<button id="rmb-grid-btn" style="background:#1C3D6E;color:#fff;border:none;border-radius:7px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;min-height:44px">Grid view</button>':'';
    return '<div style="padding:14px 14px 8px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">'
      +'<h2 style="margin:0;font-size:20px;color:#1C3D6E">My Shifts</h2>'
      +btn
      +'</div>'
      +'<div style="font-size:13px;color:#666">'+escapeHtml(staff?staff.name:'')+(staff&&staff.loc?' &middot; '+escapeHtml(staff.loc):'')+'</div>'
      +'<div style="font-size:11px;color:#999;margin-top:2px">Next 14 days</div>'
      +'</div>';
  }

  function renderEmpty(msg){
    return '<div style="padding:30px 20px;text-align:center;color:#888;font-size:14px">'+escapeHtml(msg)+'</div>';
  }

  function renderCards(shifts,fromDate){
    var cardsHtml='';
    for(var i=0;i<14;i++){
      var d=new Date(fromDate.getTime()+i*86400000);
      var ds=fmtDate(d);
      var entry=null;
      for(var j=0;j<shifts.length;j++){if(shifts[j].date===ds){entry=shifts[j];break;}}
      var key=entry&&entry.shift_key||'';
      var meta=SHIFT_META[key]||SHIFT_META[''];
      var isOff=!key||key==='';
      var time='';
      if(entry&&entry.time_start)time=entry.time_start+(entry.time_end?' – '+entry.time_end:'');
      var notes=entry&&entry.notes?entry.notes:'';
      var home=entry&&entry.home?entry.home:'';
      var dow=d.getDay(); var isWknd=(dow===0||dow===6);
      var leftBg=isOff?'#e9ecef':meta.bg;
      var leftFg=isOff?'#888':meta.tc;
      cardsHtml+='<div style="display:flex;background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin:8px 12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04)">'
        +'<div style="flex:0 0 64px;background:'+leftBg+';color:'+leftFg+';display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px;text-align:center">'
        +'<div style="font-size:10px;font-weight:600;text-transform:uppercase;opacity:.85">'+escapeHtml(d.toLocaleDateString('en-GB',{weekday:'short'}))+'</div>'
        +'<div style="font-size:22px;font-weight:800;line-height:1.1">'+d.getDate()+'</div>'
        +'<div style="font-size:10px;opacity:.75">'+escapeHtml(d.toLocaleDateString('en-GB',{month:'short'}))+'</div>'
        +'</div>'
        +'<div style="flex:1;padding:10px 12px;min-width:0">'
        +'<div style="font-size:13px;font-weight:700;color:#1C3D6E">'+escapeHtml(dayLabel(d))+(isWknd?' &middot; <span style="color:#999;font-weight:500">Weekend</span>':'')+'</div>'
        +(isOff
          ?'<div style="font-size:13px;color:#888;margin-top:4px">No shift scheduled</div>'
          :'<div style="margin-top:4px"><span style="display:inline-block;background:'+meta.bg+';color:'+meta.tc+';padding:3px 9px;border-radius:12px;font-size:12px;font-weight:700">'+escapeHtml(key)+' &middot; '+escapeHtml(meta.label)+'</span>'
            +(time?'<span style="margin-left:8px;font-size:13px;color:#333;font-weight:600">'+escapeHtml(time)+'</span>':'')
            +'</div>'
            +(home?'<div style="font-size:11px;color:#666;margin-top:4px">📍 '+escapeHtml(home)+'</div>':'')
            +(notes?'<div style="font-size:12px;color:#555;margin-top:4px;font-style:italic">"'+escapeHtml(notes)+'"</div>':'')
          )
        +'</div></div>';
    }
    return '<div style="padding-bottom:20px">'+cardsHtml+'</div>';
  }

  var _wrapped=false;
  function wrapBuildRotaPage(){
    if(_wrapped)return;
    var orig=window.buildRotaPage;
    if(typeof orig!=='function')return;
    _wrapped=true;
    window._rotaForceGrid=false;
    window.buildRotaPage=async function(){
      var page=document.getElementById('page-rota');
      if(!page)return orig.apply(this,arguments);
      if(!isMobile()||window._rotaForceGrid){
        return orig.apply(this,arguments);
      }
      page.innerHTML='<div style="padding:20px;color:#888;font-size:13px">Loading your shifts...</div>';
      var role=window._tcaUserRole||'';
      var isManager=(role==='admin'||role==='rm'||role==='registered_manager'||role==='deputy_manager');
      var email=currentUserEmail();
      var staff=await findMyStaffRecord(email);
      if(!staff){
        page.innerHTML=renderHeader(null,isManager)
          +renderEmpty('We couldn’t match your login email ('+escapeHtml(email||'unknown')+') to a staff record. Ask your manager to set the email on your staff profile.');
        if(isManager)wireGridToggle();
        return;
      }
      var today=new Date();today.setHours(0,0,0,0);
      var end=new Date(today.getTime()+13*86400000);
      var shifts=await loadMyShifts(staff.id,today,end);
      page.innerHTML=renderHeader(staff,isManager)+renderCards(shifts,today);
      if(isManager)wireGridToggle();
    };
  }

  function wireGridToggle(){
    var btn=document.getElementById('rmb-grid-btn');
    if(!btn)return;
    btn.addEventListener('click',function(){
      window._rotaForceGrid=true;
      window.buildRotaPage();
    });
  }

  var _rzT=null;
  window.addEventListener('resize',function(){
    if(_rzT)clearTimeout(_rzT);
    _rzT=setTimeout(function(){
      var page=document.getElementById('page-rota');
      if(!page||!page.offsetParent)return;
      if(typeof window.buildRotaPage==='function')window.buildRotaPage();
    },250);
  });

  function tryWrap(){
    wrapBuildRotaPage();
    if(!_wrapped)setTimeout(tryWrap,200);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',tryWrap);
  }else{
    tryWrap();
  }
  console.log('TCA Rota Mobile v1.0 loaded');
})();
