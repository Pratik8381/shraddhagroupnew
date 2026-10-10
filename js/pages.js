const PAGES={},CATS=['Pandal','Decoration','Sound System','Lighting','Electricity','Food','Prasad','Flowers','Idol','Transportation','Security','Cultural Program','Cleaning','Miscellaneous'];
const main=()=>$('#main'),mem=id=>DB.get('members',id),mname=id=>mem(id)?.name||'(deleted member)';
const statCls={Paid:'b-ok','Partially Paid':'b-warn',Pending:'b-bad'};
const emptyBox=(t,p,id,b)=>`<div class="empty"><h3>${t}</h3><p>${p}</p>${id?`<button class="btn primary" id="${id}">${b}</button>`:''}</div>`;
const bar=p=>`<div class="bar"><i class="${p>=100?'':p>=50?'warn':'over'}" style="width:${Math.min(100,p)}%"></i></div>`;
const head=(t,p,btns='')=>`<div class="page-head"><div><h2>${t}</h2><p>${p}</p></div><div style="display:flex;gap:8px;flex-wrap:wrap">${btns}</div></div>`;
const card=(l,v,cls='',sub='')=>`<div class="card stat ${cls}"><small>${l}</small><div class="v">${v}</div>${sub?`<div class="d">${sub}</div>`:''}</div>`;
const actions=id=>`<button class="btn icon" data-e="${id}" aria-label="Edit">✏️</button><button class="btn icon" data-d="${id}" aria-label="Delete">🗑</button>`;
const typeBadge=c=>`<span class="badge ${c.type=='mandatory'?'b-man':'b-reg'}">${c.type=='mandatory'?'Mandatory':'Regular'}</span>${c.period?` <small>${esc(c.period)}</small>`:''}`;
/* ---------- Dashboard ---------- */
PAGES.dashboard=()=>{
  const t=totals(),cs=DB.list('contributions'),ex=DB.list('expenses'),pct=t.expected?Math.round(t.mandPaid/t.expected*100):0;
  const recent=[...cs.map(c=>({date:c.date,kind:'Income',d:`${mname(c.memberId)} · ${c.type}`,a:c.amount})),...ex.map(e=>({date:e.date,kind:'Expense',d:e.description,a:e.amount}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  const pend=mandatoryRows().filter(r=>r.pending>0).sort((a,b)=>b.pending-a.pending).slice(0,8);
  main().innerHTML=head('Ganesh Mandal Dashboard','Contributions, expenses and pending payments','<a class="btn primary" href="add-contribution.html">+ Add Contribution</a><a class="btn" href="expenses.html">+ Add Expense</a>')+
  `<div class="grid g4">${card('Total Members',t.members)}${card('Contributions Collected',fmt(t.collected),'up')}${card('Mandatory Expected',fmt(t.expected))}${card('Pending Contributions',fmt(t.pending),'down')}${card('Total Expenses',fmt(t.expenses),'down')}${card('Available Balance',fmt(t.balance),'hero '+(t.balance<0?'down':''),'Contributions − Expenses')}</div>
  <div class="card" style="margin-bottom:16px"><h3>Mandatory collection: ${pct}%</h3>${bar(pct)}<p class="d" style="color:var(--muted);font-size:13px">${fmt(t.mandPaid)} received of ${fmt(t.expected)} expected</p></div>
  <div class="grid g2"><div class="card"><h3>Income vs Expense</h3><div class="chartbox"><canvas id="c1"></canvas></div></div><div class="card"><h3>Expenses by Category</h3><div class="chartbox"><canvas id="c2"></canvas></div></div></div>
  <div class="grid g2"><div class="card"><h3>Recent Transactions</h3><div class="tbl">${recent.length?`<table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th></tr></thead><tbody>${recent.map(r=>`<tr><td>${fdate(r.date)}</td><td><span class="badge ${r.kind=='Income'?'b-income':'b-expense'}">${r.kind}</span></td><td>${esc(r.d)}</td><td><b class="${r.kind=='Income'?'up':'down'}">${r.kind=='Income'?'+':'−'}${fmt(r.a)}</b></td></tr>`).join('')}</tbody></table>`:emptyBox('No transactions yet','Record a contribution or expense to begin.')}</div></div>
  <div class="card"><h3>Pending Member Payments</h3><div class="tbl">${pend.length?`<table><thead><tr><th>Member</th><th>Period</th><th>Pending</th><th style="min-width:110px">Paid</th></tr></thead><tbody>${pend.map(r=>`<tr><td>${esc(r.member?.name)}<br><small style="color:var(--muted)">${esc(r.member?.mobile)}</small></td><td>${esc(r.period)}</td><td><b class="down">${fmt(r.pending)}</b></td><td>${bar(Math.round(r.paid/r.amount*100))}</td></tr>`).join('')}</tbody></table>`:emptyBox('No pending payments','Everyone is up to date 🎉')}</div></div></div>`;
  const ms=[...new Set([...cs,...ex].map(x=>x.date.slice(0,7)))].sort().slice(-6),m=(l,k)=>sum(l.filter(x=>x.date.startsWith(k)));
  drawChart('c1',{type:'bar',data:{labels:ms.map(k=>new Date(k+'-15').toLocaleString('en',{month:'short',year:'2-digit'})),datasets:[{label:'Income',data:ms.map(k=>m(cs,k)),backgroundColor:'#16a34a'},{label:'Expense',data:ms.map(k=>m(ex,k)),backgroundColor:'#f97316'}]},options:{maintainAspectRatio:false}});
  const bc={};ex.forEach(e=>bc[e.category]=(bc[e.category]||0)+e.amount);
  drawChart('c2',{type:'doughnut',data:{labels:Object.keys(bc),datasets:[{data:Object.values(bc),backgroundColor:PAL.concat(PAL)}]},options:{maintainAspectRatio:false,plugins:{legend:{position:'right'}}}});
};
/* ---------- Members ---------- */
const shrink=f=>new Promise(ok=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=c.height=96;const s=Math.min(i.width,i.height);c.getContext('2d').drawImage(i,(i.width-s)/2,(i.height-s)/2,s,s,0,0,96,96);ok(c.toDataURL('image/jpeg',.75))};i.src=URL.createObjectURL(f)});

function memberForm(m, done) {
  const e = !!m;
  m = m || {};

  const o = modal(
    e ? 'Edit Member' : 'Add Member',
    field(
      'Name *',
      'name',
      `<input id="name" value="${esc(m.name)}">`
    ) +
    field(
      'Mobile Number *',
      'mobile',
      `<input id="mobile" inputmode="numeric" maxlength="10" value="${esc(m.mobile)}">`
    ),
    {
      onSave(r) {
        const name = $('#name', r).value.trim();
        const mob = $('#mobile', r).value.trim();
        const er = {};

        if (!name) er.name = 'Name is required';

        if (!mob) {
          er.mobile = 'Mobile number is required';
        } else if (!/^[6-9]\d{9}$/.test(mob)) {
          er.mobile = 'Enter a valid 10-digit mobile number';
        } else if (
          DB.list('members').some(
            x => x.mobile === mob && x.id !== m.id
          )
        ) {
          er.mobile = 'This mobile number already exists';
        }

        if (!showErrors(r, er)) return false;

        const d = {
          name,
          mobile: mob,
          photo: m.photo || ''
        };

        e
          ? DB.update('members', m.id, d)
          : DB.add('members', d);

        toast(
          e ? 'Member updated successfully' : 'Member added successfully'
        );

        done();
      }
    }
  );
}

PAGES.members=()=>{
  main().innerHTML=head('Members','Add and manage Mandal members','<button class="btn primary" id="add">+ Add Member</button>')+`<div class="card"><div class="filters"><input id="q" type="search" placeholder="Search by name or mobile…" aria-label="Search members"></div><div class="tbl" id="list"></div></div>`;
  const draw=()=>{const q=$('#q').value.toLowerCase(),all=DB.list('members'),l=all.filter(m=>m.name.toLowerCase().includes(q)||m.mobile.includes(q)),cs=DB.list('contributions');
    $('#list').innerHTML=!all.length?emptyBox('No members yet','Add your first member.','add2','+ Add Member'):l.length?`<table><thead><tr><th>Member</th><th>Mobile</th><th>Total Contributed</th><th>Actions</th></tr></thead><tbody>${l.map(m=>`<tr><td>${avatar(m)}${esc(m.name)}</td><td>${esc(m.mobile)}</td><td><b>${fmt(sum(cs.filter(c=>c.memberId===m.id)))}</b></td><td>${actions(m.id)}</td></tr>`).join('')}</tbody></table>`:emptyBox('No matching members','');
    $('#add2')&&($('#add2').onclick=()=>memberForm(null,draw))};
  $('#add').onclick=()=>memberForm(null,draw);$('#q').oninput=draw;
  $('#list').onclick=ev=>{const e=ev.target.closest('[data-e]'),d=ev.target.closest('[data-d]');
    if(e)memberForm(mem(e.dataset.e),draw);
    if(d){const id=d.dataset.d;if(DB.list('contributions').some(c=>c.memberId===id)||DB.list('mandatory').some(a=>a.memberId===id))return toast('This member has contributions or mandatory assignments. Delete those first.','bad');
      confirmDel('Delete Member?',`Are you sure you want to delete <b>${esc(mname(id))}</b>?`,()=>{DB.remove('members',id);toast('Member deleted');draw()})}};
  draw();
};
/* ---------- Contribution form (shared by Add page, edit modal, mandatory "record payment") ---------- */
const contribHTML=c=>{c=c||{};return field('Member *','memberId',`<select id="memberId"><option value="">Select member</option>${kv(DB.list('members').map(m=>[m.id,m.name+' · '+m.mobile]),c.memberId)}</select>`)+`<div class="row2">`+field('Type','type',`<select id="type">${kv([['regular','Regular'],['mandatory','Mandatory']],c.type||'regular')}</select>`)+field('Mandatory Period','period','<select id="period"></select>')+`</div><div class="row2">`+field('Amount (₹) *','amount',`<input id="amount" type="number" min="1" step="any" value="${c.amount??''}">`)+field('Date *','date',`<input id="date" type="date" value="${c.date||today()}">`)+`</div>`+field('Notes (optional)','notes',`<textarea id="notes" rows="2">${esc(c.notes)}</textarea>`)};
function bindContrib(r,c){c=c||{};
  const fill=()=>{const mand=$('#type',r).value==='mandatory',p=$('#period',r),rows=mandatoryRows().filter(a=>a.memberId===$('#memberId',r).value);p.disabled=!mand;
    p.innerHTML=!mand?'<option value="">—</option>':rows.length?kv(rows.map(a=>[a.period,`${a.period} (pending ${fmt(a.pending)})`]),c.period):'<option value="">No assignment</option>'};
  $('#memberId',r).onchange=fill;$('#type',r).onchange=fill;
  $('#period',r).onchange=()=>{const a=mandatoryRows().find(x=>x.memberId===$('#memberId',r).value&&x.period===$('#period',r).value);if(a&&!$('#amount',r).value&&a.pending)$('#amount',r).value=a.pending};fill()}
function collectContrib(r){const g=i=>$('#'+i,r).value.trim(),er={},amt=parseFloat(g('amount')),mand=g('type')==='mandatory';
  if(!g('memberId'))er.memberId='Select a member';else if(!mem(g('memberId')))er.memberId='Member not found';
  if(!g('amount'))er.amount='Amount is required';else if(!(amt>0))er.amount='Amount must be greater than 0';if(!g('date'))er.date='Date is required';
  if(mand&&!g('period'))er.period='This member has no mandatory assignment for any period';
  if(!showErrors(r,er))return null;return{memberId:g('memberId'),type:g('type'),period:mand?g('period'):'',amount:amt,date:g('date'),notes:g('notes')}}
function contribModal(c,done){const e=!!c?.id,o=modal(e?'Edit Contribution':'Record Payment',contribHTML(c),{onSave(r){const d=collectContrib(r);if(!d)return false;e?DB.update('contributions',c.id,d):DB.add('contributions',d);toast(e?'Contribution updated successfully':'Contribution recorded successfully');done()}});bindContrib(o,c)}
PAGES.add=()=>{
  main().innerHTML=head('Add Contribution','Record a payment against an existing member')+`<div class="grid g2"><div class="card"><form id="cf" novalidate>${DB.list('members').length?contribHTML()+'<button class="btn primary">Save Contribution</button>':emptyBox('No members yet','Add a member before recording contributions.')}</form></div><div class="card"><h3>Recent Contributions</h3><div class="tbl" id="rec"></div></div></div>`;
  const rec=()=>{const l=DB.list('contributions').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);$('#rec').innerHTML=l.length?`<table><tbody>${l.map(c=>`<tr><td>${fdate(c.date)}</td><td>${esc(mname(c.memberId))}</td><td>${typeBadge(c)}</td><td><b>${fmt(c.amount)}</b></td></tr>`).join('')}</tbody></table>`:emptyBox('Nothing yet','')};
  rec();if(!DB.list('members').length){main().querySelector('.card').insertAdjacentHTML('beforeend','<a class="btn primary" href="members.html">+ Add Member</a>');return}
  const f=$('#cf');bindContrib(f);f.onsubmit=e=>{e.preventDefault();const d=collectContrib(f);if(!d)return;DB.add('contributions',d);toast('Contribution recorded successfully');f.reset();bindContrib(f);rec()};
};
/* ---------- Mandatory contributions ---------- */
const periods=()=>{const p=[...new Set(DB.list('mandatory').map(a=>a.period))];return p.length?p:[DEFAULT_PERIOD]};
PAGES.mandatory=()=>{
  let period=periods()[0];
  main().innerHTML=head('Mandatory Contributions','Set expected amounts and track payments','<button class="btn primary" id="add">+ Assign Amount</button><button class="btn" id="bulk">Assign to All Members</button>')+`<div class="card" style="margin-bottom:16px"><div class="filters"><select id="per" aria-label="Period"></select></div></div><div class="grid g4" id="cards"></div><div class="card tbl" id="list"></div>`;
  const draw=()=>{$('#per').innerHTML=kv(periods().map(p=>[p,p]),period);const rows=mandatoryRows(period).sort((a,b)=>(a.member?.name||'').localeCompare(b.member?.name||'')),exp=sum(rows),paid=rows.reduce((s,r)=>s+r.paid,0);
    $('#cards').innerHTML=card('Expected',fmt(exp))+card('Paid',fmt(paid),'up')+card('Pending',fmt(Math.max(0,exp-paid)),'down')+card('Members Assigned',rows.length);
    $('#list').innerHTML=rows.length?`<table><thead><tr><th>Member</th><th>Expected</th><th>Paid</th><th>Pending</th><th style="min-width:120px">Progress</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.member?.name)}<br><small style="color:var(--muted)">${esc(r.member?.mobile)}</small></td><td>${fmt(r.amount)}</td><td class="up">${fmt(r.paid)}</td><td class="${r.pending?'down':''}">${fmt(r.pending)}</td><td>${bar(Math.round(r.paid/r.amount*100))}</td><td><span class="badge ${statCls[r.status]}">${r.status}</span></td><td><button class="btn" data-p="${r.id}" ${r.pending?'':'disabled'}>Record Payment</button>${actions(r.id)}</td></tr>`).join('')}</tbody></table>`:emptyBox('No assignments for this period','Assign a mandatory amount to your members.');};
  const assign=a=>{const e=!!a;a=a||{};modal(e?'Edit Mandatory Amount':'Assign Mandatory Amount',field('Member *','memberId',`<select id="memberId" ${e?'disabled':''}><option value="">Select member</option>${kv(DB.list('members').map(m=>[m.id,m.name+' · '+m.mobile]),a.memberId)}</select>`)+field('Financial Period *','period',`<input id="period" list="pl" value="${esc(a.period||period)}" ${e?'disabled':''}><datalist id="pl">${periods().map(p=>`<option>${esc(p)}`).join('')}</datalist>`)+field('Mandatory Amount (₹) *','amount',`<input id="amount" type="number" min="1" step="any" value="${a.amount??''}">`),{onSave(r){
    const mid=$('#memberId',r).value,per=$('#period',r).value.trim(),amt=parseFloat($('#amount',r).value),er={};
    if(!mid)er.memberId='Select a member';if(!per)er.period='Period is required';if(!(amt>0))er.amount='Enter an amount greater than 0';
    if(!e&&DB.list('mandatory').some(x=>x.memberId===mid&&x.period.toLowerCase()===per.toLowerCase()))er.memberId='This member already has an assignment for this period';
    if(!showErrors(r,er))return false;e?DB.update('mandatory',a.id,{amount:amt}):DB.add('mandatory',{memberId:mid,period:per,amount:amt});period=per;toast('Mandatory amount saved successfully');draw()}})};
  $('#add').onclick=()=>assign();$('#per').onchange=e=>{period=e.target.value;draw()};
  $('#bulk').onclick=()=>modal('Assign to All Members',field('Financial Period *','period',`<input id="period" value="${esc(period)}">`)+field('Amount per member (₹) *','amount','<input id="amount" type="number" min="1" step="any">')+'<p style="color:var(--muted);font-size:13px">Members who already have this period are skipped.</p>',{onSave(r){
    const per=$('#period',r).value.trim(),amt=parseFloat($('#amount',r).value),er={};if(!per)er.period='Period is required';if(!(amt>0))er.amount='Enter an amount greater than 0';if(!showErrors(r,er))return false;
    let n=0;DB.list('members').forEach(m=>{if(!DB.list('mandatory').some(x=>x.memberId===m.id&&x.period.toLowerCase()===per.toLowerCase())){DB.add('mandatory',{memberId:m.id,period:per,amount:amt});n++}});period=per;toast(n+' member(s) assigned');draw()}});
  $('#list').onclick=ev=>{const p=ev.target.closest('[data-p]'),e=ev.target.closest('[data-e]'),d=ev.target.closest('[data-d]');
    if(p){const a=DB.get('mandatory',p.dataset.p);contribModal({memberId:a.memberId,type:'mandatory',period:a.period},draw)}
    if(e)assign(DB.get('mandatory',e.dataset.e));
    if(d){const a=mandatoryRows().find(x=>x.id===d.dataset.d);if(a.paid>0)return toast('Payments exist for this assignment. Delete them first.','bad');confirmDel('Delete Assignment?',`Remove the ${esc(a.period)} assignment for <b>${esc(a.member?.name)}</b>?`,()=>{DB.remove('mandatory',a.id);toast('Assignment deleted');draw()})}};
  draw();
};
/* ---------- All contributions ---------- */
PAGES.contributions=()=>{
  main().innerHTML=head('All Contributions','Every payment received, regular and mandatory','<a class="btn primary" href="add-contribution.html">+ Add Contribution</a>')+`<div class="grid g4" id="cards"></div><div class="card"><div class="filters"><input id="q" type="search" placeholder="Search member or notes…" aria-label="Search"><select id="ty" aria-label="Type"><option value="">All Types</option><option value="regular">Regular</option><option value="mandatory">Mandatory</option></select><select id="mb" aria-label="Member"><option value="">All Members</option>${kv(DB.list('members').map(m=>[m.id,m.name]))}</select><input id="from" type="date" aria-label="From"><input id="to" type="date" aria-label="To"></div><div class="tbl" id="list"></div></div>`;
  const draw=()=>{const all=DB.list('contributions'),q=$('#q').value.toLowerCase(),ty=$('#ty').value,mb=$('#mb').value,f=$('#from').value,t=$('#to').value;
    const l=all.filter(c=>(!ty||c.type===ty)&&(!mb||c.memberId===mb)&&(!f||c.date>=f)&&(!t||c.date<=t)&&(!q||mname(c.memberId).toLowerCase().includes(q)||(c.notes||'').toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date));
    $('#cards').innerHTML=card('Total Collected',fmt(sum(all)),'hero')+card('Regular',fmt(sum(all.filter(c=>c.type=='regular'))))+card('Mandatory',fmt(sum(all.filter(c=>c.type=='mandatory'))))+card('Shown Below',fmt(sum(l)),'',l.length+' payment(s)');
    $('#list').innerHTML=!all.length?emptyBox('No contributions yet','Record the first payment.'):l.length?`<table><thead><tr><th>Date</th><th>Member</th><th>Type</th><th>Amount</th><th>Notes</th><th>Actions</th></tr></thead><tbody>${l.map(c=>`<tr><td>${fdate(c.date)}</td><td>${esc(mname(c.memberId))}</td><td>${typeBadge(c)}</td><td><b>${fmt(c.amount)}</b></td><td>${esc(c.notes)}</td><td>${actions(c.id)}</td></tr>`).join('')}</tbody></table>`:emptyBox('No matching contributions','')};
  $$('.filters [id]').forEach(el=>el.addEventListener('input',draw));
  $('#list').onclick=ev=>{const e=ev.target.closest('[data-e]'),d=ev.target.closest('[data-d]');if(e)contribModal(DB.get('contributions',e.dataset.e),draw);
    if(d){const c=DB.get('contributions',d.dataset.d);confirmDel('Delete Contribution?',`Delete the ${fmt(c.amount)} payment from <b>${esc(mname(c.memberId))}</b>?`,()=>{DB.remove('contributions',c.id);toast('Contribution deleted');draw()})}};
  draw();
};
/* ---------- Expenses ---------- */
PAGES.expenses=()=>{
  main().innerHTML=head('Expenses','Every expense reduces the available balance','<button class="btn primary" id="add">+ Add Expense</button>')+`<div class="grid g4" id="cards"></div><div class="card"><div class="filters"><input id="q" type="search" placeholder="Search description or vendor…" aria-label="Search"><select id="cat" aria-label="Category"><option value="">All Categories</option>${kv(CATS.map(c=>[c,c]))}</select><input id="from" type="date" aria-label="From"><input id="to" type="date" aria-label="To"></div><div class="tbl" id="list"></div></div>`;
  const form=x=>{const e=!!x;x=x||{};modal(e?'Edit Expense':'Add Expense',field('Description *','description',`<input id="description" value="${esc(x.description)}">`)+`<div class="row2">`+field('Category *','category',`<select id="category"><option value="">Select category</option>${kv(CATS.map(c=>[c,c]),x.category)}</select>`)+field('Amount (₹) *','amount',`<input id="amount" type="number" min="1" step="any" value="${x.amount??''}">`)+`</div><div class="row2">`+field('Date *','date',`<input id="date" type="date" value="${x.date||today()}">`)+field('Vendor / Notes','vendor',`<input id="vendor" value="${esc(x.vendor)}">`)+`</div>`,{onSave(r){
    const g=i=>$('#'+i,r).value.trim(),amt=parseFloat(g('amount')),er={};if(!g('description'))er.description='Description is required';if(!g('category'))er.category='Category is required';
    if(!g('amount'))er.amount='Amount is required';else if(!(amt>0))er.amount='Amount must be greater than 0';if(!g('date'))er.date='Date is required';if(!showErrors(r,er))return false;
    const d={description:g('description'),category:g('category'),amount:amt,date:g('date'),vendor:g('vendor')};e?DB.update('expenses',x.id,d):DB.add('expenses',d);toast(e?'Expense updated successfully':'Expense added successfully');draw()}})};
  const draw=()=>{const all=DB.list('expenses'),q=$('#q').value.toLowerCase(),c=$('#cat').value,f=$('#from').value,t=$('#to').value;
    const l=all.filter(x=>(!c||x.category===c)&&(!f||x.date>=f)&&(!t||x.date<=t)&&(!q||x.description.toLowerCase().includes(q)||(x.vendor||'').toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date));
    const bc={};all.forEach(x=>bc[x.category]=(bc[x.category]||0)+x.amount);const top=Object.entries(bc).sort((a,b)=>b[1]-a[1])[0],tb=totals();
    $('#cards').innerHTML=card('Total Expenses',fmt(sum(all)),'down')+card('This Month',fmt(sum(all.filter(x=>x.date.startsWith(today().slice(0,7))))))+card('Highest Category',top?top[0]:'—','',top?fmt(top[1]):'')+card('Available Balance',fmt(tb.balance),'hero','After all expenses');
    $('#list').innerHTML=!all.length?emptyBox('No expenses yet','Record your first expense.','add2','+ Add Expense'):l.length?`<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Vendor / Notes</th><th>Amount</th><th>Actions</th></tr></thead><tbody>${l.map(x=>`<tr><td>${fdate(x.date)}</td><td>${esc(x.description)}</td><td>${esc(x.category)}</td><td>${esc(x.vendor)}</td><td><b class="down">${fmt(x.amount)}</b></td><td>${actions(x.id)}</td></tr>`).join('')}</tbody></table>`:emptyBox('No matching expenses','');
    $('#add2')&&($('#add2').onclick=()=>form())};
  $('#add').onclick=()=>form();$$('.filters [id]').forEach(el=>el.addEventListener('input',draw));
  $('#list').onclick=ev=>{const e=ev.target.closest('[data-e]'),d=ev.target.closest('[data-d]');if(e)form(DB.get('expenses',e.dataset.e));
    if(d){const x=DB.get('expenses',d.dataset.d);confirmDel('Delete Expense?',`Delete <b>${esc(x.description)}</b> (${fmt(x.amount)})?`,()=>{DB.remove('expenses',x.id);toast('Expense deleted');draw()})}};
  draw();
};
