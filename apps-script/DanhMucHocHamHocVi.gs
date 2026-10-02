/**
 * DanhMucHocHamHocVi.gs — danh mục "Học hàm/học vị" do Admin tự quản lý (thêm 10/2026).
 * Trước đây đây là danh sách cứng gõ sẵn trong HTML (tra-cuu-giang-vien.html, danh-muc.html);
 * đơn vị báo danh mục này còn tiếp tục thay đổi/mở rộng (BS.CKI/CKII, ĐD, DS...), nên tách ra
 * quản lý tập trung ở đây — mọi trang khác (Bước 2b tạo hồ sơ giảng viên, Danh mục định mức...)
 * gọi api_danhMucHocHamHocVi để nạp danh sách, KHÔNG gõ cứng <option> nữa, để sửa 1 chỗ là mọi
 * nơi đều cập nhật theo (các vai trò khác "kế thừa" danh mục này qua API, như Admin yêu cầu).
 *
 * LƯU Ý quan trọng: thêm 1 Học hàm/học vị mới ở đây KHÔNG tự sinh định mức chi thỉnh giảng —
 * phải vào Danh mục → "Định mức chi thỉnh giảng" thêm đơn giá cho đúng tên vừa thêm, nếu không
 * giảng viên mang học hàm/học vị đó sẽ không thanh lý được hợp đồng (xem ThanhLy.gs — báo lỗi
 * "Chưa có định mức đơn giá cho học hàm/học vị: ...").
 */

/** Ai đăng nhập cũng xem được (dùng để đổ vào <select> ở nhiều trang, không chỉ Admin). */
function api_danhMucHocHamHocVi(payload) {
  yeuCauDangNhap_(payload.token);
  var all = sheetToObjects_(SHEETS.DM_HOC_HAM_HOC_VI);
  all.sort(function (a, b) { return Number(a.Thu_Tu_Hien_Thi || 0) - Number(b.Thu_Tu_Hien_Thi || 0); });
  return okResponse_(all);
}

function api_taoHocHamHocVi(payload) {
  var session = yeuCauAdmin_(payload.token);
  var d = payload.hocHamHocVi || {};
  var ten = (d.Ten || '').trim();
  if (!ten) return errorResponse_('Thiếu tên học hàm/học vị', 'INVALID_INPUT');

  var all = sheetToObjects_(SHEETS.DM_HOC_HAM_HOC_VI);
  if (all.some(function (h) { return h.Ten.trim().toLowerCase() === ten.toLowerCase(); })) {
    return errorResponse_('Học hàm/học vị "' + ten + '" đã tồn tại trong danh mục', 'DUPLICATE');
  }

  var thuTuLonNhat = all.reduce(function (max, h) { return Math.max(max, Number(h.Thu_Tu_Hien_Thi || 0)); }, 0);
  var record = {
    ID_HocHamHocVi: newId_('HH'),
    Ten: ten,
    Thu_Tu_Hien_Thi: d.Thu_Tu_Hien_Thi || (thuTuLonNhat + 1),
  };
  appendRow_(SHEETS.DM_HOC_HAM_HOC_VI, record);
  ghiNhatKy_('DM_HOC_HAM_HOC_VI', record.ID_HocHamHocVi, 'Tao_Moi', null, record, session.tenDangNhap);
  return okResponse_(record);
}

function api_suaHocHamHocVi(payload) {
  var session = yeuCauAdmin_(payload.token);
  var all = sheetToObjects_(SHEETS.DM_HOC_HAM_HOC_VI);
  var target = all.filter(function (h) { return h.ID_HocHamHocVi === payload.idHocHamHocVi; })[0];
  if (!target) return errorResponse_('Không tìm thấy học hàm/học vị', 'NOT_FOUND');

  var p = payload.patch || {};
  if (p.Ten !== undefined && !String(p.Ten).trim()) {
    return errorResponse_('Tên không được để trống', 'INVALID_INPUT');
  }
  // Đổi tên ở đây KHÔNG tự đổi theo các hồ sơ giảng viên/định mức đã lưu giá trị cũ (lưu plain
  // text, không phải tham chiếu ID) — cảnh báo Admin rõ trong message trả về để tự đối chiếu lại
  // Danh mục định mức nếu cần.
  var before = { Ten: target.Ten, Thu_Tu_Hien_Thi: target.Thu_Tu_Hien_Thi };
  updateRow_(SHEETS.DM_HOC_HAM_HOC_VI, target.__row, p);
  ghiNhatKy_('DM_HOC_HAM_HOC_VI', target.ID_HocHamHocVi, 'Chinh_Sua', before, p, session.tenDangNhap);

  var canhBao = (p.Ten !== undefined && p.Ten !== target.Ten)
    ? ' Lưu ý: hồ sơ giảng viên/định mức đã lưu theo tên cũ "' + target.Ten + '" sẽ KHÔNG tự đổi theo — kiểm tra lại Danh mục định mức nếu cần.'
    : '';
  return okResponse_({ canhBao: canhBao });
}

/** Xoá — chặn nếu đang có giảng viên mang học hàm/học vị này hoặc đang có định mức tương ứng. */
function api_xoaHocHamHocVi(payload) {
  var session = yeuCauAdmin_(payload.token);
  var all = sheetToObjects_(SHEETS.DM_HOC_HAM_HOC_VI);
  var target = all.filter(function (h) { return h.ID_HocHamHocVi === payload.idHocHamHocVi; })[0];
  if (!target) return errorResponse_('Không tìm thấy học hàm/học vị', 'NOT_FOUND');

  var dangDungOGiangVien = sheetToObjects_(SHEETS.GIANG_VIEN).some(function (gv) { return gv.Hoc_Ham_Hoc_Vi === target.Ten; });
  if (dangDungOGiangVien) {
    return errorResponse_('Đang có giảng viên mang học hàm/học vị "' + target.Ten + '" — không thể xoá khỏi danh mục.', 'IN_USE');
  }
  var dangDungODinhMuc = sheetToObjects_(SHEETS.DINH_MUC_DON_GIA).some(function (dm) { return dm.Hoc_Ham_Hoc_Vi === target.Ten; });
  if (dangDungODinhMuc) {
    return errorResponse_('Đang có định mức chi thỉnh giảng gắn với "' + target.Ten + '" — không thể xoá khỏi danh mục.', 'IN_USE');
  }

  deleteRow_(SHEETS.DM_HOC_HAM_HOC_VI, target.__row);
  ghiNhatKy_('DM_HOC_HAM_HOC_VI', target.ID_HocHamHocVi, 'Xoa', { Ten: target.Ten }, null, session.tenDangNhap);
  return okResponse_({});
}
