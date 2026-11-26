---
name: check-spec
description: Đối chiếu yêu cầu của một task (spec PDF/MD/DOCX/TXT, ticket, checklist, AC, hoặc text user dán) với codebase. Chế độ "trước" (trước khi code) trích danh sách yêu cầu có ID, edge case, câu hỏi mở cần chốt; chế độ "sau" (sau khi code) chấm từng yêu cầu ✅/⚠️/❌ kèm bằng chứng file:line và gợi ý sửa. Ghi kết quả vào 1 file spec-check. Không sửa code. Dùng khi user nói "check spec", "đối chiếu yêu cầu/AC/checklist", "còn thiếu gì so với docs", "task này đủ chưa", hoặc trước khi tạo PR cho task có spec.
argument-hint: "[trước|sau] <đường dẫn spec (tuỳ chọn)> <nội dung task / AC (tuỳ chọn)>"
---

# dev-kit:check-spec

Input `$ARGUMENTS`: chế độ (`trước` / `sau`, có thể bỏ), đường dẫn file spec (nếu có), nội dung task (Goal / Checklist / AC, có thể nhiều dòng).

Output: file markdown spec-check + câu trả lời ngắn. **Không sửa code** trong skill này.

## 1. Parse input
- Đường dẫn spec: token có đuôi `.pdf` / `.md` / `.txt` / `.docx` (bỏ `@` phía trước). Tương đối tính từ root repo.
- Còn lại là nội dung task: tách Goal, từng dòng Checklist, từng AC, các ID được nhắc (vd `UC_01`, `BR3`).
- Chế độ:
  - User ghi rõ → theo đó.
  - Không ghi → **sau** nếu branch hiện tại có thay đổi liên quan (`git diff <main>...HEAD` + working tree), ngược lại **trước**.
  - Đã có file spec-check của task này → chạy chế độ **sau** và cập nhật file đó.
- Không có cả spec lẫn nội dung task → hỏi user rồi dừng.

## 2. Đọc yêu cầu
- `.md` / `.txt`: Read. `.pdf`: Read (trang lớn → `pages`); lỗi thì `pdftotext -layout` ra scratchpad rồi Read. `.docx`: skill docx hoặc `pandoc -t plain`.
- Trích các mục task nhắc tới **và** mục phụ thuộc trực tiếp (UC kế tiếp, BR được tham chiếu, error state).
- Text bắt buộc (thông báo lỗi, label UI, mã lỗi, tên field API) → chép **nguyên văn** để so với code/i18n.
- Mỗi yêu cầu cấp một ID ngắn nếu spec chưa có (`R1`, `R2`...). Yêu cầu gộp nhiều ý → tách nhỏ để chấm được.

## 3. Xác định phạm vi code
- Đọc CLAUDE.md / code-standards của repo. Module/app chứa thư mục docs → phạm vi mặc định.
- `git status`, `git log -5`, `git diff <main>...HEAD --stat` để biết phần đang làm.
- Tìm theo từ khoá của yêu cầu (route, tên field, mã lỗi, text UI) bằng Grep; đọc entry point liên quan (route/controller → service → model; hoặc page → hook → component).

## 4a. Chế độ TRƯỚC — chốt yêu cầu
Với mỗi yêu cầu: hiểu đúng chưa, phần nào **đã có sẵn** trong code (tái dùng được), phần nào phải làm mới.
Rồi liệt kê:
- **Edge case** spec chưa nói: input rỗng/sai, trùng lặp, quyền, phân trang, timeout bên thứ 3, concurrency, dữ liệu cũ (migration).
- **Câu hỏi mở**: chỗ spec mâu thuẫn, mơ hồ, thiếu text/số liệu. Không tự bịa câu trả lời.
- **Phạm vi đề xuất**: in-scope / out-of-scope để tránh làm thừa.

Dừng ở đây, trả cho user danh sách câu hỏi mở để chốt trước khi code. Không tự chuyển sang thiết kế hay code.

Khi user đã chốt câu hỏi mở, gợi ý bước tiếp (file spec-check là nguồn đúng cho **yêu cầu**; không hỏi lại phần đã chốt):
- Một cách làm hợp lý, task nhỏ → làm luôn với TDD.
- Một cách làm hợp lý, task lớn → `superpowers:writing-plans` với đầu vào là file spec-check.
- Còn phải chọn cách làm → `superpowers:brainstorming`, chỉ bàn phương án/thiết kế, lấy file spec-check làm nguồn yêu cầu.

## 4b. Chế độ SAU — chấm từng yêu cầu
Với **từng** yêu cầu / checklist / AC:
- Trạng thái: ✅ đạt · ⚠️ một phần · ❌ thiếu · ❓ không kiểm chứng được từ code (cần test tay / hỏi PM).
- Bằng chứng: `file:line` cụ thể. Không có bằng chứng → không được chấm ✅.
- Text so nguyên văn với spec; sai chữ = ⚠️.
- Có test cho yêu cầu không (logic nghiệp vụ / BR quan trọng mà không có test → ghi chú).
- Gợi ý sửa: file cần sửa/tạo, hàm/component có sẵn nên dùng lại.

Thêm:
- **Verify**: chạy lệnh verify của repo (`.claude/verify.json` hoặc CLAUDE.md) ở chế độ read-only (không `--fix`); lỗi trong phạm vi task → mục Blocker, lỗi có sẵn ngoài phạm vi → ghi "pre-existing".
- **Làm thừa**: thay đổi trong diff không thuộc yêu cầu nào → liệt kê (có thể là scope creep).

## 5. Ghi file
- Có file spec → `<thư mục chứa spec>/<slug>-spec-check.md`. Không có → `docs/spec-checks/<slug>-spec-check.md`.
- `slug`: kebab-case ngắn từ Goal. File đã có và không phải của task này → hỏi trước khi ghi đè.
- Tiếng Việt có dấu, giữ ID và thuật ngữ kỹ thuật.

```markdown
# Spec check: <tên task>

- Nguồn: `<spec path>` / ticket / text user · Branch: `<branch>` · Ngày: <YYYY-MM-DD> · Chế độ: trước|sau

## Tổng quan
| ID | Yêu cầu (tóm tắt) | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|---|

## Blocker verify            <!-- chế độ sau -->
## Chi tiết từng yêu cầu      <!-- mỗi mục: trạng thái, bằng chứng, gợi ý sửa -->
## Edge case cần xử lý
## Câu hỏi mở (PM / design / BE)
## Làm thừa so với spec        <!-- chế độ sau -->
## Thứ tự đề xuất
```

## 6. Trả lời user
Ngắn: link file, đếm ✅/⚠️/❌/❓ (hoặc số yêu cầu + số câu hỏi mở ở chế độ trước), 3–5 việc quan trọng nhất cần làm tiếp. Chế độ trước: thêm 1 dòng gợi ý skill cho bước tiếp theo (theo mục 4a).
