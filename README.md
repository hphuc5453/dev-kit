# dev-kit

Bộ dev dùng chung cho mọi project: tuân thủ rule của repo, code đơn giản (ngưỡng độ phức tạp được lint đo + hook ép), đối chiếu spec, fix bug, review, commit/PR.

Hướng dẫn chi tiết (cách gọi từng skill, cấu hình verify-gate, ví dụ end-to-end, xử lý sự cố): **[docs/USAGE.md](docs/USAGE.md)**.

## Thành phần

| Việc | Thành phần | Nguồn |
|---|---|---|
| Setup rule + lint độ phức tạp cho repo | `/dev-kit:setup` | dev-kit |
| Ép typecheck/lint/test sạch trước khi Claude báo xong | hook `verify-gate` (Stop) | dev-kit |
| Chốt yêu cầu trước khi code, chấm spec sau khi code | `/dev-kit:check-spec` | dev-kit |
| Sửa bug | `/dev-kit:fix-bug` | dev-kit |
| Brainstorm → plan → TDD → debug | `superpowers` | claude-plugins-official |
| Review | `/code-review` | có sẵn trong Claude Code |
| Commit / push / PR | `commit-commands` | claude-plugins-official |
| Bảo mật (chạy ngầm) | `security-guidance` | claude-plugins-official |

## Flow

```
Repo mới ──► /dev-kit:setup ──► CLAUDE.md · code-standards · tech-debt · lint ngưỡng · .claude/verify.json   (1 lần / repo)

Task có spec ──► /dev-kit:check-spec trước ──► chốt câu hỏi mở
                         │
Task / bug ──────────────┼──► superpowers (brainstorm → plan → TDD)   hoặc   /dev-kit:fix-bug
                         │
                         ▼
              verify-gate tự chạy khi Claude định dừng: fail → phải sửa tiếp
                         │
                         ▼
              /dev-kit:check-spec sau ──► /code-review ──► /commit-commands:commit-push-pr
              (security-guidance chạy ngầm suốt quá trình)
```

## Cài đặt

```
# 1. Plugin đi kèm
/plugin install superpowers@claude-plugins-official
/plugin install commit-commands@claude-plugins-official
/plugin install security-guidance@claude-plugins-official

# 2. dev-kit (từ thư mục local; sau khi push GitHub thì thay bằng <owner>/dev-kit)
/plugin marketplace add d:/sources/dev-kit
/plugin install dev-kit@dev-kit
```

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
npm test    # test hook verify-gate (node:test, không cần dependency)
```
