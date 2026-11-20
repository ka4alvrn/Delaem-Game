/* ЮНИТЫ: движение и бой */
(function () {
  const U = window.U;
  const Units = {};

  const SPEED = { inf: 26, tank: 42, art: 18, drone: 95, jet: 150, ship: 34, sam: 14, base: 0, city: 0, nuke: 0 };

  Units.update = function (dt) {
    const w = App.world;
    if (!w) return;
    const vis = Render.worldVisible();
    for (const u of w.units) {
      const st = w.states[u.owner];
      if (!st || !st.alive) continue;
      if (u.type === 'base' || u.type === 'city' || u.type === 'nuke') continue;
      u.cd = (u.cd || 0) - dt;
      // выбор цели
      if (!u.target || u.retarget <= 0) {
        u.retarget = 2 + Math.random() * 3;
        u.target = Units.findTarget(u, st);
      } else {
        u.retarget -= dt;
      }
      if (u.target) {
        const dx = u.target[0] - u.x, dy = u.target[1] - u.y;
        const d = Math.hypot(dx, dy);
        if (d > 30) {
          const sp = (SPEED[u.type] || 30) * 1.0;
          u.x += dx / d * sp * dt;
          u.y += dy / d * sp * dt;
        }
      }
      // бой
      if (u.cd <= 0) {
        u.cd = 0.8 + Math.random() * 1.2;
        const enemy = Units.enemyNear(u, st);
        if (enemy) Units.fire(u, enemy);
      }
    }
    // чистка мёртвых
    if (w.units.length > 400) w.units.splice(0, w.units.length - 400);
  };

  Units.findTarget = function (u, st) {
    const w = App.world;
    let best = null, bestD = 1e9;
    // вражеские юниты
    for (const e of w.units) {
      if (e.owner === u.owner) continue;
      const es = w.states[e.owner];
      if (!es || !es.alive) continue;
      if (!World.war(u.owner, e.owner)) continue;
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d < bestD && d < 2600) { bestD = d; best = [e.x, e.y]; }
    }
    if (best) return best;
    // вражеская столица
    for (const war of w.wars) {
      if (!war.sides[0].includes(u.owner) && !war.sides[1].includes(u.owner)) continue;
      const mySide = war.sides[0].includes(u.owner) ? war.sides[0] : war.sides[1];
      const foe = (mySide === war.sides[0] ? war.sides[1] : war.sides[0]);
      void mySide;
      for (const id of foe) {
        const es = w.states[id];
        if (!es || !es.alive) continue;
        const p = es.capital || es.cen;
        const d = Math.hypot(p[0] - u.x, p[1] - u.y);
        if (d < bestD) { bestD = d; best = p; }
      }
    }
    if (best) return best;
    // патруль у своих границ
    return [st.cen[0] + U.rnd(-300, 300), st.cen[1] + U.rnd(-200, 200)];
  };

  Units.enemyNear = function (u, st) {
    const w = App.world;
    for (const e of w.units) {
      if (e.owner === u.owner) continue;
      const es = w.states[e.owner];
      if (!es || !es.alive) continue;
      if (!World.war(u.owner, e.owner)) continue;
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d < 420) return { u: e, x: e.x, y: e.y };
    }
    // бьёт по территории врага
    const cur = Render.pick(u.x, u.y);
    if (cur && cur.id !== u.owner && World.war(u.owner, cur.id)) return { state: cur, x: u.x, y: u.y };
    return null;
  };

  Units.fire = function (u, target) {
    const w = App.world;
    const st = w.states[u.owner];
    if (target.u) {
      target.u.hp -= 12 + Math.random() * 20;
      FX.burst(target.x, target.y, { n: 5, power: .4, colors: ['#ffd27a', '#ff6b35'] });
      if (target.u.hp <= 0) {
        const i = w.units.indexOf(target.u);
        if (i >= 0) w.units.splice(i, 1);
        FX.explosion(target.x, target.y, 1);
      }
    } else if (target.state) {
      target.state.army = Math.max(0.2, target.state.army * 0.999);
      target.state.pop = Math.max(0.02, target.state.pop * 0.99997);
      FX.burst(target.x, target.y, { n: 4, power: .35, colors: ['#ffd27a', '#ff6b35'] });
      if (Math.random() < 0.09) FX.ring(target.x, target.y, { r: 80, col: '#ffb066', life: .5 });
    }
    if (st && u.type !== 'ship' && Math.random() < 0.3) {
      FX.burst(u.x, u.y, { n: 2, power: .25, colors: ['#ffe1a0'] });
    }
  };

  Units.add = function (owner, type, x, y) {
    const w = App.world;
    const u = { id: Date.now() % 1e6 + Math.floor(Math.random() * 1000), type, owner, x, y, hp: 100, cd: 1, target: null, retarget: 0 };
    w.units.push(u);
    return u;
  };

  Units.clear = function () { if (App.world) App.world.units = []; };

  window.Units = Units;
})();
