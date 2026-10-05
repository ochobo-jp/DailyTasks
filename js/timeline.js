'use strict';

// ============================================================
//  タイムライン（今日の時間割）
//  時刻のある ToDo と、通知時刻のあるルーティンを並べる
// ============================================================

const TL_HOUR = 46;    // 1 時間の高さ
const TL_GUTTER = 44;  // 時刻ラベルの幅

function timelineEntries() {
  const t = state.today;
  const todos = state.data.todos
    .filter((x) => x.due === t && x.time)
    .map((x) => ({ kind: 'todo', item: x, min: toMinutes(x.time), dur: x.duration || 30 }));
  const routines = state.data.routines
    .filter((r) => r.remind && isScheduled(r, t) && !isSkipped(r, t))
    .map((r) => ({ kind: 'routine', item: r, min: toMinutes(r.remind), dur: 30 }));
  const classes = classesOn(t)
    .filter((c) => c.rec?.s !== 'cancel')
    .map((c) => ({ kind: 'class', item: c, min: toMinutes(c.start), dur: Math.max(20, toMinutes(c.end) - toMinutes(c.start)) }));
  const all = [...classes, ...todos, ...routines].sort((a, b) => a.min - b.min || (a.kind < b.kind ? 1 : -1));
  assignLanes(all);
  return all;
}

// 時間が重なる予定は横に並べる
function assignLanes(entries) {
  let group = [];
  let groupEnd = -1;
  let lanes = [];
  const close = () => {
    group.forEach((e) => { e.lanes = lanes.length; });
    group = [];
    lanes = [];
  };
  for (const e of entries) {
    const end = e.min + Math.max(e.dur, 30);
    if (group.length && e.min >= groupEnd) close();
    let lane = lanes.findIndex((x) => x <= e.min);
    if (lane < 0) { lane = lanes.length; lanes.push(end); } else lanes[lane] = end;
    e.lane = lane;
    group.push(e);
    groupEnd = group.length === 1 ? end : Math.max(groupEnd, end);
  }
  if (group.length) close();
}

function timelineCard() {
  const entries = timelineEntries();
  const now = nowMinutes();
  let start = 7;
  let end = 23;
  for (const e of entries) {
    start = Math.min(start, Math.floor(e.min / 60));
    end = Math.max(end, Math.ceil((e.min + e.dur) / 60));
  }
  if (now >= 5 * 60) start = Math.min(start, Math.floor(now / 60));
  end = clamp(end, start + 1, 24);
  const y = (min) => ((min - start * 60) / 60) * TL_HOUR;

  let hours = '';
  for (let h = start; h <= end; h++) {
    hours += `<div class="tl-hour" style="top:${y(h * 60)}px"><span>${h}:00</span></div>`;
  }

  const blocks = entries.map((e) => {
    const height = Math.max(26, (e.dur / 60) * TL_HOUR - 3);
    const width = `(100% - ${TL_GUTTER + 6}px) / ${e.lanes}`;
    const style = `top:${y(e.min) + 1}px;height:${height}px;left:calc(${TL_GUTTER}px + ${width} * ${e.lane});width:calc(${width} - 4px)`;
    const short = height < 40 ? ' short' : '';
    if (e.kind === 'todo') {
      const x = e.item;
      const color = listById(x.listId)?.color || 'var(--accent-a)';
      return `<div class="tl-block prio-${x.priority}${x.done ? ' done' : ''}${short}" data-kind="todo" data-id="${x.id}" draggable="true" style="${style};--c:${color}">
        <button class="check small" data-act="toggle-todo" data-id="${x.id}" aria-label="完了にする">${ICON.check}</button>
        <div class="tl-body" data-act="open-todo" data-id="${x.id}">
          <div class="tl-title">${escapeHtml(x.title)}</div>
          <div class="tl-time">${timeRange(x)}</div>
        </div>
      </div>`;
    }
    if (e.kind === 'class') {
      const c = e.item;
      return `<div class="tl-block class${short}" data-kind="class" data-id="${c.sub.id}" data-day="${state.today}" data-period="${c.i}" style="${style};--c:${c.sub.color}">
        <div class="tl-body" data-act="open-subject" data-id="${c.sub.id}">
          <div class="tl-title">${c.i + 1}限 ${escapeHtml(c.sub.name)}</div>
          <div class="tl-time">${c.start}–${c.end}${c.sub.room ? `・${escapeHtml(c.sub.room)}` : ''}</div>
        </div>
        ${c.rec ? `<span class="att-mark ${c.rec.s}">${ATT[c.rec.s].mark}</span>` : ''}
      </div>`;
    }
    const r = e.item;
    const done = isDone(r, state.today);
    return `<div class="tl-block routine${done ? ' done' : ''} short" data-kind="routine" data-id="${r.id}" data-day="${state.today}" style="${style}">
      ${routineCheck(r, state.today).replace('class="check', 'class="check small')}
      <div class="tl-body" data-act="open-routine" data-id="${r.id}">
        <div class="tl-title">${escapeHtml(r.title)}</div>
      </div>
    </div>`;
  }).join('');

  const nowLine = now >= start * 60 && now <= end * 60
    ? `<div class="tl-now" style="top:${y(now)}px" data-start="${start}"><span>${hm(now)}</span></div>` : '';

  return `<section class="card timeline" data-start="${start}">
    <div class="card-head">タイムライン <span class="muted small">${entries.length ? `${entries.length} 件の予定` : '時刻のある予定はまだありません'}</span></div>
    <div class="tl-scroll" data-scroll-key="timeline">
      <div class="tl-grid" data-act="tl-slot" data-drop-time style="height:${(end - start) * TL_HOUR}px">${hours}${blocks}${nowLine}</div>
    </div>
    <div class="hint small tl-hint">${IS_TOUCH ? 'タップで追加' : 'クリックで追加・ToDo をドラッグで時刻を設定'}</div>
  </section>`;
}

// マウスの位置を時刻（分）に変える
function tlMinutesAt(grid, clientY, step = 15) {
  const start = Number(grid.closest('.timeline').dataset.start);
  const r = grid.getBoundingClientRect();
  const m = start * 60 + ((clientY - r.top) / TL_HOUR) * 60;
  return clamp(Math.round(m / step) * step, 0, 24 * 60 - step);
}

function showTlGhost(grid, min) {
  let g = $('.tl-ghost', grid);
  if (!g) {
    g = document.createElement('div');
    g.className = 'tl-ghost';
    grid.appendChild(g);
  }
  const start = Number(grid.closest('.timeline').dataset.start);
  g.style.top = `${((min - start * 60) / 60) * TL_HOUR}px`;
  g.innerHTML = `<span>${hm(min)}</span>`;
}

function clearTlGhost() {
  $$('.tl-ghost').forEach((g) => g.remove());
}

// 今の時刻の線だけを動かす（毎分）
function updateNowLine() {
  const line = $('.tl-now');
  if (!line) return;
  const start = Number(line.dataset.start);
  const now = nowMinutes();
  line.style.top = `${((now - start * 60) / 60) * TL_HOUR}px`;
  line.querySelector('span').textContent = hm(now);
}

// 画面を開いたときは、今の時刻が見える位置までスクロール
function scrollTimelineToNow() {
  const sc = $('.tl-scroll');
  const line = $('.tl-now');
  if (!sc || !line) return;
  sc.scrollTop = Math.max(0, line.offsetTop - TL_HOUR * 1.5);
}
