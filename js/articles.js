// Dữ liệu bài viết Cẩm nang kỹ thuật. html: nội dung bài (mỗi <h2> là một mục, dùng để tạo mục lục).
// pro: true → chỉ người dùng Pro đọc toàn bài (người dùng miễn phí xem mục đầu tiên).
window.ARTICLES = [
  {
    id: 'he-thong-dien',
    cover: 'img/he-thong-dien.jpg',
    title: 'Cấu tạo hệ thống điện cơ bản trên ô tô: ắc quy, máy phát, cầu chì',
    cat: 'Cấu tạo xe', icon: 'bi-lightning-charge-fill', color: 'warning',
    date: '2026-10-20', minutes: 7, pro: false,
    summary: 'Điện trên xe đi từ đâu tới đâu? Hiểu vai trò của ắc quy, máy phát, cầu chì và rơ-le để tự chẩn đoán các lỗi điện đơn giản.',
    html: `
<p class="lead">Mọi thứ trên ô tô hiện đại – từ khởi động máy, phun xăng, đèn, còi đến màn hình – đều cần điện. Hệ thống điện của một chiếc xe con dùng điện một chiều <b>12 V</b> và gồm bốn phần chính.</p>
<figure class="figure article-figure w-100">
  <img src="img/he-thong-dien.jpg" class="figure-img img-fluid rounded-3 w-100" alt="Hệ thống dây điện chạy khắp thân ô tô" loading="lazy">
  <figcaption class="figure-caption">Một chiếc xe hiện đại có hàng nghìn mét dây điện (màu đỏ) nối ắc quy, máy phát, hộp cầu chì tới từng thiết bị.</figcaption>
</figure>

<h2 id="tong-quan">Sơ đồ tổng quan</h2>
<figure class="figure w-100 text-center">
  <svg viewBox="0 0 640 260" class="w-100 article-svg" role="img" aria-label="Sơ đồ hệ thống điện ô tô">
    <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="svg-fill"/></marker></defs>
    <rect x="20" y="95" width="120" height="70" rx="10" class="svg-box svg-warn"/><text x="80" y="125" class="svg-t">Ắc quy 12 V</text><text x="80" y="145" class="svg-s">tích trữ điện</text>
    <rect x="20" y="10" width="120" height="60" rx="10" class="svg-box svg-ok"/><text x="80" y="37" class="svg-t">Máy phát</text><text x="80" y="55" class="svg-s">sạc 13,8–14,7 V</text>
    <rect x="20" y="190" width="120" height="60" rx="10" class="svg-box"/><text x="80" y="217" class="svg-t">Máy khởi động</text><text x="80" y="235" class="svg-s">(máy đề)</text>
    <rect x="230" y="95" width="130" height="70" rx="10" class="svg-box svg-info"/><text x="295" y="125" class="svg-t">Hộp cầu chì</text><text x="295" y="145" class="svg-s">+ rơ-le</text>
    <rect x="450" y="10" width="170" height="44" rx="8" class="svg-box"/><text x="535" y="37" class="svg-t">ECU, phun xăng, đánh lửa</text>
    <rect x="450" y="66" width="170" height="44" rx="8" class="svg-box"/><text x="535" y="93" class="svg-t">Bơm xăng</text>
    <rect x="450" y="122" width="170" height="44" rx="8" class="svg-box"/><text x="535" y="149" class="svg-t">Đèn, còi, gạt mưa</text>
    <rect x="450" y="178" width="170" height="44" rx="8" class="svg-box"/><text x="535" y="205" class="svg-t">Điều hoà, màn hình…</text>
    <path d="M80 70V93" class="svg-line" marker-end="url(#ar)"/>
    <path d="M80 165V188" class="svg-line" marker-end="url(#ar)"/>
    <path d="M140 130H228" class="svg-line" marker-end="url(#ar)"/>
    <path d="M360 130H400V32H448M400 88H448M400 144H448M400 130V200H448" class="svg-line" marker-end="url(#ar)"/>
    <text x="185" y="122" class="svg-s">dây dương (+)</text>
    <text x="320" y="250" class="svg-s">Cực âm (−) nối vào thân xe (mát chung)</text>
  </svg>
  <figcaption class="figure-caption">Điện đi từ ắc quy/máy phát qua hộp cầu chì tới từng thiết bị; dòng điện quay về qua thân xe.</figcaption>
</figure>

<h2 id="ac-quy">Ắc quy – kho chứa điện</h2>
<p>Ắc quy cung cấp dòng điện rất lớn (hàng trăm ampe) trong vài giây để <b>máy khởi động</b> quay động cơ, và cấp điện khi máy chưa nổ. Xe con thường dùng ắc quy 12 V dung lượng khoảng 40–75 Ah.</p>
<ul>
  <li><b>Cọc dương (+)</b> thường có nắp/ký hiệu màu đỏ, <b>cọc âm (−)</b> màu đen và nối vào thân xe.</li>
  <li>Ắc quy đầy, để nghỉ (máy tắt vài giờ) đo được khoảng <b>12,6 V</b>; dưới khoảng 12,2 V là đã yếu.</li>
  <li>Tuổi thọ phổ biến 2–4 năm. Dấu hiệu yếu: đề máy nặng, đèn mờ khi đề, cọc bình đóng muối trắng.</li>
</ul>
<div class="alert alert-warning"><i class="bi bi-exclamation-triangle-fill"></i> Khi tháo ắc quy: <b>tháo cọc âm trước, lắp cọc âm sau cùng</b> để tránh chập điện khi cờ-lê chạm thân xe.</div>

<h2 id="may-phat">Máy phát – nhà máy điện của xe</h2>
<p>Khi động cơ chạy, <b>máy phát</b> (dẫn động bằng dây curoa từ trục khuỷu) tạo điện xoay chiều, được chỉnh lưu thành một chiều và giữ ổn định khoảng <b>13,8–14,7 V</b> bởi bộ tiết chế. Máy phát vừa cấp điện cho toàn xe vừa sạc lại ắc quy.</p>
<p>Nếu máy phát hỏng, xe vẫn chạy được một lúc bằng điện của ắc quy cho tới khi bình cạn – lúc đó máy có thể tắt giữa đường. Dấu hiệu: <b>đèn báo ắc quy (hình bình điện màu đỏ)</b> sáng khi đang chạy, đèn chập chờn, có mùi khét hoặc tiếng rít dây curoa.</p>

<h2 id="cau-chi">Cầu chì và rơ-le – bảo vệ mạch điện</h2>
<p><b>Cầu chì</b> là một sợi kim loại nhỏ được tính để <b>đứt</b> khi dòng điện vượt mức cho phép, bảo vệ dây điện khỏi quá nhiệt và cháy. Xe thường có hai hộp cầu chì: trong khoang động cơ và dưới táp-lô phía người lái. Sơ đồ vị trí in ở nắp hộp hoặc trong sách hướng dẫn.</p>
<div class="table-responsive">
<table class="table table-sm align-middle">
  <thead><tr><th>Màu cầu chì cài (loại phổ biến)</th><th>Định mức</th></tr></thead>
  <tbody>
    <tr><td><span class="fuse" style="background:#c9a77c"></span> Nâu nhạt</td><td>5 A</td></tr>
    <tr><td><span class="fuse" style="background:#7b4a2a"></span> Nâu</td><td>7,5 A</td></tr>
    <tr><td><span class="fuse" style="background:#d62828"></span> Đỏ</td><td>10 A</td></tr>
    <tr><td><span class="fuse" style="background:#1d6fd6"></span> Xanh dương</td><td>15 A</td></tr>
    <tr><td><span class="fuse" style="background:#f2c230"></span> Vàng</td><td>20 A</td></tr>
    <tr><td><span class="fuse" style="background:#eeeeee"></span> Trắng / trong suốt</td><td>25 A</td></tr>
    <tr><td><span class="fuse" style="background:#2e9b47"></span> Xanh lá</td><td>30 A</td></tr>
  </tbody>
</table>
</div>
<p><b>Rơ-le</b> là công tắc điều khiển bằng điện: dòng nhỏ từ công tắc trên táp-lô đóng rơ-le, rơ-le cho dòng lớn đi tới thiết bị (đèn pha, quạt két nước, bơm xăng…). Nhờ vậy công tắc không phải chịu dòng lớn.</p>

<h2 id="loi-thuong-gap">Các lỗi điện thường gặp</h2>
<ul>
  <li><b>Đề không nổ, đèn táp-lô mờ:</b> ắc quy yếu hoặc cọc bình lỏng – siết lại cọc, câu bình hoặc thay ắc quy.</li>
  <li><b>Một thiết bị không hoạt động (còi, gạt mưa, châm thuốc…):</b> thường là đứt cầu chì của mạch đó – xem bài <a href="bai-viet.html?id=thay-cau-chi">thay cầu chì khi xe chết máy dọc đường</a>.</li>
  <li><b>Đèn báo ắc quy sáng khi đang chạy:</b> máy phát không sạc – tắt bớt thiết bị điện và đưa xe tới gara sớm.</li>
</ul>
<p class="text-body-secondary small">Khám phá vị trí ắc quy, hộp cầu chì trong khoang máy ở trang <a href="xe-co-ban.html#battery">Ô tô cơ bản 3D</a>.</p>
`,
  },
  {
    id: 'thay-gat-mua',
    cover: 'img/thay-gat-mua.jpg',
    title: 'Cách kiểm tra và thay thế lưỡi gạt mưa',
    cat: 'Bảo dưỡng', icon: 'bi-cloud-rain-heavy-fill', color: 'info',
    date: '2026-10-18', minutes: 5, pro: false,
    summary: 'Gạt mưa để lại vệt, kêu ken két hay rung giật? Hướng dẫn kiểm tra và tự thay lưỡi gạt mưa trong 10 phút, không cần dụng cụ.',
    html: `
<p class="lead">Lưỡi gạt mưa bằng cao su bị lão hoá dưới nắng nóng và bụi bẩn. Lưỡi gạt kém khiến tầm nhìn mờ khi mưa – đặc biệt nguy hiểm vào ban đêm.</p>

<h2 id="dau-hieu">Dấu hiệu cần thay</h2>
<ul>
  <li>Gạt để lại <b>vệt nước, vệt mờ</b> hoặc bỏ sót một dải kính.</li>
  <li>Kêu <b>ken két</b>, rung giật, nảy trên kính.</li>
  <li>Cao su bị <b>nứt, chai cứng, rách mép</b> hoặc cong vênh khi nhìn kỹ.</li>
  <li>Đã dùng quá khoảng <b>6–12 tháng</b> (nắng nóng nhiều thì nhanh hỏng hơn).</li>
</ul>
<div class="alert alert-info"><i class="bi bi-lightbulb-fill"></i> Trước khi thay, hãy lau sạch kính và lưỡi gạt bằng khăn ẩm – đôi khi chỉ là do bụi bám làm gạt kém.</div>

<h2 id="chuan-bi">Chuẩn bị</h2>
<ul>
  <li><b>Lưỡi gạt đúng kích thước</b> cho bên lái và bên phụ (thường khác nhau, ví dụ 24" và 16"). Tra trong sách hướng dẫn, đo lưỡi cũ hoặc hỏi cửa hàng theo đời xe.</li>
  <li>Một chiếc <b>khăn dày</b> để lót lên kính.</li>
</ul>

<h2 id="cac-buoc">Các bước thay</h2>
<figure class="figure article-figure w-100">
  <img src="img/thay-gat-mua.jpg" class="figure-img img-fluid rounded-3 w-100" alt="Tháo lưỡi gạt mưa khỏi cần gạt" loading="lazy">
  <figcaption class="figure-caption">Bấm lẫy ở khớp nối rồi trượt lưỡi gạt ra khỏi móc chữ U của cần gạt.</figcaption>
</figure>
<ol class="steps">
  <li><b>Tắt máy, tắt công tắc gạt mưa.</b> Một số xe có "chế độ bảo dưỡng" đưa cần gạt lên cao để dễ dựng – xem sách hướng dẫn.</li>
  <li><b>Dựng cần gạt</b> lên khỏi kính và <b>lót khăn</b> lên kính bên dưới. Nếu cần gạt bật ngược lại đập vào kính có thể làm nứt kính.</li>
  <li><b>Tháo lưỡi cũ:</b> loại móc chữ U phổ biến – bấm lẫy nhựa ở chỗ nối, đẩy lưỡi trượt xuống rồi rút ra khỏi móc.</li>
  <li><b>Lắp lưỡi mới:</b> luồn móc chữ U vào khớp nối của lưỡi mới, kéo lên cho tới khi nghe tiếng <b>"tách"</b>.</li>
  <li><b>Hạ cần gạt nhẹ nhàng</b> xuống kính, bỏ khăn.</li>
  <li><b>Thử:</b> phun nước rửa kính và bật gạt mưa – kính phải sạch đều, không vệt, không kêu.</li>
</ol>

<h2 id="meo">Mẹo để gạt mưa bền hơn</h2>
<ul>
  <li>Không bật gạt mưa khi kính khô; luôn phun nước rửa kính trước.</li>
  <li>Đổ <b>nước rửa kính chuyên dụng</b> (nắp bình thường có biểu tượng kính và tia nước), không dùng nước rửa chén.</li>
  <li>Đỗ xe dưới nắng lâu ngày nên dựng gạt mưa hoặc dùng tấm che kính.</li>
</ul>
<p class="text-body-secondary small">Xem vị trí cần gạt mưa và bình nước rửa kính ở trang <a href="xe-co-ban.html#wipers">Ô tô cơ bản 3D</a>.</p>
`,
  },
  {
    id: 'thay-cau-chi',
    cover: 'img/cau-chi.jpg',
    title: 'Thay cầu chì khi xe chết máy dọc đường',
    cat: 'Xử lý sự cố', icon: 'bi-tools', color: 'danger',
    date: '2026-10-15', minutes: 6, pro: false,
    summary: 'Xe đang chạy bỗng tắt máy, đề không nổ? Một cầu chì đứt (bơm xăng, ECU, đánh lửa) có thể là nguyên nhân. Cách kiểm tra và thay an toàn.',
    html: `
<p class="lead">Không phải lúc nào chết máy cũng do hỏng nặng. Nếu cầu chì của <b>bơm xăng, ECU (hộp điều khiển) hoặc hệ thống đánh lửa</b> bị đứt, động cơ sẽ tắt và không nổ lại được. Tự kiểm tra cầu chì chỉ mất vài phút.</p>

<h2 id="an-toan">1. Dừng xe an toàn trước tiên</h2>
<ol class="steps">
  <li>Bật <b>đèn cảnh báo nguy hiểm</b>, đánh lái đưa xe sát lề phải, ra khỏi làn xe chạy nếu có thể.</li>
  <li>Kéo phanh tay, về số P (số tự động) hoặc vào số và tắt máy (số sàn).</li>
  <li>Đặt <b>biển/tam giác cảnh báo</b> phía sau xe một khoảng đủ xa để xe phía sau kịp nhận biết; trên đường cao tốc hãy đặt xa hơn và đứng ra ngoài hàng rào hộ lan.</li>
</ol>
<div class="alert alert-danger"><i class="bi bi-exclamation-octagon-fill"></i> Nếu xe dừng ở vị trí nguy hiểm (khúc cua khuất, đỉnh dốc, cao tốc) – ưu tiên an toàn của người trên xe và gọi cứu hộ thay vì tự sửa.</div>

<h2 id="tim-cau-chi">2. Tìm đúng cầu chì</h2>
<ul>
  <li>Hộp cầu chì thường ở <b>khoang động cơ</b> (gần ắc quy) và <b>dưới táp-lô</b> bên trái người lái.</li>
  <li>Nắp hộp có <b>sơ đồ</b>; tìm các cầu chì có ký hiệu như <code>EFI</code>, <code>FUEL PUMP</code>/<code>F/PMP</code>, <code>IGN</code>, <code>ECU</code>, <code>INJ</code>.</li>
  <li>Dùng <b>kẹp gắp cầu chì</b> (thường gài sẵn trong hộp) để rút từng cái ra kiểm tra.</li>
</ul>
<figure class="figure article-figure w-100">
  <img src="img/cau-chi.jpg" class="figure-img img-fluid rounded-3 w-100" alt="Dùng kẹp nhựa rút cầu chì khỏi hộp cầu chì" loading="lazy">
  <figcaption class="figure-caption">Kẹp gắp cầu chì giúp rút cầu chì ra dễ dàng. Số in trên cầu chì là định mức ampe, mỗi định mức một màu (10 A đỏ, 15 A xanh dương, 20 A vàng…).</figcaption>
</figure>

<h2 id="kiem-tra">3. Nhận biết cầu chì đứt</h2>
<p>Soi cầu chì lên ánh sáng: cầu chì tốt có <b>sợi kim loại liền</b> nối hai chân; cầu chì đứt có <b>sợi bị đứt đoạn</b>, có thể kèm vết cháy đen bên trong nhựa.</p>

<h2 id="thay">4. Thay cầu chì</h2>
<ol class="steps">
  <li>Lấy cầu chì dự phòng <b>đúng định mức ampe</b> (cùng số và cùng màu) – thường có sẵn trong hộp cầu chì.</li>
  <li>Không có dự phòng? Có thể <b>tạm mượn</b> cầu chì cùng định mức của một mạch không thiết yếu (châm thuốc, ổ điện, còi phụ…).</li>
  <li>Cắm chặt cầu chì mới vào đúng vị trí, đóng nắp hộp, thử khởi động lại.</li>
</ol>
<div class="alert alert-warning"><i class="bi bi-exclamation-triangle-fill"></i> <b>Tuyệt đối không</b> thay bằng cầu chì định mức lớn hơn, dây đồng hay giấy bạc – dây điện có thể quá nhiệt và gây cháy xe.</div>

<h2 id="neu-van-dut">5. Nếu cầu chì mới lại đứt ngay</h2>
<p>Cầu chì đứt lặp lại nghĩa là mạch đó đang bị <b>chập</b> hoặc thiết bị bị kẹt. Đừng thay tiếp – hãy gọi cứu hộ hoặc gara để kiểm tra. Nếu cầu chì không đứt mà xe vẫn không nổ, nguyên nhân có thể là hết xăng, ắc quy yếu hoặc hỏng bơm xăng.</p>
<p class="text-body-secondary small">Tìm hiểu thêm: <a href="bai-viet.html?id=he-thong-dien">cấu tạo hệ thống điện trên ô tô</a>.</p>
`,
  },
  {
    id: 'do-deo-phanh-dong-co',
    cover: 'img/xuong-doc.jpg',
    title: 'Kinh nghiệm đi đèo dốc: dùng phanh động cơ (engine braking)',
    cat: 'Kỹ năng lái', icon: 'bi-signpost-split-fill', color: 'success',
    date: '2026-10-12', minutes: 8, pro: false,
    summary: 'Xuống dốc dài mà chỉ rà phanh chân dễ làm phanh quá nhiệt và mất tác dụng. Cách dùng số thấp để động cơ hãm xe, cho cả số sàn và số tự động.',
    html: `
<p class="lead">Khi đổ đèo, nếu chỉ dùng phanh chân liên tục, má phanh và đĩa phanh nóng lên rất nhanh. Phanh quá nhiệt sẽ giảm ma sát (hiện tượng <b>mất phanh do quá nhiệt</b>), dầu phanh có thể sôi tạo bọt khí – chân phanh "hẫng" đúng lúc cần nhất.</p>
<figure class="figure article-figure w-100">
  <img src="img/xuong-doc.jpg" class="figure-img img-fluid rounded-3 w-100" alt="Xe bán tải đổ dốc" loading="lazy">
  <figcaption class="figure-caption">Khi xuống dốc, giữ số thấp để động cơ ghìm tốc độ, chỉ dùng phanh chân từng nhịp khi cần.</figcaption>
</figure>

<h2 id="nguyen-ly">Phanh động cơ là gì?</h2>
<p>Khi nhả ga mà xe vẫn đang ăn số, bánh xe kéo ngược động cơ quay. Lực cản do nén khí và ma sát bên trong động cơ <b>hãm bớt tốc độ xe</b> mà không làm nóng phanh. Số càng thấp, động cơ quay càng nhanh và lực hãm càng lớn.</p>
<div class="alert alert-success"><i class="bi bi-check-circle-fill"></i> Nguyên tắc dễ nhớ: <b>lên dốc bằng số nào, xuống dốc dùng số đó</b> (hoặc thấp hơn một số nếu dốc dài).</div>

<h2 id="so-san">Với xe số sàn</h2>
<ol class="steps">
  <li><b>Giảm tốc trước khi bắt đầu đổ dốc</b>, sau đó vào số thấp (thường số 2 hoặc 3 tuỳ độ dốc).</li>
  <li>Nhả ga và để động cơ ghìm xe; <b>không đạp côn</b> trong lúc xuống dốc.</li>
  <li>Dùng phanh chân <b>từng nhịp dứt khoát</b> khi cần giảm thêm tốc độ, không rà phanh liên tục.</li>
  <li>Không để vòng tua vượt vạch đỏ trên đồng hồ – nếu quá cao, phanh chân giảm tốc rồi mới về số thấp hơn.</li>
</ol>

<h2 id="so-tu-dong">Với xe số tự động</h2>
<ul>
  <li>Chuyển sang chế độ số thấp: <b>L, 2, B</b>, hoặc chế độ tay <b>M/S</b> rồi bấm "−" để giữ số thấp.</li>
  <li>Xe hybrid thường có chế độ <b>B</b> dùng động cơ điện để hãm và sạc ngược.</li>
  <li>Ở chế độ D bình thường, hộp số có thể tự lên số khi xe trôi nhanh, làm giảm tác dụng hãm.</li>
</ul>

<h2 id="dieu-cam">Những điều không được làm</h2>
<ul>
  <li><b>Không về số N</b> (thả trôi) khi xuống dốc – mất hoàn toàn phanh động cơ.</li>
  <li><b>Không tắt máy</b> khi đổ đèo – mất trợ lực phanh và trợ lực lái, xe rất khó điều khiển.</li>
  <li>Không vượt xe ở khúc cua, đoạn khuất tầm nhìn.</li>
</ul>

<h2 id="vao-cua">Vào cua và nhường đường trên đèo</h2>
<ul>
  <li><b>Giảm tốc trước khi vào cua</b>, không phanh gấp giữa cua; đi đúng làn bên phải.</li>
  <li>Ở khúc cua khuất, bấm còi (ban ngày) hoặc nháy đèn (ban đêm) để báo hiệu.</li>
  <li>Trên đường dốc hẹp, xe <b>xuống dốc</b> nhường đường cho xe đang <b>lên dốc</b>.</li>
  <li>Nếu ngửi thấy mùi khét của má phanh, tìm chỗ an toàn dừng nghỉ cho phanh nguội.</li>
</ul>
<p class="text-body-secondary small">Muốn hiểu sâu cơ chế số và ly hợp? Xem mô hình <a href="hop-so.html">cấu tạo hộp số sàn 3D</a>.</p>
`,
  },
  {
    id: 'kiem-tra-truoc-chuyen-di',
    cover: 'img/dung-dich.jpg',
    title: 'Kiểm tra xe trước chuyến đi xa: 5 loại dung dịch và lốp',
    cat: 'Bảo dưỡng', icon: 'bi-clipboard2-check-fill', color: 'primary',
    date: '2026-10-08', minutes: 6, pro: false,
    summary: 'Danh sách kiểm tra 10 phút cho người mới: dầu máy, nước làm mát, dầu phanh, nước rửa kính, áp suất và gai lốp, đèn.',
    html: `
<p class="lead">Kiểm tra trước khi đi xa giúp phát hiện sớm hầu hết các vấn đề hay gặp. Hãy làm khi <b>xe đỗ trên mặt phẳng và động cơ đã nguội</b>.</p>
<figure class="figure article-figure w-100">
  <img src="img/dung-dich.jpg" class="figure-img img-fluid rounded-3 w-100" alt="Các can dung dịch chăm sóc ô tô" loading="lazy">
  <figcaption class="figure-caption">Mỗi vị trí trên xe dùng một loại dung dịch riêng – đọc kỹ nhãn và sách hướng dẫn, không đổ nhầm.</figcaption>
</figure>

<h2 id="dau-may">1. Dầu động cơ</h2>
<ol class="steps">
  <li>Mở capo, rút <b>que thăm dầu</b> (thường có tay cầm màu vàng hoặc cam), lau sạch.</li>
  <li>Cắm lại hết cỡ rồi rút ra: mức dầu phải nằm <b>giữa hai vạch MIN và MAX</b>.</li>
  <li>Thiếu thì châu thêm đúng loại dầu theo sách hướng dẫn qua nắp đổ dầu (biểu tượng bình dầu).</li>
</ol>

<h2 id="nuoc-lam-mat">2. Nước làm mát</h2>
<p>Quan sát <b>bình nước phụ</b> trong suốt: mức nước nằm giữa vạch <b>LOW và FULL</b>.</p>
<div class="alert alert-danger"><i class="bi bi-thermometer-high"></i> <b>Không mở nắp két nước khi động cơ còn nóng</b> – nước sôi có áp suất có thể phun ra gây bỏng.</div>

<h2 id="dau-phanh">3. Dầu phanh</h2>
<p>Bình dầu phanh nhỏ, nắp thường màu vàng, ở phía sau khoang máy bên người lái. Mức dầu phải giữa <b>MIN và MAX</b>. Dầu tụt nhanh có thể do mòn má phanh hoặc rò rỉ – cần kiểm tra ở gara.</p>

<h2 id="nuoc-rua-kinh">4. Nước rửa kính</h2>
<p>Nắp bình có biểu tượng kính chắn gió và tia nước. Đổ đầy nước rửa kính chuyên dụng trước chuyến đi.</p>

<h2 id="tro-luc">5. Dầu trợ lực lái (nếu có)</h2>
<p>Xe dùng trợ lực lái thuỷ lực có bình dầu riêng với vạch MIN/MAX. Nhiều xe đời mới dùng <b>trợ lực điện</b> nên không có bình này.</p>

<h2 id="lop">Lốp xe</h2>
<ul>
  <li><b>Áp suất lốp</b> theo tem dán ở khung cửa người lái (hoặc sách hướng dẫn), đo khi lốp nguội; đi đầy tải có thể cần bơm cao hơn theo tem.</li>
  <li><b>Gai lốp:</b> trong rãnh gai có gờ chỉ thị mòn (TWI). Gai mòn ngang gờ này (khoảng 1,6 mm) là phải thay.</li>
  <li>Kiểm tra cả <b>lốp dự phòng</b>, bộ kích và cờ-lê trong cốp.</li>
</ul>

<h2 id="den">Đèn và còi</h2>
<p>Bật thử đèn cốt, đèn pha, xi nhan, đèn cảnh báo, đèn phanh (nhờ người đứng sau xem) và còi.</p>
<p class="text-body-secondary small">Mở capo và xem từng vị trí ở trang <a href="xe-co-ban.html#hood">Ô tô cơ bản 3D</a>.</p>
`,
  },
  {
    id: 'den-canh-bao',
    cover: 'img/den-canh-bao-taplo.jpg',
    title: 'Đọc hiểu các đèn cảnh báo trên bảng đồng hồ',
    cat: 'Cấu tạo xe', icon: 'bi-exclamation-triangle-fill', color: 'danger',
    date: '2026-10-05', minutes: 7, pro: true,
    summary: 'Đèn đỏ, đèn vàng, đèn xanh khác nhau thế nào? Đèn nào phải dừng xe ngay, đèn nào có thể đi tiếp tới gara.',
    html: `
<p class="lead">Mỗi khi bật chìa khoá, hầu hết đèn cảnh báo sáng lên vài giây để tự kiểm tra rồi tắt. Nếu một đèn <b>vẫn sáng khi máy đã nổ</b>, xe đang báo cho bạn biết có vấn đề. Màu sắc cho biết mức độ khẩn cấp.</p>

<h2 id="mau-sac">Quy ước màu sắc</h2>
<div class="row g-2 mb-3">
  <div class="col-md-4"><div class="p-3 rounded-3 border border-danger h-100"><b class="text-danger">Đỏ – nguy hiểm</b><br><small>Dừng xe ở nơi an toàn càng sớm càng tốt và kiểm tra.</small></div></div>
  <div class="col-md-4"><div class="p-3 rounded-3 border border-warning h-100"><b class="text-warning-emphasis">Vàng/cam – cảnh báo</b><br><small>Có thể đi tiếp cẩn thận, kiểm tra sớm.</small></div></div>
  <div class="col-md-4"><div class="p-3 rounded-3 border border-success h-100"><b class="text-success">Xanh – thông tin</b><br><small>Báo một tính năng đang bật (đèn cốt, xi nhan…).</small></div></div>
</div>
<figure class="figure article-figure w-100">
  <img src="img/den-canh-bao-taplo.jpg" class="figure-img img-fluid rounded-3 w-100" alt="Bảng các biểu tượng đèn cảnh báo trên táp-lô ô tô" loading="lazy">
  <figcaption class="figure-caption">Một số biểu tượng đèn báo thường gặp trên bảng đồng hồ. Hình dạng có thể khác đôi chút tuỳ hãng xe – xem sách hướng dẫn của xe bạn.</figcaption>
</figure>

<h2 id="den-do">Các đèn đỏ quan trọng</h2>
<ul>
  <li><b>Áp suất dầu động cơ</b> (hình bình dầu nhỏ giọt): dừng xe, tắt máy ngay – chạy tiếp có thể phá hỏng động cơ.</li>
  <li><b>Nhiệt độ nước làm mát</b> (nhiệt kế trong nước): động cơ quá nóng – dừng xe, chờ nguội, không mở nắp két nước khi nóng.</li>
  <li><b>Hệ thống phanh</b> (chữ "!" trong vòng tròn hoặc chữ BRAKE): phanh tay chưa nhả hoặc thiếu dầu phanh.</li>
  <li><b>Sạc ắc quy</b> (hình bình điện): máy phát không sạc – tắt bớt thiết bị điện và tới gara.</li>
  <li><b>Túi khí</b> (người ngồi với quả bóng): hệ thống túi khí có lỗi, có thể không bung khi va chạm.</li>
</ul>

<h2 id="den-vang">Các đèn vàng thường gặp</h2>
<ul>
  <li><b>Check engine</b> (hình động cơ): lỗi động cơ/khí thải. Nhấp nháy là lỗi nặng – giảm tốc và kiểm tra sớm.</li>
  <li><b>ABS</b>: chống bó cứng phanh không hoạt động, phanh thường vẫn còn.</li>
  <li><b>Áp suất lốp</b> (dấu "!" trong hình móng ngựa): một lốp bị non hơi.</li>
  <li><b>Cân bằng điện tử</b> (xe với vệt bánh ngoằn ngoèo): nhấp nháy khi đang can thiệp trên đường trơn; sáng liên tục là bị tắt hoặc lỗi.</li>
  <li><b>Nhiên liệu sắp hết</b> (cây xăng).</li>
</ul>

<h2 id="den-xanh">Đèn xanh và xanh dương</h2>
<p>Xi nhan (mũi tên xanh nhấp nháy), đèn cốt (xanh lá), đèn sương mù, kiểm soát hành trình. Riêng <b>đèn pha</b> có biểu tượng màu <b>xanh dương</b> – nhớ chuyển về đèn cốt khi gặp xe ngược chiều.</p>
<p class="text-body-secondary small">Xem bảng đồng hồ hoạt động khi bật chìa khoá ở trang <a href="xe-co-ban.html#cluster">Ô tô cơ bản 3D</a> (góc nhìn buồng lái).</p>
`,
  },
  {
    id: 'cau-binh-ac-quy',
    cover: 'img/cau-binh.jpg',
    title: 'Câu bình (kích nổ) khi ắc quy hết điện đúng cách',
    cat: 'Xử lý sự cố', icon: 'bi-battery-charging', color: 'warning',
    date: '2026-10-01', minutes: 5, pro: true,
    summary: 'Xe đề không nổ vì quên tắt đèn qua đêm? Thứ tự nối dây câu bình an toàn, tránh chập điện và hỏng thiết bị điện tử.',
    html: `
<p class="lead">Ắc quy cạn (thường do quên tắt đèn, bình đã già) có thể được "câu" từ một xe khác qua bộ <b>dây câu bình</b>. Làm sai thứ tự có thể gây tia lửa, chập điện hoặc hỏng hộp điều khiển.</p>
<figure class="figure article-figure w-100">
  <img src="img/cau-binh.jpg" class="figure-img img-fluid rounded-3 w-100" alt="Minh hoạ nối dây câu bình giữa hai xe" loading="lazy">
  <figcaption class="figure-caption">Minh hoạ: dây đỏ nối hai cọc (+), dây đen nối từ cọc (−) của xe cho điện. Đầu còn lại của dây đen nên kẹp vào điểm kim loại trên khối máy xe hết điện, không kẹp vào cọc âm của bình hết điện (xem thứ tự bên dưới).</figcaption>
</figure>

<h2 id="chuan-bi">Chuẩn bị</h2>
<ul>
  <li>Một xe có ắc quy cùng điện áp <b>12 V</b> và bộ dây câu bình (dây đỏ và dây đen, kẹp chắc chắn).</li>
  <li>Đỗ hai xe gần nhau nhưng <b>không chạm nhau</b>, tắt máy cả hai, tắt hết đèn và thiết bị điện.</li>
  <li>Kiểm tra ắc quy hỏng: nếu bình bị phồng, nứt, rò dung dịch – <b>không câu bình</b>, gọi cứu hộ.</li>
</ul>

<h2 id="thu-tu-noi">Thứ tự nối dây</h2>
<ol class="steps">
  <li>Kẹp <b>dây đỏ</b> vào cọc <b>(+)</b> của ắc quy <b>hết điện</b>.</li>
  <li>Kẹp đầu kia của dây đỏ vào cọc <b>(+)</b> của ắc quy <b>xe cho điện</b>.</li>
  <li>Kẹp <b>dây đen</b> vào cọc <b>(−)</b> của ắc quy <b>xe cho điện</b>.</li>
  <li>Kẹp đầu cuối của dây đen vào <b>một điểm kim loại không sơn trên khối động cơ hoặc thân xe</b> của xe hết điện, cách xa ắc quy – không kẹp vào cọc âm của bình hỏng, để tránh tia lửa gần khí thoát ra từ bình.</li>
</ol>

<h2 id="khoi-dong">Khởi động</h2>
<ol class="steps">
  <li>Nổ máy xe cho điện, để chạy vài phút.</li>
  <li>Khởi động xe hết điện. Nếu chưa nổ, chờ thêm vài phút rồi thử lại; không đề liên tục quá lâu.</li>
</ol>

<h2 id="thao-day">Tháo dây – ngược lại thứ tự lắp</h2>
<ol class="steps">
  <li>Tháo dây đen khỏi điểm mát trên xe vừa nổ.</li>
  <li>Tháo dây đen khỏi cọc (−) xe cho điện.</li>
  <li>Tháo dây đỏ khỏi xe cho điện, rồi khỏi xe vừa nổ.</li>
</ol>
<div class="alert alert-info"><i class="bi bi-info-circle-fill"></i> Sau khi nổ, để máy chạy hoặc đi xe ít nhất khoảng 20–30 phút cho máy phát sạc lại. Nếu hôm sau vẫn không đề được, ắc quy cần được kiểm tra hoặc thay.</div>
<p class="text-body-secondary small">Xem thêm: <a href="bai-viet.html?id=he-thong-dien">cấu tạo hệ thống điện trên ô tô</a>.</p>
`,
  },
];
