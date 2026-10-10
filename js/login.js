const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY),$=s=>document.querySelector(s);
sb.auth.getSession().then(({data})=>{if(data.session)location.href='index.html'});
$('#login').addEventListener('submit',async e=>{e.preventDefault();$('#msg').textContent='';$('#go').disabled=true;
  const {error}=await sb.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});
  if(error){$('#msg').textContent=error.message;$('#go').disabled=false}else location.href='index.html'});
