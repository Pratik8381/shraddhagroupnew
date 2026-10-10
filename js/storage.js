/* Storage service: the ONLY file that touches localStorage. Swap Store/DB for an API (e.g. Supabase) later. */
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
/* Data is loaded once into memory; every change is also saved to Supabase, in order, in the background. */
const COLS={members:['id','name','mobile','photo'],mandatory:['id','member_id','period','amount'],contributions:['id','member_id','type','period','amount','date','notes'],expenses:['id','description','category','amount','date','vendor']};
const cache={members:[],mandatory:[],contributions:[],expenses:[]};
const toRow=(t,o)=>{const r={};COLS[t].forEach(c=>{r[c]=c==='member_id'?o.memberId:o[c.replace('_id','Id')]??o[c]??null});return r};
const fromRow=(t,r)=>{const o={};COLS[t].forEach(c=>{o[c==='member_id'?'memberId':c]=r[c]??''});if('amount' in o)o.amount=Number(o.amount);return o};
let queue=Promise.resolve();
const bg=fn=>{queue=queue.then(async()=>{const r=await fn();if(r&&r.error)throw r.error}).catch(e=>{console.error(e);window.toast&&toast('Save failed: '+e.message,'bad')})};
const flush=()=>queue;
const Store={async load(){for(const t of Object.keys(COLS)){const {data,error}=await sb.from(t).select('*').limit(5000);if(error)throw error;cache[t]=data.map(r=>fromRow(t,r))}}};
const DB={
  list:n=>[...cache[n]],
  get:(n,id)=>cache[n].find(x=>x.id===id),
  add(n,o){let id;do{id=n.slice(0,3)+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}while(cache[n].some(x=>x.id===id));const rec={...o,id};cache[n].push(rec);bg(()=>sb.from(n).insert(toRow(n,rec)));return id},
  update(n,id,p){const i=cache[n].findIndex(x=>x.id===id);if(i<0)return;const rec=cache[n][i]={...cache[n][i],...p,id};bg(()=>sb.from(n).update(toRow(n,rec)).eq('id',id))},
  remove(n,id){cache[n]=cache[n].filter(x=>x.id!==id);bg(()=>sb.from(n).delete().eq('id',id))}
};
const DEFAULT_PERIOD='FY 2026-27';
const sum=l=>l.reduce((s,x)=>s+(+x.amount||0),0);
/* Every payment is ONE row in 'contributions' (type regular|mandatory) so nothing is counted twice.
   Mandatory assignments live in 'mandatory'; "paid" is derived from mandatory-type contributions. */
function mandatoryRows(period){
  const pays=DB.list('contributions').filter(c=>c.type==='mandatory');
  return DB.list('mandatory').filter(a=>!period||a.period===period).map(a=>{
    const paid=sum(pays.filter(c=>c.memberId===a.memberId&&c.period===a.period));
    const pending=Math.max(0,a.amount-paid); // Pending = Expected - Paid, never below 0
    return{...a,member:DB.get('members',a.memberId),paid,pending,status:pending===0?'Paid':paid>0?'Partially Paid':'Pending'};
  });
}
function totals(){
  const cs=DB.list('contributions'),collected=sum(cs),expenses=sum(DB.list('expenses')),expected=sum(DB.list('mandatory')),mandPaid=sum(cs.filter(c=>c.type==='mandatory'));
  return{members:DB.list('members').length,collected,expected,mandPaid,pending:Math.max(0,expected-mandPaid),expenses,balance:collected-expenses};
}
async function seedDemo(){
  clearAll();
  const N=['Rajesh Patil','Amit Shinde','Sanket Jadhav','Rohit Pawar','Sneha Kulkarni','Akshay More','Pranav Deshmukh','Neha Joshi'],A=[1000,1000,1500,1000,2000,1000,1500,1000];
  N.forEach((n,i)=>{const id=DB.add('members',{name:n,mobile:'98765'+String(43210+i*111),photo:''});
    DB.add('mandatory',{memberId:id,period:DEFAULT_PERIOD,amount:A[i]});
    const d=k=>new Date(Date.UTC(2026,7,20+i*4+k)).toISOString().slice(0,10);
    if(i%3==0)DB.add('contributions',{memberId:id,type:'mandatory',period:DEFAULT_PERIOD,amount:A[i],date:d(0),notes:''});
    if(i%3==1)DB.add('contributions',{memberId:id,type:'mandatory',period:DEFAULT_PERIOD,amount:A[i]/2,date:d(1),notes:'First instalment'});
    if(i%2==0)DB.add('contributions',{memberId:id,type:'regular',period:'',amount:[500,1100,2100,251][i%4],date:d(2),notes:'Ganesh Utsav donation'});});
  [['Pandal bamboo & cloth','Pandal',6000,'Shree Mandap Works'],['Flower garlands','Flowers',1500,'Ganesh Flowers'],['Decoration material','Decoration',3500,'Rang Decor'],['Sound system rental','Sound System',4000,'Beats Audio'],['Prasad sweets','Prasad',2500,'Chitale Sweets'],['LED lighting','Lighting',1800,''],['Idol advance','Idol',3000,'Kumbhar Arts'],['Electricity deposit','Electricity',1200,'MSEDCL']]
   .forEach((e,i)=>DB.add('expenses',{description:e[0],category:e[1],amount:e[2],date:new Date(Date.UTC(2026,8,1+i*4)).toISOString().slice(0,10),vendor:e[3]}));
  await flush();
}
const clearAll=()=>{for(const t of ['contributions','mandatory','expenses','members']){cache[t]=[];bg(()=>sb.from(t).delete().neq('id',''))}return flush()};
