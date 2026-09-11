const MASTERY = {
  planned: {label:'Por conocer', status:'planned', color:'#919191'},
  recognize: {label:'Reconozco', status:'learning', color:'#d2aa24'},
  assisted: {label:'Recuerdo con ayuda', status:'learning', color:'#c38c17'},
  ready: {label:'Puedo utilizarlo', status:'learned', color:'#429b68'},
  active: {label:'Lo utilizo', status:'learned', color:'#23774a'}
};
const progressEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const EXCEL_HSK_TARGETS = {words:[500,1000,2000,3500],grammar:[200,400,800,1200]};
function assignHskLevels() {
  let changed=false;
  for(const word of DB.words){
    if(/^[1-6]$/.test(String(word.hsk)))continue;
    const zh=(word.zh||'').trim();
    const exact=HSK_REFERENCE[zh];
    const chars=[...zh].filter(c=>/\p{Script=Han}/u.test(c));
    const known=chars.map(c=>HSK_REFERENCE[c]).filter(Boolean);
    word.hsk=String(exact || (known.length===chars.length&&known.length?Math.min(6,Math.max(...known)+1):6));
    word.hskSource=exact?'hsk-2015':'estimate';
    word.hskAssigned=word.hsk;
    changed=true;
  }
  return changed;
}
function hskBadge(word) {
  if(!word.hsk)return '';
  const automatic=word.hskAssigned===word.hsk;
  const estimated=automatic&&word.hskSource==='estimate';
  const explanation=estimated?'Estimación provisional por componentes; si no hay referencia, nivel 6 provisional. Puedes editarlo.':automatic&&word.hskSource==='hsk-2015'?'Referencia HSK 2.0, listado 2015. No certifica tu dominio.':'Nivel orientativo indicado en la ficha; editable.';
  return `<span class="hsk hsk-${progressEscape(word.hsk)}" title="${explanation}">HSK ${progressEscape(word.hsk)}${estimated?' ≈':''}</span>`;
}
function renderHskJourney() {
  const usable=key=>progressItems(key).filter(i=>['ready','active'].includes(masteryOf(i))).length;
  const words=usable('words'),phrases=usable('grammar');
  return `<section class="learning-panel hsk-journey"><div class="learning-heading"><h3>Tu itinerario HSK</h3><span>Metas de tu Excel</span></div><p class="learning-caption">Cuenta las fichas en «Puedo utilizarlo» y «Lo utilizo» dentro del alcance seleccionado. Son tus objetivos personales, no una acreditación ni umbrales oficiales del examen.</p><div class="hsk-milestones">${EXCEL_HSK_TARGETS.words.map((target,i)=>{
    const phraseTarget=EXCEL_HSK_TARGETS.grammar[i],complete=words>=target&&phrases>=phraseTarget;
    return `<article class="hsk-milestone ${complete?'complete':''}"><header><h4>HSK ${i+1}</h4><span>${complete?'Meta alcanzada':'En camino'}</span></header>${[['Palabras',words,target],['Frases',phrases,phraseTarget]].map(([label,count,goal])=>`<div class="hsk-metric"><div><span>${label}</span><strong>${count.toLocaleString('es')} / ${goal.toLocaleString('es')}</strong></div><progress value="${Math.min(count,goal)}" max="${goal}" aria-label="${label} hacia HSK ${i+1}"></progress><small>${Math.max(0,goal-count).toLocaleString('es')} por aprender · ${Math.min(100,count/goal*100).toFixed(1)}%</small></div>`).join('')}</article>`;
  }).join('')}</div><details class="hsk-explanation"><summary>Cómo interpretar los niveles de las fichas</summary><p>Las palabras se contrastan con el <a href="https://old.chinesetest.cn/userfiles/file/HSK/HSK-2015.xlsx" target="_blank" rel="noopener">listado HSK 2.0 de 2015</a>. Las fichas con ≈ son estimaciones por sus caracteres, no clasificaciones oficiales; las no identificadas se sitúan provisionalmente en HSK 6. Los niveles ya indicados se conservan y pueden editarse. Este marco no es el nuevo HSK 3.0. Las metas de frases proceden exclusivamente de tu Excel.</p></details></section>`;
}
function masteryOf(item) {
  return item.mastery || ({planned:'planned', learning:'recognize', learned:'ready'}[item.status]) || 'planned';
}
function mergeWorkbook() {
  if (DB.workbookVersion === WORKBOOK_SEED.version) return;
  for (const collection of ['words','grammar']) {
    const used = new Set();
    for (const row of WORKBOOK_SEED[collection]) {
      let category = DB.categories.find(c => c.name === row.categoryName);
      if (!category) {
        category = {id:genId(), name:row.categoryName, emoji:''};
        DB.categories.push(category);
      }
      let item = DB[collection].find(i => !used.has(i.id) &&
        (i.zh || i.pattern) === row.zh &&
        normalizeText(i.translation || i.meaning) === normalizeText(row.translation));
      if (!item) {
        item = {id:row.id, date:new Date().toISOString(), starred:false, tags:[], reviewCount:0, hsk:''};
        DB[collection].push(item);
      }
      used.add(item.id);
      Object.assign(item, {category:category.id, mastery:row.mastery,
        status:MASTERY[row.mastery].status, pronunciationHint:row.pronunciationHint,
        workbookSource:WORKBOOK_SEED.version, sourceRow:row.sourceRow});
      if (collection === 'words') Object.assign(item, {zh:row.zh,pinyin:row.pinyin,translation:row.translation});
      else Object.assign(item, {pattern:row.zh,meaning:row.translation,exampleZh:row.zh,
        examplePinyin:row.pinyin,exampleEs:row.translation});
    }
  }
  DB.learningGoals = {...WORKBOOK_SEED.goals, ...DB.learningGoals};
  DB.workbookVersion = WORKBOOK_SEED.version;
  saveDB();
}
function setMastery(type, id, level) {
  const item = (type === 'phrase' ? DB.grammar : DB.words).find(i => i.id === id);
  if (!item || !MASTERY[level]) return;
  if (masteryOf(item) !== level) {
    DB.learningEvents ||= [];
    DB.learningEvents.push({at:new Date().toISOString(),id,type,from:masteryOf(item),to:level});
  }
  item.mastery = level;
  setItemStatus(type,id,MASTERY[level].status);
  renderLearningProgress();
}
function masteryPicker(type, item) {
  const current = masteryOf(item);
  return `<div class="mastery-picker" onclick="event.stopPropagation()" title="${progressEscape(item.pronunciationHint || '')}"><span>${MASTERY[current].label}</span><div>${Object.entries(MASTERY).map(([key, value]) => `<button type="button" aria-label="${value.label}" aria-pressed="${current === key}" title="${value.label}" style="--mastery-color:${value.color}" onclick="setMastery('${type}','${item.id}','${key}')"></button>`).join('')}</div></div>`;
}
function progressItems(collection) {
  const scope = document.getElementById('progress-scope')?.value || 'workbook';
  return DB[collection].filter(i => scope === 'all' || i.workbookSource === WORKBOOK_SEED.version);
}
function renderLearningProgress() {
  const host = document.getElementById('learning-progress');
  if (!host) return;
  const groups = ['words','grammar'].map(key => {
    const items = progressItems(key);
    const counts = Object.fromEntries(Object.keys(MASTERY).map(level => [level,items.filter(i => masteryOf(i) === level).length]));
    const usable = counts.ready + counts.active;
    const goal = DB.learningGoals?.[key] || WORKBOOK_SEED.goals[key];
    return `<section class="learning-panel"><div class="learning-heading"><h3>${key === 'words' ? 'Palabras' : 'Frases'}</h3><span>${items.length} en seguimiento</span></div><div class="learning-total">${usable}<small> / ${goal.toLocaleString('es')} utilizables</small></div><progress max="${goal}" value="${usable}" aria-label="Objetivo de ${key === 'words' ? 'palabras' : 'frases'}"></progress><p class="learning-caption">${(usable/goal*100).toFixed(1)}% del objetivo · Puedo utilizarlo + Lo utilizo</p><div class="learning-states">${Object.entries(MASTERY).map(([level, info]) => `<div><i style="background:${info.color}"></i><span>${info.label}</span><strong>${counts[level]}</strong></div>`).join('')}</div></section>`;
  });
  const items = [...progressItems('words'), ...progressItems('grammar')];
  const categories = DB.categories.map(cat => {
    const entries = items.filter(i => i.category === cat.id);
    const usable = entries.filter(i => ['ready','active'].includes(masteryOf(i))).length;
    return {cat, total:entries.length, usable};
  }).filter(c => c.total).sort((a,b) => b.total-a.total);
  host.innerHTML = `<div class="learning-grid">${groups.join('')}</div>${renderHskJourney()}<section class="learning-panel"><div class="learning-heading"><h3>Dominio por categoría</h3><span>Utilizables / total</span></div><div class="learning-categories">${categories.map(({cat,total,usable}) => `<div><span>${progressEscape(cat.name)}</span><progress max="${total}" value="${usable}" aria-label="${progressEscape(cat.name)}"></progress><strong>${usable} / ${total}</strong></div>`).join('')}</div></section>`;
  const events = DB.learningEvents || [];
  document.getElementById('learning-history').textContent = events.length
    ? `${events.length} cambios de dominio registrados desde la incorporación de este panel. Último cambio: ${new Date(events[events.length-1].at).toLocaleString('es')}.`
    : 'El historial empieza con tus próximos cambios de dominio. El Excel contiene tu estado actual, pero no fechas de aprendizaje.';
}
