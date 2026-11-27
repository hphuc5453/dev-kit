---
name: setup
description: Thiết lập một repo (mới hoặc đang có) để dùng dev-kit — nhận diện stack và lệnh verify, tạo/bổ sung CLAUDE.md, docs/code-standards.md, docs/tech-debt.md, bật rule lint giới hạn độ phức tạp (hàm ≤ 50 dòng, cyclomatic ≤ 10, lồng ≤ 3, tham số ≤ 4, file ≤ 300) và tạo .claude/verify.json cho hook verify-gate. Dùng khi user nói "setup project", "áp dev-kit cho repo này", "tạo chuẩn code / CLAUDE.md", "bật giới hạn độ phức tạp", hoặc repo chưa có .claude/verify.json.
argument-hint: "[đường dẫn repo, mặc định thư mục hiện tại]"
---

# dev-kit:setup

Mục tiêu: sau skill này, repo có **rule rõ ràng** (CLAUDE.md + code-standards), **ngưỡng độ phức tạp được lint đo**, và **verify-gate ép phải sạch** trước khi Claude báo xong.

Nguyên tắc:
- **Không ghi đè** file của user. File đã có → đề xuất phần bổ sung (diff ngắn), chờ đồng ý.
- **Quy ước đang có trong repo thắng** mặc định của dev-kit, trừ ngưỡng độ phức tạp (chỉ được siết chặt hơn).
- Thêm dependency (vd `eslint-plugin-sonarjs`) → hỏi trước.
- Không commit. Xong thì báo user tự review rồi commit (hoặc dùng `/dev-kit:commit`).

## Quy trình

### 1. Khảo sát (read-only)
- Chạy `node "<thư mục của skill này>/scripts/detect-stack.cjs" <repo>` (thư mục skill là "Base directory" hiển thị khi skill được nạp) và đọc JSON. **Không tự dò lại** những gì JSON đã có.
- JSON cho biết: `stacks` (kể cả workspace của monorepo), `packageManager`, `monorepo`, lệnh trong CI (`ci`), `verifyCandidates` (mỗi lệnh kèm `source`: `ci:<file>` / `package.json#scripts.<name>` / `pyproject.toml#tool.<name>` / `default`), `lintConfigs`, `existing` (file rule nào đã có), `warnings`.
- Tự đọc **nội dung** các file JSON báo là có: `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `docs/*standard*`, `.editorconfig`, config lint/format; ghi lại rule độ phức tạp đã có.
- Chốt lệnh verify: mỗi nhóm lấy mục đầu trong `verifyCandidates` (CI là verify chuẩn của repo). Lệnh từ CI và từ script khác nhau, nguồn chỉ là `default`, hoặc có `warnings` → nêu rõ trong bảng đề xuất ở bước 2.
- Script lỗi hoặc máy không có Node → dò tay theo `references/stack-detection.md`.

### 2. Đề xuất (dừng chờ duyệt)
Trình bày ngắn gọn dạng bảng:

| Hạng mục | Hiện trạng | Đề xuất |
|---|---|---|
| Lệnh verify | ... | `typecheck` · `lint (fail on warning)` · `test` |
| CLAUDE.md | có / chưa | thêm các dòng ... |
| code-standards | có / chưa | tạo từ khung / bổ sung §5 độ phức tạp |
| Rule lint độ phức tạp | ... | preset trong `references/lint-presets.md` cho stack này |
| verify.json | chưa | nội dung ... |
| Dependency mới | — | (nếu có) |

Thiếu lệnh typecheck/lint/test → nêu ra và đề xuất cách thêm; không tự cài.

### 3. Áp dụng (sau khi user đồng ý)
1. **Lint**: thêm preset ngưỡng từ `references/lint-presets.md` vào config lint. Đảm bảo lệnh lint dùng trong verify **fail khi có warning** (vd thêm script `lint:check` = `eslint . --max-warnings 0`).
2. **Đo baseline**: chạy lệnh lint, đếm vi phạm độ phức tạp có sẵn theo rule/file.
   - 0 vi phạm → xong.
   - Có vi phạm → hỏi user chọn:
     - (a) **Sửa dần**: liệt kê vào `docs/tech-debt.md`, tạm loại trừ đúng các file đó trong config lint (danh sách cụ thể, không dùng glob rộng), mỗi lần sửa file nào thì gỡ khỏi danh sách.
     - (b) **Sửa ngay**: chuyển sang skill refactor (nếu có) hoặc làm từng file với test giữ hành vi.
3. **code-standards**: chưa có → tạo `docs/code-standards.md` từ `references/standards-template.md`, điền theo những gì khảo sát được (cấu trúc thư mục thật, quy ước đặt tên số đông). Có rồi → chỉ bổ sung §5 độ phức tạp nếu thiếu. Quy tắc clean code mặc định: `references/clean-code-rules.md` (dẫn link hoặc chép các mục repo chưa có).
4. **CLAUDE.md**: theo `references/claude-md-template.md` — gọn, trỏ tới docs.
5. **tech-debt.md**: tạo nếu chưa có, ghi baseline ở bước 2.
6. **`.claude/verify.json`**: theo khung trong `references/claude-md-template.md`.
7. Kiểm tra `.gitignore` không chặn `.claude/verify.json` (chỉ nên ignore `.claude/settings.local.json`).

### 4. Verify & báo cáo
- Chạy lần lượt từng lệnh trong verify.json; tất cả phải pass (trừ phần đã loại trừ ở baseline).
- Báo user: file đã tạo/sửa (link), số vi phạm baseline, lệnh verify, và nhắc:
  - Plugin đi kèm khuyến nghị (nếu chưa cài): `security-guidance` từ `claude-plugins-official` (cảnh báo bảo mật chạy ngầm).
  - Flow làm task: `/dev-kit:check-spec` → `/dev-kit:brainstorm` → `/dev-kit:write-plan` → `/dev-kit:execute-plan` → `/dev-kit:recheck-spec` → `/dev-kit:code-review` → `/dev-kit:create-pr`; bug: `/dev-kit:fix-bug`.
  - Tắt tạm verify-gate khi cần: đặt env `DEV_KIT_VERIFY=off`.
