const VaultSync = (() => {
  let client, user, baseline, busy = false, timer, paused = false;
  const clone = value => JSON.parse(JSON.stringify(value));
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const config = window.HANZI_SUPABASE || {};
  const configured = Boolean(config.url && config.publishableKey);
  const arrays = ['words','grammar','categories','relations','learningEvents'];
  const rowKey = row => row.id || JSON.stringify(row);
  const message = value => {document.getElementById('account-message').textContent = value;};
  const baseKey = id => `hanzivault_sync_base:${id}`;
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
    const owner = user.id;
    try {
      for (let attempt=0;attempt<4;attempt++) {
        const {data:row,error} = await client.from('hanzi_vaults').select('revision,document').eq('user_id',owner).maybeSingle();
        if (error) throw error;
        if (user?.id !== owner || paused) return;
        const snapshot = clone(DB);
        conflicts = 0;
        const remote = row?.document || {};
        const merged = merge(baseline.document,snapshot,remote);
        if (conflicts) localStorage.setItem('hanzivault_conflict_backup',JSON.stringify(snapshot));
        if (!equal(merged,remote)) {
          const {data,error:writeError} = await client.rpc('save_hanzi_vault',{expected_revision:row?.revision || 0,payload:merged});
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
        message(conflicts ? 'Se combinaron los cambios. En campos modificados en ambos dispositivos se mantuvo la nube; puedes descargar la copia local anterior.' : `Sincronizado con ${user.email}.`);
        refreshUI();
        if (pending) schedule();
        return;
      }
      throw new Error('Hay cambios simultáneos. Volveremos a intentarlo.');
    } catch (error) {
      setSyncStatus('error');
      message('Guardado en este dispositivo; sincronización pendiente. ' + error.message);
    } finally {busy=false;}
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
    if (next?.id === user?.id) return;
    user=next;baseline=null;
    document.getElementById('account-login').hidden=Boolean(user);
    document.getElementById('account-logout').hidden=!user;
    document.getElementById('account-sync').hidden=!user;
    document.getElementById('account-combine').hidden=true;
    if (!user) {message('Inicia sesión con el mismo correo en todos tus dispositivos.');setSyncStatus('local');return;}
    const owner=localStorage.getItem('hanzivault_owner');
    // Never silently upload a previous account's data into a different account.
    if (owner === user.id) {
      try {baseline=JSON.parse(localStorage.getItem(baseKey(user.id)));} catch {}
    }
    localStorage.setItem('hanzivault_owner',user.id);
    if (baseline) sync();
    else {
      document.getElementById('account-combine').hidden=false;
      message('Sesión iniciada. Combina esta biblioteca con tu cuenta para activar la sincronización. Si una ficha ya existe en la nube, se conserva su estado. Se guardará una copia local previa.');
    }
  }
  async function login(event) {
    event.preventDefault();
    const email=document.getElementById('account-email').value.trim();
    const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
    message(error ? error.message : 'Revisa tu correo y abre el enlace de acceso en este dispositivo.');
  }
  async function logout() {
    if (busy) {message('Espera a que termine la sincronización antes de cerrar sesión.');return;}
    paused=true;
    const {error}=await client.auth.signOut({scope:'local'});
    paused=false;
    if(error) message(error.message);
  }
  async function init() {
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
      if (!window.supabase) await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js';
        script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar la conexión. Recarga para reintentar.'));
        document.head.appendChild(script);
      });
      client=window.supabase.createClient(config.url,config.publishableKey);
      document.getElementById('account-login').onsubmit=login;
      document.getElementById('account-combine').onclick=connect;
      document.getElementById('account-sync').onclick=sync;
      document.getElementById('account-logout').onclick=logout;
      client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>onSession(session),0));
      const {data,error}=await client.auth.getSession();
      if(error) throw error;
      // Render the login form even when there is no prior session.
      document.getElementById('account-login').hidden=false;
      message('Inicia sesión con el mismo correo en todos tus dispositivos.');
      onSession(data.session);
      setInterval(()=>{if(!document.hidden) sync();},15000);
      window.addEventListener('online',sync);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden) sync();});
    } catch(error) {message(error.message);setSyncStatus('local');}
  }
  return {init,schedule,merge,configured};
})();
