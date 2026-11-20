/* РЕНДЕР: камера, карта, подписи, юниты, миникарта */
(function () {
  const U = window.U;
  const TAU = Math.PI * 2;
  const Render = {
    canvas: null, ctx: null, dpr: 1, W: 0, H: 0,
    grid: null, adj: new Map(), land: null,
    hover: null, mode: 'political', minimapDirty: true,
    time: 0, _lastMini: 0,
  };

  Render.init = function (canvas) {
    Render.canvas = canvas;
    Render.ctx = canvas.getContext('2d', { alpha: false });
    Render.resize();
  };

  Render.resize = function () {
    if (!Render.canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth, H = window.innerHeight;
    Render.dpr = dpr; Render.W = W; Render.H = H;
    Render.canvas.width = Math.round(W * dpr);
    Render.canvas.height = Math.round(H * dpr);
    Render.canvas.style.width = W + 'px';
    Render.canvas.style.height = H + 'px';
  };

  // ---- камера ----
  Render.minZoom = function () { return Math.min(Render.W / U.WM, Render.H / U.HM) * 0.98; };
  Render.maxZoom = function () { return 2.6; };
  Render.toWorld = function (sx, sy) {
    const c = App.cam;
    return [(sx - Render.W / 2) / c.z + c.x, (sy - Render.H / 2) / c.z + c.y];
  };
  Render.toScreen = function (wx, wy) {
    const c = App.cam;
    return [(wx - c.x) * c.z + Render.W / 2, (wy - c.y) * c.z + Render.H / 2];
  };
  Render.clampCam = function () {
    const c = App.cam;
    c.z = U.clamp(c.z, Render.minZoom(), Render.maxZoom());
    const halfW = Render.W / 2 / c.z, halfH = Render.H / 2 / c.z;
    const minX = U.X0 + Math.min(halfW, U.WM / 2), maxX = U.X1 - Math.min(halfW, U.WM / 2);
    const minY = U.Y0 + Math.min(halfH, U.HM / 2), maxY = U.Y1 - Math.min(halfH, U.HM / 2);
    c.x = minX > maxX ? (U.X0 + U.X1) / 2 : U.clamp(c.x, minX, maxX);
    c.y = minY > maxY ? (U.Y0 + U.Y1) / 2 : U.clamp(c.y, minY, maxY);
  };
  Render.zoomAt = function (sx, sy, factor) {
    const c = App.cam;
    const [wx, wy] = Render.toWorld(sx, sy);
    c.z = U.clamp(c.z * factor, Render.minZoom(), Render.maxZoom());
    c.x = wx - (sx - Render.W / 2) / c.z;
    c.y = wy - (sy - Render.H / 2) / c.z;
    Render.clampCam();
  };
  Render.focus = function (wx, wy, z) {
    const c = App.cam;
    if (z) c.z = U.clamp(z, Render.minZoom(), Render.maxZoom());
    c.x = wx; c.y = wy; Render.clampCam();
  };
  Render.worldVisible = function () {
    const c = App.cam;
    const hw = Render.W / 2 / c.z, hh = Render.H / 2 / c.z;
    return [c.x - hw, c.y - hh, c.x + hw, c.y + hh];
  };

  // ---- кэш путей и сетка владения ----
  Render.buildCache = function () {
    const w = App.world;
    if (!w) return;
    for (const p of w.polys) {
      if (p.path) continue;
      const path = new Path2D();
      for (const r of p.r) {
        path.moveTo(r[0], r[1]);
        for (let i = 2; i < r.length; i += 2) path.lineTo(r[i], r[i + 1]);
        path.closePath();
      }
      p.path = path;
    }
    Render.minimapDirty = true;
  };

  Render.isWater = function (wx, wy) { return !Render.pick(wx, wy); };

  // Точное попадание по полигонам
  Render.pick = function (wx, wy) {
    const w = App.world;
    if (!w) return null;
    for (const st of w.stateList) {
      if (!st.alive) continue;
      for (const p of st.polys) {
        const b = p.b;
        if (wx < b[0] || wx > b[2] || wy < b[1] || wy > b[3]) continue;
        if (U.pointInRings(wx, wy, p.r)) return st;
      }
    }
    return null;
  };

  // ---- цвета ----
  const HEAT = ['#1e3a5f', '#2b6a8a', '#3fa08a', '#9ac45a', '#e8c14a', '#e07a3a', '#c0392b'];
  function heat(t) {
    t = U.clamp(t, 0, 1) * (HEAT.length - 1);
    const i = Math.floor(t), f = t - i;
    return U.mix(HEAT[i], HEAT[Math.min(HEAT.length - 1, i + 1)], f);
  }
  function norm(v, min, max) { return (v - min) / (max - min + 0.0001); }

  Render.stateColor = function (st) {
    const P = App.pol;
    switch (Render.mode) {
      case 'ideo': return P.IDEOLOGIES[st.ideo].col;
      case 'bloc': return P.BLOCS[st.bloc].col;
      case 'power': return heat(norm(Math.log10(st.army + 1), 0, 4.2));
      case 'gdp': return heat(norm(Math.log10(st.gdp + 1), 0, 4.4));
      case 'pop': return heat(norm(Math.log10(st.pop + 1), 0, 3.4));
      case 'tech': return heat(st.tech / 100);
      case 'stab': return heat(1 - st.stab / 100);
      case 'nuke': return st.nukes > 0 ? heat(U.clamp(Math.log10(st.nukes + 1) / 3.6, 0, 1)) : '#22405c';
      case 'war': return st.wars.length ? '#b03a2e' : (st.bloc === 'axis' ? '#6b4b2a' : '#2f4f6b');
      case 'nature': {
        const lat = U.unprojLat(st.cen[1]);
        if (lat > 62) return '#dfe9ee';
        if (lat < -60) return '#e8eef2';
        if (Math.abs(lat) < 32) return '#b7a76a';
        return '#6f8f5a';
      }
      default: {
        let c = st.color;
        if (st.overlord && App.world.states[st.overlord] && App.world.states[st.overlord].alive) {
          c = U.mix(c, App.world.states[st.overlord].color, 0.62);
        }
        return c;
      }
    }
  };

  // ---- отрисовка ----
  Render.frame = function (dt) {
    const ctx = Render.ctx, W = Render.W, H = Render.H, dpr = Render.dpr, cam = App.cam;
    Render.time += dt;
    const w = App.world;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // океан
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a1a2b'); g.addColorStop(.5, '#0d2439'); g.addColorStop(1, '#08131f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!w) return;

    const shake = FX.shake;
    const shx = shake ? U.rnd(-shake, shake) : 0, shy = shake ? U.rnd(-shake, shake) : 0;
    const ox = W / 2 - cam.x * cam.z + shx, oy = H / 2 - cam.y * cam.z + shy;

    // сетка координат
    ctx.save();
    ctx.strokeStyle = 'rgba(120,180,230,.08)';
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = U.proj(lon, 0);
      ctx.beginPath(); ctx.moveTo(x * cam.z + ox, 0); ctx.lineTo(x * cam.z + ox, H); ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = U.proj(0, lat);
      ctx.beginPath(); ctx.moveTo(0, y * cam.z + oy); ctx.lineTo(W, y * cam.z + oy); ctx.stroke();
    }
    ctx.restore();

    const vis = Render.worldVisible();
    ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * ox, dpr * oy);
    const lw = 1 / cam.z;

    // страны
    const selId = App.sel;
    const drawList = [];
    for (const st of w.stateList) {
      if (!st.alive) continue;
      const b = st.bb;
      if (b[2] < vis[0] - 400 || b[0] > vis[2] + 400 || b[3] < vis[1] - 400 || b[1] > vis[3] + 400) continue;
      drawList.push(st);
    }
    // 1) заливка + сглаживание швов цветом заливки
    for (const st of drawList) {
      const col = Render.stateColor(st);
      ctx.fillStyle = col;
      for (const p of st.polys) {
        if (!p.path) continue;
        if (p.b[2] < vis[0] || p.b[0] > vis[2] || p.b[3] < vis[1] || p.b[1] > vis[3]) continue;
        ctx.fill(p.path, 'evenodd');
      }
      ctx.strokeStyle = col;
      ctx.lineWidth = lw * 1.7;
      for (const p of st.polys) {
        if (!p.path) continue;
        if (p.b[2] < vis[0] || p.b[0] > vis[2] || p.b[3] < vis[1] || p.b[1] > vis[3]) continue;
        ctx.stroke(p.path);
      }
    }
    // 2) границы
    for (const st of drawList) {
      ctx.strokeStyle = st.id === selId ? 'rgba(255,255,255,.9)' : 'rgba(6,12,20,.55)';
      ctx.lineWidth = st.id === selId ? lw * 2.2 : lw * 0.8;
      for (const p of st.polys) {
        if (p.b[2] < vis[0] || p.b[0] > vis[2] || p.b[3] < vis[1] || p.b[1] > vis[3]) continue;
        ctx.stroke(p.path);
      }
    }

    // подсветка наведения
    if (Render.hover && Render.hover !== selId && w.states[Render.hover]) {
      const st = w.states[Render.hover];
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      for (const p of st.polys) if (p.path) ctx.fill(p.path, 'evenodd');
    }

    // война: пульсирующая обводка
    const t = Render.time;
    for (const st of w.stateList) {
      if (!st.alive || !st.wars || !st.wars.length) continue;
      if (st.bb[2] < vis[0] || st.bb[0] > vis[2] || st.bb[3] < vis[1] || st.bb[1] > vis[3]) continue;
      ctx.strokeStyle = 'rgba(255,80,60,' + (0.35 + 0.25 * Math.sin(t * 4 + st.cen[0])) + ')';
      ctx.lineWidth = lw * 2.6;
      for (const p of st.polys) if (p.path) ctx.stroke(p.path);
    }

    // выбор: анимированная рамка
    if (selId && w.states[selId] && w.states[selId].alive) {
      const st = w.states[selId];
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = lw * 2.2;
      ctx.setLineDash([lw * 10, lw * 8]);
      ctx.lineDashOffset = -(t * 26) / cam.z;
      for (const p of st.polys) if (p.path) ctx.stroke(p.path);
      ctx.restore();
    }

    // юниты
    Render.drawUnits(ctx, cam, vis, lw);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // подписи
    Render.drawLabels(ctx, cam, ox, oy);

    // эффекты
    FX.draw(ctx, { ...cam, x: cam.x - shx / cam.z, y: cam.y - shy / cam.z }, W, H);

    // виньетка
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(2,8,14,.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    if (performance.now() - Render._lastMini > 400) { Render._lastMini = performance.now(); if (App.ui && App.ui.drawMinimap) App.ui.drawMinimap(); }
  };

  Render.drawUnits = function (ctx, cam, vis, lw) {
    const w = App.world;
    if (!w) return;
    for (const u of w.units) {
      if (u.x < vis[0] - 200 || u.x > vis[2] + 200 || u.y < vis[1] - 200 || u.y > vis[3] + 200) continue;
      const st = w.states[u.owner];
      const col = st ? st.color : '#888';
      Render.icon(ctx, u.x, u.y, 1 / cam.z * 1.2, u.type, col, u.owner === App.sel);
    }
  };

  Render.icon = function (ctx, x, y, scale, type, col, sel) {
    const s = Math.max(0.0001, scale);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.arc(2, 3, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = sel ? '#ffffff' : col;
    ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0d1520';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const glyph = { inf: '●', tank: '▭', art: '▲', drone: '✕', jet: '✈', ship: '⬟', base: '⌂', city: '▮', nuke: '☢', sam: '⌖' }[type] || '●';
    ctx.fillText(glyph, 0, 1);
    ctx.restore();
  };

  Render.drawLabels = function (ctx, cam, ox, oy) {
    const w = App.world;
    if (!w) return;
    if (App.settings && App.settings.labels === false) return;
    const W = Render.W, H = Render.H;
    const boxes = [];
    const z = cam.z;
    const showSmall = z > 0.22;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const items = [];
    for (const st of w.stateList) {
      if (!st.alive) continue;
      const [sx, sy] = Render.toScreen(st.cen[0], st.cen[1]);
      if (sx < -80 || sy < -40 || sx > W + 80 || sy > H + 40) continue;
      const pxArea = (st.area / 1.23) * z * z;
      if (pxArea < 620 && !(st.id === App.sel)) continue;
      items.push({ st, sx, sy, w: pxArea });
    }
    items.sort((a, b) => b.w - a.w);
    for (const it of items) {
      const st = it.st;
      const big = it.w > 2600;
      if (!big && !showSmall && st.id !== App.sel) continue;
      let fs = U.clamp(8.5 + 15 * z + Math.min(4, Math.sqrt(it.w) / 26), 8.5, 20);
      if (st.id === App.sel) fs = Math.max(fs, 13);
      const name = st.name;
      ctx.font = (big ? '600 ' : '500 ') + fs.toFixed(0) + 'px system-ui, -apple-system, sans-serif';
      const tw = ctx.measureText(name).width;
      const bw = tw + 8, bh = fs + 4;
      let collide = false;
      for (const b of boxes) {
        if (Math.abs(b[0] - it.sx) < (b[2] + bw) / 2 && Math.abs(b[1] - it.sy) < (b[3] + bh) / 2) { collide = true; break; }
      }
      if (collide && st.id !== App.sel) continue;
      boxes.push([it.sx, it.sy, bw, bh]);
      ctx.globalAlpha = big ? 0.95 : 0.8;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(3,10,18,.75)';
      ctx.strokeText(name, it.sx, it.sy);
      ctx.fillStyle = st.id === App.sel ? '#fff' : '#e8f1f8';
      ctx.fillText(name, it.sx, it.sy);
      // столица
      if (st.capital && z > 0.1 && it.w > 2500) {
        const [cx, cy] = Render.toScreen(st.capital[0], st.capital[1]);
        const r = U.clamp(fs * 0.18, 1.6, 3.4);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
        ctx.fillStyle = '#0d1520'; ctx.fill();
        ctx.strokeStyle = '#ffd97a'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  };

  // Миникарта рисуется в отдельный canvas из UI
  Render.drawMini = function (canvas) {
    const w = App.world;
    if (!w || !canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    const sx = cw / U.WM, sy = ch / U.HM;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a1a2b'; ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(sx, 0, 0, sy, -U.X0 * sx, -U.Y0 * sy);
    for (const st of w.stateList) {
      if (!st.alive) continue;
      ctx.fillStyle = Render.stateColor(st);
      for (const p of st.polys) if (p.path) ctx.fill(p.path, 'evenodd');
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // рамка обзора
    const c = App.cam;
    const vw = Render.W / c.z, vh = Render.H / c.z;
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5;
    ctx.strokeRect((c.x - vw / 2 - U.X0) * sx, (c.y - vh / 2 - U.Y0) * sy, vw * sx, vh * sy);
    // юниты точками
    ctx.fillStyle = '#ffd97a';
    for (const u of w.units) ctx.fillRect((u.x - U.X0) * sx - 1, (u.y - U.Y0) * sy - 1, 2, 2);
  };

  Render.miniJump = function (mx, my) {
    const canvas = App.ui.miniCanvas;
    if (!canvas) return;
    Render.focus(U.X0 + mx / canvas.width * U.WM, U.Y0 + my / canvas.height * U.HM);
  };

  window.Render = Render;
})();
