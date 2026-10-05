'use strict';

// ============================================================
//  共通の小道具
// ============================================================

const { pad, keyOf, parseKey, todayKey, addDays, dow, diffDays, toMinutes } = Core;

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const MOODS = ['😄', '🙂', '😐', '😣', '😫'];
const MOOD_LABEL = ['最高', 'いい感じ', 'ふつう', 'いまいち', 'つらい'];
const PRIORITY = [{ label: 'なし' }, { label: '低' }, { label: '中' }, { label: '高' }];
// リストの色。作った順に割り当てる
const LIST_COLORS = ['#8b7cf6', '#f472b6', '#34d399', '#f59e0b', '#60a5fa', '#f87171', '#14b8a6', '#a78bfa'];
const DURATIONS = [15, 30, 45, 60, 90, 120];

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// どこで動いているか。PC アプリ（Electron）か、ブラウザ / iPhone のホーム画面アプリ（web/api.js）か
const IS_WEB = window.api.platform === 'web';
const IS_TOUCH = !!window.api.touch;
const TAP = IS_TOUCH ? 'タップ' : 'クリック';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const shortDate = (k) => { const d = parseKey(k); return `${d.getMonth() + 1}/${d.getDate()}(${WEEK[d.getDay()]})`; };
const longDate = (k) => { const d = parseKey(k); return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEK[d.getDay()]}曜日`; };

function relDate(k, today) {
  const d = diffDays(k, today);
  if (d === 0) return '今日';
  if (d === 1) return '明日';
  if (d === 2) return '明後日';
  if (d === -1) return '昨日';
  return shortDate(k);
}

function minutesLabel(min) {
  if (min < 60) return `${min}分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}時間${m}分` : `${h}時間`;
}

function debounce(fn, ms) {
  let t = null;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const hm = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
const timeRange = (t) => (!t.time ? '' : t.duration ? `${t.time}–${hm(toMinutes(t.time) + t.duration)}` : t.time);

function untilLabel(min) {
  const d = min - nowMinutes();
  return d <= 0 ? 'まもなく' : `あと${minutesLabel(d)}`;
}

// ひらがな / カタカナ、全角 / 半角、大文字 / 小文字の違いを無視して比べる
const normalize = (s) => String(s ?? '').normalize('NFKC').toLowerCase()
  .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

// 貼り付けた箇条書きを 1 行ずつに分ける（「- 」「・」「1.」「[ ]」などの頭は取る）
const splitLines = (text) => String(text || '').split(/\r?\n/)
  .map((s) => s.replace(/^\s*(?:[-*+・•●○◦▪□☐✓✔]|\d{1,3}[.)．、]|\[[ xX]?\])\s*/, '').trim())
  .filter(Boolean)
  .slice(0, 200);

const nextMonday = (today) => addDays(today, ((8 - dow(today)) % 7) || 7);
const monthEnd = (today) => { const d = parseKey(today); return keyOf(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };

// ============================================================
//  アイコン（線画 SVG）
// ============================================================

const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" ${extra}>${d}</svg>`;
const ICON = {
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M6 12h12"/>'),
  close: svg('<path d="M7 7l10 10M17 7L7 17"/>'),
  pin: svg('<path d="M15 4.5l4.5 4.5-3 1-3.5 3.5.5 4-1.5 1.5-3.5-3.5L4 20l4.5-4.5L5 12l1.5-1.5 4 .5L14 7.5z"/>'),
  maximize: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
  restore: svg('<rect x="5" y="9" width="10" height="10" rx="2"/><path d="M9 9V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>'),
  pip: svg('<rect x="3" y="5" width="18" height="14" rx="2.5"/><rect x="11.5" y="11" width="7" height="5.5" rx="1.2"/>'),
  expand: svg('<path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  trash: svg('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
  repeat: svg('<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>'),
  calendar: svg('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  timer: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2.5h6"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  more: svg('<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>'),
  bell: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
  note: svg('<path d="M6 3.5h9l4 4V20a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 20z"/><path d="M9 11h7M9 15h5"/>'),
  sub: svg('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><path d="M14 7h7M14 17h7"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/>'),
  arrowRight: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  chevL: svg('<path d="M15 6l-6 6 6 6"/>'),
  chevR: svg('<path d="M9 6l6 6-6 6"/>'),
  skip: svg('<path d="M5 5l9 7-9 7z"/><path d="M18 5v14"/>'),
  play: svg('<path d="M7 4.5l12 7.5-12 7.5z"/>'),
  pause: svg('<path d="M8 5v14M16 5v14"/>'),
  reset: svg('<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4.5h4.5"/>'),
  undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo: svg('<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  upload: svg('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
  folder: svg('<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
  keyboard: svg('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  sparkle: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
  trophy: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>'),
  flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  tag: svg('<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8" cy="8" r="1.3"/>'),
  school: svg('<path d="M3 21h18M5 21V10.5l7-4 7 4V21"/><path d="M10 21v-5h4v5"/><path d="M12 6.5V2.5l3.5 1.4L12 5.3"/>'),
  star: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'),
  music: svg('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  paint: svg('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.5-1-2.6 0-.9.7-1.7 1.7-1.7h2.1A4.4 4.4 0 0 0 21 10.6C21 6.4 17 3 12 3z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/>'),
};

// ============================================================
//  クイック入力の解析
//  例：「明日 15時 歯医者 #生活 !高」「平日 7:30 ジム」「毎月25日 家賃」
// ============================================================

const WEEKDAY_WORDS = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
// 「月曜と木曜」→ [1, 4]
const daysFrom = (str) => [...new Set([...str.replace(/曜日?/g, '').matchAll(/[日月火水木金土]/g)]
  .map((m) => WEEKDAY_WORDS[m[0]]))].sort();
// 日付のあとの「までに」「に」などは、タイトルに残さない
const TAIL = '(?:中に|までに|まで|には|に)?';
const TIME_TAIL = '(?:から|までに|まで|に)?';

function parseQuick(text, today) {
  const res = { title: text.trim(), due: undefined, time: null, priority: undefined, listName: null, repeat: null, goal: null, duration: null };
  let s = ` ${text.replace(/　/g, ' ')} `;
  const cut = (re, fn) => {
    let hit = false;
    s = s.replace(re, (...m) => { hit = true; fn(...m); return ' '; });
    return hit;
  };

  cut(/[#＃]([^\s#＃!！]+)/, (_, n) => { res.listName = n; });
  cut(/[!！](高|中|低)/, (_, p) => { res.priority = { 低: 1, 中: 2, 高: 3 }[p]; });
  cut(/(?<=\s)([!！]{1,3})(?=\s)/, (_, p) => { res.priority = p.length; });
  cut(/(?<=\s)[×xX*＊](\d{1,2})(?=\s)/, (_, n) => { res.goal = clamp(+n, 1, 50); });
  cut(/(?<=\s)(\d{1,2}(?:\.\d)?)(時間|分間?)(?=\s)/, (_, n, u) => {
    res.duration = clamp(Math.round(u === '時間' ? +n * 60 : +n), 5, 720);
  });

  // 時刻
  cut(new RegExp(`(午前|午後)?\\s?(\\d{1,2})[:：](\\d{2})${TIME_TAIL}`), (_, ap, h, m) => { res.time = fixTime(ap, +h, +m); })
    || cut(new RegExp(`(午前|午後)?(\\d{1,2})時(?!間)(半|(\\d{1,2})分)?${TIME_TAIL}`), (_, ap, h, half, m) => {
      res.time = fixTime(ap, +h, half === '半' ? 30 : +(m || 0));
    });

  // くり返し（あればルーティンとして追加する）
  const repeatRules = [
    [/(?<=\s)毎月末/, () => ({ type: 'monthly', dates: [31] })],
    [/(?<=\s)毎月\s?(\d{1,2})日?((?:\s?[・、,と]\s?\d{1,2}日?)*)(?:に|は)?/, (_, d1, rest) => ({
      type: 'monthly',
      dates: [...new Set([+d1, ...(rest.match(/\d{1,2}/g) || []).map(Number)])].filter((d) => d >= 1 && d <= 31).sort((a, b) => a - b),
    })],
    [/(?<=\s)毎((?:[日月火水木金土]曜日?[・、,と]?)+)(?:に|は)?/, (_, ds) => ({ type: 'weekly', days: daysFrom(ds) })],
    [/(?<=\s)毎週(?!の)\s?((?:[日月火水木金土](?:曜日?)?[・、,と]?)*)(?:に|は)?/, (_, ds) => {
      const days = daysFrom(ds);
      return { type: 'weekly', days: days.length ? days : [dow(today)] };
    }],
    [/(?<=\s)(?:毎日|毎朝|毎晩|毎夜)(?![のはもが])/, () => ({ type: 'weekly', days: [...ALL_DAYS] })],
    [/(?<=\s)毎?平日(?:に|は)?(?=\s)/, () => ({ type: 'weekly', days: [1, 2, 3, 4, 5] })],
    [/(?<=\s)(?:毎?週末|土日)(?:に|は)?(?=\s)/, () => ({ type: 'weekly', days: [0, 6] })],
    [/(?<=\s)隔日/, () => ({ type: 'interval', every: 2, start: today })],
    [/(?<=\s)(\d{1,3})日(ごと|毎|おき)に?/, (_, n, kind) => ({
      type: 'interval', every: clamp(+n + (kind === 'おき' ? 1 : 0), 1, 365), start: today,
    })],
  ];
  for (const [re, fn] of repeatRules) {
    if (cut(re, (...m) => { res.repeat = fn(...m); })) break;
  }

  // 日付（くり返しでなければ）
  if (!res.repeat) {
    const dateRules = [
      [new RegExp(`(\\d{4})-(\\d{1,2})-(\\d{1,2})${TAIL}`), (_, y, m, d) => keyOf(new Date(+y, m - 1, +d))],
      [new RegExp(`(\\d{1,2})[/／](\\d{1,2})(?:\\s?[(（][日月火水木金土][)）])?${TAIL}`), (_, m, d) => nextDate(today, +m, +d)],
      [new RegExp(`(\\d{1,2})月(\\d{1,2})日(?:\\s?[(（][日月火水木金土][)）])?${TAIL}`), (_, m, d) => nextDate(today, +m, +d)],
      [new RegExp(`(?:今日|きょう)(?!の)${TAIL}`), () => today],
      [new RegExp(`(?:明後日|あさって)(?!の)${TAIL}`), () => addDays(today, 2)],
      [new RegExp(`(?:明日|あした|あす)(?!の)${TAIL}`), () => addDays(today, 1)],
      [new RegExp(`(\\d{1,2})日後${TAIL}`), (_, n) => addDays(today, +n)],
      [new RegExp(`(来週の?)?([日月火水木金土])曜日?(?!の)${TAIL}`), (_, next, w) => {
        const target = WEEKDAY_WORDS[w];
        if (next) return addDays(nextMonday(today), (target + 6) % 7);
        return addDays(today, (target - dow(today) + 7) % 7);
      }],
      [new RegExp(`来週(?!の)${TAIL}`), () => nextMonday(today)],
      [new RegExp(`(?:今月末|月末)(?!の)${TAIL}`), () => monthEnd(today)],
    ];
    for (const [re, fn] of dateRules) {
      if (cut(re, (...m) => { res.due = fn(...m); })) break;
    }
  }

  const title = s.replace(/\s+/g, ' ').trim();
  if (title) res.title = title;
  return res;
}

function fixTime(ampm, h, m) {
  if (ampm === '午後' && h < 12) h += 12;
  if (ampm === '午前' && h === 12) h = 0;
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}

// 月日だけ指定されたら、今日以降で一番近い日付にする
function nextDate(today, m, d) {
  const t = parseKey(today);
  let k = keyOf(new Date(t.getFullYear(), m - 1, d));
  if (k < today) k = keyOf(new Date(t.getFullYear() + 1, m - 1, d));
  return k;
}

// ============================================================
//  効果音（WebAudio で短い音を鳴らすだけ）
// ============================================================

let audioCtx = null;
function chime(kind = 'tick') {
  if (state?.data?.prefs?.sound === false) return;
  try {
    audioCtx = audioCtx || new AudioContext();
    const notes = kind === 'done' ? [660, 880, 1320] : kind === 'timer' ? [880, 660, 880, 1100] : [880];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const t = audioCtx.currentTime + i * 0.11;
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
  } catch { /* 音が出せない環境では何もしない */ }
}
