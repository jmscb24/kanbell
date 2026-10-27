/* DOM real con linkedom y SDK real; no sustituye un navegador.
   npm install --no-save linkedom
   KANLANE_SDK_ROOT=... node --test tests/panel.test.cjs */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {setImmediate}=require('node:timers/promises');
let parseHTML;try{({parseHTML}=require('linkedom'));}catch{}
const sdkRoot=process.env.KANLANE_SDK_ROOT;
async function boot({legacy=false,missing=null}={}){
  const root=path.join(__dirname,'..');
  const {document,HTMLSelectElement}=parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8'));
  // linkedom no implementa el setter de value de select como un navegador.
  Object.defineProperty(HTMLSelectElement.prototype,'value',{configurable:true,get(){return this._value??this.options[0]?.value??'';},set(v){this._value=String(v);}});
  if(legacy){document.getElementById('windows').remove();document.getElementById('windows-status').remove();}
  if(missing)document.getElementById(missing).remove();
  const listeners={},db=new Map();
  const parent={postMessage(m){queueMicrotask(()=>{
    const emit=data=>(listeners.message||[]).forEach(fn=>fn({source:parent,data:{wh:1,...data}}));
    if(m.type==='hello'){emit({type:'welcome',granted:m.manifest.permissions,context:{mode:'panel',locale:'es',theme:{scheme:'light'},project:{id:'p'}}});return;}
    let value=true;const p=m.params;
    if(m.method==='storage.get')value=db.get(p.key)||null;
    if(m.method==='storage.keys')value=[...db.keys()];
    if(m.method==='storage.set')db.set(p.key,p.value);
    emit({type:'result',id:m.id,ok:true,value});
  });}};
  const ctx={document,console,URL,Date,Intl,TextEncoder,location:{href:'https://example.com/index.html'},navigator:{language:'es'},parent,setTimeout,clearTimeout,setInterval(){},addEventListener:(n,f)=>(listeners[n]||=[]).push(f)};ctx.window=ctx;vm.createContext(ctx);
  for(const f of [path.join(sdkRoot,'workhub-plugin.js'),path.join(root,'core.js'),path.join(root,'kanbell.js')])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
  for(let i=0;i<10;i++)await setImmediate();
  return {document,db};
}
const options={skip:!parseHTML||!sdkRoot};
test('panel: monta filas y botones con el HTML completo',options,async()=>{const {document,db}=await boot();assert.equal(document.querySelectorAll('.reminder').length,2);assert.equal(typeof document.getElementById('windows').onclick,'function');assert.doesNotMatch(document.getElementById('status').textContent,/No se pudo/);await document.getElementById('settings').onsubmit({preventDefault(){}});assert.equal(db.get('config').reminders[0].time,'08:30');});
test('regresión onclick: recupera controles Windows de un HTML antiguo',options,async()=>{const {document}=await boot({legacy:true});assert.equal(document.querySelectorAll('#windows').length,1);assert.equal(typeof document.getElementById('windows').onclick,'function');assert.equal(document.querySelectorAll('.reminder').length,2);assert.doesNotMatch(document.getElementById('status').textContent,/No se pudo/);});
test('panel incompleto: identifica el elemento ausente en lugar de onclick null',options,async()=>{const {document}=await boot({missing:'add'});assert.match(document.getElementById('status').textContent,/#add/);assert.doesNotMatch(document.getElementById('status').textContent,/Cannot set/);});
