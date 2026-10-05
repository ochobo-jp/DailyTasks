'use strict';

// ============================================================
//  状態
// ============================================================

const state = {
  data: null,
  today: todayKey(),
  view: 'today',
  layout: 'compact',          // 'compact' | 'wide' | 'xwide' | 'mini'
  filter: { listId: null, query: '', sort: 'manual' },
  newTodoDue: 'today',        // ToDo タブで追加するときの期限
  newRoutineDays: [...ALL_DAYS],
  calMonth: todayKey().slice(0, 7),
  calSelected: todayKey(),
  calWeek: null,              // 週表示の先頭の日（null なら今週）
  folds: {},                  // 折りたたみの開閉（再描画しても保つ）
  cursor: null,               // キーボードで選んでいる行の id
  zen: false,                 // 集中モード
  miniIndex: 0,               // ミニ表示で見ているタスク
  vtNames: false,             // 行に View Transition の名前をつけるか
  noTransitions: false,       // テスト用：アニメーションを切る
  somedayFilter: 'all',       // いつか：'all' | 'want' | 'must'
  newSomedayKind: 'want',     // いつか：追加するときの種類
  newSomedayHorizon: 'someday',
  schoolEdit: false,          // 時間割の編集モード
  schoolSubject: null,        // 学校タブで課題を追加するときの科目
  settings: { alwaysOnTop: false, openAtLogin: false, shortcut: 'Ctrl + Alt + T', quickAddShortcut: 'Ctrl + Alt + N' },
  windowState: { maximized: false, fullScreen: false, mini: false },
};

const DEFAULT_PREFS = {
  style: window.api.defaultStyle || 'glass',   // 見た目のスタイル（themes.js）。iPhone では 'ios'
  variant: window.api.defaultStyle === 'ios' ? 'blue' : 'lavender',    // スタイルごとの色
  tint: 0.6,
  dark: false,            // ガラスの夜モード
  features: { school: true, someday: true, life: true },
  bgm: { on: false, sound: 'rain', volume: 0.6, duringBreak: false, tracks: [], shuffle: false },
  classNotify: true,      // 授業の 5 分前に通知
  tabs: null,             // iPhone の下のタブに並べる画面（null ならおすすめの順）
  installHintClosed: false, // 「ホーム画面に追加」の案内を閉じた
  weather: { enabled: true, place: null, prompted: false },
  sound: true,
  confetti: true,
  morningTime: null,
  focusMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  weekStart: 1,           // 1 = 月曜はじまり、0 = 日曜はじまり
  autoRollover: false,    // 期限切れを自動で今日へ
  calMode: 'month',       // 'month' | 'week'
};

const prefs = () => state.data.prefs;
const weekOrder = () => (prefs().weekStart === 0 ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0]);
const weekStartOf = (k) => addDays(k, -((dow(k) - prefs().weekStart + 7) % 7));

// ============================================================
//  読み込み・移行
// ============================================================

function freshPrefs() {
  return JSON.parse(JSON.stringify(DEFAULT_PREFS));
}

function emptySchool() {
  return { setup: false, days: [1, 2, 3, 4, 5], periods: [], subjects: [], timetable: {}, attendance: {} };
}

function emptyData() {
  return {
    version: 2, lists: [], routines: [], todos: [], log: {}, journal: {}, focus: {},
    someday: [], school: emptySchool(), life: emptyLife(),
    badges: {}, archivedDone: 0, prefs: freshPrefs(),
  };
}

function newTodo(fields) {
  return {
    id: uid(), title: '', due: null, time: null, duration: null, remind: false, remindBefore: 0,
    priority: 0, listId: null, subjectId: null, note: '', subtasks: [], focusMin: 0,
    done: false, doneAt: null, createdAt: state.today, ...fields,
  };
}

// 設定を今の形にそろえる（入れ子の項目も足りないものを補う）
function mergePrefs(p = {}) {
  const d = freshPrefs();
  const out = {
    ...d, ...p,
    features: { ...d.features, ...(p.features || {}) },
    bgm: { ...d.bgm, ...(p.bgm || {}) },
    weather: { ...d.weather, ...(p.weather || {}) },
  };
  // 以前の「テーマの色」は、ガラスの色として引き継ぐ
  if (p.accent && !p.variant) out.variant = p.accent;
  delete out.accent;
  // ピアノの BGM はケルトに入れ替えた
  if (out.bgm.sound === 'piano') out.bgm.sound = 'celtic';
  return out;
}

function newRoutine(fields) {
  return {
    id: uid(), title: '', schedule: { type: 'weekly', days: [...ALL_DAYS] },
    goal: 1, unit: '', remind: null, listId: null, note: '', paused: false,
    createdAt: state.today, ...fields,
  };
}

function sampleData() {
  const t = state.today;
  const d = emptyData();
  const life = { id: uid(), name: '生活', color: LIST_COLORS[0] };
  const work = { id: uid(), name: '仕事', color: LIST_COLORS[1] };
  const study = { id: uid(), name: '勉強', color: LIST_COLORS[2] };
  d.lists = [life, work, study];
  d.routines = [
    newRoutine({ title: '💧 水を飲む', goal: 6, unit: '杯', listId: life.id }),
    newRoutine({ title: '🧘 ストレッチ 5分', remind: '22:00', listId: life.id }),
    newRoutine({ title: '♻️ 燃えるゴミを出す', schedule: { type: 'weekly', days: [1, 4] }, remind: '07:30', listId: life.id }),
    newRoutine({ title: '📚 英単語アプリ', listId: study.id }),
    newRoutine({ title: '💳 家計簿をつける', schedule: { type: 'monthly', dates: [1, 15] }, listId: life.id }),
  ];
  d.todos = [
    newTodo({ title: 'Daily Tasks を使ってみる ✨', due: t, priority: 2, subtasks: [
      { id: uid(), title: '「明日 15時 歯医者 #生活」と入力してみる', done: false },
      { id: uid(), title: 'ウィンドウを最大化してみる', done: false },
      { id: uid(), title: '集中タイマーを回してみる', done: false },
    ] }),
    newTodo({ title: '企画書のたたき台を作る', due: t, time: '15:00', duration: 60, remind: true, priority: 3, listId: work.id }),
    newTodo({ title: '週末の買い出しリストを作る', due: addDays(t, 1), listId: life.id }),
    newTodo({ title: '読みたい本をメモする', listId: study.id, note: '気になっている本をまとめておく' }),
  ];
  return d;
}

// 古い形式のデータを今の形に合わせる
function migrate(raw) {
  if (!raw) return null;
  if (raw.version === 2) {
    raw.prefs = mergePrefs(raw.prefs);
    raw.lists ||= [];
    raw.journal ||= {};
    raw.focus ||= {};
    raw.someday ||= [];
    raw.school = { ...emptySchool(), ...(raw.school || {}) };
    raw.life = { ...emptyLife(), ...(raw.life || {}) };
    raw.badges ||= {};
    raw.archivedDone ||= 0;
    return raw;
  }
  if (raw.version !== 1) return null;
  const d = emptyData();
  d.prefs = mergePrefs(raw.prefs || {});
  d.routines = raw.routines.map((r) => newRoutine({ id: r.id, title: r.title, schedule: { type: 'weekly', days: r.days }, createdAt: r.createdAt }));
  d.todos = raw.todos.map((t) => newTodo({ id: t.id, title: t.title, due: t.due, done: t.done, doneAt: t.doneAt, createdAt: t.createdAt }));
  for (const [k, ids] of Object.entries(raw.log || {})) {
    d.log[k] = Object.fromEntries(ids.map((id) => [id, 1]));
  }
  return d;
}

// ============================================================
//  保存と「元に戻す」
//  保存のたびにスナップショットを残す。見た目の設定とバッジは対象外
// ============================================================

let saveTimer = null;
let saveSeq = 0;

function save() {
  saveSeq++;
  dismissStaleUndo();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}

function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  recordHistory();
  checkBadges();
  return window.api.save(state.data);
}
window.addEventListener('beforeunload', () => { if (saveTimer) flush(); });
// iPhone ではアプリを切り替えたときにそのまま終了することがあるので、隠れた時点で書き出す
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) flush(); });
window.addEventListener('pagehide', () => { if (saveTimer) flush(); });

const undoHistory = { undo: [], redo: [], current: null };
const HISTORY_LIMIT = 100;

function snapshotData() {
  const { prefs: _p, badges: _b, ...rest } = state.data;
  return JSON.stringify(rest);
}

function recordHistory() {
  const snap = snapshotData();
  if (undoHistory.current === null) { undoHistory.current = snap; return; }
  if (snap === undoHistory.current) return;
  undoHistory.undo.push(undoHistory.current);
  if (undoHistory.undo.length > HISTORY_LIMIT) undoHistory.undo.shift();
  undoHistory.redo = [];
  undoHistory.current = snap;
}

// クリックなどの操作を始める前に呼ぶ。直前までの変更を 1 つの「元に戻す」単位として区切る
const checkpoint = () => recordHistory();

function resetHistory() {
  undoHistory.undo = [];
  undoHistory.redo = [];
  undoHistory.current = snapshotData();
}

function restoreSnapshot(snap) {
  undoHistory.current = snap;
  state.data = { ...JSON.parse(snap), prefs: state.data.prefs, badges: state.data.badges };
  window.api.save(state.data);
}

function undo() {
  if (saveTimer) flush();
  if (!undoHistory.undo.length) return false;
  undoHistory.redo.push(undoHistory.current);
  restoreSnapshot(undoHistory.undo.pop());
  return true;
}

function redo() {
  if (saveTimer) flush();
  if (!undoHistory.redo.length) return false;
  undoHistory.undo.push(undoHistory.current);
  restoreSnapshot(undoHistory.redo.pop());
  return true;
}

// ============================================================
//  リスト
// ============================================================

const listById = (id) => state.data.lists.find((l) => l.id === id);

function ensureList(name) {
  const found = state.data.lists.find((l) => normalize(l.name) === normalize(name));
  if (found) return found;
  const list = { id: uid(), name, color: LIST_COLORS[state.data.lists.length % LIST_COLORS.length] };
  state.data.lists.push(list);
  return list;
}

function deleteList(id) {
  state.data.lists = state.data.lists.filter((x) => x.id !== id);
  for (const x of [...state.data.todos, ...state.data.routines]) if (x.listId === id) x.listId = null;
  if (state.filter.listId === id) state.filter.listId = null;
}

// ============================================================
//  ルーティン
// ============================================================

const isScheduled = (r, k) => Core.isScheduled(r, k);
const countOf = (r, k) => Core.countOf(state.data, r, k);
const isDone = (r, k) => Core.isDone(state.data, r, k);
const isSkipped = (r, k) => Core.isSkipped(state.data, r, k);

function setCount(r, k, n) {
  const log = state.data.log;
  const day = { ...(log[k] || {}) };
  if (n === 0) delete day[r.id];
  else day[r.id] = n;
  if (Object.keys(day).length) log[k] = day;
  else delete log[k];
}

// チェックを押したとき：回数目標があれば +1、達成済みならリセット
function bumpRoutine(r, k) {
  const goal = r.goal || 1;
  const c = Math.max(0, countOf(r, k));
  const next = c >= goal ? 0 : c + 1;
  setCount(r, k, next);
  return next >= goal;
}

// 予定のある日だけを数える連続達成数。今日が未完了でも「まだ途中」なので途切れない。スキップした日は飛ばす
function streakOf(r) {
  let k = state.today;
  let n = 0;
  if (isScheduled(r, k) && !isDone(r, k)) k = addDays(k, -1);
  for (let i = 0; i < 3660 && k >= r.createdAt; i++, k = addDays(k, -1)) {
    if (!isScheduled(r, k) || isSkipped(r, k)) continue;
    if (isDone(r, k)) n++;
    else break;
  }
  return n;
}

function bestStreakOf(r) {
  let best = 0;
  let cur = 0;
  for (let k = r.createdAt, i = 0; k <= state.today && i < 3660; k = addDays(k, 1), i++) {
    if (!isScheduled(r, k) || isSkipped(r, k)) continue;
    if (isDone(r, k)) best = Math.max(best, ++cur);
    else if (k !== state.today) cur = 0;
  }
  return best;
}

const streakUnit = (r) => (r.schedule.type === 'weekly' && r.schedule.days.length === 7 ? '日' : '回');

// 期間内の達成率（予定がなければ null）
function rateOf(r, days) {
  let sched = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const k = addDays(state.today, -i);
    if (k < r.createdAt) break;
    if (!isScheduled(r, k) || isSkipped(r, k)) continue;
    if (k === state.today && !isDone(r, k)) continue; // 今日の未完了はまだ数えない
    sched++;
    if (isDone(r, k)) done++;
  }
  return sched ? done / sched : null;
}

// その日のルーティン達成率（予定がなければ null）
function dayRate(k) {
  const sched = state.data.routines.filter((r) => isScheduled(r, k) && !isSkipped(r, k));
  if (!sched.length) return null;
  return sched.filter((r) => isDone(r, k)).length / sched.length;
}

function scheduleText(s) {
  if (s.type === 'monthly') return s.dates.length === 1 && s.dates[0] === 31 ? '毎月末' : `毎月 ${[...s.dates].sort((a, b) => a - b).map((d) => `${d}日`).join('・')}`;
  if (s.type === 'interval') return s.every === 1 ? '毎日' : `${s.every}日ごと`;
  const days = s.days;
  const key = [...days].sort().join(',');
  if (days.length === 7) return '毎日';
  if (key === '1,2,3,4,5') return '平日';
  if (key === '0,6') return '週末';
  return weekOrder().filter((d) => days.includes(d)).map((d) => WEEK[d]).join('・');
}
const scheduleLabel = (r) => scheduleText(r.schedule);

function duplicateRoutine(r) {
  const copy = { ...JSON.parse(JSON.stringify(r)), id: uid(), title: `${r.title}（コピー）`, createdAt: state.today };
  state.data.routines.splice(state.data.routines.indexOf(r) + 1, 0, copy);
  return copy;
}

// ============================================================
//  ToDo
// ============================================================

function resolveDue(choice) {
  if (choice === 'today') return state.today;
  if (choice === 'tomorrow') return addDays(state.today, 1);
  if (choice === 'none') return null;
  return choice;
}

function todayTodos() {
  const t = state.today;
  const todos = state.data.todos;
  return {
    overdue: todos.filter((x) => !x.done && x.due && x.due < t),
    due: todos.filter((x) => !x.done && x.due === t),
    doneToday: todos.filter((x) => x.done && x.doneAt === t),
  };
}

const byTime = (a, b) => ((a.time || '99') < (b.time || '99') ? -1 : (a.time || '99') > (b.time || '99') ? 1 : 0);
const byDue = (a, b) => ((a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : byTime(a, b));
const byPriority = (a, b) => (b.priority - a.priority) || byDue(a, b);

function todaySummary() {
  const t = state.today;
  const routines = state.data.routines.filter((r) => isScheduled(r, t) && !isSkipped(r, t));
  const rDone = routines.filter((r) => isDone(r, t)).length;
  const { overdue, due, doneToday } = todayTodos();
  const tTotal = overdue.length + due.length + doneToday.length;
  const total = routines.length + tTotal;
  const done = rDone + doneToday.length;
  return { routines: routines.length, rDone, tTotal, tDone: doneToday.length, total, done, left: total - done };
}

function toggleTodo(t) {
  t.done = !t.done;
  t.doneAt = t.done ? state.today : null;
  return t.done;
}

function duplicateTodo(t) {
  const copy = newTodo({
    ...JSON.parse(JSON.stringify(t)),
    id: uid(), done: false, doneAt: null, focusMin: 0, createdAt: state.today,
  });
  copy.subtasks = copy.subtasks.map((s) => ({ ...s, id: uid(), done: false }));
  state.data.todos.splice(state.data.todos.indexOf(t) + 1, 0, copy);
  return copy;
}

// 期限切れをまとめて今日へ
function rollover() {
  const moved = state.data.todos.filter((t) => !t.done && t.due && t.due < state.today);
  moved.forEach((t) => { t.due = state.today; });
  return moved.length;
}

// 今日まだ終わっていないもの（ミニ表示で順番に見せる）
function pendingToday() {
  const t = state.today;
  const { overdue, due } = todayTodos();
  // 1 時間以内（または時刻を過ぎた）予定 → 時刻なし → もっと先の予定 の順
  const soonLimit = nowMinutes() + 60;
  const timed = due.filter((x) => x.time).sort(byTime);
  const soon = timed.filter((x) => toMinutes(x.time) <= soonLimit);
  const later = timed.filter((x) => toMinutes(x.time) > soonLimit);
  const untimed = due.filter((x) => !x.time).sort((a, b) => b.priority - a.priority);
  const routines = state.data.routines.filter((r) => isScheduled(r, t) && !isSkipped(r, t) && !isDone(r, t));
  return [
    ...overdue.sort(byDue),
    ...soon,
    ...untimed,
    ...later,
  ].map((item) => ({ kind: 'todo', item })).concat(routines.map((item) => ({ kind: 'routine', item })));
}

// これからの（または進行中の）時刻つきの予定
function nextUp() {
  const now = nowMinutes();
  return state.data.todos
    .filter((x) => !x.done && x.due === state.today && x.time && toMinutes(x.time) + (x.duration || 0) >= now)
    .sort(byTime)[0] || null;
}

// ============================================================
//  日記・集中
// ============================================================

function journalOf(k) {
  return state.data.journal[k] || { mood: null, text: '' };
}

function setJournal(k, patch) {
  const j = { ...journalOf(k), ...patch };
  if (j.mood === null && !j.text) delete state.data.journal[k];
  else state.data.journal[k] = j;
}

function focusOf(k) {
  return state.data.focus[k] || { min: 0, sessions: 0 };
}

function addFocus(k, min) {
  const f = focusOf(k);
  state.data.focus[k] = { min: f.min + min, sessions: f.sessions + 1 };
}
