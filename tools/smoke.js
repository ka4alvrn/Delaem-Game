/* Дымовой тест: грубая эмуляция DOM/Canvas для проверки рантайма */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class FakeClassList {
  constructor() { this.s = new Set(); }
  add(...c) { c.forEach(x => this.s.add(x)); }
  remove(...c) { c.forEach(x => this.s.delete(x)); }
  toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; }
  contains(c) { return this.s.has(c); }
}
class FakeEl {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.style = {}; this.dataset = {};
    this.classList = new FakeClassList();
    this.children = [];
    this._html = '';
    this.textContent = '';
    this.width = 300; this.height = 150;
    this.clientWidth = 300; this.clientHeight = 150;
    this.disabled = false;
    this.onclick = null;
  }
  set innerHTML(v) { this._html = v; this.children = []; }
  get innerHTML() { return this._html; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  prepend(c) { c.parentNode = this; this.children.unshift(c); return c; }
  remove() { const p = this.parentNode; if (p) { const i = p.children.indexOf(this); if (i >= 0) p.children.splice(i, 1); } }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); }
  addEventListener() { }
  removeEventListener() { }
  setPointerCapture() { }
  releasePointerCapture() { }
  getBoundingClientRect() { return { left: 0, top: 0, width: 300, height: 150 }; }
  getContext() { return fakeCtx; }
  querySelector() { return new FakeEl('div'); }
  querySelectorAll() { return []; }
  focus() { }
  closest() { return null; }
  get firstChild() { return this.children[0]; }
  get lastChild() { return this.children[this.children.length - 1]; }
}

const calls = {};
const fakeCtx = new Proxy({}, {
  get(t, k) {
    if (k === 'measureText') return () => ({ width: 42 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() { } });
    if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    if (k === 'canvas') return { width: 900, height: 560 };
    if (typeof k === 'string' && /^(fill|stroke|text|draw|set|save|restore|begin|move|line|arc|rect|close|clip|translate|scale|rotate|clear|put|measure)/i.test(k)) {
      calls[k] = (calls[k] || 0) + 1;
      return () => { };
    }
    return () => { };
  },
  set() { return true; },
});

const elements = {};
function getEl(sel) {
  if (!elements[sel]) elements[sel] = new FakeEl(sel === '#map' || sel === '#minimap' ? 'canvas' : 'div');
  return elements[sel];
}

const documentStub = {
  createElement: tag => new FakeEl(tag),
  getElementById: id => getEl('#' + id),
  querySelector: sel => getEl(sel),
  querySelectorAll: sel => [],
  addEventListener() { },
  head: { appendChild() { } },
  body: new FakeEl('body'),
  hidden: false,
};

global.document = documentStub;
global.window = global;
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.devicePixelRatio = 2;
global.innerWidth = 420;
global.innerHeight = 820;
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => { };
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = v; },
  removeItem(k) { delete this._d[k]; },
};
global.Path2D = class { moveTo() { } lineTo() { } closePath() { } arc() { } rect() { } };
global.performance = global.performance || { now: () => Date.now() };
global.AudioContext = class {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.destination = {}; }
  createGain() { return { gain: { value: 1, setValueAtTime() { }, exponentialRampToValueAtTime() { } }, connect() { } }; }
  createOscillator() { return { type: '', frequency: { setValueAtTime() { }, exponentialRampToValueAtTime() { } }, connect() { }, start() { }, stop() { } }; }
  createBufferSource() { return { buffer: null, connect() { }, start() { }, stop() { } }; }
  createBiquadFilter() { return { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect() { } }; }
  createBuffer(c, len) { return { getChannelData: () => new Float32Array(len) }; }
  resume() { }
};

const files = ['js/data/map_1942.js', 'js/data/map_1945.js', 'js/data/map_1960.js', 'js/data/map_1994.js', 'js/data/map_2000.js', 'js/data/map_2010.js', 'js/data/map_2024.js', 'js/data/countries.js', 'js/data/politics.js', 'js/core.js', 'js/fx.js',
  'js/render.js', 'js/world.js', 'js/sim.js', 'js/units.js', 'js/tools.js', 'js/audio.js', 'js/ui.js', 'js/main.js'];

const root = path.join(__dirname, '..');
for (const f of files) {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  try { vm.runInThisContext(code, { filename: f }); }
  catch (e) { console.error('❌ ОШИБКА в', f, '\n', e.stack.split('\n').slice(0, 5).join('\n')); process.exit(1); }
}
console.log('✓ все файлы загружены');

function run(name, fn) {
  try { fn(); console.log('✓', name); }
  catch (e) { console.error('❌', name, '\n', e.stack.split('\n').slice(0, 6).join('\n')); process.exitCode = 1; }
}

run('инициализация рендера и UI', () => {
  Render.init(getEl('#map'));
  UI.init();
  UI.buildStart();
});

run('buildStates 1942', () => {
  U.emit('noop');
  const w = World.buildStates(1942);
  if (!w.stateList.length) throw new Error('нет стран');
  console.log('   стран:', w.stateList.length, 'полигонов:', w.polys.length,
    'войн:', w.wars.length, 'население мира:', (w.stateList.reduce((s, x) => s + x.pop, 0)).toFixed(0), 'млн');
  const top = w.stateList.slice().sort((a, b) => b.pop - a.pop).slice(0, 6).map(s => s.name + ' ' + s.pop.toFixed(0));
  console.log('   топ по населению:', top.join(', '));
  console.log('   ВВП мира:', w.stateList.reduce((s, x) => s + x.gdp, 0).toFixed(0), 'млрд');
});

run('эпохи загружаются и строятся', () => {
  for (const y of [1945, 1960, 1994, 2000, 2010, 2024]) {
    if (!window.ERA_DATA[y]) { console.log('   (нет файла карты', y + ')'); continue; }
    const w = World.buildStates(y);
    console.log('   ', y, w.stateList.length, 'стран', (w.stateList.reduce((s, x) => s + x.pop, 0)).toFixed(0), 'млн');
  }
});

run('возврат к 1942', () => World.buildStates(1942));

run('кадр рендера', () => {
  Render.buildCache();
  for (let i = 0; i < 3; i++) Render.frame(0.016);
});

run('симуляция 3 года', () => {
  Sim.setSpeed(20);
  for (let i = 0; i < 300; i++) { Sim.tick(100); Units.update(0.1); FX.update(0.1); }
  console.log('   день:', App.world.day, 'войн:', App.world.wars.length, 'событий:', App.world.log.length);
});

run('инструменты', () => {
  for (const id of Object.keys(Tools.defs)) {
    const d = Tools.defs[id];
    if (d.kind === 'panel' || d.kind === 'action') continue;
    Tools.select(id);
    const st = App.world.stateList[3];
    Tools.apply(st.cen[0], st.cen[1]);
  }
  console.log('   применено инструментов:', Object.keys(Tools.defs).length);
});

run('действия по стране', () => {
  const st = App.world.stateList[0];
  const acts = ['stab', 'gdp', 'pop', 'army', 'tech', 'nuke', 'civilwar', 'release', 'peace_state', 'color', 'rename'];
  for (const a of acts) Tools.stateAction(st.id, a, a === 'stab' ? 5 : a === 'gdp' ? 0.1 : a === 'nuke' ? 1 : a === 'tech' ? 1 : a === 'color' ? '#fff' : a === 'rename' ? 'Тест' : 1);
  Tools.stateAction(st.id, 'ideo', 'dem');
  const nb = World.neighbors(st.id);
  console.log('   соседей у', st.name + ':', nb.length);
  if (nb.length) { Tools.stateAction(st.id, 'war', nb[0]); }
});

run('интерфейс: карточка', () => {
  UI.startGame && null;
  Render.buildCache();
  UI.openCountry(App.world.stateList[1].id);
  for (const tab of ['overview', 'rule', 'war']) { UI.panelTab = tab; UI.renderCountry(); }
});

run('война и аннексия', () => {
  const w = App.world;
  const a = w.stateList.find(s => s.id === 'deu') || w.stateList[0];
  const nb = World.neighbors(a.id);
  if (nb.length) {
    const b = w.states[nb[0]];
    World.declareWar(a.id, b.id);
    console.log('   война:', a.name, 'vs', b.name, '| сторон:', w.wars[w.wars.length - 1].sides.map(s => s.length));
    World.annex(b.id, a.id, false);
    console.log('   после аннексии стран:', World.stateList.length);
  }
});

run('сохранение/загрузка', () => {
  const dump = JSON.parse(JSON.stringify(World.serialize()));
  World.deserialize(dump);
  if (!App.world.stateList.length) throw new Error('пустой мир после загрузки');
  console.log('   восстановлено стран:', App.world.stateList.length, 'день:', App.world.day);
});

run('все режимы карты', () => {
  for (const m of ['political', 'ideo', 'bloc', 'war', 'power', 'gdp', 'pop', 'tech', 'stab', 'nuke', 'nature']) {
    Render.mode = m;
    Render.frame(0.016);
    Render.drawMini(getEl('#minimap'));
  }
  Render.mode = 'political';
});

run('миникарта/пикинг', () => {
  const st = App.world.stateList[0];
  const p = st.polys[0].b;
  const picked = Render.pick((p[0] + p[2]) / 2, (p[1] + p[3]) / 2);
  console.log('   пикинг в центре', st.name, '->', picked && picked.name);
  const sink = Render.pick(st.cen[0], st.cen[1]);
  console.log('   pick:', sink && sink.id, 'вода?', Render.isWater(st.cen[0], st.cen[1]), 'соседей:', (World.adj.get(st.id) || new Set()).size);
});

console.log('\nГотово. Ошибок:', process.exitCode ? 'есть' : 'нет');
setTimeout(() => process.exit(process.exitCode || 0), 50);
