/* ИНСТРУМЕНТЫ БОГА */
(function () {
  const U = window.U;

  // ---------- иконки ----------
  const S = (inner, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' + (extra || '') + '>' + inner + '</svg>';
  const ICONS = {
    inspect: S('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>'),
    flag: S('<path d="M5 21V4"/><path d="M5 5h11l-1.5 4L16 13H5"/>'),
    scale: S('<path d="M12 3v18M5 7h14"/><path d="M5 7l-2 5h4zM19 7l-2 5h4z"/>'),
    coin: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6c0 2.4-5 1.4-5 3.8 0 1 1 1.6 2.5 1.6s2.5-.5 2.5-1.5"/>'),
    shield: S('<path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z"/><path d="M9 12l2 2 4-4"/>'),
    nuke: S('<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8V4M9.9 12.9l-4.3 3M14.1 12.9l4.3 3"/><circle cx="12" cy="12" r="8.6" stroke-dasharray="2 3"/>'),
    bomb: S('<circle cx="10.5" cy="14" r="6"/><path d="M15 9.5l2-3M17 6.5l1.5-2M18.5 4.5l2 .5"/>'),
    missile: S('<path d="M14 3c2.5 1.5 4 4 4 7l-7 7-4-4 7-7z"/><path d="M7 17l-3 3M9 13l-4 1 1-4M13 9l1-4 4 1"/>'),
    drone: S('<circle cx="12" cy="12" r="2"/><path d="M10 10 6 6M14 10l4-4M10 14l-4 4M14 14l4 4"/><circle cx="5" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/>'),
    jet: S('<path d="M2 13l20-7-7 20-3-8z"/><path d="M12 18l-3-3"/>'),
    ship: S('<path d="M4 15h16l-2 5H6z"/><path d="M12 15V6l6 4-6 2"/><path d="M2 22h20" stroke-dasharray="1 2"/>'),
    tank: S('<rect x="4" y="12" width="13" height="6" rx="1.5"/><path d="M8 12V9h5v3M13 10.5l7-3"/><circle cx="7" cy="18" r="1.2"/><circle cx="14" cy="18" r="1.2"/>'),
    inf: S('<circle cx="12" cy="6" r="2.4"/><path d="M12 8.5V15M12 10l-4 2M12 10l4 2M12 15l-3 5M12 15l3 5"/>'),
    city: S('<path d="M3 21h18"/><path d="M5 21V10h5v11M10 21V4h6v17M16 21v-7h3v7"/><path d="M12 7h2M12 10h2M7 13h1M7 16h1"/>'),
    base: S('<path d="M12 3l8 4v5c0 4.6-3.4 7.8-8 9-4.6-1.2-8-4.4-8-9V7z"/><path d="M12 8v6M9 11h6"/>'),
    meteor: S('<circle cx="15" cy="9" r="4"/><path d="M11 13 3 21M13 11 6 16M9 8 3 12"/>'),
    wave: S('<path d="M2 16c3 0 3-3 6-3s3 3 6 3 3-3 6-3M2 20c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/><path d="M4 9h4V5H4zM15 9h4V4h-4z"/>'),
    quake: S('<path d="M2 12h4l2-5 3 10 3-8 2 3h6"/>'),
    plague: S('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="4.5" r="2"/><circle cx="5.5" cy="17" r="2"/><circle cx="18.5" cy="17" r="2"/>'),
    fire: S('<path d="M12 3c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2 1-3.5 2.5-5C9 9.5 10 11 11 12c.5-3-1-6 1-9z"/>'),
    tornado: S('<path d="M3 6h18M5 10h14M7 14h10M9 18h6M11 21h2"/>'),
    crown: S('<path d="M4 18h16M4 8l4 4 4-7 4 7 4-4v7H4z"/>'),
    split: S('<path d="M12 3v18"/><path d="M8 6 4 10l4 4M16 6l4 4-4 4" />'),
    sword: S('<path d="M4 20l7-7M14 3l7 7-9 9H6v-6z"/><path d="M3 21l3-3"/>'),
    dove: S('<path d="M3 14c4 0 6-2 8-5 2-3 4-4 7-4-1 4-3 6-6 7 1 3 0 6-3 8-1-3-2-4-4-4z"/>'),
    chain: S('<rect x="3" y="9" width="8" height="6" rx="3"/><rect x="13" y="9" width="8" height="6" rx="3"/><path d="M11 12h2"/>'),
    merge: S('<circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/><path d="M12 8v8"/>'),
    hourglass: S('<path d="M7 3h10M7 21h10M8 3c0 4 8 5 8 9s-8 5-8 9"/>'),
    flask: S('<path d="M9 3h6M10 3v5L5 19a1.5 1.5 0 0 0 1.4 2h11.2a1.5 1.5 0 0 0 1.4-2L14 8V3"/><path d="M7.5 15h9"/>'),
    people: S('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.5a3 3 0 0 1 0 5M18 20c0-2.2-.9-4.2-2.3-5.6"/>'),
    factory: S('<path d="M3 21V9l5 3V9l5 3V9l5 3v9z"/><path d="M7 17h2M13 17h2"/>'),
    drop: S('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
    sparkle: S('<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>'),
    target: S('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
    money: S('<path d="M3 7h18v10H3z"/><circle cx="12" cy="12" r="2.5"/>'),
    cross: S('<path d="M6 6l12 12M18 6 6 18"/>'),
  };

  // ---------- страницы ----------
  const PAGES = [
    { id: 'state', name: 'Гос-во', full: 'Государство', icon: 'flag' },
    { id: 'army', name: 'Армия', icon: 'tank' },
    { id: 'doom', name: 'Разруш.', full: 'Разрушение', icon: 'bomb' },
    { id: 'build', name: 'Создать', full: 'Созидание', icon: 'city' },
    { id: 'world', name: 'Мир', icon: 'sparkle' },
  ];

  const defs = {};
  function T(id, o) { o.id = id; defs[id] = o; return o; }

  // --- осмотр
  T('inspect', { name: 'Осмотр', icon: 'inspect', page: 'state', kind: 'inspect', hint: 'Нажмите на страну, чтобы открыть карточку' });

  // --- государство
  T('ideo', { name: 'Строй', icon: 'scale', page: 'state', kind: 'panel', country: true, hint: 'Сменить строй страны' });
  T('stability', { name: 'Стаб.', icon: 'shield', page: 'state', kind: 'panel', country: true });
  T('economy', { name: 'Эконом', icon: 'coin', page: 'state', kind: 'panel', country: true });
  T('military', { name: 'Армия', icon: 'sword', page: 'state', kind: 'panel', country: true });
  T('diplomacy', { name: 'Дипло', icon: 'dove', page: 'state', kind: 'panel', country: true });
  T('territory', { name: 'Террит', icon: 'merge', page: 'state', kind: 'panel', country: true });

  // --- армия
  T('spawn_inf', { name: 'Пехота', icon: 'inf', page: 'army', kind: 'spawn', unit: 'inf', hint: 'Разместить пехотную дивизию' });
  T('spawn_tank', { name: 'Танки', icon: 'tank', page: 'army', kind: 'spawn', unit: 'tank' });
  T('spawn_art', { name: 'Арта', icon: 'target', page: 'army', kind: 'spawn', unit: 'art' });
  T('spawn_drone', { name: 'Дрон', icon: 'drone', page: 'army', kind: 'spawn', unit: 'drone' });
  T('spawn_jet', { name: 'Авиа', icon: 'jet', page: 'army', kind: 'spawn', unit: 'jet' });
  T('spawn_ship', { name: 'Флот', icon: 'ship', page: 'army', kind: 'spawn', unit: 'ship' });
  T('spawn_sam', { name: 'ПВО', icon: 'target', page: 'army', kind: 'spawn', unit: 'sam' });
  T('spawn_nuke', { name: 'Бомба', icon: 'nuke', page: 'army', kind: 'spawn', unit: 'nuke' });
  T('spawn_base', { name: 'База', icon: 'base', page: 'army', kind: 'spawn', unit: 'base' });

  // --- разрушение
  T('boom', { name: 'Взрыв', icon: 'bomb', page: 'doom', kind: 'strike', power: 1.2, hint: 'Точечный взрыв' });
  T('artstrike', { name: 'Артудар', icon: 'art', page: 'doom', kind: 'strike', mode: 'art' });
  T('airstrike', { name: 'Авиаудар', icon: 'jet', page: 'doom', kind: 'strike', mode: 'air' });
  T('missile', { name: 'Ракета', icon: 'missile', page: 'doom', kind: 'strike', mode: 'missile' });
  T('nuke', { name: 'Ядерка', icon: 'nuke', page: 'doom', kind: 'strike', mode: 'nuke' });
  T('meteor', { name: 'Метеор', icon: 'meteor', page: 'doom', kind: 'strike', mode: 'meteor' });
  T('quake', { name: 'Земля', icon: 'quake', page: 'doom', kind: 'strike', mode: 'quake' });
  T('tsunami', { name: 'Цунами', icon: 'wave', page: 'doom', kind: 'strike', mode: 'tsunami' });
  T('plague', { name: 'Чума', icon: 'plague', page: 'doom', kind: 'strike', mode: 'plague' });
  T('fire', { name: 'Пожар', icon: 'fire', page: 'doom', kind: 'strike', mode: 'fire' });
  T('tornado', { name: 'Торнадо', icon: 'tornado', page: 'doom', kind: 'strike', mode: 'tornado' });

  // --- созидание
  T('city', { name: 'Город', icon: 'city', page: 'build', kind: 'strike', mode: 'city' });
  T('fort', { name: 'Крепость', icon: 'base', page: 'build', kind: 'strike', mode: 'fort' });
  T('factory', { name: 'Завод', icon: 'factory', page: 'build', kind: 'strike', mode: 'factory' });
  T('heal', { name: 'Очистить', icon: 'drop', page: 'build', kind: 'strike', mode: 'heal', hint: 'Убрать пожары, чуму и радиацию' });
  T('boom_econ', { name: 'Достаток', icon: 'money', page: 'build', kind: 'strike', mode: 'prosperity' });

  // --- мир
  T('peace_all', { name: 'Мир всем', icon: 'dove', page: 'world', kind: 'action', act: 'peaceAll' });
  T('nuke_all', { name: 'Апокалипсис', icon: 'nuke', page: 'world', kind: 'action', act: 'nukeAll' });
  T('plague_all', { name: 'Пандемия', icon: 'plague', page: 'world', kind: 'action', act: 'plagueAll' });
  T('golden', { name: 'Золотой век', icon: 'sparkle', page: 'world', kind: 'action', act: 'goldenAge' });
  T('reset', { name: 'Сброс', icon: 'cross', page: 'world', kind: 'action', act: 'resetWorld' });

  // ---------- утилиты урона ----------
  const Tools = {
    pages: PAGES, defs, icons: ICONS,
    active: 'inspect', dragTimer: 0, unitId: 1,

    list(page) { return Object.values(defs).filter(d => d.page === page); },
    get(id) { return defs[id]; },
    select(id) {
      Tools.active = id;
      const d = defs[id];
      App.tool = id;
      U.emit('tool', d);
      if (d && d.hint) UI.toast(d.hint, 'hint');
    },

    ownerAt(wx, wy) {
      const st = Render.pick(wx, wy);
      return st ? st.id : null;
    },
    ownerNear(wx, wy, r) {
      const st = Render.pick(wx, wy);
      if (st) return st;
      const ids = Sim.statesInRadius(wx, wy, r || 220);
      return ids.length ? App.world.states[ids[0]] : null;
    },

    damageArea(wx, wy, rKm, o) {
      o = o || {};
      const w = App.world;
      const ids = Sim.statesInRadius(wx, wy, rKm);
      const out = [];
      for (const id of ids) {
        const st = w.states[id];
        if (!st || !st.alive) continue;
        const popLoss = (o.pop || 0.0004) * U.rnd(0.6, 1.4);
        const gdpLoss = (o.gdp || 0.0006) * U.rnd(0.6, 1.4);
        const armyLoss = (o.army || 0.004) * U.rnd(0.5, 1.5);
        st.pop = Math.max(0.02, st.pop * (1 - popLoss));
        st.gdp = Math.max(0.05, st.gdp * (1 - gdpLoss));
        st.army = Math.max(0.2, st.army * (1 - armyLoss));
        st.stab = U.clamp(st.stab - (o.stab || 0), 3, 99);
        w.stats.deaths += st.pop * popLoss;
        out.push(st);
      }
      return out;
    },

    // ---------- применение по клику ----------
    apply(wx, wy) {
      const d = defs[Tools.active];
      if (!d) return;
      if (d.kind === 'inspect') {
        const st = Render.pick(wx, wy);
        if (!st) { App.sel = null; U.emit('select', null); UI.closeCountry(); UI.hideTapHint(); return; }
        UI.tapCountry(st);
        return;
      }
      if (d.kind === 'spawn') return Tools.spawn(wx, wy, d.unit);
      if (d.kind === 'strike') return Tools.strike(wx, wy, d);
      if (d.kind === 'action') return Tools.action(d.act);
    },

    // повтор при перетаскивании
    drag(wx, wy, dt) {
      const d = defs[Tools.active];
      if (!d) return;
      if (d.kind === 'strike') {
        Tools.dragTimer -= dt;
        if (Tools.dragTimer > 0) return;
        Tools.dragTimer = 0.22;
        Tools.strike(wx, wy, d);
      } else if (d.kind === 'spawn') {
        Tools.dragTimer -= dt;
        if (Tools.dragTimer > 0) return;
        Tools.dragTimer = 0.5;
        Tools.spawn(wx, wy, d.unit);
      } else if (d.kind === 'inspect') {
        Render.hover = Tools.ownerAt(wx, wy);
      }
    },

    // ---------- спавн юнитов ----------
    spawn(wx, wy, type) {
      const w = App.world;
      let st = Render.pick(wx, wy) || Tools.ownerNear(wx, wy, 300);
      if (!st && App.sel) st = w.states[App.sel];
      if (!st) { UI.toast('Нужна территория страны', 'warn'); return; }
      if (type === 'ship' && !Render.isWater(wx, wy)) {
        UI.toast('Флот размещается в море', 'warn'); return;
      }
      if (type === 'nuke') {
        const bomb = { id: Tools.unitId++, type: 'nuke', owner: st.id, x: wx, y: wy, hp: 100, cap: true };
        w.units.push(bomb);
        FX.ring(wx, wy, { r: 90, col: '#9dff9d', life: .8 });
        UI.toast('Ядерный заряд ' + st.name + ' готов к пуску', 'ok');
        App.audio && App.audio.play('click');
        return;
      }
      const u = {
        id: Tools.unitId++, type, owner: st.id, x: wx, y: wy, tx: wx, ty: wy,
        hp: 100, cd: U.rnd(0.5, 2), speed: ({ inf: 26, tank: 42, art: 18, drone: 90, jet: 150, ship: 34, sam: 14, base: 0 }[type] || 30),
      };
      w.units.push(u);
      if (type === 'base') {
        st.army *= 1.02; st.stab += 1;
        FX.ring(wx, wy, { r: 120, col: '#9ad5ff', life: 1 });
      } else {
        st.army += type === 'jet' ? 2 : type === 'ship' ? 3 : 1.5;
      }
      FX.burst(wx, wy, { n: 8, power: .4, colors: ['#9ad5ff', '#e8f1f8'] });
      App.audio && App.audio.play('deploy');
    },

    // ---------- удары ----------
    strike(wx, wy, d) {
      const w = App.world;
      const mode = d.mode || 'boom';
      const st = Render.pick(wx, wy);
      switch (mode) {
        case 'boom': {
          FX.explosion(wx, wy, d.power || 1.4);
          Tools.damageArea(wx, wy, 260, { pop: 0.0003, gdp: 0.0005, army: 0.004, stab: 2 });
          break;
        }
        case 'art': {
          const src = st && st.capital ? st.capital : [wx + 900, wy + 300];
          for (let i = 0; i < 7; i++) FX.shell(src, [wx, wy], i * 0.12);
          Tools.damageArea(wx, wy, 420, { pop: 0.0008, gdp: 0.0012, army: 0.012, stab: 4 });
          App.audio && App.audio.play('artillery');
          break;
        }
        case 'air': {
          const from = [wx - 1600, wy + 1200];
          for (let i = 0; i < 4; i++) {
            const tx = wx + U.rnd(-300, 300), ty = wy + U.rnd(-220, 220);
            FX.missile([from[0] + i * 60, from[1]], [tx, ty], { kind: 'jet', dur: 1.1, arc: 0.12, col: '#bfe3ff' });
            setTimeout(() => FX.explosion(tx, ty, 1), 900 + i * 120);
          }
          Tools.damageArea(wx, wy, 520, { pop: 0.0012, gdp: 0.0018, army: 0.016, stab: 5 });
          App.audio && App.audio.play('jet');
          break;
        }
        case 'missile': {
          const owner = Render.pick(wx, wy) || (App.sel && w.states[App.sel]) || null;
          const from = owner && owner.capital ? owner.capital : [wx - 2200, wy - 1200];
          FX.missile(from, [wx, wy], { dur: 1.3 });
          setTimeout(() => { FX.explosion(wx, wy, 2.2); Tools.damageArea(wx, wy, 520, { pop: 0.0025, gdp: 0.0035, army: 0.03, stab: 8 }); }, 1300);
          App.audio && App.audio.play('launch');
          break;
        }
        case 'nuke': {
          Tools.nukeAt(wx, wy, st ? st.id : null);
          break;
        }
        case 'meteor': {
          const from = [wx - 2600, wy - 2200];
          FX.missile(from, [wx, wy], { dur: 0.9, arc: 0.1, col: '#ffb066' });
          FX.shakeIt(22);
          setTimeout(() => {
            FX.explosion(wx, wy, 3.4);
            FX.ring(wx, wy, { r: 900, life: 1.2, col: '#ff8f4a', w: 8 });
            Tools.damageArea(wx, wy, 900, { pop: 0.02, gdp: 0.03, army: 0.06, stab: 14 });
            FX.addZone({ type: 'fire', x: wx, y: wy, r: 420, life: 60 * 4, max: 60 * 4 });
            const s2 = Render.pick(wx, wy);
            if (s2) World.addLog('☄️ Метеорит упал на территорию ' + s2.name, 'doom');
          }, 900);
          break;
        }
        case 'quake': {
          for (let i = 0; i < 8; i++) {
            setTimeout(() => {
              const x = wx + U.rnd(-420, 420), y = wy + U.rnd(-320, 320);
              FX.burst(x, y, { n: 10, power: .5, colors: ['#c9b18a', '#8a7a5a', '#5a4a3a'] });
              FX.shakeIt(9);
            }, i * 220);
          }
          Tools.damageArea(wx, wy, 700, { pop: 0.012, gdp: 0.02, army: 0.01, stab: 10 });
          const s3 = Render.pick(wx, wy);
          if (s3) World.addLog('🌋 Землетрясение опустошает ' + s3.name, 'doom');
          App.audio && App.audio.play('rumble');
          break;
        }
        case 'tsunami': {
          FX.ring(wx, wy, { r: 1300, life: 1.6, col: '#8fd4ff', w: 12 });
          for (let i = 0; i < 5; i++) setTimeout(() => FX.burst(wx + U.rnd(-300, 300), wy + U.rnd(-200, 200), { n: 14, power: .9, colors: ['#9ad5ff', '#e8f1f8'] }), i * 180);
          Tools.damageArea(wx, wy, 800, { pop: 0.015, gdp: 0.025, army: 0.008, stab: 8 });
          App.audio && App.audio.play('wave');
          break;
        }
        case 'plague': {
          const s4 = Render.pick(wx, wy);
          FX.addZone({ type: 'plague', x: wx, y: wy, r: 420, life: 60 * 60, max: 60 * 60, owner: s4 ? s4.id : null });
          if (s4) {
            s4.pop *= 0.985; s4.stab -= 6;
            World.addLog('🦠 Вспышка чумы в ' + s4.name, 'doom');
          }
          App.audio && App.audio.play('alarm');
          break;
        }
        case 'fire': {
          FX.addZone({ type: 'fire', x: wx, y: wy, r: 340, life: 60 * 6, max: 60 * 6 });
          Tools.damageArea(wx, wy, 340, { pop: 0.002, gdp: 0.004, army: 0, stab: 3 });
          App.audio && App.audio.play('fire');
          break;
        }
        case 'tornado': {
          const dir = U.rnd(0, Math.PI * 2);
          let px = wx, py = wy;
          for (let i = 0; i < 26; i++) {
            setTimeout(() => {
              px += Math.cos(dir + Math.sin(i) * .5) * 90;
              py += Math.sin(dir + Math.cos(i) * .5) * 60;
              FX.burst(px, py, { n: 4, power: .5, colors: ['#dfe9ee', '#9fb7c9', '#6a8a9a'] });
              Tools.statesHit = Tools.damageArea(px, py, 160, { pop: 0.0008, gdp: 0.0015, army: 0.002, stab: 2 });
            }, i * 120);
          }
          App.audio && App.audio.play('wind');
          break;
        }
        case 'city': {
          const owner = Render.pick(wx, wy);
          if (!owner) { UI.toast('Город строится только на суше', 'warn'); return; }
          owner.pop += 0.4 + Math.random() * 0.8;
          owner.gdp += 1 + Math.random() * 3;
          owner.stab = Math.min(99, owner.stab + 2);
          w.units.push({ id: Tools.unitId++, type: 'city', owner: owner.id, x: wx, y: wy, hp: 100, cd: 999 });
          FX.ring(wx, wy, { r: 160, col: '#ffd97a', life: 1 });
          UI.toast('Город основан: ' + owner.name, 'ok');
          break;
        }
        case 'fort': {
          const o2 = Render.pick(wx, wy);
          if (!o2) { UI.toast('Только на территории страны', 'warn'); return; }
          o2.army *= 1.06; o2.stab += 3;
          w.units.push({ id: Tools.unitId++, type: 'base', owner: o2.id, x: wx, y: wy, hp: 100, cd: 999 });
          FX.ring(wx, wy, { r: 130, col: '#9ad5ff', life: .9 });
          break;
        }
        case 'factory': {
          const o3 = Render.pick(wx, wy);
          if (!o3) return;
          o3.gdp *= 1.05; o3.tech = Math.min(99, o3.tech + .5);
          FX.ring(wx, wy, { r: 120, col: '#7ff0a0', life: .9 });
          FX.text(wx, wy, '+5% ВВП', '#7ff0a0');
          break;
        }
        case 'prosperity': {
          const o4 = Render.pick(wx, wy);
          if (!o4) return;
          o4.gdp *= 1.15; o4.stab = Math.min(99, o4.stab + 12); o4.pop *= 1.02;
          FX.ring(wx, wy, { r: 300, col: '#ffd97a', life: 1.4 });
          FX.text(wx, wy, 'ПРОЦВЕТАНИЕ', '#ffd97a');
          App.audio && App.audio.play('chime');
          break;
        }
        case 'heal': {
          for (let i = FX.zones.length - 1; i >= 0; i--) {
            const z = FX.zones[i];
            if (Math.hypot(z.x - wx, z.y - wy) < 900) FX.zones.splice(i, 1);
          }
          FX.ring(wx, wy, { r: 800, col: '#9dff9d', life: 1.2 });
          FX.text(wx, wy, 'ОЧИЩЕНО', '#9dff9d');
          App.audio && App.audio.play('chime');
          break;
        }
      }
    },

    nukeAt(wx, wy, ownerId) {
      const w = App.world;
      const st = Render.pick(wx, wy);
      FX.nuke(wx, wy);
      Tools.damageArea(wx, wy, 1400, { pop: 0.09, gdp: 0.13, army: 0.2, stab: 25 });
      w.stats.nukes++;
      if (st) {
        st.stab = U.clamp(st.stab - 15, 3, 99);
        World.addLog('☢️ Ядерный удар по территории ' + st.name + '. Жертвы: ' + U.fmt(st.pop * 0.08 * 1e6, 0) + ' человек', 'nuke');
      } else {
        World.addLog('☢️ Ядерный взрыв в океане', 'nuke');
      }
      UI.toast('☢️ Ядерный удар!', 'nuke');
      U.emit('nuke', { x: wx, y: wy });
    },

    // ---------- глобальные действия ----------
    action(act) {
      const w = App.world;
      if (act === 'peaceAll') {
        const n = w.wars.length;
        for (const war of w.wars.slice()) {
          for (const side of war.sides) for (const id of side) {
            const st = w.states[id];
            if (st) st.stab += 4;
          }
        }
        w.wars = [];
        World.syncWarFlags();
        World.addLog('🕊️ Все войны остановлены. Мир во всём мире.', 'peace');
        UI.toast('Заключён всеобщий мир (' + n + ' конфл.)', 'ok');
        App.audio && App.audio.play('chime');
      }
      if (act === 'nukeAll') {
        UI.confirm('Ядерный апокалипсис', 'Нанести ядерные удары по столицам всех крупных держав? Это уничтожит миллиарды жизней.', () => {
          const targets = World.stateList.filter(s => s.alive && s.pop > 5).slice(0, 26);
          targets.forEach((st, i) => setTimeout(() => {
            const p = st.capital || st.cen;
            FX.nuke(p[0], p[1]);
            Tools.damageArea(p[0], p[1], 1300, { pop: 0.2, gdp: 0.26, army: 0.3, stab: 40 });
            w.stats.nukes++;
            UI.toast('☢️ ' + st.name, 'nuke');
          }, i * 260));
          World.addLog('☢️ Глобальная ядерная война началась', 'nuke');
        });
      }
      if (act === 'plagueAll') {
        for (const st of World.stateList.filter(s => s.alive && s.pop > 3)) {
          FX.addZone({ type: 'plague', x: st.cen[0], y: st.cen[1], r: 500, life: 60 * 90, max: 60 * 90, owner: st.id });
        }
        World.addLog('🦠 Пандемия охватила весь мир', 'doom');
        UI.toast('Пандемия началась', 'warn');
      }
      if (act === 'goldenAge') {
        for (const st of World.stateList) {
          if (!st.alive) continue;
          st.gdp *= 1.25; st.stab = Math.min(99, st.stab + 18); st.tech = Math.min(99, st.tech + 6);
        }
        World.addLog('✨ Золотой век: экономика всех стран выросла на 25%', 'era');
        UI.toast('✨ Золотой век', 'ok');
        App.audio && App.audio.play('chime');
      }
      if (act === 'resetWorld') {
        UI.confirm('Сброс мира', 'Начать заново с этого года? Весь прогресс будет потерян.', () => {
          Sim.applyEra(w.eraYear, false);
          UI.closeCountry();
          UI.toast('Мир перезапущен', 'ok');
        });
      }
    },

    // ---------- инструменты для карточки страны ----------
    stateAction(stateId, action, arg) {
      const w = App.world;
      const st = w.states[stateId];
      if (!st || !st.alive) return;
      switch (action) {
        case 'ideo':
          st.ideo = arg;
          st.stab = U.clamp(st.stab - 4, 5, 99);
          World.addLog('🏛️ В ' + st.name + ' установлен строй: ' + App.pol.IDEOLOGIES[arg].name, 'revolt');
          FX.burst(st.capital ? st.capital[0] : st.cen[0], st.capital ? st.capital[1] : st.cen[1], { n: 12, power: .6 });
          break;
        case 'stab':
          st.stab = U.clamp(st.stab + arg, 3, 99);
          FX.text(st.cen[0], st.cen[1], (arg > 0 ? '+' : '') + arg + ' стаб.', arg > 0 ? '#7ff0a0' : '#ff8f7a');
          break;
        case 'gdp':
          st.gdp = Math.max(0.01, st.gdp * (1 + arg));
          FX.text(st.cen[0], st.cen[1], (arg > 0 ? '+' : '') + Math.round(arg * 100) + '% ВВП', arg > 0 ? '#7ff0a0' : '#ff8f7a');
          break;
        case 'pop':
          st.pop = Math.max(0.01, st.pop * (1 + arg));
          FX.text(st.cen[0], st.cen[1], (arg > 0 ? '+' : '') + Math.round(arg * 100) + '% нас.', arg > 0 ? '#7ff0a0' : '#ff8f7a');
          break;
        case 'army':
          st.army = Math.max(0.2, st.army * (1 + arg));
          FX.text(st.cen[0], st.cen[1], (arg > 0 ? '+' : '') + Math.round(arg * 100) + '% армии', arg > 0 ? '#7ff0a0' : '#ff8f7a');
          break;
        case 'tech':
          st.tech = U.clamp(st.tech + arg, 1, 99);
          break;
        case 'nuke':
          st.nukes = Math.max(0, st.nukes + arg);
          break;
        case 'stability_event':
          Sim.revolt(st);
          break;
        case 'civilwar': {
          st.pop *= 0.85; st.gdp *= 0.8; st.army *= 0.6; st.stab = 18;
          st.ideo = U.pick(Object.keys(App.pol.IDEOLOGIES));
          FX.burst(st.cen[0], st.cen[1], { n: 40, power: 1.6, colors: ['#ff6b35', '#c1121f', '#2a2a30'] });
          FX.text(st.cen[0], st.cen[1], 'ГРАЖДАНСКАЯ ВОЙНА', '#ff6b4a');
          World.addLog('💥 Гражданская война в ' + st.name, 'war');
          App.audio && App.audio.play('alarm');
          break;
        }
        case 'war': {
          World.declareWar(stateId, arg);
          break;
        }
        case 'peace_state': {
          for (const war of w.wars.slice()) {
            if (war.sides[0].includes(stateId) || war.sides[1].includes(stateId)) World.endWar(war, '🕊️ ' + st.name + ' выходит из войны');
          }
          break;
        }
        case 'annex_into': {
          const winner = w.states[arg];
          if (winner) World.annex(stateId, arg, false);
          break;
        }
        case 'puppet_of': {
          const master = w.states[arg];
          if (master) {
            st.overlord = arg; st.bloc = master.bloc; st.ideo = master.ideo;
            World.addLog('🏳️ ' + st.name + ' — вассал ' + master.name, 'annex');
          }
          break;
        }
        case 'release': {
          st.overlord = null;
          World.addLog('🕊️ ' + st.name + ' обретает независимость', 'annex');
          break;
        }
        case 'nuke_self': {
          const p = st.capital || st.cen;
          Tools.nukeAt(p[0], p[1], st.id);
          break;
        }
        case 'rename': {
          st.name = String(arg).slice(0, 24) || st.name;
          break;
        }
        case 'color': {
          st.color = arg;
          Render.minimapDirty = true;
          break;
        }
        case 'borders': {
          UI.toast('Границы меняются войнами и аннексиями', 'hint');
          break;
        }
      }
      U.emit('stateUpdate', stateId);
    },
  };

  window.Tools = Tools;
  window.ICONS = ICONS;
})();
