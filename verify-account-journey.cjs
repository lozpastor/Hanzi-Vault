const {chromium}=require('C:/Users/alexi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs');
const server=http.createServer((req,res)=>{
  const name=req.url==='/'?'index.html':req.url.split('?')[0].slice(1);
  if(!/^[\w-]+\.(html|js|css|json)$/.test(name)||!fs.existsSync(name)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(name));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:"window.HANZI_SUPABASE={url:'https://test.supabase.co',publishableKey:'test'};"}));
    await page.addInitScript(()=>{
      window.failRead=localStorage.getItem('test-offline')==='true';window.emailCalls=0;window.cloud=JSON.parse(localStorage.getItem('test-cloud')||'{}');
      let callback;
      const current=()=>{const id=localStorage.getItem('test-session');return id?{user:{id,email:id+'@example.com'}}:null;};
      window.supabase={createClient:()=>({auth:{
        onAuthStateChange:fn=>{callback=fn;},
        getSession:async()=>({data:{session:current()}}),
        getUser:async()=>({data:{user:current()?.user}}),
        signInWithPassword:async({email,password})=>{if(password!=='correct-password')return {error:{code:'invalid_credentials'}};localStorage.setItem('test-session',email.split('@')[0]);callback('SIGNED_IN',current());return {data:{session:current()}};},
        resetPasswordForEmail:async()=>{window.emailCalls++;return {error:{status:429,code:'over_email_send_rate_limit'}};},
        signUp:async()=>({data:{session:null}}),
        updateUser:async()=>({data:{user:current().user}}),
        signOut:async()=>{localStorage.removeItem('test-session');callback('SIGNED_OUT',null);return {error:null};}
      },from:()=>({select:()=>({eq:(_field,id)=>({maybeSingle:async()=>{await new Promise(r=>setTimeout(r,150));return window.failRead?{error:{message:'Sin red'}}:{data:window.cloud[id]||null};}})})}),
      rpc:async(_name,args)=>{const id=localStorage.getItem('test-session'),row=window.cloud[id];if((row?.revision||0)!==args.expected_revision)return {data:{conflict:true}};window.cloud[id]={revision:(row?.revision||0)+1,document:args.payload};localStorage.setItem('test-cloud',JSON.stringify(window.cloud));return {data:{revision:window.cloud[id].revision}};}
      })};
      if(!localStorage.getItem('test-first')){localStorage.setItem('test-first','1');localStorage.setItem('hanzivault_db',JSON.stringify({words:[{id:'legacy',zh:'学习',pinyin:'xuexi',status:'learning'}],grammar:[],categories:[],relations:[]}));}
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForSelector('#auth-form');
    assert.equal(await page.locator('.app').isVisible(),false);
    assert.equal(await page.locator('.fab').isVisible(),false);
    assert.equal(await page.evaluate(()=>DB.words.length),0);
    await page.screenshot({path:'qa-auth-desktop.png'});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa-auth-mobile.png'});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#auth-switch').click();
    await page.locator('#auth-email').fill('new@example.com');await page.locator('#auth-password').fill('correct-password');await page.locator('#auth-confirm').fill('different-password');
    await page.locator('#auth-form button').click();assert.match(await page.locator('#auth-message').textContent(),/no coinciden/);
    await page.locator('#auth-confirm').fill('correct-password');await page.locator('#auth-form button').click();
    await page.waitForFunction(()=>document.getElementById('auth-message').textContent.includes('buzón'));
    assert.equal(await page.locator('.app').isVisible(),false);
    await page.locator('#auth-switch').click();
    await page.evaluate(()=>localStorage.removeItem('hanzivault_email_retry_at'));
    await page.locator('#auth-email').fill('a@example.com');await page.locator('#auth-password').fill('wrong');
    await page.locator('#auth-form button').click();await page.waitForFunction(()=>document.getElementById('auth-message').textContent.includes('incorrectos'));
    await page.locator('#auth-reset').click();await page.locator('#auth-email').fill('a@example.com');await page.locator('#auth-form button').click();
    await page.waitForFunction(()=>document.getElementById('auth-message').textContent.includes('límite'));
    await page.locator('#auth-switch').click();
    const login=async id=>{await page.locator('#auth-email').fill(id+'@example.com');await page.locator('#auth-password').fill('correct-password');await page.locator('#auth-form button').click();await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');};
    await login('a');
    assert.equal(await page.evaluate(()=>DB.words.length),0);
    assert.equal(await page.locator('#profile-name').textContent(),'a@example.com');
    assert.equal(await page.locator('#sync-status').isVisible(),true);
    const profileBox=await page.locator('#sync-status').boundingBox();assert(profileBox.x>=0&&profileBox.x+profileBox.width<=390);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:'qa-profile-mobile.png'});
    await page.evaluate(()=>showPage('import-export'));
    page.once('dialog',d=>d.accept());await page.locator('#account-import-legacy').click();
    await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
    assert(await page.evaluate(()=>DB.words.some(w=>w.id==='legacy')));
    await page.evaluate(()=>{failRead=true;DB.words.push({id:'offline',zh:'水',status:'planned'});saveDB();});
    await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sin conexión');
    assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzivault_account_library:a')).words.some(w=>w.id==='offline')));
    await page.evaluate(()=>{failRead=false;window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
    await page.locator('#account-logout').click();await page.waitForSelector('#auth-email');
    assert.equal(await page.evaluate(()=>DB.words.length),0);
    await login('b');assert.equal(await page.evaluate(()=>DB.words.length),0);
    await page.evaluate(()=>showPage('import-export'));assert.equal(await page.locator('#account-import-legacy').isVisible(),false);
    await page.locator('#account-logout').click();await page.waitForSelector('#auth-email');await login('a');
    assert.equal(await page.evaluate(()=>DB.words.length),2);
    await page.evaluate(()=>localStorage.setItem('test-offline','true'));
    await page.reload();await page.waitForFunction(()=>document.getElementById('auth-message').textContent.includes('No se pudo recuperar'));
    assert.equal(await page.locator('.app').isVisible(),false);
    await page.evaluate(()=>{failRead=false;localStorage.removeItem('test-offline');});
    await page.getByRole('button',{name:'Reintentar',exact:true}).click();await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
    assert.equal(await page.evaluate(()=>DB.words.length),2);
    await page.reload();await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
    assert.equal(await page.evaluate(()=>DB.words.length),2);
    assert.deepEqual(errors,[]);
    console.log('PASS: login gate, invalid credentials, email quota does not block password login, profile on mobile, explicit legacy import, offline retry, isolated accounts, logout and reload.');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
