'use strict';

// ============================================================
//  右クリックメニュー
//  行・リスト・日付・入力欄で、それぞれに合った操作を出す
// ============================================================

const menuEl = $('#menu');

let menuOnClose = null;
let menuHoldBlur = false;   // 日付の選択など、別のポップアップを開いている間は閉じない

function openMenu(x, y, html, onAction, { onClose = null } = {}) {
  closeMenu();
  closePalette();
  $('#tip').hidden = true;
  menuEl.innerHTML = html;
  menuEl.hidden = false;
  menuOnClose = onClose;
  menuEl.oninput = null;
  menuEl.onclick = (e) => {
    const b = e.target.closest('[data-m]');
    if (!b || b.disabled) return;
    checkpoint();
    if (onAction(b.dataset.m, b.dataset.v, b) !== 'keep') closeMenu();
  };
  placeMenu(x, y);
}

function placeMenu(x, y) {
  const w = menuEl.offsetWidth;
  const h = menuEl.offsetHeight;
  menuEl.style.left = `${clamp(x, 6, innerWidth - w - 6)}px`;
  menuEl.style.top = `${y + h > innerHeight - 6 ? Math.max(6, Math.min(y - h, innerHeight - h - 6)) : y}px`;
}

// 開いたまま中身だけ描き直す（BGM の選択など）
function updateMenu(html) {
  if (menuEl.hidden) return;
  const { left, top } = menuEl.style;
  menuEl.innerHTML = html;
  placeMenu(parseFloat(left), parseFloat(top));
}

function closeMenu() {
  if (menuEl.hidden) return;
  menuEl.hidden = true;
  menuEl.innerHTML = '';
  menuEl.onclick = null;
  menuEl.oninput = null;
  menuHoldBlur = false;
  const fn = menuOnClose;
  menuOnClose = null;
  if (fn) fn();
}

document.addEventListener('mousedown', (e) => {
  if (!menuEl.hidden && !menuEl.contains(e.target)) closeMenu();
}, true);
window.addEventListener('blur', () => { if (!menuHoldBlur) closeMenu(); });
window.addEventListener('resize', closeMenu);
document.addEventListener('scroll', (e) => { if (!menuEl.contains(e.target)) closeMenu(); }, true);

// ---------- 部品 ----------

const mItem = (m, icon, label, { kbd = '', danger = false, disabled = false } = {}) =>
  `<button class="menu-item${danger ? ' danger' : ''}" data-m="${m}"${disabled ? ' disabled' : ''}>${ICON[icon] || '<i class="menu-ic"></i>'}<span>${label}</span>${kbd ? `<kbd>${kbd}</kbd>` : ''}</button>`;
const mSep = '<div class="menu-sep"></div>';
const mRow = (label, inner) => `<div class="menu-row"><span>${label}</span><div class="menu-chips">${inner}</div></div>`;
const mChip = (m, v, label, on = false, extra = '') => `<button class="menu-chip${on ? ' on' : ''}" data-m="${m}" data-v="${v}" ${extra}>${label}</button>`;

// ---------- ToDo ----------

function setTodoDue(t, due) {
  t.due = due;
  save();
  transition(refresh);
}

function todoMenu(t, x, y) {
  const T = state.today;
  const dues = [['today', '今日', T], ['tomorrow', '明日', addDays(T, 1)], ['nextweek', '来週', nextMonday(T)], ['none', 'なし', null]];
  const html = `
    <div class="menu-title">${escapeHtml(t.title)}</div>
    ${mItem('toggle', 'check', t.done ? '未完了にもどす' : '完了にする', { kbd: 'Space' })}
    ${mRow('期限', dues.map(([v, l, k]) => mChip('due', v, l, t.due === k)).join('')
      + `<button class="menu-chip" data-m="pick-date" title="日付を選ぶ">📅</button><input type="date" class="menu-date" value="${t.due || ''}">`)}
    ${mRow('優先度', PRIORITY.map((p, i) => mChip('prio', i, p.label, t.priority === i, `data-p="${i}"`)).join(''))}
    ${state.data.lists.length ? mRow('リスト', mChip('list', '', 'なし', !t.listId)
      + state.data.lists.map((l) => mChip('list', l.id, `<i style="background:${l.color}"></i>${escapeHtml(l.name)}`, t.listId === l.id)).join('')) : ''}
    ${mSep}
    ${mItem('open', 'edit', '詳細を開く', { kbd: 'Enter' })}
    ${t.done ? '' : mItem('focus', 'timer', 'このタスクに集中')}
    ${mItem('dup', 'copy', '複製')}
    ${mSep}
    ${mItem('del', 'trash', '削除', { kbd: 'Del', danger: true })}`;
  openMenu(x, y, html, (m, v) => {
    if (m === 'toggle') return actions['toggle-todo']({ dataset: { id: t.id } });
    if (m === 'due') {
      const map = { today: T, tomorrow: addDays(T, 1), nextweek: nextMonday(T), none: null };
      setTodoDue(t, map[v]);
      toast(map[v] ? `期限を ${relDate(map[v], T)} にしました` : '期限をなしにしました', { undo: true });
      return undefined;
    }
    if (m === 'pick-date') {
      menuHoldBlur = true;
      const input = $('.menu-date', menuEl);
      input.onchange = () => {
        if (!input.value) return;
        setTodoDue(t, input.value);
        closeMenu();
        toast(`期限を ${relDate(input.value, T)} にしました`, { undo: true });
      };
      try { input.showPicker(); } catch { input.click(); }
      return 'keep';
    }
    if (m === 'prio') { t.priority = Number(v); save(); transition(refresh); return undefined; }
    if (m === 'list') { t.listId = v || null; save(); transition(refresh); return undefined; }
    if (m === 'open') return openTodoSheet(t);
    if (m === 'focus') return focusOnTask(t);
    if (m === 'dup') {
      duplicateTodo(t);
      save();
      transition(refresh);
      toast('複製しました', { undo: true });
      return undefined;
    }
    if (m === 'del') return removeItem('todo', t.id);
    return undefined;
  });
}

// ---------- ルーティン ----------

function routineMenu(r, day, x, y) {
  const scheduled = isScheduled(r, day);
  const future = day > state.today;
  const skipped = isSkipped(r, day);
  const done = isDone(r, day);
  const goal = r.goal || 1;
  const canCheck = scheduled && !skipped && !future;
  const label = day === state.today ? '今日' : shortDate(day);
  const html = `
    <div class="menu-title">${escapeHtml(r.title)}</div>
    ${canCheck ? mItem('bump', 'check', done ? `${label}の達成を取り消す` : goal > 1 ? `${label}の回数を +1（${Math.max(0, countOf(r, day))}/${goal}）` : `${label}の分を完了`, { kbd: 'Space' }) : ''}
    ${canCheck && goal > 1 && countOf(r, day) > 0 ? mItem('minus', 'minus', '回数を -1') : ''}
    ${scheduled && !done && !future ? mItem('skip', 'skip', skipped ? 'スキップを取り消す' : `${label}はスキップ`) : ''}
    ${mItem('pause', r.paused ? 'play' : 'pause', r.paused ? '再開する' : '一時停止する')}
    ${mSep}
    ${mItem('open', 'edit', '詳細を開く', { kbd: 'Enter' })}
    ${mItem('dup', 'copy', '複製')}
    ${mSep}
    ${mItem('del', 'trash', '削除', { kbd: 'Del', danger: true })}`;
  openMenu(x, y, html, (m) => {
    if (m === 'bump') return actions['toggle-routine']({ dataset: { id: r.id, day } });
    if (m === 'minus') return actions['routine-minus']({ dataset: { id: r.id, day } });
    if (m === 'skip') return actions['skip-routine']({ dataset: { id: r.id, day } });
    if (m === 'pause') {
      r.paused = !r.paused;
      save();
      transition(refresh);
      toast(r.paused ? `「${r.title}」を一時停止しました` : `「${r.title}」を再開しました`, { undo: true });
      return undefined;
    }
    if (m === 'open') return openRoutineSheet(r);
    if (m === 'dup') {
      duplicateRoutine(r);
      save();
      transition(refresh);
      toast('複製しました', { undo: true });
      return undefined;
    }
    if (m === 'del') return removeItem('routine', r.id);
    return undefined;
  });
}

// ---------- リスト・日付・入力欄 ----------

function listMenu(l, x, y) {
  openMenu(x, y, `
    <div class="menu-title"><i class="list-mini" style="background:${l.color}"></i>${escapeHtml(l.name)}</div>
    ${mItem('show', 'list', 'このリストを表示')}
    ${mItem('edit', 'edit', '名前と色を変える')}
    ${mSep}
    ${mItem('del', 'trash', 'リストを削除', { danger: true })}`, (m) => {
    if (m === 'show') {
      state.filter.listId = l.id;
      switchView('todo', { keepFilter: true });
    }
    if (m === 'edit') openListSheet(l);
    if (m === 'del') removeList(l);
  });
}

function dayMenu(k, x, y) {
  openMenu(x, y, `
    <div class="menu-title">${longDate(k)}</div>
    ${mItem('add', 'plus', 'この日に ToDo を追加')}
    ${mItem('open', 'calendar', 'この日の詳細を見る')}`, (m) => {
    state.calSelected = k;
    state.calMonth = k.slice(0, 7);
    if (m === 'add') {
      if (state.view !== 'calendar') switchView('calendar');
      renderAddbar();
      focusAdd();
    }
    if (m === 'open') {
      prefs().calMode = 'month';
      save();
      if (state.view !== 'calendar') switchView('calendar');
      else { renderContent(); renderAddbar(); }
    }
  });
}

function inputMenu(el, x, y) {
  const hasSel = el.selectionStart !== el.selectionEnd;
  openMenu(x, y, `
    ${mItem('cut', 'copy', '切り取り', { kbd: 'Ctrl+X', disabled: !hasSel })}
    ${mItem('copy', 'copy', 'コピー', { kbd: 'Ctrl+C', disabled: !hasSel })}
    ${mItem('paste', 'note', '貼り付け', { kbd: 'Ctrl+V' })}
    ${mSep}
    ${mItem('selectAll', 'list', 'すべて選択', { kbd: 'Ctrl+A' })}`, (m) => {
    el.focus();
    window.api.editCmd(m);
  });
}

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (state.layout === 'mini') return;
  const t = e.target;
  const input = t.closest('input[type="text"], input[type="search"], input:not([type]), textarea');
  if (input) { inputMenu(input, e.clientX, e.clientY); return; }
  const row = t.closest('[data-kind][data-id]');
  if (row) {
    if (row.classList.contains('item')) setCursor(row);
    const kind = row.dataset.kind;
    if (kind === 'todo') {
      const todo = state.data.todos.find((x) => x.id === row.dataset.id);
      if (todo) todoMenu(todo, e.clientX, e.clientY);
    } else if (kind === 'routine') {
      const r = state.data.routines.find((x) => x.id === row.dataset.id);
      if (r) routineMenu(r, row.dataset.day || state.today, e.clientX, e.clientY);
    } else if (kind === 'someday') {
      const s = state.data.someday.find((x) => x.id === row.dataset.id);
      if (s) somedayMenu(s, e.clientX, e.clientY);
    } else if (kind === 'deck') {
      const d = deckById(row.dataset.id);
      if (d) deckMenu(d, e.clientX, e.clientY);
    } else if (kind === 'sub') {
      const x = life().money.subs.find((s) => s.id === row.dataset.id);
      if (x) openSubSheet(x);
    } else if (['shop', 'money', 'note', 'count'].includes(kind)) {
      lifeMenu(kind, row.dataset.id, e.clientX, e.clientY);
    } else if (kind === 'class') {
      classMenu(row.dataset.day, Number(row.dataset.period), e.clientX, e.clientY);
    }
    return;
  }
  const cell = t.closest('.tt-cell');
  if (cell) { ttCellMenu(Number(cell.dataset.day), Number(cell.dataset.period), e.clientX, e.clientY); return; }
  const list = t.closest('[data-list]');
  if (list && list.dataset.list && listById(list.dataset.list)) { listMenu(listById(list.dataset.list), e.clientX, e.clientY); return; }
  const day = t.closest('[data-drop-day]');
  if (day) dayMenu(day.dataset.dropDay, e.clientX, e.clientY);
});
