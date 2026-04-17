// ================================================================
// TCA Rota Module — v2.0
// The Care Advantage Ltd | app.thecareadvantage.com
// Place alongside app.html, add: <script src="tca-rota-module.js"></script>
// ================================================================
(function() {
  'use strict';
  const HOMES = ['DOM Care','Maple Lodge','Spring House','Spring Lodge','Dorothy Lodge','Cambria'];
  const SHIFTS = [
    {key:'',label:'Off',bg:'#f5f5f5',tc:'#999'},
    {key:'E',label:'Early (7-3)',bg:'#fff3cd',tc:'#856404'},
    {key:'L',label:'Late (3-11)',bg:'#cce5ff',tc:'#004085'},
    {key:'N',label:'Night (11-7)',bg:'#d4edda',tc:'#155724'},
    {key:'S',label:'Sleep-in',bg:'#e2d9f3',tc:'#4a235a'},
    {key:'W',label:'Wake Night',bg:'#f8d7da',tc:'#721c24'},
    {key:'A',label:'Annual Leave',bg:'#fce4ec',tc:'#880e4f'},
    {key:'T',label:'Training',bg:'#e3f2fd',tc:'#0d47a1'},
    {key:'O',label:'Off Sick',bg:'#ffebee',tc:'#b71c1c'}
  ];
  let currentHome = HOMES[0];
  let currentDate = new Date();
  let rotaStaff = [];

  function storageKey(h,y,m) { return 'tca_rota_'+h.replace(/\s/g,'_')+'_'+y+'_'+m; }
  function loadRota(h,y,m) { try{return JSON.parse(localStorage.getItem(storageKey(h,y,m))||'{}');}catch(e){return{};} }
  function saveRota(h,y,m,d) { localStorage.setItem(storageKey(h,y,m),JSON.stringify(d)); }
  function daysIn(y,m) { return new Date(y,m+1,0).getDate(); }
  function isWeekend(y,m,d) { const day=new Date(y,m,d).getDay(); return day===0||day===6; }
  function dayName(y,m,d) { return ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(y,m,d).getDay()]; }
  function showToast(msg,color) { if(window.showToast&&window.showToast!==arguments.callee){window.showToast(msg,color);return;} const t=document.createElement('div'); t.style.cssText='position:fixed;bottom:20px;right:20px;background:'+(color||'#333')+';color:#fff;padding:10px 18px;border-radius:8px;z-index:99999;font-size:13px;font-weight:600'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3000); }

  async function loadStaffForHome(home) {
    try {
      const all = await window.sbFetch('staff?select=id,name,role,status,loc&order=name.asc&limit=200');
      return all.filter(s => s.loc === home && (!s.status || s.status==='' || s.status==='Active'));
    } catch(e) { return []; }
  }

  window._rotaSetHome = function(home) { currentHome=home; window.buildRotaPage(); };
  window._rotaNav = function(dir) { currentDate.setMonth(currentDate.getMonth()+dir); window.buildRotaPage(); };
  window._rotaGoToday = function() { currentDate=new Date(); window.buildRotaPage(); };
  window._rotaCellClick = function(staffId,day) {
    const y=currentDate.getFullYear(); const m=currentDate.getMonth();
    const rota=loadRota(currentHome,y,m);
    const key=staffId+'_'+day;
    const cur=rota[key]||'';
    const idx=SHIFTS.findIndex(s=>s.key===cur);
    const next=SHIFTS[(idx+1)%SHIFTS.length];
    rota[key]=next.key;
    saveRota(currentHome,y,m,rota);
    const cell=document.getElementById('cell_'+staffId+'_'+day);
    if(cell){cell.textContent=next.key||''; cell.style.background=next.bg; cell.style.color=next.tc;}
    if(next.key) showToast(next.label,'#1C3D6E');
  };

  window.buildRotaPage = async function() {
    const page=document.getElementById('page-rota');
    if(!page)return;
    const y=currentDate.getFullYear(); const m=currentDate.getMonth();
    const monthName=currentDate.toLocaleString('en-GB',{month:'long',year:'numeric'});
    const days=daysIn(y,m);
    const today=new Date();
    const rota=loadRota(currentHome,y,m);

    page.innerHTML='<div style="padding:20px"><div style="color:#888;font-size:13px">Loading rota for '+currentHome+'...</div></div>';

    rotaStaff = await loadStaffForHome(currentHome);
    if(!rotaStaff.length) rotaStaff=[{id:0,name:'No staff assigned to '+currentHome,role:''}];

    const homeOpts=HOMES.map(h=>'<option value="'+h+'" '+(h===currentHome?'selected':'')+'>'+h+'</option>').join('');
    const shiftLegend=SHIFTS.map(s=>'<span style="background:'+s.bg+';color:'+s.tc+';padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;white-space:nowrap">'+(s.key||'OFF')+' = '+s.label+'</span>').join(' ');
    const dayHdrs=Array.from({length:days},(_,i)=>{
      const d=i+1; const isTd=(today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===d); const isSat=isWeekend(y,m,d);
      const bg=isTd?'#1C3D6E':isSat?'#f0f0f0':'#f8f9fa'; const clr=isTd?'#fff':'#333';
      return '<th style="padding:4px 2px;text-align:center;min-width:32px;font-size:10px;background:'+bg+';color:'+clr+';border-bottom:2px solid #dee2e6"><div>'+dayName(y,m,d)+'</div><div style="font-weight:700">'+d+'</div></th>';
    }).join('');

    const staffRows=rotaStaff.map(s=>{
      const cells=Array.from({length:days},(_,i)=>{
        const d=i+1; const key=s.id+'_'+d; const val=rota[key]||''; const shift=SHIFTS.find(sh=>sh.key===val)||SHIFTS[0];
        const isTd=(today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===d);
        const borderStr=isTd?'border:2px solid #1C3D6E;':'border:1px solid #e0e0e0;';
        return '<td id="cell_'+s.id+'_'+d+'" onclick="window._rotaCellClick('+s.id+','+d+')" style="padding:4px 2px;text-align:center;min-width:32px;font-size:11px;font-weight:700;background:'+shift.bg+';color:'+shift.tc+';cursor:pointer;'+borderStr+'">'+val+'</td>';
      }).join('');
      return '<tr><td style="padding:6px 10px;min-width:160px;position:sticky;left:0;background:#fff;z-index:1;border-bottom:1px solid #f0f0f0"><div style="font-weight:600;font-size:12px">'+s.name+'</div><div style="font-size:10px;color:#888">'+( s.role||'').substring(0,20)+'</div></td>'+cells+'</tr>';
    }).join('');

    page.innerHTML='<div style="padding:20px;font-family:inherit">'+
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">'+
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="36" height="36"><circle cx="22" cy="22" r="21" fill="#1C3D6E"/><path d="M22 5 C12 5 4 13 4 23 C4 33 12 41 22 41 C29 41 35 37.5 38.5 32 L32 28.5 C29.5 32 26 34 22 34 C16 34 10 28.5 10 22 C10 15.5 16 10 22 10 C26 10 29.5 12 32 15.5 L38.5 12 C35 6.5 29 5 22 5 Z" fill="white"/><circle cx="22" cy="22" r="8" fill="#1C3D6E"/><rect x="24" y="1" width="22" height="11" fill="#1C3D6E"/></svg>'+
      '<h2 style="margin:0;font-size:20px;color:#1C3D6E">Rota</h2>'+
      '<select onchange="window._rotaSetHome(this.value)" style="padding:6px 10px;border:1px solid #ccc;border-radius:7px;font-size:13px;font-weight:600">'+homeOpts+'</select>'+
      '<div style="display:flex;align-items:center;gap:6px;margin-left:auto">'+
      '<button onclick="window._rotaNav(-1)" style="background:#f0f0f0;border:1px solid #ccc;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:14px">◀</button>'+
      '<span style="font-weight:700;font-size:14px;min-width:150px;text-align:center">'+monthName+'</span>'+
      '<button onclick="window._rotaNav(1)" style="background:#f0f0f0;border:1px solid #ccc;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:14px">▶</button>'+
      '<button onclick="window._rotaGoToday()" style="background:#1C3D6E;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px">Today</button>'+
      '</div></div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;background:#f8f9fa;padding:10px;border-radius:8px">'+shiftLegend+'<span style="font-size:11px;color:#888;margin-left:8px">Click any cell to cycle shifts</span></div>'+
      '<div style="overflow-x:auto;border:1px solid #e0e0e0;border-radius:10px;background:#fff">'+
      '<table style="border-collapse:collapse;width:100%;font-size:12px">'+
      '<thead style="background:#f8f9fa;position:sticky;top:0;z-index:2">'+
      '<tr><th style="padding:7px 10px;text-align:left;min-width:160px;position:sticky;left:0;background:#f8f9fa;z-index:3;border-bottom:2px solid #dee2e6">Staff Member</th>'+dayHdrs+'</tr>'+
      '</thead><tbody>'+staffRows+'</tbody></table></div></div>';
  };

  async function init() {
    if(!document.getElementById('page-rota')){const d=document.createElement('div');d.id='page-rota';d.className='page';document.querySelector('main')?.appendChild(d);}
    window.buildRotaPage();
    document.querySelectorAll('a[href*="rota"],.hdr-btn').forEach(el=>{if((el.textContent||'').trim().toLowerCase().includes('rota')||(el.getAttribute('href')||'').includes('rota')){el.addEventListener('click',e=>{e.preventDefault();window.buildRotaPage();if(typeof showPage==='function')showPage('rota');});}});
    console.log('TCA Rota Module v2.0 loaded ✅');
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();