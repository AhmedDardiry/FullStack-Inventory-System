// ── Config ──────────────────────────────────────────────────────
const API = (() => {
  if (window.location.protocol === 'file:' || window.location.origin === 'null') {
    return 'http://localhost:5000/api';
  }
  return `${window.location.origin}/api`;
})();

// ── Token helpers ───────────────────────────────────────────────
function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function clearToken() { localStorage.removeItem('token'); localStorage.removeItem('user'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }
function setUser(u) { localStorage.setItem('user', JSON.stringify(u)); }
function isAdmin() { const u = getUser(); return u?.role === 'admin'; }

// ── Auth guard (call at top of protected pages) ──────────────────
function requireAuth(redirectTo = 'login.html') {
  if (!getToken()) window.location.href = redirectTo;
}
function requireAdmin(redirectTo = 'admin-login.html') {
  if (!getToken() || !isAdmin()) window.location.href = redirectTo;
}

// ── Generic fetch wrapper ────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Logout ───────────────────────────────────────────────────────
function logout(redirectTo = 'login.html') {
  clearToken();
  window.location.href = redirectTo;
}
