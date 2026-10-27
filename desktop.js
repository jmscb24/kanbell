/* Ventana de primer nivel: la API Notification no está disponible en el sandbox
   del plugin. Solo acepta horario del opener original y un token de esta sesión. */
(function(){
  'use strict';
  const K=KanBell, $=id=>document.getElementById(id), PREFIX='kanbell.windows.v1.';
  const token=new URLSearchParams(location.hash.slice(1)).get('kanbell');
  const opener=window.opener, live=new Map();
  let config=null, active=false, interval=null, testTimer=null, releaseLock=null, busy=false;
  let runTick=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function message(text,error=false){$('desktop-status').textContent=text;$('desktop-status').classList.toggle('error',error);}
  function read(key){const raw=sessionStorage.getItem(PREFIX+key);return raw?JSON.parse(raw):null;}
  const storage={get:async key=>key==='config'?config:read(key),set:async(key,value)=>sessionStorage.setItem(PREFIX+key,JSON.stringify(value))};
  function all(){return Object.keys(sessionStorage).filter(k=>k.startsWith(PREFIX+'event.')).map(k=>JSON.parse(sessionStorage.getItem(k))).filter(Boolean);}
  function closeNotification(key){live.get(key)?.close();live.delete(key);}
  async function act(e,minutes){
    const current=read(e.key);if(!current)return;
    await storage.set(e.key,{...current,status:minutes?'snoozed':'dismissed',until:minutes?Date.now()+minutes*60000:null});
    closeNotification(e.key);render();
  }
  function show(e,c,test=false){
    if(Notification.permission!=='granted') throw Error('El permiso de notificaciones ya no está concedido.');
    closeNotification(e.key);
    const n=new Notification(test?'KanBell · Prueba':e.name,{body:test?'Si ves este aviso desde otro programa, la prueba funciona.':`Hora: ${e.time}. Pulsa para posponer o descartar.`,tag:'kanbell-'+e.key,icon:new URL('bell.svg',location.href).href,silent:!c.sound,requireInteraction:c.popup==='persistent'});
    live.set(e.key,n);
    n.onclick=()=>{window.focus();if(!test){const card=document.getElementById('card-'+e.key);card?.scrollIntoView({block:'center'});card?.focus();}n.close();};
    n.onerror=()=>message('Windows o el navegador no han mostrado el aviso. Comprueba permisos, No molestar y la configuración de notificaciones.',true);
    n.onclose=()=>{if(live.get(e.key)===n)live.delete(e.key);};
    if(c.popup==='temporary')setTimeout(()=>n.close(),8000);
    render();
  }
  function render(){
    if(!config)return;
    const now=Date.now(),today=K.dateKey(new Date());
    const pending=all().filter(e=>['pending','snoozed'].includes(e.status)&&now-e.notifiedAt<86400000);
    const next=[...K.occurrences(config,new Date()).filter(e=>e.at>now),...pending.filter(e=>e.status==='snoozed'&&e.until>now&&config.reminders.some(r=>r.id===e.id&&r.enabled)&&(!config.pausedUntil||today>config.pausedUntil)).map(e=>({...e,at:e.until}))].sort((a,b)=>a.at-b.at)[0];
    $('desktop-next').textContent=active?(next?next.name+' · '+new Date(next.at).toLocaleString('es-ES',{weekday:'long',hour:'2-digit',minute:'2-digit'}):'Sin próximos avisos'):'Avisos detenidos';
    $('desktop-detail').textContent=`${config.reminders.filter(r=>r.enabled).length} horarios activos · Sonido ${config.sound?'activado':'desactivado'} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
    if($('desktop-pending').contains(document.activeElement))return;
    $('desktop-pending').replaceChildren();
    for(const e of pending){
      const card=document.createElement('article');card.id='card-'+e.key;card.tabIndex=-1;card.className='wh-card pending-card';
      card.innerHTML=`<h2>${esc(e.name)}</h2><p>${e.status==='snoozed'?'Pospuesto hasta '+new Date(e.until).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'Recordatorio de las '+esc(e.time)}</p><div class="wh-row"><select class="wh-select" aria-label="Minutos para posponer">${[5,10,15].map(m=>`<option value="${m}">${m} minutos</option>`).join('')}</select><button class="wh-btn postpone">Posponer</button><button class="wh-btn dismiss">Descartar</button>${config.url?`<a href="${esc(K.safeUrl(config.url))}" target="_blank" rel="noopener noreferrer" class="wh-btn">Abrir fichaje</a>`:''}</div>`;
      card.querySelector('.postpone').onclick=()=>act(e,Number(card.querySelector('select').value)).catch(fail);
      card.querySelector('.dismiss').onclick=()=>act(e,0).catch(fail);
      $('desktop-pending').append(card);
    }
  }
  function fail(e){message('No se pudo completar: '+e.message,true);}
  async function tick(){
    if(!active||busy)return;busy=true;
    try{if(Notification.permission!=='granted'){stop(false);throw Error('Activa de nuevo el permiso de notificaciones.');}await runTick();render();}catch(e){fail(e);}finally{busy=false;}
  }
  async function acquire(){
    if(!navigator.locks)return true; // Si no hay Locks API, se recomienda una sola ventana.
    return new Promise((resolve,reject)=>{
      navigator.locks.request('kanbell-windows:'+location.pathname,{ifAvailable:true},async lock=>{
        if(!lock){resolve(false);return;}
        await new Promise(release=>{releaseLock=release;resolve(true);});
      }).catch(reject);
    });
  }
  function controls(){
    $('enable').disabled=!config||active;$('desktop-test').disabled=!active;$('stop').disabled=!config;
  }
  async function enable(){
    // La llamada al permiso se inicia directamente desde el clic de la persona.
    if(!('Notification' in window)||!window.isSecureContext){message('Abre esta página por HTTPS en un navegador de escritorio compatible.',true);return;}
    try{
      const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
      if(permission!=='granted'){message('Permiso no concedido. Permite las notificaciones de este sitio desde el icono junto a su dirección.',true);return;}
      if(active)return;
      if(!await acquire()){message('Ya hay otra ventana de KanBell con avisos activos. Utiliza esa ventana o ciérrala antes de activar esta.',true);return;}
      sessionStorage.setItem(PREFIX+'active','true');active=true;controls();
      message('Avisos de Windows activos. Puedes minimizar esta ventana.');
      runTick=K.scheduler({storage,notify:async(e,c)=>{if(active)show(e,c);}});interval=setInterval(tick,15000);await tick();
    }catch(e){stop(false);fail(e);}
  }
  function stop(clear){
    active=false;clearInterval(interval);clearTimeout(testTimer);interval=null;
    for(const n of live.values())n.close();live.clear();releaseLock?.();releaseLock=null;
    sessionStorage.setItem(PREFIX+'active','false');
    if(clear){for(const key of Object.keys(sessionStorage))if(key.startsWith(PREFIX))sessionStorage.removeItem(key);config=null;$('desktop-pending').replaceChildren();$('desktop-next').textContent='Avisos detenidos y horario borrado';$('desktop-detail').textContent='Vuelve a activarlos desde KanBell en Kanlane.';}
    controls();if(config)render();
  }
  $('enable').onclick=enable;
  $('desktop-test').onclick=()=>{clearTimeout(testTimer);message('Prueba en 5 segundos. Cambia ahora a otro programa.');testTimer=setTimeout(()=>{if(active)try{show({key:'test',name:'Prueba',time:'ahora'},config,true);message('Prueba enviada. Si no la ves, revisa las notificaciones de Windows y No molestar.');}catch(e){fail(e);}},5000);};
  $('stop').onclick=()=>{try{stop(true);message('Avisos detenidos. Se ha borrado el horario de esta ventana.');}catch(e){fail(e);}};
  addEventListener('message',async ev=>{
    if(!opener||ev.source!==opener||!token||ev.data?.channel!=='kanbell.windows'||ev.data.token!==token||ev.data.type!=='schedule')return;
    try{
      config=K.validate(ev.data.config);
      sessionStorage.setItem(PREFIX+'config',JSON.stringify(config));
      // El token no contiene horarios ni datos de cuenta y no se usa como identidad.
      opener.postMessage({channel:'kanbell.windows',type:'received',token},'*');
      controls();render();
      if(active){message('Horario actualizado. Avisos de Windows activos.');await tick();}else message('Horario recibido. Pulsa «Permitir y activar avisos».');
    }catch(e){fail(e);}
  });
  document.addEventListener('visibilitychange',()=>{if(active)tick();});
  addEventListener('pageshow',()=>{if(active)tick();});
  addEventListener('pagehide',()=>{for(const n of live.values())n.close();});
  try{
    config=read('config');if(config){K.validate(config);controls();render();message('Horario recuperado de esta sesión. Pulsa «Permitir y activar avisos».');}
    // Una recarga conserva el horario y las posposiciones, pero requiere reactivar.
    sessionStorage.setItem(PREFIX+'active','false');
    const threshold=new Date();threshold.setDate(threshold.getDate()-14);
    for(const key of Object.keys(sessionStorage))if(key.startsWith(PREFIX+'event.')&&key.slice((PREFIX+'event.').length,(PREFIX+'event.').length+10)<K.dateKey(threshold))sessionStorage.removeItem(key);
  }catch(e){config=null;fail(e);}
  if(opener&&token)opener.postMessage({channel:'kanbell.windows',type:'ready',token},'*');
})();
