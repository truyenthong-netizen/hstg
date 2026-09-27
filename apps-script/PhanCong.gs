/**
 * PhanCong.gs — Bước 3: lập danh sách giảng viên thỉnh giảng của đơn vị theo năm học.
 * Theo Mục 9.3 tài liệu YCNV.
 */

function api_themVaoDanhSach(payload) {
  var session = yeuCauDangNhap_(payload.token);
  var d = payload.phanCong || {};
  var required = ['ID_GiangVien', 'ID_DonVi', 'ID_NamHoc', 'Mon_Hoc_HocPhan'];
  for (var i = 0; i < required.length; i++) {
    if (!d[required[i]]) return errorResponse_('Thiếu trường: ' + required[i], 'INVALID_INPUT');
  }

  // Người phụ trách đơn vị chỉ được lập danh sách cho đúng đơn vị của mình.
  if (session.vaiTro === 'DonVi' && d.ID_DonVi !== session.idDonVi) {
    return errorResponse_('Không có quyền lập danh sách cho đơn vị khác', 'FORBIDDEN');
  }

  var record = {
    ID_PhanCong: newId_('PC'),
    ID_GiangVien: d.ID_GiangVien,
    ID_DonVi: d.ID_DonVi,
    ID_NamHoc: d.ID_NamHoc,
    Mon_Hoc_HocPhan: d.Mon_Hoc_HocPhan,
    Hoc_Ky: d.Hoc_Ky || '',
    Loai_Hinh_HD: d.Loai_Hinh_HD || '',
    So_Tiet_So_Gio: d.So_Tiet_So_Gio || 0,
    Thoi_Gian_Thuc_Hien: d.Thoi_Gian_Thuc_Hien || '',
    Trang_Thai: 'Du_Kien',
    Nguoi_Lap: session.tenDangNhap,
    Ngay_Lap: todayStr_(),
  };
  appendRow_(SHEETS.PHAN_CONG_THINH_GIANG, record);
  ghiNhatKy_('PHAN_CONG_THINH_GIANG', record.ID_PhanCong, 'Tao_Moi', null, record, session.tenDangNhap);
  return okResponse_(record);
}

/** Bước 4 (dữ liệu nguồn để xuất danh sách): lấy danh sách của 1 đơn vị + năm học, kèm tên giảng viên. */
function api_layDanhSachDonVi(payload) {
  var session = yeuCauDangNhap_(payload.token);
  var idDonVi = payload.idDonVi || session.idDonVi;
  if (session.vaiTro === 'DonVi' && idDonVi !== session.idDonVi) {
    return errorResponse_('Không có quyền xem danh sách đơn vị khác', 'FORBIDDEN');
  }

  var phanCongs = sheetToObjects_(SHEETS.PHAN_CONG_THINH_GIANG).filter(function (pc) {
    return pc.ID_DonVi === idDonVi && (!payload.idNamHoc || pc.ID_NamHoc === payload.idNamHoc);
  });
  var giangViens = sheetToObjects_(SHEETS.GIANG_VIEN);
  var gvMap = {};
  giangViens.forEach(function (gv) { gvMap[gv.ID_GiangVien] = gv; });

  var result = phanCongs.map(function (pc) {
    var gv = gvMap[pc.ID_GiangVien] || {};
    return Object.assign({}, pc, {
      Ho_Ten_GiangVien: gv.Ho_Ten,
      So_CCCD: gv.So_CCCD,
      Hoc_Ham_Hoc_Vi: gv.Hoc_Ham_Hoc_Vi,
    });
  });
  return okResponse_(result);
}

// TODO Bước 4 — Xuất danh sách và trình ký:
// Xuất Excel bằng SpreadsheetApp (tạo file mới từ dữ liệu api_layDanhSachDonVi),
// xuất Word/PDF bằng Google Docs template (xem ExportUtils.gs) — cần đơn vị cung cấp
// file mẫu biểu thống nhất để đối chiếu vị trí các trường placeholder.
