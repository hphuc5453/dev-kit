# Hướng dẫn sử dụng dev-kit

Tài liệu cho dev dùng dev-kit trong project hằng ngày. Tổng quan và lệnh cài nhanh: [README](../README.md).

- [1. Cài đặt](#1-cài-đặt)
- [2. Áp dev-kit cho một repo — `/dev-kit:setup`](#2-áp-dev-kit-cho-một-repo--dev-kitsetup)
- [3. Đối chiếu spec — `/dev-kit:check-spec`](#3-đối-chiếu-spec--dev-kitcheck-spec)
- [4. Sửa bug — `/dev-kit:fix-bug`](#4-sửa-bug--dev-kitfix-bug)
- [5. Hook verify-gate](#5-hook-verify-gate)
- [6. Ví dụ một task từ đầu đến cuối](#6-ví-dụ-một-task-từ-đầu-đến-cuối)
- [7. Xử lý sự cố](#7-xử-lý-sự-cố)
- [8. Câu hỏi thường gặp](#8-câu-hỏi-thường-gặp)

---

## 1. Cài đặt

### Yêu cầu
- Claude Code (CLI, VS Code extension hoặc desktop app).
- `node` có trong `PATH`, vì hook verify-gate chạy bằng Node.
- `git`: verify-gate chỉ hoạt động trong git repo.

### Cài plugin đi kèm (khuyến nghị)
```
/plugin install superpowers@claude-plugins-official
/plugin install commit-commands@claude-plugins-official
/plugin install security-guidance@claude-plugins-official
```
dev-kit vẫn chạy khi thiếu các plugin này, nhưng sẽ thiếu bước brainstorm/plan/TDD (superpowers), lệnh commit/PR (commit-commands) và cảnh báo bảo mật (security-guidance).

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

Khởi động lại phiên Claude Code. Gõ `/dev-kit:` để kiểm tra; danh sách gợi ý phải có `setup`, `check-spec`, `fix-bug`.

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

## 3. Đối chiếu spec — `/dev-kit:check-spec`

Dùng cho task có tài liệu yêu cầu (spec, ticket, checklist, AC). Skill chạy ở hai thời điểm và **không bao giờ sửa code**.

### Cú pháp
```
/dev-kit:check-spec [trước|sau] [đường dẫn spec] [nội dung task / AC]
```
- Spec hỗ trợ `.md`, `.txt`, `.pdf`, `.docx`. Đường dẫn tính từ root repo, có thể viết `@docs/...`.
- Nội dung task có thể dán nhiều dòng gồm Goal, Checklist, AC và các ID như `UC_01`, `BR3`.
- Phải có ít nhất spec **hoặc** nội dung task.

### Chế độ TRƯỚC: chốt yêu cầu trước khi code
```
/dev-kit:check-spec trước docs/specs/checkout.pdf
Goal: cho phép áp mã giảm giá ở bước thanh toán
AC1: mã hết hạn hiển thị "Mã giảm giá đã hết hạn"
AC2: mỗi đơn chỉ áp 1 mã
```
Kết quả gồm:
- Danh sách yêu cầu có ID (`R1`, `R2`... nếu spec chưa đánh ID). Text bắt buộc như thông báo lỗi, label hay tên field được chép **nguyên văn**.
- Phần nào **đã có sẵn** trong code để tái dùng, phần nào phải làm mới.
- **Edge case** spec chưa nói tới: input rỗng, trùng lặp, quyền, phân trang, timeout, concurrency, dữ liệu cũ.
- **Câu hỏi mở** cần hỏi PM, design hoặc BE. Skill không tự bịa câu trả lời.
- Phạm vi in-scope / out-of-scope.

→ Chốt hết câu hỏi mở rồi mới bắt đầu code.

### Chế độ SAU: chấm kết quả sau khi code
```
/dev-kit:check-spec sau docs/specs/checkout.pdf
```
Skill chấm từng yêu cầu:

| Ký hiệu | Nghĩa |
|---|---|
| ✅ | Đạt, có bằng chứng `file:line`. Không có bằng chứng thì không được chấm ✅. |
| ⚠️ | Đạt một phần, hoặc text lệch so với spec |
| ❌ | Thiếu |
| ❓ | Không kiểm chứng được từ code, cần test tay hoặc hỏi PM |

Ngoài ra skill còn:
- Chạy lệnh verify ở chế độ chỉ đọc (không `--fix`). Lỗi thuộc task được ghi là **Blocker**; lỗi có sẵn từ trước được ghi là *pre-existing*.
- Ghi chú yêu cầu nghiệp vụ quan trọng nhưng chưa có test.
- Liệt kê **phần làm thừa**: thay đổi trong diff không thuộc yêu cầu nào (dấu hiệu scope creep).

### Không ghi chế độ thì sao?
- Đã có file spec-check của task này → chạy chế độ **sau** và cập nhật file đó.
- Branch đã có thay đổi liên quan → **sau**.
- Còn lại → **trước**.

### File kết quả
- Có file spec: `<thư mục chứa spec>/<slug>-spec-check.md`, ví dụ `docs/specs/ap-ma-giam-gia-spec-check.md`.
- Không có file spec: `docs/spec-checks/<slug>-spec-check.md`.

File gồm các mục: Tổng quan (bảng ID / trạng thái / bằng chứng) · Blocker verify · Chi tiết từng yêu cầu · Edge case · Câu hỏi mở · Làm thừa · Thứ tự đề xuất. Nên commit file này cùng PR để reviewer xem.

---

## 4. Sửa bug — `/dev-kit:fix-bug`

```
/dev-kit:fix-bug Đăng nhập bằng Google trên staging trả 500, log: TypeError: Cannot read properties of undefined (reading 'email') at auth.service.ts:88
```
Bạn cũng có thể dán thẳng stack trace hoặc log và nói "sửa lỗi này". Càng nhiều thông tin (bước tái hiện, môi trường, bắt đầu lỗi từ khi nào) thì càng nhanh.

### Quy trình

| Bước | Việc | Dừng chờ bạn? |
|---|---|---|
| 1. Tái hiện | Gom thông tin, đọc `docs/tech-debt.md` (có thể bug đã được ghi nhận), tái hiện bằng test, script hoặc log | Chỉ hỏi **một lần** nếu thiếu thông tin |
| 2. Nguyên nhân gốc | Lần ngược từ triệu chứng về nguồn, kiểm chứng bằng bằng chứng (log, test, `git bisect`), tìm chỗ khác có cùng nguyên nhân | — |
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

## 5. Hook verify-gate

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

## 6. Ví dụ một task từ đầu đến cuối

Task: *"Thêm áp mã giảm giá ở checkout"*, spec ở `docs/specs/checkout.pdf`. Repo đã chạy `/dev-kit:setup` từ trước.

```
1. /dev-kit:check-spec trước docs/specs/checkout.pdf
   → docs/specs/ap-ma-giam-gia-spec-check.md: 8 yêu cầu, 3 câu hỏi mở
   → hỏi PM, cập nhật câu trả lời vào spec hoặc file spec-check

2. "Làm task này theo spec-check đã chốt"
   → superpowers: brainstorm → viết plan → TDD từng bước

3. Claude định báo xong → verify-gate chạy
   → lint fail: hàm applyCoupon 72 dòng > 50 → Claude tự tách hàm → chạy lại, pass

4. /dev-kit:check-spec sau
   → 7 ✅ · 1 ⚠️ (text lỗi lệch spec) → sửa → chạy lại → 8 ✅

5. /code-review
6. /commit-commands:commit-push-pr
```

Gặp bug trong lúc làm: dùng `/dev-kit:fix-bug <mô tả>` thay cho bước 2, các bước còn lại giữ nguyên.

---

## 7. Xử lý sự cố

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

## 8. Câu hỏi thường gặp

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
Chạy `npm test` ở thư mục dev-kit (test hook verify-gate bằng `node:test`, không cần cài dependency). Sau khi sửa, chạy `/plugin marketplace update dev-kit` rồi khởi động lại phiên để dùng bản mới.
