const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);
const today=()=>new Date().toISOString().slice(0,10);
const fdate=d=>d?new Date(d+'T00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kv=(a,s)=>a.map(([v,l])=>`<option value="${esc(v)}" ${v===s?'selected':''}>${esc(l)}</option>`).join('');
const PAL=['#f97316','#991b1b','#eab308','#16a34a','#0ea5e9','#8b5cf6','#ec4899','#64748b'],charts={};
const drawChart=(id,cfg)=>{charts[id]?.destroy();charts[id]=new Chart($('#'+id),cfg)};
function toast(msg,type=''){let c=$('#toasts');if(!c){c=document.createElement('div');c.id='toasts';c.setAttribute('aria-live','polite');document.body.append(c)}const t=document.createElement('div');t.className='toast '+type;t.textContent=(type==='bad'?'✕ ':type==='warn'?'⚠ ':'✓ ')+msg;c.append(t);setTimeout(()=>t.remove(),3200)}
function modal(title,body,{onSave,saveText='Save',danger}={}){
  const o=document.createElement('div');o.className='overlay';
  o.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h3>${esc(title)}</h3><form novalidate>${body}<div class="foot"><button type="button" class="btn" data-x>${onSave?'Cancel':'Close'}</button>${onSave?`<button class="btn ${danger?'danger':'primary'}">${saveText}</button>`:''}</div></form></div>`;
  const close=()=>{o.remove();document.removeEventListener('keydown',onKey)},onKey=e=>e.key==='Escape'&&close();
  document.addEventListener('keydown',onKey);o.addEventListener('click',e=>{if(e.target===o||e.target.dataset.x!==undefined)close()});
  $('form',o).addEventListener('submit',async e=>{e.preventDefault();if(onSave&&(await onSave(o))!==false)close()});
  document.body.append(o);($('input,select,textarea,button',o)).focus();return o;
}
const confirmDel=(title,msg,fn)=>modal(title,`<p>${msg}</p><p>This action cannot be undone.</p>`,{saveText:'Delete',danger:1,onSave:()=>{fn()}});
const field=(label,name,input)=>`<div class="f"><label for="${name}">${label}</label>${input}<span class="err" data-err="${name}"></span></div>`;
const showErrors=(root,errs)=>{$$('[data-err]',root).forEach(e=>e.textContent=errs[e.dataset.err]||'');return Object.keys(errs).length===0};
const avatar=m=>m.photo?`<img class="av" src="${m.photo}" alt="">`:`<span class="av" aria-hidden="true">${esc((m.name||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase())}</span>`;
const NAV=[['index.html','📊 Dashboard','dashboard'],['members.html','👥 Members','members'],['add-contribution.html','➕ Add Contribution','add'],['mandatory.html','🎯 Mandatory Contributions','mandatory'],['contributions.html','💰 All Contributions','contributions'],['expenses.html','🧾 Expenses','expenses'],
['reports.html','📄 Download Report','report']];

function layout() {
  const page = document.body.dataset.page;

  $('#sidebar').innerHTML = `
  <div class="brand">
  <img
    src="images/mandal-logo.png"
    alt="Ganesh Mandal Logo"
  ><button class="btn close-btn" id="close-menu" aria-label="Close menu">✕</button>
</div>
    <nav class="nav" aria-label="Main">
      ${NAV.map(n => `
        <a href="${n[0]}" class="${n[2] === page ? 'active' : ''}">
          ${n[1]}
        </a>
      `).join('')}
    </nav>
    <div class="side-foot">Created by Pratik Patil</div>
  `;

  $('#topbar').innerHTML = `
    <button class="btn menu-btn" aria-label="Menu" id="menu">☰</button>
    <h1>${NAV.find(n => n[2] === page)[1].slice(2)}</h1>
    <span class="grow"></span>
    <span class="hide-m" style="font-size:12px;color:var(--muted)">
      ${esc(window.userEmail)}
    </span>
    <button class="btn" id="theme" aria-label="Toggle theme"></button>
    <button class="btn" id="logout">Logout</button>
  `;

  const side = $('#sidebar');
  document.addEventListener('click', e => {
    if (e.target.closest('#menu')) side.classList.toggle('open');             // ☰ opens or closes
    else if (e.target.closest('#close-menu')) side.classList.remove('open');  // ✕ closes
    else if (side.classList.contains('open') && !e.target.closest('#sidebar')) side.classList.remove('open'); // tapping outside closes
  });
  $('#logout').onclick = async () => {
    await sb.auth.signOut();
    location.href = 'login.html';
  };

  const set = t => {
    document.documentElement.dataset.theme = t;
    localStorage.setItem('gm_theme', t);
    $('#theme').textContent =
      t === 'dark' ? '☀ Light' : '🌙 Dark';
  };

  set(localStorage.getItem('gm_theme') || 'light');

  $('#theme').onclick = () =>
    set(
      document.documentElement.dataset.theme === 'dark'
        ? 'light'
        : 'dark'
    );
}

document.addEventListener('DOMContentLoaded',async()=>{
  const {data}=await sb.auth.getSession();if(!data.session){location.href='login.html';return}
  window.userEmail=data.session.user.email;
  try{await Store.load()}catch(e){console.error(e);$('#main').innerHTML='<div class="card empty"><h3>Could not load data</h3><p>'+esc(e.message)+'</p></div>';layout();return}
  layout();PAGES[document.body.dataset.page]()});
