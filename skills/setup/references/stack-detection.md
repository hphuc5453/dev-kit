# Nhận diện stack & lệnh verify

## 1. Manifest → stack
> Đã được tự động hoá trong `scripts/detect-stack.cjs`; giữ lại làm tài liệu và cho trường hợp dò tay.

| File | Stack | Nơi tìm lệnh verify |
|---|---|---|
| `package.json` | Node/TS (Nest, Express, Next, React, Vue, Svelte, Angular, RN...) | `scripts`; lock file quyết định PM: `pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, `bun.lockb`→bun, `package-lock.json`→npm |
| `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json` | Monorepo JS | lệnh root (`turbo run`, `nx affected`) |
| `pyproject.toml`, `requirements*.txt`, `setup.cfg` | Python (Django, FastAPI, Flask) | `[tool.*]` sections, `Makefile`, `tox.ini`, `noxfile.py` |
| `go.mod` | Go | `go vet ./...`, `go test ./...`, `golangci-lint run` |
| `pom.xml` / `build.gradle(.kts)` | Java/Kotlin (Spring...) | `mvn verify` / `./gradlew check` |
| `composer.json` | PHP (Laravel, Symfony) | `scripts`, `phpstan`, `phpunit`/`pest` |
| `Cargo.toml` | Rust | `cargo clippy`, `cargo test` |
| `*.csproj`, `*.sln` | .NET | `dotnet build`, `dotnet test` |
| `pubspec.yaml` | Flutter/Dart | `dart analyze`, `flutter test` |
| `Gemfile` | Ruby (Rails) | `rubocop`, `rspec`/`rails test` |

Luôn kiểm tra thêm CI (`.github/workflows/*`, `.gitlab-ci.yml`, `bitbucket-pipelines.yml`) — CI chạy gì thì đó là "verify chuẩn" của repo.

## 2. Bộ verify tối thiểu cần có
> Đã được tự động hoá trong `scripts/detect-stack.cjs`; giữ lại làm tài liệu và cho trường hợp dò tay.

| Loại | Node/TS | Python | Go | Java/Kotlin |
|---|---|---|---|---|
| Typecheck | `tsc --noEmit` | `mypy` / `pyright` | (compiler) `go build ./...` | compiler |
| Lint | `eslint` | `ruff check` | `go vet`, `golangci-lint` | `checkstyle`/`detekt`/`ktlint` |
| Test | `jest`/`vitest` | `pytest` | `go test` | `junit` qua build tool |
| Boundary/import | `eslint-plugin-boundaries`, `dependency-cruiser`, `madge --circular` | `import-linter` | `go list` + `depguard` | ArchUnit |

Thiếu loại nào → đề xuất bổ sung (cần user duyệt nếu thêm dependency).

## 3. Kiến trúc mặc định theo kiểu ứng dụng

Chỉ là điểm xuất phát; **quy ước đang có trong repo luôn được ưu tiên**.

**Backend (API/service)** — chia theo *feature/module*, bên trong chia layer:
```
src/
  modules/<feature>/        # hoặc src/<feature>/ nếu repo đang vậy
    <feature>.controller|router|handler   # nhận request, validate, gọi service — không chứa business logic
    <feature>.service|usecase             # business logic, không biết HTTP
    <feature>.repository                  # truy cập DB (chỉ khi query phức tạp/dùng lại; ORM đơn giản có thể bỏ layer này)
    dto|schemas/                          # input/output contract
    entities|models/                      # schema DB
    <feature>.constants / types           # hằng số & type riêng của feature
    __tests__ | *.spec                    
  shared|common/            # chỉ thứ dùng ≥2 module: guards, filters, pipes, utils thuần, config
  infra|integrations/       # client bên ngoài (mail, cache, payment, AI provider...) sau interface
```
Chiều phụ thuộc: controller → service → repository → model. Module A không import ruột (service nội bộ, model) của module B — đi qua public API (export của module / interface).

**Frontend (SPA/SSR)** — chia theo *feature*:
```
src/
  app|pages|routes/         # routing, layout — mỏng
  features/<feature>/       # components, hooks, api, store, types riêng của feature
  components/ui/            # component dùng chung, không biết business
  lib|utils/                # hàm thuần, client API chung
  hooks/  stores/  styles/  i18n/
```
Chiều phụ thuộc: app → features → shared (ui/lib). Feature không import chéo ruột của feature khác.

**Mobile (RN/Flutter):** giống frontend; thêm `navigation/`, `services/` (native, storage).

**Library/CLI:** `src/` theo domain, `index` export public API rõ ràng; phần nội bộ không export.

**Monorepo:** `apps/*` (deployable) + `packages/*` (dùng chung). App không import app khác; package không import app.

## 4. Dò quy ước số đông (lệnh mẫu, chạy ở root)

```bash
# Tên thư mục con phổ biến trong các feature
find src -mindepth 2 -maxdepth 2 -type d -printf '%f\n' | sort | uniq -c | sort -rn
# Hậu tố file phổ biến
find src -type f | sed -E 's/.*\.([a-z-]+)\.[a-z]+$/\1/' | sort | uniq -c | sort -rn | head -20
# File dài nhất
find src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.go' -o -name '*.java' \) -not -path '*/node_modules/*' | xargs wc -l | sort -rn | head -15
# Hotspot theo lịch sử git
git log --since='6 months ago' --format= --name-only | grep -v '^$' | sort | uniq -c | sort -rn | head -15
# Import vòng (JS/TS)
npx madge --circular --extensions ts,tsx src
```
Trên Windows dùng Git Bash; `find -printf` không có trên macOS → dùng `-exec basename {} \;`.
