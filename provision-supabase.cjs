// Administrative helper. Reads the local token; never prints credentials.
const fs=require('node:fs');
const crypto=require('node:crypto');
const token=fs.readFileSync('supabase-access-token.txt','utf8').trim();
async function api(path,method='GET',body){
  const response=await fetch('https://api.supabase.com/v1/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!response.ok)throw new Error(`Supabase ${method} ${path}: HTTP ${response.status} ${(await response.text()).slice(0,400)}`);
  return response.status===204?null:response.json();
}
(async()=>{
  const [action,ref]=process.argv.slice(2);
  if(action==='list'){
    const organizations=await api('organizations'),projects=await api('projects');
    console.log(JSON.stringify({organizations,projects:projects.map(p=>({id:p.id,name:p.name,status:p.status,region:p.region,organization_id:p.organization_id}))}));
  }else if(action==='org'){
    console.log(JSON.stringify(await api('organizations/'+ref)));
  }else if(action==='create'){
    const existing=(await api('projects')).find(p=>p.name==='Hanzi Vault');
    if(existing){console.log(JSON.stringify({id:existing.id,status:existing.status}));return;}
    const password=crypto.randomBytes(32).toString('base64url');
    fs.writeFileSync('.supabase-project-password',password,{mode:0o600});
    const result=await api('projects','POST',{name:'Hanzi Vault',organization_slug:ref,region:'eu-west-1',db_pass:password,plan:'free'});
    console.log(JSON.stringify({id:result.id,status:result.status}));
  }else if(action==='status'){
    const result=await api('projects/'+ref);console.log(JSON.stringify({id:result.id,status:result.status}));
  }else if(action==='configure'){
    await api(`projects/${ref}/database/query`,'POST',{query:fs.readFileSync('supabase-schema.sql','utf8')});
    await api(`projects/${ref}/config/auth`,'PATCH',{site_url:'https://lozpastor.github.io/Hanzi-Vault/',uri_allow_list:'https://lozpastor.github.io/Hanzi-Vault/,http://localhost:4173/',external_email_enabled:true});
    const keys=await api(`projects/${ref}/api-keys`);
    const key=keys.find(k=>k.type==='publishable')||keys.find(k=>k.name==='anon');
    if(!key)throw new Error('No public key available');
    console.log(JSON.stringify({url:`https://${ref}.supabase.co`,publishableKey:key.api_key}));
  }else if(action==='auth-audit'){
    console.log(JSON.stringify(await api(`projects/${ref}/database/query`,'POST',{query:"select (select count(*) from auth.users) as accounts, (select count(*) from auth.users where length(encrypted_password)>0) as password_accounts, (select count(*) from public.hanzi_vaults) as libraries, exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='hanzi_vaults') as realtime_enabled;"})));
  }else if(action==='realtime'){
    await api(`projects/${ref}/database/query`,'POST',{query:fs.readFileSync('supabase-realtime.sql','utf8')});
    console.log('Realtime enabled for private vault updates.');
  }else if(action==='audit'){
    const result=await api(`projects/${ref}/database/query`,'POST',{query:"select relrowsecurity from pg_class where oid='public.hanzi_vaults'::regclass;"});
    const auth=await api(`projects/${ref}/config/auth`);
    console.log(JSON.stringify({rls:result,site:auth.site_url,emailEnabled:auth.external_email_enabled}));
  }else throw new Error('Unknown action');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
