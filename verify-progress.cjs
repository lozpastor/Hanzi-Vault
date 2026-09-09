const {chromium} = require('C:/Users/alexi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
for (const match of fs.readFileSync('index.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
const server = http.createServer((req,res) => {
  const pathname = req.url.split('?')[0];
  const file = path.join(process.cwd(),pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : 'text/html');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    await page.route('**/supabase-config.js',route=>route.fulfill({contentType:'text/javascript',body:'window.HANZI_SUPABASE = {};'}));
    const errors=[]; page.on('pageerror',err=>errors.push(err.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForSelector('.learning-total');
    const counts = await page.evaluate(() => ['words','grammar'].map(key => {
      const rows=DB[key].filter(i=>i.workbookSource===WORKBOOK_SEED.version);
      return [rows.length,rows.filter(i=>['active','ready'].includes(i.mastery)).length];
    }));
    assert.deepEqual(counts,[[432,110],[111,15]]);
    const id=await page.evaluate(()=>DB.words.find(i=>i.workbookSource && i.mastery==='planned').id);
    await page.evaluate(id=>{showPage('dictionary');setMastery('word',id,'active');},id);
    await page.reload();
    await page.waitForSelector('.learning-total');
    assert.equal(await page.evaluate(id=>DB.words.find(i=>i.id===id).mastery,id),'active');
    assert.equal(await page.evaluate(()=>DB.learningEvents.length),1);
    assert.equal(await page.locator('#sync-label').textContent(),'Guardado local');
    await page.screenshot({path:'progress-desktop.png',fullPage:false});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: Excel counts, mastery update, reload persistence, local save indicator, mobile width, no browser errors');
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
