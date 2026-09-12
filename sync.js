const VaultSync = (() => {
  let client,user,baseline,channel,busy=false,timer,runAgain=false,epoch=0,ready=false;
  const clone=value=>JSON.parse(JSON.stringify(value));
  // Postgres JSONB reorders object keys. Compare content, not serialization order.
  const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
  const stable=value=>JSON.stringify(canonical(value));
  const equal=(a,b)=>stable(a)===stable(b);
  const config=window.HANZI_SUPABASE||{};
  const configured=Boolean(config.url&&config.publishableKey);
  const authRequired=config.requireAuth===true||location.hostname==='lozpastor.github.io';
  const arrays=['words','grammar','categories','relations','learningEvents'];
  const rowKey=row=>row.id||JSON.stringify(row);
  const baseKey=id=>`hanzivault_sync_base:${id}`;
  const cacheKey=id=>`hanzivault_account_library:${id}`;
  const empty=()=>({version:2,seedVersion:4,contentMigrationVersion:2,workbookVersion:WORKBOOK_SEED.version,words:[],grammar:[],categories:[],relations:[],learningEvents:[]});
  let conflicts=0;
  const read=key=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
  const deadline=async promise=>{
    let timeout;
    try{return await Promise.race([promise,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('La conexión ha tardado demasiado. Reintenta cuando tengas conexión.')),20000);})]);}
    finally{clearTimeout(timeout);}
  };
  function message(value){
    document.getElementById('account-message').textContent=value;
    const notice=document.getElementById('device-sync-notice');
    if(notice){notice.hidden=document.getElementById('sync-label').textContent!=='Sin conexión';notice.querySelector('span').textContent=value;}
  }
  function working(value){
    document.getElementById('account-panel').setAttribute('aria-busy',String(value));
    document.getElementById('account-sync').disabled=value;
    document.getElementById('account-sync').textContent=value?'Sincronizando…':'Comprobar sincronización';
  }
  function persist(){
    if(!user)return;
    localStorage.setItem(cacheKey(user.id),JSON.stringify(DB));
    localStorage.setItem('hanzivault_owner',user.id);
  }
  function mergeFields(base, local, remote) {
    const merged = {...remote};
    for (const key of new Set([...Object.keys(base || {}), ...Object.keys(local || {})])) {
      if (equal(local?.[key],base?.[key])) continue;
      if (equal(remote?.[key],base?.[key]) || equal(remote?.[key],local?.[key])) {
        if (local && key in local) merged[key] = clone(local[key]);
        else delete merged[key];
      } else conflicts++;
    }
    return merged;
  }
  function merge(base, local, remote) {
    local = clone(local);
    // Match imported categories across browsers before merging their references.
    if (!base) {
      const aliases = new Map();
      for (const cat of local.categories || []) {
        const match = (remote.categories || []).find(c => c.name === cat.name);
        if (match) {aliases.set(cat.id,match.id);cat.id=match.id;}
      }
      for (const item of [...(local.words || []), ...(local.grammar || [])]) {
        item.category = aliases.get(item.category) || item.category;
      }
    }
    const scalars = object => Object.fromEntries(Object.entries(object).filter(([key])=>!arrays.includes(key)));
    const result = base ? mergeFields(scalars(base),scalars(local),scalars(remote)) : {...local,...remote};
    for (const name of arrays) {
      const key = name === 'learningEvents' ? stable : rowKey;
      const prior = new Map((base?.[name] || []).map(i=>[key(i),i]));
      const current = new Map((local[name] || []).map(i=>[key(i),i]));
      const merged = new Map((remote[name] || []).map(i=>[key(i),i]));
      for (const [id,item] of current) {
        if (!base) {if (!merged.has(id)) merged.set(id,item);continue;}
        if (equal(item,prior.get(id))) continue;
        if (!prior.has(id) && !merged.has(id)) merged.set(id,item);
        else if (merged.has(id)) merged.set(id,mergeFields(prior.get(id),item,merged.get(id)));
        else conflicts++; // A remote deletion wins over a stale local edit.
      }
      for (const [id,item] of prior) {
        if (!current.has(id) && equal(merged.get(id),item)) merged.delete(id);
        else if (!current.has(id) && merged.has(id)) conflicts++;
      }
      result[name] = [...merged.values()];
    }
    return result;
  }


  function refreshUI(){
    updateNavBadges();
    const page=document.querySelector('.page.active')?.id;
    if(page==='page-dashboard')renderDashboard();
    if(page==='page-dictionary')renderDictionary();
    if(page==='page-grammar')renderGrammar();
    if(page==='page-categories')renderCategories();
    if(page==='page-graph')renderGraph();
  }
  async function sync(){
    if(!user||!baseline)return;
    if(busy){runAgain=true;return;}
    busy=true;runAgain=false;working(true);setSyncStatus('saving');
    const owner=user.id,version=epoch;
    message(`Sincronizando la biblioteca de ${user.email}…`);
    try{
      for(let attempt=0;attempt<4;attempt++){
        const {data:row,error}=await deadline(client.from('hanzi_vaults').select('revision,document').eq('user_id',owner).maybeSingle());
        if(error)throw error;
        if(version!==epoch)return;
        const snapshot=clone(DB),remote=row?.document||{};
        conflicts=0;
        const merged=merge(baseline.document,snapshot,remote);
        if(conflicts)localStorage.setItem(`hanzivault_conflict_backup:${owner}`,JSON.stringify(snapshot));
        let revision=row?.revision||0;
        if(!equal(merged,remote)){
          const {data,error:writeError}=await deadline(client.rpc('save_hanzi_vault',{expected_revision:revision,payload:merged}));
          if(writeError)throw writeError;
          if(data.conflict)continue;
          revision=data.revision;
        }
        if(version!==epoch)return;
        const pending=!equal(DB,snapshot),wasReady=ready;
        const next=pending?merge(snapshot,DB,merged):clone(merged),changed=!equal(DB,next);
        DB=next;baseline={document:merged,revision};
        persist();localStorage.setItem(baseKey(owner),JSON.stringify(baseline));
        ready=true;VaultAuth.ready();
        setSyncStatus(pending?'saving':'online');
        message(conflicts?'Cambios combinados. Un campo modificado simultáneamente conservó la versión de la nube; la copia anterior está disponible en esta cuenta.':`Sincronizado con ${user.email}: ${DB.words.length} palabras y ${DB.grammar.length} frases. Última comprobación: ${new Date().toLocaleTimeString('es')}.`);
        if(changed||!wasReady)refreshUI();
        if(pending)runAgain=true;
        return;
      }
      throw new Error('Hay cambios simultáneos. Se reintentará automáticamente.');
    }catch(error){
      if(version!==epoch)return;
      setSyncStatus('error');
      message('Sincronización pendiente. Los cambios de esta cuenta se conservan en este dispositivo. '+error.message);
      if(!ready)VaultAuth.failure('No se pudo recuperar tu biblioteca. No se ha sustituido por otra copia. '+error.message);
    }finally{
      busy=false;working(false);
      if(runAgain&&user){runAgain=false;clearTimeout(timer);timer=setTimeout(sync,300);}
    }
  }
  function schedule(){
    if(!user||!ready)return;
    setSyncStatus('saving');clearTimeout(timer);timer=setTimeout(sync,300);
  }
  function subscribe(){
    if(channel)client.removeChannel(channel);
    if(!client.channel)return;
    const owner=user.id;
    const changed=()=>{const panel=document.getElementById('account-panel');panel.dataset.remoteEvents=String(Number(panel.dataset.remoteEvents||0)+1);if(user?.id===owner)sync();};
    channel=client.channel('vault-'+owner).on('postgres_changes',{event:'UPDATE',schema:'public',table:'hanzi_vaults',filter:'user_id=eq.'+owner},changed)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'hanzi_vaults',filter:'user_id=eq.'+owner},changed)
      .subscribe(status=>{document.getElementById('account-panel').dataset.realtime=status;if(status==='SUBSCRIBED'&&user?.id===owner)sync();});
  }
  function migrateLocal(){
    const legacy=read('hanzivault_db'),owner=localStorage.getItem('hanzivault_owner');
    if(legacy&&owner)localStorage.setItem(cacheKey(owner),JSON.stringify(legacy));
    if(owner)for(const name of ['hanzivault_before_cloud','hanzivault_conflict_backup']){
      const backup=localStorage.getItem(name);
      if(backup&&!localStorage.getItem(name+':'+owner))localStorage.setItem(name+':'+owner,backup);
    }
    if(legacy&&!owner&&!read('hanzivault_unclaimed_library'))localStorage.setItem('hanzivault_unclaimed_library',JSON.stringify(legacy));
    localStorage.removeItem('hanzivault_db');
  }
  function onSession(session,event){
    const next=session?.user||null;
    VaultAuth.session(next,event);
    if(next?.id===user?.id)return;
    if(user)persist();
    epoch++;ready=false;clearTimeout(timer);
    if(channel){client.removeChannel(channel);channel=null;}
    user=next;baseline=null;DB=empty();
    document.getElementById('account-logout').hidden=!user;
    document.getElementById('account-sync').hidden=!user;
    if(!user){
      localStorage.removeItem('hanzivault_db');
      document.getElementById('dictionary-content').replaceChildren();
      document.getElementById('grammar-grid').replaceChildren();
      document.getElementById('review-content').replaceChildren();
      setSyncStatus('local');return;
    }
    VaultAuth.loading();
    const cached=read(cacheKey(user.id));
    if(cached){DB={...empty(),...cached};baseline=read(baseKey(user.id));}
    if(cached&&!baseline?.document&&!localStorage.getItem('hanzivault_before_cloud:'+user.id))localStorage.setItem('hanzivault_before_cloud:'+user.id,JSON.stringify(cached));
    baseline ||= {document:null};
    const claim=localStorage.getItem('hanzivault_legacy_claim');
    document.getElementById('account-import-legacy').hidden=!read('hanzivault_unclaimed_library')||Boolean(claim);
    const owner=user.id;
    if(client.realtime&&session.access_token)client.realtime.setAuth(session.access_token).then(()=>{if(user?.id===owner)subscribe();}).catch(()=>{});
    else subscribe();
    sync();
  }
  async function logout(){
    if(!user)return;
    if(ready&&!equal(DB,baseline?.document)&&!confirm('Hay cambios pendientes. Se conservarán para esta cuenta en este dispositivo. ¿Cerrar sesión igualmente?'))return;
    try{persist();const {error}=await deadline(client.auth.signOut({scope:'local'}));if(error)throw error;onSession(null);}
    catch(error){message('No se pudo cerrar sesión: '+error.message);}
  }
  function importLegacy(){
    const previous=read('hanzivault_unclaimed_library');
    if(!user||!ready||!previous)return;
    if(!confirm(`¿Confirmas que la biblioteca anterior de este navegador te pertenece y quieres combinarla con ${user.email}? No se borrará la copia anterior.`))return;
    localStorage.setItem('hanzivault_legacy_claim',user.id);
    localStorage.setItem(`hanzivault_before_cloud:${user.id}`,JSON.stringify(previous));
    DB=merge(null,previous,DB);saveDB();refreshUI();
    document.getElementById('account-import-legacy').hidden=true;
    message('Biblioteca anterior combinada. Subiendo los cambios a tu cuenta…');
  }
  async function init(){
    const host=document.getElementById('account-panel');
    host.innerHTML='<h3>Tu cuenta y tus dispositivos</h3><p id="account-message" role="status"></p><button id="account-sync" class="btn btn-secondary" hidden>Comprobar sincronización</button><button id="account-logout" class="btn btn-secondary" hidden>Cerrar sesión</button><button id="account-import-legacy" class="btn btn-secondary" hidden>Importar mi biblioteca anterior de este navegador</button><button id="account-backup" class="btn btn-secondary">Descargar copia anterior de esta cuenta</button>';
    if(!configured){
      if(authRequired){document.getElementById('auth-gate').textContent='No se pudo cargar la configuración de acceso. Recarga para reintentar. Tu biblioteca permanece bloqueada.';return;}
      document.body.classList.remove('auth-locked');document.getElementById('auth-gate').hidden=true;return;
    }
    migrateLocal();cloudEnabled=false;clearTimeout(saveTimer);
    const notice=document.createElement('div');notice.id='device-sync-notice';notice.className='sync-notice';notice.hidden=true;
    notice.innerHTML='<div><strong>Hay cambios pendientes de sincronizar</strong><span></span></div><button class="btn btn-secondary">Ver cuenta</button>';
    notice.querySelector('button').onclick=()=>showPage('import-export');document.querySelector('.content').prepend(notice);
    document.getElementById('account-sync').onclick=sync;
    document.getElementById('account-logout').onclick=logout;
    document.getElementById('account-import-legacy').onclick=importLegacy;
    document.getElementById('account-backup').onclick=()=>{
      if(!user)return;
      const data=localStorage.getItem(`hanzivault_conflict_backup:${user.id}`)||localStorage.getItem(`hanzivault_before_cloud:${user.id}`);
      if(data)download(data,'hanzi-copia-anterior.json','application/json');else message('No hay una copia anterior para esta cuenta. Puedes exportar su biblioteca actual.');
    };
    try{
      if(!window.supabase)await deadline(new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js';
        script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar el acceso. Comprueba tu conexión y recarga.'));document.head.appendChild(script);
      }));
      client=window.supabase.createClient(config.url,config.publishableKey);
      VaultAuth.bind(client);
      let authEventSeen=false;
      client.auth.onAuthStateChange((event,session)=>{
        if(event==='INITIAL_SESSION')return;
        authEventSeen=true;
        if(event==='SIGNED_OUT')VaultAuth.locked(true);
        setTimeout(()=>onSession(session,event),0);
      });
      const {data,error}=await deadline(client.auth.getSession());if(error)throw error;
      if(!authEventSeen){
        if(data.session){const verified=await deadline(client.auth.getUser());if(verified.error)throw verified.error;if(!authEventSeen)onSession({...data.session,user:verified.data.user});}
        else onSession(null);
      }
      setInterval(()=>{if(!document.hidden)sync();},15000);
      window.addEventListener('online',sync);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
      window.addEventListener('beforeunload',event=>{if(user&&ready&&!equal(DB,baseline?.document)){event.preventDefault();event.returnValue='';}});
    }catch(error){
      if(!document.getElementById('auth-message'))document.getElementById('auth-gate').textContent='No se pudo cargar el acceso. Comprueba tu conexión y recarga.';
      else VaultAuth.failure(error.message);
      setSyncStatus('error');
    }
  }
  return {init,schedule,merge,configured,persist,logout,retry:sync,get canEdit(){return (!configured&&!authRequired)||Boolean(user&&ready);}};
})();
