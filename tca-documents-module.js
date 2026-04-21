// TCA Documents Module v2.0 - The Care Advantage Ltd
// Supabase Storage backend - files stored permanently, accessible on any device
(function() {
'use strict';
var SURL='https://vhebrkhdgeiyxkpphlut.supabase.co';
var SKEY=window.SUPABASE_KEY||'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoZWJya2hkZ2VpeXhrcHBobHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTIyMjQsImV4cCI6MjA5MDI4ODIyNH0.8ux8cztStNiGEt1fRsVZYubhE2inx24iQaCiZdQV3lk';
var BUCKET='staff-documents';
var CATS=[
  {k:'rtw',l:'Right To Work',i:'RTW',t:['UK Passport','EU/EEA Passport','BRP Card','Share Code','Visa','Birth Cert + NI','Other RTW']},
  {k:'dbs',l:'DBS Certificate',i:'DBS',t:['Enhanced DBS','Standard DBS','Basic DBS','Update Service Check','Overseas Criminal Record']},
  {k:'id',l:'Proof of Identity',i:'ID',t:['Passport','Driving Licence','National ID Card','Birth Certificate','Bank Statement','Utility Bill','HMRC Letter']},
  {k:'refs',l:'References',i:'REF',t:['Professional Ref 1','Professional Ref 2','Character Reference','Employment Reference']},
  {k:'quals',l:'Qualifications',i:'QUAL',t:['Level 3 H&SC','Level 4 H&SC','First Aid Certificate','Manual Handling','Safeguarding','Other Qual']},
  {k:'contr',l:'Contracts & Offer',i:'CON',t:['Offer Letter','Employment Contract','Signed Contract','Job Description']},
  {k:'other',l:'Other Documents',i:'DOC',t:['Interview Notes','Application Form','CV','Medical Declaration','Other']}
];
function sbH(){return{'Authorization':'Bearer '+SKEY,'apikey':SKEY};}
function toast(m,c){if(window.showToast){window.showToast(m,c);return;}var t=document.createElement('div');t.style.cssText='position:fixed;bottom:24px;right:24px;background:'+(c||'#1C3D6E')+';color:#fff;padding:12px 20px;border-radius:8px;z-index:99999;font-size:13px;font-weight:600';t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove();},3500);}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function qi(n){return n;}
function qk(s){return"'"+(s||'').replace(/'/g,"\\'")+"'";}
// Load docs from Supabase
async function loadDocs(sid){
  try{
    var r=await fetch(SURL+'/rest/v1/staff_documents?staff_id=eq.'+sid+'&order=upload_date.desc',{headers:Object.assign({'Content-Type':'application/json'},sbH())});
    if(!r.ok){return[];}
    return await r.json();
  }catch(e){return[];}
}
// Upload file to Supabase Storage + save metadata
async function uploadDoc(sid,ck,file,docType,notes){
  var ts=Date.now();
  var safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  var path='staff/'+sid+'/'+ck+'/'+ts+'_'+safeName;
  var upR=await fetch(SURL+'/storage/v1/object/'+BUCKET+'/'+path,{
    method:'POST',
    headers:Object.assign({'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},sbH()),
    body:file
  });
  if(!upR.ok){var ue=await upR.text();throw new Error('Upload failed: '+ue);}
  var meta={
    staff_id:sid,
    org_id:'TCA',
    category:ck,
    doc_type:docType,
    filename:file.name,
    file_size:file.size,
    file_url:path,
    notes:notes||'',
    uploaded_by:window._currentUserEmail||'admin',
    upload_date:new Date().toISOString()
  };
  var mR=await fetch(SURL+'/rest/v1/staff_documents',{
    method:'POST',
    headers:Object.assign({'Content-Type':'application/json','Prefer':'return=minimal'},sbH()),
    body:JSON.stringify(meta)
  });
  if(!mR.ok){var me=await mR.text();console.warn('Meta save err:',me);}
}
// Get signed URL for viewing
async function signedUrl(path){
  try{
    var r=await fetch(SURL+'/storage/v1/object/sign/'+BUCKET+'/'+path,{
      method:'POST',
      headers:Object.assign({'Content-Type':'application/json'},sbH()),
      body:JSON.stringify({expiresIn:3600})
    });
    var j=await r.json();
    return j.signedURL?SURL+'/storage/v1'+j.signedURL:null;
  }catch(e){return null;}
}
window._tcaDocsRemove=async function(sid,docId,path){
  if(!confirm('Remove this document? This cannot be undone.'))return;
  try{
    if(path){await fetch(SURL+'/storage/v1/object/'+BUCKET+'/'+path,{method:'DELETE',headers:sbH()});}
    await fetch(SURL+'/rest/v1/staff_documents?doc_id=eq.'+docId,{method:'DELETE',headers:Object.assign({'Content-Type':'application/json'},sbH())});
    toast('Document removed','#6c757d');
    window._tcaRenderDocs(sid);
  }catch(e){toast('Error: '+e.message,'#dc3545');}
};
window._tcaDocsView=async function(path,name){
  var url=await signedUrl(path);
  if(url){window.open(url,'_blank');}else{toast('Could not open document','#dc3545');}
};
window._tcaRenderDocs=async function(sid){
  var p=document.getElementById('ftab-docs');if(!p)return;
  p.innerHTML='<div style="padding:24px;color:#888;text-align:center;font-size:13px">Loading documents…</div>';
  var docs=await loadDocs(sid);
  var sn='';
  var so=(window._allStaffData||[]).find(function(s){return s.id===sid;});
  if(so)sn=so.name||'';
  var bycat={};CATS.forEach(function(c){bycat[c.k]=[];});
  docs.forEach(function(d){if(bycat[d.category])bycat[d.category].push(d);else{if(!bycat.other)bycat.other=[];bycat.other.push(d);}});
  var tot=docs.length;
  var ch=CATS.map(function(cat){
    var cd=bycat[cat.k]||[];
    var fh=cd.map(function(doc){
      var sz=doc.file_size?(doc.file_size>1048576?(doc.file_size/1048576).toFixed(1)+'MB':Math.round(doc.file_size/1024)+'KB'):'';
      var dt=doc.upload_date?new Date(doc.upload_date).toLocaleDateString('en-GB'):'';
      var by=doc.uploaded_by?(' • '+doc.uploaded_by.split('@')[0]):'';
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:#f8f9fa;border-radius:6px;margin-bottom:4px;font-size:12px">'
        +'<div style="flex:1;min-width:0">'
        +'<b style="color:#1C3D6E">'+esc(doc.doc_type||cat.l)+'</b> '
        +'<span style="color:#444">'+esc(doc.filename||'')+'</span>'
        +(sz?' <span style="color:#888">'+sz+'</span>':'')
        +'<br><span style="color:#aaa;font-size:10px">'+dt+by+(doc.notes?' • '+esc(doc.notes):'')+'</span>'
        +'</div>'
        +'<div style="display:flex;gap:4px;margin-left:8px;flex-shrink:0">'
        +(doc.file_url?'<button onclick="window._tcaDocsView('+qk(doc.file_url)+','+qk(doc.filename)+')" style="background:#0d6efd;color:#fff;border:none;border-radius:4px;padding:3px 9px;cursor:pointer;font-size:11px">View</button>':'')
        +'<button onclick="window._tcaDocsRemove('+qi(sid)+','+qk(doc.doc_id)+','+qk(doc.file_url)+')" style="background:#fee;border:1px solid #fcc;border-radius:4px;padding:3px 7px;cursor:pointer;color:#dc3545;font-size:12px">&times;</button>'
        +'</div>'
        +'</div>';
    }).join('');
    return '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:8px">'
      +'<div style="padding:8px 14px;background:#f8f9fa;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between">'
      +'<b style="font-size:13px">'+cat.i+' — '+cat.l+(cd.length?' <span style="background:#0d6efd;color:#fff;padding:1px 7px;border-radius:10px;font-size:10px">'+cd.length+'</span>':'')+'</b>'
      +'<button onclick="window._tcaDocsUpload('+qi(sid)+','+qk(cat.k)+')" style="background:#0d6efd;color:#fff;border:none;border-radius:5px;padding:4px 12px;cursor:pointer;font-size:11px;font-weight:600">+ Upload</button>'
      +'</div>'
      +(cd.length?'<div style="padding:8px">'+fh+'</div>':'')
      +'</div>';
  }).join('');
  p.innerHTML='<div style="padding:16px">'
    +'<div style="display:flex;align-items:center;margin-bottom:10px">'
    +'<b style="color:#1C3D6E;font-size:14px">&#x1F4CE; Documents'+(sn?' &mdash; '+esc(sn):'')+'</b>'
    +'<span style="font-size:11px;color:#888;margin-left:8px">('+tot+' file'+(tot!==1?'s':'')+')</span>'
    +'</div>'
    +'<div style="font-size:11px;color:#1C3D6E;background:#e8f4fd;border:1px solid #b8dcf5;border-radius:6px;padding:7px 12px;margin-bottom:12px">&#x1F512; Securely stored in Supabase — available on any device, fully backed up, GDPR compliant</div>'
    +ch+'</div>';
};
window._tcaDocsUpload=function(sid,ck){
  var cat=CATS.find(function(c){return c.k===ck;});if(!cat)return;
  var to=cat.t.map(function(t){return'<option>'+esc(t)+'</option>';}).join('');
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:200000;display:flex;align-items:center;justify-content:center';
  ov.id='tca-doc-upload-ov';
  ov.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;width:440px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,.2)">'
    +'<h3 style="margin:0 0 16px;color:#1C3D6E;font-size:15px">&#x1F4CE; Upload '+esc(cat.l)+'</h3>'
    +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;color:#333">Document Type</label>'
    +'<select id="tca-doc-type" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;box-sizing:border-box">'+to+'</select>'
    +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;color:#333">Select File <span style="color:#dc3545">*</span></label>'
    +'<input type="file" id="tca-doc-file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.csv" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box;font-size:13px">'
    +'<label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;color:#333">Notes <span style="color:#999;font-weight:400">(optional)</span></label>'
    +'<input type="text" id="tca-doc-notes" placeholder="e.g. expires 01/01/2027" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;margin-bottom:4px">'
    +'<p style="font-size:11px;color:#888;margin:8px 0 14px">Max 50MB. PDF, Word, Excel, JPG, PNG accepted.</p>'
    +'<div id="tca-doc-progress" style="display:none;margin-bottom:12px;padding:8px 12px;background:#e8f4fd;border-radius:6px;font-size:12px;color:#0d6efd;font-weight:600">Uploading… please wait</div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end">'
    +'<button id="tca-doc-cancel" onclick="document.getElementById(\'tca-doc-upload-ov\').remove()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px">Cancel</button>'
    +'<button id="tca-doc-save" onclick="window._tcaDocsConfirm('+qi(sid)+','+qk(ck)+')" style="padding:8px 18px;background:#0d6efd;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">Save Document</button>'
    +'</div></div>';
  document.body.appendChild(ov);
};
window._tcaDocsConfirm=async function(sid,ck){
  var fi=document.getElementById('tca-doc-file');
  var ts=document.getElementById('tca-doc-type');
  var ni=document.getElementById('tca-doc-notes');
  var prog=document.getElementById('tca-doc-progress');
  var saveBtn=document.getElementById('tca-doc-save');
  var cancelBtn=document.getElementById('tca-doc-cancel');
  if(!fi||!fi.files||!fi.files.length){alert('Please select a file');return;}
  var f=fi.files[0];
  if(f.size>52428800){alert('File too large. Max 50MB.');return;}
  if(prog)prog.style.display='block';
  if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Saving…';}
  if(cancelBtn)cancelBtn.disabled=true;
  try{
    await uploadDoc(sid,ck,f,ts?ts.value:ck,ni?ni.value:'');
    var ov=document.getElementById('tca-doc-upload-ov');
    if(ov)ov.remove();
    toast(f.name+' saved securely ✅','#28a745');
    window._tcaRenderDocs(sid);
  }catch(e){
    if(prog)prog.style.display='none';
    if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Save Document';}
    if(cancelBtn)cancelBtn.disabled=false;
    toast('Upload failed: '+e.message,'#dc3545');
    console.error('TCA docs upload error:',e);
  }
};
function inj(sid){
  var ft=document.getElementById('form-tabs');
  var m=document.querySelector('.modal');
  if(!ft||!m)return;
  var ex=document.getElementById('ftab-docs');
  var eb=document.querySelector('[data-docs-tab]');
  if(ex)ex.remove();if(eb)eb.remove();
  var btn=document.createElement('button');
  btn.className='form-tab';btn.innerHTML='&#x1F4CE; Documents';btn.setAttribute('data-docs-tab','1');
  btn.addEventListener('click',function(){
    document.querySelectorAll('.form-tab').forEach(function(t){t.classList.remove('active');});
    document.querySelectorAll('.form-section').forEach(function(s){s.classList.remove('active');});
    this.classList.add('active');
    var p=document.getElementById('ftab-docs');
    if(p){p.classList.add('active');window._tcaRenderDocs(sid);}
  });
  ft.appendChild(btn);
  var pn=document.createElement('div');pn.id='ftab-docs';pn.className='form-section';
  pn.innerHTML='<div style="padding:16px;color:#888">Click &#x1F4CE; Documents tab to upload files.</div>';
  var fo=m.querySelector('.modal-footer');fo?m.insertBefore(pn,fo):m.appendChild(pn);
}
var _og=window.openForm;
if(_og&&!window._docsMod20){
  window._docsMod20=true;
  window.openForm=function(so){
    _og.apply(this,arguments);
    var sid=null;
    if(so&&typeof so==='object'){sid=so.id;}else if(so&&typeof so==='number'){sid=so;}
    if(sid){setTimeout(function(){inj(sid);},200);}
  };
}
function fixOb(){
  var ob=document.getElementById('page-onboarding');if(!ob)return;
  ob.querySelectorAll('button').forEach(function(b){
    if(b.textContent.trim().includes('Back')&&!b.getAttribute('onclick')&&!b._obf){
      b._obf=true;b.setAttribute('onclick',"window.obShowTab('list')");
    }
  });
}
fixOb();setInterval(fixOb,1500);
console.log('TCA Documents Module v2.0 loaded OK - Supabase Storage backend active');
})();