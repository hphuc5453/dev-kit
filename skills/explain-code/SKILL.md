---
name: explain-code
description: Giải thích VÌ SAO một đoạn code được viết như vậy (thường là code AI viết mà user chưa hiểu) — đọc code, nơi gọi, git blame/log, plan, design doc, spec-check, tech-debt, chuẩn code của repo để tìm lý do có bằng chứng; tách rõ lý do có bằng chứng / suy luận / không có lý do; đánh giá cách hiện tại và đề xuất hướng tốt hơn (nếu có) kèm đánh đổi, rồi chờ user chọn. Không sửa code khi chưa được duyệt. Dùng khi user hỏi "sao lại viết vậy", "đoạn này để làm gì", "giải thích code này", "sao AI làm thế này", "có cách nào tốt hơn không", "code này có ổn không", hoặc bôi đen code rồi hỏi lý do.
argument-hint: "<file:line | tên hàm/class | commit | đoạn code dán vào> <câu hỏi cụ thể (tuỳ chọn)>"
---

# dev-kit:explain-code

Skill song song với `dev-kit:fix-bug`: fix-bug cho code **chạy sai**, skill này cho code **chạy được nhưng user chưa hiểu vì sao viết vậy** hoặc nghi có cách tốt hơn.

Nguyên tắc:
- **Bằng chứng trước, giải thích sau.** Không bịa lý do cho hợp lý. Code do AI viết rất hay có phần không có lý do nào cả; khi đó nói thẳng "không tìm thấy lý do", đừng biện hộ.
- **Không bênh code chỉ vì nó đã có.** Đánh giá như người review độc lập, kể cả khi chính Claude viết đoạn đó trong phiên này.
- **Không sửa code** cho tới khi user chọn một phương án.
- Đối chiếu với CLAUDE.md / `docs/code-standards.md` / ngưỡng độ phức tạp của repo.

## 1. Xác định đoạn code và câu hỏi
- Nguồn: `file:line` / khoảng dòng, tên hàm/class (Grep để tìm), commit/PR (`git show`), vùng user đang bôi đen trong IDE, đoạn code dán vào (Grep để tìm vị trí trong repo), hoặc "đoạn vừa sửa" (`git diff`).
- Câu hỏi thật của user là gì: *đoạn này làm gì* · *sao lại chọn cách này* · *dòng/điều kiện này có cần không* · *có cách tốt hơn không*. Không rõ → hỏi đúng 1 câu rồi mới đào.
- Phạm vi quá rộng (cả module, cả PR) → đề xuất tập trung vào 1–3 điểm khó hiểu nhất, hỏi user chọn.

## 2. Hiểu code làm gì
- Đọc đoạn code và đủ ngữ cảnh xung quanh: hàm chứa nó, kiểu dữ liệu vào/ra.
- **Nơi gọi** (Grep tên hàm/export): ai gọi, truyền gì vào, dùng kết quả thế nào.
- **Nơi bị gọi**: helper, service, thư viện bên dưới; hành vi thật của API/thư viện (đọc source/type trong `node_modules`, docs trong repo) thay vì nhớ.
- Test liên quan: test mô tả hành vi nào là cố ý.
- Tóm được luồng trong vài dòng (input → xử lý → output, tác dụng phụ). Luồng nhiều tầng → vẽ sơ đồ text ngắn.

## 3. Tìm lý do (có bằng chứng)
Tìm ở các nguồn sau, ghi lại nguồn nào nói gì:
- **Git**: `git blame -L <dòng> <file>` → `git show <commit>` (message, các file đổi cùng lúc); `git log -L` hoặc `git log -S '<chuỗi>'` để xem dòng đó được thêm/đổi khi nào, vì sao. Commit nhắc PR/ticket → `gh pr view <số>` nếu có `gh`.
- **Tài liệu của task**: `docs/plans/*.md` (mục "Quyết định khi triển khai"), `docs/specs/*-design.md`, file spec-check (yêu cầu `R…` nào đòi hỏi hành vi này), `docs/tech-debt.md`.
- **Ràng buộc của repo**: CLAUDE.md, code-standards, rule lint, ngưỡng độ phức tạp (vd hàm bị tách nhỏ chỉ để qua ngưỡng 50 dòng), pattern đang dùng ở module tương tự.
- **Comment và test** quanh đoạn code.
- **Ràng buộc kỹ thuật thật**: kiểu dữ liệu, giới hạn thư viện, yêu cầu bảo mật, hiệu năng, tương thích ngược, race condition.
- Code do Claude viết ở phiên trước và các nguồn trên không đủ: có thể Grep tên file/hàm trong transcript phiên cũ của project (`~/.claude/projects/<thư mục project>/*.jsonl`) để tìm lý do đã nêu lúc đó. Chỉ đọc đoạn liên quan.

**Kiểm chứng từng lý do**, không tin lý do "nghe hợp lý":
- "Để tránh null/undefined" → giá trị đó có thật sự null được không (kiểu, nơi gọi, dữ liệu DB)?
- "Để tối ưu" → đường code này có nóng không, có số đo không?
- "Để dễ mở rộng" → có nơi thứ hai dùng abstraction này không?
- "Theo pattern của repo" → chỉ ra chỗ khác dùng cùng pattern (`file:line`).

Xếp mỗi lý do vào một trong ba loại:
- **Có bằng chứng**: có nguồn cụ thể (commit, plan, spec, test, ràng buộc kiểm chứng được).
- **Suy luận**: hợp lý nhưng không có nguồn; nói rõ là suy luận.
- **Không có lý do**: không nguồn nào ủng hộ, kiểm chứng cho thấy không cần → nhiều khả năng là thừa (phòng thủ thừa, abstraction thừa, copy pattern không hợp, quên dọn sau khi đổi hướng).

## 4. Đánh giá cách hiện tại
Soi các dấu hiệu thường gặp ở code AI viết:
- Phòng thủ thừa: `try/catch` nuốt lỗi, check null cho giá trị không thể null, fallback che lỗi thật.
- Abstraction / config / tham số chỉ có một nơi dùng; lớp bọc không thêm gì.
- Tự viết lại thứ repo hoặc thư viện đã có (Grep helper tương tự trước khi kết luận).
- Lệch pattern, đặt tên, cấu trúc thư mục so với phần còn lại của repo.
- Logic trùng lặp, nhánh không bao giờ chạy tới, code chết.
- Vi phạm ngưỡng độ phức tạp, hoặc tách hàm máy móc chỉ để qua ngưỡng làm luồng khó đọc hơn.
- Rủi ro thật: bug tiềm ẩn, bảo mật, N+1, race condition, rò rỉ tài nguyên.

Thấy **bug thật** (hành vi sai, không chỉ là khó đọc) → nêu rõ trong báo cáo và đề xuất chuyển sang `dev-kit:fix-bug`; không sửa trong skill này.

## 5. Đề xuất hướng tốt hơn
- Cách hiện tại đã ổn → nói thẳng "giữ nguyên" và vì sao; không bịa phương án cho có.
- Có hướng tốt hơn → tối đa 2 phương án, mỗi phương án phải **cụ thể với repo này**: dùng helper/pattern nào có sẵn (`file:line`), ví dụ code ngắn nếu giúp dễ hiểu.
- Mỗi phương án nêu đánh đổi: dễ đọc, rủi ro thay đổi hành vi, phạm vi ảnh hưởng (bao nhiêu nơi gọi), có cần sửa test không.
- Luôn có khuyến nghị: chọn phương án nào, hoặc giữ nguyên.

## 6. Trả lời (dừng chờ user)
Trình bày ngắn, theo khuôn:
```
Đoạn code: <file:line> — <1 câu: nó làm gì>
Luồng:     <input → xử lý → output, tác dụng phụ> (sơ đồ text nếu nhiều tầng)

Vì sao viết vậy:
- [Có bằng chứng] <lý do> — nguồn: <commit abc123 / plan mục X / spec R3 / test file:line>
- [Suy luận]      <lý do> — chưa có nguồn xác nhận
- [Không có lý do] <phần nào> — <đã kiểm chứng gì cho thấy không cần>

Đánh giá:  <ổn / có vấn đề gì, kèm file:line>
Đề xuất:
  A. <phương án> — đánh đổi: <1 dòng>   ← khuyến nghị
  B. <phương án> — đánh đổi: <1 dòng>
  (hoặc: Giữ nguyên, vì …)
Bug phát hiện (nếu có): <mô tả> → nên chạy dev-kit:fix-bug
```
Dùng thuật ngữ đơn giản; giải thích khái niệm lạ (pattern, API thư viện) trong 1 câu khi lần đầu nhắc tới. Không đổ cả file code vào câu trả lời, chỉ trích dòng cần thiết.

Dừng ở đây. Không tự sửa code.

## 7. Sau khi user chọn
- **Giữ nguyên**: nếu phần khó hiểu thiếu comment giải thích lý do (ràng buộc không hiển nhiên) → hỏi user có muốn thêm 1 comment ngắn nêu *vì sao* (không phải *làm gì*) không.
- **Áp dụng phương án** (thay đổi nhỏ, giữ nguyên hành vi):
  - Có test bao hành vi hiện tại chưa? Chưa có và đoạn code có logic → viết test chốt hành vi trước, chạy phải pass.
  - Sửa tối thiểu theo phương án đã chọn; không dọn kèm chỗ khác.
  - Chạy verify của repo (`.claude/verify.json` / CLAUDE.md) — phải sạch. Hook verify-gate cũng sẽ chặn nếu chưa sạch.
  - Báo: đã đổi gì (link file), test, kết quả verify.
- **Thay đổi lớn** (nhiều file, đổi kiến trúc, đổi hành vi) → không làm trong skill này; gợi ý `dev-kit:brainstorm` để chốt cách làm, hoặc ghi vào `docs/tech-debt.md` nếu chưa làm ngay.
- **Là bug** → chuyển `dev-kit:fix-bug` với nguyên nhân đã tìm được ở bước 3–4.
- Vấn đề cùng loại còn ở chỗ khác (Grep pattern tương tự) mà user chưa muốn sửa → đề xuất ghi `docs/tech-debt.md`.
- Gợi ý bước tiếp khi có sửa code: `dev-kit:code-review`, rồi `dev-kit:commit` hoặc `dev-kit:create-pr`.
