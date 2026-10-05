'use strict';

// オフラインでも開けるように、アプリのファイルを端末にしまっておく。
// 新しい版を置くと VERSION が変わり、次に開いたときから新しい版になる。
// 天気など外のサーバーへの通信はそのままネットに流す。

const VERSION = 'daily-tasks-f531a2972ed1';
const FILES = [
  "./",
  "api.js",
  "core.js",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "index.html",
  "ios.css",
  "js/app.js",
  "js/badges.js",
  "js/bgm-recorded.js",
  "js/bgm-sounds.js",
  "js/bgm.js",
  "js/components.js",
  "js/menu.js",
  "js/mini.js",
  "js/palette.js",
  "js/school.js",
  "js/sheets.js",
  "js/someday.js",
  "js/store.js",
  "js/themes.js",
  "js/timeline.js",
  "js/timer.js",
  "js/util.js",
  "js/views.js",
  "js/weather.js",
  "manifest.webmanifest",
  "style.css",
  "themes.css",
  "touch.js"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== SOUNDS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// BGM の録音：初めて流したときに丸ごと取ってしまっておく（版が変わっても消さない）。
// 音声は「何バイト目から」と部分的に頼まれるので、しまっておいた中から切り出して返す
const SOUNDS = 'daily-tasks-sounds';

async function soundResponse(request) {
  const url = new URL(request.url);
  url.hash = '';
  const key = url.pathname;
  const cache = await caches.open(SOUNDS);
  let full = await cache.match(key);
  if (!full) {
    const res = await fetch(key);
    if (!res.ok) return res;
    await cache.put(key, res.clone());
    full = res;
  }
  const range = request.headers.get('range');
  if (!range) return full;
  const buf = await full.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = m[1] ? Number(m[1]) : 0;
  const end = m[2] ? Math.min(Number(m[2]), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/sounds/')) {
    e.respondWith(soundResponse(e.request).catch(() => fetch(e.request)));
    return;
  }
  e.respondWith(caches.open(VERSION)
    .then((c) => c.match(e.request, { ignoreSearch: true }))
    .then((hit) => hit || fetch(e.request)));
});

// 通知をタップしたらアプリを開く
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((list) => (list.length ? list[0].focus() : self.clients.openWindow('./'))));
});
