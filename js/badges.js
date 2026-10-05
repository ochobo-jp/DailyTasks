'use strict';

// ============================================================
//  バッジ（実績）
//  手に入れた日は data.badges に残し、「元に戻す」でも消えない
// ============================================================

const BADGES = [
  { id: 'first', icon: '🌱', name: 'はじめの一歩', desc: 'ToDo をはじめて完了', metric: 'done', goal: 1 },
  { id: 'done10', icon: '✅', name: '10 タスク', desc: 'ToDo を 10 件完了', metric: 'done', goal: 10 },
  { id: 'done50', icon: '📦', name: '50 タスク', desc: 'ToDo を 50 件完了', metric: 'done', goal: 50 },
  { id: 'done100', icon: '🏆', name: '100 タスク', desc: 'ToDo を 100 件完了', metric: 'done', goal: 100 },
  { id: 'done500', icon: '👑', name: '500 タスク', desc: 'ToDo を 500 件完了', metric: 'done', goal: 500 },
  { id: 'streak3', icon: '🔥', name: '三日坊主卒業', desc: 'ルーティンを 3 回連続', metric: 'streak', goal: 3 },
  { id: 'streak7', icon: '🔥', name: '1 週間つづいた', desc: 'ルーティンを 7 回連続', metric: 'streak', goal: 7 },
  { id: 'streak30', icon: '💎', name: '1 か月つづいた', desc: 'ルーティンを 30 回連続', metric: 'streak', goal: 30 },
  { id: 'streak100', icon: '🌟', name: '100 回つづいた', desc: 'ルーティンを 100 回連続', metric: 'streak', goal: 100 },
  { id: 'perfect1', icon: '🎯', name: 'パーフェクトデー', desc: 'その日のルーティンを全部達成', metric: 'perfect', goal: 1 },
  { id: 'perfect7', icon: '🏅', name: 'パーフェクト × 7', desc: 'パーフェクトな日が 7 日', metric: 'perfect', goal: 7 },
  { id: 'perfect30', icon: '🎖️', name: 'パーフェクト × 30', desc: 'パーフェクトな日が 30 日', metric: 'perfect', goal: 30 },
  { id: 'focus1', icon: '🍅', name: '集中 1 時間', desc: '集中タイマーの合計 1 時間', metric: 'focus', goal: 60 },
  { id: 'focus10', icon: '⏳', name: '集中 10 時間', desc: '集中タイマーの合計 10 時間', metric: 'focus', goal: 600 },
  { id: 'focus50', icon: '🧠', name: '集中 50 時間', desc: '集中タイマーの合計 50 時間', metric: 'focus', goal: 3000 },
  { id: 'journal7', icon: '📔', name: '日記 7 日', desc: 'ひとこと日記を 7 日分', metric: 'journal', goal: 7 },
  { id: 'journal30', icon: '📚', name: '日記 30 日', desc: 'ひとこと日記を 30 日分', metric: 'journal', goal: 30 },
  { id: 'dream1', icon: '🌠', name: '夢がひとつ叶った', desc: 'いつかリストを 1 つ叶える', metric: 'dream', goal: 1 },
  { id: 'dream5', icon: '🌈', name: '5 つ叶えた', desc: 'いつかリストを 5 つ叶える', metric: 'dream', goal: 5 },
  { id: 'attend30', icon: '🏫', name: '授業 30 コマ', desc: '出席した授業が 30 コマ', metric: 'attend', goal: 30 },
  { id: 'attend100', icon: '🎒', name: '授業 100 コマ', desc: '出席した授業が 100 コマ', metric: 'attend', goal: 100 },
];

function badgeMetrics() {
  const d = state.data;
  let perfect = 0;
  for (const k of Object.keys(d.log)) {
    if (k <= state.today && dayRate(k) === 1) perfect++;
  }
  return {
    done: d.todos.filter((t) => t.done).length + (d.archivedDone || 0),
    streak: Math.max(0, ...d.routines.map(bestStreakOf)),
    perfect,
    focus: Object.values(d.focus).reduce((s, f) => s + f.min, 0),
    journal: Object.values(d.journal).filter((j) => j.text || (j.mood !== null && j.mood !== undefined)).length,
    dream: (d.someday || []).filter((x) => x.status === 'done').length,
    attend: Object.values(d.school?.attendance || {}).reduce((n, day) => n + Object.values(day).filter((r) => r.s === 'present' || r.s === 'late').length, 0),
  };
}

// 新しく条件を満たしたバッジがあれば記録して知らせる
function checkBadges({ announce = true } = {}) {
  if (!state.data) return [];
  const m = badgeMetrics();
  const earned = state.data.badges;
  const fresh = BADGES.filter((b) => !earned[b.id] && m[b.metric] >= b.goal);
  if (!fresh.length) return [];
  fresh.forEach((b) => { earned[b.id] = state.today; });
  window.api.save(state.data);
  if (announce && state.layout !== 'mini') {
    const b = fresh[fresh.length - 1];
    setTimeout(() => {
      toast(`🏅 バッジを手に入れました：${b.icon} ${b.name}`);
      confetti();
    }, 350);
  }
  return fresh;
}

function badgesCard() {
  const m = badgeMetrics();
  const earned = state.data.badges;
  const count = BADGES.filter((b) => earned[b.id]).length;
  const tiles = BADGES.map((b) => {
    const got = earned[b.id];
    const p = Math.min(1, m[b.metric] / b.goal);
    return `<div class="badge-tile ${got ? 'earned' : 'locked'}" data-tip="${got ? `${shortDate(got)} に獲得` : `あと ${Math.max(0, b.goal - m[b.metric])}${b.metric === 'focus' ? '分' : ''}`}">
      <span class="b-icon">${b.icon}</span>
      <span class="b-name">${b.name}</span>
      <span class="b-desc">${b.desc}</span>
      ${got ? '' : `<span class="b-prog"><i style="width:${p * 100}%"></i></span>`}
    </div>`;
  }).join('');
  return `<section class="card chart-card wide-card">
    <div class="card-head">バッジ <span class="muted small">${count} / ${BADGES.length}</span></div>
    <div class="badges">${tiles}</div>
  </section>`;
}
