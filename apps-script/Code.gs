/**
 * Code.gs — điểm vào của Web App (Apps Script). Toàn bộ request đi qua đây,
 * dựa vào "action" để gọi đúng hàm xử lý tương ứng.
 *
 * LƯU Ý CORS: Apps Script Web App không cho tự thêm header Access-Control-Allow-Origin.
 * Vì vậy KHUYẾN NGHỊ gọi qua Cloudflare Worker proxy (xem /cloudflare-worker) thay vì
 * gọi thẳng từ trình duyệt (frontend Cloudflare Pages) sang URL Apps Script.
 */

// Mọi action được phép gọi, ánh xạ tới tên hàm xử lý tương ứng trong các file .gs khác.
var ACTION_MAP = {
  // Auth
  dangNhap: api_dangNhap,
  dangXuat: api_dangXuat,
  doiMatKhauCuaToi: api_doiMatKhauCuaToi,

  // Người dùng (Admin quản lý tài khoản)
  danhSachNguoiDung: api_danhSachNguoiDung,
  taoNguoiDung: api_taoNguoiDung,
  suaNguoiDung: api_suaNguoiDung,

  // Danh mục
  danhSachDonVi: api_danhSachDonVi,
  taoDonVi: api_taoDonVi,
  danhSachNamHoc: api_danhSachNamHoc,
  taoNamHoc: api_taoNamHoc,
  danhMucNoiDungGiangDay: api_danhMucNoiDungGiangDay,
  danhSachDinhMuc: api_danhSachDinhMuc,
  taoDinhMuc: api_taoDinhMuc,

  // Giảng viên
  traCuuGiangVienTheoCCCD: api_traCuuGiangVienTheoCCCD,
  taoGiangVien: api_taoGiangVien,
  suaGiangVien: api_suaGiangVien,
  layGiangVienTheoId: api_layGiangVienTheoId,

  // Danh sách thỉnh giảng của đơn vị
  themVaoDanhSach: api_themVaoDanhSach,
  layDanhSachDonVi: api_layDanhSachDonVi,
  xuatDanhSachExcel: api_xuatDanhSachExcel,

  // Hợp đồng + Quyết định
  taoHopDong: api_taoHopDong,
  chuyenTrangThaiHopDong: api_chuyenTrangThaiHopDong,
  layHopDongChoThanhLy: api_layHopDongChoThanhLy,
  layHopDongTheoId: api_layHopDongTheoId,
  danhSachHopDong: api_danhSachHopDong,
  xuatFileHopDong: api_xuatFileHopDong,

  // Chi tiết giờ giảng
  layChiTietGio: api_layChiTietGio,

  // Giấy xác nhận giờ giảng
  taoGiayXacNhan: api_taoGiayXacNhan,
  layGCNTheoHopDong: api_layGCNTheoHopDong,

  // Phụ lục
  taoPhuLuc: api_taoPhuLuc,
  layPhuLucTheoHopDong: api_layPhuLucTheoHopDong,

  // Thanh lý
  thanhLyHopDong: api_thanhLyHopDong,
  layThanhLyTheoHopDong: api_layThanhLyTheoHopDong,

  // Audit log
  layNhatKy: api_layNhatKy,
};

function doPost(e) {
  return xuLyRequest_(e);
}

function doGet(e) {
  return xuLyRequest_(e);
}

function xuLyRequest_(e) {
  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      body = e.parameter;
      if (body.payload) body = JSON.parse(body.payload); // hỗ trợ GET ?action=...&payload=<json>
    }

    var action = (e.parameter && e.parameter.action) || body.action;
    var fn = ACTION_MAP[action];
    if (!fn) return errorResponse_('Không tồn tại action: ' + action, 'UNKNOWN_ACTION');

    return fn(body);
  } catch (err) {
    if (err && err.name === 'AuthError') {
      return errorResponse_(err.message, 'AUTH_ERROR');
    }
    Logger.log(err);
    return errorResponse_('Lỗi hệ thống: ' + (err && err.message ? err.message : err), 'SERVER_ERROR');
  }
}
