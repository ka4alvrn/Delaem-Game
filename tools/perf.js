const puppeteer=require('puppeteer-core');const chromiumMod=require('@sparticuz/chromium');const chromium=chromiumMod.default||chromiumMod;
const path=require('path');const {createServer}=require('./server');
(async()=>{
 const server=createServer(path.join(__dirname,'..'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port;
 const b=await puppeteer.launch({args:[...chromium.args,'--no-sandbox','--disable-gpu'],executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}});
 const p=await b.newPage();
 await p.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'domcontentloaded'});
 await new Promise(r=>setTimeout(r,3000));
 await p.evaluate(()=>document.querySelector('#start-play').click());
 await new Promise(r=>setTimeout(r,2000));
 for (const sp of [1,20]) {
   const res=await p.evaluate(async (speed)=>{
     Sim.setSpeed(speed);
     const t0=performance.now(); let frames=0; const d0=App.world.day;
     await new Promise(res=>{ const f=()=>{ frames++; if(performance.now()-t0<2500) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
     const dt=(performance.now()-t0)/1000;
     return {fps:(frames/dt).toFixed(1), daysPerSec:((App.world.day-d0)/dt).toFixed(1), states:App.world.stateList.length, fx:FX.counts()};
   }, sp);
   console.log('скорость x'+sp+':', JSON.stringify(res));
 }
 const mem=await p.evaluate(()=>performance.memory? Math.round(performance.memory.usedJSHeapSize/1048576)+'МБ':'n/a');
 console.log('память JS:', mem);
 await b.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
