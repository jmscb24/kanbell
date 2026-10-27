const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const K=require('../core.js');
function harness({permission='default',secure=true,lock=true,session=new Map()}={}){
  let time=new Date(2026,9,27,8,30).getTime(),permissionCalls=0,focus=0;
  class Clock extends Date{constructor(...args){super(...(args.length?args:[time]));}static now(){return time;}}
  const notices=[],listeners={},intervals=[],timers=[],nodes={};
  function node(){const queries={};return {children:[],disabled:false,textContent:'',value:'5',classList:{toggle(){}},replaceChildren(){this.children=[];},append(n){this.children.push(n);},contains(){return false;},querySelector(q){return queries[q]??=(node());},focus(){focus++;},scrollIntoView(){}};}
  class Notification{
    static permission=permission;
    static async requestPermission(){permissionCalls++;Notification.permission=permission==='denied'?'denied':'granted';return Notification.permission;}
    constructor(title,options){this.title=title;this.options=options;notices.push(this);}
    close(){this.closed=true;this.onclose?.();}
  }
  const opener={messages:[],postMessage(m){this.messages.push(m);}};
  const sessionStorage={getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)};
  for(const k of ['getItem','setItem','removeItem'])Object.defineProperty(sessionStorage,k,{enumerable:false});
  const proxy=new Proxy(sessionStorage,{ownKeys:()=>[...session.keys()],getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})});
  const context={URL,URLSearchParams,Intl,Date:Clock,Notification,sessionStorage:proxy,location:{hash:'#kanbell=secret',href:'https://example.com/kanbell/desktop.html',pathname:'/kanbell/desktop.html'},opener,isSecureContext:secure,navigator:{locks:{request:async(name,opts,fn)=>fn(lock?{}:null)}},document:{activeElement:null,getElementById:id=>nodes[id]??=(node()),createElement:()=>node(),addEventListener(){}},addEventListener:(type,fn)=>listeners[type]=fn,setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval(){},setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},clearTimeout(){},focus(){focus++;}};
  context.window=context;
  const ctx=vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../core.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../desktop.js'),'utf8'),ctx);
  const config=K.defaults();
  const send=async({source=opener,token='secret',value=config}={})=>listeners.message({source,data:{channel:'kanbell.windows',type:'schedule',token,config:value}});
  return {nodes,send,opener,notices,intervals,timers,session,advance:ms=>time+=ms,permissionCalls:()=>permissionCalls,focus:()=>focus};
}
test('no pide permiso al cargar y rechaza mensajes de otra ventana o con token incorrecto',async()=>{const h=harness();assert.equal(h.permissionCalls(),0);await h.send({source:{}});assert.equal(h.opener.messages.length,1);await h.send({token:'wrong'});assert.equal(h.opener.messages.length,1);await h.send();assert.equal(h.opener.messages[1].type,'received');assert.equal(h.nodes.enable.disabled,false);});
test('clic de activar: permiso, notificación nativa, silencio, persistencia y foco',async()=>{const h=harness();await h.send();await h.nodes.enable.onclick();assert.equal(h.permissionCalls(),1);assert.equal(h.notices.length,1);assert.equal(h.notices[0].title,'Fichar entrada');assert.equal(h.notices[0].options.silent,true);assert.equal(h.notices[0].options.requireInteraction,true);h.notices[0].onclick();assert.equal(h.focus(),2);await h.intervals[0]();assert.equal(h.notices.length,1);});
test('posponer y descartar el aviso de Windows, sin repetir por sí mismo',async()=>{const h=harness();await h.send();await h.nodes.enable.onclick();let card=h.nodes['desktop-pending'].children[0];card.querySelector('select').value='10';await card.querySelector('.postpone').onclick();h.advance(599999);await h.intervals[0]();assert.equal(h.notices.length,1);h.advance(1);await h.intervals[0]();assert.equal(h.notices.length,2);card=h.nodes['desktop-pending'].children[0];await card.querySelector('.dismiss').onclick();await h.intervals[0]();assert.equal(h.notices.length,2);});
test('configuración temporal y sonido, prueba diferida y borrado de sesión',async()=>{const h=harness();const c=K.defaults();c.popup='temporary';c.sound=true;await h.send({value:c});await h.nodes.enable.onclick();assert.equal(h.notices[0].options.silent,false);assert.equal(h.notices[0].options.requireInteraction,false);assert.ok(h.timers.some(t=>t.delay===8000));h.nodes['desktop-test'].onclick();h.timers.find(t=>t.delay===5000).fn();assert.equal(h.notices[1].title,'KanBell · Prueba');h.nodes.stop.onclick();assert.equal(h.session.size,0);assert.ok(h.notices.every(n=>n.closed));});
test('denegación, contexto inseguro y otra ventana activa impiden activar alarmas',async()=>{for(const options of [{permission:'denied'},{secure:false},{lock:false}]){const h=harness(options);await h.send();await h.nodes.enable.onclick();assert.equal(h.notices.length,0);assert.equal(h.intervals.length,0);}});
test('actualizar horario pausado detiene nuevos disparos',async()=>{const h=harness();await h.send();await h.nodes.enable.onclick();const c=K.defaults();c.pausedUntil=K.dateKey(new Date(2026,9,27));await h.send({value:c});h.advance(5*3600000);await h.intervals[0]();assert.equal(h.notices.length,1);});
