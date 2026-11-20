/* ИНТЕРФЕЙС */
(function () {
  const U = window.U;
  const UI = {
    panelTab: 'overview', modals: [], miniCanvas: null, hiddenMini: false,
  };

  const SPEEDS = [0, 1, 2, 5, 10, 20];
  const MAP_MODES = [
    ['political', 'Политическая', 'Цвета государств'],
    ['ideo', 'Идеологии', 'Строй и режимы'],
    ['bloc', 'Блоки', 'Союзы и коалиции'],
    ['war', 'Войны', 'Кто с кем воюет'],
    ['power', 'Военная мощь', 'Сила армий'],
    ['gdp', 'Экономика', 'ВВП стран'],
    ['pop', 'Население', 'Плотность людей'],
    ['tech', 'Технологии', 'Уровень развития'],
    ['stab', 'Стабильность', 'Риск беспорядков'],
    ['nuke', 'Ядерное оружие', 'Арсеналы'],
    ['nature', 'Природа', 'Климатические зоны'],
  ];

  UI.init = function () {
    UI.el = {
      date: U.q('#date'), era: U.q('#era'), speeds: U.q('#speeds'), pages: U.q('#tool-pages'),
      tools: U.q('#tool-grid'), country: U.q('#country'), toasts: U.q('#toasts'),
      modal: U.q('#modal-root'), ticker: U.q('#ticker'), mini: U.q('#minimap'),
    };
    UI.miniCanvas = UI.el.mini;
    UI.buildSpeeds();
    UI.buildPages();
    UI.buildTools();
    UI.buildTopbar();
    UI.bindMapUI();
    UI.measureBars();
    setTimeout(UI.measureBars, 260);
    UI.tick = 0;
    setInterval(UI.updateHud, 120);
    setInterval(() => { if (App.sel && !U.q('#modal-root').classList.contains('open')) UI.refreshCountry(); }, 900);
    window.addEventListener('resize', () => { UI.updateHud(); UI.measureBars(); });
    U.on('log', e => UI.ticker(e));
    U.on('eraPrompt', y => UI.eraPrompt(y));
    U.on('select', () => UI.refreshCountry());
  };

  // ---------- верхняя панель ----------
  UI.buildSpeeds = function () {
    const box = UI.el.speeds;
    box.innerHTML = '';
    SPEEDS.forEach(s => {
      const b = U.el('button', 'spd' + (App.speed === s ? ' on' : ''));
      b.dataset.speed = s;
      b.innerHTML = s === 0 ? '❚❚' : '×' + s;
      b.onclick = () => { Sim.setSpeed(s); UI.updateHud(); if (s > 0) Audio.resume(); };
      box.appendChild(b);
    });
  };

  UI.measureBars = function () {
    const b = U.q('#bottom');
    const de = document.documentElement;
    if (b && de && de.style) de.style.setProperty('--bar-h', (b.offsetHeight || 150) + 'px');
  };

  UI.buildTopbar = function () {
    U.q('#btn-menu').onclick = () => UI.menu();
    U.q('#btn-maps').onclick = () => UI.mapModes();
    U.q('#btn-log').onclick = () => UI.logModal();
    U.q('#btn-focus').onclick = () => {
      if (App.sel && App.world.states[App.sel]) {
        const st = App.world.states[App.sel];
        Render.focus(st.cen[0], st.cen[1], Math.max(App.cam.z, 0.9));
      } else {
        Render.focus(2000, -5200, 0.42);
      }
    };
    U.q('#btn-mini').onclick = () => {
      UI.hiddenMini = !UI.hiddenMini;
      U.q('#minimap-box').classList.toggle('hidden', UI.hiddenMini); UI.measureBars();
    };
  };

  UI.updateHud = function () {
    const w = App.world;
    if (!w) return;
    const d = U.dayToDate(w.day, w.startYear);
    UI.el.date.textContent = d.day + ' ' + U.MONTHS[d.month] + ' ' + d.year;
    const eraIdx = World.eraIndex(d.year);
    UI.el.era.textContent = App.pol.ERA_LABEL[eraIdx] + ' · эпоха ' + (eraIdx + 1) + '/7';
    U.qa('.spd').forEach(b => b.classList.toggle('on', +b.dataset.speed === App.speed));
    if (UI.tick++ % 8 === 0) UI.drawMinimap();
  };

  UI.ticker = function (e) {
    const t = UI.el.ticker;
    const div = U.el('div', 'tick-item ' + (e.type || ''));
    div.innerHTML = '<span class="tick-date">' + e.date + '</span> ' + U.esc(e.text);
    t.prepend(div);
    while (t.children.length > 3) t.lastChild.remove();
    setTimeout(() => div.classList.add('fade'), 6000);
  };

  // ---------- тулбар ----------
  UI.buildPages = function () {
    const box = UI.el.pages;
    box.innerHTML = '';
    Tools.pages.forEach(p => {
      const b = U.el('button', 'page-btn' + (p.id === 'state' ? ' on' : ''));
      b.dataset.page = p.id;
      b.innerHTML = (ICONS[p.icon] || '') + '<span>' + p.name + '</span>';
      b.onclick = () => {
        U.qa('.page-btn').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        UI.buildTools(p.id);
      };
      box.appendChild(b);
    });
  };

  UI.buildTools = function (page) {
    page = page || 'state';
    const box = UI.el.tools;
    box.innerHTML = '';
    Tools.list(page).forEach(t => {
      const b = U.el('button', 'tool-btn' + (Tools.active === t.id ? ' on' : ''));
      b.dataset.tool = t.id;
      b.innerHTML = (ICONS[t.icon] || '') + '<span>' + t.name + '</span>';
      b.onclick = () => {
        if (t.kind === 'panel') {
          if (!App.sel) { UI.toast('Сначала выберите страну', 'warn'); UI.selectTool('inspect'); return; }
          UI.panelTab = { ideo: 'rule', stability: 'rule', economy: 'rule', military: 'war', diplomacy: 'war', territory: 'war' }[t.id] || 'overview';
          UI.openCountry(App.sel);
          return;
        }
        UI.selectTool(t.id);
      };
      box.appendChild(b);
    });
  };

  UI.selectTool = function (id) {
    Tools.select(id);
    U.qa('.tool-btn').forEach(b => b.classList.toggle('on', b.dataset.tool === id));
    const d = Tools.get(id);
    if (d && d.kind === 'inspect') U.q('#map').classList.remove('strike-cursor');
    else U.q('#map').classList.add('strike-cursor');
  };

  UI.bindMapUI = function () {
    // миникарта
    const mini = UI.el.mini;
    const jump = ev => {
      const r = mini.getBoundingClientRect();
      const t = ev.touches ? ev.touches[0] : ev;
      Render.miniJump((t.clientX - r.left) / r.width * mini.width, (t.clientY - r.top) / r.height * mini.height);
    };
    mini.addEventListener('pointerdown', ev => { ev.stopPropagation(); try { mini.setPointerCapture(ev.pointerId); } catch (e) { } jump(ev); });
    mini.addEventListener('pointermove', ev => { if (ev.buttons) jump(ev); });
  };

  UI.drawMinimap = function () {
    if (UI.hiddenMini || !UI.miniCanvas || !App.world) return;
    Render.drawMini(UI.miniCanvas);
  };

  // ---------- карточка страны ----------
  UI.openCountry = function (id) {
    const st = App.world.states[id];
    if (!st || !st.alive) return;
    App.sel = id;
    UI.el.country.classList.add('open');
    UI.renderCountry();
  };

  UI.closeCountry = function () {
    UI.el.country.classList.remove('open');
  };

  UI.refreshCountry = function () {
    if (!App.sel) return;
    const st = App.world.states[App.sel];
    if (!st || !st.alive) { UI.closeCountry(); return; }
    if (UI.el.country.classList.contains('open')) UI.renderCountry();
  };

  UI.renderCountry = function () {
    const st = App.world.states[App.sel];
    if (!st) return;
    const P = App.pol;
    const ideo = P.IDEOLOGIES[st.ideo] || P.IDEOLOGIES.aut;
    const bloc = P.BLOCS[st.bloc] || P.BLOCS.neutral;
    const gdppc = st.gdp / Math.max(0.01, st.pop) * 1000;
    const wars = (st.wars || []).map(id => App.world.wars.find(w => w.id === id)).filter(Boolean);
    const overlord = st.overlord && App.world.states[st.overlord] ? App.world.states[st.overlord] : null;
    const rank = World.stateList.slice().sort((a, b) => World.power(b) - World.power(a)).findIndex(s => s.id === st.id) + 1;
    const tab = UI.panelTab;
    let body = '';

    if (tab === 'overview') {
      body = `
        <div class="stat-grid">
          ${UI.stat('Население', U.fmt(st.pop * 1e6, 0) + ' чел.')}
          ${UI.stat('ВВП', U.money(st.gdp))}
          ${UI.stat('ВВП на душу', '$' + Math.round(gdppc).toLocaleString('ru-RU'))}
          ${UI.stat('Армия', U.armyTxt(st.army) + ' чел.')}
          ${UI.stat('Техника', Math.round(st.tech) + ' / 100')}
          ${UI.stat('Площадь', U.fmt(st.area, 0) + ' км²')}
          ${UI.stat('Ядерный арсенал', st.nukes > 0 ? st.nukes + ' боеголовок' : 'нет')}
          ${UI.stat('Место в мире', '#' + rank)}
        </div>
        <div class="bar-row"><span>Стабильность</span><div class="bar"><i style="width:${st.stab}%;background:${st.stab > 60 ? '#4fbf76' : st.stab > 30 ? '#e0b23f' : '#d0503a'}"></i></div><b>${Math.round(st.stab)}%</b></div>
        <div class="bar-row"><span>Влияние</span><div class="bar"><i style="width:${U.clamp(World.power(st) / 40, 2, 100)}%;background:#5aa9e0"></i></div><b>${Math.round(World.power(st))}</b></div>
        <div class="chips">
          <span class="chip" style="background:${ideo.col}33;border-color:${ideo.col}">${ideo.name}</span>
          <span class="chip" style="background:${bloc.col}33;border-color:${bloc.col}">${bloc.name}</span>
          ${overlord ? '<span class="chip warn">Зависит от ' + U.esc(overlord.name) + '</span>' : ''}
          ${st.nukes > 0 ? '<span class="chip nuke">☢ ядерная держава</span>' : ''}
        </div>
        <div class="actions">
          <button class="act" data-act="focus">🎯 Приблизить</button>
          <button class="act" data-act="random_event">🎲 Случайное событие</button>
          <button class="act danger" data-act="nuke_self">☢ Ядерный удар</button>
        </div>
        <div class="neighbors"><b>Соседи:</b> ${UI.neighborChips(st)}</div>`;
    } else if (tab === 'rule') {
      body = `
        <div class="section-title">Идеология</div>
        <div class="ideo-grid">
          ${Object.entries(P.IDEOLOGIES).map(([k, v]) => `<button class="ideo-btn${st.ideo === k ? ' on' : ''}" data-act="ideo" data-val="${k}" style="--c:${v.col}"><i></i>${v.name}</button>`).join('')}
        </div>
        <div class="section-title">Управление</div>
        <div class="steppers">
          ${UI.stepper('Стабильность', 'stab', [['−10', -10], ['−5', -5], ['+5', 5], ['+10', 10]])}
          ${UI.stepper('Экономика', 'gdp', [['−10%', -0.1], ['−5%', -0.05], ['+5%', 0.05], ['+10%', 0.1]])}
          ${UI.stepper('Население', 'pop', [['−10%', -0.1], ['−5%', -0.05], ['+5%', 0.05], ['+10%', 0.1]])}
          ${UI.stepper('Армия', 'army', [['−20%', -0.2], ['−10%', -0.1], ['+10%', 0.1], ['+20%', 0.2]])}
        </div>
        <div class="actions">
          <button class="act" data-act="tech_up">🔬 +5 техники</button>
          <button class="act" data-act="nuke_add">☢ +10 боеголовок</button>
          <button class="act" data-act="rename">✏️ Переименовать</button>
          <button class="act" data-act="color">🎨 Цвет</button>
        </div>
        <div class="section-title danger-title">Опасные действия</div>
        <div class="actions">
          <button class="act danger" data-act="revolt">🔥 Переворот</button>
          <button class="act danger" data-act="civilwar">💥 Гражданская война</button>
          <button class="act danger" data-act="release" ${!st.overlord ? 'disabled' : ''}>🕊️ Независимость</button>
        </div>`;
    } else {
      const warsHtml = wars.length ? wars.map(w => {
        const foeSide = w.sides[0].includes(st.id) ? w.sides[1] : w.sides[0];
        const foes = foeSide.map(id => App.world.states[id]).filter(Boolean).map(s => s.name).join(', ');
        const prog = w.sides[0].includes(st.id) ? w.prog : -w.prog;
        return `<div class="war-item"><div><b>Война</b> против: ${U.esc(foes)}</div>
          <div class="bar small"><i style="width:${U.clamp(50 + prog / 2, 0, 100)}%;background:${prog >= 0 ? '#4fbf76' : '#d0503a'}"></i></div>
          <button class="mini-btn" data-act="peace">Заключить мир</button></div>`;
      }).join('') : '<div class="muted">Страна не участвует в войнах</div>';
      body = `
        <div class="section-title">Войны</div>
        <div class="wars">${warsHtml}</div>
        <div class="section-title">Дипломатия</div>
        <div class="actions">
          <button class="act" data-act="declare">⚔️ Объявить войну</button>
          <button class="act" data-act="annex_target">🏴 Поглотить соседа</button>
          <button class="act" data-act="annex_self">🔗 Присоединить к соседу</button>
          <button class="act" data-act="vassal">🏳️ Сделать вассалом</button>
        </div>
        <div class="neighbors"><b>Соседи:</b> ${UI.neighborChips(st)}</div>`;
    }

    UI.el.country.innerHTML = `
      <div class="panel-head" style="--c:${st.color}">
        <div class="flag-box">${U.flag(st.iso2)}</div>
        <div class="head-txt">
          <div class="c-name">${U.esc(st.name)}</div>
          <div class="c-sub">${ideo.name} · ${bloc.name}</div>
        </div>
        <button class="icon-btn close" data-act="close">✕</button>
      </div>
      <div class="panel-tabs">
        ${[['overview', 'Обзор'], ['rule', 'Правление'], ['war', 'Война']].map(([k, n]) => `<button class="ptab${tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}
      </div>
      <div class="panel-body">${body}</div>`;
  };

  UI.stat = (label, val) => `<div class="stat"><span>${label}</span><b>${val}</b></div>`;

  UI.stepper = (label, act, btns) => `<div class="stepper"><span>${label}</span><div>${btns.map(([t, v]) => `<button data-act="${act}" data-val="${v}">${t}</button>`).join('')}</div></div>`;

  UI.neighborChips = function (st) {
    const nb = World.neighbors(st.id).slice(0, 16);
    if (!nb.length) return '<span class="muted">нет</span>';
    return nb.map(id => {
      const s = App.world.states[id];
      if (!s) return '';
      return `<button class="nchip" data-neighbor="${id}"><i style="background:${s.color}"></i>${U.esc(s.name)}</button>`;
    }).join('');
  };

  // делегирование кликов в карточке
  document.addEventListener('click', ev => {
    const tabBtn = ev.target.closest('[data-tab]');
    if (tabBtn) { UI.panelTab = tabBtn.dataset.tab; UI.renderCountry(); return; }
    const nbtn = ev.target.closest('[data-neighbor]');
    if (nbtn) { UI.openCountry(nbtn.dataset.neighbor); Render.focus(App.world.states[nbtn.dataset.neighbor].cen[0], App.world.states[nbtn.dataset.neighbor].cen[1], Math.max(App.cam.z, .7)); return; }
    const b = ev.target.closest('#country [data-act]');
    if (!b) return;
    const st = App.world.states[App.sel];
    if (!st) return;
    const act = b.dataset.act;
    const val = b.dataset.val;
    switch (act) {
      case 'close': UI.closeCountry(); break;
      case 'focus': { const p = st.capital || st.cen; Render.focus(p[0], p[1], Math.max(App.cam.z, 1.2)); break; }
      case 'random_event': Sim.randomEvent(); break;
      case 'nuke_self': Tools.stateAction(st.id, 'nuke_self'); break;
      case 'ideo': Tools.stateAction(st.id, 'ideo', val); break;
      case 'stab': case 'gdp': case 'pop': case 'army': Tools.stateAction(st.id, act, +val); break;
      case 'tech_up': Tools.stateAction(st.id, 'tech', 5); break;
      case 'nuke_add': Tools.stateAction(st.id, 'nuke', 10); break;
      case 'rename': UI.prompt('Переименовать страну', st.name, v => { Tools.stateAction(st.id, 'rename', v); UI.refreshCountry(); }); break;
      case 'color': UI.colorPicker(st); break;
      case 'revolt': Sim.revolt(st); UI.refreshCountry(); break;
      case 'civilwar': Tools.stateAction(st.id, 'civilwar'); UI.refreshCountry(); break;
      case 'release': Tools.stateAction(st.id, 'release'); UI.refreshCountry(); break;
      case 'peace': Tools.stateAction(st.id, 'peace_state'); UI.refreshCountry(); break;
      case 'declare': UI.pickState('Объявить войну', id => id !== st.id && !!World.war(st.id, id) === false, id => { Tools.stateAction(st.id, 'war', id); UI.refreshCountry(); }, true); break;
      case 'annex_target': UI.pickState('Поглотить страну', id => id !== st.id, id => { Tools.stateAction(id, 'annex_into', st.id); UI.refreshCountry(); }, true); break;
      case 'annex_self': UI.pickState('Присоединить ' + st.name + ' к...', id => id !== st.id, id => { Tools.stateAction(st.id, 'annex_into', id); UI.refreshCountry(); }, true); break;
      case 'vassal': UI.pickState('Сделать вассалом', id => id !== st.id, id => { Tools.stateAction(id, 'puppet_of', st.id); UI.refreshCountry(); }, true); break;
    }
  });

  UI.colorPicker = function (st) {
    const cols = ['#c0392b', '#e67e22', '#f1c40f', '#2ecc71', '#16a085', '#3498db', '#8e44ad', '#e84393', '#7f8c8d', '#2c3e50', '#d35400', '#27ae60'];
    UI.modal('<div class="cc-grid">' + cols.map(c => `<button class="cc" data-col="${c}" style="background:${c}"></button>`).join('') + '</div>', { title: 'Цвет ' + U.esc(st.name), onOpen: root => {
      root.querySelectorAll('.cc').forEach(b => b.onclick = () => { Tools.stateAction(st.id, 'color', b.dataset.col); UI.closeModal(); UI.refreshCountry(); });
    } });
  };

  // ---------- модальные окна ----------
  UI.modal = function (html, o) {
    o = o || {};
    const root = UI.el.modal;
    root.innerHTML = `<div class="modal-card ${o.wide ? 'wide' : ''}" style="${o.maxH ? 'max-height:' + o.maxH : ''}">
      ${o.title ? '<div class="modal-title">' + o.title + '<button class="icon-btn" data-close>✕</button></div>' : ''}
      <div class="modal-body">${html}</div></div>`;
    root.classList.add('open');
    root.querySelectorAll('[data-close]').forEach(b => b.onclick = () => UI.closeModal());
    root.onclick = ev => { if (ev.target === root) UI.closeModal(); };
    if (o.onOpen) o.onOpen(root.querySelector('.modal-body'), root);
    return root;
  };

  UI.closeModal = function () { UI.el.modal.classList.remove('open'); UI.el.modal.innerHTML = ''; if (App.world && App.speed === 0 && !Sim.eraPending) { /* остаёмся на паузе */ } };

  UI.confirm = function (title, text, cb, danger) {
    UI.modal(`<p class="modal-text">${text}</p><div class="modal-actions">
      <button class="btn ghost" data-close>Отмена</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-ok>Подтвердить</button></div>`,
      { title: U.esc(title), onOpen: (body) => { body.querySelector('[data-ok]').onclick = () => { UI.closeModal(); cb(); }; } });
  };

  UI.prompt = function (title, value, cb) {
    UI.modal(`<input class="inp" id="prompt-inp" value="${U.esc(value || '')}" maxlength="24">
      <div class="modal-actions"><button class="btn ghost" data-close>Отмена</button><button class="btn primary" data-ok>Готово</button></div>`,
      { title: U.esc(title), onOpen: (body) => {
        const inp = body.querySelector('#prompt-inp');
        inp.focus();
        body.querySelector('[data-ok]').onclick = () => { UI.closeModal(); cb(inp.value); };
        inp.onkeydown = e => { if (e.key === 'Enter') { UI.closeModal(); cb(inp.value); } };
      } });
  };

  UI.pickState = function (title, filter, cb, all) {
    let list = World.stateList.filter(s => s.alive && (all || !filter || true));
    if (filter) list = list.filter(s => { try { return filter(s.id); } catch (e) { return true; } });
    // сортировка по мощи
    list = list.slice().sort((a, b) => World.power(b) - World.power(a)).slice(0, 60);
    UI.modal(`<div class="pick-list">${list.map(s => `<button class="pick-item" data-id="${s.id}">
        <i style="background:${s.color}"></i><span>${U.esc(s.name)}</span>
        <em>${U.fmt(s.pop * 1e6, 0)}</em></button>`).join('')}</div>`,
      { title: U.esc(title), wide: true, onOpen: body => {
        body.querySelectorAll('.pick-item').forEach(b => b.onclick = () => { UI.closeModal(); cb(b.dataset.id); });
      } });
  };

  // ---------- меню ----------
  UI.menu = function () {
    const w = App.world;
    const s = App.settings;
    UI.modal(`
      <div class="menu-grid">
        <button class="menu-item" data-m="resume">▶ Продолжить</button>
        <button class="menu-item" data-m="save">💾 Сохранить</button>
        <button class="menu-item" data-m="load">📂 Загрузить</button>
        <button class="menu-item" data-m="maps">🗺 Карта мира</button>
        <button class="menu-item" data-m="log">📜 История событий</button>
        <button class="menu-item" data-m="help">❓ Как играть</button>
        <button class="menu-item" data-m="settings">⚙️ Настройки</button>
        <button class="menu-item danger" data-m="start">🏠 В главное меню</button>
      </div>
      <div class="menu-foot">
        <label class="tgl"><input type="checkbox" id="tgl-hist" ${s.historical ? 'checked' : ''}> Исторические границы</label>
        <label class="tgl"><input type="checkbox" id="tgl-ai" ${s.aiWars ? 'checked' : ''}> Войны ИИ</label>
      </div>`,
      { title: 'Меню · ' + (w ? w.startYear : '') , onOpen: body => {
        body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
          const m = b.dataset.m;
          if (m === 'resume') UI.closeModal();
          if (m === 'save') { UI.saveDialog(); }
          if (m === 'load') { UI.loadDialog(); }
          if (m === 'maps') UI.mapModes();
          if (m === 'log') UI.logModal();
          if (m === 'help') UI.help();
          if (m === 'settings') UI.settings();
          if (m === 'start') { UI.closeModal(); Sim.setSpeed(0); UI.showStart(true); }
        });
        body.querySelector('#tgl-hist').onchange = e => { App.settings.historical = e.target.checked; UI.saveSettings(); UI.toast(e.target.checked ? 'Исторические границы включены' : 'Границы зафиксированы', 'hint'); };
        body.querySelector('#tgl-ai').onchange = e => { App.settings.aiWars = e.target.checked; UI.saveSettings(); };
      } });
  };

  UI.mapModes = function () {
    UI.modal('<div class="mode-list">' + MAP_MODES.map(([id, name, desc]) =>
      `<button class="mode-item${Render.mode === id ? ' on' : ''}" data-mode="${id}">
        <b>${name}</b><span>${desc}</span></button>`).join('') + '</div>',
      { title: 'Режим карты', onOpen: body => {
        body.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
          Render.mode = b.dataset.mode;
          UI.closeModal();
          UI.toast('Режим карты: ' + b.querySelector('b').textContent, 'hint');
        });
      } });
  };

  UI.logModal = function () {
    const w = App.world;
    const items = (w.log || []).slice(0, 120).map(e => `<div class="log-row ${e.type}"><span>${e.date}</span>${U.esc(e.text)}</div>`).join('');
    UI.modal(`<div class="log-list">${items || '<div class="muted">Пока ничего не произошло</div>'}</div>`, { title: 'История мира', wide: true });
  };

  UI.settings = function () {
    const s = App.settings;
    UI.modal(`
      <div class="set-row"><label>Звук</label><button class="switch ${!Audio.muted ? 'on' : ''}" data-s="sound"><i></i></button></div>
      <div class="set-row"><label>Исторические границы</label><button class="switch ${s.historical ? 'on' : ''}" data-s="historical"><i></i></button></div>
      <div class="set-row"><label>Войны ИИ</label><button class="switch ${s.aiWars ? 'on' : ''}" data-s="aiWars"><i></i></button></div>
      <div class="set-row"><label>Случайные события</label><button class="switch ${s.events ? 'on' : ''}" data-s="events"><i></i></button></div>
      <div class="set-row"><label>Подписи стран</label><button class="switch ${s.labels ? 'on' : ''}" data-s="labels"><i></i></button></div>
      <div class="set-row"><label>Мини-карта</label><button class="switch ${!UI.hiddenMini ? 'on' : ''}" data-s="minimap"><i></i></button></div>
      <div class="set-row"><label>Тряска экрана</label><button class="switch ${s.shake ? 'on' : ''}" data-s="shake"><i></i></button></div>
      <div class="about">Земля 1942 — песочница. Все исторические границы приблизительны и служат для игры.</div>`,
      { title: 'Настройки', onOpen: body => {
        body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
          const k = b.dataset.s;
          if (k === 'sound') { const m = Audio.toggle(); b.classList.toggle('on', !m); s.sound = !m; }
          else if (k === 'minimap') { UI.hiddenMini = !UI.hiddenMini; U.q('#minimap-box').classList.toggle('hidden', UI.hiddenMini); b.classList.toggle('on', !UI.hiddenMini); }
          else { s[k] = !s[k]; b.classList.toggle('on', s[k]); }
          if (k === 'labels') Render.showLabels = s.labels;
          UI.saveSettings();
        });
      } });
  };

  UI.help = function () {
    UI.modal(`
      <div class="help">
        <p><b>Вы — бог-наблюдатель.</b> Мир живёт сам: страны растут, воюют и заключают союзы. Ваша задача — направлять историю.</p>
        <h4>Управление картой</h4>
        <ul>
          <li>Один палец — перемещение карты</li>
          <li>Два пальца — масштаб</li>
          <li>Тап по стране — карточка государства</li>
          <li>Мини-карта внизу справа — быстрый переход</li>
        </ul>
        <h4>Время</h4>
        <ul>
          <li>Скорость ×1…×20 в верхней панели, ❚❚ — пауза</li>
          <li>В историческом режиме границы перестраиваются в 1945, 1960, 1994, 2000, 2010 и 2024 годах</li>
        </ul>
        <h4>Инструменты</h4>
        <ul>
          <li><b>Государство</b> — идеология, экономика, армия, дипломатия, аннексии</li>
          <li><b>Армия</b> — спавн дивизий, дронов, флота, ПВО, ядерных зарядов</li>
          <li><b>Разрушение</b> — взрывы, обстрелы, ядерные удары, катастрофы</li>
          <li><b>Созидание</b> — города, заводы, крепости, очистка заражений</li>
          <li><b>Мир</b> — глобальные сценарии: мир, апокалипсис, золотой век</li>
        </ul>
        <p class="muted">Совет: включите паузу, поставьте «Ядерный удар» и нажмите на столицу — это весело.</p>
      </div>`, { title: 'Как играть', wide: true });
  };

  UI.saveDialog = function () {
    UI.modal(`<div class="menu-grid">
      ${[1, 2, 3].map(i => `<button class="menu-item" data-slot="${i}">💾 Слот ${i} <em>${UI.slotInfo('earth_save_' + i)}</em></button>`).join('')}
      </div><div class="modal-actions"><button class="btn primary" data-auto>💾 Быстрое сохранение</button></div>`,
      { title: 'Сохранить игру', onOpen: body => {
        body.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { UI.doSave('earth_save_' + b.dataset.slot); UI.closeModal(); });
        body.querySelector('[data-auto]').onclick = () => { UI.doSave('earth_save_auto'); UI.closeModal(); };
      } });
  };

  UI.slotInfo = function (key) {
    try { const d = JSON.parse(localStorage.getItem(key)); return d ? (d.startYear + ', день ' + d.day) : 'пусто'; } catch (e) { return 'пусто'; }
  };

  UI.doSave = function (key) {
    try {
      localStorage.setItem(key, JSON.stringify(World.serialize()));
      UI.toast('Игра сохранена', 'ok');
    } catch (e) { UI.toast('Ошибка сохранения', 'warn'); }
  };

  UI.loadDialog = function () {
    UI.modal(`<div class="menu-grid">
      ${['earth_save_auto', 'earth_save_1', 'earth_save_2', 'earth_save_3'].map(k =>
        `<button class="menu-item" data-key="${k}">📂 ${k.replace('earth_save_', '').replace('auto', 'Автосохранение')} <em>${UI.slotInfo(k)}</em></button>`).join('')}
      </div>`, { title: 'Загрузить игру', onOpen: body => {
        body.querySelectorAll('[data-key]').forEach(b => b.onclick = () => {
          const raw = localStorage.getItem(b.dataset.key);
          if (!raw) { UI.toast('Пустой слот', 'warn'); return; }
          try {
            const data = JSON.parse(raw);
            UI.closeModal();
            UI.hideStart();
            Sim.setSpeed(0);
            (window.loadEraData ? window.loadEraData(data.eraYear) : Promise.resolve()).then(() => {
              World.deserialize(data);
              FX.clear();
              Render.buildCache();
              UI.buildSpeeds();
              UI.toast('Игра загружена', 'ok');
              UI.closeCountry();
            }).catch(() => UI.toast('Не удалось загрузить карту эпохи', 'warn'));
          } catch (e) { console.error(e); UI.toast('Файл повреждён', 'warn'); }
        });
      } });
  };

  UI.eraPrompt = function (year) {
    Sim.paused = true;
    UI.modal(`<p class="modal-text">Наступает <b>${year}</b> год. Мировые границы должны быть перестроены по историческим данным.</p>
      <p class="modal-text muted">Ваши завоевания и изменения границ будут сброшены, если вы примените историю. Статистика государств сохранится.</p>
      <div class="modal-actions column">
        <button class="btn primary" data-a="apply">🕰️ Применить историю (${year})</button>
        <button class="btn ghost" data-a="keep">🗺 Оставить мои границы</button>
      </div>`, { title: 'Смена эпохи', onOpen: body => {
      body.querySelector('[data-a="apply"]').onclick = () => {
        UI.closeModal(); Sim.paused = false;
        UI.toast('Загрузка эпохи ' + year + '…', 'hint');
        window.applyEraAsync(year, false).then(() => {
          Sim.setSpeed(App.speed || 1); UI.buildSpeeds(); UI.closeCountry();
          UI.toast('Эпоха ' + year + ' началась', 'ok');
        });
      };
      body.querySelector('[data-a="keep"]').onclick = () => { UI.closeModal(); Sim.paused = false; App.settings.historical = false; Sim.applyEra(year, true); UI.toast('Границы сохранены, исторический режим выключен', 'hint'); };
    } });
  };

  UI.toast = function (text, type) {
    const t = U.el('div', 'toast ' + (type || 'info'), U.esc(text));
    UI.el.toasts.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
    while (UI.el.toasts.children.length > 4) UI.el.toasts.firstChild.remove();
    if (type === 'nuke') Audio.play('alarm');
    else if (type === 'ok') Audio.play('chime');
    else Audio.play('click');
  };

  // ---------- стартовый экран ----------
  UI.showStart = function (fromMenu) {
    const scr = U.q('#start');
    scr.classList.add('show');
    const saves = ['earth_save_auto', 'earth_save_1', 'earth_save_2', 'earth_save_3'].map(k => [k, UI.slotInfo(k)]).filter(x => x[1] !== 'пусто');
    U.q('#start-continue').disabled = !saves.length;
    U.q('#start-continue').onclick = () => {
      const key = saves.length ? saves[0][0] : null;
      if (!key) return;
      const data = JSON.parse(localStorage.getItem(key));
      UI.hideStart();
      (window.loadEraData ? window.loadEraData(data.eraYear) : Promise.resolve()).then(() => {
        World.deserialize(data);
        FX.clear();
        Render.buildCache();
        UI.buildSpeeds();
        Sim.setSpeed(1);
      }).catch(() => UI.toast('Не удалось загрузить сохранение', 'warn'));
    };
    if (fromMenu) Sim.setSpeed(0);
    const c = App.world ? App.world.startYear : 1942;
    U.qa('.era-card').forEach(b => b.classList.toggle('on', +b.dataset.year === c));
  };

  UI.hideStart = function () {
    U.q('#start').classList.remove('show');
  };

  UI.buildStart = function () {
    const wrap = U.q('#era-cards');
    const desc = {
      1942: 'Мир в огне. Ось контролирует Европу, союзники собирают силы.',
      1945: 'Война окончена, начинается раздел мира между сверхдержавами.',
      1960: 'Две системы, ядерный шантаж и распад колониальных империй.',
      1994: 'После холодной войны — новый, ещё не устоявшийся порядок.',
      2000: 'Глобализация, терроризм и подъём новых экономик.',
      2010: 'Многополярный мир, санкции и локальные конфликты.',
      2024: 'Современный мир. Напряжение на всех континентах.',
    };
    wrap.innerHTML = App.pol.ERAS.map((y, i) => `
      <button class="era-card${y === 1942 ? ' on' : ''}" data-year="${y}">
        <span class="era-year">${y}</span>
        <span class="era-name">${App.pol.ERA_LABEL[i]}</span>
        <span class="era-desc">${desc[y]}</span>
      </button>`).join('');
    wrap.querySelectorAll('.era-card').forEach(b => b.onclick = () => {
      wrap.querySelectorAll('.era-card').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      App.startYear = +b.dataset.year;
    });
    App.startYear = 1942;
    U.q('#start-help').onclick = () => UI.help();
    U.q('#start-settings').onclick = () => UI.settings();
  };

  UI.startGame = function (year) {
    UI.hideStart();
    Sim.paused = false;
    FX.clear();
    World.buildStates(year);
    World.log = App.world.log;
    World.addLog('🌍 Мир ' + year + ' года создан. Вы — бог-наблюдатель.', 'era', true);
    Render.buildCache();
    Render.focus(2600, -5200, window.innerWidth < 520 ? 0.075 : 0.062);
    Sim.setSpeed(1);
    UI.buildSpeeds();
    UI.closeCountry();
    if (App.sel) U.emit('select', App.sel);
    UI.toast('Нажмите на страну, чтобы начать', 'hint');
  };

  UI.saveSettings = function () {
    try { localStorage.setItem('earth_settings', JSON.stringify(App.settings)); } catch (e) { }
  };

  window.UI = UI;
})();
