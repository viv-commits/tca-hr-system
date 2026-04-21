// ================================================================
// TCA Training Module - v2.1 (fixed: correct column names)
// The Care Advantage Ltd | app.thecareadvantage.com
// ================================================================
(function() {
  'use strict';

  function showToast(msg, color) {
    if(window.showToast) { window.showToast(msg, color); return; }
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:' + (color||'#333') + ';color:#fff;padding:10px 18px;border-radius:8px;z-index:99999;font-size:13px;font-weight:600';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function getExpiryColor(dateStr) {
    if (!dateStr || dateStr === 'NA' || dateStr === '') return '';
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((expiry - now) / 86400000);
    if (isNaN(diffDays)) return '';
    if (diffDays < 0) return '#f8d7da';
    if (diffDays < 30) return '#fff3cd';
    if (diffDays < 90) return '#fff8e1';
    return '#d4edda';
  }

  function getExpiryLabel(dateStr) {
    if (!dateStr || dateStr === 'NA' || dateStr === '') return '-';
    const expiry = new Date(dateStr);
    if (isNaN(expiry.getTime())) return dateStr;
    const now = new Date();
    const diffDays = Math.floor((expiry - now) / 86400000);
    if (diffDays < 0) return '⚠ Expired';
    if (diffDays < 30) return '⚡ Exp soon';
    return expiry.toLocaleDateString('en-GB');
  }

  function getStatusBadge(status) {
    if (!status) return '<span style="color:#999">-</span>';
    const s = status.toLowerCase();
    const bg = s === 'complete' || s === 'completed' ? '#d4edda' :
               s === 'in progress' || s === 'in_progress' ? '#fff3cd' :
               s === 'expired' ? '#f8d7da' : '#f0f0f0';
    const tc = s === 'complete' || s === 'completed' ? '#155724' :
               s === 'in progress' || s === 'in_progress' ? '#856404' :
               s === 'expired' ? '#721c24' : '#333';
    return '<span style="background:' + bg + ';color:' + tc + ';padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">' + status + '</span>';
  }

  window._trainingFilter = function() {
    const search = (document.getElementById('tr-search')?.value||'').toLowerCase();
    const homeF = document.getElementById('tr-home')?.value||'';
    const tbody = document.getElementById('tr-tbody');
    if (!tbody) return;
    let visible = 0;
    tbody.querySelectorAll('tr').forEach(row => {
      const t = row.textContent.toLowerCase();
      const matchSearch = !search || t.includes(search);
      const matchHome = !homeF || row.getAttribute('data-home') === homeF;
      const show = matchSearch && matchHome;
      row.style.display = show ? '' : 'none';
      if(show) visible++;
    });
    const countEl = document.getElementById('tr-count');
    if (countEl) countEl.textContent = visible + ' records';
  };

  window.buildTrainingPage = async function() {
    const page = document.getElementById('page-training');
    if (!page) return;
    page.innerHTML = '<div style="padding:24px"><div style="color:#888;font-size:13px">Loading training data...</div></div>';
    try {
      // Fetch training records ordered by id (staff_name column does not exist)
      const data = await window.sbFetch('training?select=*&order=id.asc&limit=500');

      // Get staff lookup for names
      const staffList = window._allStaffData || await window.sbFetch('staff?select=id,name,loc&limit=200');
      if(!window._allStaffData) window._allStaffData = staffList;
      const staffMap = {};
      staffList.forEach(s => { staffMap[s.id] = s; });

      // Enrich training records with staff names
      const enriched = data.map(r => ({
        ...r,
        staff_name: (staffMap[r.staff_id] ? staffMap[r.staff_id].name : ('ID: ' + r.staff_id)),
        home: staffMap[r.staff_id] ? (staffMap[r.staff_id].loc || '-') : '-'
      }));

      // Sort by staff name
      enriched.sort((a, b) => (a.staff_name||'').localeCompare(b.staff_name||''));

      // Home filtering for non-admin users
      const _userHomes = window._tcaUserHomes || [];
      const _userRole = window._tcaUserRole || 'admin';
      const filteredEnriched = (_userRole !== 'admin' && _userHomes.length > 0)
        ? enriched.filter(r => _userHomes.includes(r.home))
        : enriched;

      const homes = [...new Set(filteredEnriched.map(r => r.home).filter(Boolean))].sort();
      const homeOpts = homes.map(h => '<option value="' + h + '">' + h + '</option>').join('');

      const rows = filteredEnriched.map(r => {
        const completionBg = getExpiryColor(r.completion_date);
        const completionLabel = r.completion_date ? new Date(r.completion_date).toLocaleDateString('en-GB') : '-';
        return '<tr data-home="' + r.home + '" style="border-bottom:1px solid #f5f5f5">' +
          '<td style="padding:6px 10px;font-weight:600;font-size:12px;min-width:160px">' + (r.staff_name||'-') + '</td>' +
          '<td style="padding:5px 8px;font-size:11px;color:#666">' + r.home + '</td>' +
          '<td style="padding:5px 8px;font-size:11px;font-weight:500">' + (r.module_key||'-').replace(/_/g,' ') + '</td>' +
          '<td style="padding:5px 8px;font-size:11px;text-align:center">' + getStatusBadge(r.status) + '</td>' +
          '<td style="padding:5px 8px;font-size:11px;background:' + (completionBg||'transparent') + ';border-radius:4px;text-align:center">' + completionLabel + '</td>' +
          '</tr>';
      }).join('');

      page.innerHTML = '<div style="padding:24px;font-family:inherit">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">' +
        '<h2 style="margin:0;font-size:20px;color:#1C3D6E">&#x270E; Training Matrix</h2>' +
        '<span id="tr-count" style="background:#e3f2fd;color:#1565c0;padding:3px 10px;border-radius:12px;font-size:12px">' + data.length + ' records</span>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">' +
        '<input type="text" id="tr-search" placeholder="Search staff or module..." oninput="window._trainingFilter()" style="padding:7px 12px;border:1px solid #ccc;border-radius:7px;font-size:12px;width:220px">' +
        '<select id="tr-home" onchange="window._trainingFilter()" style="padding:7px 10px;border:1px solid #ccc;border-radius:7px;font-size:12px"><option value="">All Homes</option>' + homeOpts + '</select>' +
        '<div style="margin-left:auto;display:flex;gap:6px;font-size:11px;align-items:center">' +
        '<span style="background:#d4edda;padding:3px 10px;border-radius:10px">&#x2705; Valid</span>' +
        '<span style="background:#fff8e1;padding:3px 10px;border-radius:10px">&#x26A1; &lt;90 days</span>' +
        '<span style="background:#fff3cd;padding:3px 10px;border-radius:10px">&#x26A0; &lt;30 days</span>' +
        '<span style="background:#f8d7da;padding:3px 10px;border-radius:10px">&#x1F534; Expired</span>' +
        '</div></div>' +
        '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">' +
        '<div style="overflow:auto;max-height:620px">' +
        '<table style="border-collapse:collapse;width:100%">' +
        '<thead style="position:sticky;top:0;z-index:2"><tr>' +
        '<th style="padding:8px 10px;text-align:left;border-bottom:2px solid #dee2e6;background:#f8f9fa;font-size:11px;min-width:160px">Staff Name</th>' +
        '<th style="padding:8px 8px;text-align:left;border-bottom:2px solid #dee2e6;background:#f8f9fa;font-size:11px;min-width:100px">Home</th>' +
        '<th style="padding:8px 8px;text-align:left;border-bottom:2px solid #dee2e6;background:#f8f9fa;font-size:11px;min-width:160px">Module</th>' +
        '<th style="padding:8px 8px;text-align:center;border-bottom:2px solid #dee2e6;background:#f8f9fa;font-size:11px;min-width:100px">Status</th>' +
        '<th style="padding:8px 8px;text-align:center;border-bottom:2px solid #dee2e6;background:#f8f9fa;font-size:11px;min-width:110px">Completion Date</th>' +
        '</tr></thead>' +
        '<tbody id="tr-tbody">' + rows + '</tbody>' +
        '</table></div></div></div>';
    } catch(err) {
      page.innerHTML = '<div style="padding:24px"><div style="color:#dc3545">Error loading training data: ' + err.message + '</div></div>';
    }
  };

  async function init() {
    if(!document.getElementById('page-training')) {
      const d = document.createElement('div');
      d.id = 'page-training';
      d.className = 'page';
      document.querySelector('main')?.appendChild(d);
    }
    window.buildTrainingPage();
    document.querySelectorAll('a[href*="training"],.hdr-btn').forEach(el => {
      const txt = (el.textContent||'').trim().toLowerCase();
      const href = (el.getAttribute('href')||'');
      if(txt.includes('training') || href.includes('training')) {
        el.addEventListener('click', e => {
          e.preventDefault();
          window.buildTrainingPage();
          if(typeof showPage === 'function') showPage('training');
        });
      }
    });
    console.log('TCA Training Module v2.1 loaded OK');
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();