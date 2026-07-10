/* CCスタッフ Service Worker
   方針:
   - 静的アセット(HTML/CSS/JS/アイコン)のみキャッシュ。オフラインでも画面が開く。
   - GAS API(script.google.com へのPOST)は絶対にキャッシュしない。常に最新を取得。
   - 静的アセットは network-first: オンライン時は新しい版を取得し、失敗時のみキャッシュへ。
     → デプロイ更新後に古いHTMLが残り続ける事故を防ぐ。
*/
const CACHE = 'ccstaff-v4';
const ASSETS = [
  'index.html', 'jobs.html', 'profile.html', 'admin.html', 'admin-login.html',
  'app.js', 'styles.css', 'config.js', 'manifest.json', 'manifest-admin.json',
  'icons/icon-192.png', 'icons/icon-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // 自オリジン以外(=GAS API等)は素通し。キャッシュしない。
  if (url.origin !== self.location.origin) return;
  // GET以外もキャッシュ対象外
  if (req.method !== 'GET') return;

  // network-first: オンライン優先、オフライン時のみキャッシュ
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
  );
});
