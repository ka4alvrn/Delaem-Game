/* Проверка эволюции мира: 30 лет симуляции */
const fs=require('fs'),vm=require('vm'),path=require('path');
global.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},setTransform(){},fill(){},getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})})}),getElementById:()=>({}),querySelector:()=>({classList:{add(){},remove(){},toggle(){},contains(){return false}},appendChild(){},style:{},dataset:{},addEventListener(){},querySelectorAll:()=>[],innerHTML:"",remove(){}}),querySelectorAll:()=>[],addEventListener(){},head:{appendChild(){}}};
global.window=global; global.Path2D=class{moveTo(){}lineTo(){}closePath(){}}; global.addEventListener=()=>{};
global.localStorage={getItem:()=>null,setItem(){}}; global.performance=global.performance||{now:()=>Date.now()};
const root=path.join(__dirname,'..');
for (const f of ['js/data/map_1942.js','js/data/countries.js','js/data/politics.js','js/core.js','js/fx.js','js/render.js','js/world.js','js/sim.js','js/units.js']) vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'));
World.buildStates(1942);
Render.buildCache();
let t0=Date.now();
const years=+process.argv[2]||30;
const startPop=()=>World.stateList.reduce((s,x)=>s+x.pop,0);
for (let y=0;y<years;y++){
  for(let d=0;d<365;d++){ App.world.day++; Sim.economy(1); Sim.wars(); Sim.zones(); if(App.world.day%7===0)Sim.randomEvent(); if(App.world.day%20===0)Sim.ai(); }
  if (y%5===4) {
    const w=App.world;
    const top=World.stateList.slice().sort((a,b)=>b.pop-a.pop).slice(0,4).map(s=>s.name+'('+s.pop.toFixed(0)+')').join(' ');
    console.log(`год ${1942+y+1}: стран ${World.stateList.length}, войн ${w.wars.length}, население ${startPop().toFixed(0)} млн, ядер ${w.stats.nukes}, аннексий ${w.stats.annex} | ${top}`);
  }
}
console.log('событий в логе:', App.world.log.length);
console.log('примеры событий:');
App.world.log.slice(0,12).forEach(e=>console.log('  ', e.date, e.text));
console.log('время симуляции:', ((Date.now()-t0)/1000).toFixed(1)+'s');
const top=World.stateList.slice().sort((a,b)=>World.power(b)-World.power(a)).slice(0,8);
console.log('великие державы:', top.map(s=>s.name+' ['+s.ideo+'/'+s.bloc+']').join(', '));
const w=App.world;
console.log('ВВП мира:', World.stateList.reduce((s,x)=>s+x.gdp,0).toFixed(0), 'млрд');
['usa','sov','chn','ind','deu','jpn'].forEach(id=>{const s=w.states[id]; if(s) console.log(' ',id,'tech',s.tech.toFixed(0),'gdp',s.gdp.toFixed(0),'pop',s.pop.toFixed(0),'army',s.army.toFixed(0),'nukes',s.nukes,'stab',s.stab.toFixed(0));});
console.log('макс tech:', Math.max(...World.stateList.map(s=>s.tech)).toFixed(1), 'стран с tech>74:', World.stateList.filter(s=>s.tech>74).length, 'с gdp>220:', World.stateList.filter(s=>s.gdp>220).length);
console.log('агрессия средняя:', (World.stateList.reduce((a,s)=>a+s.aggr,0)/World.stateList.length).toFixed(2), 'макс:', Math.max(...World.stateList.map(s=>s.aggr)).toFixed(2));
