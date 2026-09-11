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
    await page.route('**/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:'window.HANZI_SUPABASE={};'}));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForSelector('.learning-total');
    await page.evaluate(()=>{
      DB.categories=[{id:'a',name:'Estudio'},{id:'b',name:'Viajes'}];
      DB.grammar=[
        {id:'p1',pattern:'我学习中文',examplePinyin:'wǒ xuéxí zhōngwén',meaning:'Aprendo chino',status:'learning',category:'a',hsk:'1',date:'2026-01-01'},
        {id:'p2',pattern:'你去哪里',examplePinyin:'nǐ qù nǎlǐ',meaning:'Dónde vas',status:'planned',category:'b',hsk:2,date:'2026-03-01'},
        {id:'p3',pattern:'我喜欢学习',examplePinyin:'wǒ xǐhuān xuéxí',meaning:'Me gusta estudiar',status:'learned',category:'a',date:'2026-02-01'}
      ];saveDB();showPage('grammar');
    });
    assert.equal(await page.locator('.grammar-card').count(),3);
    await page.locator('#phrase-search').fill('xuexi');
    assert.equal(await page.locator('.grammar-card').count(),2);
    await page.locator('#phrase-category').selectOption('a');
    await page.locator('#phrase-hsk').selectOption('1');
    await page.locator('#phrase-status').selectOption('learning');
    assert.equal(await page.locator('.grammar-card').count(),1);
    await page.locator('#phrase-view-table').click();
    assert.equal(await page.locator('.phrase-table tbody tr').count(),1);
    assert.match(await page.locator('.phrase-table').textContent(),/wǒ xuéxí/);
    await page.getByRole('button',{name:'Editar frase',exact:true}).click();
    assert.equal(await page.locator('#gram-edit-id').inputValue(),'p1');
    await page.evaluate(()=>document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id)));
    await page.getByRole('button',{name:'Puedo utilizarlo',exact:true}).click();
    assert.equal(await page.locator('.phrase-table').count(),0);
    assert.match(await page.locator('#grammar-grid').textContent(),/No se encontraron frases/);
    assert(await page.evaluate(()=>DB.grammar.find(g=>g.id==='p1').status==='learned'));
    await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();
    assert.equal(await page.locator('.phrase-table tbody tr').count(),3);
    await page.locator('#phrase-hsk').selectOption('2');
    assert.equal(await page.locator('.phrase-table tbody tr').count(),1);
    await page.locator('#phrase-hsk').selectOption('none');
    assert.equal(await page.locator('.phrase-table tbody tr').count(),1);
    await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();
    await page.locator('#phrase-sort').selectOption('date-asc');
    assert.equal(await page.locator('.phrase-table tbody tr').first().locator('td').first().textContent(),'我学习中文');
    await page.locator('#phrase-sort').selectOption('es-asc');
    assert.deepEqual(await page.locator('.phrase-table tbody tr td:nth-child(3)').allTextContents(),['Aprendo chino','Dónde vas','Me gusta estudiar']);
    await page.screenshot({path:'qa-phrases-table.png'});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert(await page.locator('.phrase-table-wrap').evaluate(el=>el.scrollWidth>el.clientWidth));
    await page.screenshot({path:'qa-phrases-mobile.png'});
    await page.reload();await page.waitForSelector('.learning-total');await page.evaluate(()=>showPage('grammar'));
    assert.equal(await page.locator('#phrase-view-table').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.phrase-table tbody tr').count(),3);
    await page.setViewportSize({width:1440,height:1000});
    page.once('dialog',d=>d.accept());
    await page.getByRole('button',{name:'Eliminar frase',exact:true}).first().click();
    assert.equal(await page.locator('.phrase-table tbody tr').count(),2);
    await page.locator('#phrase-view-cards').click();assert.equal(await page.locator('.grammar-card').count(),2);
    assert.deepEqual(errors,[]);
    console.log('PASS: combined phrase filters, accent-free pinyin, HSK including missing/numeric, sorting, cards/table, edit/delete/mastery, empty state, persisted view, mobile scrolling.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
