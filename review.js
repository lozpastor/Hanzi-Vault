const Review = (() => {
  let queue=[], position=0, revealed=false, results=[], answering=false;
  function settings() {
    const checked=name=>[...document.querySelectorAll(`input[name="${name}"]:checked`)].map(i=>i.value);
    return {states:checked('review-state'),types:checked('review-type'),limit:Number(document.getElementById('review-limit').value)};
  }
  function init() {
    if (!document.getElementById('review-options').children.length) {
      document.getElementById('review-options').innerHTML=`<div class="practice-config"><fieldset><legend>Estados a practicar</legend>${[['learning','En proceso',true],['planned','Por conocer',true],['learned','Aprendido',false]].map(([value,label,on])=>`<label class="choice-chip"><input type="checkbox" name="review-state" value="${value}" ${on?'checked':''}>${label}</label>`).join('')}</fieldset><fieldset><legend>Contenido</legend><label class="choice-chip"><input type="checkbox" name="review-type" value="words" checked>Palabras</label><label class="choice-chip"><input type="checkbox" name="review-type" value="grammar" checked>Frases</label></fieldset><label class="practice-length">Por sesión<select id="review-limit" class="filter-select"><option>10</option><option selected>20</option><option>40</option><option value="100">100</option></select></label><button type="button" class="btn btn-primary" id="review-start">Nueva selección</button></div>`;
      let stored;try{stored=JSON.parse(localStorage.getItem('hanzi_review_options'));}catch{}
      const root=document.getElementById('review-options'),details=document.createElement('details'),summary=document.createElement('summary');
      details.className='practice-settings';details.open=innerWidth>600;summary.textContent='Configurar sesión';details.append(summary,root.firstElementChild);root.appendChild(details);
      if(stored){for(const name of ['state','type']) document.querySelectorAll(`input[name="review-${name}"]`).forEach(i=>i.checked=(stored[name==='state'?'states':'types']||[]).includes(i.value));}
      if([10,20,40,100].includes(stored?.limit))document.getElementById('review-limit').value=stored.limit;
      document.getElementById('review-start').onclick=start;
      document.getElementById('review-options').onchange=start;
    }
    if(innerWidth<=600)document.querySelector('.practice-settings').open=false;
    start();
  }
  function start() {
    const opts=settings();localStorage.setItem('hanzi_review_options',JSON.stringify(opts));
    document.querySelector('.practice-settings summary').textContent='Configurar sesión · '+opts.states.map(s=>({planned:'Por conocer',learning:'En proceso',learned:'Aprendido'}[s])).join(' + ');
    queue=opts.types.flatMap(type=>DB[type].filter(i=>opts.states.includes(i.status||'learning')).map(i=>({...i,kind:type})));
    for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
    const available=queue.length;queue=queue.slice(0,opts.limit);position=0;revealed=false;results=[];
    document.getElementById('review-available').textContent=`${available} fichas disponibles con esta selección. Se incluyen también las que aún no vencen para repaso.`;
    render();
  }
  function render() {
    const host=document.getElementById('review-content');
    if(!queue.length){host.innerHTML='<div class="practice-empty"><h3>No hay fichas en esta selección</h3><p>Marca al menos un estado y un tipo de contenido, o añade fichas a tu biblioteca.</p></div>';return;}
    if(position>=queue.length){host.innerHTML=`<section class="practice-card"><span class="eyebrow">Sesión completada</span><h2>${results.length} fichas practicadas</h2><p>${results.filter(r=>r==='hard').length} por reforzar · ${results.filter(r=>r!=='hard').length} recordadas</p><button class="btn btn-primary" onclick="Review.start()">Otra selección</button></section>`;return;}
    const item=queue[position],zh=item.zh||item.pattern,pinyin=item.pinyin||item.examplePinyin,meaning=item.translation||item.meaning;
    host.innerHTML=`<div class="practice-session"><div class="practice-progress"><span>Ficha ${position+1} de ${queue.length}</span><progress value="${position}" max="${queue.length}" aria-label="Progreso de la sesión"></progress><span>${item.kind==='words'?'Palabra':'Frase'}</span></div><section class="practice-card"><span class="eyebrow">Lee y recuerda su significado</span><div class="practice-hanzi" lang="zh">${progressEscape(zh)}</div><div class="practice-pinyin">${progressEscape(pinyin||'Pinyin no disponible')}</div><div class="practice-divider"></div>${revealed?`<div class="practice-meaning" aria-live="polite">${progressEscape(meaning)}</div><p class="practice-hint">¿Cómo lo has recordado? Esto programa el próximo repaso, sin cambiar tu grado de dominio.</p><div class="practice-ratings"><button onclick="Review.answer('hard')">Necesito practicar<span>En 1 día</span></button><button onclick="Review.answer('medium')">Con algo de ayuda<span>En 3 días</span></button><button onclick="Review.answer('easy')">Lo sabía<span>En 7 días</span></button></div>`:`<p class="practice-hint">Di la respuesta en voz alta o piénsala antes de descubrirla.</p><button class="btn btn-primary practice-reveal" onclick="Review.reveal()">Mostrar significado</button>`}</section><p class="practice-keyboard">Espacio: mostrar significado · 1, 2, 3: valorar la respuesta</p></div>`;
  }
  function reveal(){if(!queue[position])return;revealed=true;render();}
  function answer(rating){
    if(!revealed||answering||!['hard','medium','easy'].includes(rating)||!queue[position])return;
    answering=true;
    const item=queue[position], live=DB[item.kind].find(i=>i.id===item.id);
    if(live){live.reviewCount=(live.reviewCount||0)+1;live.nextReview=new Date(Date.now()+({hard:1,medium:3,easy:7}[rating])*86400000).toISOString();live.lastReviewedAt=new Date().toISOString();saveDB();}
    results.push(rating);position++;revealed=false;render();answering=false;
  }
  document.addEventListener('keydown',e=>{
    if(!document.getElementById('page-review')?.classList.contains('active')||document.querySelector('.modal-overlay.open')||/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName))return;
    if(e.code==='Space'){e.preventDefault();reveal();}
    if(['1','2','3'].includes(e.key)&&revealed){e.preventDefault();answer({1:'hard',2:'medium',3:'easy'}[e.key]);}
  });
  return {init,start,reveal,answer};
})();
