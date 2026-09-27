/**
 * api.js — lớp gọi API dùng chung. Toàn bộ frontend gọi qua đây, KHÔNG gọi fetch trực tiếp.
 *
 * QUAN TRỌNG: API_BASE_URL nên trỏ tới Cloudflare Worker proxy (xem /cloudflare-worker),
 * KHÔNG trỏ thẳng URL Apps Script, để tránh vướng CORS (xem ghi chú trong Code.gs).
 */
const API_BASE_URL = 'https://YOUR-WORKER-SUBDOMAIN.workers.dev'; // TODO: đổi sau khi deploy Worker

function getToken() {
  return localStorage.getItem('token');
}

function setSession(session) {
  localStorage.setItem('token', session.token);
  localStorage.setItem('idNguoiDung', session.idNguoiDung || '');
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

/** Bắt buộc đúng vai trò (gọi sau requireLogin). Nếu sai vai trò, đá về trang phù hợp. */
function requireRole(vaiTroYeuCau) {
  requireLogin();
  const vaiTro = localStorage.getItem('vaiTro');
  if (vaiTro !== vaiTroYeuCau) {
    window.location.href = vaiTro === 'Admin' ? 'hop-dong.html' : 'tra-cuu-giang-vien.html';
  }
}

/**
 * Ẩn/hiện các phần tử menu theo vai trò đang đăng nhập, và hiển thị tên người dùng.
 * Đánh dấu phần tử bằng data-role="Admin" hoặc data-role="DonVi"; phần tử không có
 * data-role sẽ luôn hiển thị cho cả 2 vai trò. Gọi hàm này ngay sau requireLogin()/requireRole().
 */
function initNav() {
  const vaiTro = localStorage.getItem('vaiTro');
  document.querySelectorAll('[data-role]').forEach(function (el) {
    if (el.getAttribute('data-role') !== vaiTro) el.style.display = 'none';
  });
  const hoTenEl = document.getElementById('hoTenHienTai');
  if (hoTenEl) hoTenEl.textContent = (localStorage.getItem('hoTen') || '') + ' (' + vaiTro + ')';
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
