/* ИИ СТРАН: оценка угроз, выбор цели войны, союзы, мирные инициативы, военная экономика,
   действия на фронтах (спавн юнитов у линии соприкосновения).
   Работает поверх Sim: Sim.ai() вызывает AI.monthly(), Sim.warAI() — AI.weekly(). */
(function () {
  const U = window.U;
  const AI = {};
  AI.notes = {};   // короткая «цель» страны — показывается в карточке

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // стабильный «характер» пары стран: историческая вражда/дружба
  function pairHash(a, b) {
    const s = a < b ? a + '|' + b : b + '|' + a;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000) / 1000; // 0..1
  }

  AI.hasPact = function (a, b) {
    const A = App.world.states[a];
    return !!(A && A.pacts && A.pacts.indexOf(b) >= 0);
  };

  // отношения: -100 (смертельная вражда) .. +100 (союзники)
  AI.rel = function (a, b) {
    const w = App.world, A = w.states[a], B = w.states[b];
    if (!A || !B || a === b) return 0;
    if (World.war(a, b)) return -100;
    if (A.overlord === b || B.overlord === a) return 85;
    let r = -14 + pairHash(a, b) * 34; // базовый фон -14..+20
    if (A.bloc !== 'neutral' && A.bloc === B.bloc) r += 42;
    else if (A.bloc !== 'neutral' && B.bloc !== 'neutral') r -= 22;
    if (A.ideo === B.ideo) r += 18;
    else if ((A.ideo === 'dem' && B.ideo === 'com') || (A.ideo === 'com' && B.ideo === 'dem')) r -= 26;
    // общий враг сближает
    for (const wid of A.wars) {
      const war = w.wars.find(x => x.id === wid);
      if (!war) continue;
      const mySide = war.sides[0].includes(a) ? war.sides[0] : war.sides[1];
      const otherSide = war.sides[0].includes(a) ? war.sides[1] : war.sides[0];
      if (mySide.includes(b)) r += 30;
      else if (otherSide.includes(b)) r -= 40;
    }
    // страх перед сильным соседом
    const pr = World.power(B) / Math.max(0.5, World.power(A));
    if (pr > 1) r -= clamp((pr - 1) * 6, 0, 22);
    if (AI.hasPact(a, b)) r += 55;
    return clamp(r, -100, 100);
  };

  // насколько стране угрожают соседи: 0..1.6
  AI.threat = function (st) {
    const w = App.world;
    let t = 0;
    const nbs = World.neighbors(st.id);
    for (const id of nbs) {
      const o = w.states[id];
      if (!o || !o.alive) continue;
      const rel = AI.rel(st.id, id);
      if (rel >= 0) continue;
      const ratio = World.power(o) / Math.max(0.6, World.power(st));
      t = Math.max(t, ratio * (-rel / 100) * 0.85);
    }
    return clamp(t, 0, 1.6);
  };

  // насколько страна чувствует себя сильной: 0..1
  AI.confidence = function (st) {
    const w = App.world;
    const mine = World.power(st);
    let maxN = 0;
    for (const id of World.neighbors(st.id)) {
      const o = w.states[id];
      if (o && o.alive) maxN = Math.max(maxN, World.power(o));
    }
    return clamp(mine / Math.max(1, maxN), 0, 3);
  };

  // оценка цели: чем больше score — тем желаннее жертва
  AI.scoreTarget = function (st, t) {
    const w = App.world;
    if (!t || !t.alive || t.id === st.id || t.overlord === st.id) return 0;
    if (AI.hasPact(st.id, t.id)) return 0;
    const my = World.power(st), en = World.power(t);
    const ratio = my / Math.max(0.6, en);
    if (ratio < 0.85) return 0; // слабее — не лезем
    const rel = AI.rel(st.id, t.id);
    if (rel > 45) return 0; // друзья/союзники
    let s = Math.min(3.2, ratio);
    s *= rel < 0 ? 1 : 0.25;
    s *= 1 + clamp(t.gdp / Math.max(1, my * 0.8), 0, 1.2) * 0.45;      // богатая жертва
    // жертва под защитой сильного союзника — плохая идея
    let shield = 0;
    for (const id of World.alliesOf(t.id)) {
      const a = w.states[id];
      if (a) shield = Math.max(shield, World.power(a));
    }
    if (shield > my * 1.25) s *= 0.18;
    if (shield > my * 2) s *= 0.2;
    // не ввязываемся, если у нас уже есть война, а мы не побеждаем
    if (st.wars.length) {
      const own = w.wars.filter(x => st.wars.includes(x.id));
      const worst = Math.min.apply(null, own.map(x => {
        const mySide = x.sides[0].includes(st.id) ? 0 : 1;
        return mySide === 0 ? x.prog : -x.prog;
      }));
      s *= worst > 40 ? 1.15 : 0.12;
    }
    return s;
  };

  AI.pickTarget = function (st) {
    const w = App.world;
    const nbs = World.neighbors(st.id);
    let best = null, bestS = 0;
    for (const id of nbs) {
      const o = w.states[id];
      const s = AI.scoreTarget(st, o);
      if (s > bestS) { bestS = s; best = o; }
    }
    // великие державы могут воевать и не с соседями (экспедиции)
    if (!best && st.tier <= 2 && Math.random() < 0.25) {
      const far = w.stateList.filter(o => o && o.alive && o.id !== st.id && o.area > 8000 && World.power(o) < World.power(st) * 0.55);
      if (far.length) {
        const o = U.pick(far);
        const s = AI.scoreTarget(st, o) * 0.45;
        if (s > 0.2) { best = o; bestS = s; }
      }
    }
    return best ? { st: best, score: bestS } : null;
  };

  // ---- еженедельно: войны, мир, фронты ----
  AI.weekly = function () {
    const w = App.world;
    if (!w) return;
    if (App.settings && App.settings.aiWars) AI.warDecisions(w);
    AI.peaceTalks(w);
    AI.fronts(w);
  };

  AI.warDecisions = function (w) {
    if (w.day < 150) return; // даём исторической завязке разыграться
    const pool = w.stateList.filter(s => s.alive && s.area > 1200 && s.aggr > 0.3);
    if (!pool.length) return;
    const n = Math.min(9, Math.max(3, Math.round(pool.length * 0.1)));
    for (let k = 0; k < n; k++) {
      const st = U.pick(pool);
      if (!st || !st.alive) continue;
      if (st.wars.length > 1) continue;
      const pick = AI.pickTarget(st);
      if (!pick) continue;
      let p = 0.032 * st.aggr * Math.min(2.2, pick.score) * (st.ideo === 'dem' ? 0.45 : 1);
      p *= w.wars.length >= 3 ? 0.35 : w.wars.length >= 2 ? 0.6 : 1.2;
      if (w.eraIdx >= 5 && w.wars.length && U.chance(0.5)) p *= 0.5; // в ядерную эру осторожнее
      if (!U.chance(p)) continue;
      const tgt = pick.st;
      World.declareWar(st.id, tgt.id, true);
      const casus = ['ультиматум', 'спорные территории', 'внезапное нападение', '«освободительный поход»', 'пограничный конфликт'][U.rndInt(0, 4)];
      World.addLog('⚔️ Война: ' + st.name + ' → ' + tgt.name + ' (' + casus + ')', 'war');
      st.aggr = clamp(st.aggr - 0.1, 0.08, 1);
      st.warGoal = tgt.id;
      AI.notes[st.id] = 'война: ' + tgt.name;
    }
    // коалиция против гегемона
    if (w.day % 420 < 7 && w.wars.length < 3) AI.coalition(w);
  };

  AI.coalition = function (w) {
    const ranked = World.stateList.filter(s => s.alive).sort((a, b) => World.power(b) - World.power(a));
    const top = ranked[0], second = ranked[1];
    if (!top || !second) return;
    if (World.power(top) < World.power(second) * 1.75) return;
    const foes = World.neighbors(top.id).map(id => w.states[id])
      .filter(o => o && o.alive && !o.wars.length && AI.rel(top.id, o.id) < -35 && World.power(o) * 2.2 > World.power(top));
    if (foes.length < 2) return;
    const minsk = U.pick(foes);
    World.declareWar(minsk.id, top.id, true);
    World.addLog('🛡️ Коалиция во главе с ' + minsk.name + ' выступила против ' + top.name, 'war');
    AI.notes[top.id] = 'против него — коалиция';
  };

  AI.peaceTalks = function (w) {
    for (let i = w.wars.length - 1; i >= 0; i--) {
      const war = w.wars[i];
      const age = w.day - (war.since == null ? w.day : war.since);
      if (age < 150) continue;
      // пока одна из сторон реально побеждает — воевать продолжают
      if (Math.abs(war.prog) > 45 && age < 420) continue;
      if (!U.chance(0.16)) continue;
      const p0 = World.warPower(war.sides[0]), p1 = World.warPower(war.sides[1]);
      const loserSide = p0 < p1 * 0.62 ? 0 : p1 < p0 * 0.62 ? 1 : -1;
      if (loserSide < 0) {
        // истощение: обе стороны устали
        if (age > 365 * 1.6 && U.chance(0.5)) {
          const ids = war.sides[0].concat(war.sides[1]);
          const a = w.states[war.sides[0][0]], b = w.states[war.sides[1][0]];
          World.endWar(war, '🕊️ Мир: ' + (a ? a.name : '?') + ' — ' + (b ? b.name : '?') + ' (' + Math.round(age / 365 * 10) / 10 + ' г. войны)');
        }
        continue;
      }
      const side = war.sides[loserSide].map(id => w.states[id]).filter(Boolean);
      if (!side.length) continue;
      const seeker = side[0];
      const rivalSide = war.sides[1 - loserSide].map(id => w.states[id]).filter(Boolean)[0];
      World.endWar(war, '🕊️ ' + seeker.name + ' просит мира (' + (rivalSide ? rivalSide.name : 'противник') + ') — фронт рухнул');
    }
  };

  // ---- фронты: ИИ ведёт бои юнитами ----
  AI.frontPoint = function (war) {
    const w = App.world;
    const s0 = war.sides[0].map(id => w.states[id]).filter(o => o && o.alive);
    const s1 = war.sides[1].map(id => w.states[id]).filter(o => o && o.alive);
    if (!s0.length || !s1.length) return null;
    let best = null, bestD = 1e12;
    for (const a of s0) {
      const pa = a.capital || a.cen;
      for (const b of s1) {
        const pb = b.capital || b.cen;
        const d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
        if (d < bestD) { bestD = d; best = [pa, pb]; }
      }
    }
    if (!best) return null;
    return { a: best[0], b: best[1], x: (best[0][0] + best[1][0]) / 2, y: (best[0][1] + best[1][1]) / 2 };
  };

  AI.fronts = function (w) {
    if (App.settings && App.settings.aiWars === false) return;
    // общий бюджет юнитов ИИ — чтобы не забивать телефон
    let budgetLeft = 150;
    for (const u of w.units) if (u.ai) budgetLeft--;
    if (budgetLeft <= 0) return;
    for (const war of w.wars) {
      const front = AI.frontPoint(war);
      if (!front) continue;
      // не плодим бесконечно: считаем юнитов каждой стороны
      const count = (ids) => w.units.reduce((n, u) => n + (ids.indexOf(u.owner) >= 0 && u.ai ? 1 : 0), 0);
      for (let side = 0; side < 2; side++) {
        const ids = war.sides[side];
        if (count(ids) > 10) continue;
        const st = w.states[ids[0]];
        if (!st || !st.alive || st.army < 6) continue;
        if (!U.chance(0.35)) continue;
        const from = side === 0 ? front.a : front.b;
        const n = Math.min(budgetLeft, U.rndInt(1, Math.min(3, 1 + Math.floor(st.army / 25))));
        for (let i = 0; i < n; i++) {
          const type = AI.unitFor(st);
          const x = front.x + U.rnd(-160, 160) + (side === 0 ? -60 : 60);
          const y = front.y + U.rnd(-130, 130);
          const u = Units.add(st.id, type, x, y);
          if (u) { u.ai = true; u.hdg = Math.random() * Math.PI * 2; budgetLeft--; }
        }
        st.army = Math.max(0.3, st.army * 0.997);
        void from;
      }
    }
  };

  AI.unitFor = function (st) {
    const r = Math.random();
    if (st.tech > 78 && r < 0.12) return 'jet';
    if (st.tech > 60 && r < 0.3) return 'drone';
    if (st.tech > 35 && r < 0.55) return 'tank';
    if (r < 0.68) return 'art';
    return 'inf';
  };

  // ---- ежемесячно: экономика, мобилизация, союзы ----
  AI.monthly = function () {
    const w = App.world;
    if (!w) return;
    AI.economy(w);
    AI.diplomacy(w);
  };

  AI.economy = function (w) {
    // обрабатываем треть стран за раз (сдвигающееся окно)
    const phase = Math.floor(w.day / 20) % 3;
    const list = w.stateList;
    for (let i = phase; i < list.length; i += 3) {
      const st = list[i];
      if (!st || !st.alive) continue;
      const threat = AI.threat(st);
      const atWar = st.wars.length > 0;
      // мобилизация тянется к цели
      const want = clamp(0.2 + threat * 0.45 + (atWar ? 0.3 : 0) + (st.ideo === 'com' ? 0.06 : 0), 0.1, 1);
      st.mob = clamp(st.mob + (want - st.mob) * 0.25, 0.05, 1);
      if (atWar) {
        // военная экономика: армия за счёт ВВП
        const drain = 0.0025 * (0.5 + st.mob);
        st.army *= 1 + drain;
        st.gdp *= 1 - drain * 0.75;
      } else if (st.stab > 45) {
        // мирное развитие
        st.gdp *= 1 + 0.0016 * (0.4 + st.tech / 150);
        if (st.tech < 90 && st.gdp > 25) st.tech = Math.min(99, st.tech + 0.06 * (0.5 + st.stab / 150));
      }
      // цель для карточки страны
      if (!atWar) {
        const pick = AI.pickTarget(st);
        AI.notes[st.id] = pick && pick.score > 0.9 ? 'цель: ' + pick.st.name
          : threat > 0.45 ? 'опасается соседей' : st.stab < 35 ? 'борется с нестабильностью' : 'развивает экономику';
      }
    }
  };

  AI.diplomacy = function (w) {
    const phase = Math.floor(w.day / 20) % 2;
    const list = w.stateList;
    for (let i = phase; i < list.length; i += 2) {
      const st = list[i];
      if (!st || !st.alive) continue;
      const threat = AI.threat(st);
      if (threat < 0.3) continue;
      // ищем союзника среди дружественных
      const cands = World.neighbors(st.id).map(id => w.states[id])
        .filter(o => o && o.alive && !o.overlord && o.id !== st.id && !AI.hasPact(st.id, o.id))
        .sort((a, b) => AI.rel(st.id, b.id) - AI.rel(st.id, a.id));
      const ally = cands[0];
      if (ally && AI.rel(st.id, ally.id) > 52 && World.power(ally) > World.power(st) * 0.35 && U.chance(0.3)) {
        st.pacts = st.pacts || [];
        ally.pacts = ally.pacts || [];
        if (st.pacts.indexOf(ally.id) < 0) st.pacts.push(ally.id);
        if (ally.pacts.indexOf(st.id) < 0) ally.pacts.push(st.id);
        World.addLog('🤝 ' + st.name + ' и ' + ally.name + ' заключили союз', 'peace');
        AI.notes[st.id] = 'союз: ' + ally.name;
      }
      // рвём союз, если отношения испортились
      if (st.pacts) {
        for (let k = st.pacts.length - 1; k >= 0; k--) {
          const id = st.pacts[k];
          const o = w.states[id];
          if (!o || !o.alive || AI.rel(st.id, id) < -25) {
            st.pacts.splice(k, 1);
            if (o && o.pacts) { const j = o.pacts.indexOf(st.id); if (j >= 0) o.pacts.splice(j, 1); }
            if (o) World.addLog('💔 Разорван союз: ' + st.name + ' — ' + o.name, 'war');
          }
        }
      }
    }
  };

  window.AI = AI;
})();
