/* Интеграционный тест в jsdom: реальный DOM, фейковый canvas */
const { JSDOM, VirtualConsole } = require('jsdom');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { errors.push('jsdomError: ' + e.message); });
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
vc.on('warn', () => { });
vc.on('log', (...a) => console.log('[browser]', ...a));

const fakeCtx = new Proxy({}, {
  get(t, k) {
    if (k === 'measureText') return () => ({ width: 40 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() { } });
    if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    if (k === 'canvas') return { width: 900, height: 560 };
    return () => { };
  },
  set() { return true; },
});

const { createServer } = require('./server');
const server = createServer(root);

server.listen(0, '127.0.0.1', () => {
const port = server.address().port;
JSDOM.fromURL('http://127.0.0.1:' + port + '/index.html', {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    window.HTMLCanvasElement.prototype.getContext = function () { return fakeCtx; };
    window.Path2D = class { moveTo() { } lineTo() { } closePath() { } arc() { } rect() { } };
    window.AudioContext = class {
      constructor() { this.currentTime = 0; this.sampleRate = 44100; this.destination = {}; this.state = 'running'; }
      createGain() { return { gain: { value: 1, setValueAtTime() { }, exponentialRampToValueAtTime() { } }, connect() { } }; }
      createOscillator() { return { type: '', frequency: { setValueAtTime() { }, exponentialRampToValueAtTime() { } }, connect() { }, start() { }, stop() { } }; }
      createBufferSource() { return { buffer: null, connect() { }, start() { }, stop() { } }; }
      createBiquadFilter() { return { type: '', frequency: {}, Q: {}, connect() { } }; }
      createBuffer(c, len) { return { getChannelData: () => new Float32Array(len) }; }
      resume() { }
    };
    window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
  },
}).then(async dom => {
  const w = dom.window;
  const doc = w.document;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => doc.querySelector(s);
  const check = (cond, msg) => { if (cond) console.log('✓ ' + msg); else { console.log('❌ ' + msg); errors.push(msg); } };

  await sleep(700);
  check(!!w.App && !!w.App.world, 'мир создан при загрузке');
  check($('#start').classList.contains('show'), 'стартовый экран показан');
  check($('#era-cards').children.length === 7, 'карточек эпох: ' + $('#era-cards').children.length);
  check($('#tool-pages').children.length === 5, 'страниц инструментов: ' + $('#tool-pages').children.length);
  check($('#speeds').children.length === 6, 'кнопок скорости: ' + $('#speeds').children.length);

  // выбрать 1960 и начать
  const card1960 = [...$('#era-cards').children].find(c => c.dataset.year === '1960');
  card1960.click();
  check(card1960.classList.contains('on'), 'выбрана эпоха 1960');
  $('#start-play').click();
  await sleep(900);
  check(!$('#start').classList.contains('show'), 'стартовый экран скрыт');
  check(w.App.world.startYear === 1960, 'мир 1960 года: ' + w.App.world.startYear);
  check(w.App.speed === 1, 'скорость ×1');

  // тап по карте
  const canvas = $('#map');
  const ev = (type, x, y) => {
    const e = new w.MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
    e.pointerId = 1;
    canvas.dispatchEvent(e);
  };
  // найдём экранные координаты Франции
  const fra = w.App.world.states.fra;
  const [sx, sy] = w.Render.toScreen(fra.cen[0], fra.cen[1]);
  ev('pointerdown', sx, sy); ev('pointerup', sx, sy);
  await sleep(120);
  check(!$('#country').classList.contains('open') && $('#tap-hint'), 'первое касание — только выделение');
  ev('pointerdown', sx, sy); ev('pointerup', sx, sy);
  await sleep(160);
  check($('#country').classList.contains('open'), 'карточка страны открылась со второго касания');
  check($('#country').innerHTML.includes('Франция'), 'в карточке Франция');

  // вкладки
  const tabs = [...doc.querySelectorAll('[data-tab]')];
  check(tabs.length === 3, 'вкладок карточки: ' + tabs.length);
  tabs[1].click(); tabs[2].click(); tabs[0].click();
  check(true, 'переключение вкладок без ошибок');

  // инструменты: каждый клик по кнопкам тулбара
  const toolBtns = [...doc.querySelectorAll('.tool-btn')];
  check(toolBtns.length > 0, 'кнопок инструментов: ' + toolBtns.length);
  for (const b of toolBtns.slice(0, 6)) b.click();
  await sleep(100);

  // удар по карте
  w.Tools.select('nuke');
  ev('pointerdown', sx + 30, sy + 20); ev('pointerup', sx + 30, sy + 20);
  await sleep(100);
  check(w.FX.counts().zones > 0, 'ядерный удар создал зону');
  check(w.App.world.stats.nukes > 0, 'счётчик ядерных ударов: ' + w.App.world.stats.nukes);

  // спавн юнита
  w.Tools.select('spawn_tank');
  ev('pointerdown', sx + 10, sy + 10); ev('pointerup', sx + 10, sy + 10);
  check(w.App.world.units.length > 0, 'юниты на карте: ' + w.App.world.units.length);

  // меню
  $('#btn-menu').click();
  await sleep(60);
  check($('#modal-root').classList.contains('open'), 'меню открылось');
  const menuItems = [...doc.querySelectorAll('[data-m]')];
  check(menuItems.length >= 6, 'пунктов меню: ' + menuItems.length);
  menuItems.find(b => b.dataset.m === 'settings').click();
  await sleep(60);
  check(doc.querySelectorAll('[data-s]').length === 8, 'переключателей настроек: ' + doc.querySelectorAll('[data-s]').length);
  doc.querySelector('[data-s="sound"]').click();
  w.UI.closeModal();

  // режимы карты
  $('#btn-maps').click();
  await sleep(60);
  const modes = [...doc.querySelectorAll('[data-mode]')];
  check(modes.length === 11, 'режимов карты: ' + modes.length);
  modes[4].click();
  check(w.Render.mode === 'power', 'режим карты переключён: ' + w.Render.mode);
  w.Render.mode = 'political';

  // сохранение/загрузка
  w.UI.doSave('earth_save_1');
  check(!!w.localStorage.getItem('earth_save_1'), 'сохранение записано');
  $('#btn-menu').click(); await sleep(40);
  doc.querySelector('[data-m="load"]').click(); await sleep(40);
  const loadBtns = [...doc.querySelectorAll('[data-key]')];
  check(loadBtns.length === 4, 'слотов загрузки: ' + loadBtns.length);
  loadBtns[1].click();
  await sleep(300);
  check(!!w.App.world && w.App.world.startYear === 1960, 'загрузка сохранения работает');

  // лог и история
  $('#btn-log').click(); await sleep(40);
  check(doc.querySelectorAll('.log-row').length > 0, 'история событий: ' + doc.querySelectorAll('.log-row').length);
  w.UI.closeModal();

  // прокрутка времени вперёд: 2 года на скорости 20
  w.Sim.setSpeed(20);
  const day0 = w.App.world.day;
  for (let i = 0; i < 40; i++) { w.Sim.tick(250); w.Units.update(0.25); w.FX.update(0.25); await sleep(4); }
  check(w.App.world.day > day0, 'время идёт: день ' + w.App.world.day);
  check(w.App.world.log.length > 0, 'события пишутся: ' + w.App.world.log.length);

  // смена эпохи (1994)
  const eraYear = w.App.world.eraYear;
  await w.applyEraAsync(1994, false);
  check(w.App.world.eraYear === 1994, 'эпоха сменилась на ' + w.App.world.eraYear + ' (было ' + eraYear + ')');
  check(w.App.world.stateList.length > 100, 'стран в 1994: ' + w.App.world.stateList.length);

  // финальный рендер
  for (let i = 0; i < 5; i++) w.Render.frame(0.016);

  console.log('\nОшибок:', errors.length);
  errors.slice(0, 14).forEach(e => console.log(' •', e));
  process.exit(errors.length ? 1 : 0);
}).catch(e => { console.error('ФАТАЛЬНО:', e && e.stack || e); process.exit(2); });
});
