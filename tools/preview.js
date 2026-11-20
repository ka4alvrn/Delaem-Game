const fs=require('fs'),sharp=require('sharp');
const vm=require('vm');
global.window=global; vm.runInThisContext(fs.readFileSync('../js/data/map_1942.js','utf8'));
vm.runInThisContext(fs.readFileSync('../js/data/politics.js','utf8'));
const era=window.ERA_DATA[1942];
const W=+process.argv[2]||420, H=+process.argv[3]||820, Z=+process.argv[4]||0.062;
const CX=+process.argv[5]||2600, CY=+process.argv[6]||-5200;
const X0=-18000,X1=18000,Y0=-13194,Y1=9151;
const ox=W/2-CX*Z, oy=H/2-CY*Z;
const sx=x=>x*Z+ox, sy=y=>y*Z+oy;
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1a2b"/><stop offset=".5" stop-color="#0d2439"/><stop offset="1" stop-color="#08131f"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#o)"/>`;
// сетка
for(let lon=-180;lon<=180;lon+=30){const x=sx(lon*100);svg+=`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#78b4e6" stroke-opacity=".08"/>`;}
for(let lat=-60;lat<=60;lat+=30){const y=sy(-1.25*Math.log(Math.tan(Math.PI/4+0.4*lat*Math.PI/180))*(180/Math.PI)*100);svg+=`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#78b4e6" stroke-opacity=".08"/>`;}
for(const c of era.countries){
  if(c.b[2]*Z+ox<-50||c.b[0]*Z+ox>W+50||c.b[3]*Z+oy<-50||c.b[1]*Z+oy>H+50) continue;
  let d='';
  for(const poly of c.p) for(const r of poly){ d+='M'; for(let i=0;i<r.length;i+=2) d+=(i?'L':'')+sx(r[i]).toFixed(1)+' '+sy(r[i+1]).toFixed(1); d+='Z';}
  svg+=`<path d="${d}" fill="${c.col}" stroke="${c.col}" stroke-width="1.7" fill-rule="evenodd"/>`;
  svg+=`<path d="${d}" fill="none" stroke="#060c14" stroke-opacity=".55" stroke-width="0.8" fill-rule="evenodd"/>`;
}
// подписи упрощённо
const boxes=[];
const items=era.countries.map(c=>({c, px:(c.a/1.23)*Z*Z})).filter(o=>o.px>620).sort((a,b)=>b.px-a.px);
for(const {c,px} of items){
  const x=sx(c.c[0]), y=sy(c.c[1]);
  if(x<-60||y<-30||x>W+60||y>H+30) continue;
  const fs2=Math.max(8.5,Math.min(20,8.5+15*Z+Math.min(4,Math.sqrt(px)/26)));
  const tw=(c.n.length*fs2*0.58);
  let col=false;
  for(const b of boxes){ if(Math.abs(b[0]-x)<(b[2]+tw)/2 && Math.abs(b[1]-y)<(b[3]+fs2+4)/2){col=true;break;} }
  if(col) continue;
  boxes.push([x,y,tw,fs2+4]);
  svg+=`<text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-size="${fs2.toFixed(1)}" font-weight="700" text-anchor="middle" fill="#e8f1f8" stroke="#030a12" stroke-width="2.6" paint-order="stroke" opacity=".95">${c.n}</text>`;
}
svg+='</svg>';
const out=process.argv[7]||'/tmp/prev.png';
sharp(Buffer.from(svg)).png().toFile(out).then(()=>console.log('ok',out));
