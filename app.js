// ===== 共通: API 呼び出し & セッション =====

// GAS はプリフライト(OPTIONS)を返せないため、Content-Type を text/plain にして
// シンプルリクエストとして POST する(CORS プリフライトを回避)。
// GASは応答が遅い/初回に失敗することがあるため、タイムアウトと1回の自動リトライを入れる。
async function api(action, params = {}, _retry) {
  const session = getSession();
  const body = Object.assign({ action }, session, params);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000); // 20秒で打ち切り(固まり防止)
  let res, data;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    data = await res.json();
  } catch (e) {
    clearTimeout(timer);
    // タイムアウト/ネットワーク断/JSON化失敗 → 1回だけ自動リトライ(GASのコールドスタート対策)
    if (!_retry) {
      await new Promise(r => setTimeout(r, 800));
      return api(action, params, true);
    }
    throw e; // 呼び出し側で「通信エラー」を表示
  }

  if (!data.ok && (data.error === 'invalid_session' || data.error === 'not_authenticated')) {
    clearSession();
    // 管理画面からはスタッフ用ログインに送らず、管理者ログインへ戻す
    const onAdmin = /admin(\.html|-login\.html)?$/.test(location.pathname) || location.pathname.indexOf('admin') >= 0;
    location.href = onAdmin ? 'admin-login.html' : 'index.html';
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

// 曜日で色分けするためのクラス名(土=青, 日=赤)。カレンダーの慣習に合わせて瞬時に判別できるように
function dowClass(s) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  if (d.getDay() === 0) return 'dow-sun';
  if (d.getDay() === 6) return 'dow-sat';
  return '';
}

// 日付文字列の比較用(不正な日付は末尾へ)
function dateVal(s) {
  const t = new Date(s).getTime();
  return isNaN(t) ? Infinity : t;
}

// 今日の0時(過去判定用)
function todayStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
}
