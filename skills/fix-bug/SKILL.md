---
name: fix-bug
description: Quy trình sửa bug cho mọi stack — tái hiện, tìm nguyên nhân gốc (không vá triệu chứng), trình bày cách sửa ngắn gọn và chờ user duyệt, viết test hồi quy fail trước, sửa tối thiểu, verify, ghi lại bug liên quan vào tech-debt. Dùng khi user báo lỗi, dán error/stack trace/log, nói "fix bug", "sửa lỗi", "sao chỗ này sai", "chạy không đúng", "lỗi trên prod/staging". Đây là entry point cho việc sửa bug; kỹ thuật debug có hệ thống (vd superpowers:systematic-debugging) dùng bên trong bước 2 nếu có.
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
- Lần từ triệu chứng ngược về nguồn: stack trace → hàm → dữ liệu đầu vào → nơi dữ liệu được tạo.
- Kiểm chứng giả thuyết bằng bằng chứng (log, test, query, `git bisect` nếu là regression), không chỉ bằng đọc code.
- Hỏi: **cùng nguyên nhân này còn gây lỗi ở đâu khác?** (Grep pattern tương tự).
- Phân biệt: lỗi logic · dữ liệu hỏng có sẵn · cấu hình/env · race condition · tích hợp bên thứ 3 · hiểu sai yêu cầu.

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
- Gợi ý bước tiếp: `/code-review` rồi `/commit-commands:commit` (hoặc `commit-push-pr`).
