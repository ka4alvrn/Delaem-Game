/* СИМУЛЯЦИЯ: экономика, войны, ИИ, катастрофы, смена эпох */
(function () {
  const U = window.U;

  const Sim = {
    acc: 0, daysPerSec: 4.5, lastEraCheck: -1, paused: false, eraPending: null,
    tickCount: 0,
  };

  Sim.speedFactor = s => (typeof s === 'number' ? s : 1);

  Sim.tick = function (dtMs) {
    const w = App.world;
    if (!w) return;
    const sp = Sim.speedFactor(App.speed);
    if (!sp || Sim.paused) { Sim.acc = 0; return; }
    Sim.acc += dtMs / 1000 * Sim.daysPerSec * sp;
    let steps = Math.floor(Sim.acc);
    Sim.acc -= steps;
    if (steps > 60) steps = 60;
    for (let i = 0; i < steps; i++) Sim.step();
    Sim.tickCount++;
  };

  Sim.step = function () {
    const w = App.world;
    w.day++;
    const mod = w.day % 3;
    if (mod === 0) Sim.economy(3);
    Sim.wars(1);
    Sim.zones(1);
    if (w.day % 7 === 0) Sim.randomEvent();
    if (w.day % 20 === 0) Sim.ai();
    if (w.day % 5 === 0) Sim.checkEra();
    U.emit('day', w.day);
  };

  // ---------- экономика ----------
  Sim.economy = function (days) {
    const w = App.world;
    const y = days / 365;
    for (const st of w.stateList) {
      if (!st.alive) continue;
      const war = st.wars.length > 0;
      const growthBase = ({ 1: 0.038, 2: 0.032, 3: 0.024, 4: 0.016, 5: 0.011 }[st.tier] || 0.018);
      const popRate = ({ 1: 0.010, 2: 0.013, 3: 0.018, 4: 0.023, 5: 0.026 }[st.tier] || 0.018) * Math.max(0.12, (1 - st.pop / 4200));
      st.pop = Math.max(0.02, st.pop * (1 + popRate * y * (0.7 + st.stab / 160) * (war ? 0.72 : 1) - (war ? 0.0006 * y : 0)));
      const gdpRate = growthBase * (0.5 + st.tech / 120) * (0.6 + st.stab / 110) - (war ? 0.012 : 0) - (st.overlord ? 0.004 : 0);
      st.gdp = Math.max(0.05, st.gdp * (1 + gdpRate * y));
      if (war) st.gdp = Math.max(0.05, st.gdp * (1 - 0.008 * y));
      // армия
      const target = st.pop * 1000 * ({ 1: 0.007, 2: 0.006, 3: 0.0045, 4: 0.0035, 5: 0.003 }[st.tier] || 0.004) / (1 + st.pop / 480) * (1 + (war ? 0.9 : 0)) * (st.mob + 0.6);
      st.army += (target - st.army) * Math.min(1, 0.06 * y * 365 / 3);
      st.army = Math.max(0.2, st.army);
      // стабильность
      const base = 46 + (st.tier <= 2 ? 16 : 0) + (st.ideo === 'dem' ? 8 : st.ideo === 'com' ? 2 : 0) + (st.nukes > 0 ? 4 : 0) - (st.overlord ? 14 : 0);
      st.stab += (base - st.stab) * 0.01 * y * 365 / 3 + U.rnd(-0.5, 0.5) * (war ? 2 : 1);
      st.stab = U.clamp(st.stab, 3, 99);
      // технологии
      if (st.tier <= 4 && st.gdp > 20) st.tech = Math.min(99, st.tech + (1.05 + st.gdp / st.pop / 14) * y * (st.tier === 1 ? 1.35 : st.tier === 2 ? 1 : st.tier === 3 ? 0.6 : 0.32));
      // распад при полной нестабильности
      if (st.stab < 8 && U.chance(0.0006 * days)) Sim.revolt(st);
    }
    // глобальные державы качают ядерный арсенал
    if (w.day % 60 === 0) {
      for (const st of w.stateList) {
        if (!st.alive) continue;
        if (st.tech > 62 && st.gdp > 150 && st.nukes > 0 && U.chance(0.3)) st.nukes += U.rndInt(1, 12);
        else if (st.tech > 62 && st.gdp > 150 && st.nukes === 0 && U.chance(0.4)) {
          st.nukes = 1;
          World.addLog('☢️ ' + st.name + ': первая ядерная бомба', 'nuke');
        }
      }
    }
  };

  Sim.revolt = function (st) {
    const w = App.world;
    const ideos = Object.keys(App.pol.IDEOLOGIES).filter(x => x !== st.ideo);
    st.ideo = U.pick(ideos);
    st.stab = 42 + U.rnd(-8, 12);
    st.pop *= 0.97; st.gdp *= 0.94; st.army *= 0.8;
    World.addLog('🔥 Революция в ' + st.name + '. Новая власть: ' + App.pol.IDEOLOGIES[st.ideo].name.toLowerCase(), 'revolt');
    FX.text(st.cen[0], st.cen[1], 'РЕВОЛЮЦИЯ', '#ffd27a');
    FX.burst(st.cen[0], st.cen[1], { n: 20, power: .8, colors: ['#ffb347', '#ff6b35', '#fff'] });
    App.audio && App.audio.play('alarm');
  };

  // ---------- войны ----------
  Sim.wars = function () {
    const w = App.world;
    for (let i = w.wars.length - 1; i >= 0; i--) {
      const war = w.wars[i];
      war.sides[0] = war.sides[0].filter(id => w.states[id] && w.states[id].alive);
      war.sides[1] = war.sides[1].filter(id => w.states[id] && w.states[id].alive);
      if (!war.sides[0].length || !war.sides[1].length) {
        const winnerName = war.sides[0].length ? war.sides[0][0] : war.sides[1].length ? war.sides[1][0] : null;
        const nm = winnerName && w.states[winnerName] ? w.states[winnerName].name : '';
        World.endWar(war, '🕊️ Война завершена. Победа: ' + nm);
        continue;
      }
      const big = Math.max(war.sides[0].length, war.sides[1].length);
      const maxDays = 365 * (2.5 + Math.min(4, big / 5));
      if (w.day - (war.since == null ? w.day : war.since) > maxDays) {
        World.endWar(war, '🕊️ Мир по истощению сторон');
        continue;
      }
      const p0 = World.warPower(war.sides[0]), p1 = World.warPower(war.sides[1]);
      const ratio = p0 / (p0 + p1);
      war.prog = U.clamp(war.prog + (ratio - 0.5) * 1.9 + U.rnd(-0.5, 0.5), -400, 400);
      // истощение
      for (const side of war.sides) for (const id of side) {
        const st = w.states[id];
        if (!st) continue;
        st.army = Math.max(0.3, st.army * 0.9992);
        st.gdp = Math.max(0.05, st.gdp * 0.99985);
        st.stab = U.clamp(st.stab - 0.012, 3, 99);
        const d = st.pop * 0.00002;
        st.pop = Math.max(0.02, st.pop - d);
        st.dead = (st.dead || 0) + d;
        w.stats.deaths += d;
      }
      // бои на карте
      if (U.chance(0.16)) Sim.spawnBattle(war);
      // ядерный удар ИИ
      if (U.chance(0.0012) && w.day > 365 * 12) Sim.aiNuke(war);
      // капитуляция
      const capCount = war.capCount || 0;
      const need = 100 + capCount * 34;
      if (Math.abs(war.prog) >= need) {
        const loseIdx = war.prog > 0 ? 1 : 0;
        const winIdx = 1 - loseIdx;
        const winSide = war.sides[winIdx].map(id => w.states[id]).filter(s => s && s.alive);
        const loseSide = war.sides[loseIdx].map(id => w.states[id]).filter(s => s && s.alive);
        const adjOf = st => World.adj.get(st.id) || new Set();
        // жертва: самый слабый из тех, до кого победители могут дотянуться
        const reachable = loseSide.filter(v => winSide.some(x => adjOf(x).has(v.id)));
        const pool = reachable.length ? reachable : loseSide;
        const v = pool.slice().sort((a, b) => World.power(a) - World.power(b))[0];
        // покоритель: сильнейший сосед жертвы, иначе сильнейший из победителей
        const near = winSide.filter(x => adjOf(x).has(v.id)).sort((a, b) => World.power(b) - World.power(a));
        const winner = near[0] || winSide.slice().sort((a, b) => World.power(b) - World.power(a))[0];
        const canCap = (w.day - (war.lastCap || -9999)) > 60;
        if (v && winner && canCap) {
          const puppet = !near.length || (v.pop > winner.pop * 0.55 && U.chance(0.5));
          World.annex(v.id, winner.id, puppet);
          FX.text(v.cen[0], v.cen[1], puppet ? 'ВАССАЛ' : 'АННЕКСИЯ', puppet ? '#ffd27a' : '#ff6b4a');
          App.audio && App.audio.play('horn');
          war.lastCap = w.day;
          war.capCount = capCount + 1;
        }
        war.prog = war.prog > 0 ? Math.min(60, need * 0.45) : -Math.min(60, need * 0.45);
        war.sides[0] = war.sides[0].filter(id => w.states[id] && w.states[id].alive);
        war.sides[1] = war.sides[1].filter(id => w.states[id] && w.states[id].alive);
        if (!war.sides[0].length || !war.sides[1].length) {
          World.endWar(war, '🕊️ Война завершена');
        }
      }
    }
  };

  Sim.spawnBattle = function (war) {
    const w = App.world;
    const ids = war.sides[0].concat(war.sides[1]).filter(id => w.states[id]);
    if (!ids.length) return;
    const id = U.pick(ids);
    const st = w.states[id];
    const pos = st.capital || st.cen;
    FX.warFront(pos[0] + U.rnd(-260, 260), pos[1] + U.rnd(-180, 180));
  };

  Sim.aiNuke = function (war) {
    const w = App.world;
    const side = U.pick([0, 1].filter(i => war.sides[i].some(id => w.states[id] && w.states[id].nukes > 0)));
    if (side == null) return;
    const st = w.states[U.pick(war.sides[side].filter(id => w.states[id] && w.states[id].nukes > 0))];
    if (!st) return;
    const enemies = war.sides[1 - side].map(id => w.states[id]).filter(Boolean);
    if (!enemies.length) return;
    const tgt = enemies.sort((a, b) => World.power(b) - World.power(a))[0];
    st.nukes--;
    w.stats.nukes++;
    FX.nuke(tgt.capital ? tgt.capital[0] : tgt.cen[0], tgt.capital ? tgt.capital[1] : tgt.cen[1]);
    tgt.pop *= 0.94; tgt.gdp *= 0.9; tgt.army *= 0.85; tgt.stab -= 18;
    World.addLog('☢️ ' + st.name + ' применяет ядерное оружие против ' + tgt.name, 'nuke');
    App.audio && App.audio.play('nuke');
  };

  Sim.statesInRadius = function (x, y, r) { return World.statesInRadius(x, y, r); };

  // ---------- катастрофы ----------
  Sim.zones = function () {
    const w = App.world;
    if (w.day % 4 !== 0) return;
    for (const z of FX.zones.slice(0, 80)) {
      if (z.hitUntil === undefined) z.hitUntil = w.day + (z.type === 'rad' ? 150 : 45);
      if (w.day > z.hitUntil) continue;
      const owner = Render.pick(z.x, z.y);
      const ids = [];
      if (owner) ids.push(owner.id);
      for (const st of w.stateList) {
        if (ids.length >= 4) break;
        if (!st.alive || (owner && st.id === owner.id)) continue;
        const b = st.bb;
        const dx = Math.max(b[0] - z.x, 0, z.x - b[2]);
        const dy = Math.max(b[1] - z.y, 0, z.y - b[3]);
        if (dx * dx + dy * dy < z.r * z.r * 0.35) ids.push(st.id);
      }
      for (const id of ids) {
        const st = w.states[id];
        if (!st || !st.alive) continue;
        if (z.type === 'rad') { st.pop *= 0.9994; st.gdp *= 0.9993; st.stab -= 0.03; }
        else if (z.type === 'fire') { st.pop *= 0.99985; st.gdp *= 0.9998; st.stab -= 0.02; }
        else { st.pop *= 0.9999; st.stab -= 0.015; }
      }
    }
  };

  // ---------- случайные события ----------
  const EVENTS = [
    { t: 'boom', txt: '📈 Экономический бум', fn: st => { st.gdp *= 1.06; st.stab += 3; } },
    { t: 'crisis', txt: '📉 Финансовый кризис', fn: st => { st.gdp *= 0.94; st.stab -= 5; } },
    { t: 'quake', txt: '🌋 Землетрясение', fn: st => { st.pop *= 0.995; st.gdp *= 0.98; }, fx: 'quake' },
    { t: 'flood', txt: '🌊 Наводнение', fn: st => { st.pop *= 0.997; st.gdp *= 0.985; } },
    { t: 'plague', txt: '🦠 Эпидемия', fn: st => { st.pop *= 0.99; st.stab -= 4; }, fx: 'plague' },
    { t: 'strike', txt: '✊ Всеобщая забастовка', fn: st => { st.gdp *= 0.98; st.stab -= 6; } },
    { t: 'reform', txt: '📜 Реформы', fn: st => { st.stab += 6; st.gdp *= 1.02; } },
    { t: 'oil', txt: '🛢️ Крупное месторождение', fn: st => { st.gdp *= 1.04; } },
    { t: 'corrupt', txt: '💼 Коррупционный скандал', fn: st => { st.stab -= 7; st.gdp *= 0.99; } },
    { t: 'science', txt: '🔬 Технологический прорыв', fn: st => { st.tech = Math.min(99, st.tech + 3); st.gdp *= 1.03; } },
    { t: 'army', txt: '🎖️ Военный парад', fn: st => { st.stab += 3; st.army *= 1.03; } },
  ];

  Sim.randomEvent = function () {
    if (!App.settings.events) return;
    if (!U.chance(0.35)) return;
    const w = App.world;
    const st = U.pick(World.stateList.filter(s => s.alive && s.area > 3000));
    if (!st) return;
    const ev = U.pick(EVENTS);
    ev.fn(st);
    World.addLog(ev.txt + ' — ' + st.name, ev.t);
    const pos = st.capital || st.cen;
    FX.text(pos[0], pos[1], ev.txt.split(' ')[0], '#9ad5ff');
    if (ev.fx === 'plague') FX.addZone({ type: 'plague', x: pos[0], y: pos[1], r: 220, life: 60 * 25, max: 60 * 25, owner: st.id });
    if (ev.fx === 'quake') { FX.burst(pos[0], pos[1], { n: 14, power: .7, colors: ['#c9b18a', '#8a7a5a'] }); FX.shakeIt(6); }
  };

  // ---------- ИИ ----------
  Sim.ai = function () {
    if (!App.settings.aiWars) return;
    const w = App.world;
    const cands = World.stateList.filter(s => s.alive && s.aggr > 0.42 && s.wars.length === 0 && s.area > 1500);
    if (!cands.length) return;
    const tries = Math.min(4, cands.length);
    for (let k = 0; k < tries; k++) {
      const st = U.pick(cands);
      if (!st || st.wars.length || !st.alive) continue;
      const nb = World.neighbors(st.id).map(id => w.states[id]).filter(s => s && s.alive && s.bloc !== st.bloc && s.id !== st.overlord);
      if (!nb.length) continue;
      const tgt = U.pick(nb);
      const powerDiff = World.power(st) / (World.power(tgt) + 1);
      let chance = 0.014 * st.aggr * (powerDiff > 1.4 ? 2.2 : powerDiff > 0.9 ? 1 : 0.2) * (w.wars.length >= 2 ? 0.3 : w.wars.length === 1 ? 0.7 : 1.25);
      if (st.ideo === 'dem') chance *= 0.35;
      if (w.year > 0 && w.eraIdx === 2) chance *= 1.2;
      if (U.chance(chance)) {
        World.declareWar(st.id, tgt.id);
        st.aggr = Math.max(0.1, st.aggr - 0.12);
      }
    }
  };

  // ---------- эпохи ----------
  Sim.checkEra = function () {
    const w = App.world;
    const d = U.dayToDate(w.day, w.startYear);
    w.year = d.year;
    if (!App.settings.historical) return;
    const E = App.pol.ERAS;
    const next = E[w.eraIdx + 1];
    if (!next) return;
    if (d.year >= next && Sim.lastEraCheck !== next) {
      Sim.lastEraCheck = next;
      Sim.eraPending = next;
      Sim.prevSpeed = App.speed || 1;
      App.speed = 0;
      U.emit('eraPrompt', next);
    }
  };

  Sim.applyEra = function (year, keepBorders) {
    const w = App.world;
    const d = U.dayToDate(w.day, w.startYear);
    const carry = { units: w.units, extraDay: (d.year - year) * 365 + 0 };
    if (keepBorders) {
      // остаёмся на текущей карте, просто меняем дату/эпоху
      w.eraIdx = World.eraIndex(year);
      w.startYear = d.year;
      w.day = 0;
      Sim.eraPending = null;
      Sim.lastEraCheck = null;
      U.emit('eraChange', year);
      return;
    }
    const oldStates = {};
    for (const [id, st] of Object.entries(w.states)) oldStates[id] = st;
    const units = w.units.slice();
    const log = w.log.slice(0, 40);
    World.buildStates(year);
    const nw = App.world;
    nw.day = 0;
    nw.startYear = year;
    nw.year = year;
    nw.units = units.filter(u => nw.states[u.owner]);
    nw.log = log;
    nw.stats = w.stats;
    nw.timeline = (w.timeline || []).concat([year]);
    World.log = nw.log;
    Sim.eraPending = null;
    Sim.lastEraCheck = null;
    World.addLog('🕰️ Наступает ' + year + ' год. Границы мира перестроены по историческим данным.', 'era');
    U.emit('eraChange', year);
  };

  Sim.setSpeed = function (s) {
    App.speed = s;
    U.emit('speed', s);
  };

  window.Sim = Sim;
})();
