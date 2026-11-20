/* ЭФФЕКТЫ: частицы, снаряды, зоны поражения */
(function () {
  const U = window.U;
  const parts = [], rings = [], projs = [], texts = [], zones = [];
  const craters = [];
  let shake = 0, flash = 0;

  const TAU = Math.PI * 2;

  function addParticle(p) { if (parts.length < 2200) parts.push(p); }

  const FX = {
    zones, craters,
    clear() { parts.length = 0; rings.length = 0; projs.length = 0; texts.length = 0; zones.length = 0; craters.length = 0; shake = 0; flash = 0; },
    get shake() { return shake; },
    get flash() { return flash; },
    shakeIt(v) { shake = Math.min(28, shake + v); },
    flashIt(v) { flash = Math.min(1, flash + v); },

    burst(x, y, o) {
      o = o || {};
      const n = o.n || 18, power = o.power || 1;
      const cols = o.colors || ['#fff3b0', '#ffb347', '#ff6b35', '#c1121f', '#6a2c1f'];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = U.rnd(120, 900) * power;
        addParticle({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: U.rnd(0.25, 1.1) * (o.life || 1), max: 1,
          size: U.rnd(1.5, 5) * Math.min(3, power), col: U.pick(cols),
          drag: 2.2, grav: 0, kind: o.kind || 'spark',
        });
      }
    },

    smoke(x, y, o) {
      o = o || {};
      for (let i = 0; i < (o.n || 6); i++) {
        addParticle({
          x: x + U.rnd(-8, 8) * (o.r || 1), y: y + U.rnd(-8, 8) * (o.r || 1),
          vx: U.rnd(-40, 40), vy: U.rnd(-70, -15),
          life: U.rnd(1.2, 2.8), size: U.rnd(4, 10) * (o.r || 1), col: o.dark ? '#2a2a30' : '#7a7a86',
          drag: 0.6, grav: -6, kind: 'smoke',
        });
      }
    },

    ring(x, y, o) {
      o = o || {};
      rings.push({ x, y, r: 0, max: o.r || 400, life: o.life || 0.9, t: 0, col: o.col || '#ffd27a', w: o.w || 3 });
    },

    text(x, y, str, col) { texts.push({ x, y, str, col: col || '#fff', life: 1.4, t: 0 }); },

    explosion(x, y, power) {
      power = power || 1;
      FX.burst(x, y, { n: 16 + power * 10, power: 0.6 + power * 0.5 });
      FX.ring(x, y, { r: 260 * power, life: 0.55, col: '#ffd27a', w: 4 });
      FX.smoke(x, y, { n: 4 + power * 3, r: power });
      craters.push({ x, y, r: 60 * power, a: 0.5 });
      if (craters.length > 220) craters.shift();
      FX.shakeIt(4 + power * 4);
      App.audio && App.audio.play('boom', 0.5 + power * 0.3);
    },

    nuke(x, y) {
      FX.flashIt(1);
      FX.ring(x, y, { r: 2600, life: 2.0, col: '#fff', w: 10 });
      FX.ring(x, y, { r: 1700, life: 1.5, col: '#ffd27a', w: 6 });
      FX.burst(x, y, { n: 90, power: 2.6, life: 2.2 });
      for (let i = 0; i < 26; i++) {
        addParticle({ x: x + U.rnd(-40, 40), y: y + U.rnd(-40, 40), vx: U.rnd(-30, 30), vy: U.rnd(-120, -40), life: U.rnd(2.5, 5), size: U.rnd(10, 26), col: U.pick(['#ff8f4a', '#e2572b', '#8a3b28', '#5a4a4a']), drag: .4, grav: -14, kind: 'mush' });
      }
      craters.push({ x, y, r: 420, a: 0.8 });
      FX.shakeIt(26);
      zones.push({ type: 'rad', x, y, r: 1500, life: 60 * 12, max: 60 * 12, seed: Math.random() * 100 });
      zones.push({ type: 'fire', x, y, r: 700, life: 60 * 3, max: 60 * 3, seed: Math.random() * 100 });
      App.audio && App.audio.play('nuke');
    },

    missile(from, to, o) {
      o = o || {};
      projs.push({ kind: o.kind || 'missile', x: from[0], y: from[1], x0: from[0], y0: from[1], tx: to[0], ty: to[1], t: 0, dur: o.dur || 1.15, arc: o.arc == null ? 0.28 : o.arc, col: o.col || '#ff9d4a' });
    },

    drone(from, to, o) {
      o = o || {};
      projs.push({ kind: 'drone', x: from[0], y: from[1], x0: from[0], y0: from[1], tx: to[0], ty: to[1], t: 0, dur: o.dur || 2.4, arc: 0.05, col: '#9ad5ff', wobble: Math.random() * 10 });
    },

    shell(from, to, delay) {
      projs.push({ kind: 'shell', x: from[0], y: from[1], x0: from[0], y0: from[1], tx: to[0] + U.rnd(-90, 90), ty: to[1] + U.rnd(-90, 90), t: -(delay || 0), dur: 0.75, arc: 0.5, col: '#ffe1a0' });
    },

    warFront(x, y) {
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * TAU;
        projs.push({ kind: 'tracer', x: x + Math.cos(a) * U.rnd(20, 160), y: y + Math.sin(a) * U.rnd(20, 160), tx: x, ty: y, t: 0, dur: 0.5, arc: 0, col: Math.random() < .5 ? '#ffd27a' : '#ff7a5a' });
      }
    },

    addZone(z) { if (zones.length > 90) zones.shift(); zones.push(z); },

    update(dt) {
      // частицы
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += (p.grav || 0) * dt * 60;
        const d = Math.exp(-(p.drag || 1.5) * dt);
        p.vx *= d; p.vy *= d;
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]; r.t += dt;
        if (r.t >= r.life) { rings.splice(i, 1); continue; }
        r.r = r.max * (r.t / r.life);
      }
      for (let i = projs.length - 1; i >= 0; i--) {
        const p = projs[i]; p.t += dt;
        if (p.t < 0) continue;
        const q = Math.min(1, p.t / p.dur);
        const cx = U.lerp(p.x0, p.tx, q), cy = U.lerp(p.y0, p.ty, q);
        const lift = Math.sin(q * Math.PI) * p.arc * Math.hypot(p.tx - p.x0, p.ty - p.y0);
        p.x = cx; p.y = cy - lift;
        if (p.kind === 'missile' || p.kind === 'drone') {
          addParticle({ x: p.x, y: p.y, vx: U.rnd(-10, 10), vy: U.rnd(-10, 10), life: p.kind === 'missile' ? .8 : .5, size: p.kind === 'missile' ? 3.2 : 2.2, col: p.kind === 'missile' ? '#ffb066' : '#7fc8ff', drag: 1, grav: 0, kind: 'smoke' });
        }
        if (q >= 1) {
          if (p.kind === 'missile') { FX.explosion(p.tx, p.ty, 1.6); App.audio && App.audio.play('boom', 0.8); }
          else if (p.kind === 'drone') { FX.explosion(p.tx, p.ty, 0.8); }
          else if (p.kind === 'shell') { FX.explosion(p.tx, p.ty, 0.55); }
          else if (p.kind === 'tracer') { FX.burst(p.tx, p.ty, { n: 3, power: 0.3, colors: ['#ffe1a0', '#ffb066'] }); }
          projs.splice(i, 1);
        }
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i]; t.t += dt; if (t.t > t.life) texts.splice(i, 1);
      }
      for (let i = zones.length - 1; i >= 0; i--) {
        const z = zones[i]; z.life -= dt;
        if (z.life <= 0) { zones.splice(i, 1); continue; }
        if (z.type === 'fire' && Math.random() < dt * 6) {
          FX.burst(z.x + U.rnd(-z.r, z.r) * 0.7, z.y + U.rnd(-z.r, z.r) * 0.7, { n: 2, power: 0.35, colors: ['#ffb347', '#ff6b35', '#8a3b28'], life: 0.7 });
        }
        if (z.type === 'rad' && Math.random() < dt * 2) {
          addParticle({ x: z.x + U.rnd(-z.r, z.r) * .6, y: z.y + U.rnd(-z.r, z.r) * .6, vx: 0, vy: -8, life: U.rnd(.8, 2), size: U.rnd(1.5, 3), col: '#9dff9d', drag: .3, grav: 0, kind: 'glow' });
        }
      }
      shake = Math.max(0, shake - dt * 34);
      flash = Math.max(0, flash - dt * 1.7);
    },

    draw(ctx, cam, W, H) {
      const s = cam.z, ox = W / 2 - cam.x * s, oy = H / 2 - cam.y * s;
      const sx = wx => wx * s + ox, sy = wy => wy * s + oy;
      // воронки
      for (const c of craters) {
        const x = sx(c.x), y = sy(c.y), r = Math.max(1.5, c.r * s);
        if (x < -100 || y < -100 || x > W + 100 || y > H + 100) continue;
        ctx.globalAlpha = 0.35 * c.a;
        ctx.fillStyle = '#14100e';
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // зоны
      for (const z of zones) {
        const x = sx(z.x), y = sy(z.y), r = Math.max(2, z.r * s);
        ctx.save();
        if (z.type === 'rad') {
          ctx.globalAlpha = 0.16 + 0.06 * Math.sin(performance.now() / 400 + z.seed);
          ctx.fillStyle = '#7dff7d';
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.globalAlpha = .5; ctx.strokeStyle = '#9dff9d'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, r * .55, 0, TAU); ctx.stroke();
        } else if (z.type === 'fire') {
          ctx.globalAlpha = 0.28;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, '#ffcf6b'); g.addColorStop(1, 'rgba(255,80,20,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        } else if (z.type === 'plague') {
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = '#8fe36a';
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.globalAlpha = .6; ctx.strokeStyle = '#5fbf4a'; ctx.setLineDash([6, 8]);
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.restore();
      }
      // кольца
      for (const r of rings) {
        const a = 1 - r.t / r.life;
        ctx.globalAlpha = a * .75;
        ctx.strokeStyle = r.col; ctx.lineWidth = Math.max(1, r.w * a);
        ctx.beginPath(); ctx.arc(sx(r.x), sy(r.y), Math.max(1, r.r * s), 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // частицы
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        const a = Math.min(1, p.life / (p.max || 1));
        const x = sx(p.x), y = sy(p.y);
        if (x < -60 || y < -60 || x > W + 60 || y > H + 60) continue;
        const sz = Math.max(.7, p.size * (p.kind === 'smoke' || p.kind === 'mush' ? Math.max(.7, s * 2.2) : 1));
        ctx.globalAlpha = p.kind === 'smoke' ? a * 0.35 : a;
        ctx.fillStyle = p.col;
        if (p.kind === 'smoke' || p.kind === 'mush') {
          ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill();
        } else {
          ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // снаряды
      for (const p of projs) {
        if (p.t < 0) continue;
        const x = sx(p.x), y = sy(p.y);
        ctx.strokeStyle = p.col; ctx.lineWidth = p.kind === 'missile' ? 2.4 : 1.4;
        ctx.globalAlpha = .9;
        ctx.beginPath();
        const bx = sx(U.lerp(p.x0, p.tx, Math.max(0, p.t / p.dur - 0.14))), by = sy(U.lerp(p.y0, p.ty, Math.max(0, p.t / p.dur - 0.14)));
        ctx.moveTo(bx, by); ctx.lineTo(x, y); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // текст
      ctx.textAlign = 'center';
      for (const t of texts) {
        const a = 1 - t.t / t.life;
        ctx.globalAlpha = a;
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillStyle = t.col;
        ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3;
        ctx.strokeText(t.str, sx(t.x), sy(t.y) - t.t * 22);
        ctx.fillText(t.str, sx(t.x), sy(t.y) - t.t * 22);
      }
      ctx.globalAlpha = 1;
      if (flash > 0.01) {
        ctx.fillStyle = 'rgba(255,250,235,' + (flash * 0.85) + ')';
        ctx.fillRect(0, 0, W, H);
      }
    },

    counts() { return { parts: parts.length, projs: projs.length, zones: zones.length }; },
  };

  window.FX = FX;
})();
