'use strict';

// ============================================================
//  天気
//  場所（現在地か地域名）を決めると、今日の天気・1 時間ごと・7 日間と、
//  傘・服装・日焼け止めなどのひとことを出す。データは 30 分ごとに取り直す
// ============================================================

const weather = { data: null, key: null, loading: false, error: null };
const WEATHER_TTL = 30 * 60 * 1000;

const wxPrefs = () => prefs().weather;
const weatherOn = () => wxPrefs().enabled !== false;
const placeKey = (p) => (p ? `${p.lat},${p.lon}` : '');
const wxInfo = (code, isDay = 1) => Core.weatherInfo(code, isDay);
const deg = (v) => `${Math.round(v)}°`;

// ---------- 取得 ----------

async function loadWeather({ force = false } = {}) {
  const w = wxPrefs();
  if (!weatherOn() || !w.place || weather.loading) return;
  const key = placeKey(w.place);
  const fresh = weather.data && weather.key === key && Date.now() - weather.data.fetchedAt < WEATHER_TTL;
  if (fresh && !force) return;
  weather.loading = true;
  weather.error = null;
  const r = await window.api.weatherFetch(w.place);
  weather.loading = false;
  if (!r || r.error) {
    weather.error = (r && r.error) || '天気の情報を取れませんでした';
  } else {
    weather.data = r;
    weather.key = key;
    try { localStorage.setItem('weather', JSON.stringify({ key, data: r })); } catch { /* 保存できなくても困らない */ }
  }
  renderWeatherSpots();
}

// 前回の天気をすぐ出す（そのあと新しいのを取りにいく）
function restoreWeather() {
  try {
    const saved = JSON.parse(localStorage.getItem('weather') || 'null');
    if (saved && saved.key === placeKey(wxPrefs().place)) {
      weather.data = saved.data;
      weather.key = saved.key;
    }
  } catch { /* 無視 */ }
}

function renderWeatherSpots() {
  if (state.layout === 'mini') return;
  renderTitlebar();
  refresh();
}

function setPlace(place) {
  wxPrefs().place = { lat: place.lat, lon: place.lon, name: place.name, source: place.source };
  wxPrefs().enabled = true;
  weather.data = null;
  weather.key = null;
  save();
  loadWeather({ force: true });
}

// ---------- 読み取り ----------

const hasWeather = () => weatherOn() && !!wxPrefs().place && !!weather.data && weather.key === placeKey(wxPrefs().place);

// 今から先の 1 時間ごと
function upcomingHours(n = 24) {
  const h = weather.data.hourly;
  const nowKey = `${state.today}T${pad(new Date().getHours())}:00`;
  let i = h.time.indexOf(nowKey);
  if (i < 0) i = Math.max(0, h.time.findIndex((t) => t > nowKey) - 1);
  return h.time.slice(i, i + n).map((t, j) => ({
    time: t, hour: Number(t.slice(11, 13)), day: t.slice(0, 10),
    temp: h.temperature_2m[i + j], pp: h.precipitation_probability[i + j] ?? 0,
    code: h.weather_code[i + j], isDay: h.is_day[i + j],
  }));
}

function dayForecast(k) {
  if (!hasWeather()) return null;
  const d = weather.data.daily;
  const i = d.time.indexOf(k);
  if (i < 0) return null;
  return {
    code: d.weather_code[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i],
    pp: d.precipitation_probability_max[i] ?? 0, uv: d.uv_index_max[i],
    sunrise: d.sunrise[i]?.slice(11), sunset: d.sunset[i]?.slice(11),
  };
}

function airLabel(aqi) {
  if (aqi === null || aqi === undefined) return null;
  if (aqi <= 50) return '良い';
  if (aqi <= 100) return 'ふつう';
  if (aqi <= 150) return 'やや悪い';
  return '悪い';
}

// 傘・服装などのひとこと
function weatherAdvice() {
  if (!hasWeather()) return [];
  const out = [];
  const today = dayForecast(state.today);
  if (!today) return out;
  const rest = upcomingHours(24).filter((h) => h.day === state.today);
  const maxPP = Math.max(0, ...rest.map((h) => h.pp));
  const nowH = new Date().getHours();
  if (maxPP >= 50) {
    const first = rest.find((h) => h.pp >= 50);
    out.push({ icon: '☔', text: first && first.hour > nowH ? `${first.hour}時ごろから雨。傘を持っていこう` : '雨が降りそう。傘を持っていこう', tone: 'rain' });
  } else if (maxPP >= 30) {
    out.push({ icon: '🌂', text: '折りたたみ傘があると安心', tone: 'rain' });
  }
  const max = today.max;
  const min = today.min;
  if (max >= 30) out.push({ icon: '🥵', text: '暑い日。こまめに水分を', tone: 'hot' });
  else if (max >= 28) out.push({ icon: '👕', text: '半袖で過ごせる暑さ' });
  else if (max >= 23) out.push({ icon: '👕', text: '半袖か薄手の長袖で' });
  else if (max >= 18) out.push({ icon: '👔', text: '長袖と薄手の上着で' });
  else if (max >= 13) out.push({ icon: '🧥', text: '上着があると安心' });
  else if (max >= 8) out.push({ icon: '🧥', text: 'コートを着ていこう' });
  else out.push({ icon: '🧣', text: 'しっかり防寒を', tone: 'cold' });
  if (max - min >= 10) out.push({ icon: '🌡️', text: `朝晩と日中の差が ${Math.round(max - min)}°。羽織るものを` });
  if ((today.uv ?? 0) >= 6) out.push({ icon: '🧴', text: `紫外線が強め（UV ${Math.round(today.uv)}）。日焼け止めを` });
  if (maxPP < 20 && today.code <= 2) out.push({ icon: '🧺', text: '洗濯日和' });
  const aqi = weather.data.air?.us_aqi;
  if (aqi > 100) out.push({ icon: '😷', text: '空気がよくない日。マスクがあると安心' });
  return out;
}

// あいさつの横に添える「☀️ 23°」
function weatherBrief() {
  if (!hasWeather()) return '';
  const c = weather.data.current;
  return ` · ${wxInfo(c.weather_code, c.is_day).icon} ${deg(c.temperature_2m)}`;
}

// ---------- 表示 ----------

function weatherPrompt() {
  if (!weatherOn() || wxPrefs().place || wxPrefs().prompted) return '';
  return `<section class="card wx-prompt">
    <span class="wx-prompt-icon">🌤️</span>
    <div class="wx-prompt-text"><b>今日の天気も表示しませんか？</b><small>傘や服装のひとことも出します</small></div>
    <button class="btn primary" data-act="wx-locate">📍 現在地</button>
    <button class="btn" data-act="wx-place">地域を選ぶ</button>
    <button class="mini-btn" data-act="wx-dismiss" data-tip="あとで（設定からいつでも）">${ICON.close}</button>
  </section>`;
}

function hourlyStrip(n) {
  return `<div class="wx-hours">${upcomingHours(n).map((h, i) => `<div class="wx-hour" data-tip="${h.hour}時：${wxInfo(h.code, h.isDay).label}・降水${h.pp}%">
      <small>${i === 0 ? '今' : `${h.hour}時`}</small>
      <span class="wx-hour-icon">${wxInfo(h.code, h.isDay).icon}</span>
      <b>${deg(h.temp)}</b>
      <span class="wx-pp ${h.pp >= 50 ? 'wet' : ''}" style="--pp:${h.pp}%">${h.pp ? `${h.pp}%` : ''}</span>
    </div>`).join('')}</div>`;
}

function adviceChips(limit = 3) {
  return weatherAdvice().slice(0, limit).map((a) => `<span class="wx-advice ${a.tone || ''}">${a.icon} ${a.text}</span>`).join('');
}

function weatherStatus() {
  if (weather.error && !weather.data) {
    return `<div class="wx-status">${escapeHtml(weather.error)}<button class="link" data-act="wx-refresh">もう一度</button></div>`;
  }
  return `<div class="wx-status">${ICON.clock}天気を読み込み中…</div>`;
}

// 今日の画面の上に出す細いカード
function weatherStrip() {
  if (!weatherOn()) return '';
  if (!wxPrefs().place) return weatherPrompt();
  if (!hasWeather()) return `<section class="card wx-strip">${weatherStatus()}</section>`;
  const c = weather.data.current;
  const t = dayForecast(state.today);
  const info = wxInfo(c.weather_code, c.is_day);
  return `<section class="card wx-strip" data-act="wx-open" title="くわしい天気">
    <span class="wx-icon">${info.icon}</span>
    <div class="wx-main">
      <div class="wx-line"><b class="wx-temp">${deg(c.temperature_2m)}</b><span>${info.label}</span>
        ${t ? `<span class="wx-hilo"><i class="hi">${deg(t.max)}</i> / <i class="lo">${deg(t.min)}</i></span><span class="wx-pp-text">☔ ${t.pp}%</span>` : ''}
        <span class="wx-place">📍 ${escapeHtml(wxPrefs().place.name)}</span></div>
      <div class="wx-advices">${adviceChips(state.layout === 'compact' ? 2 : 4)}</div>
    </div>
  </section>`;
}

// iPhone の今日の画面：天気は 1 行だけ（押すとくわしく）
function weatherLine() {
  if (!weatherOn()) return '';
  if (!wxPrefs().place) return weatherPrompt();
  if (!hasWeather()) return '';
  const c = weather.data.current;
  const t = dayForecast(state.today);
  const info = wxInfo(c.weather_code, c.is_day);
  const tip = weatherAdvice()[0];
  return `<button class="wx-mini" data-act="wx-open" aria-label="くわしい天気">
    <span class="wx-mini-icon">${info.icon}</span><b>${deg(c.temperature_2m)}</b>
    ${t ? `<span class="wx-mini-hilo"><i class="hi">${deg(t.max)}</i>/<i class="lo">${deg(t.min)}</i></span>` : ''}
    <span class="wx-mini-tip">${tip ? `${tip.icon} ${escapeHtml(tip.text)}` : escapeHtml(info.label)}</span>
    <span class="wx-mini-go">${ICON.chevR}</span>
  </button>`;
}

// 右パネルのカード
function weatherPanel() {
  if (!weatherOn()) return '';
  if (!wxPrefs().place) return weatherPrompt();
  if (!hasWeather()) return `<section class="card wx-panel">${weatherStatus()}</section>`;
  const c = weather.data.current;
  const t = dayForecast(state.today);
  const info = wxInfo(c.weather_code, c.is_day);
  return `<section class="card wx-panel">
    <div class="card-head"><button class="wx-place-btn" data-act="wx-place" data-tip="場所を変える">📍 ${escapeHtml(wxPrefs().place.name)}</button>
      <span class="spacer"></span><button class="mini-btn" data-act="wx-open" data-tip="くわしく">${ICON.expand}</button></div>
    <div class="wx-now" data-act="wx-open">
      <span class="wx-icon big">${info.icon}</span>
      <div><div class="wx-temp big">${deg(c.temperature_2m)}</div><div class="wx-label">${info.label}・体感 ${deg(c.apparent_temperature)}</div></div>
      ${t ? `<div class="wx-hilo stack"><i class="hi">${deg(t.max)}</i><i class="lo">${deg(t.min)}</i></div>` : ''}
    </div>
    ${hourlyStrip(6)}
    <div class="wx-advices">${adviceChips(3)}</div>
  </section>`;
}

// ---------- くわしい天気 ----------

function openWeatherSheet() {
  if (!hasWeather()) { openPlaceSheet(); return; }
  const d = weather.data;
  const c = d.current;
  const t = dayForecast(state.today);
  const info = wxInfo(c.weather_code, c.is_day);
  const aqi = d.air?.us_aqi;
  const metric = (label, value) => `<div><span>${label}</span><b>${value}</b></div>`;
  const days = d.daily.time.map((k, i) => {
    const di = wxInfo(d.daily.weather_code[i]);
    const lo = d.daily.temperature_2m_min[i];
    const hi = d.daily.temperature_2m_max[i];
    const all = d.daily.temperature_2m_min.concat(d.daily.temperature_2m_max);
    const min = Math.min(...all);
    const span = Math.max(1, Math.max(...all) - min);
    return `<div class="wx-day">
      <span class="wx-day-name">${i === 0 ? '今日' : i === 1 ? '明日' : `${WEEK[dow(k)]}曜`}<small>${shortDate(k).replace(/\(.\)/, '')}</small></span>
      <span class="wx-day-icon" title="${di.label}">${di.icon}</span>
      <span class="wx-pp-text">☔ ${d.daily.precipitation_probability_max[i] ?? 0}%</span>
      <span class="wx-day-lo">${deg(lo)}</span>
      <span class="wx-range"><i style="left:${((lo - min) / span) * 100}%;right:${100 - ((hi - min) / span) * 100}%"></i></span>
      <span class="wx-day-hi">${deg(hi)}</span>
    </div>`;
  }).join('');
  openSheet(`
    <div class="sheet-head"><h2>📍 ${escapeHtml(wxPrefs().place.name)}の天気</h2><span class="spacer"></span>
      <button class="btn" id="wxPlace">場所を変える</button>
      <button class="icon-btn" id="sClose" aria-label="閉じる">${ICON.close}</button></div>
    <div class="wx-hero">
      <span class="wx-icon huge">${info.icon}</span>
      <div><div class="wx-temp huge">${deg(c.temperature_2m)}</div><div class="wx-label">${info.label}${t ? `・最高 ${deg(t.max)} / 最低 ${deg(t.min)}` : ''}</div></div>
    </div>
    <div class="wx-metrics">
      ${metric('体感', deg(c.apparent_temperature))}
      ${metric('湿度', `${c.relative_humidity_2m}%`)}
      ${metric('風', `${Math.round(c.wind_speed_10m)}m/s`)}
      ${t ? metric('降水確率', `${t.pp}%`) : ''}
      ${t && t.uv !== undefined ? metric('紫外線', `UV ${Math.round(t.uv)}`) : ''}
      ${t ? metric('日の出 / 日の入り', `${t.sunrise} / ${t.sunset}`) : ''}
      ${airLabel(aqi) ? metric('空気', `${airLabel(aqi)}（AQI ${Math.round(aqi)}）`) : ''}
    </div>
    ${weatherAdvice().length ? `<div class="field"><div class="field-label">今日のひとこと</div><div class="wx-advices">${adviceChips(8)}</div></div>` : ''}
    <div class="field"><div class="field-label">1 時間ごと</div>${hourlyStrip(24)}</div>
    <div class="field"><div class="field-label">7 日間</div><div class="wx-days">${days}</div></div>
    <div class="sheet-foot">
      <span class="muted small">${new Date(d.fetchedAt).getHours()}:${pad(new Date(d.fetchedAt).getMinutes())} 更新・天気：Open-Meteo・地名：OpenStreetMap</span>
      <span class="spacer"></span>
      <button class="btn" id="wxRefresh">${ICON.reset}更新</button>
    </div>`, (el) => {
    $('#sClose', el).onclick = closeSheet;
    $('#wxPlace', el).onclick = openPlaceSheet;
    $('#wxRefresh', el).onclick = async () => { closeSheet(); await loadWeather({ force: true }); toast('天気を更新しました'); };
  });
}

// ---------- 場所を選ぶ ----------

function openPlaceSheet() {
  const cur = wxPrefs().place;
  openSheet(`
    <div class="sheet-head"><h2>天気の場所</h2><span class="spacer"></span><button class="icon-btn" id="sClose" aria-label="閉じる">${ICON.close}</button></div>
    ${cur ? `<p class="hint">いまの場所：📍 ${escapeHtml(cur.name)}${cur.source === 'gps' ? '（現在地）' : ''}</p>` : ''}
    <button class="btn primary wx-locate-btn" id="wxLocate">📍 現在地を使う（Windows の位置情報）</button>
    <div class="field">
      <div class="field-label">地域名で探す</div>
      <form class="inline" id="wxSearchForm"><input class="text wide-input" id="wxQuery" placeholder="例：札幌、横浜市、大阪" maxlength="60"><button class="btn">${ICON.search}探す</button></form>
      <div class="wx-results" id="wxResults"></div>
    </div>
    <p class="hint small">位置はおよそ 1km 単位に丸めてから、天気サービス（Open-Meteo）と地名サービス（OpenStreetMap）に送ります。</p>`, (el) => {
    const results = $('#wxResults', el);
    const status = (msg) => { results.innerHTML = `<div class="muted small">${escapeHtml(msg)}</div>`; };
    $('#sClose', el).onclick = closeSheet;
    $('#wxLocate', el).onclick = async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '📍 現在地を調べています…';
      const r = await window.api.weatherLocate();
      if (sheet.hidden) return;
      btn.disabled = false;
      btn.textContent = '📍 現在地を使う（Windows の位置情報）';
      if (!r || r.error) { status(r?.error || '現在地がわかりませんでした'); return; }
      closeSheet();
      setPlace(r);
      toast(`天気の場所を「${r.name}」にしました`);
    };
    $('#wxSearchForm', el).onsubmit = async (e) => {
      e.preventDefault();
      const q = $('#wxQuery', el).value.trim();
      if (!q) return;
      status('探しています…');
      const r = await window.api.weatherSearch(q);
      if (sheet.hidden) return;
      if (!r || r.error) { status(r?.error || '見つかりませんでした'); return; }
      if (!r.length) { status('見つかりませんでした。市区町村名で試してください'); return; }
      results.innerHTML = r.map((p, i) => `<button class="wx-result" data-i="${i}"><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.area)}</small></button>`).join('');
      results.onclick = (ev) => {
        const b = ev.target.closest('[data-i]');
        if (!b) return;
        const p = r[Number(b.dataset.i)];
        closeSheet();
        setPlace(p);
        toast(`天気の場所を「${p.name}」にしました`);
      };
    };
    setTimeout(() => $('#wxQuery', el)?.focus(), 50);
  });
}
