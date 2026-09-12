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
  const sessions=[],authSessions=[],credentials=[];
  try{
    for(let i=0;i<2;i++){
      const password=crypto.randomBytes(24).toString('base64url'),email=`hanzi-qa-${crypto.randomUUID()}@example.com`;
      credentials.push({email,password});
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
        await page.addInitScript(({owner,i})=>{
          localStorage.setItem('hanzivault_owner',owner);
          localStorage.setItem('hanzivault_db',JSON.stringify({version:2,seedVersion:4,contentMigrationVersion:2,workbookVersion:'2026-09-09',words:[{id:'browser-'+i,zh:'学习',pinyin:'xuexi',translation:'study',status:'learning'}],grammar:[],categories:[],relations:[]}));
        },{owner:created[0],i});
        await page.goto(`http://127.0.0.1:${server.address().port}/`);
        await page.waitForSelector('#auth-form');
        assert.equal(await page.locator('.app').isVisible(),false);
        assert.equal(await page.evaluate(()=>DB.words.length),0);
        await page.locator('#auth-email').fill(credentials[0].email);
        await page.locator('#auth-password').fill(credentials[0].password);
        await page.locator('#auth-form button').click();
        await page.waitForFunction(()=>document.getElementById('sync-label')?.textContent==='Sincronizado',null,{timeout:60000});
        assert.equal(await page.locator('#profile-name').textContent(),credentials[0].email);
        assert.equal(await page.locator('.app').isVisible(),true);
        await page.evaluate(()=>showPage('import-export'));
        await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado',null,{timeout:60000});pages.push(page);
      }
      await pages[0].waitForFunction(()=>DB.words.some(w=>w.id==='browser-1'));
      const counts=await Promise.all(pages.map(p=>p.evaluate(()=>DB.words.length)));assert.equal(counts[0],counts[1]);
      console.log('Browser login and merge passed; realtime states:',await Promise.all(pages.map(p=>p.locator('#account-panel').getAttribute('data-realtime'))));
      await pages[0].evaluate(()=>{DB.words.push({id:'live-new-word',zh:'足球',pinyin:'zuqiu',translation:'football',status:'learning'});saveDB();});
      await pages[0].waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
      await pages[1].waitForFunction(()=>DB.words.some(w=>w.id==='live-new-word'),null,{timeout:10000});
      console.log('Realtime addition passed.');
      await pages[0].evaluate(()=>setMastery('word','live-new-word','ready'));
      await pages[0].waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
      console.log('After mastery write:',await Promise.all(pages.map(p=>p.evaluate(()=>({status:DB.words.find(w=>w.id==='live-new-word')?.status,mastery:DB.words.find(w=>w.id==='live-new-word')?.mastery,message:document.getElementById('sync-label').textContent,realtime:document.getElementById('account-panel').dataset.realtime,events:document.getElementById('account-panel').dataset.remoteEvents})))));
      await pages[1].waitForFunction(()=>DB.words.find(w=>w.id==='live-new-word')?.status==='learned',null,{timeout:10000});
      console.log('Realtime mastery passed.');
      const idleBefore=await request('/rest/v1/hanzi_vaults?select=revision',publicKey,'GET',null,sessions[0]);
      await new Promise(resolve=>setTimeout(resolve,1500));
      const idleAfter=await request('/rest/v1/hanzi_vaults?select=revision',publicKey,'GET',null,sessions[0]);
      assert.equal(idleAfter.data[0].revision,idleBefore.data[0].revision,'Realtime must not write unchanged JSONB');
      await pages[0].evaluate(()=>{DB.words=DB.words.filter(w=>w.id!=='live-new-word');saveDB();});
      await pages[1].waitForFunction(()=>!DB.words.some(w=>w.id==='live-new-word'),null,{timeout:10000});
      const otherContext=await browser.newContext(),otherPage=await otherContext.newPage();
      await otherPage.goto(`http://127.0.0.1:${server.address().port}/`);
      await otherPage.locator('#auth-email').fill(credentials[1].email);await otherPage.locator('#auth-password').fill(credentials[1].password);
      await otherPage.locator('#auth-form button').click();
      await otherPage.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
      assert.equal(await otherPage.evaluate(()=>DB.words.length),0);
      await otherPage.evaluate(()=>showPage('import-export'));
      const newPassword=crypto.randomBytes(24).toString('base64url');
      await otherPage.locator('#account-new-password').fill(newPassword);await otherPage.locator('#account-confirm-password').fill(newPassword);
      await otherPage.locator('#account-password-form button').click();
      await otherPage.waitForFunction(()=>document.getElementById('password-message').textContent.startsWith('Contraseña guardada'));
      await otherPage.locator('#account-logout').click();await otherPage.waitForSelector('#auth-email');
      assert.equal(await otherPage.locator('.app').isVisible(),false);
      assert.equal(await otherPage.evaluate(()=>DB.words.length),0);
      await otherPage.locator('#auth-email').fill(credentials[1].email);await otherPage.locator('#auth-password').fill(newPassword);
      await otherPage.locator('#auth-form button').click();await otherPage.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
      console.log('PASS real browsers: password login, locked anonymous app, same-account merge, Realtime additions/mastery/deletions under 10 seconds, isolated empty second account, password change and logout.');
    }finally{await browser.close();server.close();}
  }finally{
    for(const id of created){const deleted=await request('/auth/v1/admin/users/'+id,adminKey,'DELETE');if(deleted.status!==200)throw Error('Could not remove temporary QA user');}
    console.log('Temporary QA accounts and their data removed.');
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
