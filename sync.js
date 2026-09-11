const VaultSync = (() => {
  let client, user, baseline, busy = false, timer, paused = false, sessionInitialized = false;
  const deadline = async promise => {
    let timeout;
    try { return await Promise.race([promise,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('La conexión ha tardado demasiado. Tus cambios siguen guardados aquí; volveremos a intentarlo.')),20000);})]); }
    finally {clearTimeout(timeout);}
  };
  function working(value) {
    document.getElementById('account-panel').setAttribute('aria-busy',String(value));
    for(const id of ['account-sync','account-combine','account-logout']) document.getElementById(id).disabled=value;
    document.getElementById('account-sync').textContent=value?'Sincronizando…':'Comprobar sincronización';
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const config = window.HANZI_SUPABASE || {};
  const configured = Boolean(config.url && config.publishableKey);
  const arrays = ['words','grammar','categories','relations','learningEvents'];
  const rowKey = row => row.id || JSON.stringify(row);
  const message = value => {
    document.getElementById('account-message').textContent = value;
    const notice=document.getElementById('device-sync-notice');
    if(notice){
      const failed=document.getElementById('sync-label')?.textContent==='Sin conexión';
      notice.hidden=Boolean(user&&baseline&&!failed);
      notice.querySelector('strong').textContent=failed?'Hay cambios pendientes de sincronizar':user?'Tu biblioteca se sincroniza automáticamente':'Conecta tu biblioteca entre dispositivos';
      notice.querySelector('span').textContent=user?value:configured?'Abre el enlace de acceso de tu correo en cada dispositivo. La sesión del panel de Supabase es independiente de esta web.':'Tus cambios se guardan solo en este navegador. La conexión compartida aún no está configurada.';
      notice.querySelector('button').textContent=user?'Ver sincronización':'Conectar mi cuenta';
    }
  };
  const baseKey = id => `hanzivault_sync_base:${id}`;
  const emailCooldownKey='hanzivault_email_retry_at';
  let emailSending=false;
  function updateEmailButton() {
    const button=document.querySelector('#account-login button');
    if(!button)return;
    const seconds=Math.max(0,Math.ceil((Number(localStorage.getItem(emailCooldownKey)||0)-Date.now())/1000));
    button.disabled=emailSending||seconds>0;
    button.textContent=emailSending?'Enviando…':seconds?`Volver a solicitar en ${seconds} s`:'Recibir enlace de acceso';
  }
  function emailError(error) {
    if(error.code==='over_email_send_rate_limit'||/email rate limit exceeded/i.test(error.message||'')){
      localStorage.setItem(emailCooldownKey,String(Date.now()+60000));
      return 'Se ha alcanzado el límite de correos de Supabase. El servicio integrado permite 2 envíos por hora entre todos los dispositivos. Revisa el último enlace recibido: si sigue vigente y no lo has usado, puedes abrirlo. Si necesitas otro, espera a que se libere el cupo; puede tardar hasta una hora. Recargar no restablece el límite. No se ha iniciado sesión y tus palabras siguen guardadas localmente.';
    }
    if(error.status===429||error.code==='over_request_rate_limit'){
      localStorage.setItem(emailCooldownKey,String(Date.now()+60000));
      return 'Demasiadas solicitudes de acceso. Espera antes de volver a intentarlo; recargar no elimina el límite. Tus palabras siguen guardadas en este dispositivo.';
    }
    return 'No se pudo enviar el enlace: '+error.message;
  }
  let conflicts = 0;

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
      const key = name === 'learningEvents' ? JSON.stringify : rowKey;
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

  function refreshUI() {
    updateNavBadges();
    const page = document.querySelector('.page.active')?.id;
    if (page === 'page-dashboard') renderDashboard();
    if (page === 'page-dictionary') renderDictionary();
    if (page === 'page-grammar') renderGrammar();
  }
  async function sync() {
    if (!user || !baseline || busy || paused) return;
    busy = true;
    working(true);setSyncStatus('saving');
    message(`Sincronizando la biblioteca de ${user.email}…`);
    const owner = user.id;
    try {
      for (let attempt=0;attempt<4;attempt++) {
        const {data:row,error} = await deadline(client.from('hanzi_vaults').select('revision,document').eq('user_id',owner).maybeSingle());
        if (error) throw error;
        if (user?.id !== owner || paused) return;
        const snapshot = clone(DB);
        conflicts = 0;
        const remote = row?.document || {};
        const merged = merge(baseline.document,snapshot,remote);
        if (conflicts) localStorage.setItem('hanzivault_conflict_backup',JSON.stringify(snapshot));
        if (!equal(merged,remote)) {
          const {data,error:writeError} = await deadline(client.rpc('save_hanzi_vault',{expected_revision:row?.revision || 0,payload:merged}));
          if (writeError) throw writeError;
          if (data.conflict) continue;
        }
        if (user?.id !== owner || paused) return;
        // Preserve edits made while the network request was in flight.
        const pending = !equal(DB,snapshot);
        DB = pending ? merge(snapshot,DB,merged) : clone(merged);
        baseline = {document:merged};
        localStorage.setItem(baseKey(owner),JSON.stringify(baseline));
        localStorage.setItem('hanzivault_db',JSON.stringify(DB));
        setSyncStatus(pending ? 'saving' : 'online');
        message(conflicts ? 'Se combinaron los cambios. En campos modificados en ambos dispositivos se mantuvo la nube; puedes descargar la copia local anterior.' : `Sincronizado con ${user.email}: ${DB.words.length} palabras y ${DB.grammar.length} frases. Última comprobación: ${new Date().toLocaleTimeString('es')}. Los próximos cambios se guardan automáticamente.`);
        refreshUI();
        if (pending) schedule();
        return;
      }
      throw new Error('Hay cambios simultáneos. Volveremos a intentarlo.');
    } catch (error) {
      setSyncStatus('error');
      message('Guardado en este dispositivo; sincronización pendiente. ' + error.message);
    } finally {busy=false;working(false);}
  }
  function schedule() {
    if (!user || !baseline) {setSyncStatus('local');return;}
    setSyncStatus('saving');
    clearTimeout(timer);timer=setTimeout(sync,500);
  }
  async function connect() {
    if (!user || busy) return;
    localStorage.setItem('hanzivault_before_cloud',JSON.stringify(DB));
    baseline = {document:null};
    localStorage.setItem(baseKey(user.id),JSON.stringify(baseline));
    document.getElementById('account-combine').hidden=true;
    await sync();
  }
  function onSession(session) {
    const next = session?.user;
    if (sessionInitialized && next?.id === user?.id) return;
    if (busy) {setTimeout(()=>onSession(session),100);return;}
    sessionInitialized=true;
    user=next;baseline=null;
    document.getElementById('account-login').hidden=Boolean(user);
    document.getElementById('account-logout').hidden=!user;
    document.getElementById('account-sync').hidden=!user;
    document.getElementById('account-combine').hidden=true;
    if (!user) {setSyncStatus('local');message('No hay una sesión activa en esta web. Recibe un enlace por correo y ábrelo en este dispositivo para conectar tu biblioteca.');return;}
    const owner=localStorage.getItem('hanzivault_owner');
    // Never silently upload a previous account's data into a different account.
    let restored=false;
    if(owner && owner!==user.id){
      localStorage.setItem(`hanzivault_account_library:${owner}`,JSON.stringify(DB));
      const saved=localStorage.getItem(`hanzivault_account_library:${user.id}`);
      let library;try{library=JSON.parse(saved);}catch{}
      restored=Boolean(library);
      DB=library||{version:2,words:[],grammar:[],categories:[],relations:[],learningEvents:[],workbookVersion:WORKBOOK_SEED.version,seedVersion:4,contentMigrationVersion:2};
      localStorage.setItem('hanzivault_db',JSON.stringify(DB));
      refreshUI();
    }
    if (owner === user.id || restored) {
      try {baseline=JSON.parse(localStorage.getItem(baseKey(user.id)));} catch {}
    }
    localStorage.setItem('hanzivault_owner',user.id);
    if (baseline) {message('Recuperando tu biblioteca compartida…');sync();}
    else {
      connect().catch(error=>{setSyncStatus('error');message('No se pudo activar la sincronización: '+error.message);document.getElementById('account-combine').hidden=false;});
    }
  }
  async function login(event) {
    event.preventDefault();
    if(emailSending||Number(localStorage.getItem(emailCooldownKey)||0)>Date.now()){updateEmailButton();return;}
    const email=document.getElementById('account-email').value.trim();
    emailSending=true;updateEmailButton();
    message('Enviando el enlace de acceso…');
    try{
      const {error}=await deadline(client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}}));
      if(error)throw error;
      localStorage.setItem(emailCooldownKey,String(Date.now()+60000));
      message('Enlace enviado. Revisa tu correo y spam y ábrelo en este dispositivo para iniciar sesión. Evita pedir otro mientras llega: cada solicitud consume el cupo de correo del proyecto.');
    }catch(error){message(emailError(error));}
    finally{emailSending=false;updateEmailButton();}
  }
  async function logout() {
    if (busy) {message('Espera a que termine la sincronización antes de cerrar sesión.');return;}
    paused=true;
    try{
      const {error}=await deadline(client.auth.signOut({scope:'local'}));
      if(error) throw error;
      onSession(null);
    }catch(error){message('No se pudo cerrar la sesión: '+error.message);}
    finally{paused=false;}
  }
  async function init() {
    const callbackError=new URLSearchParams(location.hash.slice(1)).get('error_description');
    const notice=document.createElement('div');notice.id='device-sync-notice';notice.className='sync-notice';
    notice.innerHTML='<div><strong>Conecta tu biblioteca entre dispositivos</strong><span></span></div><button class="btn btn-secondary" type="button">Conectar mi cuenta</button>';
    notice.querySelector('button').onclick=()=>{showPage('import-export');document.getElementById('account-panel').scrollIntoView({block:'start',behavior:'smooth'});};
    document.querySelector('.content').prepend(notice);
    const host=document.getElementById('account-panel');
    host.innerHTML=`<h3>Tu cuenta y tus dispositivos</h3><p id="account-message" role="status"></p><form id="account-login" hidden><label for="account-email">Correo electrónico</label><input id="account-email" class="form-input" type="email" autocomplete="email" required><button class="btn btn-primary" type="submit">Recibir enlace de acceso</button></form><button id="account-combine" class="btn btn-primary" hidden>Combinar y activar sincronización</button><button id="account-sync" class="btn btn-secondary" hidden>Sincronizar ahora</button><button id="account-logout" class="btn btn-secondary" hidden>Cerrar sesión</button><button id="account-backup" class="btn btn-secondary">Descargar copia previa a sincronizar</button>`;
    document.getElementById('account-backup').onclick=()=>{
      const data=localStorage.getItem('hanzivault_conflict_backup') || localStorage.getItem('hanzivault_before_cloud');
      if(data) download(data,'hanzi-copia-previa.json','application/json');
      else message('Todavía no hay una copia previa a la sincronización. Puedes exportar tu biblioteca actual en esta página.');
    };
    if (!configured) {message('Tus cambios se guardan en este navegador. La sincronización entre dispositivos está pendiente de activar.');return;}
    cloudEnabled=false;clearTimeout(saveTimer);
    try {
      if (!window.supabase) await deadline(new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js';
        script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar la conexión. Recarga para reintentar.'));
        document.head.appendChild(script);
      }));
      client=window.supabase.createClient(config.url,config.publishableKey);
      document.getElementById('account-login').onsubmit=login;
      updateEmailButton();
      setInterval(updateEmailButton,1000);
      document.getElementById('account-combine').onclick=connect;
      document.getElementById('account-sync').onclick=sync;
      document.getElementById('account-logout').onclick=logout;
      client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>onSession(session),0));
      const {data,error}=await deadline(client.auth.getSession());
      if(error) throw error;
      onSession(data.session);
      if(callbackError&&!data.session) message('El enlace de acceso no es válido o ha caducado. Solicita uno nuevo desde este formulario.');
      setInterval(()=>{if(!document.hidden) sync();},15000);
      window.addEventListener('online',sync);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden) sync();});
    } catch(error) {message(error.message);setSyncStatus('local');}
  }
  return {init,schedule,merge,configured};
})();
