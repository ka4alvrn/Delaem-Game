/* Реальные скриншоты приложения в headless Chromium
   использование: STEPS=play,pick:deu W=393 H=852 DPR=3 node shot.js
   требует: npm i @sparticuz/chromium puppeteer-core && ./getlibs.sh
   запуск: LD_LIBRARY_PATH=/tmp/al2023/lib node shot.js */
const puppeteer = require('puppeteer-core');
const chromiumMod = require('@sparticuz/chromium');
const chromium = chromiumMod.default || chromiumMod;
const path = require('path');
const { createServer } = require('./server');

const W = +(process.env.W || 390), H = +(process.env.H || 844), DPR = +(process.env.DPR || 2);
const STEPS = (process.env.STEPS || 'start,play').split(',');

(async () => {
  const server = createServer(path.join(__dirname, '..'));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
    executablePath: await chromium.executablePath(),
    headless: 'shell',
    defaultViewport: { width: W, height: H, deviceScaleFactor: DPR, isMobile: W < 700, hasTouch: true },
  });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' || m.type() === 'log') logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise(r => setTimeout(r, 3500));
  for (const step of STEPS) {
    await page.evaluate((s) => {
      const q = x => document.querySelector(x);
      const tap = (x, y) => {
        const cv = document.getElementById('map');
        const opts = { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true };
        cv.dispatchEvent(new PointerEvent('pointerdown', opts));
        cv.dispatchEvent(new PointerEvent('pointerup', opts));
      };
      const countryXY = (id) => {
        const st = App.world.states[id];
        if (!st) return null;
        return Render.toScreen((st.capital || st.cen)[0], (st.capital || st.cen)[1]);
      };
      const tapCountry = (id) => { const p = countryXY(id); if (p) tap(p[0], p[1]); };
      if (s === 'play') q('#start-play').click();
      if (s === 'help') q('#start-help').click();
      if (s === 'speed20') [...document.querySelectorAll('#speeds .spd')].find(b => b.dataset.speed === '20').click();
      if (s.startsWith('pick:')) tapCountry(s.split(':')[1]);
      if (s.startsWith('pick2:')) { tapCountry(s.split(':')[1]); }
      if (s.startsWith('tool:')) [...document.querySelectorAll('.tool-btn')].find(b => (b.dataset.tool || '') === s.split(':')[1])?.click();
      if (s.startsWith('page:')) [...document.querySelectorAll('.page-btn')].find(b => b.dataset.page === s.split(':')[1])?.click();
      if (s.startsWith('tab:')) { const t = [...document.querySelectorAll('[data-tab]')][+s.split(':')[1]]; if (t) t.click(); }
      if (s.startsWith('act:')) { const t = document.querySelector('[data-act="' + s.split(':')[1] + '"]'); if (t) t.click(); }
      if (s.startsWith('mode:')) { [...document.querySelectorAll('[data-mode]')].find(b => b.dataset.mode === s.split(':')[1])?.click(); }
      if (s.startsWith('scroll:')) { const b = document.querySelector('.panel-body'); if (b) b.scrollTop = +s.split(':')[1]; }
      if (s.startsWith('strike:')) { if (window.Tools) Tools.select(s.split(':')[1]); tap(Render.W / 2, Render.H * 0.42); tap(Render.W / 2 + 40, Render.H * 0.5); }
      if (s.startsWith('select:')) { if (window.Tools) Tools.select(s.split(':')[1]); }
      if (s === 'menu') q('#btn-menu').click();
      if (s === 'maps') q('#btn-maps').click();
      if (s === 'log') q('#btn-log').click();
      if (s === 'close') { if (window.UI) UI.closeCountry(); }
      if (s === 'era') { Sim.setSpeed(20); App.world.day = 365 * 3 - 8; }
      if (s === 'apply') { document.querySelector('[data-a="apply"]')?.click(); }
      if (s.startsWith('eval:')) { try { (0, eval)(s.slice(5)); } catch (e) { throw e; } }
      if (s === 'units') {
        const st = App.world.states[App.sel] || App.world.states.deu || Object.values(App.world.states)[0];
        const c = st.capital || st.cen;
        const types = ['inf', 'tank', 'art', 'drone', 'jet', 'ship', 'sam', 'base', 'nuke'];
        types.forEach((t, i) => Units.add(st.id, t, c[0] + (i % 3 - 1) * 90, c[1] + (Math.floor(i / 3) - 1) * 90));
        Render.focus(c[0], c[1], Math.max(App.cam.z, 3.2));
      }
      if (s === 'scene') {
        const st = App.world.states[App.sel] || Object.values(App.world.states)[0];
        const c = st.capital || st.cen;
        Render.focus(c[0], c[1], 0.5);
        const put = (t, dx, dy) => Units.add(st.id, t, c[0] + dx, c[1] + dy);
        put('tank', 120, 0); put('tank', -110, 70); put('inf', -60, -70); put('inf', 50, 90);
        put('art', -150, -25); put('drone', 20, -130); put('jet', 170, -140); put('sam', 150, 95); put('base', -30, 140);
        placed = 0;
        [[-230, 150], [250, 210], [-260, -160]].forEach((d, i) => {
          const c2 = document.createElement('div'); void c2;
          const city = { id: 900 + i, type: 'city', owner: st.id, x: c[0] + d[0], y: c[1] + d[1], hp: 100, cd: 999 };
          App.world.units.push(city);
        });
      }
      if (s.startsWith('dbg')) {
        const c = App.cam, st = App.world.states.deu;
        console.log(JSON.stringify({ cam: [Math.round(c.x), Math.round(c.y), +c.z.toFixed(2)], min: +Render.minZoom().toFixed(3), berlin: st.capital, cen: st.cen.map(Math.round), pick: (Render.pick(c.x, c.y) || '-'), col: Render.stateColor(st), cols: [...document.querySelectorAll('.c-name')].length }));
      }
      if (s.startsWith('zoom:')) Render.focus(App.cam.x, App.cam.y, +s.split(':')[1]);
      if (s === 'deselect') { App.sel = null; if (window.UI) { UI.closeCountry(); UI.hideTapHint(); } }
    }, step).catch(e => logs.push('EVAL ERR ' + step + ': ' + e.message));
    await new Promise(r => setTimeout(r, step === 'play' ? 3000 : step === 'era' ? 1500 : 800));
    await page.screenshot({ path: `/tmp/shot_${step.replace(/[:]/g, '-')}.png` });
    console.log('снимок:', `/tmp/shot_${step.replace(/[:]/g, '-')}.png`);
  }
  console.log('--- консоль ---');
  console.log(logs.slice(0, 20).join('\n') || '(чисто)');
  await browser.close();
  server.close();
})().catch(e => { console.error('ФАТАЛЬНО', e); process.exit(1); });
