# Bộ skill workflow riêng của dev-kit (bỏ phụ thuộc superpowers và commit-commands)

## Mục đích
Flow làm task hằng ngày hiện dựa vào 3 nguồn ngoài: `superpowers` (brainstorming, writing-plans, executing-plans, systematic-debugging), `/code-review` có sẵn của Claude Code và `commit-commands:commit-push-pr`. Ba nguồn này không tuỳ chỉnh được, prompt tiếng Anh, và hook `using-superpowers` chèn một đoạn dài vào đầu mỗi phiên, ép gọi skill cả khi chỉ hỏi đơn giản. Mục tiêu là viết lại toàn bộ flow thành skill của dev-kit để tự chỉnh sau này.

## Mục tiêu / không làm
- **Làm:** 8 skill trong flow (bảng bên dưới), gộp debug có hệ thống vào `fix-bug`, dọn sạch mọi thứ liên quan tới superpowers và commit-commands (xem mục "Dọn dẹp"), cập nhật README/USAGE.
- **Không làm:** chế độ subagent (`subagent-driven-development`), git worktree, visual companion của brainstorming, hỗ trợ Codex/Gemini. Không thay `security-guidance`, vì đó là hook cảnh báo bảo mật chứ không phải skill trong flow.
- **Coi là thất bại nếu:** skill mới gọi tới một skill không còn tồn tại, hoặc flow bị đứt (skill A gợi ý bước tiếp là tên skill sai).

## Flow
```
spec / ticket
  → /dev-kit:check-spec      chốt YÊU CẦU (R1, R2…, edge case, câu hỏi mở)
  → /dev-kit:brainstorm      chốt CÁCH LÀM (bỏ qua nếu chỉ có một cách hợp lý)
  → /dev-kit:write-plan      chia task; --skip-test nếu không viết test
  → /dev-kit:execute-plan    làm tuần tự trong một phiên
  → /dev-kit:recheck-spec    chấm từng yêu cầu ✅/⚠️/❌
  → /dev-kit:code-review     review diff; --fix để sửa
  → /dev-kit:create-pr       commit + push + PR; --vi cho tiếng Việt
Chỉ commit (không push, không PR): /dev-kit:commit
Bug: /dev-kit:fix-bug (độc lập, tự đủ)
Không có spec: bắt đầu từ /dev-kit:brainstorm
```

## Danh sách skill

| Skill | Trạng thái | Dựa trên |
|---|---|---|
| `check-spec` | sửa: chỉ còn chế độ "trước" | `check-spec` hiện tại, mục 4a |
| `recheck-spec` | mới: tách từ chế độ "sau" | `check-spec` hiện tại, mục 4b |
| `brainstorm` | mới | superpowers:brainstorming |
| `write-plan` | mới | superpowers:writing-plans |
| `execute-plan` | mới | superpowers:executing-plans + lõi TDD + verification-before-completion |
| `code-review` | mới | `/code-review` có sẵn + superpowers:requesting/receiving-code-review |
| `commit` | mới | commit-commands:commit |
| `create-pr` | mới: dùng lại phần commit của `commit` | commit-commands:commit-push-pr |
| `fix-bug` | sửa: gộp debug vào bước 2 | superpowers:systematic-debugging |
| `setup` | giữ, chỉ sửa tham chiếu | |

Ngôn ngữ prompt của skill là tiếng Việt, giống các skill hiện có. Đường dẫn output: `docs/specs/YYYY-MM-DD-<slug>-design.md` và `docs/plans/YYYY-MM-DD-<slug>.md`.

## Thiết kế từng skill

### check-spec (chỉ chế độ trước)
- Giữ mục 1–3, 4a, 5 của bản hiện tại. Bỏ tham số `trước|sau` và logic tự chọn chế độ.
- Đã có file spec-check của task này → hỏi user: cập nhật file đó, hay ý là `recheck-spec`.
- Bước tiếp: task nhỏ có một cách làm → làm luôn; task lớn → `write-plan <spec-check>`; còn phải chọn cách làm → `brainstorm <spec-check>`.

### recheck-spec (chế độ sau)
- Input: file spec-check, hoặc spec gốc nếu chưa có spec-check. Chưa có spec-check → trích yêu cầu như mục 2 của check-spec rồi chấm luôn, có ghi chú.
- Nội dung là mục 4b hiện tại: chấm ✅/⚠️/❌/❓ kèm `file:line`, so text nguyên văn, chạy verify read-only, liệt kê phần làm thừa.
- Cập nhật vào chính file spec-check, thêm mục "Kết quả recheck <ngày>", để `create-pr` đọc lại được.
- Bước tiếp: còn ❌/⚠️ → sửa rồi recheck; sạch → `code-review`.

### brainstorm
- Giữ lõi: đọc context repo (CLAUDE.md, code liên quan, spec-check nếu có) → mỗi lần hỏi một câu, ưu tiên câu trắc nghiệm → đưa 2–3 phương án kèm đánh đổi và khuyến nghị → trình bày thiết kế theo từng phần, chờ duyệt → ghi design doc → tự rà lại (placeholder, mâu thuẫn, phạm vi) → user duyệt file → gợi ý `write-plan`.
- Có spec-check → không hỏi lại phần yêu cầu đã chốt, chỉ bàn cách làm.
- Bỏ: visual companion server, các nhánh chỉ có ở superpowers.
- Không code, không tạo plan trong skill này.

### write-plan
- Input: design doc hoặc spec-check. Option `--skip-test`.
- Đầu plan có: mục tiêu, kiến trúc ngắn, file sẽ tạo/sửa, và dòng `Chế độ test: TDD | skip-test`.
- Mỗi task: file liên quan, các bước dạng checkbox nhỏ (2–5 phút), lệnh chạy và kết quả mong đợi, commit cuối task.
  - Mặc định (TDD): viết test fail → chạy thấy fail → code tối thiểu → chạy thấy pass → commit.
  - `--skip-test`: không có bước viết test mới. Bước verify gồm lint, typecheck và test đang có (lấy từ `.claude/verify.json`), cộng **các bước kiểm tra tay** cụ thể (mở trang nào, bấm gì, mong đợi thấy gì).
- Không có placeholder kiểu "TBD", "xử lý lỗi phù hợp". Tự rà plan so với spec trước khi giao.
- Bước tiếp: `execute-plan <plan>`.

### execute-plan
- Đọc plan, rà lại một lần, nếu có điểm nghi ngờ thì hỏi trước khi bắt đầu.
- Chạy tuần tự từng task: làm theo từng bước, tick checkbox trong file plan, verify, rồi commit.
- Đọc `Chế độ test` ở đầu plan:
  - TDD: test phải fail trước khi code; không có test fail thì không viết code.
  - skip-test: chạy verify của repo; in danh sách kiểm tra tay để user xác nhận ở cuối (hoặc cuối mỗi task nếu plan ghi vậy).
- Lõi verification: không được nói "xong" hoặc "pass" khi chưa chạy lệnh và chưa đọc output trong lượt đó.
- Bị chặn (lệnh fail không rõ nguyên nhân, plan sai, thiếu quyết định) → dừng, báo, không đoán. Lỗi khó → áp dụng phần debug của `fix-bug`, bước 2.
- Xong hết → gợi ý `recheck-spec` (nếu có spec-check), ngược lại `code-review`.

### code-review
- Target: mặc định là diff của branch hiện tại so với main (`git diff <main>...HEAD` + working tree). Có thể nhận số PR hoặc URL (dùng `gh pr diff`).
- Kiểm tra: đúng logic, edge case, bảo mật (injection, authz, secret), breaking change, vi phạm CLAUDE.md và code-standards của repo, ngưỡng độ phức tạp, test thiếu cho logic nghiệp vụ, code thừa.
- Mỗi lỗi phải được kiểm chứng lại trên code trước khi báo (đọc lại đoạn code, nếu cần thì chạy thử). Lỗi không kiểm chứng được thì đánh dấu "nghi ngờ".
- Output trong chat, xếp theo mức nghiêm trọng: `quan trọng` · `có sẵn từ trước` · `nhỏ`. Mỗi lỗi có `file:line`, kịch bản gây lỗi cụ thể và cách sửa.
- `--fix`: sửa các lỗi đã kiểm chứng, chạy verify, rồi báo lại từng lỗi là đã sửa, bỏ qua hay không cần sửa. Lỗi `có sẵn từ trước` không sửa, ghi vào `docs/tech-debt.md`.
- Khi user phản hồi review: kiểm tra kỹ thuật trước rồi mới sửa; nếu góp ý sai so với codebase thì phản biện kèm bằng chứng.
- Bước tiếp: `create-pr`.

### commit
- Option `--vi`: commit message tiếng Việt. Mặc định là tiếng Anh.
- Rule commit của dự án được ưu tiên: commitlint config, mục commit trong CLAUDE.md và `CONTRIBUTING.md`, kiểu commit trong `git log -20`. Không có rule → conventional commits `type(scope): subject`.
- Các bước:
  1. Xem `git status` và diff (cả staged lẫn unstaged).
  2. Không commit file có thể chứa secret (`.env`, credentials, `settings.local.json`); gặp thì bỏ ra và cảnh báo.
  3. Thay đổi tách rời rõ ràng → chia thành nhiều commit; ngược lại thì một commit.
  4. Commit, rồi `git status` để xác nhận.
- Không push, không tạo branch, không sửa code. Không dùng `--no-verify`; hook pre-commit fail thì báo lỗi, sửa rồi tạo commit mới (không `--amend`).

### create-pr
- Option `--vi`: commit message và mô tả PR bằng tiếng Việt. Mặc định là tiếng Anh. Có thể thêm `--draft` và `--base <branch>`.
- Rule PR của dự án được ưu tiên: `.github/pull_request_template.md` (và các biến thể trong `.github/PULL_REQUEST_TEMPLATE/`), `CONTRIBUTING.md`, mục PR trong CLAUDE.md. Có template thì điền theo template.
- Các bước:
  1. Đang ở main/master → tạo branch theo quy ước của repo (mặc định `<type>/<slug>`).
  2. Còn thay đổi chưa commit → làm theo các bước của `commit` (cùng quy tắc, cùng `--vi`).
  3. Push với `-u`.
  4. Tạo PR bằng `gh pr create`. Branch đã có PR → cập nhật mô tả thay vì tạo mới.
- Mô tả PR gồm: tóm tắt, **danh sách các mục đã làm** (lấy từ plan hoặc spec-check nếu có, ngược lại từ diff), cách test (test tự động + kiểm tra tay nếu plan ở chế độ skip-test), kết quả recheck-spec nếu có, và việc cần làm sau khi merge (migration, env).
- Không merge PR.

### fix-bug (sửa)
- Bước 2 viết thêm, mỗi ý vài dòng:
  - root-cause tracing: lần ngược theo call stack tới nơi giá trị sai xuất hiện lần đầu;
  - instrument tại ranh giới giữa các tầng để biết tầng nào hỏng;
  - mỗi lần thử một giả thuyết, đổi một biến;
  - thất bại 3 lần → dừng, nghi vấn kiến trúc, báo user.
- Bỏ câu "vd superpowers:systematic-debugging" trong description. Bước 7 gợi ý `code-review` → `create-pr`.

### setup (sửa)
- Bỏ khuyến nghị cài `superpowers` và `commit-commands`. Chỗ "tự commit (hoặc dùng `/commit-commands:commit`)" đổi thành `/dev-kit:commit`.

## Dọn dẹp
- **Đã làm:** chuyển `docs/superpowers/specs|plans` sang `docs/specs|plans`, sửa header và link trong plan detect-stack cũ, xoá thư mục `.superpowers/` (thư mục tạm, không track).
- **Còn lại trong repo:** mọi tham chiếu `superpowers:` và `commit-commands:` trong `skills/`, `README.md`, `docs/USAGE.md`. Viết lại các bảng, sơ đồ flow và phần ví dụ một task từ đầu đến cuối theo skill mới; bỏ hướng dẫn cài hai plugin này.
- **Trên máy (bước cuối, sau khi kiểm tra tay):** gỡ `superpowers@claude-plugins-official` và `commit-commands@claude-plugins-official` (`/plugin uninstall`), xoá hai dòng tương ứng trong `enabledPlugins` của `~/.claude/settings.json`.
- **Giữ lại:** file `NOTICE` ghi công superpowers. Giấy phép MIT yêu cầu giữ thông báo bản quyền khi dùng lại phần đáng kể nội dung; chỉ là một file vài dòng, không ảnh hưởng gì tới việc chạy.

## Ràng buộc chung
- Mỗi `SKILL.md` ≤ 300 dòng; phần dài thì tách vào `references/`.
- Frontmatter có `name`, `description` (có cụm từ kích hoạt tiếng Việt), `argument-hint`.
- Không skill nào nhắc tới `superpowers:` hay `commit-commands:`.

## Test
`tests/skills.test.cjs` (chạy bằng `node --test`):
- Mỗi `skills/*/SKILL.md` có frontmatter hợp lệ, `name` khớp tên thư mục.
- Mọi tham chiếu `dev-kit:<tên>` và `/dev-kit:<tên>` trong skills, README, USAGE đều trỏ tới skill có thật.
- Không còn chuỗi `superpowers` và `commit-commands` (không phân biệt hoa thường) trong `skills/`, `README.md`, `docs/USAGE.md`.
- `SKILL.md` ≤ 300 dòng.

Kiểm tra tay: cài lại plugin local, chạy hết flow trên một task nhỏ.

## Ghi công & phát hành
- `NOTICE` ghi rõ các skill brainstorm/write-plan/execute-plan/fix-bug dựa trên superpowers (MIT, © 2025 Jesse Vincent).
- Tăng version lên `0.2.0` trong `plugin.json` và `package.json`. Cập nhật mô tả trong `marketplace.json`.
- README/USAGE: bảng "nên gọi skill nào" theo flow mới, bỏ khuyến nghị cài superpowers và commit-commands. Không nhắc tới hai plugin này ở đâu trong README/USAGE; hướng dẫn gỡ chỉ đưa cho user một lần lúc bàn giao.

## Thứ tự làm
1. Test cấu trúc skill (`tests/skills.test.cjs`), lúc đầu sẽ fail vì còn tham chiếu `superpowers:`.
2. Tách `check-spec` thành `check-spec` và `recheck-spec`.
3. `brainstorm` → `write-plan` → `execute-plan`.
4. `code-review` → `commit` → `create-pr`.
5. Sửa `fix-bug`, `setup`.
6. README, USAGE, NOTICE, version. Chạy test.
7. Kiểm tra tay toàn bộ flow, rồi gỡ superpowers và commit-commands khỏi máy.
