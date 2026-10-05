'use strict';

// ============================================================
//  集中タイマー（ポモドーロ）と集中モード
//  終了時刻で管理するので、ウィンドウを隠していてもずれない
// ============================================================

const timer = {
  mode: 'focus',     // 'focus' | 'break'
  running: false,
  endAt: 0,
  remaining: 0,
  duration: 0,
  taskId: null,
  round: 0,          // 集中した回数（4回ごとに長い休憩）
};

function modeMinutes(mode) {
  const p = prefs();
  if (mode === 'focus') return p.focusMin;
  return timer.round > 0 && timer.round % 4 === 0 ? p.longBreakMin : p.breakMin;
}

function timerResetTo(mode) {
  timer.mode = mode;
  timer.running = false;
  timer.duration = modeMinutes(mode) * 60000;
  timer.remaining = timer.duration;
}

const timerActive = () => timer.running || timer.remaining < timer.duration;

const fmtTime = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

function timerTaskOptions() {
  const t = state.today;
  const todos = state.data.todos.filter((x) => !x.done)
    .sort((a, b) => ((a.due && a.due <= t) ? 0 : 1) - ((b.due && b.due <= t) ? 0 : 1) || byDue(a, b))
    .slice(0, 60);
  return '<option value="">（タスクを選ばない）</option>' +
    todos.map((x) => `<option value="${x.id}" ${timer.taskId === x.id ? 'selected' : ''}>${escapeHtml(x.title)}</option>`).join('');
}

function timerCard(kind) {
  const size = kind === 'zen' ? (state.layout === 'compact' ? 220 : 280) : kind === 'big' ? 240 : 150;
  const stroke = kind === 'panel' ? 8 : 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sessions = focusOf(state.today).sessions;
  const presets = kind !== 'panel'
    ? `<div class="chips center">${[15, 25, 50].map((m) => `<button class="chip ${prefs().focusMin === m ? 'on' : ''}" data-act="timer-preset" data-min="${m}">${m}分</button>`).join('')}</div>` : '';
  return `<section class="card timer-card tc-${kind}">
    ${kind === 'panel' ? `<div class="card-head">集中タイマー<span class="spacer"></span><button class="mini-btn" data-act="zen-open" data-tip="集中モード（大きく表示）">${ICON.expand}</button></div>` : ''}
    <div class="seg mini">
      <button class="${timer.mode === 'focus' ? 'active' : ''}" data-act="timer-mode" data-mode="focus">集中</button>
      <button class="${timer.mode === 'break' ? 'active' : ''}" data-act="timer-mode" data-mode="break">休憩</button>
    </div>
    <div class="timer-ring" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 ${size} ${size}">
        <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
        <circle class="ring-bar timer-bar ${timer.mode}" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c * (timer.duration ? timer.remaining / timer.duration : 1)}" data-c="${c}"/>
      </svg>
      <div class="timer-center">
        <div class="timer-time">${fmtTime(timer.remaining)}</div>
        <div class="timer-mode">${timer.mode === 'focus' ? '集中' : '休憩'}${timer.running ? '中' : ''}</div>
      </div>
    </div>
    <div class="timer-buttons">
      <button class="icon-btn" data-act="timer-reset" data-tip="リセット">${ICON.reset}</button>
      <button class="play-btn" data-act="timer-toggle" aria-label="${timer.running ? '一時停止' : 'スタート'}">${timer.running ? ICON.pause : ICON.play}</button>
      <button class="icon-btn" data-act="timer-skip" data-tip="次へ進む">${ICON.skip}</button>
    </div>
    ${bgmChip()}
    ${presets}
    <select class="timer-task" aria-label="取り組むタスク">${timerTaskOptions()}</select>
    <div class="timer-sessions" data-tip="今日の集中回数">${'<i class="on"></i>'.repeat(Math.min(sessions, 12))}${sessions < 4 ? '<i></i>'.repeat(4 - sessions) : ''}<span>${sessions} 回</span></div>
    ${kind === 'big' ? `<button class="btn" data-act="zen-open">${ICON.expand}集中モードで大きく表示</button>` : ''}
  </section>`;
}

function updateTimerDom() {
  const pct = timer.duration ? 1 - timer.remaining / timer.duration : 0;
  $$('.timer-card').forEach((card) => {
    $('.timer-time', card).textContent = fmtTime(timer.remaining);
    const bar = $('.timer-bar', card);
    bar.style.strokeDashoffset = String(Number(bar.dataset.c) * (1 - pct));
  });
  const mt = $('#mini .mini-timer-time');
  if (mt) mt.textContent = fmtTime(timer.remaining);
  renderTimerChip();
}

function renderTimerChip() {
  const chip = $('#timerChip');
  const visible = timerActive() && !(state.view === 'focus' || state.layout === 'xwide' || state.zen);
  chip.hidden = !visible;
  if (visible) chip.innerHTML = `${timer.running ? ICON.timer : ICON.pause}<span>${fmtTime(timer.remaining)}</span>`;
  chip.classList.toggle('break', timer.mode === 'break');
  chip.title = timer.running ? 'クリックで一時停止' : 'クリックで再開';
}

let tickHandle = null;
function tick() {
  timer.remaining = timer.endAt - Date.now();
  if (timer.remaining <= 0) { timerComplete(); return; }
  updateTimerDom();
}

function timerStart() {
  if (timer.running) return;
  timer.running = true;
  timer.endAt = Date.now() + timer.remaining;
  clearInterval(tickHandle);
  tickHandle = setInterval(tick, 250);
  rerenderTimer();
  bgmSync();
}

function timerPause() {
  if (!timer.running) return;
  timer.remaining = timer.endAt - Date.now();
  timer.running = false;
  clearInterval(tickHandle);
  rerenderTimer();
  bgmSync();
}

function timerComplete() {
  clearInterval(tickHandle);
  const wasFocus = timer.mode === 'focus';
  if (wasFocus) {
    const min = Math.round(timer.duration / 60000);
    addFocus(state.today, min);
    const task = state.data.todos.find((x) => x.id === timer.taskId);
    if (task) task.focusMin = (task.focusMin || 0) + min;
    timer.round++;
    save();
    window.api.notify('🍅 集中おつかれさま！', `${min}分 集中しました。${modeMinutes('break')}分 休憩しましょう`);
  } else {
    window.api.notify('☕ 休憩おわり', 'つぎの集中をはじめましょう');
  }
  chime('timer');
  timerResetTo(wasFocus ? 'break' : 'focus');
  bgmSync();
  refresh();
  renderTimerChip();
}

function rerenderTimer() {
  if (state.layout === 'mini') { renderMini(); return; }
  if (state.view === 'focus') renderContent();
  if (state.layout === 'xwide') renderRightPanel();
  renderZen();
  updateTimerDom();
}

function timerAction(act, el) {
  if (act === 'timer-toggle' || act === 'timer-chip') timer.running ? timerPause() : timerStart();
  else if (act === 'timer-reset') { clearInterval(tickHandle); timerResetTo(timer.mode); rerenderTimer(); }
  else if (act === 'timer-skip') {
    clearInterval(tickHandle);
    timerResetTo(timer.mode === 'focus' ? 'break' : 'focus');
    rerenderTimer();
  } else if (act === 'timer-mode') {
    clearInterval(tickHandle);
    timerResetTo(el.dataset.mode);
    rerenderTimer();
  } else if (act === 'timer-preset') {
    prefs().focusMin = Number(el.dataset.min);
    save();
    if (!timer.running && timer.mode === 'focus') timerResetTo('focus');
    rerenderTimer();
  }
  bgmSync();
}

document.addEventListener('change', (e) => {
  if (e.target.matches('.timer-task')) {
    timer.taskId = e.target.value || null;
    $$('.timer-task').forEach((s) => { s.value = e.target.value; });
    renderZen();
  }
});

// このタスクに集中：タイマーを回して集中モードを開く
function focusOnTask(t) {
  closeSheet();
  closeMenu();
  closePalette();
  timer.taskId = t.id;
  if (!timer.running) {
    if (timer.mode !== 'focus') timerResetTo('focus');
    timerStart();
  }
  openZen();
}

// ============================================================
//  集中モード（画面いっぱいにタイマーと今のタスクだけ）
// ============================================================

function openZen() {
  if (state.layout === 'mini') return;
  closeMenu();
  closePalette();
  closeSheet();
  state.zen = true;
  renderZen();
  renderTimerChip();
}

function closeZen() {
  state.zen = false;
  renderZen();
  renderTimerChip();
}

function renderZen() {
  const z = $('#zen');
  if (!state.zen || state.layout === 'mini') {
    z.hidden = true;
    z.innerHTML = '';
    return;
  }
  const task = state.data.todos.find((x) => x.id === timer.taskId);
  const subs = task ? task.subtasks : [];
  const kicker = timer.mode === 'break' ? 'ひと休み' : task ? 'いま集中していること' : '集中モード';
  z.innerHTML = `<div class="zen-panel">
    <button class="icon-btn zen-close" data-act="zen-close" aria-label="閉じる（Esc）">${ICON.close}</button>
    <div class="zen-kicker">${kicker}</div>
    <h1 class="zen-title ${task && task.done ? 'done' : ''}">${task ? escapeHtml(task.title) : 'ひとつのことに集中しよう'}</h1>
    ${task && task.note ? `<p class="zen-note">${escapeHtml(task.note.slice(0, 200))}</p>` : ''}
    ${timerCard('zen')}
    ${subs.length ? `<div class="zen-subs">${subs.map((s) => `<button class="zen-sub ${s.done ? 'done' : ''}" data-act="zen-sub" data-id="${task.id}" data-sub="${s.id}">
      <span class="check small">${ICON.check}</span><span class="zen-sub-title">${escapeHtml(s.title)}</span></button>`).join('')}</div>` : ''}
    ${task && !task.done ? `<button class="btn primary zen-done" data-act="zen-done" data-id="${task.id}">${ICON.check}このタスクを完了にする</button>` : ''}
  </div>`;
  z.hidden = false;
}
