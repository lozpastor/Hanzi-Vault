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
    const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:"window.HANZI_SUPABASE={url:'https://test.supabase.co',publishableKey:'test'};"}));
    await page.addInitScript(()=>{
      window.failRead=false;window.cloud=JSON.parse(localStorage.getItem('test-cloud')||'{}');window.delay=80;
      let callback;
      window.signIn=id=>{localStorage.setItem('test-session',id);callback('SIGNED_IN',{user:{id,email:id+'@example.com'}});};
      window.supabase={createClient:()=>({auth:{
        onAuthStateChange:fn=>{callback=fn;},
        getSession:async()=>{const id=localStorage.getItem('test-session');const session=id?{user:{id,email:id+'@example.com'}}:null;callback('INITIAL_SESSION',session);await new Promise(r=>setTimeout(r,30));return {data:{session}};},
        signInWithOtp:async()=>({error:null}),
        signOut:async()=>{localStorage.removeItem('test-session');callback('SIGNED_OUT',null);return {error:null};}
      },from:()=>({select:()=>({eq:(_field,id)=>({maybeSingle:async()=>{await new Promise(r=>setTimeout(r,window.delay));return window.failRead?{error:{message:'Prueba sin red'}}:{data:window.cloud[id]||null};}})})}),
      rpc:async(_name,args)=>{const id=localStorage.getItem('test-session'),row=window.cloud[id];if((row?.revision||0)!==args.expected_revision)return {data:{conflict:true}};window.cloud[id]={revision:(row?.revision||0)+1,document:args.payload};localStorage.setItem('test-cloud',JSON.stringify(window.cloud));return {data:{revision:window.cloud[id].revision}};}
      })};
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(()=>document.getElementById('account-login')?.hidden===false);
    await page.evaluate(()=>showPage('import-export'));
    await page.locator('#account-email').fill('a@example.com');
    await page.locator('#account-login button').click();
    assert.match(await page.locator('#account-message').textContent(),/Revisa tu correo/);
    assert.equal(await page.locator('#sync-label').textContent(),'Guardado local');
    await page.evaluate(()=>{window.delay=600;signIn('a');});
    await page.waitForFunction(()=>document.getElementById('account-panel').getAttribute('aria-busy')==='true');
    assert.equal(await page.locator('#account-sync').isDisabled(),true);
    await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
    assert.equal(await page.locator('#account-login').isVisible(),false);
    assert.match(await page.locator('#account-message').textContent(),/a@example.com.*palabras.*frases/);
    assert(await page.evaluate(()=>DB.words.every(w=>/^[1-6]$/.test(w.hsk))));
    await page.evaluate(()=>{failRead=true;DB.words.push({id:'offline-test',zh:'学习',status:'planned'});saveDB();});
    await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sin conexión');
    assert.match(await page.locator('#account-message').textContent(),/Guardado en este dispositivo/);
    assert.equal(await page.locator('#account-sync').isDisabled(),false);
    await page.evaluate(()=>{failRead=false;window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
    assert(await page.evaluate(()=>cloud.a.document.words.some(w=>w.id==='offline-test')));
    await page.locator('#account-logout').click();
    await page.waitForFunction(()=>document.getElementById('account-login').hidden===false);
    await page.evaluate(()=>signIn('b'));
    await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
    assert.equal(await page.evaluate(()=>DB.words.length),0);
    await page.locator('#account-logout').click();
    await page.waitForFunction(()=>document.getElementById('account-login').hidden===false);
    await page.evaluate(()=>signIn('a'));
    await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
    assert(await page.evaluate(()=>DB.words.some(w=>w.id==='offline-test')));
    await page.evaluate(()=>{
      DB.words=[{id:'review-word',zh:'学习',pinyin:'xuexi',status:'planned',workbookSource:WORKBOOK_SEED.version}];
      DB.grammar=[{id:'review-phrase',pattern:'我学习中文',examplePinyin:'wo xuexi zhongwen',status:'planned',workbookSource:WORKBOOK_SEED.version}];
      saveDB();showPage('review');
    });
    await page.evaluate(()=>{Review.reveal();Review.answer('easy');Review.reveal();Review.answer('easy');});
    assert(await page.evaluate(()=>[...DB.words,...DB.grammar].every(i=>i.status==='learned'&&i.mastery==='ready')));
    assert(await page.evaluate(()=>DB.learningEvents.filter(i=>i.to==='ready'&&i.id.startsWith('review-')).length===2));
    await page.evaluate(()=>showPage('dashboard'));
    assert.equal(await page.locator('.hsk-milestone').count(),4);
    assert.match(await page.locator('.hsk-milestone').first().textContent(),/1 \/ 500.*1 \/ 200/s);
    await page.screenshot({path:'qa-hsk-dashboard.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('.hsk-journey').scrollIntoViewIfNeeded();
    await page.screenshot({path:'qa-hsk-mobile.png'});
    await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
    await page.reload();
    await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
    assert(await page.evaluate(()=>DB.words.find(i=>i.id==='review-word').status==='learned'));
    assert.equal(await page.locator('#account-login').getAttribute('hidden'),'');
    assert.deepEqual(errors,[]);
    console.log('PASS: email feedback, automatic auth sync, initialization race, busy state, offline retry, account isolation/return, review mastery/history, HSK assignments/Excel targets, mobile layout, reload persistence.');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
