// メイン処理と画面の両方で使う、日付とくり返しの判定
(function (exports) {
  'use strict';

  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayKey = () => keyOf(new Date());
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const dow = (k) => parseKey(k).getDay();
  const diffDays = (a, b) => Math.round((parseKey(a) - parseKey(b)) / 86400000);
  const toMinutes = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  // schedule: { type: 'weekly', days: [0-6] } | { type: 'monthly', dates: [1-31] } | { type: 'interval', every: N, start: key }
  function isScheduled(r, k) {
    if (r.paused || k < r.createdAt) return false;
    const s = r.schedule;
    if (s.type === 'monthly') {
      const d = parseKey(k);
      const date = d.getDate();
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      // 31日指定は、31日がない月は月末に
      return s.dates.some((x) => x === date || (x > last && date === last));
    }
    if (s.type === 'interval') {
      const start = s.start || r.createdAt;
      return k >= start && diffDays(k, start) % Math.max(1, s.every) === 0;
    }
    return s.days.includes(dow(k));
  }

  // log[k][id] = 回数（-1 はスキップ）
  const countOf = (data, r, k) => (data.log[k] && data.log[k][r.id]) || 0;
  const isSkipped = (data, r, k) => countOf(data, r, k) === -1;
  const isDone = (data, r, k) => countOf(data, r, k) >= (r.goal || 1);

  // 天気コード（WMO）→ 絵文字と日本語
  const WMO = {
    0: ['☀️', '快晴'], 1: ['🌤️', '晴れ'], 2: ['⛅', '晴れ時々くもり'], 3: ['☁️', 'くもり'],
    45: ['🌫️', '霧'], 48: ['🌫️', '霧'],
    51: ['🌦️', '霧雨'], 53: ['🌦️', '霧雨'], 55: ['🌧️', '強い霧雨'], 56: ['🌧️', '凍る霧雨'], 57: ['🌧️', '凍る霧雨'],
    61: ['🌦️', '小雨'], 63: ['🌧️', '雨'], 65: ['🌧️', '大雨'], 66: ['🌧️', '凍る雨'], 67: ['🌧️', '凍る雨'],
    71: ['🌨️', '小雪'], 73: ['🌨️', '雪'], 75: ['❄️', '大雪'], 77: ['🌨️', '霧雪'],
    80: ['🌦️', 'にわか雨'], 81: ['🌧️', 'にわか雨'], 82: ['⛈️', '激しいにわか雨'], 85: ['🌨️', 'にわか雪'], 86: ['❄️', '強いにわか雪'],
    95: ['⛈️', '雷雨'], 96: ['⛈️', 'ひょうを伴う雷雨'], 99: ['⛈️', 'ひょうを伴う雷雨'],
  };
  function weatherInfo(code, isDay = 1) {
    const w = WMO[code] || ['🌡️', '—'];
    let icon = w[0];
    if (!isDay && (code === 0 || code === 1)) icon = '🌙';
    if (!isDay && code === 2) icon = '☁️';
    return { icon, label: w[1] };
  }

  exports.Core = {
    weatherInfo, pad, keyOf, parseKey, todayKey, addDays, dow, diffDays, toMinutes, nowHM, isScheduled, countOf, isSkipped, isDone };
})(typeof module !== 'undefined' ? module.exports : window);
