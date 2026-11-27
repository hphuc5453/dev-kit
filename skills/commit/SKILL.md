---
name: commit
description: Tạo git commit cho thay đổi hiện tại — theo rule commit của repo (commitlint, CLAUDE.md, CONTRIBUTING, kiểu commit trong git log), mặc định conventional commits tiếng Anh, thêm --vi để viết tiếng Việt; tự chia nhiều commit khi thay đổi tách rời, không commit file chứa secret, không push, không amend, không bỏ qua hook. Dùng khi user nói "commit", "commit giúp", "lưu thay đổi vào git", "tạo commit".
argument-hint: "[--vi] [gợi ý nội dung commit (tuỳ chọn)]"
---

# dev-kit:commit

## Context
- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Diff (tóm tắt): !`git diff HEAD --stat`
- Commit gần đây: !`git log --oneline -15`

## 1. Ngôn ngữ và rule
- `$ARGUMENTS` có `--vi` → message tiếng Việt có dấu. Mặc định tiếng Anh. Phần còn lại của `$ARGUMENTS` là gợi ý nội dung từ user (ưu tiên dùng).
- Rule commit của repo thắng mặc định. Tìm theo thứ tự:
  1. config commitlint (`commitlint.config.*`, `.commitlintrc*`, khoá `commitlint` trong `package.json`);
  2. mục commit trong CLAUDE.md, `CONTRIBUTING.md`, `docs/code-standards.md`;
  3. kiểu commit số đông trong `git log` ở trên (prefix, scope, viết hoa, mã ticket như `ABC-123`, độ dài).
- Không có rule → conventional commits: `type(scope): subject`
  - `type`: `feat` · `fix` · `refactor` · `perf` · `test` · `docs` · `chore` · `build` · `ci` · `style`.
  - `scope`: module/thư mục chính bị đổi, bỏ nếu thay đổi rải rác.
  - `subject`: thể mệnh lệnh, không viết hoa chữ đầu (EN), không dấu chấm cuối, ≤ 72 ký tự.
  - Body (khi cần): vì sao thay đổi, không kể lại diff. Breaking change → dòng `BREAKING CHANGE: ...`.
- `--vi` với conventional commits: giữ `type(scope):` tiếng Anh, `subject` và body tiếng Việt (vd `feat(coupon): thêm áp mã giảm giá theo phần trăm`), trừ khi repo đã có kiểu khác.
- Không thêm dòng attribution / co-author trừ khi repo hoặc user yêu cầu.

## 2. Xem thay đổi
- Không có gì thay đổi → báo và dừng.
- Đọc `git diff HEAD` (và nội dung file untracked) đủ để hiểu mục đích; diff lớn thì đọc theo file.
- File đã staged sẵn mà user chưa nói gì → coi là ý muốn của user: commit đúng phần staged trước, phần còn lại hỏi.

## 3. Loại file không được commit
Không `git add` các file sau; gặp thì bỏ ra và cảnh báo user:
- secret: `.env*` (trừ `.env.example`), `*.pem`, `*.key`, `credentials*.json`, `id_rsa*`, file chứa token/API key dạng thật;
- cấu hình cá nhân: `.claude/settings.local.json`, file IDE cá nhân;
- build output, `node_modules/`, log, dump DB, file lớn bất thường (> 5 MB) — thường là thiếu `.gitignore`, đề xuất thêm.

`git add` theo đường dẫn cụ thể, không `git add -A` / `git add .` mù.

## 4. Chia commit
- Thay đổi tách rời rõ ràng (vd một bug fix + một tính năng; code + đổi config không liên quan) → chia nhiều commit, mỗi commit một mục đích, theo thứ tự hợp lý (nền trước, dùng sau).
- Một mục đích → một commit (test đi cùng code của nó).
- Không tách một file thành nhiều commit bằng staging từng đoạn trừ khi user yêu cầu.

## 5. Commit
- Message nhiều dòng → dùng heredoc, không nhét `\n` vào `-m`.
- Không dùng `--no-verify`, `--amend`, `--no-gpg-sign`, không đổi git config.
- Hook pre-commit fail → đọc lỗi, sửa nguyên nhân (lint, format, test), `git add` lại, tạo commit **mới**. Hook tự sửa file (formatter) → add file đã sửa rồi commit lại. Không sửa được → báo user, không bỏ qua hook.
- Xong chạy `git status --short` và `git log --oneline -<số commit vừa tạo>` để xác nhận.

## 6. Không làm
Không push, không tạo/đổi branch, không sửa code ngoài phần hook yêu cầu, không rebase/reset.

## 7. Báo cáo
Danh sách commit vừa tạo (hash + message), file đã bỏ ra không commit (nếu có, kèm lý do). Gợi ý: `dev-kit:create-pr` để push và mở PR.
