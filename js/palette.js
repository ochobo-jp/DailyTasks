'use strict';

// ============================================================
//  コマンドパレット（Ctrl + K）
//  ToDo・ルーティン・リスト・コマンドをまとめて検索。見つからなければそのまま追加
// ============================================================

const paletteEl = $('#palette');
const paletteBackdrop = $('#paletteBackdrop');
const palInput = $('#palInput');
const pal = { entries: [], sel: 0 };

function openPalette(initial = '') {
  if (state.layout === 'mini') return;
  closeMenu();
  paletteEl.hidden = false;
  paletteBackdrop.hidden = false;
  $('#palIcon').innerHTML = ICON.search;
  palInput.value = initial;
  updatePalette();
  palInput.focus();
}

function closePalette() {
  if (paletteEl.hidden) return;
  paletteEl.hidden = true;
  paletteBackdrop.hidden = true;
}

function togglePalette() {
  if (paletteEl.hidden) openPalette();
  else closePalette();
}

// 一致の強さ。先頭一致 > 途中一致 > 順番どおりに文字が含まれる
function matchScore(text, q) {
  if (!q) return 1;
  const t = normalize(text);
  const i = t.indexOf(q);
  if (i === 0) return 4;
  if (i > 0) return 3;
  if (q.length < 2) return 0;
  let pos = 0;
  for (const ch of q) {
    pos = t.indexOf(ch, pos);
    if (pos < 0) return 0;
    pos++;
  }
  return 1;
}

function paletteCommands() {
  const c = (icon, label, run, kbd = '', keywords = '') => ({ group: 'コマンド', icon, label, run, kbd, keywords });
  const views = visibleViews().map((v, i) => c(v.icon, `${v.label}を開く`, () => switchView(v.id), `Ctrl+${i + 1}`, v.id));
  return [
    ...views,
    c('plus', '新しいリストを作る', () => openListSheet(null), '', 'list new'),
    c('timer', timer.running ? '集中タイマーを一時停止' : '集中タイマーを開始', () => (timer.running ? timerPause() : timerStart()), '', 'pomodoro focus'),
    c('expand', '集中モード（大きく表示）', openZen, '', 'zen focus'),
    c('pip', 'ミニ表示にする', () => window.api.setMini(true), '', 'mini'),
    c('music', prefs().bgm.on ? 'BGM をオフにする' : 'BGM をオンにする', () => {
      prefs().bgm.on = !prefs().bgm.on;
      if (!prefs().bgm.on) bgm.manual = false;
      save();
      bgmSync();
      toast(prefs().bgm.on ? `BGM：${bgmSound().name}（集中タイマーと一緒に流れます）` : 'BGM をオフにしました');
    }, '', 'bgm music sound'),
    c('sun', '天気をくわしく見る', openWeatherSheet, '', 'weather tenki'),
    c('sun', '天気の場所を変える', openPlaceSheet, '', 'weather place location'),
    c('music', 'BGM を選ぶ', () => openBgmMenu(innerWidth / 2 - 150, 90), '', 'bgm music rain lofi celtic'),
    c('moon', isDarkNow() ? '明るい色にする' : '夜モード（暗い色）にする', () => setDarkMode(!isDarkNow()), '', 'dark theme night'),
    ...STYLES.map((s) => c('paint', `スタイル：${s.name}`, () => { setStyle(s.id); renderAll(); toast(`スタイルを「${s.name}」にしました`); }, '', `style theme ${s.id}`)),
    c('expand', '全画面の切り替え', () => window.api.toggleFullScreen(), 'F11', 'fullscreen'),
    c('pin', state.settings.alwaysOnTop ? '最前面の固定を解除' : '最前面に固定', togglePin, '', 'pin top'),
    c('calendar', prefs().calMode === 'week' ? 'カレンダーを月表示にする' : 'カレンダーを週表示にする', () => {
      prefs().calMode = prefs().calMode === 'week' ? 'month' : 'week';
      save();
      switchView('calendar');
    }, '', 'week month'),
    c('arrowRight', '期限切れをすべて今日にする', () => actions['overdue-to-today'](), '', 'overdue'),
    c('undo', '元に戻す', doUndo, 'Ctrl+Z', 'undo'),
    c('redo', 'やり直す', doRedo, 'Ctrl+Y', 'redo'),
    c('gear', '設定を開く', openSettings, '', 'settings'),
    c('keyboard', 'ショートカット一覧', openHelp, '?', 'help keys'),
    c('download', 'バックアップを保存', exportBackup, '', 'export backup'),
    c('upload', 'バックアップを読み込む', importBackup, '', 'import'),
  ];
}

function todoEntry(t) {
  const sub = [t.done ? '完了' : t.due ? relDate(t.due, state.today) : '期限なし', t.time, listById(t.listId)?.name].filter(Boolean).join(' · ');
  return {
    group: 'ToDo',
    iconHtml: `<span class="pal-check ${t.done ? 'done' : ''}">${ICON.check}</span>`,
    label: t.title, sub, run: () => openTodoSheet(t),
  };
}

function paletteEntries(raw) {
  const q = normalize(raw.trim());
  const out = [];
  const pick = (items, getText, limit) => items
    .map((x) => ({ x, s: matchScore(getText(x), q) }))
    .filter((m) => m.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((m) => m.x);

  if (!q) {
    // 何も入力していないとき：今日のタスクとよく使うコマンド
    const { overdue, due } = todayTodos();
    [...overdue, ...due].slice(0, 6).forEach((t) => out.push({ ...todoEntry(t), group: '今日の ToDo' }));
    paletteCommands().slice(0, 12).forEach((c) => out.push(c));
    return out;
  }

  const open = state.data.todos.filter((t) => !t.done);
  const done = state.data.todos.filter((t) => t.done);
  const text = (t) => `${t.title} ${t.note} ${t.subtasks.map((s) => s.title).join(' ')} ${listById(t.listId)?.name || ''}`;
  pick(open, text, 10).forEach((t) => out.push(todoEntry(t)));
  pick(done, text, 4).forEach((t) => out.push(todoEntry(t)));
  pick(state.data.routines, (r) => r.title, 6).forEach((r) => out.push({
    group: 'ルーティン', icon: 'repeat', label: r.title, sub: scheduleLabel(r), run: () => openRoutineSheet(r),
  }));
  if (prefs().features.someday) {
    pick(state.data.someday, (x) => `${x.title} ${x.note} ${x.steps.map((s) => s.title).join(' ')}`, 6).forEach((x) => out.push({
      group: 'いつか', iconHtml: `<span class="pal-emoji">${x.emoji || '✨'}</span>`, label: x.title,
      sub: x.status === 'done' ? '叶った' : x.target ? targetLabel(x.target) : HORIZONS.find((h) => h.id === x.horizon).name,
      run: () => openSomedaySheet(x),
    }));
  }
  if (prefs().features.school) {
    pick(school().subjects, (s) => `${s.name} ${s.room} ${s.teacher}`, 4).forEach((s) => out.push({
      group: '科目', iconHtml: `<i class="list-mini big" style="background:${s.color}"></i>`, label: s.name,
      sub: subjectSlots(s.id) || '', run: () => openSubjectSheet(s),
    }));
  }
  pick(state.data.lists, (l) => l.name, 4).forEach((l) => out.push({
    group: 'リスト', iconHtml: `<i class="list-mini big" style="background:${l.color}"></i>`, label: l.name,
    sub: `${state.data.todos.filter((t) => !t.done && t.listId === l.id).length} 件`,
    run: () => { state.filter.listId = l.id; switchView('todo', { keepFilter: true }); },
  }));
  pick(paletteCommands(), (c) => `${c.label} ${c.keywords}`, 6).forEach((c) => out.push(c));

  // 最後に「追加」。何も見つからなければこれが選ばれる
  const p = parseQuick(raw, state.today);
  const where = p.repeat ? `🔁 ${scheduleText(p.repeat)}` : `📅 ${p.due ? relDate(p.due, state.today) : state.view === 'calendar' ? relDate(state.calSelected, state.today) : '今日'}`;
  const desc = [where, p.time && `⏰ ${p.time}`, p.listName && `# ${p.listName}`, p.priority && `優先度 ${PRIORITY[p.priority].label}`].filter(Boolean).join('　');
  out.push({
    group: '追加', icon: 'plus', label: `「${p.title}」を${p.repeat ? 'ルーティン' : ' ToDo '}に追加`, sub: desc,
    run: () => addFromText(raw, { source: 'palette' }),
  });
  return out;
}

function updatePalette() {
  pal.entries = paletteEntries(palInput.value);
  pal.sel = 0;
  renderPaletteList();
}

function renderPaletteList() {
  let html = '';
  let group = null;
  pal.entries.forEach((en, i) => {
    if (en.group !== group) { html += `<div class="pal-group">${en.group}</div>`; group = en.group; }
    html += `<button class="pal-item ${i === pal.sel ? 'sel' : ''}" data-i="${i}" role="option" aria-selected="${i === pal.sel}">
      <span class="pal-item-ic">${en.iconHtml || ICON[en.icon] || ''}</span>
      <span class="pal-label">${escapeHtml(en.label)}</span>
      ${en.sub ? `<span class="pal-sub">${escapeHtml(en.sub)}</span>` : ''}
      ${en.kbd ? `<kbd>${en.kbd}</kbd>` : ''}
    </button>`;
  });
  $('#palList').innerHTML = html || '<div class="pal-empty">入力すると検索できます</div>';
  $('#palList .pal-item.sel')?.scrollIntoView({ block: 'nearest' });
}

function selectPalette(i) {
  if (!pal.entries.length) return;
  pal.sel = (i + pal.entries.length) % pal.entries.length;
  $$('#palList .pal-item').forEach((el) => {
    const on = Number(el.dataset.i) === pal.sel;
    el.classList.toggle('sel', on);
    el.setAttribute('aria-selected', String(on));
    if (on) el.scrollIntoView({ block: 'nearest' });
  });
}

function runPalette(i) {
  const en = pal.entries[i];
  if (!en) return;
  closePalette();
  checkpoint();
  en.run();
}

palInput.addEventListener('input', updatePalette);
palInput.addEventListener('keydown', (e) => {
  if (e.isComposing) return;
  if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); selectPalette(pal.sel + 1); }
  else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) { e.preventDefault(); selectPalette(pal.sel - 1); }
  else if (e.key === 'Enter') { e.preventDefault(); runPalette(pal.sel); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePalette(); }
});
$('#palList').addEventListener('mousemove', (e) => {
  const el = e.target.closest('.pal-item');
  if (el && Number(el.dataset.i) !== pal.sel) selectPalette(Number(el.dataset.i));
});
$('#palList').addEventListener('click', (e) => {
  const el = e.target.closest('.pal-item');
  if (el) runPalette(Number(el.dataset.i));
});
paletteBackdrop.addEventListener('click', closePalette);
