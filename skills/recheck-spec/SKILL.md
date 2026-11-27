---
name: recheck-spec
description: Chấm kết quả SAU khi code — đối chiếu từng yêu cầu trong file spec-check (hoặc spec gốc, ticket, AC) với code trên branch, chấm ✅/⚠️/❌/❓ kèm bằng chứng file:line, so text nguyên văn, chạy verify read-only, chỉ ra phần làm thừa, ghi kết quả vào cuối file spec-check. Không sửa code. Dùng khi user nói "recheck spec", "chấm spec", "đủ yêu cầu chưa", "còn thiếu gì so với spec/AC", "task này xong chưa", hoặc trước khi review/tạo PR cho task có spec.
argument-hint: "<file spec-check hoặc spec (tuỳ chọn)> <nội dung task / AC (tuỳ chọn)>"
---

# dev-kit:recheck-spec

Input `$ARGUMENTS`: file spec-check (ưu tiên), hoặc file spec / nội dung task.

Output: mục `## Kết quả recheck <YYYY-MM-DD>` thêm vào cuối file spec-check + câu trả lời ngắn. **Không sửa code** trong skill này.

## 1. Tìm nguồn yêu cầu
- Có đường dẫn `*-spec-check.md` → dùng file đó.
- Có file spec → tìm spec-check cùng thư mục (`<slug>-spec-check.md`), rồi tới `docs/spec-checks/`. Gặp nhiều file → hỏi user chọn.
- Chỉ có nội dung task, không đường dẫn → tìm trong `docs/spec-checks/` theo Goal; không thấy thì dùng nội dung đó.
- **Chưa có spec-check** → trích yêu cầu như `dev-kit:check-spec` mục 2 (cấp ID `R1`, `R2`..., chép text nguyên văn), tạo file spec-check theo đường dẫn của check-spec, ghi chú đầu file "Chưa qua check-spec: yêu cầu trích trực tiếp lúc recheck", rồi chấm.
- Không có gì để đối chiếu → hỏi user rồi dừng.
- Câu hỏi mở trong spec-check chưa chốt → vẫn chấm, yêu cầu phụ thuộc câu đó chấm ❓ và nhắc lại câu hỏi.

## 2. Xác định phần code cần chấm
- Đọc CLAUDE.md / code-standards của repo.
- `git diff <main>...HEAD --stat` + working tree: danh sách file đã đổi.
- Đọc plan của task nếu có (`docs/plans/`, theo link trong spec-check hoặc tên slug) để biết task nào làm yêu cầu nào.
- Mỗi yêu cầu: Grep theo từ khoá (route, field, mã lỗi, text UI), đọc code liên quan cả trong lẫn ngoài diff (yêu cầu có thể đã có sẵn từ trước).

## 3. Chấm từng yêu cầu
Với **từng** yêu cầu / checklist / AC:
- Trạng thái: ✅ đạt · ⚠️ một phần · ❌ thiếu · ❓ không kiểm chứng được từ code (cần test tay / hỏi PM).
- Bằng chứng: `file:line` cụ thể. Không có bằng chứng → không được chấm ✅.
- Text so nguyên văn với spec; sai chữ, sai dấu, sai hoa thường = ⚠️.
- Có test cho yêu cầu không (logic nghiệp vụ / BR quan trọng mà không có test → ghi chú; plan ở chế độ skip-test → ghi bước kiểm tra tay tương ứng).
- Edge case đã liệt kê trong spec-check: đã xử lý chưa, ở đâu.
- Gợi ý sửa cho ⚠️/❌: file cần sửa/tạo, hàm/component có sẵn nên dùng lại.

Thêm:
- **Verify**: chạy lệnh verify của repo (`.claude/verify.json` hoặc CLAUDE.md) ở chế độ read-only (không `--fix`, không ghi file). Lỗi trong phạm vi task → mục Blocker; lỗi có sẵn ngoài phạm vi → ghi "có sẵn từ trước". Chỉ ghi kết quả sau khi đã chạy lệnh và đọc output.
- **Làm thừa**: thay đổi trong diff không thuộc yêu cầu nào → liệt kê (có thể là scope creep, hoặc yêu cầu bị thiếu trong spec-check).

## 4. Ghi file
Thêm vào **cuối** file spec-check. Lần recheck sau thêm mục mới, không xoá mục cũ (để thấy tiến độ).

```markdown
## Kết quả recheck <YYYY-MM-DD>

- Branch: `<branch>` · Commit: `<short sha>` · ✅ <n> · ⚠️ <n> · ❌ <n> · ❓ <n>

| ID | Yêu cầu (tóm tắt) | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|---|

### Blocker verify
### Chi tiết ⚠️ / ❌ / ❓     <!-- mỗi mục: lý do, bằng chứng, gợi ý sửa -->
### Edge case
### Làm thừa so với spec
### Kiểm tra tay cần làm      <!-- các mục ❓ và bước kiểm tra tay từ plan -->
```

Tiếng Việt có dấu, giữ ID và thuật ngữ kỹ thuật.

## 5. Trả lời user
Ngắn: link file, đếm ✅/⚠️/❌/❓, blocker verify (nếu có), 3–5 việc quan trọng nhất cần làm tiếp.

Bước tiếp:
- Còn ❌ / ⚠️ / blocker → sửa (bug thì `dev-kit:fix-bug`), rồi chạy lại `dev-kit:recheck-spec`.
- Chỉ còn ❓ → user kiểm tra tay hoặc hỏi PM, rồi `dev-kit:code-review`.
- Sạch → `dev-kit:code-review`, rồi `dev-kit:create-pr` (mô tả PR sẽ lấy mục recheck mới nhất).
