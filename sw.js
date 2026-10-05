'use strict';

// オフラインでも開けるように、アプリのファイルを端末にしまっておく。
// 新しい版を置くと VERSION が変わり、次に開いたときから新しい版になる。
// 天気など外のサーバーへの通信はそのままネットに流す。

const VERSION = 'daily-tasks-7134956d03ad';
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
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
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
