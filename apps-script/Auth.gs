/**
 * Auth.gs — đăng nhập, phiên làm việc (session token), kiểm tra phân quyền.
 * Theo Mục 6 tài liệu YCNV: 2 vai trò — 'DonVi' (người phụ trách đơn vị) và 'Admin'.
 *
 * Cơ chế: đăng nhập đúng -> tạo token ngẫu nhiên, lưu vào CacheService (TTL 8 tiếng).
 * Mọi API khác (trừ login) đều phải kèm token trong payload.token.
 *
 * LƯU Ý BẢO MẬT: đây là cơ chế đơn giản phù hợp CacheService của Apps Script,
 * KHÔNG tương đương chuẩn bảo mật production (nên cân nhắc thêm HTTPS-only,
 * giới hạn số lần đăng nhập sai, đổi mật khẩu định kỳ ở giai đoạn sau).
 */

var SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 giờ

function api_dangNhap(payload) {
  var users = sheetToObjects_(SHEETS.NGUOI_DUNG);
  var hash = hashPassword_(payload.matKhau || '');
  var user = users.filter(function (u) {
    return u.Ten_Dang_Nhap === payload.tenDangNhap && u.Mat_Khau_Hash === hash;
  })[0];

  if (!user) return errorResponse_('Sai tên đăng nhập hoặc mật khẩu', 'AUTH_FAILED');
  if (user.Trang_Thai !== 'Hoat_Dong') return errorResponse_('Tài khoản đã bị khoá', 'AUTH_LOCKED');

  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('session_' + token, JSON.stringify({
    idNguoiDung: user.ID_NguoiDung,
    tenDangNhap: user.Ten_Dang_Nhap,
    hoTen: user.Ho_Ten,
    vaiTro: user.Vai_Tro,
    idDonVi: user.ID_DonVi,
  }), SESSION_TTL_SECONDS);

  return okResponse_({
    token: token,
    idNguoiDung: user.ID_NguoiDung,
    hoTen: user.Ho_Ten,
    vaiTro: user.Vai_Tro,
    idDonVi: user.ID_DonVi,
  });
}

/** Trả về thông tin phiên nếu token hợp lệ, ngược lại trả null. */
function laySesion_(token) {
  if (!token) return null;
  var raw = CacheService.getScriptCache().get('session_' + token);
  return raw ? JSON.parse(raw) : null;
}

/** Bắt buộc phải đăng nhập. Ném lỗi nếu không. */
function yeuCauDangNhap_(token) {
  var session = laySesion_(token);
  if (!session) throw new AuthError_('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  return session;
}

/** Bắt buộc đúng vai trò Admin. */
function yeuCauAdmin_(token) {
  var session = yeuCauDangNhap_(token);
  if (session.vaiTro !== 'Admin') throw new AuthError_('Chức năng này chỉ dành cho Admin');
  return session;
}

function AuthError_(message) {
  this.name = 'AuthError';
  this.message = message;
}
AuthError_.prototype = Object.create(Error.prototype);

function api_dangXuat(payload) {
  if (payload.token) CacheService.getScriptCache().remove('session_' + payload.token);
  return okResponse_({});
}
