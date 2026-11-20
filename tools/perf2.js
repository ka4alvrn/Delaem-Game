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
 const measure=async(label)=>console.log(label, JSON.stringify(await p.evaluate(async()=>{
   const t0=performance.now(); let frames=0;
   await new Promise(res=>{ const f=()=>{ frames++; if(performance.now()-t0<2500) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
   return {fps:+(frames/((performance.now()-t0)/1000)).toFixed(1)};
 })));
 await measure('старт (с городами):');
 await p.evaluate(()=>{ App.settings.towns=false; });
 await measure('без городов:      ');
 await p.evaluate(()=>{ App.settings.towns=true; for(let i=0;i<4000;i++) Sim.step(); });
 await measure('4 тыс. дней, города:');
 await p.evaluate(()=>{ App.settings.towns=false; });
 await measure('4 тыс. дней, без:   ');
 await p.evaluate(()=>{ App.settings.towns=true; });
 console.log('юнитов', await p.evaluate(()=>App.world.units.length), 'стран', await p.evaluate(()=>World.stateList.length));
 await b.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
