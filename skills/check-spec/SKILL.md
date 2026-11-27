---
name: check-spec
description: Chốt yêu cầu của một task TRƯỚC khi code — đọc spec (PDF/MD/DOCX/TXT), ticket, checklist, AC hoặc text user dán, đối chiếu với codebase, trích danh sách yêu cầu có ID, phần đã có sẵn, edge case và câu hỏi mở cần chốt. Ghi kết quả vào 1 file spec-check. Không sửa code. Dùng khi user nói "check spec", "đọc spec này", "chốt yêu cầu", "task này cần làm gì", "spec có thiếu gì không", hoặc trước khi bắt đầu một task có spec. Sau khi code xong, dùng dev-kit:recheck-spec để chấm.
argument-hint: "<đường dẫn spec (tuỳ chọn)> <nội dung task / AC (tuỳ chọn)>"
---

# dev-kit:check-spec

Input `$ARGUMENTS`: đường dẫn file spec (nếu có), nội dung task (Goal / Checklist / AC, có thể nhiều dòng).

Output: file markdown spec-check + câu trả lời ngắn. **Không sửa code, không thiết kế** trong skill này. File spec-check là nguồn đúng cho **yêu cầu** ở mọi bước sau.

## 1. Parse input
- Đường dẫn spec: token có đuôi `.pdf` / `.md` / `.txt` / `.docx` (bỏ `@` phía trước). Tương đối tính từ root repo.
- Còn lại là nội dung task: tách Goal, từng dòng Checklist, từng AC, các ID được nhắc (vd `UC_01`, `BR3`).
- Không có cả spec lẫn nội dung task → hỏi user rồi dừng.
- Đã có file spec-check của task này (đường dẫn ở mục 5):
  - Code của task đã có trên branch (`git diff <main>...HEAD` + working tree) → hỏi user: muốn chấm kết quả (`dev-kit:recheck-spec`) hay cập nhật lại yêu cầu.
  - Chưa có code → cập nhật file đó (spec đổi, câu hỏi mở đã được trả lời).

## 2. Đọc yêu cầu
- `.md` / `.txt`: Read. `.pdf`: Read (trang lớn → `pages`); lỗi thì `pdftotext -layout` ra scratchpad rồi Read. `.docx`: skill docx hoặc `pandoc -t plain`.
- Trích các mục task nhắc tới **và** mục phụ thuộc trực tiếp (UC kế tiếp, BR được tham chiếu, error state).
- Text bắt buộc (thông báo lỗi, label UI, mã lỗi, tên field API) → chép **nguyên văn** để so với code/i18n.
- Mỗi yêu cầu cấp một ID ngắn nếu spec chưa có (`R1`, `R2`...). Yêu cầu gộp nhiều ý → tách nhỏ để chấm được.

## 3. Xác định phạm vi code
- Đọc CLAUDE.md / code-standards của repo. Module/app chứa thư mục docs → phạm vi mặc định.
- `git status`, `git log -5`, `git diff <main>...HEAD --stat` để biết phần đang làm.
- Tìm theo từ khoá của yêu cầu (route, tên field, mã lỗi, text UI) bằng Grep; đọc entry point liên quan (route/controller → service → model; hoặc page → hook → component).

## 4. Chốt yêu cầu
Với mỗi yêu cầu: hiểu đúng chưa, phần nào **đã có sẵn** trong code (tái dùng được, kèm `file:line`), phần nào phải làm mới hoặc sửa.
Rồi liệt kê:
- **Edge case** spec chưa nói: input rỗng/sai, trùng lặp, quyền, phân trang, timeout bên thứ 3, concurrency, dữ liệu cũ (migration).
- **Câu hỏi mở**: chỗ spec mâu thuẫn, mơ hồ, thiếu text/số liệu. Không tự bịa câu trả lời.
- **Phạm vi đề xuất**: in-scope / out-of-scope để tránh làm thừa.

Dừng ở đây, trả cho user danh sách câu hỏi mở để chốt trước khi code. Không tự chuyển sang thiết kế hay code.

User trả lời câu hỏi mở → ghi câu trả lời vào file (mục "Câu hỏi mở", đánh dấu đã chốt), rồi gợi ý bước tiếp. Các bước sau không hỏi lại phần đã chốt:
- Một cách làm hợp lý, task nhỏ → làm luôn (test trước), xong chạy `dev-kit:recheck-spec`.
- Một cách làm hợp lý, task lớn → `dev-kit:write-plan <file spec-check>`.
- Còn phải chọn cách làm (BE hay FE, có bảng mới không...) → `dev-kit:brainstorm <file spec-check>`, chỉ bàn phương án.

## 5. Ghi file
- Có file spec → `<thư mục chứa spec>/<slug>-spec-check.md`. Không có → `docs/spec-checks/<slug>-spec-check.md`.
- `slug`: kebab-case ngắn từ Goal. File đã có và không phải của task này → hỏi trước khi ghi đè.
- Tiếng Việt có dấu, giữ ID và thuật ngữ kỹ thuật.
- `dev-kit:recheck-spec` sẽ thêm mục `## Kết quả recheck <ngày>` vào cuối file này; không tạo mục đó ở đây.

```markdown
# Spec check: <tên task>

- Nguồn: `<spec path>` / ticket / text user · Branch: `<branch>` · Ngày: <YYYY-MM-DD>

## Tổng quan
| ID | Yêu cầu (tóm tắt) | Hiện trạng | Ghi chú |
|---|---|---|---|
<!-- Hiện trạng: có sẵn · sửa · làm mới -->

## Chi tiết từng yêu cầu      <!-- mỗi mục: nội dung, text nguyên văn, code liên quan (file:line) -->
## Edge case cần xử lý
## Câu hỏi mở (PM / design / BE)   <!-- đánh dấu ✔ đã chốt: <câu trả lời> -->
## Phạm vi
## Thứ tự đề xuất
```

## 6. Trả lời user
Ngắn: link file, số yêu cầu (có sẵn / sửa / làm mới), danh sách câu hỏi mở cần chốt, 3–5 điểm quan trọng nhất. Đã chốt hết câu hỏi → 1 dòng gợi ý skill cho bước tiếp (theo mục 4).
