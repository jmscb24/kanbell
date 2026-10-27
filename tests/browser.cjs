/* Smoke test con el SDK REAL y un anfitrión de protocolo simulado, aislado.
   KANLANE_SDK_ROOT=/ruta/Kanlane/plugins/sdk NODE_PATH=... node tests/browser.cjs */
const {chromium}=require('playwright');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
  if(!process.env.KANLANE_SDK_ROOT) throw Error('Indica KANLANE_SDK_ROOT con la carpeta plugins/sdk del repo de Kanlane.');
  const server=http.createServer(async(req,res)=>{
    try{
      if(req.url==='/host'){
        res.setHeader('Content-Type','text/html');
        res.end(`<!doctype html><html lang="es"><title>Host de prueba</title><body><script>
        window.db={};window.calls=[];window.framesList=[];window.forms=[];
        function frame(mode){const f=document.createElement('iframe');f.name=mode;f.src='/index.html';f.setAttribute('sandbox','allow-scripts allow-forms allow-popups allow-downloads');f.style='width:100%;height:900px;border:0';if(mode==='background') f.style.display='none';document.body.append(f);framesList.push(f);}
        addEventListener('message',ev=>{const m=ev.data,f=framesList.find(f=>f.contentWindow===ev.source);if(!f||m.wh!==1)return;
        const reply=value=>ev.source.postMessage({wh:1,type:'result',id:m.id,ok:true,value},'*');
        if(m.type==='hello'){ev.source.postMessage({wh:1,type:'welcome',granted:m.manifest.permissions,context:{mode:f.name,locale:'es',project:{id:'p1',name:'Personal'},theme:{scheme:'light',vars:{'--accent-solid':'#8b4513'}}}},'*');return;}
        calls.push(m);const p=m.params||{};
        if(m.method==='storage.get') reply(db[p.key]??null);
        else if(m.method==='storage.keys')reply(Object.keys(db));
        else if(m.method==='storage.set'){db[p.key]=p.value;reply(true);for(const other of framesList)if(other!==f)other.contentWindow.postMessage({wh:1,type:'event',name:'storage',data:{key:p.key,scope:'user'}},'*');}
        else if(m.method==='storage.remove'){delete db[p.key];reply(true);}
        else if(m.method==='ui.form')forms.push({spec:p,reply});
        else reply(true);
        });
        frame('panel');
        </script></body></html>`);return;
      }
      const file=path.resolve(root,'.'+req.url.split('?')[0]);if(!file.startsWith(root+path.sep))throw Error();
      res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));
    }catch{res.statusCode=404;res.end('Not found');}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const page=await browser.newPage({viewport:{width:1100,height:1100}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://kanlane.com/plugins/sdk/*',async route=>{const file=path.basename(new URL(route.request().url()).pathname);await route.fulfill({path:path.join(process.env.KANLANE_SDK_ROOT,file),contentType:file.endsWith('.css')?'text/css':'text/javascript'});});
    await page.goto(`http://127.0.0.1:${server.address().port}/host`);
    const panel=page.frame({name:'panel'});await panel.locator('#content').waitFor({state:'visible'});
    assert.equal(await panel.locator('.reminder').count(),2);
    await panel.locator('#add').click();assert.equal(await panel.locator('.reminder').count(),3);
    await panel.locator('.reminder').last().locator('.remove').click();
    await panel.locator('#url').fill('https://example.com/fichaje');await panel.locator('#popup').selectOption('temporary');
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>db.config?.url==='https://example.com/fichaje');
    await panel.locator('#test').click();await page.waitForFunction(()=>calls.some(c=>c.method==='ui.toast'&&c.params.message.includes('Prueba')));
    await panel.locator('#pause-today').click();assert.ok(await panel.locator('#pause').inputValue());await panel.locator('#resume').click();assert.equal(await panel.locator('#pause').inputValue(),'');
    const dl=page.waitForEvent('download');await panel.locator('#export').click();assert.equal((await dl).suggestedFilename(),'kanbell-recordatorios.ics');
    await page.setViewportSize({width:390,height:1000});
    assert.ok(await panel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    // Disparo real del motor en el iframe de segundo plano.
    await page.evaluate(()=>{const d=new Date();db.config.popup='persistent';db.config.reminders=[{id:'test',name:'Fichar prueba',enabled:true,days:[d.getDay()],time:String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}];frame('background');});
    await page.waitForFunction(()=>forms.length===1);
    assert.equal(await page.evaluate(()=>forms[0].spec.title),'Fichar prueba');
    await page.evaluate(()=>forms.shift().reply({minutes:'5'}));
    await page.waitForFunction(()=>Object.values(db).some(v=>v.status==='snoozed'));
    // Acción desde el panel resuelve la misma ocurrencia compartida.
    await panel.locator('.dismiss').waitFor();await panel.locator('.dismiss').click();
    await page.waitForFunction(()=>Object.values(db).some(v=>v.status==='dismissed'));
    assert.deepEqual(errors,[]);
    console.log('OK: SDK real, iframe sandbox, edición, guardado, prueba temporal, pausa, ICS, móvil, popup persistente, posposición y descarte compartidos.');
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
