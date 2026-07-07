// ===== 共通: API 呼び出し & セッション =====

// GAS はプリフライト(OPTIONS)を返せないため、Content-Type を text/plain にして
// シンプルリクエストとして POST する(CORS プリフライトを回避)。
async function api(action, params = {}) {
  const session = getSession();
  const body = Object.assign({ action }, session, params);
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok && (data.error === 'invalid_session' || data.error === 'not_authenticated')) {
    clearSession();
    location.href = 'index.html';
    throw new Error('ログインが必要です');
  }
  return data;
}

// --- セッション(localStorage) ---
function getSession() {
  const email = localStorage.getItem('ss_email');
  const session = localStorage.getItem('ss_session');
  return email && session ? { email, session } : {};
}
function setSession(email, session, user) {
  localStorage.setItem('ss_email', email);
  localStorage.setItem('ss_session', session);
  if (user) localStorage.setItem('ss_user', JSON.stringify(user));
}
function clearSession() {
  ['ss_email', 'ss_session', 'ss_user'].forEach(k => localStorage.removeItem(k));
}
function currentUser() {
  try { return JSON.parse(localStorage.getItem('ss_user') || '{}'); } catch (_) { return {}; }
}
function requireLogin() {
  if (!getSession().email) { location.href = 'index.html'; return false; }
  return true;
}
function yen(n) { return '¥' + (Number(n) || 0).toLocaleString('ja-JP'); }
function logout() { clearSession(); location.href = 'index.html'; }

// "2026-06-19" → "6/19(金)" スマホで読みやすい日本式表記(年が違う場合のみ年を付ける)
function jpDate(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s; // "時間未定"等の自由文はそのまま
  const w = ['日','月','火','水','木','金','土'][d.getDay()];
  const base = (d.getMonth() + 1) + '/' + d.getDate() + '(' + w + ')';
  return d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() + '年' + base : base;
}
