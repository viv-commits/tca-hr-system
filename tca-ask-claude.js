/* tca-ask-claude.js
 * Floating "Ask TCA" AI assistant widget.
 * Self-contained: injects its own CSS and DOM. No external dependencies.
 * Talks to /.netlify/functions/ask-claude.
 *
 * Usage: just include <script src="/tca-ask-claude.js" defer></script> in index.html.
 * The widget mounts itself once the DOM is ready.
 */
(function () {
    'use strict';

   if (window.__tcaAskClaudeMounted) return;
    window.__tcaAskClaudeMounted = true;

   var ENDPOINT = '/.netlify/functions/ask-claude';
    var STORAGE_KEY = 'tca_ask_claude_history_v1';
    var MAX_TURNS_KEPT = 16;

   // ---------- styles ----------
   var css = ''
      + '.tca-ai-fab{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;'
      + 'background:linear-gradient(135deg,#0ea5b7,#0f1c2e);color:#fff;border:none;cursor:pointer;'
      + 'box-shadow:0 8px 24px rgba(15,28,46,.28);font-size:24px;line-height:1;z-index:99998;'
      + 'display:flex;align-items:center;justify-content:center;transition:transform .15s ease;}'
      + '.tca-ai-fab:hover{transform:scale(1.06);}'
      + '.tca-ai-fab:focus{outline:3px solid #7dd3fc;outline-offset:2px;}'
      + '.tca-ai-panel{position:fixed;right:20px;bottom:88px;width:380px;max-width:calc(100vw - 40px);'
      + 'height:560px;max-height:calc(100vh - 120px);background:#fff;border-radius:14px;'
      + 'box-shadow:0 16px 48px rgba(15,28,46,.28);display:none;flex-direction:column;overflow:hidden;'
      + 'z-index:99999;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0c1424;}'
      + '.tca-ai-panel.open{display:flex;}'
      + '.tca-ai-head{background:linear-gradient(135deg,#0ea5b7,#0f1c2e);color:#fff;padding:12px 14px;'
      + 'display:flex;align-items:center;justify-content:space-between;}'
      + '.tca-ai-head h3{margin:0;font-size:15px;font-weight:600;letter-spacing:.2px;}'
      + '.tca-ai-head .tca-ai-sub{font-size:11px;opacity:.85;margin-top:2px;}'
      + '.tca-ai-head-actions{display:flex;gap:6px;}'
      + '.tca-ai-iconbtn{background:transparent;color:#fff;border:none;cursor:pointer;font-size:14px;'
      + 'padding:4px 8px;border-radius:6px;opacity:.85;}'
      + '.tca-ai-iconbtn:hover{background:rgba(255,255,255,.12);opacity:1;}'
      + '.tca-ai-body{flex:1;overflow-y:auto;padding:12px;background:#f8fafc;}'
      + '.tca-ai-msg{max-width:88%;padding:9px 12px;border-radius:12px;font-size:13.5px;line-height:1.45;'
      + 'margin-bottom:8px;white-space:pre-wrap;word-wrap:break-word;}'
      + '.tca-ai-msg.user{background:#0ea5b7;color:#fff;margin-left:auto;border-bottom-right-radius:4px;}'
      + '.tca-ai-msg.assistant{background:#fff;color:#0c1424;border:1px solid #e2e8f0;'
      + 'border-bottom-left-radius:4px;}'
      + '.tca-ai-msg.error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}'
      + '.tca-ai-msg.thinking{background:#fff;color:#64748b;border:1px solid #e2e8f0;font-style:italic;}'
      + '.tca-ai-empty{color:#64748b;font-size:13px;text-align:center;padding:24px 12px;}'
      + '.tca-ai-empty h4{margin:0 0 6px;color:#0c1424;font-size:14px;}'
      + '.tca-ai-suggest{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;justify-content:center;}'
      + '.tca-ai-chip{background:#fff;border:1px solid #cbd5e1;color:#0c1424;font-size:12px;'
      + 'padding:6px 10px;border-radius:999px;cursor:pointer;}'
      + '.tca-ai-chip:hover{background:#0ea5b7;color:#fff;border-color:#0ea5b7;}'
      + '.tca-ai-foot{border-top:1px solid #e2e8f0;padding:10px;background:#fff;'
      + 'display:flex;gap:8px;align-items:flex-end;}'
      + '.tca-ai-input{flex:1;border:1px solid #cbd5e1;border-radius:10px;padding:8px 10px;'
      + 'font-size:13.5px;font-family:inherit;resize:none;min-height:38px;max-height:120px;outline:none;}'
      + '.tca-ai-input:focus{border-color:#0ea5b7;box-shadow:0 0 0 3px rgba(14,165,183,.2);}'
      + '.tca-ai-send{background:#0ea5b7;color:#fff;border:none;border-radius:10px;'
      + 'padding:0 14px;height:38px;cursor:pointer;font-weight:600;font-size:13px;}'
      + '.tca-ai-send:disabled{background:#94a3b8;cursor:not-allowed;}'
      + '.tca-ai-disclaim{font-size:10.5px;color:#64748b;text-align:center;padding:6px 8px 8px;'
      + 'background:#fff;border-top:1px solid #f1f5f9;}'
      + '@media (max-width:480px){.tca-ai-panel{right:10px;left:10px;width:auto;bottom:78px;'
      + 'height:calc(100vh - 100px);}}';

   var style = document.createElement('style');
    style.setAttribute('data-tca-ai', '1');
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);

   // ---------- DOM ----------
   var fab = document.createElement('button');
    fab.className = 'tca-ai-fab';
    fab.setAttribute('aria-label', 'Open TCA Assistant');
    fab.title = 'Ask TCA Assistant';
    fab.innerHTML = '\u2728';

   var panel = document.createElement('div');
    panel.className = 'tca-ai-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'TCA Assistant');
    panel.innerHTML = ''
      + '<div class="tca-ai-head">'
      +   '<div>'
      +     '<h3>TCA Assistant</h3>'
      +     '<div class="tca-ai-sub">Ask anything about the system</div>'
      +   '</div>'
      +   '<div class="tca-ai-head-actions">'
      +     '<button class="tca-ai-iconbtn" data-act="clear" title="Clear chat" aria-label="Clear chat">\u21BB</button>'
      +     '<button class="tca-ai-iconbtn" data-act="close" title="Close" aria-label="Close">\u2715</button>'
      +   '</div>'
      + '</div>'
      + '<div class="tca-ai-body" id="tca-ai-body"></div>'
      + '<div class="tca-ai-foot">'
      +   '<textarea class="tca-ai-input" id="tca-ai-input" rows="1" placeholder="Ask a question, e.g. \u201Chow do I add a new starter?\u201D"></textarea>'
      +   '<button class="tca-ai-send" id="tca-ai-send" type="button">Send</button>'
      + '</div>'
      + '<div class="tca-ai-disclaim">AI replies can be wrong \u2014 always double-check important details.</div>';

   document.body.appendChild(fab);
    document.body.appendChild(panel);

   var bodyEl = panel.querySelector('#tca-ai-body');
    var inputEl = panel.querySelector('#tca-ai-input');
    var sendBtn = panel.querySelector('#tca-ai-send');

   // ---------- state ----------
   var history = loadHistory();
    var sending = false;

   function loadHistory() {
         try {
                 var raw = sessionStorage.getItem(STORAGE_KEY);
                 if (!raw) return [];
                 var arr = JSON.parse(raw);
                 return Array.isArray(arr) ? arr : [];
         } catch (e) { return []; }
   }
    function saveHistory() {
          try {
                  var trimmed = history.slice(-MAX_TURNS_KEPT);
                  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
          } catch (e) {}
    }

   // ---------- rendering ----------
   function escapeHtml(s) {
         return String(s).replace(/[&<>"']/g, function (c) {
                 return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
         });
   }

   function renderEmpty() {
         bodyEl.innerHTML = ''
           + '<div class="tca-ai-empty">'
           +   '<h4>Hi \u2014 how can I help?</h4>'
           +   'I can explain how to use the system, walk you through tasks, or suggest rota ideas.'
           +   '<div class="tca-ai-suggest">'
           +     '<button class="tca-ai-chip" data-q="How do I add a new starter?">How do I add a new starter?</button>'
           +     '<button class="tca-ai-chip" data-q="How do I find staff missing a DBS?">Find missing DBS</button>'
           +     '<button class="tca-ai-chip" data-q="Give me tips for building a fair weekly rota.">Rota tips</button>'
           +     '<button class="tca-ai-chip" data-q="What does the supervisions tab do?">Supervisions help</button>'
           +   '</div>'
           + '</div>';
   }

   function renderMessages() {
         if (!history.length) { renderEmpty(); return; }
         var html = '';
         for (var i = 0; i < history.length; i++) {
                 var m = history[i];
                 var cls = m.role === 'user' ? 'user' : (m.error ? 'error' : 'assistant');
                 html += '<div class="tca-ai-msg ' + cls + '">' + escapeHtml(m.content) + '</div>';
         }
         bodyEl.innerHTML = html;
         bodyEl.scrollTop = bodyEl.scrollHeight;
   }

   function showThinking() {
         var div = document.createElement('div');
         div.className = 'tca-ai-msg thinking';
         div.id = 'tca-ai-thinking';
         div.textContent = 'Thinking\u2026';
         bodyEl.appendChild(div);
         bodyEl.scrollTop = bodyEl.scrollHeight;
   }
    function clearThinking() {
          var t = document.getElementById('tca-ai-thinking');
          if (t) t.parentNode.removeChild(t);
    }

   // ---------- page context ----------
   function getPageContext() {
         var ctx = {};
         try {
                 var activeNav = document.querySelector('.nav-tab.active, [data-page].active, .page-tab.active');
                 if (activeNav) ctx.page = (activeNav.textContent || '').trim().slice(0, 40);
                 if (window.currentLoc) ctx.currentLoc = String(window.currentLoc).slice(0, 40);
                 var activeLoc = document.querySelector('#loc-bar .loc-btn.active, #loc-bar .loc-btn[aria-pressed="true"]');
                 if (activeLoc && !ctx.currentLoc) ctx.currentLoc = (activeLoc.textContent || '').trim().slice(0, 40);
                 var staffRows = document.querySelectorAll('table tbody tr');
                 if (staffRows && staffRows.length) ctx.staffCount = staffRows.length;
         } catch (e) {}
         return ctx;
   }

   // ---------- networking ----------
   function send(question) {
         if (sending) return;
         var text = (question == null ? inputEl.value : question).trim();
         if (!text) return;

      sending = true;
         sendBtn.disabled = true;
         inputEl.value = '';
         autosize();

      history.push({ role: 'user', content: text });
         saveHistory();
         renderMessages();
         showThinking();

      var payload = {
              messages: history.map(function (m) { return { role: m.role, content: m.content }; }),
              pageContext: getPageContext()
      };

      fetch(ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
      })
           .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
           .then(function (res) {
                     clearThinking();
                     if (!res.ok || !res.data || res.data.ok === false) {
                                 var msg = (res.data && (res.data.error || (res.data.detail && res.data.detail.error && res.data.detail.error.message))) || 'Sorry, something went wrong.';
                                 history.push({ role: 'assistant', content: 'Sorry \u2014 ' + msg, error: true });
                     } else {
                                 history.push({ role: 'assistant', content: res.data.reply || '(no reply)' });
                     }
                     saveHistory();
                     renderMessages();
           })
           .catch(function (e) {
                     clearThinking();
                     history.push({ role: 'assistant', content: 'Network error: ' + (e && e.message ? e.message : e), error: true });
                     saveHistory();
                     renderMessages();
           })
           .then(function () {
                     sending = false;
                     sendBtn.disabled = false;
                     inputEl.focus();
           });
   }

   // ---------- UI events ----------
   function open() {
         panel.classList.add('open');
         renderMessages();
         setTimeout(function () { inputEl.focus(); }, 50);
   }
    function close() { panel.classList.remove('open'); }
    function toggle() { panel.classList.contains('open') ? close() : open(); }

   function clearChat() {
         history = [];
         saveHistory();
         renderMessages();
   }

   function autosize() {
         inputEl.style.height = 'auto';
         inputEl.style.height = Math.min(120, inputEl.scrollHeight) + 'px';
   }

   fab.addEventListener('click', toggle);
    panel.addEventListener('click', function (e) {
          var act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
          if (act === 'close') close();
          else if (act === 'clear') clearChat();
          var q = e.target && e.target.getAttribute && e.target.getAttribute('data-q');
          if (q) send(q);
    });
    sendBtn.addEventListener('click', function () { send(); });
    inputEl.addEventListener('input', autosize);
    inputEl.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
          }
    });
    document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

   // initial paint
   renderMessages();
})();
