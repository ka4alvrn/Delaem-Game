/* ЯДРО: утилиты, проекция, математика, шина событий */
(function () {
  const R = Math.PI / 180;
  const X0 = -18000, X1 = 18000;
  const millerY = lat => -1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * Math.max(-89.5, Math.min(89.5, lat)) * R)) * (180 / Math.PI) * 100;
  const YCUT = millerY(-58);
  const projYRaw = lat => { const y = millerY(lat); return y > YCUT ? YCUT + (y - YCUT) * 0.42 : y; };
  const Y0 = projYRaw(90), Y1 = projYRaw(-90); // Y0 < 0 < Y1

  const U = {
    R, X0, X1, Y0, Y1,
    WM: X1 - X0, HM: Y1 - Y0,
    proj(lon, lat) { return [Math.round(lon * 100), Math.round(projYRaw(lat))]; },
    unprojX: x => x / 100,
    unprojLat(y) {
      let yy = y;
      if (yy > YCUT) yy = YCUT + (yy - YCUT) / 0.42;
      const t = Math.exp(-yy / 100 * R / 1.0); // y = -1.25*ln(tan(..))*57.2958*100
      return (Math.atan(Math.exp(-yy / 100 * Math.PI / 180 / 1.25)) - Math.PI / 4) / 0.4 / R;
    },
    clamp: (v, a, b) => v < a ? a : v > b ? b : v,
    lerp: (a, b, t) => a + (b - a) * t,
    rnd: (a, b) => a + Math.random() * (b - a),
    rndInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    chance: p => Math.random() < p,
    pick: a => a[Math.floor(Math.random() * a.length)],
    hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
    seed: s => { let x = s || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) / 4294967296); }; },
    // числа
    fmt(n, dec) {
      if (n == null || isNaN(n)) return '—';
      const a = Math.abs(n);
      const d = dec == null ? (a < 10 ? 1 : 0) : dec;
      if (a >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + ' млрд';
      if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace('.', ',') + ' млн';
      if (a >= 1e4) return (n / 1e3).toFixed(0) + ' тыс.';
      return n.toFixed(d).replace('.', ',');
    },
    money(n) {
      if (n >= 1000) return (n / 1000).toFixed(n >= 1e4 ? 0 : 1).replace('.', ',') + ' трлн $';
      return n.toFixed(n >= 100 ? 0 : 1).replace('.', ',') + ' млрд $';
    },
    armyTxt(n) { return n >= 1000 ? (n / 1000).toFixed(2).replace('.', ',') + ' млн' : Math.round(n) + ' тыс.'; },
    pct: n => Math.round(n) + '%',
    // цвета
    hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; },
    rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); },
    mix(a, b, t) { const A = U.hexToRgb(a), B = U.hexToRgb(b); return U.rgbToHex(U.lerp(A[0], B[0], t), U.lerp(A[1], B[1], t), U.lerp(A[2], B[2], t)); },
    shade(h, t) { return t >= 0 ? U.mix(h, '#ffffff', t) : U.mix(h, '#000000', -t); },
    hsl2hex(h, s, l) {
      const a = s * Math.min(l, 1 - l);
      const f = n => { const k = (n + h / 30) % 12; const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); return Math.round(255 * c).toString(16).padStart(2, '0'); };
      return '#' + f(0) + f(8) + f(4);
    },
    // геометрия
    pointInRings(x, y, rings) {
      let inside = false;
      for (const r of rings) {
        for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
          const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
          if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
      }
      return inside;
    },
    // DOM
    el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; },
    q: s => document.querySelector(s),
    qa: s => Array.from(document.querySelectorAll(s)),
    esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
    flag(iso2) {
      if (!iso2 || iso2.length !== 2 || !/^[A-Z]{2}$/.test(iso2)) return '<span class="flag-none">▰</span>';
      const A = 0x1F1E6;
      return '<span class="flag">' + String.fromCodePoint(A + wave(iso2.charCodeAt(0)), A + wave(iso2.charCodeAt(1))) + '</span>';
      function wave(c) { return c - 65; }
    },
    // календарь: день 0 = 1 января 1942
    MONTHS: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    MONTHS_N: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
    dayToDate(day, startYear) {
      const sy = startYear || 1942;
      const total = Math.max(0, Math.floor(day));
      const year = sy + Math.floor(total / 365);
      let d = total % 365;
      const md = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      let m = 0;
      while (d >= md[m]) { d -= md[m]; m++; }
      return { year, month: m, day: d + 1 };
    },
    dateTxt(day, startYear) {
      const d = U.dayToDate(day, startYear);
      return d.day + ' ' + U.MONTHS[d.month] + ' ' + d.year;
    },
    season(day, startYear) { const d = U.dayToDate(day, startYear); return d.month; },
  };

  // Простая шина событий
  const handlers = {};
  U.on = (name, fn) => { (handlers[name] = handlers[name] || []).push(fn); };
  U.emit = (name, data) => { (handlers[name] || []).forEach(fn => { try { fn(data); } catch (e) { console.warn(e); } }); };

  window.U = U;
  const DEF_SETTINGS = { historical: true, aiWars: true, events: true, labels: true, sound: true, shake: true };
  window.App = Object.assign(window.App || {}, { settings: Object.assign({}, DEF_SETTINGS), DEF_SETTINGS, world: null, cam: { x: 0, y: 0, z: 0.35 }, tool: null, sel: null, running: true, speed: 1 });
})();
