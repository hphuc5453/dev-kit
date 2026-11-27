# Bộ skill workflow riêng của dev-kit: Implementation Plan

> Chạy bằng `/dev-kit:execute-plan`. Các bước dùng checkbox (`- [ ]`) để theo dõi.

**Goal:** dev-kit có đủ 8 skill cho flow check-spec → brainstorm → write-plan → execute-plan → recheck-spec → code-review → commit/create-pr, cộng fix-bug, và không còn phụ thuộc hay nhắc tới superpowers / commit-commands.

**Architecture:** Mỗi skill là một `skills/<tên>/SKILL.md` tiếng Việt, ≤ 300 dòng. Phần dài tách sang `references/` trong cùng skill. Một test cấu trúc (`tests/skills.test.cjs`) giữ cho các tham chiếu giữa skill luôn đúng.

**Tech Stack:** Markdown skill của Claude Code; test bằng `node:test`, không dependency.

**Spec:** [docs/specs/2026-11-27-own-workflow-skills-design.md](../specs/2026-11-27-own-workflow-skills-design.md)

**Chế độ test:** skip-test cho các task viết skill (nội dung là prompt, không unit test được). Task 1 viết test cấu trúc; mọi task sau verify bằng `npm test` + các bước kiểm tra tay ghi trong task.

## Ràng buộc chung
- `SKILL.md` ≤ 300 dòng; frontmatter có `name` (trùng tên thư mục), `description`, `argument-hint`.
- Không chuỗi `superpowers` hay `commit-commands` (không phân biệt hoa thường) trong `skills/`, `README.md`, `docs/USAGE.md`. Ghi công chỉ nằm trong `NOTICE`.
- Mọi `dev-kit:<tên>` được nhắc tới phải là skill có thật.
- Output của skill: design doc `docs/specs/YYYY-MM-DD-<slug>-design.md`, plan `docs/plans/YYYY-MM-DD-<slug>.md`, spec-check như hiện tại.
- Commit message tiếng Anh, conventional commits, giống `git log`.

## Điểm cần soát kỹ (test không bắt được)
1. Skill gợi ý bước tiếp bằng tên khớp flow (check-spec → brainstorm/write-plan → execute-plan → recheck-spec → code-review → create-pr).
2. `execute-plan` đọc đúng dòng `Chế độ test` mà `write-plan` ghi (cùng chữ: `TDD` / `skip-test`).
3. `recheck-spec` ghi vào đúng file và đúng tên mục mà `create-pr` đọc (`## Kết quả recheck`).
4. `commit`/`create-pr` không bao giờ dùng `--no-verify`, `--amend`, `push --force`, không merge.
5. `check-spec` không còn nhắc tới chế độ `sau` ngoài câu chuyển hướng sang `recheck-spec`.

---

### Task 1: Test cấu trúc skill

**Files:** Create `tests/skills.test.cjs`

- [x] Viết test với 4 nhóm, đọc file bằng `node:fs`:
  - `frontmatter`: mỗi `skills/*/SKILL.md` bắt đầu bằng `---`, có `name:` bằng tên thư mục, có `description:` và `argument-hint:`.
  - `line limit`: mỗi `SKILL.md` ≤ 300 dòng.
  - `references`: quét `skills/**/*.md`, `README.md`, `docs/USAGE.md` tìm `/\bdev-kit:([a-z][a-z-]*)/g`; mỗi tên phải có thư mục `skills/<tên>/SKILL.md`. Lỗi in ra `file: dev-kit:<tên>`.
  - `no external plugin`: cùng tập file đó không khớp `/superpowers|commit-commands/i`.
- [x] Chạy `npm test`. Expected: FAIL ở `references` (chưa có `recheck-spec`…) và `no external plugin` (còn trong check-spec, fix-bug, setup, README, USAGE). Các test cũ vẫn pass.
- [x] Commit `test: add skill structure checks`.

### Task 2: Tách check-spec thành check-spec + recheck-spec

**Files:** Modify `skills/check-spec/SKILL.md`; Create `skills/recheck-spec/SKILL.md`

- [x] `check-spec`: bỏ tham số chế độ và mục 4b; mục 1 bỏ logic tự chọn chế độ, thêm: đã có spec-check của task → hỏi cập nhật hay ý là `recheck-spec`. Mục 4a bước tiếp: `dev-kit:write-plan` / `dev-kit:brainstorm` / làm luôn. Template file bỏ các mục "Blocker verify", "Làm thừa", chữ `Chế độ`. Description bỏ chế độ "sau", thêm câu "Sau khi code dùng `dev-kit:recheck-spec`".
- [x] `recheck-spec`: input là spec-check (ưu tiên) hoặc spec gốc; tìm spec-check theo đường dẫn ở mục 5 của check-spec. Chưa có → trích yêu cầu như check-spec mục 2, ghi chú "chưa qua check-spec". Nội dung chấm = mục 4b cũ. Ghi thêm mục `## Kết quả recheck YYYY-MM-DD` (bảng tổng, Blocker verify, Chi tiết, Làm thừa) vào cuối file spec-check; lần sau thêm mục mới, không xoá mục cũ. Không sửa code. Bước tiếp: còn ❌/⚠️ → sửa rồi chạy lại; sạch → `dev-kit:code-review`.
- [x] `npm test`: test `references` không còn báo `recheck-spec`.
- [x] Commit `feat(check-spec): split post-implementation check into recheck-spec`.

### Task 3: brainstorm

**Files:** Create `skills/brainstorm/SKILL.md`

- [x] Viết theo spec mục brainstorm: điều kiện bỏ qua (yêu cầu đã rõ hết → nói và làm), đọc context trước khi hỏi, tin nhắn đầu, hỏi từng câu, play back, đưa phương án trong tin nhắn riêng, định cỡ (nhỏ → design ngắn, lớn → design đầy đủ), nội dung design doc, tự rà, cổng cứng "không code trước khi duyệt doc", bước tiếp là `dev-kit:write-plan`. Có spec-check → không hỏi lại yêu cầu. Cần cho xem UI → phác thảo ASCII trong chat.
- [x] Kiểm tra tay: đọc lại, không có bước nào gọi skill/tool không tồn tại.
- [x] Commit `feat: add brainstorm skill`.

### Task 4: write-plan

**Files:** Create `skills/write-plan/SKILL.md`, `skills/write-plan/references/plan-template.md`

- [x] SKILL.md: input, `--skip-test`, kiểm tra phạm vi, map file trước khi chia task, cỡ task, nội dung một bước, tự rà (phủ spec, bước mơ hồ, tên nhất quán, tỉ lệ độ dài), lưu `docs/plans/`, giao lại và gợi ý `dev-kit:execute-plan`.
- [x] plan-template.md: header (Goal, Architecture, Tech Stack, Spec, `**Chế độ test:** TDD | skip-test`), Ràng buộc chung, Điểm cần soát kỹ, mẫu task TDD và mẫu task skip-test (bước verify = lệnh trong `.claude/verify.json` + mục "Kiểm tra tay" có thao tác và kết quả mong đợi).
- [x] Commit `feat: add write-plan skill`.

### Task 5: execute-plan

**Files:** Create `skills/execute-plan/SKILL.md`

- [x] Setup: không ở main/master nếu chưa được đồng ý, đọc plan + spec, rà xung đột một lần, đọc `Chế độ test`. Tiến độ = checkbox trong file plan (tick ngay khi xong bước) + `git log`; sau compact thì tin hai nguồn này.
- [x] Vòng lặp task: làm bước theo thứ tự; so output với `Expected`; code sai → dùng mục debug ở bước 2 của `dev-kit:fix-bug`; plan sai → sửa nhỏ nhất theo spec, ghi `Quyết định:` vào cuối plan. Chế độ TDD: luật test fail trước. Chế độ skip-test: chạy verify, gom mục kiểm tra tay.
- [x] Hợp đồng hoàn thành (lõi verification): không nói xong/pass khi chưa chạy lệnh và đọc output trong lượt đó.
- [x] Bốn trường hợp được dừng hỏi: thao tác không đảo ngược được, liên quan bảo mật, tác động ra ngoài repo (push, publish), plan hỏng tới mức mọi hướng đều là đoán.
- [x] Kết thúc: tự review toàn branch theo checklist của `dev-kit:code-review`, liệt kê "Quyết định đã đưa ra" + danh sách kiểm tra tay, gợi ý `dev-kit:recheck-spec` hoặc `dev-kit:code-review`.
- [x] Commit `feat: add execute-plan skill`.

### Task 6: code-review

**Files:** Create `skills/code-review/SKILL.md`, `skills/code-review/references/checklist.md`

- [x] SKILL.md: target (diff branch vs main + working tree / số PR / URL qua `gh pr diff`), đọc CLAUDE.md + code-standards, đọc ngữ cảnh quanh diff, kiểm chứng từng lỗi, phân loại `quan trọng` · `có sẵn từ trước` · `nhỏ`, format output, `--fix`, xử lý khi user phản hồi review (kiểm tra trước, phản biện có bằng chứng, hỏi lại mục chưa rõ trước khi sửa bất kỳ mục nào). Bước tiếp `dev-kit:create-pr`.
- [x] checklist.md: logic/edge case, bảo mật, breaking change, dữ liệu/migration, hiệu năng (N+1, vòng lặp IO), lỗi/exception, test, độ phức tạp, code thừa / scope creep.
- [x] Commit `feat: add code-review skill`.

### Task 7: commit + create-pr

**Files:** Create `skills/commit/SKILL.md`, `skills/create-pr/SKILL.md`

- [x] `commit`: context động (`git status`, `git diff HEAD --stat`, branch, `git log --oneline -10`), `--vi`, rule commit của repo, loại file secret, chia commit, không push/amend/no-verify, hook fail → sửa và commit mới.
- [x] `create-pr`: `--vi`, `--draft`, `--base`; tạo branch nếu ở main; commit theo `dev-kit:commit`; push `-u`; PR template của repo; nội dung PR (tóm tắt, các mục đã làm từ plan/spec-check/diff, cách test, `## Kết quả recheck` nếu có, việc sau merge); branch có PR → `gh pr edit`; không merge, không force push.
- [x] Commit `feat: add commit and create-pr skills`.

### Task 8: fix-bug + setup

**Files:** Modify `skills/fix-bug/SKILL.md`, `skills/setup/SKILL.md`

- [x] fix-bug: description bỏ câu nhắc skill ngoài; bước 2 thêm 4 kỹ thuật (lần ngược call stack, instrument ranh giới tầng, một giả thuyết / một biến mỗi lần, 3 lần thất bại → dừng và báo); bước 7 gợi ý `dev-kit:code-review` → `dev-kit:commit` hoặc `dev-kit:create-pr`.
- [x] setup: "dùng `/dev-kit:commit`"; bỏ dòng khuyến nghị plugin đi kèm, giữ `security-guidance` (không phải plugin bị gỡ).
- [x] `npm test`: chỉ còn README/USAGE fail.
- [x] Commit `refactor(skills): drop external plugin references from fix-bug and setup`.

### Task 9: README, USAGE, NOTICE, version

**Files:** Modify `README.md`, `docs/USAGE.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`; Create `NOTICE`

- [x] README: bảng thành phần + flow + cài đặt theo skill mới (chỉ còn `security-guidance` là plugin đi kèm).
- [x] USAGE: bảng "Bắt đầu nhanh", mục so sánh check-spec/brainstorm, mục 1 cài đặt, mục 3 (check-spec + recheck-spec), thêm mục ngắn cho brainstorm/write-plan/execute-plan, code-review, commit/create-pr; mục 6 ví dụ end-to-end; mục lục.
- [x] NOTICE: ghi công MIT © 2025 Jesse Vincent cho brainstorm, write-plan, execute-plan, code-review, fix-bug.
- [x] Version `0.2.0`; description ở plugin.json, marketplace.json, package.json liệt kê skill mới.
- [x] `npm test`. Expected: tất cả pass.
- [x] Commit `docs: document dev-kit workflow skills, bump to 0.2.0`.

### Task 10: Kiểm tra tay và gỡ plugin cũ (cần user)
- [ ] `/plugin marketplace update dev-kit`, khởi động lại phiên, gõ `/dev-kit:` thấy đủ 9 skill.
- [ ] Chạy flow trên một task nhỏ.
- [ ] Gỡ `superpowers` và `commit-commands`, xoá khỏi `enabledPlugins` trong `~/.claude/settings.json`.

## Quyết định khi triển khai
- Task 1: test `references` pass ngay từ đầu (lúc đó chưa có tham chiếu tới skill chưa tồn tại), khác Expected của plan — giữ test như thiết kế; nó bắt đúng 4 tham chiếu hỏng ngay sau Task 2 — không có cái giá đáng kể.
- Task 1: làm việc trên branch mới `feat/own-workflow-skills` tạo từ `origin/main`, vì `feat/detect-stack` đã merge (PR #1) — nếu sai thì chỉ cần rebase.
- Task 9: USAGE ghi đủ 10 skill (tính cả `setup`), không phải 9 như đã nói trong lúc bàn — chỉ là số đếm.
- Task 9: README có mục "Ghi công" trỏ tới NOTICE nhưng không ghi tên plugin gốc, để giữ đúng ràng buộc "không nhắc tới plugin ngoài" trong README/USAGE; tên và URL nằm trong NOTICE — nếu muốn ghi rõ hơn thì sửa test.
