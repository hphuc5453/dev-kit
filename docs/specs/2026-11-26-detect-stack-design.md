# detect-stack: chuyển bước khảo sát của `/dev-kit:setup` sang script

## Mục đích
Bước 1 của `/dev-kit:setup` hiện do Claude tự dò repo theo `references/stack-detection.md`: kết quả không ổn định giữa các lần chạy, tốn token, không test được. Chuyển phần **thu thập dữ kiện** sang script Node; Claude chỉ đọc JSON và chốt phần cần phán đoán.

## Mục tiêu / không làm
- **Làm:** script xuất JSON gồm stack, package manager, monorepo, script `package.json`, lệnh trong CI, config lint, file rule đã có, và lệnh verify đề xuất kèm nguồn.
- **Không làm:** tự chốt lệnh verify, sinh `verify.json`, parse YAML đầy đủ, dò quy ước số đông (mục 4 của stack-detection.md). Những việc này để lại cho Claude hoặc một bước sau.
- **Coi là thất bại nếu:** script đoán sai mà không để lại dấu vết. Mỗi lệnh đề xuất phải ghi `source`; điểm nào không chắc thì đưa vào `warnings`.

## Phương án
- **A. Chỉ thu thập dữ kiện, Claude chốt** ← *đã chọn*. Script nhỏ, dễ test, an toàn với repo lạ.
- B. Script tự chốt lệnh và sinh `verify.json`: dễ chọn sai lệnh mà không ai biết khi CI phức tạp hoặc monorepo lạ.

## Thiết kế
- **Vị trí:** `skills/setup/scripts/detect-stack.cjs`. Gọi bằng `node <skill dir>/scripts/detect-stack.cjs [repo]`, mặc định là cwd. Kết quả in ra stdout dạng JSON. Repo không tồn tại → exit 1 kèm `{ "error": ... }`.
- **Ràng buộc:** không dùng dependency, chạy được trên Node ≥ 18, Windows/macOS/Linux. Bản thân script phải tuân ngưỡng độ phức tạp của dev-kit (hàm ≤ 50 dòng, file ≤ 300 dòng; quá thì tách module).
- **Output:**
  ```jsonc
  {
    "root": "...", "isGitRepo": true,
    "stacks": [{ "id": "node", "manifest": "package.json", "dir": "." }],
    "packageManager": "pnpm",                       // null nếu không phải Node
    "monorepo": { "tool": "turbo", "workspaces": ["apps/api", "packages/ui"] },  // hoặc null
    "scripts": { "lint": "eslint .", "test": "vitest" },      // package.json gốc
    "ci": [{ "file": ".github/workflows/ci.yml", "commands": ["pnpm lint", "pnpm test"] }],
    "lintConfigs": ["eslint.config.js"],
    "existing": { "CLAUDE.md": true, "AGENTS.md": false, "CONTRIBUTING.md": false,
                  "docs/code-standards.md": false, "docs/tech-debt.md": false,
                  ".claude/verify.json": false, ".editorconfig": true },
    "verifyCandidates": {
      "typecheck": [{ "command": "pnpm run typecheck", "source": "package.json#scripts.typecheck" }],
      "lint":      [{ "command": "pnpm lint", "source": "ci:.github/workflows/ci.yml" }],
      "test":      [{ "command": "pnpm test", "source": "ci:.github/workflows/ci.yml" }]
    },
    "warnings": ["Không tìm thấy lệnh typecheck trong CI"]
  }
  ```
- **Quy tắc đề xuất lệnh** (thứ tự ưu tiên: CI → script của repo → mặc định của stack):
  - CI: quét dòng `run:` (GitHub), `script:` (GitLab, Bitbucket), kể cả block nhiều dòng; phân loại theo từ khoá (`tsc|typecheck|mypy|pyright` → typecheck, `lint|eslint|ruff|golangci|clippy|vet` → lint, `test|pytest|jest|vitest` → test).
  - Node: package manager theo lock file, mặc định npm. Script có tên `typecheck|type-check|tsc`, `lint:check|lint`, `test` → `<pm> run <name>`. Không có script typecheck mà có `tsconfig.json` → `npx tsc --noEmit` (nguồn `default`).
  - Python: `uv.lock` → `uv run`, `poetry.lock` → `poetry run`. Lệnh mypy/ruff/pytest suy từ `[tool.*]` trong `pyproject.toml`.
  - Go, Java, PHP, Rust, .NET, Flutter, Ruby: lệnh mặc định theo bảng ở mục 2 của stack-detection.md, nguồn `default`.
- **Monorepo:** nhận diện `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, trường `workspaces` trong `package.json`. Mở các glob đơn giản dạng `apps/*` thành danh sách thư mục. Stack của từng workspace được đưa vào `stacks` với `dir` tương ứng.
- **Bỏ qua:** `node_modules`, `.git`, `vendor`, `dist`, `build`.

## Thay đổi đi kèm
- `skills/setup/SKILL.md` bước 1: chạy script, đọc JSON; nội dung CLAUDE.md và config lint vẫn do Claude đọc (script chỉ báo file có hay không). Chỗ nào có `warnings` hoặc CI mâu thuẫn với script thì nêu trong bảng đề xuất ở bước 2.
- `references/stack-detection.md`: mục 1–2 ghi chú "đã được script thực hiện, giữ làm tài liệu"; mục 3–4 giữ nguyên.
- `package.json`: đổi `test` thành `node --test tests/` để chạy mọi file test.
- Test `tests/detect-stack.test.cjs`, mỗi case dựng repo mẫu trong thư mục tạm: Node + pnpm có CI; Node không có script nhưng có tsconfig; Python + uv; Go; monorepo turbo; repo rỗng; đường dẫn không tồn tại.

## Để người làm tự quyết
Cách tách module bên trong script, tên hàm, nội dung chính xác của các câu warning.
