# HocLaiXe – web luyện thi sát hạch lái xe hạng B

Web tĩnh (HTML/CSS/JS, Bootstrap 5.3, three.js), chạy offline. Nên mở bằng máy chủ cục bộ (VS Code Live Server hoặc `py -m http.server`) để iframe Facebook/Google Maps hoạt động.

## Các trang

| Trang | Nội dung |
|---|---|
| `index.html` | Trang chủ: giới thiệu, thành tích, 11 bài thi, bảng giá, hỏi đáp, bản đồ, fanpage, chatbot |
| `sa-hinh.html` | Mô phỏng sa hình 3D 11 bài (miễn phí) |
| `ly-thuyet.html`, `mo-phong.html` | Nhúng trang thi lý thuyết / mô phỏng tình huống |
| `hop-so.html` | Cấu tạo hộp số sàn 3D (**gói Pro**, có dùng thử 3 phút) |
| `xe-co-ban.html` | Ô tô cơ bản 3D cho người mới: ngoại thất, khoang máy (mở capo), buồng lái; điểm chú thích và điều khiển thử (miễn phí) |
| `cam-nang.html`, `bai-viet.html?id=…` | Cẩm nang kỹ thuật: danh sách (tìm kiếm, lọc chủ đề) và trang bài viết; dữ liệu trong `js/articles.js`, 2 bài gắn nhãn **Pro** |
| `nang-cap.html` | Chọn gói, mã giảm giá, thanh toán (mô phỏng), kích hoạt mã, lịch sử đơn |

## Cơ chế thương mại (gói Pro)

- Bảng giá: Pro 1 tháng 49.000đ · Pro 12 tháng 299.000đ · Pro trọn đời 599.000đ.
- Mã giảm giá: `SINHVIEN` (−20%), `HOCLAIXE10` (−10%).
- Thanh toán → cấp mã kích hoạt `HLX-XXXX-XXXX-XXXX` (có checksum) → kích hoạt Pro theo thời hạn gói, cộng dồn nếu còn hạn.
- Trang `hop-so.html` kiểm tra gói Pro; chưa có Pro thì khoá và cho dùng thử 3 phút (1 lần/trình duyệt).
- Bài cẩm nang gắn nhãn Pro: người dùng miễn phí đọc được phần mở đầu và mục đầu tiên, phần còn lại bị làm mờ kèm nút nâng cấp.
- Logic nằm trong `js/license.js`, lưu ở `localStorage`.

> Đây là bản demo cho bài thực hành: thanh toán chỉ mô phỏng, không trừ tiền thật. Vì là web tĩnh nên việc kiểm tra mã nằm ở phía trình duyệt; bản thương mại thật cần máy chủ và cổng thanh toán để xác nhận giao dịch và cấp mã.

### Mã kích hoạt dùng để chấm bài

| Gói | Mã |
|---|---|
| Pro 1 tháng | `HLX-M4SE-NYD4-PV6E` |
| Pro 12 tháng | `HLX-YA6W-H55D-Y7U5` |
| Pro trọn đời | `HLX-L35G-BZLQ-DTA6` |

Nhập tại `nang-cap.html` → mục "Đã có mã kích hoạt?". Muốn thử lại từ đầu: bấm "Huỷ kích hoạt trên máy này" hoặc xoá dữ liệu trang của trình duyệt.
