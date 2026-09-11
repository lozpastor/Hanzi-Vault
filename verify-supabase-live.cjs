const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ref='uycuaysfcdaliilgxbih',url=`https://${ref}.supabase.co`;
const token=fs.readFileSync('supabase-access-token.txt','utf8').trim();
const created=[];let adminKey;
async function request(path,key,method='GET',body,access=key){
  const response=await fetch(url+path,{method,headers:{apikey:key,Authorization:'Bearer '+access,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
  return {status:response.status,data};
}
(async()=>{
  const response=await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`,{headers:{Authorization:'Bearer '+token}});
  if(!response.ok)throw Error('Could not retrieve test credentials');
  const keys=await response.json();
  adminKey=keys.find(k=>k.name==='service_role')?.api_key;
  const publicKey=keys.find(k=>k.type==='publishable')?.api_key||keys.find(k=>k.name==='anon')?.api_key;
  assert(adminKey&&publicKey);
  const sessions=[],authSessions=[];
  try{
    for(let i=0;i<2;i++){
      const password=crypto.randomBytes(24).toString('base64url'),email=`hanzi-qa-${crypto.randomUUID()}@example.com`;
      const result=await request('/auth/v1/admin/users',adminKey,'POST',{email,password,email_confirm:true});
      assert.equal(result.status,200);created.push(result.data.id);
      const login=await request('/auth/v1/token?grant_type=password',publicKey,'POST',{email,password});
      assert.equal(login.status,200);sessions.push(login.data.access_token);authSessions.push(login.data);
    }
    const document={words:[{id:'live-test',zh:'学习',pinyin:'xuexi'}],grammar:[],categories:[],relations:[]};
    const saved=await request('/rest/v1/rpc/save_hanzi_vault',publicKey,'POST',{expected_revision:0,payload:document},sessions[0]);
    assert.equal(saved.status,200);assert.equal(saved.data.revision,1);
    const own=await request('/rest/v1/hanzi_vaults?select=revision,document',publicKey,'GET',null,sessions[0]);
    assert.equal(own.data[0].document.words[0].id,'live-test');
    const other=await request('/rest/v1/hanzi_vaults?select=revision,document',publicKey,'GET',null,sessions[1]);
    assert.deepEqual(other.data,[]);
    const anonymous=await fetch(url+'/rest/v1/hanzi_vaults?select=revision',{headers:{apikey:publicKey}});
    assert([401,403].includes(anonymous.status));
    const writes=await Promise.all([0,1].map(i=>request('/rest/v1/rpc/save_hanzi_vault',publicKey,'POST',{expected_revision:1,payload:{...document,words:[...document.words,{id:'concurrent-'+i}]}},sessions[0])));
    assert.equal(writes.filter(r=>r.data.conflict).length,1);
    assert.equal(writes.filter(r=>r.data.revision===2).length,1);
    console.log('PASS live Supabase: authenticated write/read, isolation between accounts, anonymous denied, concurrent revision conflict');
    const http=require('node:http');
    const {chromium}=require('C:/Users/alexi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
    const server=http.createServer((req,res)=>{
      const name=req.url==='/'?'index.html':req.url.split('?')[0].slice(1);
      if(!/^[\w-]+\.(html|js|css|json)$/.test(name)||!fs.existsSync(name)){res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(name));
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({channel:'msedge',headless:true});
    try{
      const pages=[];
      for(let i=0;i<2;i++){
        const context=await browser.newContext(),page=await context.newPage();
        await page.addInitScript(({session,ref,i})=>{
          localStorage.setItem(`sb-${ref}-auth-token`,JSON.stringify(session));
          localStorage.setItem('hanzivault_db',JSON.stringify({version:2,seedVersion:4,contentMigrationVersion:2,workbookVersion:'2026-09-09',words:[{id:'browser-'+i,zh:'学习',pinyin:'xuexi',translation:'study',status:'learning'}],grammar:[],categories:[],relations:[]}));
        },{session:authSessions[0],ref,i});
        await page.goto(`http://127.0.0.1:${server.address().port}/`);
        await page.waitForFunction(()=>document.getElementById('sync-label')?.textContent==='Sincronizado',null,{timeout:60000});
        await page.evaluate(()=>showPage('import-export'));
        await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado',null,{timeout:60000});pages.push(page);
      }
      await pages[0].waitForFunction(()=>DB.words.some(w=>w.id==='browser-1'));
      const counts=await Promise.all(pages.map(p=>p.evaluate(()=>DB.words.length)));assert.equal(counts[0],counts[1]);
      await pages[0].evaluate(()=>{DB.words.push({id:'live-new-word',zh:'足球',pinyin:'zuqiu',translation:'football',status:'learning'});saveDB();});
      await pages[0].waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
      await pages[1].waitForFunction(()=>DB.words.some(w=>w.id==='live-new-word'));
      console.log('PASS real browsers: same authenticated account merges both libraries, equal counts, new word appears on second device.');
    }finally{await browser.close();server.close();}
  }finally{
    for(const id of created){const deleted=await request('/auth/v1/admin/users/'+id,adminKey,'DELETE');if(deleted.status!==200)throw Error('Could not remove temporary QA user');}
    console.log('Temporary QA accounts and their data removed.');
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
