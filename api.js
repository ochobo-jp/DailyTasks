'use strict';

// ============================================================
//  Web 版（iPhone のホーム画面アプリ）の window.api
//  Electron の preload.js と同じ形で、ブラウザの機能に置き換える
//  データは端末の中（localStorage）に保存する
// ============================================================

(function () {
  const DATA_KEY = 'dailyTasks.data';
  const FIRED_KEY = 'dailyTasks.fired';
  const root = document.documentElement;

  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const touch = ios || matchMedia('(pointer: coarse)').matches;
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  root.dataset.platform = touch ? 'ios' : 'web';
  if (standalone) root.dataset.standalone = '';

  let latest = null;

  // ---------- 保存 ----------

  function load() {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      latest = raw ? JSON.parse(raw) : null;
    } catch {
      latest = null;
    }
    // ホーム画面のアプリなら、端末の空き容量が少なくても消されにくくする
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    return restoreTracks(latest).then(() => latest);
  }

  let warned = false;
  function save(data) {
    latest = data;
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(data));
      return Promise.resolve(true);
    } catch {
      if (!warned && typeof toast === 'function') toast('保存できませんでした（端末の空き容量を確認してください）');
      warned = true;
      return Promise.resolve(false);
    }
  }

  // ---------- ファイルの保存と読み込み ----------

  function pickFiles(accept, multiple) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;
      input.style.display = 'none';
      document.body.appendChild(input);
      let done = false;
      const finish = (files) => {
        if (done) return;
        done = true;
        input.remove();
        resolve(files);
      };
      input.addEventListener('change', () => finish([...input.files]));
      input.addEventListener('cancel', () => finish([]));
      input.click();
    });
  }

  async function exportData(data) {
    const name = `daily-tasks-${Core.todayKey()}.json`;
    const file = new File([JSON.stringify(data, null, 2)], name, { type: 'application/json' });
    // iPhone は共有シートから「ファイルに保存」や AirDrop で PC に送れる
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Daily Tasks のバックアップ' });
        return true;
      } catch (e) {
        if (e && e.name === 'AbortError') return false;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    return true;
  }

  async function importData() {
    const [file] = await pickFiles('.json,application/json', false);
    if (!file) return null;
    try {
      return JSON.parse(await file.text());
    } catch {
      return {};
    }
  }

  // ---------- マイ音楽（曲は端末の中の IndexedDB に入れておく） ----------

  const idb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open('dailyTasks', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('music');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const tx = (db, mode, fn) => new Promise((resolve, reject) => {
    const t = db.transaction('music', mode);
    const out = fn(t.objectStore('music'));
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
  });

  async function pickMusic() {
    const files = await pickFiles('audio/*', true);
    if (!files.length) return [];
    const db = await idb();
    const tracks = [];
    for (const f of files.slice(0, 200)) {
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      await tx(db, 'readwrite', (s) => s.put(f, id));
      tracks.push({ name: f.name.replace(/\.[^.]+$/, ''), path: `idb:${id}`, url: URL.createObjectURL(f) });
    }
    return tracks;
  }

  // 起動したら、保存してある曲を再生できる形（blob URL）に戻す。外した曲は消す
  async function restoreTracks(data) {
    const tracks = data && data.prefs && data.prefs.bgm && data.prefs.bgm.tracks;
    try {
      const db = await idb();
      const keys = await tx(db, 'readonly', (s) => s.getAllKeys());
      const used = new Set();
      for (const t of tracks || []) {
        if (!String(t.path).startsWith('idb:')) continue;
        const id = t.path.slice(4);
        const blob = await tx(db, 'readonly', (s) => s.get(id));
        if (blob) { t.url = URL.createObjectURL(blob); used.add(id); }
      }
      for (const k of keys || []) if (!used.has(k)) await tx(db, 'readwrite', (s) => s.delete(k));
    } catch { /* 曲がなくてもアプリは動く */ }
  }

  // ---------- 天気（Open-Meteo と OpenStreetMap。座標は小数第 2 位に丸める） ----------

  const round2 = (v) => Math.round(v * 100) / 100;

  async function getJson(url) {
    const r = await fetch(url, { signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function placeName(lat, lon) {
    try {
      const r = await getJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&accept-language=ja&lat=${lat}&lon=${lon}`);
      const a = r.address || {};
      return a.city_district || a.city || a.town || a.village || a.suburb || a.county || a.state || r.name || '現在地';
    } catch {
      return '現在地';
    }
  }

  function position() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve({ error: 'この端末では現在地を使えません。地域名で探してください' }); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        (e) => resolve({ error: e.code === 1
          ? '位置情報が許可されていません（設定 → プライバシーとセキュリティ → 位置情報サービス → Safari の Web サイト）'
          : '現在地がわかりませんでした。地域名で探してください' }),
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
      );
    });
  }

  async function locate() {
    const pos = await position();
    if (pos.error) return pos;
    const lat = round2(pos.lat);
    const lon = round2(pos.lon);
    return { lat, lon, name: await placeName(lat, lon), source: 'gps' };
  }

  async function searchPlace(q) {
    const r = await getJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&addressdetails=1&accept-language=ja&q=${encodeURIComponent(String(q || '').slice(0, 100))}`);
    const seen = new Set();
    return r.map((x) => {
      const a = x.address || {};
      const name = a.city || a.town || a.village || a.city_district || x.name || q;
      const area = [a.state || a.province, a.country].filter(Boolean).join('・');
      return { lat: round2(Number(x.lat)), lon: round2(Number(x.lon)), name, area, source: 'search' };
    }).filter((p) => {
      const key = `${p.name}|${p.area}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function fetchWeather({ lat, lon }) {
    const base = `latitude=${round2(lat)}&longitude=${round2(lon)}&timezone=auto`;
    const forecast = await getJson(`https://api.open-meteo.com/v1/forecast?${base}&forecast_days=7&wind_speed_unit=ms`
      + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day'
      + '&hourly=temperature_2m,precipitation_probability,weather_code,is_day'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max');
    let air = null;
    try {
      air = (await getJson(`https://air-quality-api.open-meteo.com/v1/air-quality?${base}&current=us_aqi,pm2_5`)).current;
    } catch { /* 空気の情報がなくても天気は出す */ }
    return { ...forecast, air, fetchedAt: Date.now() };
  }

  const safely = (fn) => async (arg) => {
    try {
      return await fn(arg);
    } catch (e) {
      return { error: navigator.onLine === false ? 'オフラインのため天気を取れませんでした' : `天気の情報を取れませんでした（${e.message}）` };
    }
  };

  // ---------- 通知（アプリを開いている間だけ。iPhone はホーム画面に追加したときだけ使える） ----------

  const notifySupported = () => 'Notification' in window && 'serviceWorker' in navigator;

  function notify(title, body) {
    if (!notifySupported() || Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: `${title}|${body}` }))
      .catch(() => {});
  }

  async function requestNotify() {
    if (!notifySupported()) return 'unsupported';
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }

  let fired = new Set();
  try { fired = new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || '[]')); } catch { /* 無視 */ }
  function fireOnce(key, title, body) {
    if (fired.has(key)) return;
    fired.add(key);
    const today = Core.todayKey();
    try { localStorage.setItem(FIRED_KEY, JSON.stringify([...fired].filter((k) => k.includes(today)))); } catch { /* 無視 */ }
    notify(title, body);
  }
  const due = (at, nowMin) => nowMin >= at && nowMin - at <= 10;

  async function morningWeather(w) {
    if (!w || w.enabled === false || !w.place) return '';
    try {
      const f = await fetchWeather(w.place);
      const d = f.daily;
      const info = Core.weatherInfo(d.weather_code[0]);
      const pp = d.precipitation_probability_max[0] ?? 0;
      return `${info.icon} ${info.label} ${Math.round(d.temperature_2m_max[0])}°/${Math.round(d.temperature_2m_min[0])}° 降水${pp}%${pp >= 50 ? '・傘を忘れずに' : ''}`;
    } catch {
      return '';
    }
  }

  // main.js の checkReminders と同じ判定
  function checkReminders() {
    const data = latest;
    if (!data || data.version !== 2 || typeof Core === 'undefined') return;
    if (!notifySupported() || Notification.permission !== 'granted') return;
    const today = Core.todayKey();
    const nowMin = Core.toMinutes(Core.nowHM());
    const prefs = data.prefs || {};
    for (const t of data.todos) {
      if (t.done || t.due !== today || !t.time || !t.remind) continue;
      const at = Core.toMinutes(t.time) - (t.remindBefore || 0);
      if (due(at, nowMin)) fireOnce(`todo:${t.id}:${today}:${t.time}`, `⏰ ${t.title}`, t.remindBefore ? `${t.remindBefore}分後（${t.time}）の予定です` : `${t.time} の予定です`);
    }
    for (const r of data.routines) {
      if (!r.remind || !Core.isScheduled(r, today)) continue;
      if (Core.isDone(data, r, today) || Core.isSkipped(data, r, today)) continue;
      if (due(Core.toMinutes(r.remind), nowMin)) fireOnce(`routine:${r.id}:${today}`, `🔁 ${r.title}`, '今日のルーティンの時間です');
    }
    const sc = data.school;
    const dow = new Date().getDay();
    if (sc && sc.setup && prefs.classNotify !== false && (!prefs.features || prefs.features.school !== false) && sc.days.includes(dow)) {
      sc.periods.forEach((p, i) => {
        const sid = sc.timetable[`${dow}-${i}`];
        const sub = sid && sc.subjects.find((s) => s.id === sid);
        if (!sub || sc.attendance?.[today]?.[i]?.s === 'cancel') return;
        if (due(Core.toMinutes(p.start) - 5, nowMin)) fireOnce(`class:${today}:${i}`, `🔔 まもなく ${i + 1}限 ${sub.name}`, `${p.start} から${sub.room ? `・${sub.room}` : ''}`);
      });
    }
    if (prefs.morningTime && due(Core.toMinutes(prefs.morningTime), nowMin) && !fired.has(`morning:${today}`)) {
      fired.add(`morning:${today}`);
      const routines = data.routines.filter((r) => Core.isScheduled(r, today)).length;
      const todos = data.todos.filter((t) => !t.done && t.due && t.due <= today).length;
      const body = `ルーティン ${routines} 件・ToDo ${todos} 件があります`;
      morningWeather(prefs.weather).then((w) => fireOnce(`morning:${today}:sent`, '☀️ 今日のタスク', w ? `${w}\n${body}` : body));
    }
  }
  setInterval(checkReminders, 30 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkReminders(); });

  // ---------- 見た目：上のバーの色をページに合わせる ----------

  function syncBarColor(dark) {
    requestAnimationFrame(() => {
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      const c = getComputedStyle(document.body).backgroundColor;
      const color = c && !/rgba\(.*, 0\)$/.test(c) && c !== 'transparent' ? c : (dark ? '#000000' : '#f2f2f7');
      meta.content = color;
      // Safari のバーの下や、引っぱったときに見える部分もページと同じ色に
      root.style.backgroundColor = color;
    });
  }

  // ---------- 呼び出し側から見える形 ----------

  const noop = () => {};
  const focusHandlers = [];
  const onFocus = (fn) => focusHandlers.push(fn);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) focusHandlers.forEach((fn) => fn()); });

  window.api = {
    platform: 'web',
    ios,
    touch,
    standalone,
    defaultStyle: touch ? 'ios' : 'glass',
    load,
    save,
    getSettings: () => Promise.resolve({
      alwaysOnTop: false,
      openAtLogin: false,
      shortcut: '',
      quickAddShortcut: '',
      notificationsSupported: notifySupported(),
    }),
    setAlwaysOnTop: () => Promise.resolve(false),
    setOpenAtLogin: () => Promise.resolve(false),
    setDark: (v) => { syncBarColor(v); return Promise.resolve(v); },
    openDataFolder: noop,
    exportData,
    importData,
    weatherLocate: safely(locate),
    weatherSearch: safely(searchPlace),
    weatherFetch: safely(fetchWeather),
    pickMusic,
    pickMusicFolder: pickMusic,
    notify,
    requestNotify,
    notifyPermission: () => (notifySupported() ? Notification.permission : 'unsupported'),
    minimize: noop,
    hide: noop,
    toggleMaximize: noop,
    toggleFullScreen: noop,
    setMini: noop,
    editCmd: (cmd) => { try { document.execCommand(cmd); } catch { /* 無視 */ } },
    getWindowState: () => Promise.resolve({ maximized: false, fullScreen: false, mini: false }),
    onWindowState: noop,
    onSettingsChanged: noop,
    onFocus,
    onQuickAdd: noop,
  };

  // オフラインでも開けるように
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
}());
