---
name: fix-bug
description: Quy trình sửa bug cho mọi stack — tái hiện, tìm nguyên nhân gốc (không vá triệu chứng), trình bày cách sửa ngắn gọn và chờ user duyệt, viết test hồi quy fail trước, sửa tối thiểu, verify, ghi lại bug liên quan vào tech-debt. Dùng khi user báo lỗi, dán error/stack trace/log, nói "fix bug", "sửa lỗi", "sao chỗ này sai", "chạy không đúng", "lỗi trên prod/staging". Bước 2 (tìm nguyên nhân gốc) cũng là kỹ thuật debug mà các skill khác dùng khi gặp lỗi khó.
argument-hint: "<mô tả bug / error / stack trace / bước tái hiện>"
---

# dev-kit:fix-bug

Nguyên tắc:
- **Nguyên nhân gốc trước, sửa sau.** Không đoán rồi sửa thử nhiều lần.
- **Duyệt trước khi sửa**: trình bày cách fix dạng text ngắn, chờ user đồng ý (trừ khi user đã nói "sửa luôn").
- **Sửa tối thiểu**: chỉ thay đổi cần cho bug này. Refactor/dọn dẹp phát hiện được → ghi tech-debt, không làm kèm.
- Tuân theo CLAUDE.md / code-standards của repo; code sửa vẫn phải qua ngưỡng độ phức tạp.

## 1. Hiểu & tái hiện
- Gom thông tin: hành vi mong đợi vs thực tế, input, môi trường (local/staging/prod), từ khi nào (`git log` gần đây trên vùng liên quan).
- Đọc `docs/tech-debt.md` (mục bug đã biết) — bug có thể đã được ghi nhận.
- Tái hiện bằng cách rẻ nhất: test đang có, script nhỏ trong scratchpad, gọi API local, hoặc đọc log. Thiếu thông tin để tái hiện → hỏi user đúng 1 lần, liệt kê cụ thể cần gì.
- Không tái hiện được → nói rõ, đưa giả thuyết có xếp hạng + cách kiểm chứng; không sửa mù.

## 2. Tìm nguyên nhân gốc
**Chưa tìm ra nguyên nhân gốc thì chưa đề xuất cách sửa.**

- **Đọc kỹ lỗi**: đọc hết stack trace, warning, mã lỗi, số dòng; thông báo lỗi thường đã chỉ thẳng nguyên nhân.
- **Xem thay đổi gần đây**: `git log` / `git diff` trên vùng liên quan, dependency hoặc config mới, khác biệt môi trường. Là regression và có mốc chạy đúng → `git bisect`.
- **Lần ngược theo call stack**: lỗi hiện ra ở đâu → hàm nào gọi với giá trị sai → giá trị đó từ đâu tới → tiếp tục lên tới **nơi giá trị sai xuất hiện lần đầu**. Sửa ở đó, không sửa ở chỗ lỗi hiện ra.
- **Hệ thống nhiều tầng** (client → API → service → DB, CI → build → deploy): thêm log/instrument tạm tại **ranh giới mỗi tầng** (dữ liệu vào, dữ liệu ra, env/config có truyền xuống không), chạy một lần để biết **tầng nào** hỏng, rồi mới đào sâu tầng đó.
- **So với chỗ chạy đúng**: tìm code tương tự trong repo đang chạy đúng, liệt kê mọi khác biệt, kể cả khác biệt "chắc không ảnh hưởng".
- **Mỗi lần một giả thuyết**: viết ra "nguyên nhân là X vì Y", kiểm bằng thay đổi nhỏ nhất, mỗi lần đổi một biến. Sai → bỏ thay đổi thử đó, lập giả thuyết mới; không chồng thêm sửa đổi lên.
- **Kiểm chứng bằng bằng chứng** (log, test, query, output), không chỉ bằng đọc code. Không hiểu một điểm → nói thẳng "chưa hiểu X", không giả vờ.
- **3 lần thử thất bại → dừng**: mỗi lần sửa lại lộ ra vấn đề mới ở chỗ khác, hoặc cần sửa rất rộng → nhiều khả năng là vấn đề kiến trúc. Báo user những gì đã thử và thấy, bàn hướng trước khi thử lần 4.
- Hỏi: **cùng nguyên nhân này còn gây lỗi ở đâu khác?** (Grep pattern tương tự).
- Phân biệt: lỗi logic · dữ liệu hỏng có sẵn · cấu hình/env · race condition · tích hợp bên thứ 3 · hiểu sai yêu cầu.
- Gỡ log/instrument tạm khi đã tìm ra nguyên nhân.

## 3. Đề xuất (dừng chờ duyệt)
Trình bày ngắn:
```
Nguyên nhân: <1–2 câu, kèm file:line>
Cách sửa:    <thay đổi gì, ở đâu>
Ảnh hưởng:   <chỗ khác dùng code này; dữ liệu cũ có cần migrate/cleanup không>
Test:        <test hồi quy sẽ viết>
Ngoài phạm vi (ghi tech-debt): <nếu có>
```
Nếu có nhiều cách → nêu cách khuyến nghị + 1 phương án thay thế, kèm đánh đổi trong 1 dòng.

## 4. Test hồi quy (fail trước)
- Viết test tái hiện bug ở mức thấp nhất có thể (unit > integration > e2e), theo vị trí/tên file test của repo.
- Chạy → phải **fail** đúng lý do của bug. Không fail → test chưa bắt được bug, xem lại bước 2.
- Bug không test tự động được (UI thuần, hạ tầng) → ghi bước kiểm tra tay vào báo cáo.

## 5. Sửa
- Sửa tại nguyên nhân gốc, không thêm `try/catch` nuốt lỗi hay `if` đặc biệt để che triệu chứng.
- Dữ liệu hỏng đã tồn tại → đề xuất script cleanup/migration riêng (chạy tay, idempotent), không trộn vào code runtime nếu không cần.
- Không log secret/PII khi thêm log debug; gỡ log debug tạm trước khi xong.

## 6. Verify
- Test hồi quy giờ **pass**; chạy toàn bộ verify của repo (`.claude/verify.json` / CLAUDE.md) — phải sạch. Hook verify-gate cũng sẽ chặn nếu chưa sạch.
- Chỗ khác cùng nguyên nhân (bước 2) đã sửa hoặc đã ghi tech-debt.

## 7. Báo cáo
Ngắn gọn cho user:
- Nguyên nhân gốc (file:line) · thay đổi (link file) · test đã thêm · kết quả verify.
- Việc user cần làm thêm (chạy script cleanup, deploy, kiểm tra tay).
- Cập nhật `docs/tech-debt.md`: bug liên quan chưa sửa, nợ kỹ thuật phát hiện được.
- Gợi ý bước tiếp: `dev-kit:code-review`, rồi `dev-kit:commit` (chỉ commit) hoặc `dev-kit:create-pr` (commit + push + PR).
