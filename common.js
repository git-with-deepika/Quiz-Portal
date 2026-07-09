// common.js

// ====== CONFIG ======
// Use a global so pages can read it without redefining.
window.API_BASE = ''; // your EC2 backend


// ====== HEADER/FOOTER INJECT & GLOBAL GUARD ======
document.addEventListener('DOMContentLoaded', () => {
  const hdr = document.getElementById('header-include');
  if (hdr) {
    fetch('header.html')
      .then(r => r.text())
      .then(html => {
        hdr.innerHTML = html;
        initUserMenu();
        initLogout();
        renderAuthBadge(); // show "Logged-in" or "Guest" in header if present
      })
      .catch(() => {});
  }

  const ftr = document.getElementById('footer-include');
  if (ftr) {
    fetch('footer.html')
      .then(r => r.text())
      .then(html => (ftr.innerHTML = html))
      .catch(() => {});
  }

  // Enforce auth on all non-public pages
  enforceAuth();
});

// ====== AUTH HELPERS ======
function getToken() {
  try { return localStorage.getItem('token'); } catch { return null; }
}
function setToken(t) {
  try { localStorage.setItem('token', t); } catch {}
}
function clearToken() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  } catch {}
}

async function authCheck(requiredRole) {
  const token = getToken();
  if (!token) return { ok: false };

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    if (!data.authenticated) return { ok: false };
    if (requiredRole && data.role !== requiredRole) return { ok: false, forbidden: true };
    return { ok: true, role: data.role, user: data.user };
  } catch {
    return { ok: false };
  }
}

/**
 * Enforce auth on all pages:
 * - Skip pages with <body data-public="true">
 * - If <body data-role="admin">, requires admin
 */
async function enforceAuth() {
  const body = document.body || {};
  const publicPage = body.dataset && body.dataset.public === 'true';
  if (publicPage) return;

  const requiredRole = (body.dataset && body.dataset.role) || null;
  const { ok } = await authCheck(requiredRole);
  if (!ok) window.location.href = 'login.html';
}

// ====== FETCH WRAPPER: auto-attach Authorization header ======
(function() {
  const _fetch = window.fetch;
  window.fetch = function(resource, init = {}) {
    try {
      const url = typeof resource === 'string' ? resource : resource.url;
      const token = getToken();
      if (token && url && (url.startsWith(API_BASE) || url.startsWith('/api'))) {
        init.headers = init.headers || {};
        if (!('Authorization' in init.headers)) {
          init.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch {}
    return _fetch(resource, init);
  };
})();

// ====== UI helpers ======
function initUserMenu() {
  const btn = document.getElementById('user-menu-button');
  const menu = document.getElementById('user-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('hidden'));
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) menu.classList.add('hidden');
  });
}

function initLogout() {
  const link = document.getElementById('logout-link');
  if (!link) return;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    clearToken();
    window.location.href = 'login.html';
  });
}

async function renderAuthBadge() {
  const badge = document.getElementById('auth-badge');
  if (!badge) return;
  const res = await authCheck();
  badge.textContent = res.ok ? `Logged in${res.role ? ' (' + res.role + ')' : ''}` : 'Guest';
}
