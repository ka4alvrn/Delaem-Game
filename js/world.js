/* МИР: государства, статистика, войны, аннексии, сохранения */
(function () {
  const U = window.U;

  const MILF = {
    usa: 1.5, sov: 1.75, rus: 1.35, chn: 1.45, ind: 1.15, prk: 4.2, kor: 2.6, isr: 3.2,
    pak: 1.4, egy: 1.6, tur: 1.25, vnm: 2.2, cub: 2.4, irn: 1.5, irq: 1.4, sau: 1.3,
    gbr: 1.2, fra: 1.15, deu: 1.25, jpn: 1.1, ita: 1.0, pol: 1.2, ukr: 1.3, grc: 1.3,
    fin: 1.6, swe: 1.1, che: 1.0, mng: 1.5, mmr: 1.6, tha: 1.2, idn: 1.1, bra: 1.0,
    arg: 1.0, col: 1.1, mex: 1.0, nga: 0.9, zaf: 0.9, aus: 0.9, can: 0.85, kaz: 1.0,
    aze: 1.4, arm: 1.8, geo: 1.4, blr: 1.2, srb: 1.5, hrv: 1.1, alb: 1.2, twn: 1.6,
    sau2: 1, lib: 1.2, uk: 1.2, syr: 1.3, jor: 1.2, lbn: 1.1, yem: 1.3, afg: 1.2,
  };

  const BLOC_LETTER = { x: 'axis', a: 'allies', n: 'nato', w: 'warsaw', c: 'csto', e: 'eu', b: 'brics', '0': 'neutral' };
  const IDEO_LETTER = { d: 'dem', a: 'aut', c: 'com', f: 'fas', m: 'mon', i: 'isl', j: 'jun' };

  const World = {
    log: [],
    stateList: [],
    maxLog: 220,
  };

  World.eraIndex = function (year) {
    const E = App.pol.ERAS;
    let i = 0;
    for (let k = 0; k < E.length; k++) if (year >= E[k]) i = k;
    return i;
  };

  World.ideoOf = function (id, eraIdx, st) {
    const P = App.pol;
    const s = P.IDEO_STR[id];
    if (s) {
      const ch = s[Math.min(6, eraIdx)] || '-';
      if (ch !== '-' && IDEO_LETTER[ch]) return IDEO_LETTER[ch];
    }
    const tier = st ? st.tier : 3;
    if (eraIdx <= 1) return tier <= 1 ? 'dem' : 'aut';
    if (eraIdx === 2) return tier <= 1 ? 'dem' : 'aut';
    return tier <= 2 ? 'dem' : 'aut';
  };

  World.blocOf = function (id, eraIdx) {
    const P = App.pol;
    const s = P.BLOC_STR[id];
    if (s) {
      const ch = s[Math.min(6, eraIdx)] || '0';
      if (BLOC_LETTER[ch]) return BLOC_LETTER[ch];
    }
    return 'neutral';
  };

  World.baseStats = function (id, eraIdx, info) {
    const P = App.pol;
    const tier = info.tier || 3, dev = info.dev || 1;
    const reg = info.reg || '';
    const pf = (P.POPF[reg] || [0.35, 0.37, 0.5, 0.78, 0.86, 0.95, 1.03])[eraIdx];
    let pop = P.POP[id] ? P.POP[id][eraIdx] : (info.pop || 0.2) * pf;
    if (!pop || pop <= 0) pop = (info.pop || 0.2) * pf;
    pop = Math.max(0.01, pop);
    const gdppc = P.GDPPC[tier][eraIdx] * dev;
    let gdp = pop * gdppc / 1000; // млрд $
    const tierShare = { 1: 0.007, 2: 0.006, 3: 0.0045, 4: 0.0035, 5: 0.003 }[tier] || 0.004;
    const warMult = eraIdx <= 1 ? 7.5 : eraIdx === 2 ? 1.35 : 1;
    const army = Math.max(0.4, pop * 1000 * tierShare * (MILF[id] || 0.9) * warMult / (1 + pop / 480) * U.rnd(0.85, 1.15));
    const tech = U.clamp(P.TECH[eraIdx] + ({ 1: 14, 2: 7, 3: 0, 4: -13, 5: -24 }[tier] || 0) + U.rnd(-4, 4), 3, 99);
    return {
      pop, gdp: Math.max(0.2, gdp), army, tech,
      nukes: (P.NUKES[id] || [])[eraIdx] || 0,
      stab: U.clamp(52 + (tier <= 2 ? 14 : 0) + U.rnd(-14, 14), 8, 96),
    };
  };

  World.buildStates = function (eraYear) {
    const P = App.pol;
    const eraIdx = World.eraIndex(eraYear);
    const map = window.ERA_DATA[eraYear];
    if (!map) throw new Error('нет данных карты ' + eraYear);
    const w = {
      eraYear, eraIdx, map, day: 0, year: eraYear, startYear: eraYear,
      states: {}, stateList: [], polys: [],
      wars: [], warId: 1, log: [], units: [],
      stats: { nukes: 0, deaths: 0, wars: 0, annex: 0 },
      timeline: [], unity: 0,
    };

    for (const c of map.countries) {
      const info = window.COUNTRIES[c.i];
      if (!info && c.i !== 'ata') continue;
      const inf = info || { tier: 5, dev: 0.1, reg: '', pop: 0.001, col: c.col, ru: c.n, iso2: '' };
      const bs = World.baseStats(c.i, eraIdx, inf);
      const st = {
        id: c.i, name: c.n, iso2: c.f || '', color: c.col || inf.col || '#777',
        tier: inf.tier, dev: inf.dev, reg: inf.reg,
        pop: bs.pop, gdp: bs.gdp, army: bs.army, tech: bs.tech, stab: bs.stab,
        nukes: bs.nukes, ideo: 'aut', bloc: 'neutral', overlord: null,
        polys: [], area: c.a, cen: c.c, bb: c.b.slice(), capital: null,
        alive: true, wars: [], mob: 0.35, aggr: 0.3, warSupport: 50, dead: 0,
      };
      st.ideo = World.ideoOf(c.i, eraIdx, st);
      st.bloc = World.blocOf(c.i, eraIdx);
      const cap = P.CAP[c.i];
      if (cap) {
        const p = U.proj(cap[0], cap[1]);
        st.capital = p;
      }
      st.aggr = U.clamp(0.15 + (st.ideo === 'fas' ? 0.5 : st.ideo === 'com' ? 0.35 : st.ideo === 'aut' ? 0.3 : st.ideo === 'jun' ? 0.4 : 0.1) + (st.tier <= 2 ? 0.1 : 0) + U.rnd(-0.1, 0.15), 0.05, 0.95);
      w.states[st.id] = st;
      // полигоны
      const polys = c.p.map(poly => ({ r: poly, b: World.polyBBox(poly), s: st.id }));
      const pxTotal = polys.reduce((s2, p) => s2 + p.b[4], 0) || 1;
      for (const obj of polys) { obj.km = c.a * obj.b[4] / pxTotal; w.polys.push(obj); st.polys.push(obj); }
    }

    // оккупации / колонии
    const occ = P.OCC[eraYear] || {};
    for (const [id, master] of Object.entries(occ)) {
      if (!master || !w.states[id] || !w.states[master] || id === master) continue;
      w.states[id].overlord = master;
    }
    // блок наследуется от метрополии
    for (const st of Object.values(w.states)) {
      if (st.overlord && w.states[st.overlord]) st.bloc = w.states[st.overlord].bloc;
    }

    App.world = w;
    World.stateList = Object.values(w.states);
    World.sortStates();
    World.rebuildGeometry();
    World.log = w.log;
    World.initWars();
    Render.buildCache();
    return w;
  };

  World.polyBBox = function (rings) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, a = 0;
    for (const r of rings) {
      for (let i = 0; i < r.length; i += 2) {
        if (r[i] < x0) x0 = r[i]; if (r[i] > x1) x1 = r[i];
        if (r[i + 1] < y0) y0 = r[i + 1]; if (r[i + 1] > y1) y1 = r[i + 1];
      }
      for (let i = 0; i < r.length; i += 2) {
        const j = (i + 2) % r.length;
        a += r[i] * r[j + 1] - r[j] * r[i + 1];
      }
    }
    return [x0, y0, x1, y1, Math.abs(a / 2)];
  };

  World.sortStates = function () {
    World.stateList = Object.values(App.world.states).filter(s => s.alive).sort((a, b) => b.area - a.area);
    App.world.stateList = World.stateList;
  };

  World.rebuildGeometry = function () {
    const w = App.world;
    for (const st of Object.values(w.states)) { st.polys = []; }
    for (const p of w.polys) {
      const st = w.states[p.s];
      if (st) st.polys.push(p);
      else p.s = null;
    }
    for (const st of Object.values(w.states)) {
      if (!st.polys.length) { st.alive = false; st.area = 0; continue; }
      st.alive = true;
      let a = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, big = -1, bc = st.cen;
      for (const p of st.polys) {
        a += p.km || 0;
        if (p.b[0] < x0) x0 = p.b[0]; if (p.b[1] < y0) y0 = p.b[1];
        if (p.b[2] > x1) x1 = p.b[2]; if (p.b[3] > y1) y1 = p.b[3];
        if (p.b[4] > big) { big = p.b[4]; bc = [(p.b[0] + p.b[2]) / 2, (p.b[1] + p.b[3]) / 2]; }
      }
      st.area = a; // км²
      st.bb = [x0, y0, x1, y1];
      st.cen = bc;
    }
    World.sortStates();
    World.computeAdjacency();
    Render.minimapDirty = true;
  };

  // ---- геометрия: соседство и радиус ----
  World.computeAdjacency = function () {
    const w = App.world;
    const CELL = 90;
    const buckets = new Map();
    const key = (cx, cy) => cx * 100000 + cy;
    const pts = [];
    for (const st of Object.values(w.states)) {
      if (!st.alive) continue;
      let budget = 620;
      for (const poly of st.polys) {
        for (const r of poly.r) {
          for (let i = 0; i < r.length && budget > 0; i += 2) {
            const x = r[i], y = r[i + 1];
            pts.push([x, y, st.id]); budget--;
            const j = (i + 2) % r.length;
            const x2 = r[j], y2 = r[j + 1];
            const len = Math.hypot(x2 - x, y2 - y);
            const n = Math.min(6, Math.floor(len / 45));
            for (let k = 1; k <= n && budget > 0; k++) {
              pts.push([x + (x2 - x) * k / (n + 1), y + (y2 - y) * k / (n + 1), st.id]); budget--;
            }
          }
        }
      }
    }
    for (const [x, y, id] of pts) {
      const k = key(Math.floor(x / CELL), Math.floor(y / CELL));
      let arr = buckets.get(k);
      if (!arr) { arr = []; buckets.set(k, arr); }
      arr.push([x, y, id]);
    }
    const adj = new Map();
    const link = (a, b) => {
      if (a === b) return;
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b); adj.get(b).add(a);
    };
    for (const [x, y, id] of pts) {
      const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const arr = buckets.get(key(cx + dx, cy + dy));
        if (!arr) continue;
        for (const p of arr) if (p[2] !== id) link(id, p[2]);
      }
    }
    World.adj = adj;
    Render.adj = adj;
    return adj;
  };

  World.statesInRadius = function (x, y, r) {
    const w = App.world;
    const out = [];
    for (const st of w.stateList) {
      const b = st.bb;
      const dx = Math.max(b[0] - x, 0, x - b[2]);
      const dy = Math.max(b[1] - y, 0, y - b[3]);
      if (dx * dx + dy * dy > r * r) continue;
      out.push(st.id);
    }
    return out;
  };

  // ---- войны ----
  World.war = function (a, b) {
    const w = App.world;
    for (const war of w.wars) {
      const [s1, s2] = war.sides;
      if ((s1.includes(a) && s2.includes(b)) || (s2.includes(a) && s1.includes(b))) return war;
    }
    return null;
  };

  World.declareWar = function (a, b, silent) {
    const w = App.world;
    if (a === b || !w.states[a] || !w.states[b]) return null;
    if (World.war(a, b)) return null;
    const A = w.states[a], B = w.states[b];
    const alliesA = World.alliesOf(a), alliesB = World.alliesOf(b);
    const war = {
      id: w.warId++, sides: [[a, ...alliesA.filter(x => x !== b)], [b, ...alliesB.filter(x => x !== a)]],
      since: w.day, prog: 0, name: null,
    };
    w.wars.push(war);
    w.stats.wars++;
    World.syncWarFlags();
    if (!silent) World.addLog('⚔️ ' + A.name + ' объявляет войну ' + B.name, 'war');
    U.emit('war', war);
    return war;
  };

  World.alliesOf = function (id) {
    const w = App.world;
    const st = w.states[id];
    if (!st) return [];
    const out = [];
    // явные союзы (пакты) работают и для нейтральных
    for (const pid of (st.pacts || [])) {
      const o = w.states[pid];
      if (o && o.alive && o.id !== id && !o.wars.length) out.push(pid);
    }
    if (st.bloc === 'neutral') return out.slice(0, 3);
    for (const o of Object.values(w.states)) {
      if (!o.alive || o.id === id || o.overlord || o.bloc !== st.bloc) continue;
      if (out.indexOf(o.id) >= 0) continue;
      if (o.wars.length) continue; // уже воюет — не ввязывается
      if ((World.adj.get(id) || new Set()).has(o.id) || o.area > 60000) out.push(o.id);
    }
    out.sort((a, b) => World.power(w.states[b]) - World.power(w.states[a]));
    return out.slice(0, 3);
  };

  World.syncWarFlags = function () {
    const w = App.world;
    for (const st of Object.values(w.states)) st.wars = [];
    for (const war of w.wars) {
      for (const side of war.sides) for (const id of side) {
        const st = w.states[id];
        if (st && !st.wars.includes(war.id)) st.wars.push(war.id);
      }
    }
  };

  World.warPower = function (ids) {
    const w = App.world;
    let p = 0;
    for (const id of ids) {
      const st = w.states[id];
      if (!st || !st.alive) continue;
      p += st.army * 1.1 * (0.55 + st.tech / 110) * (0.65 + st.stab / 160) + st.gdp * 0.85 + st.nukes * 35 + 8;
    }
    return Math.max(1, p);
  };

  World.endWar = function (war, reason) {
    const w = App.world;
    const i = w.wars.indexOf(war);
    if (i >= 0) w.wars.splice(i, 1);
    World.syncWarFlags();
    if (reason) World.addLog(reason, 'peace');
    U.emit('peace', war);
  };

  World.initWars = function () {
    const w = App.world;
    w.wars = [];
    if (w.eraYear === 1942) {
      const axis = [], allies = [];
      for (const st of Object.values(w.states)) {
        if (st.overlord) continue;
        if (st.bloc === 'axis') axis.push(st.id);
        else if (st.bloc === 'allies') allies.push(st.id);
      }
      if (axis.length && allies.length) {
        const war = { id: w.warId++, sides: [axis, allies], since: 0, prog: -12, name: 'Вторая мировая война' };
        w.wars.push(war);
        w.stats.wars++;
        World.addLog('🌍 Идёт Вторая мировая война: Ось против Коалиции', 'war', true);
      }
    }
    World.syncWarFlags();
  };

  // ---- территория ----
  World.annex = function (victimId, winnerId, puppet) {
    const w = App.world;
    const v = w.states[victimId], win = w.states[winnerId];
    if (!v || !win || !v.alive || !win.alive || v === win) return false;
    if (puppet) {
      v.overlord = winnerId;
      v.bloc = win.bloc;
      v.ideo = win.ideo;
      v.stab = Math.min(v.stab, 30);
      v.army *= 0.35;
      World.addLog('🏳️ ' + v.name + ' становится вассалом ' + win.name, 'annex');
      World.syncWarFlags();
      return true;
    }
    for (const p of v.polys) p.s = winnerId;
    win.pop += v.pop * 0.92;
    win.gdp += v.gdp * 0.75;
    win.army += v.army * 0.05;
    win.nukes += v.nukes;
    win.stab = Math.max(10, win.stab - 2);
    v.polys = [];
    v.alive = false;
    v.pop = 0; v.gdp = 0; v.army = 0;
    w.stats.annex++;
    World.addLog(puppet ? ('🏴 ' + v.name + ' → ' + win.name + ' (вассал)') : ('🏴 ' + v.name + ' → ' + win.name + ' (аннексия)'), 'annex');
    World.rebuildGeometry();
    if (App.sel === victimId) { App.sel = winnerId; U.emit('select', winnerId); }
    U.emit('annex', { victim: victimId, winner: winnerId });
    return true;
  };

  World.addLog = function (text, type, silent) {
    const w = App.world;
    if (!w) return;
    const d = U.dayToDate(w.day, w.startYear);
    const entry = { day: w.day, date: d.day + '.' + (d.month + 1) + '.' + d.year, text, type: type || 'info' };
    w.log.unshift(entry);
    if (w.log.length > World.maxLog) w.log.pop();
    if (!silent) U.emit('log', entry);
  };

  World.power = function (st) {
    return st.army * 1.2 * (0.55 + st.tech / 110) + st.gdp * 0.95 + st.nukes * 45 + st.pop * 0.06;
  };

  World.ranked = function (n) {
    return World.stateList.slice().sort((a, b) => World.power(b) - World.power(a)).slice(0, n);
  };

  World.byId = id => App.world.states[id];

  World.neighbors = function (id) {
    const set = Render.adj.get(id);
    if (!set) return [];
    return [...set].filter(x => App.world.states[x] && App.world.states[x].alive);
  };

  World.sameOwner = function (a, b) {
    const A = App.world.states[a], B = App.world.states[b];
    if (!A || !B) return false;
    if (A.overlord === b || B.overlord === a) return true;
    return A.id === B.id;
  };

  // ---- сохранения ----
  World.serialize = function () {
    const w = App.world;
    const states = {};
    for (const st of Object.values(w.states)) {
      if (!st.alive) continue;
      states[st.id] = [st.pop, st.gdp, st.army, st.tech, st.stab, st.nukes, st.ideo, st.bloc, st.overlord, st.name, st.mob, st.pacts || []];
    }
    return {
      v: 2, eraYear: w.eraYear, day: w.day, startYear: w.startYear,
      states, owner: w.polys.map(p => p.s), wars: w.wars,
      log: w.log.slice(0, 80), units: w.units, stats: w.stats,
      settings: { ...App.settings }, cam: { ...App.cam },
    };
  };

  World.deserialize = function (data) {
    World.buildStates(data.eraYear);
    const w = App.world;
    w.day = data.day;
    w.startYear = data.startYear || data.eraYear;
    const alive = new Set(Object.keys(data.states));
    for (const st of Object.values(w.states)) if (!alive.has(st.id)) st.alive = false;
    for (const [id, a] of Object.entries(data.states)) {
      const st = w.states[id];
      if (!st) continue;
      [st.pop, st.gdp, st.army, st.tech, st.stab, st.nukes, st.ideo, st.bloc, st.overlord, st.name] = a;
      if (a[10] != null) st.mob = a[10];
      if (a[11]) st.pacts = a[11];
      st.alive = true;
    }
    if (data.owner) {
      for (let i = 0; i < w.polys.length && i < data.owner.length; i++) {
        if (data.owner[i] && w.states[data.owner[i]]) w.polys[i].s = data.owner[i];
      }
    }
    w.wars = data.wars || [];
    w.warId = 1 + w.wars.reduce((m, x) => Math.max(m, x.id || 0), 0);
    w.log = data.log || [];
    w.units = (data.units || []).filter(u => w.states[u.owner]);
    w.stats = data.stats || w.stats;
    World.rebuildGeometry();
    World.syncWarFlags();
    if (data.settings) Object.assign(App.settings, data.settings);
    if (data.cam) Object.assign(App.cam, data.cam);
    World.sortStates();
    return w;
  };

  window.World = World;
})();
