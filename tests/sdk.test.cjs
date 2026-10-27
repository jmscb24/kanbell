/* Comprueba la conexión y la ejecución en segundo plano con el SDK real de Kanlane.
   No simula un navegador ni verifica la presentación visual. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {setImmediate}=require('node:timers/promises');
const sdkRoot=process.env.KANLANE_SDK_ROOT;
test('SDK real: manifiesto, permisos mínimos, mensajes, entrega y recarga', {skip:!sdkRoot},async()=>{
  const db=new Map(),calls=[];
  async function boot(){
    const listeners={},nodes={},intervals=[];
    const fixed=new Date(2026,9,27,8,30).getTime();
    class FixedDate extends Date{constructor(...a){super(...(a.length?a:[fixed]));}static now(){return fixed;}}
    const parent={postMessage(m){
      queueMicrotask(()=>{
        const emit=data=>listeners.message?.({source:parent,data:{wh:1,...data}});
        if(m.type==='hello'){
          assert.deepEqual(Array.from(m.manifest.permissions),['storage','ui:extend']);
          emit({type:'welcome',granted:['storage','ui:extend'],context:{mode:'background',project:{id:'p'},locale:'es',theme:{scheme:'dark',vars:{'--accent-solid':'#ff8800'}}}});return;
        }
        calls.push(m);let value=true;
        if(m.method==='storage.get')value=db.get(m.params.key)??null;
        if(m.method==='storage.keys')value=[...db.keys()];
        if(m.method==='storage.set')db.set(m.params.key,JSON.parse(JSON.stringify(m.params.value)));
        if(m.method==='storage.remove')db.delete(m.params.key);
        if(m.method==='ui.form')value=null; // Descartar explícitamente.
        emit({type:'result',id:m.id,ok:true,value});
      });
    }};
    const document={documentElement:{classList:{add(){}},style:{setProperty(){}},setAttribute(){}},getElementById(id){return nodes[id]??=( {hidden:false,textContent:'',classList:{toggle(){}}} );},addEventListener(){}};
    const context={Date:FixedDate,URL,TextEncoder,Intl,console,setTimeout,clearTimeout,setInterval:fn=>intervals.push(fn),addEventListener:(type,fn)=>listeners[type]=fn,parent,document,navigator:{language:'es'}};
    context.window=context;const ctx=vm.createContext(context);
    for(const f of [path.join(sdkRoot,'workhub-plugin.js'),path.join(__dirname,'../core.js'),path.join(__dirname,'../kanbell.js')])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
    // Dejar completar la cadena de mensajes/promesas, sin esperar relojes reales.
    for(let i=0;i<12;i++)await setImmediate();
    assert.equal(nodes.app.hidden,true);
    assert.ok(intervals.length);
  }
  await boot();
  assert.equal(calls.filter(c=>c.method==='ui.form').length,1);
  assert.equal(db.get('event.2026-10-27.entrada').status,'dismissed');
  assert.ok(calls.some(c=>c.method==='ui.addButton'&&c.params.location==='tasks.toolbar'));
  assert.ok(calls.filter(c=>c.method.startsWith('storage.')).every(c=>c.params.scope==='user'));
  await boot();assert.equal(calls.filter(c=>c.method==='ui.form').length,1);
});
