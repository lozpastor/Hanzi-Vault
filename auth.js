const VaultAuth=(()=>{
  let client,mode='login',sending=false,currentUser=null,recovering=false;
  const gate=()=>document.getElementById('auth-gate');
  function locked(value){
    document.body.classList.toggle('auth-locked',value);gate().hidden=!value;
    document.querySelector('.app').inert=value;
    if(value){document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));document.getElementById('toast-container').replaceChildren();}
  }
  function note(text){document.getElementById('auth-message').textContent=text;}
  async function request(promise){
    let timeout;
    try{return await Promise.race([promise,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('La conexión ha tardado demasiado. Comprueba tu conexión y reintenta.')),20000);})]);}
    finally{clearTimeout(timeout);}
  }
  function errorText(error){
    if(error.code==='invalid_credentials')return 'Correo o contraseña incorrectos. La contraseña de Supabase Dashboard no es la de esta web. Si antes entrabas por enlace, usa «Crear o recuperar contraseña».';
    if(error.code==='email_not_confirmed')return 'Confirma tu correo con el enlace recibido antes de iniciar sesión.';
    if(error.code==='over_email_send_rate_limit'||/email rate limit exceeded/i.test(error.message||''))return 'Se ha alcanzado el límite de envío de correo del proyecto. Revisa tu último correo o espera a que se libere el cupo (hasta una hora). El acceso con contraseña no envía correos.';
    if(error.status===429)return 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
    return error.message||'No se pudo completar la operación. Comprueba tu conexión.';
  }
  function profile(){
    const button=document.getElementById('sync-status');
    button.classList.toggle('profile-button',Boolean(currentUser));
    document.getElementById('profile-name').textContent=currentUser?.email||'';
    button.title=currentUser?`Cuenta: ${currentUser.email}. Ver perfil y sincronización`:'Iniciar sesión';
  }
  function render(){
    const create=mode==='signup',reset=mode==='reset';
    gate().innerHTML=`<section class="auth-shell"><div class="auth-brand">HANZI VAULT</div><h1>${create?'Crea tu cuenta':reset?'Crea o recupera tu contraseña':'Tu biblioteca de chino'}</h1><p>${reset?'Recibirás un enlace para establecer una contraseña para esta web. Si ya tienes una sesión abierta, también puedes crearla desde Cuenta.':create?'Una biblioteca privada, vinculada a tu correo y disponible en todos tus dispositivos.':'Inicia sesión con tu correo y contraseña para acceder a tus palabras y frases.'}</p><form id="auth-form" class="auth-form"><label for="auth-email">Correo electrónico</label><input id="auth-email" class="form-input" type="email" autocomplete="username" required>${reset?'':`<label for="auth-password">Contraseña</label><input id="auth-password" class="form-input" type="password" autocomplete="${create?'new-password':'current-password'}" ${create?'minlength="12"':''} required>`}${create?'<label for="auth-confirm">Repite la contraseña</label><input id="auth-confirm" class="form-input" type="password" autocomplete="new-password" minlength="12" required><small>Mínimo 12 caracteres.</small>':''}<button class="btn btn-primary" type="submit">${reset?'Enviar enlace':create?'Crear cuenta':'Iniciar sesión'}</button></form><div class="auth-links"><button class="btn btn-secondary" id="auth-switch">${mode==='login'?'Crear cuenta':'Volver a iniciar sesión'}</button>${mode==='login'?'<button class="btn btn-secondary" id="auth-reset">Crear o recuperar contraseña</button>':''}</div><p id="auth-message" role="status" aria-live="polite"></p></section>`;
    document.getElementById('auth-switch').onclick=()=>{if(!sending){mode=mode==='login'?'signup':'login';render();}};
    document.getElementById('auth-reset')?.addEventListener('click',()=>{if(!sending){mode='reset';render();}});
    document.getElementById('auth-form').onsubmit=submit;
  }
  async function submit(event){
    event.preventDefault();if(sending)return;
    const email=document.getElementById('auth-email').value.trim(),password=document.getElementById('auth-password')?.value;
    if(mode==='signup'&&password!==document.getElementById('auth-confirm').value){note('Las contraseñas no coinciden.');return;}
    const emailOperation=mode!=='login';
    if(emailOperation&&Number(localStorage.getItem('hanzivault_email_retry_at')||0)>Date.now()){note('Espera al menos un minuto entre solicitudes de correo. Iniciar sesión con contraseña sigue disponible.');return;}
    sending=true;const button=event.target.querySelector('button');button.disabled=true;note('Conectando…');
    try{
      let result;
      if(mode==='login')result=await request(client.auth.signInWithPassword({email,password}));
      else if(mode==='signup')result=await request(client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}));
      else result=await request(client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname+'?recovery=1'}));
      if(result.error)throw result.error;
      if(emailOperation){localStorage.setItem('hanzivault_email_retry_at',String(Date.now()+60000));note('Si la cuenta puede recibir este correo, encontrarás un enlace en tu buzón. Revisa también spam. No necesitas solicitar otro para iniciar sesión después con tu contraseña.');}
      else note('Sesión iniciada. Recuperando tu biblioteca…');
      event.target.querySelectorAll('input[type="password"]').forEach(i=>i.value='');
    }catch(error){if(emailOperation&&error.status===429)localStorage.setItem('hanzivault_email_retry_at',String(Date.now()+60000));note(errorText(error));}
    finally{sending=false;button.disabled=false;}
  }
  function passwordForm(){
    const form=document.createElement('form');form.className='auth-form account-password-form';form.id='account-password-form';
    form.innerHTML='<h3>Contraseña de esta cuenta</h3><p>Si antes entrabas por enlace, crea aquí una contraseña. En los demás dispositivos usa este mismo correo y contraseña.</p><label for="account-new-password">Nueva contraseña</label><input class="form-input" id="account-new-password" type="password" autocomplete="new-password" minlength="12" required><label for="account-confirm-password">Repite la contraseña</label><input class="form-input" id="account-confirm-password" type="password" autocomplete="new-password" minlength="12" required><button class="btn btn-primary" type="submit">Guardar contraseña</button><p id="password-message" role="status"></p>';
    form.onsubmit=async event=>{
      event.preventDefault();const button=form.querySelector('button'),status=form.querySelector('#password-message');
      const password=form.querySelector('#account-new-password').value;
      if(password!==form.querySelector('#account-confirm-password').value){status.textContent='Las contraseñas no coinciden.';return;}
      button.disabled=true;status.textContent='Guardando contraseña…';
      try{const {error}=await request(client.auth.updateUser({password}));if(error)throw error;form.reset();recovering=false;status.textContent='Contraseña guardada. Ya puedes iniciar sesión con ella en tus otros dispositivos.';}
      catch(error){status.textContent=errorText(error);}
      finally{button.disabled=false;}
    };return form;
  }
  function bind(sdk){client=sdk;render();document.getElementById('account-panel').appendChild(passwordForm());}
  function session(next,event){
    currentUser=next;profile();
    if(event==='PASSWORD_RECOVERY')recovering=true;
    if(!next){document.getElementById('account-password-form')?.reset();const status=document.getElementById('password-message');if(status)status.textContent='';locked(true);mode='login';render();return;}
    if(recovering&&!document.body.classList.contains('auth-locked'))showPage('import-export');
  }
  function loading(){locked(true);note('Sesión verificada. Recuperando tu biblioteca privada…');document.getElementById('auth-form').hidden=true;document.querySelector('.auth-links').hidden=true;}
  function ready(){const wasLocked=document.body.classList.contains('auth-locked');locked(false);profile();if(recovering&&wasLocked){showPage('import-export');document.getElementById('account-new-password').focus();}}
  function failure(text){note(text);if(currentUser){
    const links=document.querySelector('.auth-links');links.hidden=false;links.replaceChildren();
    for(const [label,action] of [['Reintentar',()=>VaultSync.retry()],['Cerrar sesión',()=>VaultSync.logout()]]){const b=document.createElement('button');b.type='button';b.className='btn btn-secondary';b.textContent=label;b.onclick=action;links.appendChild(b);}
  }}
  return {bind,session,loading,ready,failure,locked,profile};
})();
