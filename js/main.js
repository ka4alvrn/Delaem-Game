/* ТОЧКА ВХОДА: ввод, цикл, загрузка данных */
(function () {
  const U = window.U;

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('не загружен ' + src));
      document.head.appendChild(s);
    });
  }

  function loadEra(year) {
    if (window.ERA_DATA && window.ERA_DATA[year]) return Promise.resolve();
    return loadScript('js/data/map_' + year + '.js');
  }

  const App2 = window.App;

  function defaultSettings() {
    return {
      historical: true, aiWars: true, events: true, labels: true, sound: true, shake: true, towns: true, speed: 1,
    };
  }

  function boot() {
    App2.pol = window.POLITICS;
    try {
      const s = JSON.parse(localStorage.getItem('earth_settings') || 'null');
      App2.settings = Object.assign(defaultSettings(), s || {});
    } catch (e) { App2.settings = defaultSettings(); }
    App2.speed = 1;
    Audio.muted = !App2.settings.sound;

    Render.init(document.getElementById('map'));
    Render.loadSprites();
    Render.mode = 'political';
    UI.init();
    UI.buildStart();
    UI.showStart();
    App2.startYear = 1942;

    // стартовое превью карты под меню
    if (window.ERA_DATA && window.ERA_DATA[1942]) {
      World.buildStates(1942);
      Render.buildCache();
      Render.focus(1750, -5180, 0.07);
      Sim.setSpeed(0);
    }
    document.getElementById('boot').classList.add('gone');

    bindInput();
    requestAnimationFrame(loop);
    setInterval(() => {
      if (App2.world && !document.hidden && App2.speed > 0) UI.doSave('earth_save_auto');
    }, 60000);
  }

  // ---------- ввод ----------
  const pointers = new Map();
  let dragging = false, moved = 0, lastPos = null, pinchStart = null, downPos = null, downTime = 0;
  let paintCooldown = 0;

  function bindInput() {
    const cv = document.getElementById('map');

    cv.addEventListener('pointerdown', ev => {
      try { cv.setPointerCapture(ev.pointerId); } catch (e) { }
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      Audio.resume();
      if (pointers.size === 1) {
        dragging = true; moved = 0; downTime = performance.now();
        downPos = { x: ev.clientX, y: ev.clientY };
        lastPos = { x: ev.clientX, y: ev.clientY };
        const d = Tools.get(Tools.active);
        if (d && (d.kind === 'strike' || d.kind === 'spawn')) {
          const [wx, wy] = Render.toWorld(ev.clientX, ev.clientY);
          Tools.apply(wx, wy);
        }
      } else if (pointers.size === 2) {
        const p = [...pointers.values()];
        pinchStart = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), mx: (p[0].x + p[1].x) / 2, my: (p[0].y + p[1].y) / 2, z: App2.cam.z };
      }
    });

    cv.addEventListener('pointermove', ev => {
      if (!pointers.has(ev.pointerId)) return;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size >= 2 && pinchStart) {
        const p = [...pointers.values()];
        const nd = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        const mx = (p[0].x + p[1].x) / 2, my = (p[0].y + p[1].y) / 2;
        App2.cam.z = U.clamp(pinchStart.z * (nd / Math.max(1, pinchStart.d)), Render.minZoom(), Render.maxZoom());
        App2.cam.x -= (mx - pinchStart.mx) / App2.cam.z;
        App2.cam.y -= (my - pinchStart.my) / App2.cam.z;
        pinchStart.mx = mx; pinchStart.my = my;
        Render.clampCam();
        return;
      }
      if (!dragging || !lastPos) return;
      const dx = ev.clientX - lastPos.x, dy = ev.clientY - lastPos.y;
      moved += Math.abs(dx) + Math.abs(dy);
      const d = Tools.get(Tools.active);
      const paint = d && (d.kind === 'strike' || d.kind === 'spawn');
      if (!paint) {
        App2.cam.x -= dx / App2.cam.z;
        App2.cam.y -= dy / App2.cam.z;
        Render.clampCam();
      } else if (moved > 6) {
        const [wx, wy] = Render.toWorld(ev.clientX, ev.clientY);
        Tools.drag(wx, wy, 0.016);
      }
      lastPos = { x: ev.clientX, y: ev.clientY };
    });

    const up = ev => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size === 0) {
        const wasDrag = moved > 10;
        const dt = performance.now() - downTime;
        const d = Tools.get(Tools.active);
        if (!wasDrag && dt < 600 && downPos && d && d.kind === 'inspect') {
          const [wx, wy] = Render.toWorld(downPos.x, downPos.y);
          Tools.apply(wx, wy);
        }
        if (!wasDrag && dt < 600 && downPos && d && d.kind === 'spawn' && ev.type === 'pointerup') {
          // уже применено на pointerdown
        }
        dragging = false; lastPos = null;
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    cv.addEventListener('wheel', ev => {
      ev.preventDefault();
      Render.zoomAt(ev.clientX, ev.clientY, ev.deltaY > 0 ? 0.88 : 1.14);
    }, { passive: false });

    cv.addEventListener('mousemove', ev => {
      if (pointers.size) return;
      const [wx, wy] = Render.toWorld(ev.clientX, ev.clientY);
      const st = Render.pick(wx, wy);
      Render.hover = st ? st.id : null;
    });

    window.addEventListener('keydown', ev => {
      if (ev.target.tagName === 'INPUT') return;
      const k = ev.key.toLowerCase();
      if (k === ' ') { ev.preventDefault(); Sim.setSpeed(App2.speed === 0 ? 1 : 0); UI.updateHud(); }
      if (k === 'escape') { UI.closeModal(); UI.closeCountry(); }
      if (k === 'arrowleft') { App2.cam.x -= 220 / App2.cam.z; Render.clampCam(); }
      if (k === 'arrowright') { App2.cam.x += 220 / App2.cam.z; Render.clampCam(); }
      if (k === 'arrowup') { App2.cam.y -= 220 / App2.cam.z; Render.clampCam(); }
      if (k === 'arrowdown') { App2.cam.y += 220 / App2.cam.z; Render.clampCam(); }
      if (k === '+' || k === '=') Render.zoomAt(Render.W / 2, Render.H / 2, 1.2);
      if (k === '-') Render.zoomAt(Render.W / 2, Render.H / 2, 0.83);
      if (k >= '1' && k <= '5') {
        const p = Tools.pages[+k - 1];
        if (p) { U.qa('.page-btn').forEach(x => x.classList.toggle('on', x.dataset.page === p.id)); UI.buildTools(p.id); }
      }
    });

    window.addEventListener('resize', () => {
    if (window.UI && UI.measureBars) UI.measureBars(); Render.resize(); Render.clampCam(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && App2.world) UI.doSave('earth_save_auto');
    });

    // запуск игры из стартового меню
    const startBtn = document.getElementById('start-play');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const y = App2.startYear || 1942;
        startBtn.disabled = true;
        startBtn.textContent = 'Загрузка мира…';
        loadEra(y).then(() => {
          startBtn.disabled = false; startBtn.textContent = '▶ Начать игру';
          UI.startGame(y);
        }).catch(err => {
          console.error(err);
          startBtn.disabled = false; startBtn.textContent = '▶ Начать игру';
          UI.toast('Не удалось загрузить карту', 'warn');
        });
      });
    }
  }

  // ---------- цикл ----------
  let last = performance.now();
  function loop(ts) {
    const dt = Math.min(0.06, (ts - last) / 1000);
    last = ts;
    if (App2.world) {
      if (!Sim.paused) Sim.tick(dt * 1000);
      Units.update(dt);
      FX.update(dt);
    }
    Render.frame(dt);
    requestAnimationFrame(loop);
  }

  window.loadEraData = loadEra;
  window.applyEraAsync = function (year, keep) {
    if (keep) { Sim.applyEra(year, true); return Promise.resolve(); }
    return loadEra(year).then(() => { Sim.applyEra(year, false); Render.buildCache(); });
  };
  window.addEventListener('load', boot);
})();
