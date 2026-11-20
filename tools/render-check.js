const fs=require('fs'), sharp=require('sharp');
const W=1800,H=Math.round(1800*26388/36000);
const palette=['#3f6fa8','#c8524f','#4f8a5b','#c9a24f','#6a6a7a','#b05a7a','#4f9a4f','#c95a6a','#8a6a9a','#4f8a9a','#c98a4f','#5a9a6a'];
(async()=>{
for(const y of [1942,1945,1960,1994,2024]){
  global.window={};
  eval(fs.readFileSync('../js/data/map_'+y+'.js','utf8'));
  const g=window.ERA_DATA[y];
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#0e2338"/>`;
  let k=0;
  for(const c of g.countries){
    const col=palette[k++%palette.length];
    let d='';
    for(const poly of c.p) for(const r of poly){ d+='M'; for(let i=0;i<r.length;i+=2) d+=(i?'L':'')+((r[i]+18000)/36000*W).toFixed(1)+' '+((r[i+1]+13194)/26388*H).toFixed(1); d+='Z'; }
    svg+=`<path d="${d}" fill="${col}" stroke="#0b0b0b" stroke-width="0.5" fill-rule="evenodd"/>`;
    svg+=`<circle cx="${(c.c[0]+18000)/36000*W}" cy="${(c.c[1]+13194)/26388*H}" r="2" fill="#fff"/>`;
  }
  svg+='</svg>';
  await sharp(Buffer.from(svg)).png().toFile('/tmp/map'+y+'.png');
  console.log('ok',y,g.countries.length);
}
})();
