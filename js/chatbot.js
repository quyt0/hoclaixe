// Chatbot hỏi đáp đơn giản về học lái xe: so khớp từ khoá, chạy hoàn toàn trên trình duyệt.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  // Bỏ dấu tiếng Việt để so khớp không phụ thuộc cách gõ
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9 ]/g, ' ');

  // k: các cụm từ khoá (không dấu); a: câu trả lời
  const KB = [
    { k: ['xin chao', 'chao', 'hello', 'alo'], a: 'Chào bạn 👋 Mình là trợ lý HocLaiXe. Bạn có thể hỏi về hồ sơ, lệ phí, cấu trúc bài thi, 11 bài sa hình hoặc mẹo thi nhé.' },
    { k: ['ho so', 'giay to', 'can mang gi', 'dang ky hoc'], a: 'Hồ sơ học lái xe hạng B thường gồm:\n• Đơn đề nghị học, sát hạch cấp giấy phép lái xe\n• Bản sao căn cước công dân\n• Giấy khám sức khoẻ của người lái xe (cơ sở y tế đủ điều kiện)\n• Ảnh chân dung (tuỳ trung tâm)\nBạn nên hỏi trung tâm đào tạo để biết yêu cầu cụ thể.' },
    { k: ['tuoi', 'bao nhieu tuoi', 'du tuoi'], a: 'Để học và thi bằng lái hạng B, bạn cần đủ 18 tuổi trở lên (tính đến ngày dự sát hạch).' },
    { k: ['le phi', 'chi phi', 'bao nhieu tien', 'gia thi', 'gia bao nhieu', 'hoc phi'], a: 'Lệ phí sát hạch hạng B (tham khảo theo Thông tư 37/2023/TT-BTC):\n• Lý thuyết: 100.000đ\n• Mô phỏng tình huống: 100.000đ\n• Sa hình: 350.000đ\n• Đường trường: 80.000đ\n• Cấp giấy phép lái xe: 135.000đ\nHọc phí đào tạo do từng trung tâm quy định, thường vài chục triệu đồng.' },
    { k: ['cau truc', 'gom nhung phan', 'thi nhung gi', 'cac phan thi', 'noi dung thi'], a: 'Kỳ sát hạch hạng B gồm 4 phần, đạt phần trước mới thi phần sau:\n1. Lý thuyết trên máy tính\n2. Mô phỏng các tình huống giao thông\n3. Thực hành trong sa hình (11 bài)\n4. Thực hành lái xe trên đường' },
    { k: ['ly thuyet', 'bao nhieu cau', '600 cau', 'trac nghiem'], a: 'Phần lý thuyết hạng B: 30 câu hỏi trong 20 phút, cần đúng từ 27 câu trở lên và không được sai câu điểm liệt. Bộ đề gồm 600 câu (luật, biển báo, sa hình, kỹ thuật lái, văn hoá giao thông…).' },
    { k: ['diem liet', 'cau liet'], a: 'Câu điểm liệt là các câu về tình huống mất an toàn giao thông nghiêm trọng. Chỉ cần sai 1 câu điểm liệt là trượt phần lý thuyết dù tổng số câu đúng đủ điểm.' },
    { k: ['mo phong', 'tinh huong giao thong', '120 tinh huong'], a: 'Phần mô phỏng: xem các video tình huống giao thông và bấm phím khi nhận thấy dấu hiệu nguy hiểm. Bấm càng sớm (trong khoảng hợp lệ) điểm càng cao, bấm quá sớm bị 0 điểm. Hạng B cần đạt khoảng 35/50 điểm.' },
    { k: ['sa hinh', '11 bai', 'thuc hanh', 'trong hinh'], a: 'Sa hình hạng B gồm 11 bài liên hoàn: xuất phát, nhường đường người đi bộ, dừng – khởi hành ngang dốc, vệt bánh xe & vuông góc, ngã tư có đèn, quanh co, ghép xe dọc, ghép xe ngang, đường sắt, thay đổi số, kết thúc.\nThang 100 điểm, đạt từ 80, thời gian 18 phút. Bạn có thể luyện ngay trong phần mô phỏng của trang này!' },
    { k: ['xuat phat', 'bai 1'], a: 'Bài 1 – Xuất phát: thắt dây an toàn, bật xi nhan trái, qua vạch xuất phát trong 20 giây (quá 30 giây bị đình chỉ), tắt xi nhan sau khoảng 5 m. Quên dây an toàn hoặc xi nhan đều bị trừ 5 điểm.' },
    { k: ['nguoi di bo', 'bai 2', 'vach dung'], a: 'Bài 2 – Dừng xe nhường đường cho người đi bộ: dừng sao cho cản trước cách vạch dừng không quá 50 cm. Dừng chưa tới, quá vạch hoặc không dừng đều bị trừ 5 điểm.' },
    { k: ['doc', 'ngang doc', 'bai 3', 'de pa', 'tut doc'], a: 'Bài 3 – Dừng và khởi hành ngang dốc: dừng cách vạch không quá 50 cm, khởi hành trong 30 giây, không để xe tụt dốc quá 50 cm.\nLưu ý: dừng quá vạch, không dừng, tụt dốc quá 50 cm hoặc quá 30 giây đều bị đình chỉ. Mẹo với xe số tự động: giữ phanh, chuyển nhẹ sang ga khi khởi hành.' },
    { k: ['vet banh', 'vuong goc', 'chu z', 'bai 4'], a: 'Bài 4 – Qua vệt bánh xe và đường vòng vuông góc: bánh trước và bánh sau bên phải phải đi trong vệt (lệch ra là đình chỉ), rồi qua 2 góc vuông không đè vạch, hoàn thành trong 2 phút.\nMẹo: đi chậm, canh bánh phải theo vệt từ xa; trong mô phỏng hãy nhìn "Camera bánh phải".' },
    { k: ['nga tu', 'den do', 'den giao thong', 'bai 5', 'vuot den'], a: 'Bài 5 – Qua ngã tư có đèn tín hiệu: đèn đỏ phải dừng trước vạch (≤ 50 cm), đèn xanh/vàng được đi. Vượt đèn đỏ trừ 10 điểm, rẽ không xi nhan trừ 5 điểm, quá 20 giây từ khi đèn xanh trừ 5 điểm, quá 30 giây bị đình chỉ.' },
    { k: ['quanh co', 'chu s', 'bai 6'], a: 'Bài 6 – Đường vòng quanh co (chữ S): đi chậm đều, đánh lái sớm và trả lái kịp để bánh xe không đè vạch. Mỗi lần đè vạch trừ 5 điểm, quá 2 phút trừ 5 điểm.' },
    { k: ['ghep xe doc', 'ghep doc', 'lui chuong', 'bai 7'], a: 'Bài 7 – Ghép xe dọc vào nơi đỗ: tiến qua khỏi chuồng, lùi để toàn bộ thân xe nằm trong nơi đỗ, chờ tín hiệu rồi tiến ra. Còn một phần thân xe ngoài chuồng khi kết thúc bài là đình chỉ.' },
    { k: ['ghep xe ngang', 'ghep ngang', 'do song song', 'bai 8'], a: 'Bài 8 – Ghép xe ngang vào nơi đỗ: lùi xe song song vào ô đỗ bên phải. Thường đánh lái hết về phải khi lùi, rồi trả lái và đánh ngược về trái để thân xe thẳng trong ô.' },
    { k: ['duong sat', 'xe lua', 'bai 9'], a: 'Bài 9 – Tạm dừng ở chỗ có đường sắt chạy qua: dừng trước vạch dừng không quá 50 cm, quan sát rồi đi tiếp. Không dừng hoặc dừng sai vị trí bị trừ 5 điểm.' },
    { k: ['thay doi so', 'tang toc', 'tang so', 'bai 10'], a: 'Bài 10 – Thay đổi số trên đường bằng: 25 m đầu tăng tốc trên 24 km/h (xe số sàn lên số 2), 25 m sau giảm xuống dưới 24 km/h (về số 1). Sai số hoặc sai tốc độ bị trừ 5 điểm.' },
    { k: ['ket thuc', 'bai 11'], a: 'Bài 11 – Kết thúc: bật xi nhan phải khi qua vạch kết thúc. Quên xi nhan trừ 5 điểm; tổng điểm dưới 80 là không đạt.' },
    { k: ['nguy hiem', 'tinh huong bat ngo', 'den canh bao'], a: 'Tình huống nguy hiểm xuất hiện ngẫu nhiên trong sa hình: phanh dừng xe trong 3 giây, bật đèn cảnh báo nguy hiểm trong 5 giây, tắt đèn trước khi đi tiếp. Mỗi thao tác sai trừ 10 điểm.' },
    { k: ['bao nhieu diem', 'dat bao nhieu', 'diem dat', 'thang diem'], a: 'Sa hình hạng B: thang 100 điểm, đạt từ 80 điểm và không bị đình chỉ. Thời gian 18 phút; quá giờ cứ 3 giây trừ 1 điểm. Chạy quá 24 km/h cũng cứ 3 giây trừ 1 điểm.' },
    { k: ['duong truong', 'tren duong', 'lai tren duong'], a: 'Phần lái xe trên đường: sát hạch viên ngồi cạnh ra lệnh, bạn lái trên tuyến đường thật khoảng 2 km (tăng giảm số, chuyển làn, rẽ, dừng…). Đạt từ 80/100 điểm.' },
    { k: ['so tu dong', 'so san', 'so co khi', 'hang b', 'b1', 'b2'], a: 'Từ 01/01/2025 hạng B1/B2 cũ gộp thành hạng B, có thể học xe số tự động hoặc số sàn. Người học xe số tự động được cấp bằng hạng B ghi chú chỉ lái xe số tự động.' },
    { k: ['thoi han', 'het han', 'bao lau'], a: 'Theo Luật Trật tự, an toàn giao thông đường bộ 2024, giấy phép lái xe hạng B có thời hạn 10 năm kể từ ngày cấp.' },
    { k: ['meo', 'kinh nghiem', 'bi quyet'], a: 'Một vài mẹo thi sa hình:\n• Luôn đi chậm, giữ tốc độ dưới 24 km/h\n• Dừng xe cách vạch 20–40 cm cho an toàn\n• Nhớ thứ tự bài và hướng rẽ của sân thi\n• Xi nhan: trái khi xuất phát, phải khi kết thúc\n• Luyện riêng các bài hay sai trong mục "Lỗi bạn hay mắc nhất".' },
    { k: ['phim', 'dieu khien', 'cach lai', 'ban phim'], a: 'Phím trong mô phỏng: W/S ga – phanh, A/D xoay vô-lăng, F trả lái giữa, Shift + A/D đánh lái chậm, 1–4 chọn số P/R/N/D, Z/X/C xi nhan trái/phải/tắt, B dây an toàn, phím cách để kéo/nhả phanh tay, H đèn cảnh báo, V đổi góc nhìn, G bật/tắt gương.' },
    { k: ['web nay', 'trang nay', 'hoclaixe', 'ai lam', 'gioi thieu'], a: 'HocLaiXe là trang luyện thi sa hình 3D hạng B chạy hoàn toàn trên trình duyệt, chấm điểm theo Thông tư 12/2025/TT-BCA. Đây là công cụ luyện tập, không phải phần mềm sát hạch chính thức.' },
    { k: ['pro', 'goi pro', 'nang cap', 'bang gia', 'gia goi', 'mua goi', 'goi pro gia', 'pro bao nhieu'], a: 'Gói HocLaiXe Pro:\n• Pro 1 tháng: 49.000đ\n• Pro 12 tháng: 299.000đ (phổ biến, tiết kiệm 49%)\n• Pro trọn đời: 599.000đ\nPro mở khoá cấu tạo hộp số sàn 3D. Sinh viên nhập mã SINHVIEN giảm 20%. Có dùng thử miễn phí 3 phút. Mua tại trang "Nâng cấp Pro".' },
    { k: ['ma kich hoat', 'kich hoat', 'nhap ma'], a: 'Sau khi thanh toán bạn nhận mã dạng HLX-XXXX-XXXX-XXXX. Vào trang "Nâng cấp Pro" → mục "Đã có mã kích hoạt?" để nhập. Kích hoạt khi đang còn hạn thì thời gian được cộng dồn.' },
    { k: ['thanh toan', 'chuyen khoan', 'hoan tien', 'vi dien tu'], a: 'Có thể thanh toán bằng chuyển khoản ngân hàng hoặc ví điện tử; hoàn tiền 100% trong 7 ngày nếu không hài lòng. (Trang này là bản demo cho bài thực hành nên thanh toán chỉ mô phỏng, không trừ tiền thật.)' },
    { k: ['hop so', 'so san', 'banh rang', 'dong toc', 'ong gai'], a: 'Hộp số sàn gồm trục sơ cấp, trục trung gian và trục thứ cấp. Các bánh răng số luôn ăn khớp nhưng lồng không trên trục thứ cấp; khi vào số, ống gài (bộ đồng tốc) khoá một bánh răng vào trục. Xem mô hình 3D ở trang "Cấu tạo hộp số sàn" (gói Pro, có dùng thử).' },
    { k: ['ly hop', 'dap con', 'nha con', 'chan con', 'chet may'], a: 'Ly hợp (côn) nối/ngắt động cơ với hộp số. Đạp côn → bàn ép nhả đĩa ma sát → ngắt truyền lực để vào số. Nhả côn từ từ để đĩa ăn dần; nhả đột ngột ở số 1 khi xe đứng yên dễ làm động cơ chết máy.' },
    { k: ['cau chi', 'dut cau chi', 'chet may doc duong'], a: 'Cầu chì bảo vệ mạch điện, sẽ đứt khi dòng quá lớn. Xe chết máy dọc đường có thể do đứt cầu chì bơm xăng/ECU/đánh lửa: dừng an toàn, mở hộp cầu chì (khoang máy hoặc dưới táp-lô), soi sợi chì, thay bằng cầu chì CÙNG định mức ampe. Xem bài "Thay cầu chì khi xe chết máy dọc đường" trong Cẩm nang.' },
    { k: ['gat mua', 'thay gat mua', 'luoi gat'], a: 'Gạt mưa để lại vệt, kêu ken két hoặc cao su nứt là cần thay (thường 6–12 tháng). Dựng cần gạt, lót khăn lên kính, bấm lẫy tháo lưỡi cũ, lắp lưỡi mới đúng kích thước đến khi nghe "tách". Chi tiết ở bài "Cách kiểm tra và thay thế lưỡi gạt mưa".' },
    { k: ['deo', 'doc dai', 'phanh dong co', 'do deo', 'xuong doc'], a: 'Đổ đèo dùng phanh động cơ: về số thấp (lên dốc số nào xuống dốc số đó), xe số tự động chọn L/2/B hoặc M. Phanh chân từng nhịp, không rà phanh liên tục, không về N và không tắt máy khi xuống dốc. Đọc thêm bài "Kinh nghiệm đi đèo dốc".' },
    { k: ['ac quy', 'het dien', 'cau binh', 'kich binh'], a: 'Ắc quy 12 V cấp điện để đề máy; máy phát sạc lại khi xe chạy. Hết điện có thể câu bình: dây đỏ nối (+) bình hết điện → (+) bình tốt; dây đen nối (−) bình tốt → điểm kim loại trên khối máy xe hỏng. Xem bài "Câu bình khi ắc quy hết điện" (Pro).' },
    { k: ['den canh bao', 'den bao', 'check engine', 'den do tren dong ho'], a: 'Đèn cảnh báo màu đỏ (áp suất dầu, nhiệt độ nước, phanh, sạc ắc quy) → dừng xe an toàn và kiểm tra ngay; màu vàng (check engine, ABS, áp suất lốp) → kiểm tra sớm; màu xanh chỉ báo tính năng đang bật. Xem bài "Đọc hiểu các đèn cảnh báo" (Pro).' },
    { k: ['o to co ban', 'xe 3d', 'mo capo', 'khoang may', 'buong lai'], a: 'Trang "Ô tô cơ bản 3D" giúp người mới làm quen xe: mở capo xem ắc quy, que thăm dầu, các bình nước; vào buồng lái thử xi nhan, đèn pha, gạt mưa, cần số và xem đèn trên bảng đồng hồ. Miễn phí!' },
    { k: ['cam on', 'thank', 'thanks'], a: 'Không có gì 😊 Chúc bạn thi đỗ ngay lần đầu!' },
  ];
  const CHIPS = ['Hồ sơ cần gì?', 'Lệ phí thi', 'Thi lý thuyết mấy câu?', 'Điểm đạt sa hình', 'Gói Pro giá bao nhiêu?', 'Vì sao phải đạp côn?'];

  function answer(q) {
    const t = ' ' + norm(q) + ' ';
    let best = null, bestScore = 0;
    for (const item of KB) {
      let sc = 0;
      for (const k of item.k) if (t.includes(k)) sc += k.length;
      if (sc > bestScore) { bestScore = sc; best = item; }
    }
    return best ? best.a : 'Xin lỗi, mình chưa hiểu câu hỏi 😅 Bạn thử hỏi về: hồ sơ, lệ phí, lý thuyết, mô phỏng, sa hình, từng bài thi (ví dụ "bài 4"), tình huống nguy hiểm hoặc mẹo thi nhé.';
  }

  const log = $('chatLog');
  function add(text, who) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + who;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }
  function ask(q) {
    q = q.trim();
    if (!q) return;
    add(q, 'me');
    setTimeout(() => add(answer(q), 'bot'), 300);
  }

  const box = $('chatBox');
  let greeted = false;
  function toggle(open) {
    box.hidden = !open;
    if (open && !greeted) { greeted = true; add(KB[0].a, 'bot'); }
    if (open) $('chatInput').focus();
  }
  $('chatFab').addEventListener('click', () => toggle(box.hidden));
  $('chatClose').addEventListener('click', () => toggle(false));
  $('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    ask($('chatInput').value);
    $('chatInput').value = '';
  });
  for (const c of CHIPS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline-success btn-sm rounded-pill py-0';
    b.textContent = c;
    b.addEventListener('click', () => ask(c));
    $('chatChips').appendChild(b);
  }
})();
