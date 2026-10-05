'use strict';

// ============================================================
//  レイアウト（ウィンドウの幅で切り替え）
// ============================================================

function layoutFor(width) {
  if (state.windowState.mini) return 'mini';
  if (width >= 1180) return 'xwide';
  if (width >= 760) return 'wide';
  return 'compact';
}

function applyLayout() {
  const layout = layoutFor(innerWidth);
  const cls = `layout-${layout}${state.windowState.fullScreen ? ' fullscreen' : ''}`;
  if (layout === state.layout && document.body.className === cls) return false;
  state.layout = layout;
  document.body.className = cls;
  if (layout === 'xwide' && state.view === 'focus') state.view = 'today';
  return true;
}

window.addEventListener('resize', debounce(() => { if (applyLayout()) renderAll(); }, 60));

// ============================================================
//  アニメーション（行の並び替えなどをなめらかに）
// ============================================================

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function transition(update) {
  if (!document.startViewTransition || state.noTransitions || reduceMotion.matches || state.layout === 'mini' || document.hidden) {
    update();
    return Promise.resolve();
  }
  const vt = document.startViewTransition(update);
  vt.ready.catch(() => { /* 途中で次のアニメーションに切り替わっただけ */ });
  vt.finished.catch(() => {});
  return vt.updateCallbackDone.catch((err) => { console.error(err); });
}

// ============================================================
//  画面の切り替え
// ============================================================

function switchView(view, { keepFilter = false } = {}) {
  // 全画面のときは右パネルにタイマーがあるので、集中は集中モードで開く
  if (view === 'focus' && state.layout === 'xwide') { openZen(); return; }
  const def = VIEWS.find((v) => v.id === view);
  if (!def || (def.feature && !prefs().features[def.feature])) view = 'today';
  if (!keepFilter && view === 'todo') state.filter.listId = null;
  state.view = view;
  try { localStorage.setItem('view', view); } catch { /* 保存できなくても困らない */ }
  content.scrollTop = 0;
  document.body.scrollTop = 0;   // iPhone は画面全体がスクロールする
  closeSheet();
  closeMenu();
  renderAll();
}

// ============================================================
//  追加・削除
// ============================================================

function addFromText(text, { source = 'bar' } = {}) {
  text = text.trim();
  if (!text) return null;
  if (source !== 'paste') checkpoint();

  // くらし：開いているタブ（買い物・お金・メモ・カウントダウン）に追加する
  if (state.view === 'life' && source !== 'palette') {
    const made = lifeAddFromText(text);
    if (!made) return null;
    if (source !== 'paste') { save(); transition(refresh); }
    return made;
  }

  // いつか：ずっと先のことはカードにする
  if (state.view === 'someday' && source !== 'palette') {
    const item = addSomeday(text);
    if (!item) return null;
    if (source !== 'paste') {
      save();
      transition(refresh);
    }
    return { kind: 'someday', item };
  }

  // 学校：頭に科目名があれば、その科目の課題にする
  let subjectId = null;
  if (state.view === 'school' && source !== 'palette') {
    const m = matchSubject(text);
    subjectId = m.subject ? m.subject.id : state.schoolSubject;
    if (m.subject && m.rest) text = m.rest;
  }

  const p = parseQuick(text, state.today);
  const listId = p.listName ? ensureList(p.listName).id : (state.view === 'todo' ? state.filter.listId : null);
  let made;

  if (subjectId || state.view === 'school') {
    const t = newTodo({
      title: p.title, due: p.due ?? null, time: p.time, duration: p.duration, remind: !!p.time,
      priority: p.priority || 0, listId, subjectId,
    });
    state.data.todos.push(t);
    made = { kind: 'todo', item: t };
  } else if (p.repeat || (source === 'bar' && state.view === 'routine')) {
    const schedule = p.repeat || { type: 'weekly', days: [...state.newRoutineDays] };
    const r = newRoutine({ title: p.title, schedule, remind: p.time, goal: p.goal || 1, listId });
    state.data.routines.push(r);
    made = { kind: 'routine', item: r };
    if (state.view !== 'routine' && source !== 'paste') toast(`🔁 ルーティン「${r.title}」を追加しました（${scheduleText(schedule)}）`, { undo: true });
  } else {
    const fallback = state.view === 'calendar' ? state.calSelected
      : state.view === 'todo' ? resolveDue(state.newTodoDue)
      : state.today;
    const due = p.due !== undefined ? p.due : (fallback === null && p.time ? state.today : fallback);
    const t = newTodo({
      title: p.title, due, time: p.time, duration: p.duration, remind: !!p.time,
      priority: p.priority || 0, listId,
    });
    state.data.todos.push(t);
    made = { kind: 'todo', item: t };
    if (source !== 'paste') {
      const visible = state.view === 'todo' || (state.view === 'today' && (!due || due <= state.today))
        || (state.view === 'calendar' && due === state.calSelected);
      if (!visible || source === 'palette') toast(`${due ? `${relDate(due, state.today)}の` : '期限なしの'} ToDo に追加しました`, { undo: true });
    }
  }
  if (source !== 'paste') {
    save();
    transition(refresh).then(() => flashRow(made.item.id));
  }
  return made;
}

function addFromInput() {
  const input = $('#addInput');
  if (addFromText(input.value)) {
    input.value = '';
    renderAddPreview();
  }
}

// 複数行を貼り付けたら、1 行ずつまとめて追加する
function addLines(lines) {
  checkpoint();
  const made = lines.map((l) => addFromText(l, { source: 'paste' })).filter(Boolean);
  if (!made.length) return;
  save();
  transition(refresh);
  const routines = made.filter((m) => m.kind === 'routine').length;
  toast(`${made.length} 件追加しました${routines ? `（ルーティン ${routines} 件）` : ''}`, { undo: true });
}

function flashRow(id) {
  const row = content.querySelector(`.item[data-id="${id}"]`);
  if (!row) return;
  row.scrollIntoView({ block: 'nearest' });
  row.classList.add('flash');
}

function removeItem(kind, id) {
  const list = kind === 'routine' ? state.data.routines : state.data.todos;
  const index = list.findIndex((x) => x.id === id);
  if (index < 0) return;
  const [item] = list.splice(index, 1);
  if (kind === 'routine') {
    for (const k of Object.keys(state.data.log)) {
      if (state.data.log[k][item.id] !== undefined) setCount(item, k, 0);
    }
  }
  if (kind === 'todo' && timer.taskId === id) timer.taskId = null;
  save();
  transition(refresh);
  toast(`「${item.title}」を削除しました`, { undo: true });
}

function doUndo() {
  closeMenu();
  if (!undo()) { toast('元に戻せる操作はありません'); return; }
  applyAppearance();
  renderAll();
  toast('元に戻しました', { redo: true });
}

function doRedo() {
  closeMenu();
  if (!redo()) { toast('やり直せる操作はありません'); return; }
  renderAll();
  toast('やり直しました');
}

async function togglePin() {
  state.settings.alwaysOnTop = await window.api.setAlwaysOnTop(!state.settings.alwaysOnTop);
  renderTitlebar();
  toast(state.settings.alwaysOnTop ? '最前面に固定しました' : '最前面の固定を解除しました');
}

// ============================================================
//  お祝い
// ============================================================

const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365];

function celebrateMilestone(r) {
  const n = streakOf(r);
  if (!MILESTONES.includes(n)) return false;
  toast(`🔥「${r.title}」${n}${streakUnit(r)}連続達成！`);
  confetti();
  chime('done');
  return true;
}

// 今日のタスクが全部終わった瞬間にお祝い
function celebrateIfDone(before) {
  const after = todaySummary();
  if (before.left > 0 && after.total > 0 && after.left === 0) {
    confetti();
    chime('done');
  }
}

function popCheck(id) {
  $$(`[data-id="${id}"] .check, .check[data-id="${id}"]`).forEach((el) => {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  });
}

// ============================================================
//  クリック操作（data-act でまとめて受ける）
// ============================================================

const findTodo = (id) => state.data.todos.find((x) => x.id === id);
const findRoutine = (id) => state.data.routines.find((x) => x.id === id);

const actions = {
  'view': (el) => switchView(el.dataset.view),
  'settings': () => openSettings(),
  'help': () => openHelp(),
  'palette': () => openPalette(),
  'more-views': (el) => openMoreViews(el),
  'install-howto': () => openInstallHowto(),
  'install-dismiss': () => { prefs().installHintClosed = true; save(); refresh(); toast('案内は設定の「この端末」からも見られます'); },
  'style-gallery': () => openStyleGallery(),
  'style-random': () => {
    const s = randomStyle();
    renderAll();
    if ($('#stylePicker')) { $('#stylePicker').innerHTML = styleSummary(); $('#styleExtras').innerHTML = styleExtras(); }
    toast(`スタイルを「${s.name}」にしました`);
  },

  'toggle-todo': (el) => {
    const t = findTodo(el.dataset.id);
    if (!t) return;
    const before = todaySummary();
    const done = toggleTodo(t);
    save();
    transition(refresh).then(() => { if (done) popCheck(t.id); });
    if (done) { chime(); celebrateIfDone(before); }
  },
  'toggle-routine': (el) => {
    const r = findRoutine(el.dataset.id);
    if (!r) return;
    const before = todaySummary();
    const day = el.dataset.day || state.today;
    const done = bumpRoutine(r, day);
    save();
    transition(refresh).then(() => { if (done) popCheck(r.id); });
    if (done) {
      chime();
      if (day === state.today && !celebrateMilestone(r)) celebrateIfDone(before);
    }
  },
  'routine-minus': (el) => {
    const r = findRoutine(el.dataset.id);
    const day = el.dataset.day || state.today;
    setCount(r, day, Math.max(0, countOf(r, day) - 1));
    save();
    refresh();
  },
  'skip-routine': (el) => {
    const r = findRoutine(el.dataset.id);
    const day = el.dataset.day || state.today;
    setCount(r, day, isSkipped(r, day) ? 0 : -1);
    save();
    transition(refresh);
  },
  'open-todo': (el) => openTodoSheet(findTodo(el.dataset.id)),
  'open-routine': (el) => openRoutineSheet(findRoutine(el.dataset.id)),
  'del-todo': (el) => removeItem('todo', el.dataset.id),
  'del-routine': (el) => removeItem('routine', el.dataset.id),
  'snooze': (el) => {
    const t = findTodo(el.dataset.id);
    t.due = addDays(state.today, 1);
    save();
    transition(refresh);
    toast(`「${t.title}」を明日にまわしました`, { undo: true });
  },
  'overdue-to-today': () => {
    const n = rollover();
    if (!n) { toast('期限切れの ToDo はありません'); return; }
    save();
    transition(refresh);
    toast(`${n} 件を今日にしました`, { undo: true });
  },
  'clear-done': (el, e) => {
    e?.preventDefault();
    const n = state.data.todos.filter((x) => x.done && todoMatches(x)).length;
    state.data.archivedDone = (state.data.archivedDone || 0) + n;
    state.data.todos = state.data.todos.filter((x) => !(x.done && todoMatches(x)));
    save();
    transition(refresh);
    toast(`完了済みを ${n} 件削除しました`, { undo: true });
  },

  'filter-list': (el) => {
    state.filter.listId = el.dataset.list || null;
    if (state.view !== 'todo') switchView('todo', { keepFilter: true });
    else renderAll();
  },
  'edit-list': (el) => openListSheet(listById(el.dataset.list)),
  'new-list': () => openListSheet(null),
  'sort': (el) => { state.filter.sort = el.dataset.sort; renderContent(); },

  'cal-mode': (el) => {
    prefs().calMode = el.dataset.mode;
    save();
    renderContent();
    renderAddbar();
  },
  'cal-select': (el) => {
    state.calSelected = el.dataset.day;
    if (el.dataset.day.slice(0, 7) !== state.calMonth) state.calMonth = el.dataset.day.slice(0, 7);
    renderContent();
    renderAddbar();
  },
  'cal-move': (el) => {
    const delta = Number(el.dataset.delta);
    if (prefs().calMode === 'week') {
      state.calWeek = addDays(state.calWeek || weekStartOf(state.today), delta * 7);
      // 追加先の日付も、見えている週の中に合わせて動かす
      state.calSelected = addDays(state.calWeek, (diffDays(state.calSelected, weekStartOf(state.calSelected)) + 7) % 7);
      state.calMonth = state.calSelected.slice(0, 7);
    } else {
      const [y, m] = state.calMonth.split('-').map(Number);
      state.calMonth = keyOf(new Date(y, m - 1 + delta, 1)).slice(0, 7);
    }
    renderContent();
    renderAddbar();
  },
  'cal-today': () => {
    state.calMonth = state.today.slice(0, 7);
    state.calSelected = state.today;
    state.calWeek = null;
    renderContent();
    renderAddbar();
  },
  'wk-day': (el) => {
    state.calSelected = el.dataset.day;
    state.calMonth = el.dataset.day.slice(0, 7);
    prefs().calMode = 'month';
    save();
    renderContent();
    renderAddbar();
  },
  'wk-select': (el) => {
    state.calSelected = el.dataset.day;
    $$('.wk-col').forEach((c) => c.classList.toggle('sel', c.dataset.day === el.dataset.day));
    renderAddbar();
  },
  'wk-add': (el) => {
    state.calSelected = el.dataset.day;
    renderAddbar();
    focusAdd();
  },

  'tl-slot': (el, e) => {
    if (e.target.closest('.tl-block')) return;
    focusAdd(`${hm(tlMinutesAt(el, e.clientY, 30))} `);
  },

  'mood': (el) => {
    const k = el.dataset.day;
    const m = Number(el.dataset.mood);
    setJournal(k, { mood: journalOf(k).mood === m ? null : m });
    save();
    $$(`.journal[data-day="${k}"] .mood`).forEach((b) => b.classList.toggle('on', Number(b.dataset.mood) === journalOf(k).mood));
    if (state.view === 'calendar' || state.view === 'stats') renderContent();
  },

  'zen-open': () => openZen(),
  'zen-close': () => closeZen(),
  'zen-sub': (el) => {
    const t = findTodo(el.dataset.id);
    const s = t?.subtasks.find((x) => x.id === el.dataset.sub);
    if (!s) return;
    s.done = !s.done;
    if (s.done) chime();
    save();
    refresh();
  },
  'zen-done': (el) => {
    const t = findTodo(el.dataset.id);
    if (!t || t.done) return;
    const before = todaySummary();
    toggleTodo(t);
    save();
    closeZen();
    refresh();
    chime('done');
    confetti();
    celebrateIfDone(before);
    toast(`「${t.title}」を完了しました 🎉`, { undo: true });
  },

  'mini-next': () => { state.miniIndex++; renderMini(); },
  'mini-exit': () => window.api.setMini(false),

  // ---------- 天気 ----------
  'wx-open': () => openWeatherSheet(),
  'wx-place': () => openPlaceSheet(),
  'wx-refresh': () => loadWeather({ force: true }),
  'wx-dismiss': () => {
    wxPrefs().prompted = true;
    save();
    refresh();
    toast('天気は設定からいつでも表示できます');
  },
  'wx-locate': async (el) => {
    el.disabled = true;
    el.textContent = '📍 調べています…';
    const r = await window.api.weatherLocate();
    if (!r || r.error) {
      toast(r?.error || '現在地がわかりませんでした');
      openPlaceSheet();
      refresh();
      return;
    }
    setPlace(r);
    toast(`天気の場所を「${r.name}」にしました`);
  },

  // ---------- BGM ----------
  'bgm-menu': (el) => {
    const r = el.getBoundingClientRect();
    openBgmMenu(r.left, r.bottom + 6);
  },

  // ---------- いつか ----------
  'open-someday': (el) => openSomedaySheet(somedayById(el.dataset.id)),
  'someday-filter': (el) => { state.somedayFilter = el.dataset.v; renderContent(); },
  'someday-idea': (el) => {
    const item = addSomeday(el.dataset.v, { kind: 'want', horizon: 'someday' });
    save();
    transition(refresh);
    toast(`「${item.title}」を追加しました`, { undo: true });
  },
  'someday-random': () => {
    const items = state.data.someday.filter((x) => x.status !== 'done');
    if (!items.length) return;
    const wants = items.filter((x) => x.kind === 'want');
    const pool = wants.length ? wants : items;
    const x = pool[Math.floor(Math.random() * pool.length)];
    openSomedaySheet(x);
    toast(`🎲 今日は「${x.title}」に一歩近づいてみる？`);
  },
  'someday-next-pick': () => { state.somedayPickOffset = (state.somedayPickOffset || 0) + 1; renderRightPanel(); },

  // ---------- 学校 ----------
  'school-days': (el) => {
    school().days = Number(el.dataset.v) === 6 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
    save();
    renderContent();
  },
  'school-preset': (el) => {
    const preset = SCHOOL_PRESETS.find((p) => p.id === el.dataset.v);
    const sc = school();
    sc.periods = preset.periods.map(([start, end]) => ({ start, end }));
    sc.setup = true;
    state.schoolEdit = true;
    save();
    renderAll();
    toast(`時間割ができました。マスを${TAP}して科目を入れてください`);
  },
  'school-edit': () => { state.schoolEdit = !state.schoolEdit; renderContent(); },
  'school-settings': () => openSchoolSettings(),
  'tt-cell': (el) => {
    const d = Number(el.dataset.day);
    const i = Number(el.dataset.period);
    const sub = subjectById(school().timetable[`${d}-${i}`]);
    if (state.schoolEdit || !sub) openCellSheet(d, i);
    else openSubjectSheet(sub);
  },
  'open-subject': (el) => openSubjectSheet(subjectById(el.dataset.id)),
  'attend': (el) => {
    setAttendance(el.dataset.day, Number(el.dataset.period), el.dataset.v);
    save();
    refresh();
  },
  'attend-all': (el) => {
    const k = el.dataset.day;
    for (const c of classesOn(k)) if (!c.rec) setAttendance(k, c.i, 'present');
    save();
    refresh();
    toast('まとめて出席にしました', { undo: true });
  },
};
Object.assign(actions, LIFE_ACTIONS);

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  if (act.startsWith('timer-')) { timerAction(act, el); return; }
  const fn = actions[act];
  if (!fn) return;
  checkpoint();
  fn(el, e);
});

// 折りたたみの開閉を覚えておく（toggle は伝わらないので capture で受ける）
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (d.matches && d.matches('details[data-fold]')) state.folds[d.dataset.fold] = d.open;
}, true);

// 日記はその場で自動保存
const saveJournal = debounce((k, text) => {
  setJournal(k, { text });
  save();
}, 400);

document.addEventListener('input', (e) => {
  if (e.target.matches('.journal-text')) {
    autosize(e.target);
    saveJournal(e.target.dataset.day, e.target.value);
    // 同じ日の日記が画面の別の場所にもあれば合わせる
    $$(`.journal-text[data-day="${e.target.dataset.day}"]`).forEach((t) => { if (t !== e.target) t.value = e.target.value; });
  }
  if (e.target.id === 'search') {
    state.filter.query = e.target.value;
    renderContent();
  }
  if (e.target.id === 'noteSearch') {
    state.noteQuery = e.target.value;
    renderContent();
  }
});

// ============================================================
//  追加バー
// ============================================================

$('#addForm').addEventListener('submit', (e) => { e.preventDefault(); addFromInput(); });
$('#addInput').addEventListener('input', renderAddPreview);
$('#addInput').addEventListener('paste', (e) => {
  const lines = splitLines(e.clipboardData.getData('text'));
  if (lines.length < 2) return;
  e.preventDefault();
  addLines(lines);
});

$('#addOptions').addEventListener('click', (e) => {
  const due = e.target.closest('[data-due]');
  const day = e.target.closest('[data-newday]');
  const kind = e.target.closest('[data-sdkind]');
  const horizon = e.target.closest('[data-sdhorizon]');
  const subject = e.target.closest('[data-subject]');
  if (due) state.newTodoDue = due.dataset.due;
  if (day) state.newRoutineDays = toggleDay(state.newRoutineDays, day.dataset.newday);
  if (kind) state.newSomedayKind = kind.dataset.sdkind;
  if (horizon) state.newSomedayHorizon = horizon.dataset.sdhorizon;
  if (subject) state.schoolSubject = state.schoolSubject === subject.dataset.subject ? null : subject.dataset.subject;
  if (due || day || kind || horizon || subject) renderAddbar();
});
$('#addOptions').addEventListener('change', (e) => {
  if (e.target.id === 'dueInput' && e.target.value) { state.newTodoDue = e.target.value; renderAddbar(); }
});

function focusAdd(prefill = '') {
  if (state.layout === 'mini') {
    window.api.setMini(false);
    setTimeout(() => focusAdd(prefill), 350);
    return;
  }
  closeSheet();
  closeMenu();
  closePalette();
  if (state.zen) closeZen();
  if (['stats', 'focus'].includes(state.view)) switchView('today');
  const input = $('#addInput');
  if (prefill) {
    input.value = prefill;
    renderAddPreview();
  }
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

// ============================================================
//  ドラッグ：並べ替え・日付やリストやタイムラインに落とす
// ============================================================

let drag = null;

document.addEventListener('dragstart', (e) => {
  const el = e.target.closest?.('[data-kind][draggable="true"]');
  if (!el) return;
  drag = { kind: el.dataset.kind, id: el.dataset.id };
  el.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', el.dataset.id);
  $('#tip').hidden = true;
  closeMenu();
});

function clearDropMarks() {
  $$('.drop-before, .drop-after, .drop-on').forEach((el) => el.classList.remove('drop-before', 'drop-after', 'drop-on'));
}

document.addEventListener('dragend', () => {
  drag = null;
  $$('.dragging').forEach((el) => el.classList.remove('dragging'));
  clearDropMarks();
  clearTlGhost();
});

function dropTarget(e) {
  if (!drag) return null;
  if (drag.kind === 'someday') {
    const sec = e.target.closest('[data-drop-horizon]');
    return sec ? { type: 'horizon', el: sec } : null;
  }
  const grid = e.target.closest('[data-drop-time]');
  if (grid && drag.kind === 'todo') return { type: 'time', el: grid, min: tlMinutesAt(grid, e.clientY) };
  const list = e.target.closest('[data-drop-list]');
  if (list && drag.kind === 'todo') return { type: 'list', el: list };
  const row = e.target.closest('.item[data-kind]');
  const cell = e.target.closest('[data-drop-day]');
  if (row && row.dataset.kind === drag.kind && row.dataset.id !== drag.id && row.closest('#content')) {
    const r = row.getBoundingClientRect();
    return { type: 'row', el: row, after: e.clientY > r.top + r.height / 2, day: cell && drag.kind === 'todo' ? cell.dataset.dropDay : null };
  }
  if (cell && drag.kind === 'todo') return { type: 'day', el: cell };
  return null;
}

document.addEventListener('dragover', (e) => {
  const t = dropTarget(e);
  clearDropMarks();
  if (!t || t.type !== 'time') clearTlGhost();
  if (!t) return;
  e.preventDefault();
  if (t.type === 'row') t.el.classList.add(t.after ? 'drop-after' : 'drop-before');
  else if (t.type === 'time') showTlGhost(t.el, t.min);
  else t.el.classList.add('drop-on');
});

document.addEventListener('drop', (e) => {
  const t = dropTarget(e);
  if (!t) return;
  e.preventDefault();
  checkpoint();
  clearTlGhost();
  const todo = drag.kind === 'todo' ? findTodo(drag.id) : null;
  if (t.type === 'horizon') {
    const x = somedayById(drag.id);
    x.horizon = t.el.dataset.dropHorizon;
    x.target = null;
    toast(`「${x.title}」を「${HORIZONS.find((h) => h.id === x.horizon).name}」に移しました`, { undo: true });
  } else if (t.type === 'time') {
    const hadTime = !!todo.time;
    todo.time = hm(t.min);
    todo.due = state.today;
    if (!hadTime) todo.remind = true;
    toast(`「${todo.title}」を ${todo.time} にしました`, { undo: true });
  } else if (t.type === 'day') {
    todo.due = t.el.dataset.dropDay;
    toast(`「${todo.title}」を ${shortDate(todo.due)} にしました`, { undo: true });
  } else if (t.type === 'list') {
    todo.listId = t.el.dataset.dropList;
    toast(`「${todo.title}」を「${listById(todo.listId).name}」に入れました`, { undo: true });
  } else {
    const arr = drag.kind === 'todo' ? state.data.todos : state.data.routines;
    const from = arr.findIndex((x) => x.id === drag.id);
    const [item] = arr.splice(from, 1);
    const target = arr.find((x) => x.id === t.el.dataset.id);
    if (t.day) item.due = t.day;
    // 期限ごとのグループをまたいだら、期限も合わせる
    else if (drag.kind === 'todo' && !target.done && !item.done && state.view === 'todo' && state.filter.sort !== 'priority' && !state.filter.query && target.due !== item.due) {
      item.due = target.due;
    }
    arr.splice(arr.indexOf(target) + (t.after ? 1 : 0), 0, item);
  }
  drag = null;
  save();
  transition(refresh);
});

// ============================================================
//  キーボード：行の選択と操作
// ============================================================

const cursorItems = () => $$('#content .item[data-id]');

function setCursor(el) {
  $$('.item.kb').forEach((x) => x.classList.remove('kb'));
  state.cursor = el ? el.dataset.kind + ':' + el.dataset.id : null;
  if (!el) return;
  el.classList.add('kb');
  el.scrollIntoView({ block: 'nearest' });
}

function cursorEl() {
  if (!state.cursor) return null;
  const [kind, id] = state.cursor.split(':');
  return $(`#content .item[data-kind="${kind}"][data-id="${id}"]`);
}

function applyCursor() {
  if (!state.cursor) return;
  const el = cursorEl();
  if (el) el.classList.add('kb');
  else state.cursor = null;
}

function moveCursor(delta) {
  const items = cursorItems();
  if (!items.length) return;
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  const cur = cursorEl();
  let i = cur ? items.indexOf(cur) : -1;
  i = i < 0 ? (delta > 0 ? 0 : items.length - 1) : clamp(i + delta, 0, items.length - 1);
  setCursor(items[i]);
}

function moveItemByKey(delta) {
  const items = cursorItems();
  const el = cursorEl();
  const i = items.indexOf(el);
  const other = items[i + delta];
  if (!el || !other || other.dataset.kind !== el.dataset.kind) return;
  const arr = el.dataset.kind === 'todo' ? state.data.todos : state.data.routines;
  const [item] = arr.splice(arr.findIndex((x) => x.id === el.dataset.id), 1);
  const target = arr.find((x) => x.id === other.dataset.id);
  if (el.dataset.kind === 'todo' && state.view === 'todo' && state.filter.sort === 'manual' && !state.filter.query && target.due !== item.due && !item.done) {
    item.due = target.due;
  }
  arr.splice(arr.indexOf(target) + (delta > 0 ? 1 : 0), 0, item);
  save();
  transition(refresh);
}

function cursorKey(e) {
  const k = e.key;
  checkpoint();
  if (k === 'ArrowDown' || k === 'j') { e.altKey ? moveItemByKey(1) : moveCursor(1); return true; }
  if (k === 'ArrowUp' || k === 'k') { e.altKey ? moveItemByKey(-1) : moveCursor(-1); return true; }
  const el = cursorEl();
  if (!el) return false;
  const kind = el.dataset.kind;
  const id = el.dataset.id;
  if (k === ' ' || k === 'x') { $('.check:not(.placeholder)', el)?.click(); return true; }
  if (k === 'Enter' || k === 'e') { kind === 'todo' ? openTodoSheet(findTodo(id)) : openRoutineSheet(findRoutine(id)); return true; }
  if (k === 'Delete' || k === 'Backspace') {
    const items = cursorItems();
    const next = items[items.indexOf(el) + 1] || items[items.indexOf(el) - 1];
    removeItem(kind, id);
    state.cursor = next ? next.dataset.kind + ':' + next.dataset.id : null;
    return true;
  }
  if (kind === 'todo' && ['t', 'm', 'w'].includes(k)) {
    const t = findTodo(id);
    const due = k === 't' ? state.today : k === 'm' ? addDays(state.today, 1) : nextMonday(state.today);
    setTodoDue(t, due);
    toast(`「${t.title}」を${relDate(due, state.today)}にしました`, { undo: true });
    return true;
  }
  return false;
}

document.addEventListener('keydown', (e) => {
  const a = document.activeElement;
  const typing = a && (['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName) || a.isContentEditable);
  const k = e.key;
  const ctrl = e.ctrlKey || e.metaKey;

  if (k === 'Escape') {
    if (!menuEl.hidden) { closeMenu(); return; }
    if (!paletteEl.hidden) { closePalette(); return; }
    if (!sheet.hidden) { closeSheet(); return; }
    if (state.zen) { closeZen(); return; }
    if (typing) { a.blur(); return; }
    if (state.cursor) setCursor(null);
    return;
  }
  if (state.layout === 'mini') return;
  if (ctrl && k.toLowerCase() === 'k') { e.preventDefault(); togglePalette(); return; }
  if (k === 'F11') { e.preventDefault(); window.api.toggleFullScreen(); return; }
  if (!paletteEl.hidden || !menuEl.hidden) return;

  if (ctrl && !typing && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
  if (ctrl && !typing && k.toLowerCase() === 'y') { e.preventDefault(); doRedo(); return; }
  if (ctrl && /^[1-9]$/.test(k)) {
    const v = visibleViews()[Number(k) - 1];
    if (v) switchView(v.id);
    e.preventDefault();
    return;
  }
  if (ctrl && k.toLowerCase() === 'f') {
    e.preventDefault();
    if (state.view !== 'todo') switchView('todo', { keepFilter: true });
    $('#search')?.focus();
    return;
  }
  if ((ctrl && k.toLowerCase() === 'n') || (k === '/' && !typing)) {
    e.preventDefault();
    focusAdd();
    return;
  }
  if (typing || ctrl || !sheet.hidden || state.zen) return;
  if (k === '?') { e.preventDefault(); openHelp(); return; }
  // ボタンにフォーカスがあるときの Space / Enter は、そのボタンに任せる
  if ((k === ' ' || k === 'Enter') && a && a.tagName === 'BUTTON') return;
  if (cursorKey(e)) e.preventDefault();
});

// ============================================================
//  ウィンドウ
// ============================================================

$('#minBtn').onclick = () => window.api.minimize();
$('#maxBtn').onclick = () => (state.windowState.fullScreen ? window.api.toggleFullScreen() : window.api.toggleMaximize());
$('#hideBtn').onclick = () => window.api.hide();
$('#pinBtn').onclick = togglePin;
$('#miniBtn').onclick = () => window.api.setMini(true);
$('#setBtn').onclick = () => openSettings();
$('#searchBtn').onclick = () => openPalette();
$('#timerBtn').onclick = () => { if (state.zen) closeZen(); switchView('focus'); };
$('#titlebar').addEventListener('dblclick', (e) => {
  if (!e.target.closest('button')) window.api.toggleMaximize();
});

window.api.onSettingsChanged((s) => { state.settings = { ...state.settings, ...s }; renderTitlebar(); });
window.api.onWindowState((s) => {
  const wasMini = state.windowState.mini;
  state.windowState = s;
  if (s.mini !== wasMini) {
    closeSheet();
    closeMenu();
    closePalette();
    state.zen = false;
    state.miniIndex = 0;
  }
  if (applyLayout()) renderAll();
  else renderTitlebar();
});
window.api.onQuickAdd(() => focusAdd());

// 日付が変わったら今日の表示に切り替え、ほかは数字だけ更新
function checkDayChange() {
  const k = todayKey();
  if (k !== state.today) {
    const followToday = state.calSelected === state.today;
    state.today = k;
    state.newTodoDue = 'today';
    state.miniIndex = 0;
    if (followToday) { state.calSelected = k; state.calMonth = k.slice(0, 7); }
    state.calWeek = null;
    if (prefs().autoRollover) {
      const n = rollover();
      if (n) { save(); toast(`期限切れの ${n} 件を今日に移しました`, { undo: true }); }
    }
    renderAll();
    return;
  }
  renderTitlebar();
  updateNowLine();
  $$('.next-until[data-min]').forEach((el) => { el.textContent = untilLabel(Number(el.dataset.min)); });
  if (state.layout === 'mini') renderMini();
  const g = $('#sidebar .greeting');
  if (g) g.textContent = greeting();
}
setInterval(checkDayChange, 30 * 1000);
// 天気は 30 分ごとに新しくする（古いときだけ取りにいく）
setInterval(() => loadWeather(), 5 * 60 * 1000);
window.api.onFocus(() => loadWeather());
window.api.onFocus(checkDayChange);

// ============================================================
//  起動
// ============================================================

(async function init() {
  const [raw, settings, windowState] = await Promise.all([window.api.load(), window.api.getSettings(), window.api.getWindowState()]);
  state.settings = { ...state.settings, ...settings };
  state.windowState = windowState;
  const data = migrate(raw);
  if (data) {
    state.data = data;
    if (raw.version !== 2) save();
  } else {
    state.data = sampleData();
    save();
  }
  resetHistory();
  checkBadges({ announce: false });
  try {
    state.lifeTab = localStorage.getItem('lifeTab') || 'shop';
    const v = localStorage.getItem('view');
    if (VIEWS.some((x) => x.id === v)) state.view = v;
  } catch { /* 無視 */ }
  applyAppearance();
  restoreWeather();
  timerResetTo('focus');
  applyLayout();
  if (prefs().autoRollover) {
    const n = rollover();
    if (n) { save(); setTimeout(() => toast(`期限切れの ${n} 件を今日に移しました`, { undo: true }), 500); }
  }
  renderAll();
  loadWeather();
})();
