// ================================================================
// TCA Training Module — v2.0
// The Care Advantage Ltd | app.thecareadvantage.com
// Place alongside app.html, add: <script src="tca-training-module.js"></script>
// ================================================================
(function() {
  'use strict';
  let allTraining = [];
  let filteredTraining = [];

  function showToast(msg,color) { if(window.showToast){window.showToast(msg,color);return;} const t=document.createElement('div'); t.style.cssText='position:fixed;bottom:20px;right:20px;background:'+(color||'#333')+';color:#fff;padding:10px 18px;border-radius:8px;z-index:99999;font-size:13px;font-weight:600'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3000); }

  function getExpiryColor(dateStr) {
    if (!dateStr || dateStr === 'NA' || dateStr === '') return '#f5f5f5';
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((expiry - now) / 86400000);
    if (isNaN(diffDays)) return '#f5f5f5';
    if (diffDays < 0) return '#f8d7da';
    if (diffDays < 30) return '#fff3cd';
    if (diffDays < 90) return '#fff8e1';
    return '#d4edda';
  }

  function getExpiryLabel(dateStr) {
    if (!dateStr || dateStr === 'NA' || dateStr === '') return '—';
    const expiry = new Date(dateStr);
    if (isNaN(expiry.getTime())) return dateStr;
    const now = new Date();
    const diffDays = Math.floor((expiry - now) / 86400000);
    if (diffDays < 0) return '⚠ Expired';
    if (diffDays < 30) return '⚡ Exp soon';
    return expiry.toLocaleDateString('en-GB');
  }

  window._trainingFilter = function() {
    const search = (document.getElementById('tr-search')?.value||'').toLowerCase();
    const homeF = document.getElementById('tr-home')?.value||'';
    const tbody = document.getElementById('tr-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(row => {
      const t = row.textContent.toLowerCase();
      const matchSearch = !search || t.includes(search);
      const matchHome = !homeF || row.getAttribute('data-home') === homeF;
      row.style.display = (matchSearch && matchHome) ? '' : 'none';
    });
    const visible = tbody.querySelectorAll('tr:not([style*="none"])').length;
    const countEl = document.getElementById('tr-count');
    if (countEl) countEl.textContent = visible + ' records';
  };

  window.buildTrainingPage = async function() {
    const page = document.getElementById('page-training');
    if (!page) return;
    page.innerHTML = '<div style="padding:24px"><div style="color:#888;font-size:13px">Loading training data...</div></div>';
    try {
      const data = await window.sbFetch('training?select=*&order=staff_name.asc&limit=500');
      allTraining = data;
      const homes = [...new Set(data.map(r => r.home || r.loc || '').filter(Boolean))].sort();
      const homeOpts = homes.map(h => '<option value="'+h+'">'+h+'</option>').join('');
      const cols = data.length ? Object.keys(data[0]).filter(k => !['id','org_id','created_at','updated_at'].includes(k)) : [];
      const rows = data.map(r => {
        const home = r.home || r.loc || '';
        const cells = cols.map(c => {
          const val = r[c] || '';
          const bg = (c.toLowerCase().includes('expir')||c.toLowerCase().includes('date')) ? getExpiryColor(val) : '';
          const label = (c.toLowerCase().includes('expir')||c.toLowerCase().includes('date')) ? getExpiryLabel(val) : val;
          return '<td style="padding:5px 8px;font-size:11px;'+(bg?'background:'+bg+';border-radius:4px;':'')+'white-space:nowrap">'+label+'</td>';
        }).join('');
        return '<tr data-home="'+home+'" style="border-bottom:1px solid #f5f5f5">'+cells+'</tr>';
      }).join('');
      const headers = cols.map(c => '<th style="padding:7px 8px;text-align:left;white-space:nowrap;font-size:11px;border-bottom:2px solid #dee2e6;background:#f8f9fa;position:sticky;top:0">'+c.replace(/_/g,' ')+'</th>').join('');

      page.innerHTML = '<div style="padding:24px;font-family:inherit">'+
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">'+
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="36" height="36"><circle cx="22" cy="22" r="21" fill="#1C3D6E"/><path d="M22 5 C12 5 4 13 4 23 C4 33 12 41 22 41 C29 41 35 37.5 38.5 32 L32 28.5 C29.5 32 26 34 22 34 C16 34 10 28.5 10 22 C10 15.5 16 10 22 10 C26 10 29.5 12 32 15.5 L38.5 12 C35 6.5 29 5 22 5 Z" fill="white"/><circle cx="22" cy="22" r="8" fill="#1C3D6E"/><rect x="24" y="1" width="22" height="11" fill="#1C3D6E"/></svg>'+
        '<h2 style="margin:0;font-size:20px;color:#1C3D6E">Training Matrix</h2>'+
        '<span id="tr-count" style="background:#e3f2fd;color:#1565c0;padding:3px 10px;border-radius:12px;font-size:12px">'+data.length+' records</span>'+
        '</div>'+
        '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">'+
        '<input type="text" id="tr-search" placeholder="🔍 Search staff or module..." oninput="window._trainingFilter()" style="padding:7px 12px;border:1px solid #ccc;border-radius:7px;font-size:12px;width:220px">'+
        '<select id="tr-home" onchange="window._trainingFilter()" style="padding:7px 10px;border:1px solid #ccc;border-radius:7px;font-size:12px"><option value="">All Homes</option>'+homeOpts+'</select>'+
        '<div style="margin-left:auto;display:flex;gap:6px;font-size:11px;align-items:center">'+
        '<span style="background:#d4edda;padding:3px 10px;border-radius:10px">✅ Valid</span>'+
        '<span style="background:#fff8e1;padding:3px 10px;border-radius:10px">⚡ &lt;90 days</span>'+
        '<span style="background:#fff3cd;padding:3px 10px;border-radius:10px">⚠ &lt;30 days</span>'+
        '<span style="background:#f8d7da;padding:3px 10px;border-radius:10px">🔴 Expired</span>'+
        '</div></div>'+
        '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">'+
        '<div style="overflow:auto;max-height:620px">'+
        '<table style="border-collapse:collapse;width:100%">'+
        '<thead><tr>'+headers+'</tr></thead>'+
        '<tbody id="tr-tbody">'+rows+'</tbody>'+
        '</table></div></div></div>';
    } catch(err) {
      page.innerHTML = '<div style="padding:24px"><div style="color:#dc3545">Error loading training data: '+err.message+'</div></div>';
    }
  };

  async function init() {
    if(!document.getElementById('page-training')){const d=document.createElement('div');d.id='page-training';d.className='page';document.querySelector('main')?.appendChild(d);}
    window.buildTrainingPage();
    document.querySelectorAll('a[href*="training"],.hdr-btn').forEach(el=>{if((el.textContent||'').trim().toLowerCase().includes('training')||(el.getAttribute('href')||'').includes('training')){el.addEventListener('click',e=>{e.preventDefault();window.buildTrainingPage();if(typeof showPage==='function')showPage('training');});}});
    console.log('TCA Training Module v2.0 loaded ✅');
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();