'use strict';

// ============================================================
//  ミニ表示
//  画面のすみに小さなバーを出して、次にやることだけを見せる
// ============================================================

function miniLabel(entry, index, total) {
  const pos = total > 1 ? `${index + 1}/${total}・` : '';
  if (entry.kind === 'routine') {
    const r = entry.item;
    const goal = r.goal || 1;
    return `${pos}ルーティン${goal > 1 ? `（${Math.max(0, countOf(r, state.today))}/${goal}${r.unit || '回'}）` : ''}`;
  }
  const t = entry.item;
  if (t.due && t.due < state.today) return `${pos}期限切れ（${shortDate(t.due)}）`;
  if (t.time) {
    const start = toMinutes(t.time);
    return `${pos}${timeRange(t)}${start > nowMinutes() ? `・${untilLabel(start)}` : ''}`;
  }
  return `${pos}今日の ToDo`;
}

function renderMini() {
  const el = $('#mini');
  if (state.layout !== 'mini') { el.innerHTML = ''; return; }
  const queue = pendingToday();
  state.miniIndex = queue.length ? ((state.miniIndex % queue.length) + queue.length) % queue.length : 0;
  const cur = queue[state.miniIndex];
  const s = todaySummary();
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;

  let body;
  let check = '';
  if (cur) {
    body = `<div class="mini-label">${escapeHtml(miniLabel(cur, state.miniIndex, queue.length))}</div>
      <div class="mini-title">${escapeHtml(cur.item.title)}</div>`;
    check = cur.kind === 'todo'
      ? `<button class="check" data-act="toggle-todo" data-id="${cur.item.id}" aria-label="完了にする">${ICON.check}</button>`
      : routineCheck(cur.item, state.today);
  } else {
    body = `<div class="mini-label">${s.total ? '今日のタスク' : '今日の予定'}</div>
      <div class="mini-title">${s.total ? 'ぜんぶ完了！おつかれさま 🎉' : 'まだありません'}</div>`;
  }

  el.innerHTML = `
    ${ring(pct, 40, 4.5, `${pct}`)}
    <div class="mini-body">${body}</div>
    ${check}
    ${queue.length > 1 ? `<button class="icon-btn" data-act="mini-next" aria-label="次のタスク" title="次のタスク">${ICON.chevR}</button>` : ''}
    ${timerActive() ? `<button class="timer-chip mini-timer ${timer.mode === 'break' ? 'break' : ''}" data-act="timer-toggle">${timer.running ? ICON.timer : ICON.pause}<span class="mini-timer-time">${fmtTime(timer.remaining)}</span></button>` : ''}
    <button class="icon-btn" data-act="mini-exit" aria-label="元のサイズに戻す" title="元のサイズに戻す">${ICON.expand}</button>`;
}
