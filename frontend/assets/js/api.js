/**
 * api.js — lớp gọi API dùng chung. Toàn bộ frontend gọi qua đây, KHÔNG gọi fetch trực tiếp.
 *
 * QUAN TRỌNG: API_BASE_URL nên trỏ tới Cloudflare Worker proxy (xem /cloudflare-worker),
 * KHÔNG trỏ thẳng URL Apps Script, để tránh vướng CORS (xem ghi chú trong Code.gs).
 */
const API_BASE_URL = 'https://hstg.tccb.workers.dev'; // TODO: đổi sau khi deploy Worker

function getToken() {
  return localStorage.getItem('token');
}

function setSession(session) {
  localStorage.setItem('token', session.token);
  localStorage.setItem('hoTen', session.hoTen);
  localStorage.setItem('vaiTro', session.vaiTro);
  localStorage.setItem('idDonVi', session.idDonVi || '');
}

function clearSession() {
  localStorage.clear();
}

function requireLogin() {
  if (!getToken()) window.location.href = '/index.html';
}

/** Gọi 1 action tới backend. payload sẽ tự động kèm token hiện tại. */
async function callApi(action, payload) {
  const body = Object.assign({ action: action, token: getToken() }, payload || {});
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) {
    if (json.code === 'AUTH_ERROR') {
      clearSession();
      window.location.href = '/index.html';
    }
    throw new Error(json.error || 'Lỗi không xác định');
  }
  return json.data;
}
