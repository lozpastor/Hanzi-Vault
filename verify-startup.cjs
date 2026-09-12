const {chromium,webkit}=require('C:/Users/alexi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs');
const server=http.createServer((req,res)=>{
  const name=req.url==='/'?'index.html':req.url.split('?')[0].slice(1);
  if(!/^[\w-]+\.(html|js|css|json)$/.test(name)||!fs.existsSync(name)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(name));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const engine=process.env.BROWSER==='webkit'?'webkit':'chromium';
  const browser=await (engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'msedge',headless:true}));
  try{
    for(const scenario of ['normal','storage-denied','quota','script-missing','script-stalled']){
      const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
      const page=await context.newPage();let release;
      await page.route('**/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:"window.HANZI_SUPABASE={url:'https://test.supabase.co',publishableKey:'test'};"}));
      await page.addInitScript(scenario=>{
        window.supabase={createClient:()=>({auth:{onAuthStateChange:()=>{},getSession:async()=>({data:{session:null}})}})};
        if(scenario==='storage-denied')Storage.prototype.getItem=function(){throw new DOMException('Storage disabled','SecurityError');};
        if(scenario==='quota'){
          localStorage.setItem('hanzivault_owner','test-user');localStorage.setItem('hanzivault_db',JSON.stringify({words:[{id:'preserve-me'}],grammar:[],categories:[]}));
          Storage.prototype.setItem=function(){throw new DOMException('No space','QuotaExceededError');};
        }
        if(scenario==='script-stalled'){const native=window.setTimeout;window.setTimeout=(fn,ms,...args)=>native(fn,ms===25000?250:ms,...args);}
      },scenario);
      if(scenario==='script-missing')await page.route('**/progress.js*',r=>r.abort());
      if(scenario==='script-stalled')await page.route('**/progress.js*',async r=>{await new Promise(resolve=>{release=resolve;});await r.fulfill({contentType:'text/javascript',body:fs.readFileSync('progress.js','utf8')});});
      try{
        await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'commit'});
        if(scenario==='normal')await page.waitForSelector('#auth-form');
        else{
          await page.waitForSelector('#boot-retry');
          const expected={'storage-denied':'SecurityError',quota:'QuotaExceededError','script-missing':'SCRIPT_LOAD','script-stalled':'TIMEOUT'}[scenario];
          assert.match(await page.locator('#boot-code').textContent(),new RegExp(expected));
          if(scenario==='quota')assert(await page.evaluate(()=>localStorage.getItem('hanzivault_db').includes('preserve-me')));
          if(release){release();release=null;await page.waitForLoadState('domcontentloaded');assert.equal(await page.locator('#auth-form').count(),0);}
          await page.screenshot({path:`qa-startup-${engine}-${scenario}.png`});
        }
        assert.equal(await page.locator('.app').isVisible(),false);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        console.log('PASS',engine,scenario);
      }finally{if(release)release();await context.close();}
    }
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
