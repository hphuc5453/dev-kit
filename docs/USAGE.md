# Hướng dẫn sử dụng dev-kit

Tài liệu cho dev dùng dev-kit trong project hằng ngày. Tổng quan và lệnh cài nhanh: [README](../README.md).

## Bắt đầu nhanh: nên gọi skill nào?

| Tình huống | Gõ | Kết quả |
|---|---|---|
| Repo chưa dùng dev-kit (chưa có `.claude/verify.json`) | `/dev-kit:setup` | CLAUDE.md, chuẩn code, lint độ phức tạp, verify-gate |
| Có spec / ticket / AC, chưa code | `/dev-kit:check-spec <spec>` | File spec-check: yêu cầu có ID, edge case, câu hỏi mở |
| Không có docs, nhưng **mô tả đã cụ thể** (biết rõ cần gì) | `/dev-kit:check-spec <mô tả>` | Như trên, mô tả của bạn chính là spec |
| Spec-check đã chốt, **chỉ có một cách làm hợp lý**, task nhỏ | `Làm task theo <spec-check>, không cần brainstorm, làm luôn` | Code luôn, có test trước |
| Spec-check đã chốt, **chỉ có một cách làm hợp lý**, task lớn | `/dev-kit:write-plan <spec-check>` | Plan chia task ở `docs/plans/` |
| Spec-check đã chốt nhưng **còn phải chọn cách làm** (BE hay FE, có bảng mới không...) | `/dev-kit:brainstorm <spec-check>` | Bàn phương án → design doc ở `docs/specs/` |
| Chưa có spec, chỉ có ý tưởng hoặc mô tả còn mơ hồ | `/dev-kit:brainstorm <ý tưởng>` | Hỏi đáp → phương án → design doc |
| Design doc đã duyệt | `/dev-kit:write-plan <design doc>` | Plan, mặc định TDD |
| Task không cần / không muốn viết file test | `/dev-kit:write-plan <design doc> --skip-test` | Plan verify bằng lint/typecheck/test có sẵn + bước kiểm tra tay |
| Đã có plan | `/dev-kit:execute-plan <plan>` | Claude làm tuần tự từng task, commit từng task, tự review ở cuối |
| Gặp bug | `/dev-kit:fix-bug <mô tả / log>` | Nguyên nhân gốc → duyệt → test hồi quy → sửa |
| Không hiểu vì sao code viết vậy, nghi có cách tốt hơn | `/dev-kit:explain-code <file:line / hàm>` | Lý do có bằng chứng → đánh giá → đề xuất, chờ bạn chọn |
| Code xong, có spec | `/dev-kit:recheck-spec <spec-check>` | Chấm từng yêu cầu ✅/⚠️/❌/❓ |
| Trước khi tạo PR | `/dev-kit:code-review` (thêm `--fix` để sửa) | Danh sách lỗi đã kiểm chứng, xếp theo mức nghiêm trọng |
| Chỉ muốn commit | `/dev-kit:commit` (thêm `--vi` cho tiếng Việt) | Commit theo rule của repo |
| Commit + push + mở PR | `/dev-kit:create-pr` (`--vi`, `--draft`, `--base <branch>`) | PR theo template của repo, liệt kê các mục đã làm |

**Gõ slash command là chắc chắn nhất.** Khi bạn viết câu tự nhiên (vd "làm task này đi"), Claude tự chọn skill theo mô tả của skill, nên kết quả có thể khác ý bạn. Muốn bỏ bước bàn phương án thì nói rõ *"không cần brainstorm, làm luôn"*.

### Flow đầy đủ

```
spec / ticket
  → /dev-kit:check-spec      chốt YÊU CẦU (R1, R2…, edge case, câu hỏi mở)
  → /dev-kit:brainstorm      chốt CÁCH LÀM (bỏ qua nếu chỉ có một cách hợp lý)
  → /dev-kit:write-plan      chia task; --skip-test nếu không viết test
  → /dev-kit:execute-plan    làm tuần tự trong một phiên
  → /dev-kit:recheck-spec    chấm từng yêu cầu ✅/⚠️/❌
  → /dev-kit:code-review     review diff; --fix để sửa
  → /dev-kit:create-pr       commit + push + PR; --vi cho tiếng Việt
Chỉ commit: /dev-kit:commit
Bug: /dev-kit:fix-bug
Không hiểu code: /dev-kit:explain-code
Không có spec, mô tả cụ thể: bắt đầu từ /dev-kit:check-spec <mô tả>
Không có spec, chỉ có ý tưởng: bắt đầu từ /dev-kit:brainstorm
```

### check-spec và brainstorm khác nhau thế nào?
Hai skill bổ sung cho nhau, không thay thế nhau:

| | `/dev-kit:check-spec` | `/dev-kit:brainstorm` |
|---|---|---|
| Trả lời câu hỏi | Spec yêu cầu **gì**, chỗ nào thiếu hoặc mâu thuẫn | Làm **thế nào**, chọn phương án nào |
| Đầu ra | `*-spec-check.md`: nguồn đúng cho **yêu cầu** | `docs/specs/*-design.md`: nguồn đúng cho **cách làm** |
| Sau khi code | `/dev-kit:recheck-spec` chấm theo file này | Không có |

Khi gọi brainstorm hoặc write-plan sau check-spec, luôn trỏ tới file spec-check để skill không hỏi lại phần đã chốt.

### Nên bắt đầu từ check-spec hay brainstorm?
Chọn theo việc **bạn đã biết rõ cần làm gì chưa**, không theo việc có docs hay không.

| Tình huống | Bắt đầu từ | Ví dụ |
|---|---|---|
| Có spec / ticket / checklist / AC | `/dev-kit:check-spec <spec>` | `docs/specs/checkout.pdf`, ticket Jira dán vào |
| Không có docs, nhưng mô tả đã cụ thể: kể ra được từng việc cần có, kiểm tra được đúng/sai | `/dev-kit:check-spec <mô tả>` | "Thêm filter theo khoảng ngày cho trang đơn hàng, mặc định 7 ngày gần nhất, giữ filter khi chuyển trang" |
| Chỉ có ý tưởng, chưa rõ làm gì, cho ai, vì sao | `/dev-kit:brainstorm <ý tưởng>` | "Muốn có tính năng thông báo cho user" |
| Biết làm gì nhưng chưa biết làm thế nào | `/dev-kit:check-spec` → `/dev-kit:brainstorm <spec-check>` | "Áp mã giảm giá ở checkout", chưa chọn tính giá ở BE hay FE |
| Việc nhỏ, đủ thông tin, chỉ một cách làm | Không cần skill, nói "làm luôn" | "Đổi màu nút Lưu sang xanh" |

Mẹo nhận biết: thử viết ra 3–5 dòng "xong khi…". Viết được → check-spec. Không viết được → brainstorm.

Khi chạy check-spec chỉ với mô tả:
- Skill tự đánh ID `R1`, `R2`… cho từng ý trong mô tả. Mô tả càng ngắn thì phần **Câu hỏi mở** càng dài, vì skill không tự bịa yêu cầu bạn chưa nói.
- File kết quả nằm ở `docs/spec-checks/<slug>-spec-check.md`.
- Repo chưa có CLAUDE.md hay docs vẫn chạy được; skill dò phạm vi code bằng từ khoá trong mô tả.

Khi bắt đầu từ brainstorm (không qua check-spec): sẽ không có file spec-check, nên `/dev-kit:recheck-spec` lúc cuối phải trích yêu cầu từ design doc. Muốn chấm chặt theo từng ID thì sau khi design doc được duyệt, chạy `/dev-kit:check-spec <design doc>` trước `/dev-kit:write-plan`.

---

- [1. Cài đặt](#1-cài-đặt)
- [2. Áp dev-kit cho một repo — `/dev-kit:setup`](#2-áp-dev-kit-cho-một-repo--dev-kitsetup)
- [3. Chốt yêu cầu — `/dev-kit:check-spec`](#3-chốt-yêu-cầu--dev-kitcheck-spec)
- [4. Bàn cách làm — `/dev-kit:brainstorm`](#4-bàn-cách-làm--dev-kitbrainstorm)
- [5. Lập plan — `/dev-kit:write-plan`](#5-lập-plan--dev-kitwrite-plan)
- [6. Triển khai plan — `/dev-kit:execute-plan`](#6-triển-khai-plan--dev-kitexecute-plan)
- [7. Chấm spec sau khi code — `/dev-kit:recheck-spec`](#7-chấm-spec-sau-khi-code--dev-kitrecheck-spec)
- [8. Review — `/dev-kit:code-review`](#8-review--dev-kitcode-review)
- [9. Commit và PR — `/dev-kit:commit`, `/dev-kit:create-pr`](#9-commit-và-pr--dev-kitcommit-dev-kitcreate-pr)
- [10. Sửa bug — `/dev-kit:fix-bug`](#10-sửa-bug--dev-kitfix-bug)
- [11. Giải thích code — `/dev-kit:explain-code`](#11-giải-thích-code--dev-kitexplain-code)
- [12. Hook verify-gate](#12-hook-verify-gate)
- [13. Ví dụ một task từ đầu đến cuối](#13-ví-dụ-một-task-từ-đầu-đến-cuối)
- [14. Xử lý sự cố](#14-xử-lý-sự-cố)
- [15. Câu hỏi thường gặp](#15-câu-hỏi-thường-gặp)

---

## 1. Cài đặt

### Yêu cầu
- Claude Code (CLI, VS Code extension hoặc desktop app).
- `node` có trong `PATH`, vì hook verify-gate chạy bằng Node.
- `git`: verify-gate chỉ hoạt động trong git repo.
- `gh` (GitHub CLI) đã đăng nhập, nếu dùng `/dev-kit:create-pr` hoặc review PR theo số.

### Cài plugin đi kèm (khuyến nghị)
```
/plugin install security-guidance@claude-plugins-official
```
Plugin này cảnh báo bảo mật chạy ngầm. dev-kit vẫn chạy đủ flow khi không cài nó.

### Cài dev-kit

Từ GitHub (cho cả team):
```
/plugin marketplace add <owner>/dev-kit
/plugin install dev-kit@dev-kit
```

Từ thư mục local (khi đang phát triển chính dev-kit):
```
/plugin marketplace add <đường dẫn tới thư mục dev-kit>
/plugin install dev-kit@dev-kit
```

Khởi động lại phiên Claude Code. Gõ `/dev-kit:` để kiểm tra; danh sách gợi ý phải có đủ 11 skill: `setup`, `check-spec`, `brainstorm`, `write-plan`, `execute-plan`, `recheck-spec`, `code-review`, `commit`, `create-pr`, `fix-bug`, `explain-code`.

### Cập nhật và gỡ cài đặt
```
/plugin marketplace update dev-kit     # lấy bản mới, rồi khởi động lại phiên
/plugin uninstall dev-kit@dev-kit
/plugin marketplace remove dev-kit
```

---

## 2. Áp dev-kit cho một repo — `/dev-kit:setup`

Chạy **một lần cho mỗi repo**, với repo mới hoặc repo đang có code.

```
/dev-kit:setup
/dev-kit:setup apps/api        # chỉ định thư mục khác thư mục hiện tại
```

Bạn cũng có thể nói tự nhiên: "setup dev-kit cho repo này", "bật giới hạn độ phức tạp".

### Skill sẽ làm gì

| Bước | Việc | Bạn cần làm |
|---|---|---|
| 1. Khảo sát | Nhận diện stack, package manager và lệnh verify (ưu tiên lệnh CI đang chạy); đọc CLAUDE.md, config lint, file chuẩn có sẵn. Bước này chỉ đọc. | — |
| 2. Đề xuất | Trình bày bảng *hiện trạng → đề xuất* cho từng hạng mục, kể cả dependency mới (nếu có). | **Duyệt** hoặc chỉnh |
| 3. Áp dụng | Thêm rule lint độ phức tạp, đo số vi phạm có sẵn, tạo/bổ sung các file bên dưới. | Chọn cách xử lý vi phạm cũ (xem dưới) |
| 4. Verify | Chạy từng lệnh verify, báo kết quả. | Review rồi tự commit |

Skill **không ghi đè** file bạn đã có (chỉ đề xuất phần bổ sung), **không tự cài dependency** khi chưa hỏi bạn, và **không commit**.

### File được tạo hoặc bổ sung

| File | Nội dung | Commit? |
|---|---|---|
| `CLAUDE.md` | Khoảng 30 dòng: stack, link tới chuẩn code, ngưỡng độ phức tạp, lệnh verify, nơi để spec | Có |
| `docs/code-standards.md` | Chuẩn code của repo, điền theo cấu trúc và quy ước thật đang dùng | Có |
| `docs/tech-debt.md` | Baseline verify, vi phạm độ phức tạp có sẵn, bug đã biết, backlog nợ kỹ thuật | Có |
| `.claude/verify.json` | Danh sách lệnh cho hook verify-gate | **Có** (cả team dùng chung) |
| Config lint (`eslint.config.*`, `pyproject.toml`, `.golangci.yml`...) | Preset ngưỡng theo stack, xem [lint-presets.md](../skills/setup/references/lint-presets.md) | Có |

### Khi repo đã có sẵn vi phạm độ phức tạp
Skill sẽ hỏi bạn chọn một trong hai:
- **(a) Sửa dần**: liệt kê vi phạm vào `docs/tech-debt.md` và tạm loại trừ **đúng các file đó** khỏi lint. Khi sửa file nào thì gỡ file đó khỏi danh sách loại trừ. Phù hợp với repo lớn.
- **(b) Sửa ngay**: refactor từng file, có test để giữ nguyên hành vi.

### Ngưỡng độ phức tạp
Hàm ≤ 50 dòng · cyclomatic ≤ 10 · cognitive ≤ 15 · lồng ≤ 3 · tham số ≤ 4 · file ≤ 300 dòng. Repo chỉ được **siết chặt hơn**, không nới ra. Test, migration và file sinh tự động không bị áp ngưỡng.

---

## 3. Chốt yêu cầu — `/dev-kit:check-spec`

Dùng **trước khi code** cho task có tài liệu yêu cầu (spec, ticket, checklist, AC), hoặc chỉ có mô tả nhưng mô tả đã cụ thể. Mô tả còn mơ hồ thì dùng `/dev-kit:brainstorm` (xem [Nên bắt đầu từ check-spec hay brainstorm?](#nên-bắt-đầu-từ-check-spec-hay-brainstorm)). Skill **không sửa code** và không bàn cách làm.

### Cú pháp
```
/dev-kit:check-spec [đường dẫn spec] [nội dung task / AC]
```
- Spec hỗ trợ `.md`, `.txt`, `.pdf`, `.docx`. Đường dẫn tính từ root repo, có thể viết `@docs/...`.
- Nội dung task có thể dán nhiều dòng gồm Goal, Checklist, AC và các ID như `UC_01`, `BR3`.
- Phải có ít nhất spec **hoặc** nội dung task.

Ví dụ:
```
/dev-kit:check-spec docs/specs/checkout.pdf
Goal: cho phép áp mã giảm giá ở bước thanh toán
AC1: mã hết hạn hiển thị "Mã giảm giá đã hết hạn"
AC2: mỗi đơn chỉ áp 1 mã
```

Không có spec, chỉ có mô tả:
```
/dev-kit:check-spec Thêm filter theo khoảng ngày cho trang đơn hàng, mặc định 7 ngày gần nhất, giữ filter khi chuyển trang
```

### Kết quả
- Danh sách yêu cầu có ID (`R1`, `R2`... nếu spec chưa đánh ID). Text bắt buộc như thông báo lỗi, label hay tên field được chép **nguyên văn**.
- Phần nào **đã có sẵn** trong code để tái dùng (kèm `file:line`), phần nào phải sửa hoặc làm mới.
- **Edge case** spec chưa nói tới: input rỗng, trùng lặp, quyền, phân trang, timeout, concurrency, dữ liệu cũ.
- **Câu hỏi mở** cần hỏi PM, design hoặc BE. Skill không tự bịa câu trả lời.
- Phạm vi in-scope / out-of-scope.

→ Chốt hết câu hỏi mở (trả lời trong chat, skill ghi vào file) rồi mới bắt đầu. Bước tiếp: làm luôn (task nhỏ), `/dev-kit:write-plan <spec-check>` (task lớn), hoặc `/dev-kit:brainstorm <spec-check>` (còn phải chọn cách làm).

### File kết quả
- Có file spec: `<thư mục chứa spec>/<slug>-spec-check.md`, ví dụ `docs/specs/ap-ma-giam-gia-spec-check.md`.
- Không có file spec: `docs/spec-checks/<slug>-spec-check.md`.

File gồm các mục: Tổng quan (bảng ID / hiện trạng) · Chi tiết từng yêu cầu · Edge case · Câu hỏi mở · Phạm vi · Thứ tự đề xuất. Sau khi code, `/dev-kit:recheck-spec` thêm kết quả chấm vào cuối file này. Nên commit file cùng PR để reviewer xem.

---

## 4. Bàn cách làm — `/dev-kit:brainstorm`

Dùng khi còn phải **chọn cách làm**, hoặc khi chỉ có ý tưởng, chưa rõ cần làm gì.

```
/dev-kit:brainstorm docs/specs/ap-ma-giam-gia-spec-check.md
/dev-kit:brainstorm Muốn có trang thống kê doanh thu theo tuần cho admin
```

Skill sẽ:
1. Đọc spec-check, code liên quan, CLAUDE.md trước khi hỏi. Không hỏi lại điều spec-check hoặc code đã trả lời.
2. Nhắc lại yêu cầu bằng lời của nó để bạn sửa, rồi hỏi **từng câu một**, ưu tiên câu về "vì sao" và điểm làm thay đổi thứ được build.
3. Đưa 2–3 phương án kèm đánh đổi và khuyến nghị, trong một tin nhắn riêng, để bạn chọn.
4. Viết design doc vào `docs/specs/YYYY-MM-DD-<slug>-design.md` (ngắn cho thay đổi nhỏ, đầy đủ cho dự án), tự rà, rồi đưa bạn duyệt.

Skill **không code** cho tới khi bạn duyệt design doc. Cần xem giao diện thì skill phác thảo bằng ASCII trong chat. Muốn bỏ phần hỏi đáp thì nói *"làm luôn"*: skill nêu các lựa chọn lớn nó tự quyết rồi làm.

Bước tiếp: `/dev-kit:write-plan <design doc>`.

---

## 5. Lập plan — `/dev-kit:write-plan`

```
/dev-kit:write-plan docs/specs/2026-11-27-ap-ma-giam-gia-design.md
/dev-kit:write-plan docs/specs/2026-11-27-ap-ma-giam-gia-design.md --skip-test
```

Plan lưu ở `docs/plans/YYYY-MM-DD-<slug>.md`, gồm:
- Header: Goal, Architecture, Tech Stack, link Spec / Spec-check, **Chế độ test**.
- **Ràng buộc chung** chép nguyên văn từ spec, và **Điểm cần soát kỹ** (input / tình huống lỗi dễ gây hại mà spec chưa nói tới).
- Các task, mỗi task có file cần tạo/sửa, interface dùng và cung cấp, các bước checkbox nhỏ (2–5 phút), lệnh chạy kèm kết quả mong đợi, và bước commit.

### Hai chế độ test

| | Mặc định (TDD) | `--skip-test` |
|---|---|---|
| Khi nào | Logic nghiệp vụ, API, hàm có input/output rõ | Task UI thuần, config, script một lần, hoặc bạn không muốn viết file test |
| Mỗi task | Viết test → chạy thấy fail → code → chạy thấy pass → commit | Code → chạy lệnh trong `.claude/verify.json` (lint, typecheck, test đang có) → **kiểm tra tay** → commit |
| Kiểm tra tay | Chỉ cho task không test tự động được | Mỗi task có bước cụ thể: thao tác gì, mong đợi thấy gì |

Skill tự rà plan so với spec (yêu cầu nào chưa có task, bước mơ hồ, tên hàm lệch giữa các task) trước khi đưa bạn duyệt. Bước tiếp: `/dev-kit:execute-plan <plan>`.

---

## 6. Triển khai plan — `/dev-kit:execute-plan`

```
/dev-kit:execute-plan docs/plans/2026-11-27-ap-ma-giam-gia.md
```

- Đang ở main/master → skill tạo branch mới trước khi sửa code.
- Làm **tuần tự** từng task trong phiên hiện tại, không dừng hỏi giữa các task. Chỉ dừng khi gặp thao tác không đảo ngược được, liên quan bảo mật, tác động ra ngoài repo (push, publish), hoặc plan hỏng tới mức không đi tiếp được.
- Mỗi bước có lệnh thì chạy và so output với `Expected`. Tick checkbox trong file plan và commit cuối mỗi task, nên phiên bị ngắt hoặc compact vẫn làm tiếp đúng chỗ.
- Chế độ TDD: không có code khi chưa thấy test fail. Chế độ skip-test: chạy toàn bộ verify, gom các bước kiểm tra tay cần người làm để đưa bạn ở cuối.
- Plan sai chỗ nào → skill tự quyết theo spec và ghi vào mục **Quyết định khi triển khai** ở cuối plan.
- Xong hết → chạy lại verify, tự review toàn branch, sửa lỗi quan trọng, rồi báo: các quyết định đã đưa ra, kiểm tra tay bạn cần làm, lỗi nhỏ để lại.

Bước tiếp: `/dev-kit:recheck-spec` (nếu có spec-check), rồi `/dev-kit:code-review`.

---

## 7. Chấm spec sau khi code — `/dev-kit:recheck-spec`

```
/dev-kit:recheck-spec docs/specs/ap-ma-giam-gia-spec-check.md
/dev-kit:recheck-spec docs/specs/checkout.pdf      # tự tìm spec-check cùng thư mục
```

Skill chấm từng yêu cầu trong spec-check:

| Ký hiệu | Nghĩa |
|---|---|
| ✅ | Đạt, có bằng chứng `file:line`. Không có bằng chứng thì không được chấm ✅. |
| ⚠️ | Đạt một phần, hoặc text lệch so với spec |
| ❌ | Thiếu |
| ❓ | Không kiểm chứng được từ code, cần test tay hoặc hỏi PM |

Ngoài ra skill còn:
- Chạy lệnh verify ở chế độ chỉ đọc (không `--fix`). Lỗi thuộc task được ghi là **Blocker**; lỗi có sẵn từ trước được ghi riêng.
- Ghi chú yêu cầu nghiệp vụ quan trọng nhưng chưa có test.
- Liệt kê **phần làm thừa**: thay đổi trong diff không thuộc yêu cầu nào (dấu hiệu scope creep).

Kết quả được thêm vào cuối file spec-check dưới mục `## Kết quả recheck <ngày>`; mỗi lần chạy thêm một mục mới để thấy tiến độ. `/dev-kit:create-pr` đọc mục mới nhất để đưa vào mô tả PR. Chưa có spec-check thì skill trích yêu cầu từ spec gốc, tạo file rồi chấm. Skill **không sửa code**.

---

## 8. Review — `/dev-kit:code-review`

```
/dev-kit:code-review              # diff branch hiện tại so với main, kể cả chưa commit
/dev-kit:code-review --fix        # review rồi sửa luôn các lỗi đã kiểm chứng
/dev-kit:code-review 42           # review PR #42 (cần gh)
```

- Đọc CLAUDE.md, code-standards, plan / spec-check (nếu có), và đọc cả hàm bao quanh chỗ đổi, không chỉ dòng `+`.
- Soát theo checklist: logic và edge case, bảo mật, breaking change, dữ liệu/migration, hiệu năng, xử lý lỗi, test, rule của repo và ngưỡng độ phức tạp, code thừa.
- **Mỗi lỗi được kiểm chứng** trước khi báo: phải có kịch bản cụ thể (input nào → sai gì). Chưa chứng minh được thì gắn nhãn `nghi ngờ`.
- Kết quả trong chat, xếp theo: **quan trọng** (bug do thay đổi này, bảo mật, mất dữ liệu) · **có sẵn từ trước** · **nhỏ**, mỗi lỗi có link `file:line` và cách sửa.
- `--fix`: sửa lỗi quan trọng và nhỏ đã kiểm chứng, ghi lỗi có sẵn từ trước vào `docs/tech-debt.md`, chạy verify, báo từng lỗi đã sửa / bỏ qua. Không commit.

Có góp ý review từ người khác? Dán vào và nói "xử lý review này": skill kiểm tra từng góp ý trên code thật, hỏi lại mục chưa rõ trước khi sửa, phản biện có bằng chứng nếu góp ý sai.

---

## 9. Commit và PR — `/dev-kit:commit`, `/dev-kit:create-pr`

### `/dev-kit:commit`
```
/dev-kit:commit
/dev-kit:commit --vi
```
- Theo rule commit của repo (commitlint, CLAUDE.md, CONTRIBUTING, kiểu commit trong `git log`). Không có rule → conventional commits `type(scope): subject`.
- Mặc định tiếng Anh; `--vi` viết tiếng Việt (giữ `type(scope):`).
- Thay đổi tách rời rõ ràng → chia nhiều commit.
- Không commit file chứa secret (`.env`, key, credentials, `settings.local.json`); gặp thì bỏ ra và cảnh báo.
- Không push, không `--amend`, không `--no-verify`. Hook pre-commit fail → sửa nguyên nhân rồi tạo commit mới.

### `/dev-kit:create-pr`
```
/dev-kit:create-pr
/dev-kit:create-pr --vi --draft
/dev-kit:create-pr --base develop
```
1. Đang ở main → tạo branch theo quy ước của repo.
2. Còn thay đổi chưa commit → commit theo `/dev-kit:commit`.
3. Push với `-u`. Không force push.
4. Tạo PR bằng `gh`, điền theo PR template của repo nếu có. Branch đã có PR đang mở → cập nhật mô tả.

Mô tả PR gồm: tóm tắt, **các mục đã làm** (lấy từ plan, spec-check hoặc diff), cách test (lệnh verify đã chạy, bước kiểm tra tay), kết quả recheck-spec, và ghi chú (quyết định khi triển khai, breaking change, việc cần làm sau merge). Skill không bao giờ merge PR.

---

## 10. Sửa bug — `/dev-kit:fix-bug`

```
/dev-kit:fix-bug Đăng nhập bằng Google trên staging trả 500, log: TypeError: Cannot read properties of undefined (reading 'email') at auth.service.ts:88
```
Bạn cũng có thể dán thẳng stack trace hoặc log và nói "sửa lỗi này". Càng nhiều thông tin (bước tái hiện, môi trường, bắt đầu lỗi từ khi nào) thì càng nhanh.

### Quy trình

| Bước | Việc | Dừng chờ bạn? |
|---|---|---|
| 1. Tái hiện | Gom thông tin, đọc `docs/tech-debt.md` (có thể bug đã được ghi nhận), tái hiện bằng test, script hoặc log | Chỉ hỏi **một lần** nếu thiếu thông tin |
| 2. Nguyên nhân gốc | Lần ngược theo call stack tới nơi giá trị sai xuất hiện lần đầu, instrument ranh giới giữa các tầng, mỗi lần thử một giả thuyết, `git bisect` nếu là regression; 3 lần thử thất bại → dừng bàn với bạn | Chỉ khi thử 3 lần không ra |
| 3. Đề xuất | Trình bày ngắn: Nguyên nhân · Cách sửa · Ảnh hưởng · Test · Ngoài phạm vi | **Có**, trừ khi bạn đã nói "sửa luôn" |
| 4. Test hồi quy | Viết test tái hiện bug, test phải **fail** đúng lý do | — |
| 5. Sửa | Sửa tối thiểu tại nguyên nhân gốc | — |
| 6. Verify | Test hồi quy pass, toàn bộ verify sạch | — |
| 7. Báo cáo | Nguyên nhân, thay đổi, test, việc bạn cần làm thêm; cập nhật `tech-debt.md` | — |

### Skill sẽ không làm
- Đoán rồi sửa thử nhiều lần. Nếu không tái hiện được, skill đưa ra giả thuyết có xếp hạng kèm cách kiểm chứng.
- Bọc `try/catch` nuốt lỗi hoặc thêm `if` đặc biệt để che triệu chứng.
- Refactor kèm theo. Nợ kỹ thuật phát hiện được sẽ ghi vào `docs/tech-debt.md`.
- Trộn việc dọn dữ liệu hỏng vào code runtime. Nếu cần, skill đề xuất script cleanup riêng, chạy tay và idempotent.

---

## 11. Giải thích code — `/dev-kit:explain-code`

```
/dev-kit:explain-code src/orders/order.service.ts:120-160 sao lại phải retry 3 lần ở đây?
```
Dùng khi code **chạy được** nhưng bạn không hiểu vì sao AI (hoặc ai đó) viết như vậy, hoặc nghi có cách tốt hơn. Có thể truyền `file:line`, tên hàm, commit, đoạn code dán vào, hoặc bôi đen code trong IDE rồi hỏi "sao viết vậy".

### Quy trình

| Bước | Việc | Dừng chờ bạn? |
|---|---|---|
| 1. Xác định | Đoạn code nào, câu hỏi thật là gì (làm gì / vì sao / có cần không / có cách tốt hơn không) | Chỉ hỏi 1 câu nếu chưa rõ |
| 2. Hiểu code | Đọc code, nơi gọi, nơi bị gọi, test liên quan; tóm luồng | — |
| 3. Tìm lý do | `git blame` / `git log`, plan, design doc, spec-check, tech-debt, CLAUDE.md, ngưỡng độ phức tạp, pattern của repo; kiểm chứng từng lý do | — |
| 4. Đánh giá | Soi phòng thủ thừa, abstraction thừa, tự viết lại helper có sẵn, lệch pattern, code chết, rủi ro thật | — |
| 5. Đề xuất | Tối đa 2 phương án cụ thể với repo + đánh đổi + khuyến nghị, hoặc "giữ nguyên" | — |
| 6. Trả lời | Luồng · Vì sao (**có bằng chứng** / **suy luận** / **không có lý do**) · Đánh giá · Đề xuất | **Có** |
| 7. Sau khi chọn | Thay đổi nhỏ: test chốt hành vi → sửa → verify. Lớn: `/dev-kit:brainstorm` hoặc ghi tech-debt. Là bug: `/dev-kit:fix-bug` | — |

### Khác `fix-bug` thế nào?
| | `/dev-kit:fix-bug` | `/dev-kit:explain-code` |
|---|---|---|
| Khi nào | Code chạy **sai** | Code chạy được nhưng **khó hiểu** hoặc nghi chưa tối ưu |
| Đầu ra | Bản sửa + test hồi quy | Giải thích có nguồn + đề xuất; chỉ sửa khi bạn chọn |

### Skill sẽ không làm
- Bịa lý do cho hợp lý. Không tìm thấy lý do thì nói thẳng, kể cả khi chính Claude viết đoạn đó.
- Sửa code trước khi bạn chọn phương án.
- Đổi kiến trúc hay sửa bug trong skill này; việc đó chuyển sang `brainstorm` hoặc `fix-bug`.

---

## 12. Hook verify-gate

Hook chặn Claude báo "xong" khi typecheck, lint hoặc test còn fail. Bạn không cần gọi nó; hook tự chạy.

### Điều kiện hoạt động
Hook chỉ chạy khi **đủ cả ba** điều kiện:
1. Thư mục làm việc nằm trong git repo.
2. Repo có `.claude/verify.json` với `commands` không rỗng.
3. Biến môi trường `DEV_KIT_VERIFY` khác `off`.

Thiếu một điều kiện thì hook không làm gì, nên cài dev-kit không ảnh hưởng tới repo chưa setup.

### Cách hoạt động
```
Mở phiên (startup / resume / /clear)
  └─► ghi "dấu vân tay" working tree = git diff HEAD + danh sách file untracked

Mỗi lần Claude định kết thúc lượt
  ├─ working tree giống lúc mở phiên, hoặc giống lần pass gần nhất → bỏ qua (không tốn thời gian)
  └─ khác → chạy lần lượt từng lệnh trong verify.json, dừng ở lệnh fail đầu tiên
        ├─ tất cả pass → ghi nhận "lần pass gần nhất", cho dừng
        ├─ fail, chưa quá maxAttempts → chặn dừng, gửi ~80 dòng cuối output cho Claude sửa tiếp
        └─ fail quá maxAttempts lần liên tiếp → cho dừng và hiện thông báo để bạn tự xem
```
Khi bị chặn, Claude được dặn phải sửa thật: không tắt rule, không thêm `eslint-disable` hay `noqa` để lách. Nếu thật sự không sửa được, Claude phải giải thích lý do cho bạn.

### `.claude/verify.json`

```json
{
  "commands": ["npm run typecheck", "npm run lint:check", "npm test"],
  "maxAttempts": 3,
  "timeoutSec": 600
}
```

| Trường | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `commands` | Có | — | Lệnh chạy tuần tự từ root repo. Exit code ≠ 0 là fail. |
| `maxAttempts` | Không | `3` | Số lần fail liên tiếp tối đa trước khi cho dừng |
| `timeoutSec` | Không | `600` | Timeout cho **mỗi** lệnh, tính bằng giây |

Nguyên tắc chọn lệnh:
- Lệnh nhanh đặt trước, lệnh chậm đặt sau: typecheck → lint → test.
- Lint phải **fail khi có warning**, ví dụ ESLint `--max-warnings 0`. Nếu không, các rule độ phức tạp ở mức warn sẽ không chặn được gì.
- Không dùng lệnh auto-fix (`--fix`) và không đưa e2e hay build Docker vào. Chỉ dùng lệnh chạy xong trong vài phút.
- **Tổng thời gian** mọi lệnh phải dưới 15 phút, vì giới hạn của hook là 900 giây.

Ví dụ cho các stack khác:

```jsonc
// Python
{ "commands": ["uv run mypy .", "uv run ruff check .", "uv run pytest -q"] }

// Go
{ "commands": ["go build ./...", "golangci-lint run", "go test ./..."] }

// Java / Gradle
{ "commands": ["./gradlew check"] }

// Monorepo pnpm + turbo
{ "commands": ["pnpm turbo run typecheck lint test"] }
```

> **Windows:** lệnh được chạy qua shell mặc định của hệ thống (`cmd.exe`). Các lệnh như `npm run ...`, `pnpm ...` hay `go ...` chạy bình thường. Cú pháp riêng của bash như `./script.sh` hay `VAR=x cmd` sẽ không chạy; hãy bọc chúng thành script trong `package.json` hoặc `Makefile`.

### Tắt tạm thời
Đặt biến môi trường `DEV_KIT_VERIFY=off` **trước khi** mở Claude Code:
```powershell
$env:DEV_KIT_VERIFY = "off"; claude      # PowerShell
```
```bash
DEV_KIT_VERIFY=off claude                # bash / zsh
```
Để tắt lâu dài cho riêng máy bạn, thêm `"env": { "DEV_KIT_VERIFY": "off" }` vào `.claude/settings.local.json`. Đừng xoá `verify.json` vì file này dùng chung cho cả team.

---

## 13. Ví dụ một task từ đầu đến cuối

Task: *"Thêm áp mã giảm giá ở checkout"*, spec ở `docs/specs/checkout.pdf`. Repo đã chạy `/dev-kit:setup` từ trước.

```
1. /dev-kit:check-spec docs/specs/checkout.pdf
   → docs/specs/ap-ma-giam-gia-spec-check.md: 8 yêu cầu, 3 câu hỏi mở
   → hỏi PM, trả lời trong chat, skill ghi vào file spec-check

2. Còn phải chọn: tính giá giảm ở BE hay FE?
   /dev-kit:brainstorm docs/specs/ap-ma-giam-gia-spec-check.md
   → chọn "tính ở BE" → docs/specs/2026-11-27-ap-ma-giam-gia-design.md → bạn duyệt
   (Nếu chỉ có một cách làm hợp lý: bỏ bước này, gọi thẳng /dev-kit:write-plan <spec-check>)

3. /dev-kit:write-plan docs/specs/2026-11-27-ap-ma-giam-gia-design.md
   → docs/plans/2026-11-27-ap-ma-giam-gia.md: 5 task, Chế độ test: TDD

4. /dev-kit:execute-plan docs/plans/2026-11-27-ap-ma-giam-gia.md
   → tạo branch feat/ap-ma-giam-gia, từng task: test fail → code → pass → commit

5. Claude định báo xong → verify-gate chạy
   → lint fail: hàm applyCoupon 72 dòng > 50 → Claude tự tách hàm → chạy lại, pass

6. /dev-kit:recheck-spec docs/specs/ap-ma-giam-gia-spec-check.md
   → 7 ✅ · 1 ⚠️ (text lỗi lệch spec) → sửa → chạy lại → 8 ✅

7. /dev-kit:code-review --fix
8. /dev-kit:create-pr --vi
```

Task nhỏ, chỉ có một cách làm: sau bước 1 gõ `Làm task theo <spec-check>, không cần brainstorm, làm luôn`, rồi nhảy tới bước 5.

Task UI không cần file test: ở bước 3 thêm `--skip-test`; bước 4 sẽ chạy lint/typecheck/test có sẵn và cuối cùng đưa bạn danh sách kiểm tra tay.

Gặp bug trong lúc làm: dùng `/dev-kit:fix-bug <mô tả>`, xong quay lại bước đang dở. Không hiểu đoạn code Claude vừa viết: `/dev-kit:explain-code <file:line>`.

---

## 14. Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Hook không chạy | Repo thiếu `.claude/verify.json`, không phải git repo, hoặc `DEV_KIT_VERIFY=off` đang được đặt | Chạy `/dev-kit:setup`; kiểm tra `git status`; kiểm tra env |
| Hook không chạy dù đã có file | `commands` rỗng, JSON sai cú pháp, hoặc plugin chưa được nạp | Kiểm tra JSON; chạy `/plugin` để xem dev-kit đã bật chưa; khởi động lại phiên |
| `node: command not found` | Node chưa có trong `PATH` của Claude Code | Cài Node hoặc thêm vào `PATH`, rồi mở lại Claude Code |
| Claude bị chặn liên tục vì lỗi không liên quan task | Repo có lỗi lint/test từ trước, chưa ghi vào baseline | Ghi vào `docs/tech-debt.md` và loại trừ đúng file đó, hoặc sửa lỗi trước; tạm thời có thể tắt hook |
| Hook "chạy mãi" hoặc bị ngắt giữa chừng | Lệnh verify quá chậm, tổng thời gian vượt 15 phút | Bỏ e2e và build khỏi `commands`; dùng lệnh chỉ chạy phần bị ảnh hưởng (`nx affected`, `turbo --filter`) |
| Đã sửa xong nhưng hook vẫn không chạy lại | Working tree giống hệt lần pass gần nhất nên hook bỏ qua (đây là hành vi đúng) | — |
| Muốn reset trạng thái hook | State lưu ở `<thư mục temp>/dev-kit-verify/<session-id>.json` | Xoá file đó, hoặc mở phiên mới / gõ `/clear` |
| Lệnh chạy được ở terminal nhưng fail trong hook (Windows) | Hook chạy qua `cmd.exe`, không phải bash/PowerShell | Bọc lệnh thành script `npm run ...` hoặc `make ...` |
| `/dev-kit:...` không hiện trong gợi ý | Chưa cài, hoặc chưa khởi động lại sau khi cài/cập nhật | `/plugin install dev-kit@dev-kit` rồi khởi động lại phiên |

---

## 15. Câu hỏi thường gặp

**Cài dev-kit có làm chậm repo chưa setup không?**
Không. Ở repo không có `.claude/verify.json`, hook thoát ngay.

**Có tự động sửa code khi lint fail không?**
Hook chỉ chặn và gửi lỗi cho Claude. Claude sẽ sửa trong lượt tiếp theo, giống như khi bạn báo lỗi cho Claude.

**Tôi tự sửa file ngoài Claude thì hook có chạy không?**
Có. Hook so sánh working tree, không phân biệt ai sửa. Khi Claude kết thúc lượt tiếp theo, mọi thay đổi đều được verify.

**Có thể nới ngưỡng độ phức tạp cho repo của tôi không?**
dev-kit chỉ cho phép siết chặt hơn. Với code cũ vi phạm, hãy dùng cơ chế "sửa dần" (loại trừ từng file, ghi vào tech-debt) thay vì nới ngưỡng.

**check-spec có đọc được Google Docs hoặc Confluence không?**
Không trực tiếp. Hãy export ra `.pdf`, `.md` hoặc `.docx` rồi đặt vào repo, hoặc dán nội dung vào lệnh.

**Phát triển dev-kit thì test thế nào?**
Chạy `npm test` ở thư mục dev-kit (test hook verify-gate, script detect-stack và cấu trúc skill bằng `node:test`, không cần cài dependency). Sau khi sửa, chạy `/plugin marketplace update dev-kit` rồi khởi động lại phiên để dùng bản mới.
