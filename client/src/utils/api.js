/**
 * api.js
 *
 * All fetch calls go through req(). Responses are deep-converted from
 * PostgreSQL snake_case to camelCase so every page component works unchanged.
 */

const BASE = `${(import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '')}/api`;

export function getToken()     { return localStorage.getItem('pscrm_token'); }
export function setToken(t)    { localStorage.setItem('pscrm_token', t); }
export function clearToken()   { localStorage.removeItem('pscrm_token'); }

// ── snake_case → camelCase converter ─────────────────────────────────────────
function camelize(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toCamel(val) {
  if (Array.isArray(val)) return val.map(toCamel);
  if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
    return Object.fromEntries(
      Object.entries(val).map(([k, v]) => [camelize(k), toCamel(v)])
    );
  }
  return val;
}

// ── Core fetcher ──────────────────────────────────────────────────────────────
async function req(path, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !path.includes('/auth/login')) {
    clearToken();
    if (window.location.pathname !== '/auth') {
      window.location.href = '/auth';
    }
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.response = { data }; // Mimic axios for compatibility with existing code
    throw err;
  }
  return toCamel(data);
}

// ── API surface ───────────────────────────────────────────────────────────────
export const api = {
  // Auth
  register: b  => req('/auth/register', { method: 'POST', body: JSON.stringify(b) }),
  login:    b  => req('/auth/login',    { method: 'POST', body: JSON.stringify(b) }),
  me:       () => req('/auth/me'),
  users:    () => req('/auth/users'),
  forgotPassword: (email)      => req('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword:  (email, otp, password) => req('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, password }) }),
  verifyEmail:    (email, otp) => req('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  resendVerification: (email)  => req('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),

  // Complaints
  analyzeComplaint: desc => req('/complaints/analyze', { method: 'POST', body: JSON.stringify({ description: desc }) }),
  getComplaints:   (params = '') => req(`/complaints?${params}`),
  getComplaint:    id => req(`/complaints/${id}`),
  createComplaint: b  => req('/complaints', { method: 'POST', body: b }),
  updateStatus:    (id, b) => {
    if (b.file) {
      const fd = new FormData();
      fd.append('status', b.status);
      fd.append('note', b.note || '');
      fd.append('media', b.file);
      return req(`/complaints/${id}/status`, { method: 'PUT', body: fd });
    }
    return req(`/complaints/${id}/status`, { method: 'PUT', body: JSON.stringify(b) });
  },
  assignComplaint: (id, b) => req(`/complaints/${id}/assign`, { method: 'PUT', body: JSON.stringify(b) }),
  addComment:      (id, b) => req(`/complaints/${id}/comments`, { method: 'POST', body: JSON.stringify(b) }),
  deleteComplaint: id => req(`/complaints/${id}`, { method: 'DELETE' }),
  getAiSummary:    id => req(`/complaints/${id}/summary`),
  trackPublicComplaint: id => req(`/complaints/track/public/${id}`),
  rateComplaint:   (id, b) => req(`/complaints/${id}/rate`,   { method: 'POST', body: JSON.stringify(b) }),
  appealComplaint: (id, b) => req(`/complaints/${id}/appeal`, { method: 'POST', body: JSON.stringify(b) }),

  // Analytics
  overview:     () => req('/analytics/overview'),
  trends:       () => req('/analytics/trends'),
  departments:  () => req('/analytics/departments'),
  categories:   () => req('/analytics/categories'),
  escalated:    () => req('/analytics/escalated'),
  officerLoad:  () => req('/analytics/officer-load'),

  // Notifications
  notifications: () => req('/notifications'),
  markRead:      id => req(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead:   () => req('/notifications/read-all',  { method: 'PUT' }),

  // Departments
  getDepartments:    () => req('/departments'),
  getDeptOfficers:   id => req(`/departments/${id}/officers`),

  // Admin
  adminUsers:          () => req('/admin/users'),
  adminUpdateUser:     (id, b) => req(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  adminCreateDept:     b => req('/admin/departments', { method: 'POST', body: JSON.stringify(b) }),
  adminUpdateDept:     (id, b) => req(`/admin/departments/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  adminDeleteDept:     id => req(`/admin/departments/${id}`, { method: 'DELETE' }),
};


