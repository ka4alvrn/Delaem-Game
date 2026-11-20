const fs=require('fs'), sharp=require('sharp');
const [,,era,lon0,lon1,lat0,lat1]=process.argv;
global.window={}; eval(fs.readFileSync('../js/data/map_'+era+'.js','utf8'));
const g=window.ERA_DATA[era];
const px=lon=>lon*100, py=lat=>-1.25*Math.log(Math.tan(Math.PI/4+0.4*lat*Math.PI/180))*(180/Math.PI)*100;
const x0=px(+lon0),x1=px(+lon1),y0=py(+lat1),y1=py(+lat0);
const W=1400, S=W/(x1-x0), H=Math.round((y1-y0)*S);
const T=(x,y)=>[(x-x0)*S,(y-y0)*S];
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#0e2338"/>`;
let k=0; const pal=['#3f6fa8','#c8524f','#4f8a5b','#c9a24f','#6a6a7a','#b05a7a','#4f9a4f','#c95a6a','#8a6a9a','#4f8a9a','#c98a4f','#5a9a6a'];
for(const c of g.countries){
  if(c.b[2]<x0||c.b[0]>x1||c.b[3]<y0||c.b[1]>y1) continue;
  const col=pal[k++%pal.length];
  let d='';
  for(const poly of c.p) for(const r of poly){ d+='M'; for(let i=0;i<r.length;i+=2){const p=T(r[i],r[i+1]); d+=(i?'L':'')+p[0].toFixed(1)+' '+p[1].toFixed(1);} d+='Z';}
  svg+=`<path d="${d}" fill="${col}" stroke="#000" stroke-width="0.6" fill-rule="evenodd"/>`;
  const p=T(c.c[0],c.c[1]);
  if(p[0]>0&&p[0]<W&&p[1]>0&&p[1]<H) svg+=`<text x="${p[0]}" y="${p[1]}" fill="#fff" font-size="9" text-anchor="middle" font-family="sans-serif">${c.n}</text>`;
}
svg+='</svg>';
sharp(Buffer.from(svg)).png().toFile(`/tmp/dbg_${era}_${lon0}_${lat0}.png`).then(()=>console.log('done',`/tmp/dbg_${era}_${lon0}_${lat0}.png`,W,H));
