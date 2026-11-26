# Khung `CLAUDE.md` (gọn — chỉ trỏ tới nơi chứa chi tiết)

CLAUDE.md được nạp ở **mọi** phiên → giữ ≤ ~30 dòng. Chi tiết để trong `docs/`. Repo đã có CLAUDE.md → chỉ bổ sung mục còn thiếu, giữ nguyên phần của user.

```markdown
# <Tên dự án>

<Stack 1 dòng: framework + DB + cache...>. Package manager: <npm/pnpm/uv/...>.

- Tuân theo [docs/code-standards.md](docs/code-standards.md) cho mọi code mới và code được sửa.
- Ngưỡng độ phức tạp được lint enforce: hàm ≤ 50 dòng, cyclomatic ≤ 10, lồng ≤ 3, tham số ≤ 4, file ≤ 300 dòng. Không dùng disable-comment để lách — tách hàm.
- Baseline verify, bug đã biết, nợ kỹ thuật: [docs/tech-debt.md](docs/tech-debt.md).
- Verify trước khi xong việc: `<typecheck>` · `<lint>` · `<test>` — tất cả phải sạch (lint 0 error / 0 warning). Hook dev-kit verify-gate tự chạy các lệnh trong `.claude/verify.json`.
- Spec/tài liệu yêu cầu nằm ở: `<docs/specs/...>` (dùng `/dev-kit:check-spec`).
```

# Khung `docs/tech-debt.md`

```markdown
# Tech debt & baseline

Cập nhật: <YYYY-MM-DD>

## Baseline verify
| Lệnh | Kết quả lúc setup | Ghi chú |
|---|---|---|
| `<lint>` | <N> warning (rule độ phức tạp mới bật) | Danh sách file bên dưới; sửa dần, không thêm mới |

## Vi phạm độ phức tạp có sẵn
| File:dòng | Rule | Giá trị | Ưu tiên |
|---|---|---|---|

## Bug đã biết
| Mô tả | Nơi | Trạng thái |
|---|---|---|

## Backlog nợ kỹ thuật
- ...
```

# `.claude/verify.json` (hook verify-gate đọc file này)

```json
{
  "commands": ["<typecheck>", "<lint không auto-fix, fail khi có warning>", "<test>"],
  "maxAttempts": 3,
  "timeoutSec": 600
}
```
- Thứ tự: nhanh trước, chậm sau (typecheck → lint → test). Dừng ở lệnh fail đầu tiên.
- Lint phải **fail khi có warning** (vd ESLint `--max-warnings 0`), nếu không ngưỡng warn sẽ không chặn được.
- Lệnh chậm (e2e, build Docker) không đưa vào — chỉ những gì chạy được trong vài phút.
- File này commit vào repo để cả team dùng chung.
