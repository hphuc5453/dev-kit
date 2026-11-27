# dev-kit

Bộ dev dùng chung cho mọi project: tuân thủ rule của repo, code đơn giản (ngưỡng độ phức tạp được lint đo + hook ép), chốt yêu cầu, bàn cách làm, lập plan, triển khai, chấm spec, review, commit/PR, fix bug, giải thích code — tất cả trong một plugin, tự chỉnh được.

Hướng dẫn chi tiết (cách gọi từng skill, cấu hình verify-gate, ví dụ end-to-end, xử lý sự cố): **[docs/USAGE.md](docs/USAGE.md)**.

## Thành phần

| Việc | Thành phần |
|---|---|
| Setup rule + lint độ phức tạp cho repo | `/dev-kit:setup` |
| Chốt yêu cầu trước khi code | `/dev-kit:check-spec` |
| Bàn và chốt cách làm → design doc | `/dev-kit:brainstorm` |
| Lập plan chia task (TDD hoặc `--skip-test`) | `/dev-kit:write-plan` |
| Triển khai plan tuần tự trong một phiên | `/dev-kit:execute-plan` |
| Chấm từng yêu cầu sau khi code | `/dev-kit:recheck-spec` |
| Review diff / PR (`--fix` để sửa) | `/dev-kit:code-review` |
| Commit theo rule repo (`--vi`) | `/dev-kit:commit` |
| Commit + push + mở PR (`--vi`, `--draft`, `--base`) | `/dev-kit:create-pr` |
| Sửa bug theo nguyên nhân gốc | `/dev-kit:fix-bug` |
| Giải thích vì sao code viết vậy + đề xuất hướng tốt hơn | `/dev-kit:explain-code` |
| Ép typecheck/lint/test sạch trước khi Claude báo xong | hook `verify-gate` (Stop) |

Plugin đi kèm khuyến nghị: `security-guidance` (claude-plugins-official), cảnh báo bảo mật chạy ngầm.

## Flow

```
Repo mới ──► /dev-kit:setup ──► CLAUDE.md · code-standards · tech-debt · lint ngưỡng · .claude/verify.json   (1 lần / repo)

Task có spec ──► /dev-kit:check-spec ──► chốt câu hỏi mở
                         │
Ý tưởng ─────────────────┼──► /dev-kit:brainstorm (nếu còn phải chọn cách làm) ──► design doc
                         │
                         ▼
              /dev-kit:write-plan [--skip-test] ──► /dev-kit:execute-plan
              (bug: /dev-kit:fix-bug · chưa hiểu code: /dev-kit:explain-code)
                         │
                         ▼
              verify-gate tự chạy khi Claude định dừng: fail → phải sửa tiếp
                         │
                         ▼
              /dev-kit:recheck-spec ──► /dev-kit:code-review ──► /dev-kit:create-pr
                                                               (hoặc /dev-kit:commit)
```

## Cài đặt

```
# 1. Plugin đi kèm (tuỳ chọn)
/plugin install security-guidance@claude-plugins-official

# 2. dev-kit từ GitHub
/plugin marketplace add hphuc5453/dev-kit
/plugin install dev-kit@dev-kit
```

Chạy từ terminal (ngoài phiên Claude Code) thì dùng `claude plugin marketplace add hphuc5453/dev-kit` rồi `claude plugin install dev-kit@dev-kit`. Lệnh `install` không nhận URL GitHub trực tiếp, phải thêm marketplace trước. Cài xong thì khởi động lại phiên.

Đang phát triển dev-kit trên máy và muốn dùng bản local: `/plugin marketplace add <đường dẫn tới thư mục dev-kit>` thay cho bước thêm marketplace từ GitHub.

Cập nhật sau khi sửa dev-kit: `/plugin marketplace update dev-kit` rồi khởi động lại phiên.

## verify-gate

- Chỉ hoạt động ở repo có `.claude/verify.json` (do `/dev-kit:setup` tạo):
  ```json
  { "commands": ["npm run typecheck", "npm run lint:check", "npm test"], "maxAttempts": 3, "timeoutSec": 600 }
  ```
- Lúc mở phiên ghi baseline working tree. Khi Claude định dừng: nếu code **không đổi** so với baseline hoặc so với lần pass gần nhất → bỏ qua; ngược lại chạy lần lượt các lệnh, lệnh nào fail → chặn dừng, gửi output cho Claude sửa.
- Fail quá `maxAttempts` lần liên tiếp → cho dừng và báo user (tránh lặp vô hạn).
- Tắt tạm: env `DEV_KIT_VERIFY=off`.

## Ngưỡng độ phức tạp (mọi stack)

Hàm ≤ 50 dòng · cyclomatic ≤ 10 · cognitive ≤ 15 · lồng ≤ 3 · tham số ≤ 4 · file ≤ 300 dòng. Preset theo stack: [skills/setup/references/lint-presets.md](skills/setup/references/lint-presets.md).

## Phát triển

```
npm test    # chạy mọi *.test.cjs trong tests/: hook verify-gate, script detect-stack, cấu trúc skill (node:test, không cần dependency)
```

## Ghi công

Các skill `brainstorm`, `write-plan`, `execute-plan`, `code-review` và phần debug trong `fix-bug` được viết lại dựa trên một bộ skill mã nguồn mở theo giấy phép MIT. Chi tiết trong [NOTICE](NOTICE).
