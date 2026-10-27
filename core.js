/* KanBell: calendario local y motor comprobable, sin dependencias. */
(function(root){
  'use strict';
  const DAY = 86400000, GRACE = 10 * 60000;
  const defaults = () => ({version:1, sound:false, popup:'persistent', pausedUntil:'', url:'', reminders:[
    {id:'entrada', name:'Fichar entrada', time:'08:30', days:[1,2,3,4,5], enabled:true},
    {id:'salida', name:'Fichar salida', time:'13:30', days:[1,2,3,4,5], enabled:true}
  ]});
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function safeUrl(value){
    if(!value) return '';
    const u = new URL(value);
    if(!['https:','http:'].includes(u.protocol) || u.username || u.password) throw Error('El enlace debe ser http(s), sin credenciales.');
    return u.href;
  }
  function validate(c){
    if(!c || !Array.isArray(c.reminders) || c.reminders.length > 30) throw Error('Puedes tener hasta 30 recordatorios.');
    if(!['persistent','temporary'].includes(c.popup)) throw Error('Modo de aviso no válido.');
    if(c.pausedUntil && !/^\d{4}-\d{2}-\d{2}$/.test(c.pausedUntil)) throw Error('Fecha de pausa no válida.');
    safeUrl(c.url);
    const ids = new Set();
    for(const r of c.reminders){
      if(!/^[a-zA-Z0-9-]{1,50}$/.test(r.id) || ids.has(r.id)) throw Error('Identificador repetido o no válido.');
      ids.add(r.id);
      if(!r.name.trim() || r.name.length>80) throw Error('Cada aviso necesita un nombre de hasta 80 caracteres.');
      if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)) throw Error('Revisa las horas.');
      if(!Array.isArray(r.days) || !r.days.length || r.days.some(d=>!Number.isInteger(d)||d<0||d>6)) throw Error('Selecciona al menos un día por aviso.');
    }
    return c;
  }
  function occurrences(c, now, from=0, count=8){
    const list=[];
    for(let i=from;i<from+count;i++){
      const day = new Date(now); day.setHours(0,0,0,0); day.setDate(day.getDate()+i);
      const key=dateKey(day);
      if(c.pausedUntil && key<=c.pausedUntil) continue;
      for(const r of c.reminders){
        if(!r.enabled || !r.days.includes(day.getDay())) continue;
        const at=new Date(day), [h,m]=r.time.split(':').map(Number); at.setHours(h,m,0,0);
        list.push({key:`event.${key}.${r.id}`, id:r.id, name:r.name, at:at.getTime(), time:r.time});
      }
    }
    return list.sort((a,b)=>a.at-b.at);
  }
  function due(event, record, now){
    if(record?.status==='snoozed') return record.until<=now && now-record.until<DAY;
    if(record) return false;
    return event.at<=now && now-event.at<GRACE;
  }
  const escapeICS = s => String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  const utc = ms => new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  function calendar(c, now=new Date(), days=90){
    validate(c);
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//KanBell//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:KanBell - Fichaje'];
    for(const e of occurrences(c,now,0,days).filter(e=>e.at>=+now)){
      lines.push('BEGIN:VEVENT',`UID:${e.key}@kanbell`,`DTSTAMP:${utc(+now)}`,`DTSTART:${utc(e.at)}`,`DTEND:${utc(e.at+60000)}`,`SUMMARY:${escapeICS(e.name)}`,'TRANSP:TRANSPARENT');
      if(c.url) lines.push(`URL:${escapeICS(safeUrl(c.url))}`);
      lines.push('BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${escapeICS(e.name)}`,'TRIGGER:PT0S','END:VALARM','END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    // RFC 5545: líneas de hasta 75 octetos, sin separar caracteres UTF-8.
    return lines.map(line=>{
      let out='', bytes=0;
      for(const ch of line){ const n=new TextEncoder().encode(ch).length; if(bytes+n>75){out+='\r\n ';bytes=1;} out+=ch;bytes+=n; }
      return out;
    }).join('\r\n')+'\r\n';
  }
  function scheduler({storage,notify,clock=()=>Date.now()}){
    let busy=false;
    return async function tick(){
      if(busy) return; busy=true;
      try{
        const c=validate(await storage.get('config') || defaults()), now=clock();
        // El día anterior permite recuperar una posposición que cruce medianoche.
        for(const e of occurrences(c,new Date(now),-1,2)){
          const record=await storage.get(e.key);
          if(!due(e,record,now)) continue;
          const next={...e,status:'pending',notifiedAt:now};
          // Guardar antes de avisar: la recarga no reproduce avisos ya entregados.
          await storage.set(e.key,next);
          await notify(next,c);
        }
      } finally {busy=false;}
    };
  }
  const api={defaults,dateKey,safeUrl,validate,occurrences,due,calendar,scheduler};
  if(typeof module!=='undefined') module.exports=api;
  else root.KanBell=api;
})(globalThis);
