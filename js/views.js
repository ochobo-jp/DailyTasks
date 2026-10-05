'use strict';

// ============================================================
//  画面の枠（タイトルバー・サイドバー・タブ・右パネル）
// ============================================================

const VIEWS = [
  { id: 'today', label: '今日', icon: 'sun' },
  { id: 'todo', label: 'ToDo', icon: 'list' },
  { id: 'routine', label: 'ルーティン', icon: 'repeat' },
  { id: 'school', label: '学校', icon: 'school', feature: 'school' },
  { id: 'someday', label: 'いつか', icon: 'star', feature: 'someday' },
  { id: 'calendar', label: 'カレンダー', icon: 'calendar' },
  { id: 'stats', label: '記録', icon: 'chart' },
  { id: 'focus', label: '集中', icon: 'timer' },
];

// 使わない機能のタブは出さない。右パネルにタイマーがあるときは「集中」も出さない
const visibleViews = () => VIEWS.filter((v) => (!v.feature || prefs().features[v.feature])
  && (v.id !== 'focus' || state.layout !== 'xwide'));

function greeting() {
  const h = new Date().getHours();
  if (h >= 4 && h < 10) return 'おはようございます ☀️';
  if (h >= 10 && h < 17) return 'こんにちは 🌤️';
  if (h >= 17 && h < 22) return 'こんばんは 🌙';
  return '遅くまでおつかれさま 🌙';
}

function renderTitlebar() {
  const left = $('#tbLeft');
  if (state.layout === 'compact') {
    left.innerHTML = `<div class="date">${longDate(state.today)}</div><div class="greeting">${greeting()}${weatherBrief()}</div>`;
  } else {
    left.innerHTML = `<div class="brand"><span class="brand-mark">${ICON.check}</span>Daily Tasks</div>`;
  }
  const pin = $('#pinBtn');
  pin.innerHTML = ICON.pin;
  pin.classList.toggle('on', state.settings.alwaysOnTop);
  pin.title = state.settings.alwaysOnTop ? '最前面の固定を解除' : '最前面に固定';
  $('#miniBtn').innerHTML = ICON.pip;
  $('#setBtn').innerHTML = ICON.gear;
  $('#searchBtn').innerHTML = ICON.search;
  $('#minBtn').innerHTML = ICON.minus;
  $('#maxBtn').innerHTML = state.windowState.maximized || state.windowState.fullScreen ? ICON.restore : ICON.maximize;
  $('#maxBtn').title = state.windowState.fullScreen ? '全画面を終了（F11）' : state.windowState.maximized ? '元のサイズに戻す' : '最大化（F11 で全画面）';
  $('#hideBtn').innerHTML = ICON.close;
}

function navBadge(id) {
  if (id === 'today') return todaySummary().left || '';
  if (id === 'todo') return state.data.todos.filter((t) => !t.done).length || '';
  if (id === 'school') return state.data.todos.filter((t) => t.subjectId && !t.done).length || '';
  if (id === 'someday') return state.data.someday.filter((x) => x.status !== 'done').length || '';
  return '';
}

function renderSidebar() {
  const sb = $('#sidebar');
  if (state.layout === 'compact' || state.layout === 'mini') { sb.innerHTML = ''; return; }
  const lists = state.data.lists.map((l) => {
    const open = state.data.todos.filter((t) => !t.done && t.listId === l.id).length;
    const on = state.view === 'todo' && state.filter.listId === l.id;
    return `<div class="nav-item list-item ${on ? 'active' : ''}" data-act="filter-list" data-list="${l.id}" data-drop-list="${l.id}">
      <i class="list-dot" style="background:${l.color}"></i><span class="nav-label">${escapeHtml(l.name)}</span>
      <span class="badge">${open || ''}</span>
      <button class="mini-btn edit-list" data-act="edit-list" data-list="${l.id}" data-tip="リストを編集">${ICON.edit}</button>
    </div>`;
  }).join('');
  sb.innerHTML = `
    <div class="sb-date">
      <div class="date">${longDate(state.today)}</div>
      <div class="greeting">${greeting()}${weatherBrief()}</div>
    </div>
    <button class="sb-search" data-act="palette">${ICON.search}<span>検索・コマンド</span><kbd>Ctrl K</kbd></button>
    <nav class="nav">
      ${visibleViews().map((v) => `<button class="nav-item ${state.view === v.id && !(v.id === 'todo' && state.filter.listId) ? 'active' : ''}" data-act="view" data-view="${v.id}">
        ${ICON[v.icon]}<span class="nav-label">${v.label}</span><span class="badge">${navBadge(v.id)}</span></button>`).join('')}
    </nav>
    <div class="sb-head"><span>リスト</span><button class="mini-btn" data-act="new-list" data-tip="リストを追加">${ICON.plus}</button></div>
    <div class="nav lists">${lists || '<div class="sb-empty">#リスト名 をつけて追加すると<br>自動でリストができます</div>'}</div>
    <div class="sb-foot">
      <button class="nav-item" data-act="help">${ICON.keyboard}<span class="nav-label">ショートカット</span></button>
      <button class="nav-item" data-act="settings">${ICON.gear}<span class="nav-label">設定</span></button>
    </div>`;
}

// iPhone：下のタブは 4 つ＋「その他」。よく使う順に並べ、残りは「その他」から開く
const TOUCH_TAB_ORDER = ['today', 'todo', 'school', 'calendar', 'routine', 'someday', 'focus', 'stats'];

function touchTabs() {
  const all = visibleViews();
  const sorted = TOUCH_TAB_ORDER.map((id) => all.find((v) => v.id === id)).filter(Boolean);
  return sorted.length <= 5 ? { main: sorted, more: [] } : { main: sorted.slice(0, 4), more: sorted.slice(4) };
}

function renderTouchTabbar(tb) {
  const { main, more } = touchTabs();
  const cur = more.find((v) => v.id === state.view);
  tb.innerHTML = main.map((v) => `<button class="tab ${state.view === v.id ? 'active' : ''}" data-act="view" data-view="${v.id}" aria-label="${v.label}">
      ${ICON[v.icon]}<span>${v.label}</span>${navBadge(v.id) && v.id !== 'calendar' ? `<i class="tab-badge">${navBadge(v.id)}</i>` : ''}</button>`).join('')
    + (more.length ? `<button class="tab ${cur ? 'active' : ''}" data-act="more-views" aria-label="その他">
      ${cur ? ICON[cur.icon] : ICON.more}<span>${cur ? cur.label : 'その他'}</span></button>` : '');
}

function openMoreViews(btn) {
  const { more } = touchTabs();
  const r = btn.getBoundingClientRect();
  openMenu(r.left, r.top, `
    ${more.map((v) => `<button class="menu-item ${state.view === v.id ? 'on' : ''}" data-m="view" data-v="${v.id}">${ICON[v.icon]}<span>${v.label}</span><span class="menu-hint">${navBadge(v.id)}</span></button>`).join('')}
    <div class="menu-sep"></div>
    <button class="menu-item" data-m="palette">${ICON.search}<span>検索・コマンド</span></button>
    <button class="menu-item" data-m="settings">${ICON.gear}<span>設定</span></button>`, (m, v) => {
    if (m === 'view') switchView(v);
    if (m === 'palette') setTimeout(() => openPalette(), 0);
    if (m === 'settings') openSettings();
  });
}

// 狭いときは、いま開いている画面だけ名前つき、ほかはアイコンだけにして全部並べる
function renderTabbar() {
  const tb = $('#tabbar');
  if (state.layout !== 'compact') { tb.innerHTML = ''; return; }
  if (IS_TOUCH) { renderTouchTabbar(tb); return; }
  tb.innerHTML = visibleViews().map((v) => {
    const on = state.view === v.id;
    return `<button class="tab ${on ? 'active' : ''}" data-act="view" data-view="${v.id}" ${on ? '' : `data-tip="${v.label}"`} aria-label="${v.label}">
      ${ICON[v.icon]}<span>${v.label}</span>${v.id === 'today' && navBadge('today') && !on ? '<i class="tab-dot"></i>' : ''}</button>`;
  }).join('');
}

function renderRightPanel() {
  const rp = $('#rightpanel');
  if (state.layout !== 'xwide') { rp.innerHTML = ''; return; }
  const t = state.today;
  const upcoming = state.data.todos
    .filter((x) => !x.done && x.due && x.due > t && x.due <= addDays(t, 7))
    .sort(byDue).slice(0, 6);
  preserveFocus(rp, () => {
    rp.innerHTML = `
      ${weatherPanel()}
      ${journalCard()}
      ${somedayPanelCard()}
      <section class="card upcoming">
        <div class="card-head">この先 7 日の予定</div>
        ${upcoming.length ? upcoming.map((x) => `<div class="up-row" data-act="open-todo" data-id="${x.id}">
          <span class="up-date">${relDate(x.due, t)}${x.time ? ` ${x.time}` : ''}</span>
          <span class="up-title">${escapeHtml(x.title)}</span></div>`).join('') : '<div class="muted small">予定はありません</div>'}
      </section>`;
  });
}

// ============================================================
//  今日
// ============================================================

function renderToday() {
  const t = state.today;
  const routines = state.data.routines.filter((r) => isScheduled(r, t));
  const { overdue, due, doneToday } = todayTodos();
  due.sort((a, b) => byTime(a, b) || b.priority - a.priority);
  const todayList = [...due, ...doneToday];
  const tomorrow = state.data.todos.filter((x) => !x.done && x.due === addDays(t, 1)).sort(byTime);
  const undated = state.data.todos.filter((x) => !x.done && !x.due).length;
  const s = todaySummary();
  const wide = state.layout !== 'compact';

  let html = (state.layout === 'xwide' ? '' : weatherStrip()) + summaryCard();
  if (s.total > 0 && s.left === 0) html += '<div class="all-done">🎉 今日のタスクはぜんぶ完了！おつかれさまでした</div>';

  let colA = section('ルーティン', routines.map((r) => routineRow(r)), { count: `${s.rDone}/${s.routines}` });
  if (!routines.length && !state.data.routines.length) {
    colA = `<section class="section"><div class="section-head"><span>ルーティン</span></div>
      <button class="hint-card" data-act="view" data-view="routine">${ICON.repeat}毎日・曜日ごとのくり返しを登録する</button></section>`;
  }
  colA = classesSection() + colA;

  let colB = '';
  colB += section('期限切れ', overdue.sort(byDue).map((x) => todoRow(x)), {
    cls: 'danger', count: overdue.length,
    link: '<button class="link" data-act="overdue-to-today">すべて今日にする</button>',
  });
  colB += section('今日の ToDo', todayList.map((x) => todoRow(x, { context: 'today' })), { count: `${doneToday.length}/${todayList.length}` });
  // 夕方以降は、明日の予定を最初から開いておく
  colB += fold('tomorrow', '明日の予定', tomorrow.length, tomorrow.map((x) => todoRow(x)), { defaultOpen: new Date().getHours() >= 18 });
  if (undated) {
    colB += `<div class="section"><div class="section-head"><span>期限なしの ToDo が ${undated} 件</span>
      <button class="link" data-act="view" data-view="todo">見る →</button></div></div>`;
  }
  if (!s.total && !undated && !tomorrow.length) colB += emptyState('🌿', '今日の予定はまだありません。<br>下の欄からやることを追加してみてね');

  html += `<div class="cols today-cols">
    ${colA ? `<div class="col">${colA}</div>` : ''}
    <div class="col">${colB}</div>
    ${wide ? `<div class="col">${timelineCard()}</div>` : ''}
  </div>`;
  if (state.layout !== 'xwide') html += journalCard();
  return html;
}

// ============================================================
//  ToDo
// ============================================================

function todoMatches(t) {
  const f = state.filter;
  if (f.listId && t.listId !== f.listId) return false;
  const q = normalize(f.query.trim());
  if (!q) return true;
  return [t.title, t.note, ...t.subtasks.map((s) => s.title), listById(t.listId)?.name || '']
    .some((s) => normalize(s).includes(q));
}

function renderTodoView() {
  const f = state.filter;
  const t = state.today;
  const tmr = addDays(t, 1);
  const week = addDays(t, 7);
  const all = state.data.todos.filter(todoMatches);
  const open = all.filter((x) => !x.done);
  const done = all.filter((x) => x.done).sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
  const sorter = f.sort === 'due' ? byDue : f.sort === 'priority' ? byPriority : () => 0;
  const list = listById(f.listId);
  const overdueN = open.filter((x) => x.due && x.due < t).length;
  const sub = `未完了 ${open.length} 件${overdueN ? `・期限切れ ${overdueN} 件` : ''}`;

  const head = list
    ? pageHead(`<i class="list-dot big" style="background:${list.color}"></i>${escapeHtml(list.name)}`, sub,
      `<button class="mini-btn" data-act="edit-list" data-list="${list.id}" data-tip="リストを編集">${ICON.edit}</button>`, { always: true })
    : pageHead('ToDo', sub);

  const toolbar = `<div class="toolbar">
    <label class="search">${ICON.search}<input id="search" type="search" data-focus-key="search" placeholder="${IS_TOUCH ? '検索' : '検索（Ctrl+F）'}" value="${escapeHtml(f.query)}"></label>
    <div class="chips scroll-x">
      <button class="chip ${!f.listId ? 'on' : ''}" data-act="filter-list" data-list="">すべて</button>
      ${state.data.lists.map((l) => `<button class="chip list-chip ${f.listId === l.id ? 'on' : ''}" data-act="filter-list" data-list="${l.id}" style="--c:${l.color}"><i></i>${escapeHtml(l.name)}</button>`).join('')}
    </div>
    <div class="chips">
      <span class="muted small">並び順</span>
      ${[['manual', '手動'], ['due', '期限'], ['priority', '優先度']].map(([v, l]) => `<button class="chip ${f.sort === v ? 'on' : ''}" data-act="sort" data-sort="${v}">${l}</button>`).join('')}
    </div>
  </div>`;

  let groups = '';
  if (f.query.trim()) {
    groups += section(`「${escapeHtml(f.query)}」の検索結果`, [...open].sort(sorter).map((x) => todoRow(x)), { count: open.length });
  } else if (f.sort === 'priority') {
    for (const p of [3, 2, 1, 0]) {
      const items = open.filter((x) => x.priority === p).sort(byDue);
      groups += section(p ? `優先度：${PRIORITY[p].label}` : '優先度なし', items.map((x) => todoRow(x)), { count: items.length });
    }
  } else {
    const g = (name, items, opts = {}) => section(name, items.sort(sorter).map((x) => todoRow(x)), { count: items.length, ...opts });
    groups += g('期限切れ', open.filter((x) => x.due && x.due < t), { cls: 'danger', link: '<button class="link" data-act="overdue-to-today">すべて今日にする</button>' });
    groups += g('今日', open.filter((x) => x.due === t));
    groups += g('明日', open.filter((x) => x.due === tmr));
    groups += g('今週', open.filter((x) => x.due && x.due > tmr && x.due <= week));
    groups += g('それ以降', open.filter((x) => x.due && x.due > week));
    groups += g('期限なし', open.filter((x) => !x.due));
  }
  if (!open.length) {
    groups += emptyState('✨', f.query ? '見つかりませんでした' : list ? `「${escapeHtml(list.name)}」のやることは全部片づいています` : 'やることは全部片づいています');
  }
  groups += fold('done', '完了済み', done.length, done.slice(0, 200).map((x) => todoRow(x, { draggable: false, vt: false })), {
    link: '<button class="link" data-act="clear-done">まとめて削除</button>',
  });
  return head + toolbar + `<div class="cols masonry">${groups}</div>`;
}

// ============================================================
//  ルーティン
// ============================================================

function renderRoutineView() {
  const t = state.today;
  const all = state.data.routines;
  const dots = state.layout === 'compact' ? 7 : 14;
  const today = all.filter((r) => isScheduled(r, t));
  const others = all.filter((r) => !r.paused && !isScheduled(r, t));
  const paused = all.filter((r) => r.paused);
  const doneN = today.filter((r) => isDone(r, t)).length;
  let html = pageHead('ルーティン', `今日 ${doneN}/${today.length} 完了・全 ${all.length} 件`);
  html += '<div class="cols masonry">';
  html += section('今日あるもの', today.map((r) => routineRow(r, { dots })), { count: today.length });
  html += section('ほかの日', others.map((r) => routineRow(r, { dots })), { count: others.length });
  html += section('一時停止中', paused.map((r) => routineRow(r, { dots: 0 })), { count: paused.length });
  html += '</div>';
  if (!all.length) html += emptyState('🔁', '毎日や曜日ごとにくり返すことを登録すると、<br>今日の分が自動でリストに出てきます');
  else html += `<p class="hint">${ICON.sparkle}追加欄に「平日 7:30 ジム」「毎月25日 家賃」「水を飲む ×8」のように書くこともできます</p>`;
  return html;
}

// ============================================================
//  カレンダー（月・週）
// ============================================================

function calToolbar(title, mode) {
  return `<div class="cal-head">
    <div class="seg mini">
      <button class="${mode === 'month' ? 'active' : ''}" data-act="cal-mode" data-mode="month">月</button>
      <button class="${mode === 'week' ? 'active' : ''}" data-act="cal-mode" data-mode="week">週</button>
    </div>
    <button class="icon-btn" data-act="cal-move" data-delta="-1" aria-label="前へ">${ICON.chevL}</button>
    <div class="cal-title">${title}</div>
    <button class="icon-btn" data-act="cal-move" data-delta="1" aria-label="次へ">${ICON.chevR}</button>
    <button class="chip" data-act="cal-today">今日</button>
  </div>`;
}

function renderCalendarView() {
  return prefs().calMode === 'week' ? renderWeekBoard() : renderMonth();
}

function renderMonth() {
  const [y, m] = state.calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() - prefs().weekStart + 7) % 7;
  const start = addDays(keyOf(first), -offset);
  const t = state.today;
  const showTitles = state.layout !== 'compact';

  let cells = '';
  for (let i = 0; i < 42; i++) {
    const k = addDays(start, i);
    const d = parseKey(k);
    const inMonth = d.getMonth() === m - 1;
    const todos = state.data.todos.filter((x) => x.due === k).sort((a, b) => a.done - b.done || byTime(a, b));
    const open = todos.filter((x) => !x.done);
    const rate = k <= t ? dayRate(k) : null;
    const j = state.data.journal[k];
    const wx = k >= t ? dayForecast(k) : null;
    const tipParts = [shortDate(k)];
    if (rate !== null) tipParts.push(`ルーティン ${Math.round(rate * 100)}%`);
    if (todos.length) tipParts.push(`ToDo ${todos.length - open.length}/${todos.length}`);
    let marks;
    if (showTitles) {
      const max = state.windowState.fullScreen ? 4 : 3;
      marks = `<span class="cal-evs">${todos.slice(0, max).map((x) => `<span class="cal-ev ${x.done ? 'done' : ''}" style="--c:${listById(x.listId)?.color || 'var(--accent-a)'}">${x.time ? `${x.time} ` : ''}${escapeHtml(x.title)}</span>`).join('')}
        ${todos.length > max ? `<span class="cal-more">+${todos.length - max}</span>` : ''}</span>`;
    } else {
      marks = `<span class="cal-dots">${open.slice(0, 4).map((x) => `<i style="background:${listById(x.listId)?.color || 'var(--accent-a)'}"></i>`).join('')}${open.length > 4 ? '<b>+</b>' : ''}</span>`;
    }
    cells += `<button class="cal-cell ${inMonth ? '' : 'out'} ${k === t ? 'today' : ''} ${k === state.calSelected ? 'sel' : ''} ${d.getDay() === 0 ? 'sun' : d.getDay() === 6 ? 'sat' : ''}"
        data-act="cal-select" data-day="${k}" data-drop-day="${k}" data-tip="${tipParts.join('・')}">
      <span class="cal-num">${d.getDate()}</span>
      ${j && j.mood !== null && j.mood !== undefined ? `<span class="cal-mood">${MOODS[j.mood]}</span>` : wx ? `<span class="cal-wx" data-tip="${wxInfo(wx.code).label}・${deg(wx.max)}/${deg(wx.min)}・降水${wx.pp}%">${wxInfo(wx.code).icon}<small>${deg(wx.max)}</small></span>` : ''}
      ${marks}
      ${rate !== null ? `<span class="cal-rate"><span style="width:${rate * 100}%"></span></span>` : ''}
    </button>`;
  }

  const sel = state.calSelected;
  const routines = state.data.routines.filter((r) => isScheduled(r, sel));
  const todos = state.data.todos.filter((x) => x.due === sel).sort((a, b) => a.done - b.done || byTime(a, b));
  const focus = focusOf(sel);
  let detail = `<div class="view-head"><h1>${longDate(sel)}</h1>${sel !== t ? `<span class="tag">${relDate(sel, t)}</span>` : ''}</div>`;
  detail += classesSection(sel, sel === t ? '今日の授業' : 'この日の授業');
  detail += section('ルーティン', routines.map((r) => routineRow(r, { day: sel, draggable: false })), { count: `${routines.filter((r) => isDone(r, sel)).length}/${routines.length}` });
  detail += section('ToDo', todos.map((x) => todoRow(x)), { count: `${todos.filter((x) => x.done).length}/${todos.length}` });
  if (!routines.length && !todos.length) detail += emptyState('🗓️', 'この日の予定はありません');
  if (focus.min) detail += `<p class="hint">${ICON.timer} この日の集中：${minutesLabel(focus.min)}（${focus.sessions} 回）</p>`;
  // 今日の日記は右パネルにもあるので、全画面のときは出さない
  if (sel < t || (sel === t && state.layout !== 'xwide')) detail += journalCard(sel);

  return `<div class="cal-layout">
    <section class="card cal">
      ${calToolbar(`${y}年 ${m}月`, 'month')}
      <div class="cal-grid cal-week">${weekOrder().map((d) => `<span class="${d === 0 ? 'sun' : d === 6 ? 'sat' : ''}">${WEEK[d]}</span>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
      <p class="hint small">ToDo をドラッグして日付に落とすと、期限を変えられます</p>
    </section>
    <div class="cal-detail">${detail}</div>
  </div>`;
}

function renderWeekBoard() {
  const start = state.calWeek || weekStartOf(state.today);
  const end = addDays(start, 6);
  const t = state.today;
  const cols = Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((k) => {
    const d = parseKey(k);
    const routines = state.data.routines.filter((r) => isScheduled(r, k));
    const todos = state.data.todos.filter((x) => x.due === k).sort((a, b) => a.done - b.done || byTime(a, b));
    const rate = k <= t ? dayRate(k) : null;
    const dayCls = d.getDay() === 0 ? 'sun' : d.getDay() === 6 ? 'sat' : '';
    const wxDay = k >= t ? dayForecast(k) : null;
    return `<div class="wk-col ${k === t ? 'today' : ''} ${k < t ? 'past' : ''} ${k === state.calSelected ? 'sel' : ''}" data-act="wk-select" data-day="${k}" data-drop-day="${k}">
      <button class="wk-head" data-act="wk-day" data-day="${k}" data-tip="この日の詳細">
        <span class="wk-dow ${dayCls}">${WEEK[d.getDay()]}</span>
        <span class="wk-date">${d.getDate()}</span>
        ${wxDay ? `<span class="wk-wx" data-tip="${wxInfo(wxDay.code).label}・降水${wxDay.pp}%">${wxInfo(wxDay.code).icon} ${deg(wxDay.max)}<small>/${deg(wxDay.min)}</small></span>` : ''}
        ${rate !== null ? `<span class="wk-rate" data-tip="ルーティン ${Math.round(rate * 100)}%"><i style="width:${rate * 100}%"></i></span>` : ''}
      </button>
      <div class="wk-list">${todos.map((x) => todoRow(x, { compact: true })).join('')}</div>
      ${routines.length ? `<div class="wk-routines">${routines.map((r) => routineRow(r, { day: k, compact: true, draggable: false })).join('')}</div>` : ''}
      <button class="wk-add" data-act="wk-add" data-day="${k}">${ICON.plus}追加</button>
    </div>`;
  }).join('');
  const sd = parseKey(start);
  const ed = parseKey(end);
  const title = `${sd.getMonth() + 1}/${sd.getDate()} – ${sd.getMonth() === ed.getMonth() ? '' : `${ed.getMonth() + 1}/`}${ed.getDate()}`;
  return `<section class="card cal week-card">
    ${calToolbar(title, 'week')}
    <div class="week-board">${cols}</div>
    <p class="hint small">${IS_TOUCH ? '長押しでいろいろな操作（期限の変更など）' : 'ToDo をドラッグして別の日に移せます・右クリックでいろいろな操作'}</p>
  </section>`;
}

// ============================================================
//  記録
// ============================================================

function statTile(label, value, sub = '') {
  return `<div class="card tile"><div class="tile-label">${label}</div><div class="tile-value">${value}</div><div class="tile-sub">${sub}</div></div>`;
}

// 縦棒グラフ（1系列）。太さは細め、上端だけ丸め、ベースラインに接地
function barChart(points, { unit = '', fmt = (v) => v, labelAll = false, max: fixedMax = null } = {}) {
  const max = fixedMax ?? Math.max(1, ...points.map((p) => p.v));
  return `<div class="bars" role="img">
    <div class="bars-max">${fmt(max)}${unit}</div>
    <div class="bars-plot">
      ${points.map((p) => `<div class="bar-col ${p.today ? 'today' : ''}" data-tip="${p.label}：${p.v === null ? 'データなし' : fmt(p.v) + unit}">
        <div class="bar" style="height:${((p.v || 0) / max) * 100}%"></div></div>`).join('')}
    </div>
    <div class="bars-x">${points.map((p, i) => `<span class="${p.today ? 'today' : ''}">${labelAll || i % 2 === points.length % 2 || p.today ? p.short : ''}</span>`).join('')}</div>
  </div>`;
}

function heatmap(weeks) {
  const t = state.today;
  const end = addDays(t, (7 - dow(t)) % 7); // 今週の日曜まで
  const start = addDays(end, -(weeks * 7 - 1));
  let cols = '';
  let months = '';
  for (let w = 0; w < weeks; w++) {
    let col = '';
    const weekStart = addDays(start, w * 7);
    const d0 = parseKey(weekStart);
    months += `<span>${d0.getDate() <= 7 ? `${d0.getMonth() + 1}月` : ''}</span>`;
    for (let i = 0; i < 7; i++) {
      const k = addDays(weekStart, i);
      if (k > t) { col += '<span class="hm-cell future"></span>'; continue; }
      const rate = dayRate(k);
      const lv = rate === null ? 'none' : rate === 0 ? 0 : rate < 0.34 ? 1 : rate < 0.67 ? 2 : rate < 1 ? 3 : 4;
      col += `<span class="hm-cell l${lv}" data-tip="${shortDate(k)}：${rate === null ? '予定なし' : Math.round(rate * 100) + '%'}"></span>`;
    }
    cols += `<div class="hm-col">${col}</div>`;
  }
  return `<div class="heatmap">
    <div class="hm-months">${months}</div>
    <div class="hm-body">
      <div class="hm-days"><span>月</span><span></span><span>水</span><span></span><span>金</span><span></span><span>日</span></div>
      <div class="hm-grid">${cols}</div>
    </div>
    <div class="hm-legend"><span>少ない</span>${[0, 1, 2, 3, 4].map((l) => `<span class="hm-cell l${l}"></span>`).join('')}<span>多い</span></div>
  </div>`;
}

// 曜日ごとの平均達成率（直近 12 週）
function weekdayPoints() {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  for (let i = 1; i <= 84; i++) {
    const k = addDays(state.today, -i);
    const rate = dayRate(k);
    if (rate === null) continue;
    sums[dow(k)] += rate;
    counts[dow(k)]++;
  }
  return weekOrder().map((d) => ({
    label: `${WEEK[d]}曜日`, short: WEEK[d], today: d === dow(state.today),
    v: counts[d] ? Math.round((sums[d] / counts[d]) * 100) : null,
  }));
}

function renderStatsView() {
  const t = state.today;
  const s = todaySummary();
  const monday = weekStartOf(t);
  const weekDone = state.data.todos.filter((x) => x.done && x.doneAt >= monday).length;
  let weekFocus = 0;
  for (let k = monday; k <= t; k = addDays(k, 1)) weekFocus += focusOf(k).min;
  const streaks = state.data.routines.map((r) => ({ r, s: streakOf(r) })).sort((a, b) => b.s - a.s);
  const top = streaks[0];
  const totalDone = state.data.todos.filter((x) => x.done).length + (state.data.archivedDone || 0);
  const earned = BADGES.filter((b) => state.data.badges[b.id]).length;

  const days = 14;
  const todoPts = [];
  const focusPts = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = addDays(t, -i);
    const base = { label: shortDate(k), short: WEEK[dow(k)], today: i === 0 };
    todoPts.push({ ...base, v: state.data.todos.filter((x) => x.done && x.doneAt === k).length });
    focusPts.push({ ...base, v: focusOf(k).min });
  }
  const wd = weekdayPoints();
  const best = wd.filter((p) => p.v !== null).sort((a, b) => b.v - a.v)[0];

  const moods = [];
  for (let i = 13; i >= 0; i--) {
    const k = addDays(t, -i);
    const j = state.data.journal[k];
    moods.push(`<div class="mood-day" data-tip="${shortDate(k)}${j?.text ? '：' + escapeHtml(j.text.slice(0, 40)) : ''}">
      <span>${j && j.mood !== null && j.mood !== undefined ? MOODS[j.mood] : '·'}</span><small>${WEEK[dow(k)]}</small></div>`);
  }

  const rows = state.data.routines.map((r) => {
    const rate = rateOf(r, 30);
    return `<tr data-act="open-routine" data-id="${r.id}">
      <td class="rt-name">${escapeHtml(r.title)}<div class="muted small">${scheduleLabel(r)}</div></td>
      <td class="rt-rate"><div class="rt-rate-in"><div class="hbar"><span style="width:${(rate || 0) * 100}%"></span></div><span class="num">${rate === null ? '—' : Math.round(rate * 100) + '%'}</span></div></td>
      <td class="num">${streakOf(r)}</td>
      <td class="num">${bestStreakOf(r)}</td>
    </tr>`;
  }).join('');

  return `${pageHead('記録', `これまでに完了した ToDo ${totalDone} 件・バッジ ${earned}/${BADGES.length}`)}
    <div class="tiles">
      ${statTile('今日の達成率', `${s.total ? Math.round((s.done / s.total) * 100) : 0}<small>%</small>`, `${s.done}/${s.total} 完了`)}
      ${statTile('いちばん続いている', top && top.s ? `🔥 ${top.s}` : '—', top && top.s ? escapeHtml(top.r.title) : 'ルーティンを続けると表示')}
      ${statTile('今週完了した ToDo', `${weekDone}<small>件</small>`, `${shortDate(monday)} から`)}
      ${statTile('今週の集中時間', weekFocus ? minutesLabel(weekFocus) : '0<small>分</small>', '集中タイマーの合計')}
    </div>
    <div class="cols">
      <section class="card chart-card wide-card">
        <div class="card-head">ルーティン達成率 <span class="muted small">直近 20 週</span></div>
        ${heatmap(20)}
      </section>
      <section class="card chart-card">
        <div class="card-head">完了した ToDo <span class="muted small">直近 14 日・件</span></div>
        ${barChart(todoPts, { unit: '件' })}
      </section>
      <section class="card chart-card">
        <div class="card-head">集中時間 <span class="muted small">直近 14 日・分</span></div>
        ${barChart(focusPts, { unit: '分' })}
      </section>
      <section class="card chart-card">
        <div class="card-head">曜日ごとの達成率 <span class="muted small">直近 12 週・%</span></div>
        ${barChart(wd, { unit: '%', labelAll: true, max: 100 })}
        <div class="chart-note">${best ? `いちばん続けやすいのは <b>${best.label}</b>（${best.v}%）` : 'ルーティンを続けると、曜日ごとの傾向がわかります'}</div>
      </section>
      <section class="card chart-card">
        <div class="card-head">気分 <span class="muted small">直近 14 日</span></div>
        <div class="mood-strip">${moods.join('')}</div>
      </section>
      ${badgesCard()}
    </div>
    ${rows ? `<section class="card chart-card">
      <div class="card-head">ルーティンごとの記録</div>
      <table class="rt-table"><thead><tr><th>ルーティン</th><th>30日の達成率</th><th class="num">連続</th><th class="num">最高</th></tr></thead><tbody>${rows}</tbody></table>
    </section>` : ''}`;
}

// ============================================================
//  集中
// ============================================================

function renderFocusView() {
  const f = focusOf(state.today);
  return `${pageHead('集中タイマー', `今日の集中：${minutesLabel(f.min)}（${f.sessions} 回）`)}
    <div class="focus-view">${timerCard('big')}</div>`;
}

// ============================================================
//  まとめて描画
// ============================================================

const content = $('#content');
let lastView = null;

// 描き直しても、入力中の欄のフォーカスとカーソル位置を保つ
function preserveFocus(container, fn) {
  const a = document.activeElement;
  const key = a && container.contains(a) ? a.dataset.focusKey : null;
  const sel = key && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
  fn();
  if (!key) return;
  const n = container.querySelector(`[data-focus-key="${key}"]`);
  if (!n) return;
  n.focus({ preventScroll: true });
  if (sel) {
    try { n.setSelectionRange(...sel); } catch { /* 選択できない要素 */ }
  }
}

function renderContent() {
  const render = {
    today: renderToday, todo: renderTodoView, routine: renderRoutineView,
    school: renderSchoolView, someday: renderSomedayView,
    calendar: renderCalendarView, stats: renderStatsView, focus: renderFocusView,
  }[state.view] || renderToday;
  const enter = lastView !== state.view;
  lastView = state.view;
  const prevScroll = enter ? 0 : content.scrollTop;
  const scrolls = {};
  if (!enter) $$('[data-scroll-key]', content).forEach((el) => { scrolls[el.dataset.scrollKey] = el.scrollTop; });
  state.vtNames = !!document.startViewTransition && !state.noTransitions
    && state.data.todos.length + state.data.routines.length < 400;
  const before = enter || state.vtNames ? null : new Set($$('.item[data-id]', content).map((el) => el.dataset.kind + el.dataset.id));

  preserveFocus(content, () => {
    content.innerHTML = `<div class="view view-${state.view}${enter ? ' enter' : ''}">${render()}</div>`;
  });
  content.scrollTop = prevScroll;
  $$('[data-scroll-key]', content).forEach((el) => {
    if (scrolls[el.dataset.scrollKey] !== undefined) el.scrollTop = scrolls[el.dataset.scrollKey];
  });
  // 新しく増えた行だけをふわっと出す
  if (before) $$('.item[data-id]', content).forEach((el) => { if (!before.has(el.dataset.kind + el.dataset.id)) el.classList.add('enter-item'); });
  if (enter) scrollTimelineToNow();
  applyCursor();
  autosizeAll();
}

function renderAll() {
  if (state.layout === 'mini') { renderMini(); return; }
  renderTitlebar();
  renderSidebar();
  renderTabbar();
  renderContent();
  renderRightPanel();
  renderAddbar();
  renderTimerChip();
  renderZen();
}

// チェックなどの軽い操作のあとは、数字が変わる部分だけ描き直す
function refresh() {
  if (state.layout === 'mini') { renderMini(); return; }
  renderSidebar();
  renderTabbar();
  renderContent();
  renderRightPanel();
  renderZen();
}

// ============================================================
//  追加バー
// ============================================================

function addTargetLabel() {
  if (state.view === 'calendar') return shortDate(state.calSelected);
  return '';
}

function renderAddbar() {
  const bar = $('#addbar');
  const input = $('#addInput');
  const opts = $('#addOptions');
  $('.add-btn').innerHTML = ICON.plus;
  const v = state.view;
  const roomy = state.layout !== 'compact';
  bar.hidden = v === 'stats' || v === 'focus';
  if (v === 'today') {
    input.placeholder = roomy ? '今日やることを追加…　例：15時 会議 #仕事 !高　／　平日 7:30 ジム' : '今日やることを追加…';
    opts.innerHTML = '';
  } else if (v === 'todo') {
    input.placeholder = roomy ? 'ToDo を追加…　例：明日 歯医者 #生活　／　金曜までに 資料 1時間' : 'ToDo を追加…（例：明日 歯医者）';
    const d = state.newTodoDue;
    const custom = !['today', 'tomorrow', 'none'].includes(d);
    opts.innerHTML = `
      <button type="button" class="chip ${d === 'today' ? 'on' : ''}" data-due="today">今日</button>
      <button type="button" class="chip ${d === 'tomorrow' ? 'on' : ''}" data-due="tomorrow">明日</button>
      <button type="button" class="chip ${d === 'none' ? 'on' : ''}" data-due="none">期限なし</button>
      <label class="chip date-chip ${custom ? 'on' : ''}">📅 ${custom ? shortDate(d) : '日付'}
        <input type="date" id="dueInput" value="${custom ? d : ''}"></label>
      ${listById(state.filter.listId) ? `<span class="muted small">→ ${escapeHtml(listById(state.filter.listId).name)} に追加</span>` : ''}`;
  } else if (v === 'routine') {
    input.placeholder = roomy ? 'ルーティンを追加…　例：日記を書く　／　毎週月木 ゴミ出し 7:30' : 'ルーティンを追加…';
    opts.innerHTML = dayChips(state.newRoutineDays, 'newday');
  } else if (v === 'calendar') {
    input.placeholder = `${addTargetLabel()} に ToDo を追加…`;
    opts.innerHTML = '';
  } else if (v === 'someday') {
    input.placeholder = roomy ? 'やりたいこと・先のやることを追加…　例：来年 富士山に登る　／　2027年3月 英検2級' : 'やりたいことを追加…';
    opts.innerHTML = `
      ${Object.entries(SOMEDAY_KINDS).map(([k, x]) => `<button type="button" class="chip ${state.newSomedayKind === k ? 'on' : ''}" data-sdkind="${k}">${x.icon} ${x.name}</button>`).join('')}
      <span class="chip-sep"></span>
      ${HORIZONS.map((h) => `<button type="button" class="chip ${state.newSomedayHorizon === h.id ? 'on' : ''}" data-sdhorizon="${h.id}">${h.name}</button>`).join('')}`;
  } else if (v === 'school') {
    const subs = school().subjects;
    bar.hidden = !school().setup;
    input.placeholder = roomy ? '課題を追加…　例：英語 単語テスト 金曜　／　数学 プリント 明日まで' : '課題を追加…（例：英語 単語テスト 金曜）';
    opts.innerHTML = subs.length ? `<span class="muted small">科目</span>
      ${subs.map((s) => `<button type="button" class="chip subject-mini ${state.schoolSubject === s.id ? 'on' : ''}" data-subject="${s.id}" style="--c:${s.color}"><i></i>${escapeHtml(s.name)}</button>`).join('')}` : '';
  }
  renderAddPreview();
}

// 入力中の文から読み取った日付やリストを見せる
function renderAddPreview() {
  const el = $('#addPreview');
  const text = $('#addInput').value;
  if (!text.trim()) { el.innerHTML = ''; return; }
  if (state.view === 'someday') {
    const s = parseSomeday(text);
    const chips = [];
    if (s.emoji) chips.push(s.emoji);
    if (s.kind) chips.push(`${SOMEDAY_KINDS[s.kind].icon} ${SOMEDAY_KINDS[s.kind].name}`);
    if (s.target) chips.push(`🎯 ${targetLabel(s.target)}`);
    else if (s.horizon) chips.push(`${HORIZONS.find((h) => h.id === s.horizon).icon} ${HORIZONS.find((h) => h.id === s.horizon).name}`);
    el.innerHTML = chips.map((c) => `<span class="tag today">${c}</span>`).join('');
    return;
  }
  const chips = [];
  let body = text;
  if (state.view === 'school') {
    const m = matchSubject(text);
    const sub = m.subject || subjectById(state.schoolSubject);
    if (sub) chips.push(`📘 ${escapeHtml(sub.name)}`);
    body = m.rest || text;
  }
  const p = parseQuick(body, state.today);
  if (p.repeat) chips.push(`🔁 ${scheduleText(p.repeat)} のルーティン`);
  else if (p.due && state.view !== 'routine') chips.push(`📅 ${relDate(p.due, state.today)}`);
  if (p.time) chips.push(p.repeat || state.view === 'routine' ? `🔔 ${p.time}` : `⏰ ${p.time}`);
  if (p.duration && !p.repeat && state.view !== 'routine') chips.push(`⏳ ${minutesLabel(p.duration)}`);
  if (p.goal) chips.push(`× ${p.goal}`);
  if (p.listName) {
    const exists = state.data.lists.some((l) => normalize(l.name) === normalize(p.listName));
    chips.push(`# ${escapeHtml(p.listName)}${exists ? '' : '（新しいリスト）'}`);
  }
  if (p.priority && !p.repeat) chips.push(`優先度 ${PRIORITY[p.priority].label}`);
  el.innerHTML = chips.map((c) => `<span class="tag today">${c}</span>`).join('');
}

function autosizeAll() {
  $$('textarea.journal-text, textarea.autosize').forEach(autosize);
}
function autosize(el) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight + 2}px`;
}
