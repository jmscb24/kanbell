(function(){
  'use strict';
  const K=KanBell, $=id=>document.getElementById(id);
  const MANIFEST={id:'com.jmscb24.kanbell',name:'KanBell',version:'1.1.0',description:'Recordatorios personales de fichaje con horarios semanales, posposición y calendario exportable.',author:'Javier Marina',icon:'bell',color:34,permissions:['storage','ui:extend']};
  const days=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  let wh, store, config, audio, checking=false, lastLabel='', localSaved=0;
  let desktopWindow=null, desktopToken=null;
  const desktopOrigin=new URL(location.href).origin;
  function syncDesktop(){if(desktopWindow&&!desktopWindow.closed&&desktopToken)desktopWindow.postMessage({channel:'kanbell.windows',type:'schedule',token:desktopToken,config},desktopOrigin);}
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
  function fail(e){status('No se pudo completar: '+e.message,true);if(wh?.isBackground) wh.ui.toast('No se pudo completar: '+e.message,{type:'error'}).catch(()=>{});}
  async function tone(){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) throw Error('Este navegador no ofrece audio.');
    audio=audio||new AC();
    if(audio.state!=='running'){
      // No dejar una promesa pendiente si autoplay impide reanudar.
      await Promise.race([audio.resume(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Audio bloqueado: requiere interacción con esta página.')),700))]);
    }
    if(audio.state!=='running') throw Error('Audio bloqueado por el navegador.');
    for(const offset of [0,.22]){
      const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+offset;
      osc.frequency.value=offset?880:660;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.12,t+.02);gain.gain.exponentialRampToValueAtTime(.001,t+.18);
      osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.2);
    }
  }
  async function records(){
    const keys=(await store.keys()).filter(k=>k.startsWith('event.'));
    return (await Promise.all(keys.map(k=>store.get(k)))).filter(Boolean);
  }
  async function resolve(e,minutes){
    const current=await store.get(e.key);
    if(!current) return;
    await store.set(e.key,{...current,status:minutes?'snoozed':'dismissed',until:minutes?Date.now()+minutes*60000:null});
  }
  async function persistent(e,test=false){
    const v=await wh.ui.form({title:e.name,subtitle:'KanBell · '+e.time,intro:'Es hora de fichar. Descartar este aviso no realiza el fichaje.',submit:'Posponer',cancel:'Descartar',fields:[{key:'minutes',type:'select',label:'Volver a avisar dentro de',value:'5',options:[5,10,15].map(m=>({value:String(m),label:m+' minutos'}))}]});
    if(!test) await resolve(e,v?Number(v.minutes):0);
    else if(v) await wh.ui.toast('Prueba terminada. No se ha programado ningún aviso.',{type:'important'});
  }
  async function notify(e,c){
    if(c.sound) tone().catch(()=>wh.ui.toast('Sonido bloqueado por el navegador. El aviso visual sigue activo.',{type:'important'}));
    if(c.popup==='persistent') persistent(e).catch(fail);
    else await wh.ui.toast(e.name+' · '+e.time+' · Abre KanBell para posponer o descartar.',{type:'important'});
  }
  function collect(){
    return K.validate({version:1,sound:$('sound').checked,popup:$('popup').value,url:K.safeUrl($('url').value.trim()),pausedUntil:$('pause').value,reminders:[...$('reminders').children].map(row=>({id:row.dataset.id,name:row.querySelector('.name').value.trim(),time:row.querySelector('.time').value,enabled:row.querySelector('.enabled').checked,days:[...row.querySelectorAll('.day input:checked')].map(x=>Number(x.value))}))});
  }
  function row(r){
    const el=document.createElement('div');el.className='wh-card reminder';el.dataset.id=r.id;
    el.innerHTML=`<div class="reminder-top"><input class="enabled" type="checkbox" aria-label="Activar aviso" ${r.enabled?'checked':''}><input class="wh-input name" aria-label="Nombre del aviso" maxlength="80" required value="${esc(r.name)}"><input class="wh-input time" aria-label="Hora del aviso" type="time" required value="${esc(r.time)}"><button type="button" class="wh-btn is-danger remove">Eliminar</button></div><div class="days">${[1,2,3,4,5,6,0].map(d=>`<label class="day"><input type="checkbox" value="${d}" ${r.days.includes(d)?'checked':''}>${days[d]}</label>`).join('')}</div>`;
    el.querySelector('.remove').onclick=()=>{el.remove();status('Cambios sin guardar.');};
    $('reminders').append(el);
  }
  function fill(){
    $('reminders').replaceChildren();config.reminders.forEach(row);
    $('sound').checked=config.sound;$('popup').value=config.popup;$('url').value=config.url;$('pause').value=config.pausedUntil;
  }
  async function summary(){
    if(checking) return; checking=true;
    try{
      const now=Date.now(), all=await records(), today=K.dateKey(new Date());
      const next=[...K.occurrences(config,new Date()).filter(e=>e.at>now),...all.filter(e=>e.status==='snoozed'&&e.until>now&&config.reminders.some(r=>r.id===e.id&&r.enabled)&&(!config.pausedUntil||today>config.pausedUntil)).map(e=>({...e,at:e.until}))].sort((a,b)=>a.at-b.at)[0];
      const pending=all.filter(e=>['pending','snoozed'].includes(e.status)&&now-e.notifiedAt<86400000).sort((a,b)=>b.at-a.at);
      if(wh.isBackground){
        const label=pending.some(e=>e.status==='pending')?'KanBell · Aviso pendiente':next?'KanBell · '+new Date(next.at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'KanBell · Sin avisos';
        if(label!==lastLabel){await wh.ui.addButton({id:'open',location:'tasks.toolbar',label,icon:'bell',tooltip:next?next.name:'Abrir recordatorios'});lastLabel=label;}
        return;
      }
      $('portal').hidden=!config.url;if(config.url) $('portal').href=K.safeUrl(config.url);
      $('next').textContent=next?next.name+' · '+new Date(next.at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'Sin avisos programados';
      $('countdown').textContent=next?new Date(next.at).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})+' · Dentro de '+Math.max(1,Math.ceil((next.at-now)/60000))+' min':config.pausedUntil&&today<=config.pausedUntil?'En pausa hasta '+config.pausedUntil+' inclusive.':'Añade o activa un horario.';
      // No reemplazar controles si se está usando el selector de posposición.
      if($('pending').contains(document.activeElement)) return;
      $('pending-section').hidden=!pending.length;$('pending').replaceChildren();
      for(const e of pending){
        const card=document.createElement('article');card.className='wh-card pending-card';
        card.innerHTML=`<h3>${esc(e.name)}</h3><p>${e.status==='snoozed'?'Pospuesto hasta '+new Date(e.until).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'Aviso de las '+esc(e.time)}</p><div class="wh-row"><select class="wh-select" aria-label="Minutos para posponer">${[5,10,15].map(m=>`<option value="${m}">${m} minutos</option>`).join('')}</select><button class="wh-btn postpone">Posponer</button><button class="wh-btn dismiss">Descartar</button>${config.url?`<a class="wh-btn" href="${esc(K.safeUrl(config.url))}" target="_blank" rel="noopener noreferrer">Abrir fichaje</a>`:''}</div>`;
        const action=async minutes=>{try{await resolve(e,minutes);checking=false;await summary();}catch(err){fail(err);}};
        card.querySelector('.postpone').onclick=()=>action(Number(card.querySelector('select').value));
        card.querySelector('.dismiss').onclick=()=>action(0);$('pending').append(card);
      }
    } finally{checking=false;}
  }
  async function prune(){
    const threshold=new Date();threshold.setDate(threshold.getDate()-14);
    const stale=(await store.keys()).filter(k=>k.startsWith('event.')&&k.slice(6,16)<K.dateKey(threshold));
    // Mantener margen bajo el límite de 60 escrituras/minuto del anfitrión.
    for(const key of stale.slice(0,10)) await store.remove(key);
  }
  async function panel(){
    window.addEventListener('message',ev=>{
      if(!desktopWindow||ev.source!==desktopWindow||ev.origin!==desktopOrigin||ev.data?.channel!=='kanbell.windows'||ev.data.token!==desktopToken)return;
      if(ev.data.type==='ready')syncDesktop();
      if(ev.data.type==='received')$('windows-status').textContent='Horario enviado. En la ventana de avisos, pulsa «Permitir y activar avisos» y acepta el permiso.';
    });
    $('windows').onclick=()=>{
      try{
        // Abrir desde el clic, antes de esperar operaciones de almacenamiento.
        if(desktopWindow&&!desktopWindow.closed){syncDesktop();desktopWindow.focus();return;}
        desktopToken=crypto.randomUUID();
        const target=new URL('desktop.html',location.href);target.hash='kanbell='+desktopToken;
        desktopWindow=window.open(target.href,'_blank','popup,width=620,height=820');
        $('windows-status').textContent=desktopWindow?'Abriendo avisos de Windows…':'El navegador ha bloqueado la ventana. Permite ventanas emergentes para Kanlane y vuelve a pulsar.';
      }catch(e){fail(e);}
    };
    $('content').hidden=false;$('zone').textContent=Intl.DateTimeFormat().resolvedOptions().timeZone;fill();
    $('settings').addEventListener('input',()=>status('Cambios sin guardar.'));
    $('settings').onsubmit=async ev=>{ev.preventDefault();try{const draft=collect();await store.set('config',draft);config=draft;syncDesktop();localSaved=Date.now();status('Guardado en tu cuenta.');await summary();}catch(e){fail(e);}};
    $('add').onclick=()=>{if($('reminders').children.length>=30) return status('Máximo 30 avisos.',true);row({id:'r-'+crypto.randomUUID(),name:'Nuevo recordatorio',time:'08:30',days:[1,2,3,4,5],enabled:true});status('Cambios sin guardar.');};
    $('pause-today').onclick=()=>{$('pause').value=K.dateKey(new Date());status('Pulsa Guardar cambios para pausar hoy.');};
    $('resume').onclick=()=>{$('pause').value='';status('Pulsa Guardar cambios para reanudar.');};
    $('test').onclick=async()=>{try{const draft=collect();if(draft.sound) await tone();if(draft.popup==='persistent') await persistent({name:'Prueba de recordatorio',time:'ahora'},true);else await wh.ui.toast('Prueba de KanBell: aviso temporal.',{type:'important'});status('Prueba completada. El audio en segundo plano depende del navegador.');}catch(e){fail(e);}};
    $('export').onclick=()=>{try{const blob=new Blob([K.calendar(collect())],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kanbell-recordatorios.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('Calendario exportado con los valores visibles. Importa el archivo en tu calendario y comprueba sus alarmas.');}catch(e){fail(e);}};
    await summary();setInterval(()=>summary().catch(fail),15000);
  }
  WorkhubPlugin.connect(MANIFEST).then(async client=>{
    wh=client;store=wh.storage.user;
    config=K.validate(await store.get('config')||K.defaults());
    status('Horarios personales · No registra fichajes.');
    if(!wh.has('storage')||!wh.has('ui:extend')) throw Error('Aprueba los permisos storage y ui:extend para activar KanBell.');
    wh.on('storage',async ev=>{try{
      if(ev.scope!=='user') return;
      if(ev.key==='config'){
        config=K.validate(await store.get('config')||K.defaults());
        syncDesktop();
        if(!wh.isBackground&&Date.now()-localSaved>1000) status('El horario se ha actualizado en otra instancia. Reabre el panel para cargarlo; tus cambios visibles se conservan.');
      }
      await summary();
    }catch(e){fail(e);}});
    if(wh.isBackground){
      $('app').hidden=true;
      await wh.ui.addButton({id:'open-command',location:'command',label:'Abrir KanBell',icon:'bell'});
      await wh.ui.addButton({id:'open-calendar',location:'calendar.toolbar',label:'KanBell',icon:'bell'});
      wh.on('action',ev=>{if(['open','open-command','open-calendar'].includes(ev.id))wh.ui.openPanel().catch(fail);});
      const tick=K.scheduler({storage:store,notify});
      const run=()=>tick().then(summary).catch(fail);
      await prune();await run();setInterval(run,15000);
      window.addEventListener('pageshow',run);document.addEventListener('visibilitychange',run);
    }else await panel();
  }).catch(e=>status(e.message==='not-in-workhub'?'Instala este enlace en Kanlane → Plugins → Añadir. Publica la carpeta por HTTPS (por ejemplo, GitHub Pages).':'No se pudo conectar: '+e.message,true));
})();
