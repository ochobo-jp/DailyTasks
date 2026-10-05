'use strict';

// ============================================================
//  画面の部品（HTML 文字列を返す）
// ============================================================

function section(title, rows, { count = '', cls = '', link = '' } = {}) {
  if (!rows.length) return '';
  return `<section class="section ${cls}">
    <div class="section-head"><span>${title} <span class="count">${count}</span></span>${link}</div>
    <div class="list">${rows.join('')}</div>
  </section>`;
}

// 折りたたみ。開閉は state.folds に覚えておく
function fold(id, title, count, rows, { link = '', defaultOpen = false } = {}) {
  if (!rows.length) return '';
  const open = state.folds[id] ?? defaultOpen;
  return `<details class="section fold" data-fold="${id}"${open ? ' open' : ''}>
    <summary class="section-head"><span><span class="chev">›</span>${title} <span class="count">${count}</span></span>${link}</summary>
    <div class="list">${rows.join('')}</div>
  </details>`;
}

function pageHead(title, sub = '', extra = '', { always = false } = {}) {
  return `<div class="page-head${always ? ' always' : ''}">
    <div class="page-title"><h1>${title}</h1>${sub ? `<div class="page-sub">${sub}</div>` : ''}</div>
    <span class="spacer"></span>${extra}
  </div>`;
}

function emptyState(icon, text) {
  return `<div class="empty"><div class="big">${icon}</div>${text}</div>`;
}

// 行が動くときのアニメーション（View Transitions）用の名前
const vtName = (prefix, id) => (state.vtNames ? ` style="view-transition-name:vt-${prefix}-${id}"` : '');

function listTag(listId) {
  const l = listById(listId);
  if (!l) return '';
  return `<span class="tag list-tag"><i style="background:${l.color}"></i>${escapeHtml(l.name)}</span>`;
}

function subjectTag(subjectId) {
  const s = subjectId && subjectById(subjectId);
  if (!s) return '';
  return `<span class="tag subj-tag" style="--c:${s.color}"><i></i>${escapeHtml(s.name)}</span>`;
}

function listDot(listId) {
  const l = listById(listId);
  return l ? `<i class="list-mini" style="background:${l.color}" data-tip="${escapeHtml(l.name)}"></i>` : '';
}

function dueTag(t) {
  const time = t.time ? ` ${timeRange(t)}` : '';
  if (!t.due) return t.time ? `<span class="tag">${timeRange(t)}</span>` : '';
  const d = diffDays(t.due, state.today);
  if (t.done) return `<span class="tag">${shortDate(t.due)}${time}</span>`;
  if (d < 0) return `<span class="tag overdue">${shortDate(t.due)}・${-d}日超過</span>`;
  if (d === 0) return `<span class="tag today">今日${time}</span>`;
  return `<span class="tag">${relDate(t.due, state.today)}${time}</span>`;
}

function todoRow(t, { draggable = true, compact = false, context = '', vt = true } = {}) {
  const subDone = t.subtasks.filter((s) => s.done).length;
  const subs = t.subtasks.length
    ? `<span class="meta-ic ${subDone === t.subtasks.length ? 'ok' : ''}">${ICON.sub}${subDone}/${t.subtasks.length}</span>` : '';
  const timeTag = t.time ? `<span class="tag time-tag">${ICON.clock}${timeRange(t)}</span>` : '';
  let meta;
  if (compact) {
    meta = [t.time ? `<span class="meta-ic">${timeRange(t)}</span>` : '', listDot(t.listId), subs].join('');
  } else {
    const due = context === 'today' && t.due === state.today ? timeTag : dueTag(t);
    meta = [
      due,
      subjectTag(t.subjectId),
      t.somedayId && somedayById(t.somedayId) ? `<span class="tag sd-link">${somedayById(t.somedayId).emoji || '✨'} いつか</span>` : '',
      listTag(t.listId),
      subs,
      t.note ? `<span class="meta-ic" data-tip="${escapeHtml(t.note.slice(0, 120))}">${ICON.note}</span>` : '',
      t.remind && t.time && !t.done ? `<span class="meta-ic">${ICON.bell}</span>` : '',
      t.focusMin ? `<span class="meta-ic">${ICON.timer}${minutesLabel(t.focusMin)}</span>` : '',
    ].join('');
  }
  const snooze = !t.done && t.due && t.due <= state.today
    ? `<button class="mini-btn" data-act="snooze" data-id="${t.id}" data-tip="明日にまわす">${ICON.arrowRight}</button>` : '';
  return `<div class="item todo prio-${t.priority}${t.done ? ' done' : ''}${compact ? ' compact' : ''}" data-kind="todo" data-id="${t.id}"${draggable ? ' draggable="true"' : ''}${vt ? vtName('t', t.id) : ''}>
    <button class="check" data-act="toggle-todo" data-id="${t.id}" aria-label="${t.done ? '未完了にもどす' : '完了にする'}">${ICON.check}</button>
    <div class="body" data-act="open-todo" data-id="${t.id}">
      <div class="title">${t.priority === 3 && !t.done ? '<span class="prio-flag">!</span>' : ''}${escapeHtml(t.title)}</div>
      <div class="meta">${meta}</div>
    </div>
    ${compact ? '' : `<div class="row-actions">
      ${snooze}
      <button class="mini-btn del" data-act="del-todo" data-id="${t.id}" data-tip="削除">${ICON.trash}</button>
    </div>`}
  </div>`;
}

function routineCheck(r, k) {
  const goal = r.goal || 1;
  const c = Math.max(0, countOf(r, k));
  const done = c >= goal;
  if (goal === 1) {
    return `<button class="check" data-act="toggle-routine" data-id="${r.id}" data-day="${k}" aria-label="${done ? '未完了にもどす' : '完了にする'}">${ICON.check}</button>`;
  }
  // 回数目標つき：リングで進み具合を見せる
  return `<button class="check counter ${c > 0 ? 'started' : ''}" data-act="toggle-routine" data-id="${r.id}" data-day="${k}" aria-label="1回追加" style="--p:${Math.min(1, c / goal)}">
    ${done ? ICON.check : `<span>${c}</span>`}
  </button>`;
}

function routineRow(r, { day = state.today, dots = 0, draggable = true, compact = false } = {}) {
  const scheduled = isScheduled(r, day);
  const skipped = isSkipped(r, day);
  const done = scheduled && isDone(r, day);
  const goal = r.goal || 1;
  const c = Math.max(0, countOf(r, day));
  const future = day > state.today;
  const canCheck = scheduled && !skipped && !future;
  const check = canCheck ? routineCheck(r, day) : '<span class="check placeholder"></span>';
  const vt = vtName(`r${day.replaceAll('-', '')}`, r.id);

  if (compact) {
    return `<div class="item routine compact${done ? ' done' : ''}${skipped ? ' skipped' : ''}" data-kind="routine" data-id="${r.id}" data-day="${day}"${vt}>
      ${check}
      <div class="body" data-act="open-routine" data-id="${r.id}">
        <div class="title">${escapeHtml(r.title)}</div>
        ${goal > 1 ? `<div class="meta"><span class="meta-ic">${c}/${goal}${escapeHtml(r.unit || '回')}</span></div>` : ''}
      </div>
    </div>`;
  }

  const streak = streakOf(r);
  let dotsHtml = '';
  if (dots) {
    dotsHtml = '<div class="dots">';
    for (let i = dots - 1; i >= 0; i--) {
      const k = addDays(state.today, -i);
      const cls = !isScheduled(r, k) ? 'off' : isSkipped(r, k) ? 'skip' : isDone(r, k) ? 'hit' : countOf(r, k) > 0 ? 'part' : '';
      dotsHtml += `<span class="dot ${cls} ${i === 0 ? 'today' : ''}" data-tip="${shortDate(k)}${cls === 'hit' ? ' 達成' : cls === 'skip' ? ' スキップ' : cls === 'off' ? ' 予定なし' : ''}"></span>`;
    }
    dotsHtml += '</div>';
  }

  const meta = [
    `<span class="tag">${scheduleLabel(r)}</span>`,
    goal > 1 ? `<span class="tag ${done ? 'today' : ''}">${c}/${goal}${escapeHtml(r.unit || '回')}</span>` : '',
    listTag(r.listId),
    r.paused ? '<span class="tag">一時停止中</span>' : '',
    !scheduled && !r.paused && day === state.today ? '<span class="muted">今日はお休み</span>' : '',
    skipped ? '<span class="muted">スキップ</span>' : '',
    r.remind ? `<span class="meta-ic">${ICON.bell}${r.remind}</span>` : '',
    streak > 0 ? `<span class="streak">🔥 ${streak}${streakUnit(r)}連続</span>` : '',
  ].join('');

  const minus = goal > 1 && c > 0 && canCheck
    ? `<button class="mini-btn" data-act="routine-minus" data-id="${r.id}" data-day="${day}" data-tip="1回へらす">${ICON.minus}</button>` : '';
  const skipBtn = scheduled && !done && !future
    ? `<button class="mini-btn" data-act="skip-routine" data-id="${r.id}" data-day="${day}" data-tip="${skipped ? 'スキップを取り消す' : 'この日はスキップ（連続記録は途切れません）'}">${ICON.skip}</button>` : '';

  return `<div class="item routine${done ? ' done' : ''}${skipped ? ' skipped' : ''}" data-kind="routine" data-id="${r.id}" data-day="${day}"${draggable ? ' draggable="true"' : ''}${vt}>
    ${check}
    <div class="body" data-act="open-routine" data-id="${r.id}">
      <div class="title">${escapeHtml(r.title)}</div>
      <div class="meta">${meta}</div>
      ${dotsHtml}
    </div>
    <div class="row-actions">
      ${minus}${skipBtn}
      <button class="mini-btn del" data-act="del-routine" data-id="${r.id}" data-tip="削除">${ICON.trash}</button>
    </div>
  </div>`;
}

// 今日の達成リング・次の予定・直近の達成率
function summaryCard() {
  const s = todaySummary();
  const wide = state.layout !== 'compact';
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
  const title = s.total === 0 ? '今日のタスクはありません' : s.left === 0 ? 'ぜんぶ完了！おつかれさま 🎉' : `あと ${s.left} つ`;
  const parts = [];
  if (s.routines) parts.push(`ルーティン ${s.rDone}/${s.routines}`);
  if (s.tTotal) parts.push(`ToDo ${s.tDone}/${s.tTotal}`);
  const focus = focusOf(state.today);
  if (focus.min) parts.push(`集中 ${minutesLabel(focus.min)}`);

  const next = nextUp();
  let nextHtml = '';
  if (next) {
    const start = toMinutes(next.time);
    const now = start <= nowMinutes();
    nextHtml = `<button class="next-up" data-act="open-todo" data-id="${next.id}">
      <span class="next-label">${now ? 'いまの予定' : '次の予定'}</span>
      <b>${timeRange(next)}</b>
      <span class="next-title">${escapeHtml(next.title)}</span>
      ${now ? '' : `<span class="next-until" data-min="${start}">${untilLabel(start)}</span>`}
    </button>`;
  }

  const days = wide ? 14 : 7;
  let bars = '';
  if (state.data.routines.length) {
    bars = `<div class="week" role="img" aria-label="直近${days}日のルーティン達成率">`;
    for (let i = days - 1; i >= 0; i--) {
      const k = addDays(state.today, -i);
      const rate = dayRate(k);
      bars += `<div class="day-bar ${i === 0 ? 'today' : ''}" data-tip="${shortDate(k)}：${rate === null ? '予定なし' : Math.round(rate * 100) + '%'}">
        <div class="track"><div class="fill" style="height:${(rate || 0) * 100}%"></div></div>
        <div class="lbl">${WEEK[dow(k)]}</div>
      </div>`;
    }
    bars += '</div>';
  }

  return `<section class="card summary">
    ${ring(pct, wide ? 84 : 64, wide ? 8 : 7)}
    <div class="summary-text">
      <div class="summary-title">${title}</div>
      <div class="summary-sub">${parts.join('　・　') || '下の欄から追加できます'}</div>
      ${nextHtml}
    </div>
    ${bars}
  </section>`;
}

function ring(pct, size, stroke, label = `${pct}<small>%</small>`) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg class="ring" viewBox="0 0 ${size} ${size}">
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
      <circle class="ring-bar" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/>
    </svg>
    <div class="ring-label">${label}</div>
  </div>`;
}

function journalCard(k = state.today) {
  const j = journalOf(k);
  const title = k === state.today ? '今日のひとこと' : `${shortDate(k)} のひとこと`;
  return `<section class="card journal" data-day="${k}">
    <div class="card-head">${title}</div>
    <div class="moods">
      ${MOODS.map((m, i) => `<button class="mood ${j.mood === i ? 'on' : ''}" data-act="mood" data-day="${k}" data-mood="${i}" data-tip="${MOOD_LABEL[i]}">${m}</button>`).join('')}
    </div>
    <textarea class="journal-text" data-day="${k}" data-focus-key="journal-${k}" rows="2" maxlength="500" placeholder="どんな一日だった？（自動で保存されます）">${escapeHtml(j.text)}</textarea>
  </section>`;
}

// ---------- 選択チップ ----------

function dayChips(days, attr) {
  const every = days.length === 7;
  return `<button type="button" class="chip ${every ? 'on' : ''}" data-${attr}="all">毎日</button>
    <span class="chip-sep"></span>
    ${weekOrder().map((d) => `<button type="button" class="chip day ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''} ${!every && days.includes(d) ? 'on' : ''}" data-${attr}="${d}">${WEEK[d]}</button>`).join('')}`;
}

// 「毎日」がオンの状態で曜日を押したら、その曜日だけにする
function toggleDay(days, value) {
  if (value === 'all') return [...ALL_DAYS];
  const d = Number(value);
  if (days.length === 7) return [d];
  const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
  return next.length ? next.sort() : [...ALL_DAYS];
}

function listChips(selected, attr) {
  return `<button type="button" class="chip ${!selected ? 'on' : ''}" data-${attr}="">なし</button>
    ${state.data.lists.map((l) => `<button type="button" class="chip list-chip ${selected === l.id ? 'on' : ''}" data-${attr}="${l.id}" style="--c:${l.color}"><i></i>${escapeHtml(l.name)}</button>`).join('')}`;
}

function subjectChips(selected, attr) {
  return `<button type="button" class="chip ${!selected ? 'on' : ''}" data-${attr}="">なし</button>
    ${school().subjects.map((s) => `<button type="button" class="chip list-chip ${selected === s.id ? 'on' : ''}" data-${attr}="${s.id}" style="--c:${s.color}"><i></i>${escapeHtml(s.name)}</button>`).join('')}`;
}

function dueChips(due, attr) {
  const t = state.today;
  const tmr = addDays(t, 1);
  const nw = nextMonday(t);
  const custom = due && ![t, tmr, nw].includes(due);
  return `<button type="button" class="chip ${due === t ? 'on' : ''}" data-${attr}="${t}">今日</button>
    <button type="button" class="chip ${due === tmr ? 'on' : ''}" data-${attr}="${tmr}">明日</button>
    <button type="button" class="chip ${due === nw ? 'on' : ''}" data-${attr}="${nw}">来週</button>
    <button type="button" class="chip ${!due ? 'on' : ''}" data-${attr}="">期限なし</button>
    <label class="chip date-chip ${custom ? 'on' : ''}">${custom ? shortDate(due) : '📅 日付'}
      <input type="date" data-${attr}-date value="${due || ''}"></label>`;
}

function priorityChips(p, attr) {
  return PRIORITY.map((x, i) => `<button type="button" class="chip prio-chip p${i} ${p === i ? 'on' : ''}" data-${attr}="${i}">${x.label}</button>`).join('');
}

function durationChips(d, attr) {
  return [null, ...DURATIONS].map((m) => `<button type="button" class="chip ${(d || null) === m ? 'on' : ''}" data-${attr}="${m ?? ''}">${m ? minutesLabel(m) : 'なし'}</button>`).join('');
}

// ============================================================
//  トースト・ツールチップ・紙吹雪
// ============================================================

let toastTimer = null;
let toastUndoSeq = null;

// undo: 直前の操作を「元に戻す」ボタンつき。そのあと別の変更をしたらボタンは消える
function toast(message, { undo: withUndo = false, redo: withRedo = false } = {}) {
  const el = $('#toast');
  const btn = withUndo ? `<button>${ICON.undo}元に戻す</button>` : withRedo ? `<button>${ICON.redo}やり直す</button>` : '';
  el.innerHTML = `<span>${escapeHtml(message)}</span>${btn}`;
  el.hidden = false;
  toastUndoSeq = withUndo ? saveSeq : null;
  clearTimeout(toastTimer);
  const close = () => { el.hidden = true; toastUndoSeq = null; };
  if (btn) el.querySelector('button').onclick = () => { close(); withUndo ? doUndo() : doRedo(); };
  toastTimer = setTimeout(close, btn ? 6000 : 3500);
}

function dismissStaleUndo() {
  if (toastUndoSeq !== null && saveSeq > toastUndoSeq) {
    $('#toast').hidden = true;
    toastUndoSeq = null;
  }
}

// data-tip を持つ要素にマウスを乗せたら説明を出す
(function setupTips() {
  const tip = $('#tip');
  let current = null;
  const hide = () => { tip.hidden = true; current = null; };
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el === current) return;
    current = el;
    if (!el || !el.dataset.tip) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const x = clamp(r.left + r.width / 2 - w / 2, 6, innerWidth - w - 6);
    let y = r.top - h - 8;
    if (y < 40) y = r.bottom + 8;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  });
  document.addEventListener('mousedown', hide);
  document.addEventListener('keydown', hide);
  document.addEventListener('scroll', hide, true);
})();

function confetti() {
  if (prefs().confetti === false || state.layout === 'mini' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = $('#confetti');
  const ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const style = getComputedStyle(document.documentElement);
  const colors = [style.getPropertyValue('--accent-a'), style.getPropertyValue('--accent-b'), '#f472b6', '#fbbf24', '#34d399'].map((c) => c.trim());
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 11 - 4,
    s: Math.random() * 6 + 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  (function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 2200);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (t < 2200) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(start);
}
