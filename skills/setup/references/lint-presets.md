# Preset lint độ phức tạp theo stack

Cùng một bộ ngưỡng (xem `clean-code-rules.md` §1): hàm ≤ 50 dòng · cyclomatic ≤ 10 · cognitive ≤ 15 · lồng ≤ 3 · tham số ≤ 4 · file ≤ 300 dòng.

Quy tắc chung:
- Đặt mức **warn** nếu lệnh lint của repo fail khi có warning (vd `--max-warnings 0`); nếu không, đặt **error**. Mục tiêu: vi phạm làm verify fail.
- Áp cho code nguồn; **bỏ qua** test, migration, file sinh tự động, seed/fixture.
- Thêm dependency lint mới (vd `eslint-plugin-sonarjs`) → hỏi user trước. Không có plugin cognitive thì bỏ dòng đó, giữ phần còn lại.
- Repo đã có rule tương đương → giữ cái chặt hơn, không khai báo trùng.

## JavaScript / TypeScript — ESLint flat config (`eslint.config.*`)

```js
import sonarjs from 'eslint-plugin-sonarjs'; // npm i -D eslint-plugin-sonarjs (hỏi user)

export default [
  // ...config hiện có
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    ignores: ['**/*.spec.*', '**/*.test.*', '**/__tests__/**', '**/migrations/**'],
    plugins: { sonarjs },
    rules: {
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 10],
      'max-depth': ['warn', 3],
      'max-params': ['warn', 4],
      'no-nested-ternary': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 15],
    },
  },
];
```
- Config cũ `.eslintrc*`: cùng các rule trong `overrides`.
- Framework DI qua constructor (NestJS, Angular): `max-params` sẽ báo cả constructor inject. Thay `max-params` bằng rule bỏ qua constructor:
  ```js
  'max-params': 'off',
  'no-restricted-syntax': ['warn', {
    selector: ":function[params.length>4]:not(MethodDefinition[kind='constructor'] > FunctionExpression)",
    message: 'Hàm > 4 tham số: gom thành object/DTO có type.',
  }],
  ```
  (Nếu repo đã có `no-restricted-syntax`, gộp selector vào mảng hiện có — khai báo lại sẽ ghi đè.) Constructor > 6 dependency → tách service (chuẩn §5, ngưỡng review).
- React: component dài vì JSX → vẫn tách sub-component, không nới rule.

## Python — Ruff (`pyproject.toml`)

```toml
[tool.ruff.lint]
extend-select = ["C90", "PLR"]

[tool.ruff.lint.mccabe]
max-complexity = 10

[tool.ruff.lint.pylint]
max-args = 4
max-branches = 10
max-statements = 50
max-nested-blocks = 3

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["C90", "PLR"]
```
- Độ dài file: Ruff không có rule → dùng `pylint` `max-module-lines=300` nếu repo có pylint, nếu không ghi vào code-standards làm ngưỡng review.
- Cognitive: `flake8-cognitive-complexity` (`max-cognitive-complexity = 15`) nếu repo dùng flake8.

## Go — golangci-lint (`.golangci.yml`)

```yaml
linters:
  enable: [gocyclo, gocognit, funlen, nestif, lll]
linters-settings:
  gocyclo: { min-complexity: 10 }
  gocognit: { min-complexity: 15 }
  funlen: { lines: 50, statements: -1 }
  nestif: { min-complexity: 3 }
issues:
  exclude-rules:
    - path: _test\.go
      linters: [funlen, gocognit, gocyclo]
```
- Tham số: Go không có linter chuẩn → ngưỡng review trong code-standards (gom vào struct options).

## Java — Checkstyle (`checkstyle.xml`, trong `TreeWalker`)

```xml
<module name="CyclomaticComplexity"><property name="max" value="10"/></module>
<module name="MethodLength"><property name="max" value="50"/><property name="countEmpty" value="false"/></module>
<module name="ParameterNumber"><property name="max" value="4"/><property name="ignoreOverriddenMethods" value="true"/></module>
<module name="NestedIfDepth"><property name="max" value="3"/></module>
<module name="NestedForDepth"><property name="max" value="2"/></module>
```
Ở cấp `Checker`: `<module name="FileLength"><property name="max" value="300"/></module>`. Kotlin: detekt `complexity` ruleset (`CyclomaticComplexMethod: 10`, `CognitiveComplexMethod: 15`, `LongMethod: 50`, `LongParameterList: 4`, `NestedBlockDepth: 3`, `LargeClass`).

## PHP — PHPMD / PHPStan

PHPMD `codesize`: `CyclomaticComplexity reportLevel=10`, `ExcessiveMethodLength minimum=50`, `ExcessiveParameterList minimum=5`. Hoặc PHPStan + `tomasvotruba/cognitive-complexity` (`function: 15`).

## Rust — Clippy (`clippy.toml`)

```toml
cognitive-complexity-threshold = 15
too-many-arguments-threshold = 4
too-many-lines-threshold = 50
```
Bật `#![warn(clippy::cognitive_complexity, clippy::too_many_lines)]` ở crate root (hai lint này mặc định tắt).

## C# / .NET — `.editorconfig`

`dotnet_diagnostic.CA1502.severity = warning` (cyclomatic, ngưỡng qua `CodeMetricsConfig.txt`: `CA1502: 10`), `CA1505` (maintainability). Độ dài hàm/tham số: dùng analyzer có sẵn của repo (SonarAnalyzer: `S138` 50 dòng, `S107` 4 tham số, `S3776` cognitive 15).

## Stack khác

Tìm linter phổ biến nhất của stack có rule tương đương (cyclomatic, length, params, nesting). Không có → ghi ngưỡng vào code-standards §5 làm ngưỡng review và báo user là chưa enforce tự động được.
