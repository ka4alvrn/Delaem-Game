// Сборка игровых данных: карты эпох + справочник стран.
const fs = require('fs');
const path = require('path');
const { META, ALIASES, CUSTOM } = require('./registry.js');

const OUT = path.join(__dirname, '..', 'js', 'data');
fs.mkdirSync(OUT, { recursive: true });

const R = Math.PI / 180;
// проекция Миллера, единицы: 1 = 0.01° долготы
const projX = lon => Math.round(lon * 100);
const millerY = lat => -1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * Math.max(-89.5, Math.min(89.5, lat)) * R)) * (180 / Math.PI) * 100;
const YCUT = millerY(-58);          // ниже этой широты сжимаем
const projY = lat => {
  const y = millerY(lat);
  return Math.round(y > YCUT ? YCUT + (y - YCUT) * 0.42 : y);
};

function ringAreaKm2(ring) { // сферическая площадь по контуру (грубо, но ок)
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const lon1 = ring[i][0] * R, lat1 = ring[i][1] * R;
    const lon2 = ring[i + 1][0] * R, lat2 = ring[i + 1][1] * R;
    a += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs(a * 6371 * 6371 / 2);
}

function mute(hex) { // приглушаем насыщенность палитры
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  s = Math.min(1, s * 0.82); const L = Math.min(0.78, l * 0.95 + 0.03);
  const a = s * Math.min(L, 1 - L);
  const f = n => { const k = (n + h / 30) % 12; const c = L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(255 * c).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}

const ERAS = [
  { year: 1942, src: 'h1938.json', label: 'Вторая мировая' },
  { year: 1945, src: 'h1945.json', label: 'Новый порядок' },
  { year: 1960, src: 'h1960.json', label: 'Холодная война' },
  { year: 1994, src: 'h1994.json', label: 'Новый мировой порядок' },
  { year: 2000, src: 'h2000.json', label: 'Глобализация' },
  { year: 2010, src: 'h2010.json', label: 'Многополярность' },
  { year: 2024, src: 'h2024.json', label: 'Современность' },
];

const unmatched = new Set();
const madeIds = new Set();

for (const era of ERAS) {
  const g = JSON.parse(fs.readFileSync(path.join(__dirname, 'simp', era.src)));
  const key = era.year === 2024 ? 'name' : 'NAME';
  const byId = new Map();

  for (const f of g.features) {
    if (!f.geometry) continue;
    let raw = f.properties[key];
    let id = raw ? ALIASES[raw] : null;
    if (!raw) {
      // безымянный крупный полигон в исторических картах — Антарктида
      const geom = f.geometry;
      const rings = geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat();
      const big = rings.some(r => ringAreaKm2(r) > 4000000);
      if (big) id = 'ata';
      else continue;
    }
    if (!id) { unmatched.add(era.year + ':' + raw); continue; }
    if (!META[id] && !CUSTOM[id]) { unmatched.add(era.year + ':NO-META:' + id); continue; }

    let e = byId.get(id);
    if (!e) { e = { id, polys: [], area: 0, bb: [1e9, 1e9, -1e9, -1e9], big: 0 }; byId.set(id, e); }
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) {
      const rings = [];
      let area = 0;
      for (const ring of poly) {
        const km2 = ringAreaKm2(ring);
        if (km2 < 60 && rings.length > 0) continue; // крошечные острова
        const pts = [];
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const [lon, lat] of ring) {
          const x = projX(lon), y = projY(lat);
          if (pts.length >= 2 && pts[pts.length - 2] === x && pts[pts.length - 1] === y) continue;
          pts.push(x, y);
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        if (pts.length < 8) continue;
        rings.push(pts);
        area += km2;
        e.bb[0] = Math.min(e.bb[0], x0); e.bb[1] = Math.min(e.bb[1], y0);
        e.bb[2] = Math.max(e.bb[2], x1); e.bb[3] = Math.max(e.bb[3], y1);
        if (km2 > e.big) { e.big = km2; e.mainRing = pts; }
      }
      if (rings.length) e.polys.push(rings);
      e.area += area;
    }
  }

  // Гренландия в ранних картах склеена с Данией — отделяем
  if (era.year <= 1945 && byId.has('dnk')) {
    const dk = byId.get('dnk');
    const green = [], rest = [];
    for (const poly of dk.polys) {
      const lon = poly[0][0] / 100;
      (lon < -30 ? green : rest).push(poly);
    }
    if (green.length) {
      dk.polys = rest;
      const g = byId.get('grl') || { id: 'grl', polys: [], area: 0, bb: [1e9, 1e9, -1e9, -1e9], big: 0 };
      g.polys = g.polys.concat(green);
      g.area = green.reduce((s2, p) => s2 + p.reduce((k, r) => k + 0, 0), 0);
      byId.set('grl', g);
    }
  }

  const out = [];
  for (const e of byId.values()) {
    madeIds.add(e.id);
    const meta = META[e.id] || CUSTOM[e.id];
    const ring = e.mainRing || e.polys[0][0];
    // центроид главного полигона (шулейс), с откатом на центр bbox
    let a2 = 0, cx = 0, cy = 0;
    for (let i = 0; i < ring.length; i += 2) {
      const j = (i + 2) % ring.length;
      const cr = ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
      a2 += cr; cx += (ring[i] + ring[j]) * cr; cy += (ring[i + 1] + ring[j + 1]) * cr;
    }
    cx = a2 ? cx / (3 * a2) : (e.bb[0] + e.bb[2]) / 2;
    cy = a2 ? cy / (3 * a2) : (e.bb[1] + e.bb[3]) / 2;
    cx = Math.round(cx); cy = Math.round(cy);
    out.push({
      i: e.id,
      n: meta[2],
      f: meta[1] || '',
      c: [cx, cy],
      col: mute(meta[5]),
      b: e.bb.map(Math.round),
      a: Math.round(e.area),
      p: e.polys,
    });
  }
  out.sort((a, b) => b.a - a.a);

  const js = 'window.ERA_DATA=window.ERA_DATA||{};window.ERA_DATA[' + era.year + ']=' +
    JSON.stringify({ year: era.year, label: era.label, countries: out }) + ';';
  fs.writeFileSync(path.join(OUT, 'map_' + era.year + '.js'), js);
  console.log(era.year, out.length, 'стран', (js.length / 1024 | 0) + 'KB', 'вершин', out.reduce((s, c) => s + c.p.reduce((k, p) => k + p.reduce((m, r) => m + r.length / 2, 0), 0), 0));
}

console.log('НЕ НАЙДЕНО:', unmatched.size);
console.log([...unmatched].sort().join('\n'));
console.log('ids:', madeIds.size);

// ---------- справочник стран: население/регион из открытых данных ----------
const norm = s => String(s).toLowerCase().replace(/[^a-z]/g, '');
const popRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'country-json-master/src/country-by-population.json')));
const regRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'country-json-master/src/country-by-region-in-world.json')));
const areaRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'country-json-master/src/country-by-surface-area.json')));
const popBy = {}, regBy = {}, areaBy = {};
for (const p of popRaw) popBy[norm(p.country)] = p.population;
for (const p of regRaw) regBy[norm(p.country)] = p.location;
for (const p of areaRaw) areaBy[norm(p.country)] = p.area;

const FIX = {
  'United States of America': 'United States', 'United Republic of Tanzania': 'Tanzania',
  'Republic of the Congo': 'Congo', 'Democratic Republic of the Congo': 'The Democratic Republic of Congo',
  'Czechia': 'Czech Republic', 'Republic of Serbia': 'Serbia', 'Fiji': 'Fiji Islands', 'The Bahamas': 'Bahamas',
  'Curaçao': 'Netherlands Antilles', 'Saint Martin': 'Netherlands Antilles', 'Sint Maarten': 'Netherlands Antilles',
  'São Tomé and Principe': 'Sao Tome and Principe', 'Federated States of Micronesia': 'Micronesia, Federated States of',
  'Vatican': 'Holy See (Vatican City State)', 'Hong Kong S.A.R.': 'Hong Kong', 'Macao S.A.R': 'Macao',
  'United States Virgin Islands': 'Virgin Islands, U.S.', 'British Virgin Islands': 'Virgin Islands, British',
  'Pitcairn Islands': 'Pitcairn', 'Aland': 'Åland', 'Fiji Islands': 'Fiji Islands', 'Montenegro': 'Montenegro',
  'South Georgia and the Islands': 'South Georgia and the South Sandwich Islands',
  'French Southern and Antarctic Lands': 'French Southern territories', 'Cabo Verde': 'Cabo Verde',
};
const EXTRA = { kosovo: 1.8, somaliland: 3.5, taiwan: 23.5, northerncyprus: 0.33, jersey: 0.1, guernsey: 0.06, isleofman: 0.08, aland: 0.03, birbawil: 0, birawil: 0 };

// современное имя по коду ISO3 (из 2024)
global.window = {};
eval(fs.readFileSync(path.join(OUT, 'map_2024.js'), 'utf8'));
const modernName = {};
for (const c of window.ERA_DATA[2024].countries) if (c.f && c.f !== '') modernName[c.f] = c.n;
// английское имя: сначала по ISO3 из современного набора, затем из старых карт
const modernGeo = JSON.parse(fs.readFileSync(path.join(__dirname, 'simp/h2024.json')));
const enByIso = {};
for (const f of modernGeo.features) if (f.properties['ISO3166-1-Alpha-3'] && f.properties['ISO3166-1-Alpha-3'] !== '-99') enByIso[f.properties['ISO3166-1-Alpha-3']] = f.properties.name;
const nameById = {};
for (const id of madeIds) {
  const meta = META[id] || CUSTOM[id];
  if (meta && enByIso[meta[0]]) nameById[id] = enByIso[meta[0]];
}
for (const [k, v] of Object.entries(ALIASES)) {
  if (nameById[v]) continue;
  const al = ALIASES[k];
  if (/[A-ZА-Я]/.test(al)) continue;
  nameById[v] = k;
}

const countries = {};
for (const id of madeIds) {
  const meta = META[id] || CUSTOM[id];
  if (!meta) continue;
  const en = nameById[id] || '';
  let nm = norm(en);
  const al = FIX[en] || en;
  const key = norm(al);
  let pop = popBy[key] ?? popBy[nm] ?? null;
  let region = regBy[key] ?? regBy[nm] ?? null;
  if (pop == null) pop = EXTRA[nm] != null ? EXTRA[nm] * 1e6 : null;
  countries[id] = {
    i: id, iso3: meta[0], iso2: meta[1], ru: meta[2], tier: meta[3], dev: meta[4], col: meta[5],
    pop: pop == null ? 0 : Math.round(pop / 1000) / 1000,
    reg: region || '',
    area: areaBy[key] || 0,
  };
  if (pop == null) console.log('нет населения:', id, en);
}
fs.writeFileSync(path.join(OUT, 'countries.js'), 'window.COUNTRIES=' + JSON.stringify(countries) + ';');
console.log('стран в справочнике:', Object.keys(countries).length, (fs.statSync(path.join(OUT, 'countries.js')).size / 1024 | 0) + 'KB');
