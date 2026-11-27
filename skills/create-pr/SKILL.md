---
name: create-pr
description: Commit, push và tạo (hoặc cập nhật) pull request trên GitHub bằng gh — tạo branch nếu đang ở main, commit theo dev-kit:commit, điền PR theo template/rule PR của repo, mô tả PR liệt kê các mục đã làm (từ plan, spec-check, diff), cách test, kết quả recheck-spec; mặc định tiếng Anh, --vi để viết tiếng Việt; có --draft, --base. Không merge, không force push. Dùng khi user nói "tạo PR", "mở pull request", "push và tạo PR", "create PR", "commit push PR".
argument-hint: "[--vi] [--draft] [--base <branch>]"
---

# dev-kit:create-pr

## Context
- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Remote: !`git remote -v`
- Commit gần đây: !`git log --oneline -15`

## 1. Option
- `--vi` → commit message và mô tả PR tiếng Việt có dấu. Mặc định tiếng Anh. Tiêu đề PR theo cùng ngôn ngữ.
- `--draft` → `gh pr create --draft`.
- `--base <branch>` → PR vào branch đó. Mặc định: `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`.
- `gh` chưa cài hoặc chưa đăng nhập (`gh auth status`) → báo user, dừng trước khi push.

## 2. Rule PR của repo
Rule repo thắng mặc định. Đọc nếu có:
- `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `docs/pull_request_template.md`, thư mục `.github/PULL_REQUEST_TEMPLATE/` (nhiều template → chọn theo loại thay đổi, không rõ thì hỏi);
- mục PR / branch trong CLAUDE.md, `CONTRIBUTING.md`, `docs/code-standards.md`;
- quy ước tên branch (từ `git branch -r`) và tiêu đề PR (từ `gh pr list --state merged --limit 10`).

Có template → điền **đúng cấu trúc template** (giữ heading, checkbox; tick mục đã làm thật, mục không áp dụng thì ghi N/A), đưa nội dung ở mục 5 vào đúng chỗ.

## 3. Branch
- Đang ở base branch (main/master/develop) → tạo branch mới theo quy ước của repo; mặc định `<type>/<slug>` (vd `feat/apply-coupon`), `type` như conventional commits.
- Đang ở branch khác → dùng branch đó.

## 4. Commit và push
- Còn thay đổi chưa commit → làm đúng các bước của `dev-kit:commit` (cùng rule, cùng `--vi`, cùng danh sách file không được commit).
- Không có commit nào so với base (`git log <base>..HEAD` rỗng) và không còn thay đổi → báo không có gì để tạo PR, dừng.
- `git push -u origin <branch>`. Push bị từ chối vì remote đã có commit mới → `git pull --rebase` rồi push lại nếu không xung đột; có xung đột → dừng, báo user. **Không** `--force` / `--force-with-lease` trừ khi user yêu cầu rõ.

## 5. Nội dung PR
Nguồn (đọc theo thứ tự, dùng cái có):
1. plan của task (`docs/plans/*.md` khớp slug branch hoặc được nhắc trong commit) → task đã làm, mục Quyết định, danh sách Kiểm tra tay;
2. spec-check (`*-spec-check.md`) → yêu cầu theo ID và mục `## Kết quả recheck` mới nhất;
3. `git log <base>..HEAD` và `git diff <base>...HEAD --stat`.

Tiêu đề: theo quy ước repo; mặc định giống commit chính (`type(scope): subject`), ≤ 72 ký tự.

Body khi repo không có template:

```markdown
## Summary
<1–3 câu: thay đổi gì và vì sao>

## Changes
- <mục đã làm, theo task trong plan hoặc theo nhóm thay đổi; kèm ID yêu cầu nếu có (R1, UC_01)>

## How to test
- Automated: <lệnh verify đã chạy và kết quả>
- Manual: <bước kiểm tra tay từ plan / recheck — thao tác và kết quả mong đợi>

## Spec check            <!-- chỉ khi có spec-check -->
✅ <n> · ⚠️ <n> · ❌ <n> · ❓ <n> — <link file>; liệt kê mục chưa ✅ kèm lý do

## Notes                 <!-- chỉ khi có -->
- <quyết định khi triển khai đáng để reviewer biết; breaking change; việc cần làm sau merge: migration, env mới, feature flag>
```

`--vi` → dùng heading tiếng Việt: Tóm tắt · Thay đổi · Cách test · Đối chiếu spec · Ghi chú.

Quy tắc:
- Chỉ ghi điều có thật: lệnh verify phải đã chạy trong phiên (hoặc ghi rõ "chưa chạy"); không tick checkbox template cho việc chưa làm.
- Không dán diff, không liệt kê từng file.
- Không ghi secret, URL nội bộ nhạy cảm, dữ liệu khách hàng.
- Body dài nhiều dòng → ghi ra file trong scratchpad, dùng `gh pr create --body-file <file>`.

## 6. Tạo hoặc cập nhật PR
- Kiểm tra PR đang mở cho branch: `gh pr view --json number,url,state`.
  - Chưa có → `gh pr create --base <base> --title "<title>" --body-file <file>` (+ `--draft`).
  - Đã có và đang mở → `gh pr edit <number> --body-file <file>` (đổi title nếu mục đích PR đã đổi); báo là đã cập nhật.
  - Đã merge/đóng → hỏi user: tạo branch mới hay mở lại.
- Không merge, không tự thêm reviewer/label trừ khi rule repo hoặc user yêu cầu.

## 7. Báo cáo
Link PR, branch → base, danh sách commit, các mục kiểm tra tay user cần làm trước khi merge (nếu có).
