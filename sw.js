'use strict';

const CACHE_NAME = 'placelog-v1';

// 오프라인에서도 동작할 로컬 애셋
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// ── 설치: 로컬 애셋 선(先)캐싱 ────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── 활성화: 이전 캐시 정리 ────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── 요청 처리 ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 외부 도메인(Firebase, Kakao, YouTube 등)은 SW가 가로채지 않음
  if (url.origin !== self.location.origin) return;

  // POST 등 비-GET 요청은 그대로 통과
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // 캐시 히트: 즉시 반환하고 백그라운드에서 갱신
      if (cached) {
        fetch(e.request)
          .then(res => {
            if (res && res.status === 200) {
              caches.open(CACHE_NAME).then(c => c.put(e.request, res));
            }
          })
          .catch(() => {});
        return cached;
      }

      // 캐시 미스: 네트워크 요청 후 캐시에 저장
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
