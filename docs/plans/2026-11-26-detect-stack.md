# detect-stack Implementation Plan

> Chạy bằng `/dev-kit:execute-plan`. Các bước dùng checkbox (`- [ ]`) để theo dõi.

**Goal:** Script `detect-stack.cjs` khảo sát repo và in JSON dữ kiện (stack, package manager, monorepo, CI, lệnh verify đề xuất kèm nguồn) để `/dev-kit:setup` đọc thay vì Claude tự dò.

**Architecture:** Một entry CLI mỏng (`detect-stack.cjs`) ghép kết quả của 4 module thuần trong `skills/setup/scripts/detect/`: đọc file, nhận diện stack/monorepo, quét CI, dựng lệnh đề xuất. Mỗi module export hàm thuần nhận `root` (đường dẫn tuyệt đối), không ghi gì ra đĩa.

**Tech Stack:** Node ≥ 18, CommonJS (`.cjs`), chỉ dùng `node:fs`, `node:path`, `node:child_process`; test bằng `node:test` + `node:assert`.

**Spec:** [docs/specs/2026-11-26-detect-stack-design.md](../specs/2026-11-26-detect-stack-design.md)

## Global Constraints
- Không dependency ngoài Node built-in. Node ≥ 18. Chạy được trên Windows/macOS/Linux (dùng `path.join`, chuẩn hoá `\r\n` → `\n`).
- Mỗi hàm ≤ 50 dòng, cyclomatic ≤ 10, lồng ≤ 3, tham số ≤ 4; mỗi file ≤ 300 dòng.
- Output in ra stdout là JSON (`JSON.stringify(report, null, 2)`); exit 0. Repo không tồn tại → stdout `{ "error": "..." }`, exit 1.
- Mỗi lệnh đề xuất có `source`, một trong các dạng: `ci:<file>`, `package.json#scripts.<name>`, `pyproject.toml#tool.<name>`, `default`.
- Thứ tự ưu tiên trong mỗi nhóm lệnh: CI → script của repo → mặc định; bỏ trùng theo `command` (giữ mục xuất hiện đầu tiên).
- Bỏ qua thư mục `node_modules`, `.git`, `vendor`, `dist`, `build` khi liệt kê thư mục con.
- Text warning bằng tiếng Việt có dấu.
- **Không commit.** User tự review rồi commit; plan không có bước commit.

## Review Focus
1. File có line ending CRLF (Windows) cho `package.json`, YAML CI, `pnpm-workspace.yaml` → kết quả phải giống file LF. *(test ở Task 2)*
2. `package.json` hỏng JSON → không crash; `scripts` là `{}`, có warning `package.json không parse được`. *(test ở Task 1)*
3. Glob workspace dạng `**` hoặc phủ định `!` → bỏ qua glob đó, thêm warning, không crash. *(test ở Task 1)*
4. Block `run: |` nhiều dòng có dòng comment `#` và dòng trống → chỉ lấy các lệnh, không lấy comment. *(test ở Task 2)*
5. Thư mục không phải git repo → vẫn chạy được, `isGitRepo: false`. *(test ở Task 1)*

---

## File Structure

| File | Trách nhiệm |
|---|---|
| Create `skills/setup/scripts/detect-stack.cjs` | CLI + `buildReport(root)` ghép các module |
| Create `skills/setup/scripts/detect/fs-utils.cjs` | Đọc file/thư mục an toàn (không throw) |
| Create `skills/setup/scripts/detect/stacks.cjs` | Manifest → stack, package manager, monorepo + workspaces |
| Create `skills/setup/scripts/detect/ci.cjs` | Tìm file CI, trích lệnh, phân loại lệnh |
| Create `skills/setup/scripts/detect/candidates.cjs` | Dựng `verifyCandidates` + warning thiếu lệnh |
| Create `tests/detect-stack.test.cjs` | Test qua `buildReport` và các hàm export |
| Modify `package.json` | `"test": "node --test tests/"` |
| Modify `skills/setup/SKILL.md` | Bước 1 gọi script |
| Modify `skills/setup/references/stack-detection.md` | Ghi chú mục 1–2 đã do script làm |

Helper test dùng chung (định nghĩa ở đầu `tests/detect-stack.test.cjs` trong Task 1):
`makeFixture(files: Record<string,string>, opts?: { git?: boolean }): string` — tạo thư mục tạm, ghi từng file (tự tạo thư mục cha), `git init -q` nếu `opts.git`; trả về đường dẫn tuyệt đối.

---

### Task 1: Khung report — stack, package manager, monorepo, file có sẵn, CLI

**Files:**
- Create: `skills/setup/scripts/detect/fs-utils.cjs`, `skills/setup/scripts/detect/stacks.cjs`, `skills/setup/scripts/detect-stack.cjs`
- Create: `tests/detect-stack.test.cjs`
- Modify: `package.json` (script `test`)

**Interfaces:**
- Produces (`fs-utils.cjs`):
  - `exists(root: string, rel: string): boolean`
  - `readText(root: string, rel: string): string | null` — đã thay `\r\n` → `\n`; file không có → `null`
  - `readJson(root: string, rel: string): { value: object | null, error: boolean }` — không có file → `{ value: null, error: false }`; parse lỗi → `{ value: null, error: true }`
  - `listFiles(root: string, rel: string): string[]` — tên file trực tiếp trong thư mục, `[]` nếu không có
  - `subdirs(root: string, rel: string): string[]` — tên thư mục con trực tiếp, đã bỏ danh sách ignore
- Produces (`stacks.cjs`):
  - `detectStacks(root: string, relDir: string): Array<{ id: string, manifest: string, dir: string }>` — `dir` là `relDir` dùng dấu `/`, gốc là `"."`
  - `detectPackageManager(root: string): string | null`
  - `detectMonorepo(root: string, warnings: string[]): { tool: string, workspaces: string[] } | null`
- Produces (`detect-stack.cjs`): `buildReport(root: string): Report` với đủ các khoá trong spec; `verifyCandidates` tạm là `{ typecheck: [], lint: [], test: [] }` và `ci` tạm là `[]` (Task 2, 3 điền). `module.exports = { buildReport }`; chạy CLI chỉ khi `require.main === module`.

Bảng manifest → `id` (mỗi `id` tối đa một lần mỗi thư mục, lấy manifest đầu tiên theo thứ tự này):
`package.json`→`node` · `pyproject.toml`, `requirements.txt`, `setup.cfg`→`python` · `go.mod`→`go` · `pom.xml`→`java-maven` · `build.gradle`, `build.gradle.kts`→`java-gradle` · `composer.json`→`php` · `Cargo.toml`→`rust` · file đuôi `.csproj`/`.sln`→`dotnet` · `pubspec.yaml`→`flutter` · `Gemfile`→`ruby`.

Package manager (chỉ khi gốc có `package.json`, ngược lại `null`): trường `packageManager` trong package.json (`"pnpm@9.1.0"` → `"pnpm"`) → `pnpm-lock.yaml` pnpm → `yarn.lock` yarn → `bun.lockb`/`bun.lock` bun → mặc định `npm`.

Monorepo — `tool` theo thứ tự: `nx.json` nx → `turbo.json` turbo → `lerna.json` lerna → `pnpm-workspace.yaml` pnpm → trường `workspaces` trong package.json `workspaces`; không có → `null`. Nguồn glob: `pnpm-workspace.yaml` (các dòng `- 'x'` / `- "x"` / `- x` dưới `packages:`) → `package.json#workspaces` (mảng hoặc `{ packages: [] }`) → `lerna.json#packages` → mặc định `["apps/*", "packages/*", "libs/*"]`. Mở glob: kết thúc `/*` → mọi `subdirs` của tiền tố; không có ký tự glob → giữ nếu thư mục tồn tại; chứa `**` hoặc bắt đầu `!` → bỏ qua và push warning `Bỏ qua glob workspace không hỗ trợ: <glob>`. `workspaces` sắp xếp tăng dần, dấu `/`.

Report: `stacks` = stack ở gốc + stack của từng workspace. `scripts` = `package.json#scripts` gốc hoặc `{}`; parse lỗi → warning `package.json không parse được`. `lintConfigs` = các file có mặt ở gốc trong: `eslint.config.js|mjs|cjs|ts`, mọi file bắt đầu bằng `.eslintrc`, `biome.json`, `.golangci.yml`, `.golangci.yaml`, `ruff.toml`, `.ruff.toml`, `checkstyle.xml`, `phpstan.neon`, `phpmd.xml`, `clippy.toml`, `.rubocop.yml`, `analysis_options.yaml`, và `pyproject.toml` nếu chứa dòng `[tool.ruff`. `existing` = đúng 7 khoá trong spec. `isGitRepo` = `exists(root, '.git')`. Không nhận diện stack nào → warning `Không nhận diện được stack`.

- [ ] **Step 1: Viết test fail** trong `tests/detect-stack.test.cjs` (kèm helper `makeFixture`):
  - `node + pnpm lock`: files `package.json` = `{"scripts":{"lint":"eslint ."}}`, `pnpm-lock.yaml`, `eslint.config.js`, `CLAUDE.md`; `git: true` → `stacks` deepEqual `[{id:'node',manifest:'package.json',dir:'.'}]`, `packageManager === 'pnpm'`, `scripts.lint === 'eslint .'`, `lintConfigs` deepEqual `['eslint.config.js']`, `existing['CLAUDE.md'] === true`, `existing['.claude/verify.json'] === false`, `isGitRepo === true`, `monorepo === null`.
  - `packageManager field thắng lock file`: `package.json` = `{"packageManager":"yarn@4.0.0"}` + `pnpm-lock.yaml` → `'yarn'`.
  - `go repo không git`: `go.mod` → `stacks[0].id === 'go'`, `packageManager === null`, `isGitRepo === false`.
  - `monorepo turbo`: `package.json` = `{"workspaces":["apps/*","packages/*"]}`, `turbo.json`, `apps/api/package.json`, `apps/api/node_modules/x/package.json`, `packages/ui/package.json`, `packages/py/pyproject.toml` → `monorepo` deepEqual `{tool:'turbo', workspaces:['apps/api','packages/py','packages/ui']}`; `stacks` chứa `{id:'python',manifest:'pyproject.toml',dir:'packages/py'}`; không có mục nào `dir` chứa `node_modules`.
  - `glob không hỗ trợ`: `pnpm-workspace.yaml` = `"packages:\n  - 'apps/*'\n  - '!apps/legacy'\n  - 'libs/**'\n"` + `package.json` `{}` + `apps/web/package.json` → `monorepo.workspaces` deepEqual `['apps/web']`, `warnings` có 2 mục chứa `Bỏ qua glob workspace`.
  - `package.json hỏng`: `package.json` = `{oops` → không throw, `scripts` deepEqual `{}`, `warnings` chứa `package.json không parse được`.
  - `repo rỗng`: không file → `stacks` deepEqual `[]`, `warnings` chứa `Không nhận diện được stack`.
  - `CLI đường dẫn không tồn tại`: `spawnSync('node', [SCRIPT, '<tmp>/khong-co'])` → `status === 1`, `JSON.parse(stdout).error` là string.
  - `CLI in JSON hợp lệ`: chạy với fixture `go.mod` → `status === 0`, `JSON.parse(stdout).stacks[0].id === 'go'`.
- [ ] **Step 2: Chạy test, xác nhận fail**
  Run: `node --test tests/detect-stack.test.cjs`
  Expected: FAIL — `Cannot find module '../skills/setup/scripts/detect-stack.cjs'`
- [ ] **Step 3: Implement** `fs-utils.cjs`, `stacks.cjs`, `detect-stack.cjs` theo Interfaces ở trên. CLI: `root = path.resolve(process.argv[2] || process.cwd())`; không tồn tại hoặc không phải thư mục → in `{ "error": "Không tìm thấy thư mục: <root>" }`, `process.exitCode = 1`.
- [ ] **Step 4: Đổi `package.json`** `"test": "node --test tests/"`.
- [ ] **Step 5: Chạy toàn bộ test**
  Run: `npm test`
  Expected: PASS cả test cũ của verify-gate lẫn test mới.

---

### Task 2: Quét CI

**Files:**
- Create: `skills/setup/scripts/detect/ci.cjs`
- Modify: `skills/setup/scripts/detect-stack.cjs` (gán `report.ci = collectCi(root)`)
- Test: `tests/detect-stack.test.cjs`

**Interfaces:**
- Consumes: `readText`, `listFiles` từ `fs-utils.cjs`.
- Produces (`ci.cjs`):
  - `parseCiCommands(text: string): string[]`
  - `classifyCommand(cmd: string): 'typecheck' | 'lint' | 'test' | null`
  - `collectCi(root: string): Array<{ file: string, commands: string[] }>` — file theo dấu `/`, sắp xếp tăng dần; file không có lệnh nào vẫn liệt kê với `commands: []`.

File CI: `.github/workflows/*.yml|*.yaml`, `.gitlab-ci.yml`, `bitbucket-pipelines.yml`.

Thuật toán `parseCiCommands` (quét theo dòng, không parse YAML):
- Dòng khớp `^(\s*)(- )?(run|script):\s*(.*)$`. Gọi `indent` = độ dài khoảng trắng đầu + 2 nếu có `- `.
- Phần sau dấu `:` không rỗng và không phải `|`, `>`, `|-`, `>-` → một lệnh (bỏ dấu nháy bao ngoài).
- Ngược lại, lấy các dòng tiếp theo có độ thụt **lớn hơn** `indent`, dừng ở dòng không trống đầu tiên có độ thụt ≤ `indent`. Với mỗi dòng: trim; bỏ dòng trống và dòng bắt đầu `#`; bỏ tiền tố `- ` (danh sách của `script:`); bỏ dấu nháy bao ngoài; còn lại là một lệnh.

`classifyCommand` (không phân biệt hoa thường, xét theo thứ tự, khớp đầu tiên thắng):
- typecheck: `tsc`, `typecheck`, `type-check`, `mypy`, `pyright`, `cargo check`
- lint: `lint`, `eslint`, `ruff`, `golangci`, `clippy`, `go vet`, `rubocop`, `phpstan`, `dart analyze`, `checkstyle`, `detekt`, `ktlint`
- test: `test`, `pytest`, `jest`, `vitest`, `rspec`, `phpunit`
- khác (vd `pnpm install`) → `null`

- [ ] **Step 1: Viết test fail**
  - `parseCiCommands github nhiều dòng`: input
    ```yaml
    jobs:
      ci:
        steps:
          - uses: actions/checkout@v4
          - run: pnpm install --frozen-lockfile
          - name: verify
            run: |
              # kiểm tra type
              pnpm typecheck

              pnpm lint
          - run: "pnpm test"
    ```
    → deepEqual `['pnpm install --frozen-lockfile', 'pnpm typecheck', 'pnpm lint', 'pnpm test']`.
  - `parseCiCommands gitlab script list`: `"test:\n  script:\n    - npm ci\n    - npm test\n  stage: test\n"` → `['npm ci', 'npm test']`.
  - `parseCiCommands CRLF`: input GitHub ở trên với `\n` thay bằng `\r\n`, đi qua `collectCi` (ghi file vào fixture) → `commands` giống bản LF.
  - `classifyCommand`: `'pnpm typecheck'`→`'typecheck'`, `'npx tsc --noEmit'`→`'typecheck'`, `'uv run ruff check .'`→`'lint'`, `'go test ./...'`→`'test'`, `'pnpm install'`→`null`.
  - `buildReport có ci`: fixture `.github/workflows/ci.yml` (nội dung GitHub ở trên) + `bitbucket-pipelines.yml` = `"pipelines:\n  default:\n    - step:\n        script:\n          - npm test\n"` → `report.ci` deepEqual `[{file:'.github/workflows/ci.yml', commands:[...4 lệnh]}, {file:'bitbucket-pipelines.yml', commands:['npm test']}]`.
- [ ] **Step 2: Chạy test, xác nhận fail**
  Run: `node --test tests/detect-stack.test.cjs`
  Expected: FAIL — `Cannot find module '.../detect/ci.cjs'` hoặc `report.ci` rỗng.
- [ ] **Step 3: Implement** `ci.cjs` theo thuật toán trên; nối vào `buildReport`.
- [ ] **Step 4: Chạy test**
  Run: `npm test`
  Expected: PASS.

---

### Task 3: Lệnh verify đề xuất + warning

**Files:**
- Create: `skills/setup/scripts/detect/candidates.cjs`
- Modify: `skills/setup/scripts/detect-stack.cjs` (gán `verifyCandidates`, nối warning)
- Test: `tests/detect-stack.test.cjs`

**Interfaces:**
- Consumes: `classifyCommand` (Task 2), `exists`/`readText` (Task 1); các trường `stacks`, `packageManager`, `scripts`, `ci` của report.
- Produces (`candidates.cjs`):
  - `buildCandidates(root: string, report: Report): { typecheck: Candidate[], lint: Candidate[], test: Candidate[] }` với `Candidate = { command: string, source: string }`; chỉ xét stack có `dir === '.'`.
  - `missingWarnings(candidates): string[]` — mỗi nhóm rỗng → `Không tìm thấy lệnh <nhóm>`.

Nguồn theo thứ tự ưu tiên, bỏ trùng `command`:
1. **CI**: mọi lệnh trong `report.ci` có `classifyCommand` ≠ `null` → `{ command, source: 'ci:<file>' }`.
2. **Node scripts**: typecheck ← script tên `typecheck`, `type-check`, `tsc`; lint ← `lint:check` rồi `lint`; test ← `test`. Lệnh = `<pm> run <name>`, source `package.json#scripts.<name>`. Không có script typecheck mà có `tsconfig.json` → `{ command: 'npx tsc --noEmit', source: 'default' }`.
3. **Python** (prefix: `uv.lock` → `uv run `, `poetry.lock` → `poetry run `, không có → rỗng): pyproject chứa `[tool.mypy` → typecheck `<prefix>mypy .`, source `pyproject.toml#tool.mypy`; chứa `[tool.ruff` → lint `<prefix>ruff check .`, source `pyproject.toml#tool.ruff`; chứa `[tool.pytest` hoặc có thư mục `tests` → test `<prefix>pytest`, source `pyproject.toml#tool.pytest` (hoặc `default` nếu chỉ có thư mục tests).
4. **Mặc định theo stack** (source `default`):

| id | typecheck | lint | test |
|---|---|---|---|
| go | `go build ./...` | `golangci-lint run` nếu có `.golangci.yml`/`.yaml`, ngược lại `go vet ./...` | `go test ./...` |
| java-maven | — | — | `mvn -q verify` |
| java-gradle | — | — | `./gradlew check` |
| rust | `cargo check` | `cargo clippy -- -D warnings` | `cargo test` |
| dotnet | `dotnet build` | — | `dotnet test` |
| flutter | — | `dart analyze` | `flutter test` |
| php | — | `vendor/bin/phpstan analyse` nếu có `phpstan.neon` | `vendor/bin/phpunit` |
| ruby | — | `bundle exec rubocop` | `bundle exec rspec` nếu có thư mục `spec`, ngược lại `bin/rails test` |

- [ ] **Step 1: Viết test fail**
  - `CI đứng trước script`: `package.json` `{"scripts":{"lint":"eslint .","test":"vitest","typecheck":"tsc --noEmit"}}`, `pnpm-lock.yaml`, CI GitHub có `pnpm lint` và `pnpm test` → `lint[0]` deepEqual `{command:'pnpm lint', source:'ci:.github/workflows/ci.yml'}`, `lint[1]` deepEqual `{command:'pnpm run lint', source:'package.json#scripts.lint'}`, `typecheck[0]` deepEqual `{command:'pnpm run typecheck', source:'package.json#scripts.typecheck'}`.
  - `ưu tiên lint:check`: scripts có cả `lint` và `lint:check`, npm → `lint[0].command === 'npm run lint:check'`.
  - `tsconfig không script`: `package.json` `{}`, `tsconfig.json` → `typecheck` deepEqual `[{command:'npx tsc --noEmit', source:'default'}]`; `warnings` chứa `Không tìm thấy lệnh lint` và `Không tìm thấy lệnh test`.
  - `python uv`: `pyproject.toml` = `"[tool.ruff]\nline-length = 100\n[tool.pytest.ini_options]\n"`, `uv.lock` → `lint` deepEqual `[{command:'uv run ruff check .', source:'pyproject.toml#tool.ruff'}]`, `test[0].command === 'uv run pytest'`, `lintConfigs` chứa `pyproject.toml`.
  - `go mặc định`: `go.mod` → `typecheck[0].command === 'go build ./...'`, `lint[0].command === 'go vet ./...'`, `test[0].command === 'go test ./...'`, mọi `source === 'default'`.
  - `bỏ trùng`: npm, CI có `npm run test`, scripts có `test` → `test` deepEqual `[{command:'npm run test', source:'ci:.github/workflows/ci.yml'}]`.
  - `không gộp lệnh khác chuỗi`: npm, CI có `npm test`, scripts có `test` → `test.length === 2` (`npm test` từ CI trước, `npm run test` từ script sau).
- [ ] **Step 2: Chạy test, xác nhận fail**
  Run: `node --test tests/detect-stack.test.cjs`
  Expected: FAIL — `verifyCandidates.lint` rỗng.
- [ ] **Step 3: Implement** `candidates.cjs`; trong `buildReport` gán `verifyCandidates` và nối `missingWarnings` vào `warnings`.
- [ ] **Step 4: Chạy test**
  Run: `npm test`
  Expected: PASS.

---

### Task 4: Nối script vào skill setup + kiểm tra trên repo thật

**Files:**
- Modify: `skills/setup/SKILL.md` (mục `### 1. Khảo sát (read-only)`)
- Modify: `skills/setup/references/stack-detection.md` (đầu mục 1 và mục 2)
- Modify: `README.md` (mục "Phát triển": `npm test` chạy mọi test trong `tests/`)

**Interfaces:**
- Consumes: CLI `node <skill dir>/scripts/detect-stack.cjs [repo]` (Task 1–3).

- [ ] **Step 1: Sửa SKILL.md bước 1** thành:
  - Chạy `node "<thư mục của skill này>/scripts/detect-stack.cjs" <repo>` (thư mục skill là "Base directory" hiển thị khi skill được nạp) và đọc JSON. Không tự dò lại những gì JSON đã có.
  - Từ JSON: stack, package manager, monorepo, lệnh CI, `verifyCandidates` (kèm `source`), file rule và config lint đã có.
  - Claude vẫn tự đọc **nội dung** CLAUDE.md, AGENTS.md, CONTRIBUTING.md, file chuẩn và config lint mà JSON báo là có.
  - Chốt lệnh verify: ưu tiên mục đầu của mỗi nhóm trong `verifyCandidates`; lệnh từ CI và từ script khác nhau, hoặc có `warnings` → nêu trong bảng đề xuất ở bước 2.
  - Script lỗi hoặc không có Node → quay về dò tay theo `references/stack-detection.md`.
- [ ] **Step 2: Sửa stack-detection.md**: thêm một dòng dưới tiêu đề mục 1 và mục 2: `> Đã được tự động hoá trong scripts/detect-stack.cjs; giữ lại làm tài liệu và cho trường hợp dò tay.`
- [ ] **Step 3: Chạy toàn bộ test**
  Run: `npm test`
  Expected: PASS.
- [ ] **Step 4: Chạy thử trên repo thật** (chỉ đọc):
  Run: `node skills/setup/scripts/detect-stack.cjs .` và `node skills/setup/scripts/detect-stack.cjs <một repo Node khác trên máy>`
  Expected: JSON hợp lệ; với dev-kit: `stacks[0].id === 'node'`, `packageManager === 'npm'`, `test[0].command === 'npm run test'`, warning thiếu typecheck và lint.
- [ ] **Step 5: Kiểm tra ngưỡng độ phức tạp của chính script**: mỗi file trong `skills/setup/scripts/` ≤ 300 dòng (`wc -l`), rà mắt thường không hàm nào > 50 dòng hoặc > 4 tham số.
