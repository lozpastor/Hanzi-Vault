const {chromium} = require('C:/Users/alexi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
let remote=null, revision=0;
const server=http.createServer((req,res)=>{
  const file=path.join(process.cwd(),req.url==='/'?'index.html':req.url.split('?')[0]);
  if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');
  res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const pages=[];
    for(let i=0;i<2;i++){
      const context=await browser.newContext();
      const page=await context.newPage();
      await page.route('**/supabase-config.js',route=>route.fulfill({contentType:'text/javascript',body:"window.HANZI_SUPABASE={url:'https://example.supabase.co',publishableKey:'test'};"}));
      await page.exposeFunction('mockRead',()=>({data:remote?{document:remote,revision}:null,error:null}));
      await page.exposeFunction('mockWrite',args=>{
        if(args.expected_revision!==revision)return {data:{conflict:true},error:null};
        remote=args.payload;revision++;return {data:{revision},error:null};
      });
      await page.addInitScript(()=>{
        window.supabase={createClient:()=>({
          auth:{onAuthStateChange:()=>{},getSession:async()=>({data:{session:{user:{id:'test-user',email:'test@example.com'}}}})},
          from:()=>({select:()=>({eq:()=>({maybeSingle:()=>window.mockRead()})})}),
          rpc:(_name,args)=>window.mockWrite(args)
        })};
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.waitForFunction(()=>document.getElementById('account-combine')?.hidden===false);
      await page.evaluate(()=>{showPage('import-export');});
      if(i===1) await page.evaluate(()=>{DB.words.push({id:'mobile-only',zh:'移动',pinyin:'yidong',translation:'móvil',status:'learning'});saveDB();});
      await page.locator('#account-combine').click();
      await page.waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
      pages.push(page);
    }
    assert(remote.words.some(i=>i.id==='mobile-only'));
    await pages[0].locator('#account-sync').click();
    await pages[0].waitForFunction(()=>DB.words.some(i=>i.id==='mobile-only'));
    // Concurrent additions from two devices must both survive revision retries.
    await Promise.all(pages.map((page,i)=>page.evaluate(i=>{
      DB.words.push({id:'concurrent-'+i,zh:'测试',pinyin:'ceshi',translation:'prueba '+i,status:'learning'});saveDB();
    },i)));
    await new Promise(resolve=>setTimeout(resolve,1800));
    assert(remote.words.some(i=>i.id==='concurrent-0'));
    assert(remote.words.some(i=>i.id==='concurrent-1'));
    await pages[0].evaluate(()=>{DB.words=DB.words.filter(i=>i.id!=='mobile-only');saveDB();});
    await new Promise(resolve=>setTimeout(resolve,1000));
    await pages[1].locator('#account-sync').click();
    await pages[1].waitForFunction(()=>!DB.words.some(i=>i.id==='mobile-only'));
    await pages[1].reload();
    await pages[1].waitForFunction(()=>document.getElementById('sync-label').textContent==='Sincronizado');
    assert.equal(await pages[1].evaluate(()=>DB.words.some(i=>i.id==='mobile-only')),false);
    console.log('PASS: two isolated browsers, initial merge, concurrent additions, revision retries, deletion propagation, reload baseline');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
