'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'skills', 'setup', 'scripts', 'detect-stack.cjs');
const { buildReport } = require(SCRIPT);

function makeFixture(files, opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-repo-'));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  if (opts.git) spawnSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

function runCli(arg) {
  return spawnSync('node', [SCRIPT, arg], { encoding: 'utf8' });
}

// ---------- Task 1: khung report ----------

test('node + pnpm lock', () => {
  const dir = makeFixture(
    {
      'package.json': '{"scripts":{"lint":"eslint ."}}',
      'pnpm-lock.yaml': '',
      'eslint.config.js': '',
      'CLAUDE.md': '',
    },
    { git: true },
  );
  const r = buildReport(dir);
  assert.deepStrictEqual(r.stacks, [{ id: 'node', manifest: 'package.json', dir: '.' }]);
  assert.strictEqual(r.packageManager, 'pnpm');
  assert.strictEqual(r.scripts.lint, 'eslint .');
  assert.deepStrictEqual(r.lintConfigs, ['eslint.config.js']);
  assert.strictEqual(r.existing['CLAUDE.md'], true);
  assert.strictEqual(r.existing['.claude/verify.json'], false);
  assert.strictEqual(r.isGitRepo, true);
  assert.strictEqual(r.monorepo, null);
});

test('packageManager field thắng lock file', () => {
  const dir = makeFixture({ 'package.json': '{"packageManager":"yarn@4.0.0"}', 'pnpm-lock.yaml': '' });
  assert.strictEqual(buildReport(dir).packageManager, 'yarn');
});

test('go repo không git', () => {
  const r = buildReport(makeFixture({ 'go.mod': 'module x\n' }));
  assert.strictEqual(r.stacks[0].id, 'go');
  assert.strictEqual(r.packageManager, null);
  assert.strictEqual(r.isGitRepo, false);
});

test('monorepo turbo', () => {
  const dir = makeFixture({
    'package.json': '{"workspaces":["apps/*","packages/*"]}',
    'turbo.json': '{}',
    'apps/api/package.json': '{}',
    'apps/api/node_modules/x/package.json': '{}',
    'packages/ui/package.json': '{}',
    'packages/py/pyproject.toml': '',
  });
  const r = buildReport(dir);
  assert.deepStrictEqual(r.monorepo, { tool: 'turbo', workspaces: ['apps/api', 'packages/py', 'packages/ui'] });
  assert.ok(r.stacks.some((s) => s.id === 'python' && s.manifest === 'pyproject.toml' && s.dir === 'packages/py'));
  assert.ok(!r.stacks.some((s) => s.dir.includes('node_modules')));
});

test('glob workspace không hỗ trợ', () => {
  const dir = makeFixture({
    'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n  - '!apps/legacy'\n  - 'libs/**'\n",
    'package.json': '{}',
    'apps/web/package.json': '{}',
  });
  const r = buildReport(dir);
  assert.deepStrictEqual(r.monorepo.workspaces, ['apps/web']);
  assert.strictEqual(r.warnings.filter((w) => w.includes('Bỏ qua glob workspace')).length, 2);
});

test('package.json hỏng', () => {
  const r = buildReport(makeFixture({ 'package.json': '{oops' }));
  assert.deepStrictEqual(r.scripts, {});
  assert.ok(r.warnings.includes('package.json không parse được'));
});

test('repo rỗng', () => {
  const r = buildReport(makeFixture({}));
  assert.deepStrictEqual(r.stacks, []);
  assert.ok(r.warnings.includes('Không nhận diện được stack'));
});

test('CLI đường dẫn không tồn tại', () => {
  const res = runCli(path.join(os.tmpdir(), `khong-co-${process.pid}-${Date.now()}`));
  assert.strictEqual(res.status, 1);
  assert.strictEqual(typeof JSON.parse(res.stdout).error, 'string');
});

test('CLI in JSON hợp lệ', () => {
  const res = runCli(makeFixture({ 'go.mod': 'module x\n' }));
  assert.strictEqual(res.status, 0);
  assert.strictEqual(JSON.parse(res.stdout).stacks[0].id, 'go');
});

// ---------- Task 2: CI ----------

const { parseCiCommands, classifyCommand } = require('../skills/setup/scripts/detect/ci.cjs');

const GITHUB_CI = [
  'jobs:',
  '  ci:',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - run: pnpm install --frozen-lockfile',
  '      - name: verify',
  '        run: |',
  '          # kiểm tra type',
  '          pnpm typecheck',
  '',
  '          pnpm lint',
  '      - run: "pnpm test"',
  '',
].join('\n');
const GITHUB_COMMANDS = ['pnpm install --frozen-lockfile', 'pnpm typecheck', 'pnpm lint', 'pnpm test'];

test('parseCiCommands github nhiều dòng', () => {
  assert.deepStrictEqual(parseCiCommands(GITHUB_CI), GITHUB_COMMANDS);
});

test('parseCiCommands gitlab script list', () => {
  const text = 'test:\n  script:\n    - npm ci\n    - npm test\n  stage: test\n';
  assert.deepStrictEqual(parseCiCommands(text), ['npm ci', 'npm test']);
});

test('CI CRLF cho kết quả giống LF', () => {
  const dir = makeFixture({ '.github/workflows/ci.yml': GITHUB_CI.replace(/\n/g, '\r\n') });
  assert.deepStrictEqual(buildReport(dir).ci, [{ file: '.github/workflows/ci.yml', commands: GITHUB_COMMANDS }]);
});

test('classifyCommand', () => {
  assert.strictEqual(classifyCommand('pnpm typecheck'), 'typecheck');
  assert.strictEqual(classifyCommand('npx tsc --noEmit'), 'typecheck');
  assert.strictEqual(classifyCommand('uv run ruff check .'), 'lint');
  assert.strictEqual(classifyCommand('go test ./...'), 'test');
  assert.strictEqual(classifyCommand('pnpm install'), null);
});

test('buildReport có ci', () => {
  const dir = makeFixture({
    '.github/workflows/ci.yml': GITHUB_CI,
    'bitbucket-pipelines.yml': 'pipelines:\n  default:\n    - step:\n        script:\n          - npm test\n',
  });
  assert.deepStrictEqual(buildReport(dir).ci, [
    { file: '.github/workflows/ci.yml', commands: GITHUB_COMMANDS },
    { file: 'bitbucket-pipelines.yml', commands: ['npm test'] },
  ]);
});

// ---------- Task 3: lệnh verify đề xuất ----------

const CI_FILE = '.github/workflows/ci.yml';
const ciWith = (...cmds) => `jobs:\n  ci:\n    steps:\n${cmds.map((c) => `      - run: ${c}\n`).join('')}`;

test('CI đứng trước script', () => {
  const dir = makeFixture({
    'package.json': '{"scripts":{"lint":"eslint .","test":"vitest","typecheck":"tsc --noEmit"}}',
    'pnpm-lock.yaml': '',
    [CI_FILE]: ciWith('pnpm lint', 'pnpm test'),
  });
  const c = buildReport(dir).verifyCandidates;
  assert.deepStrictEqual(c.lint[0], { command: 'pnpm lint', source: `ci:${CI_FILE}` });
  assert.deepStrictEqual(c.lint[1], { command: 'pnpm run lint', source: 'package.json#scripts.lint' });
  assert.deepStrictEqual(c.typecheck[0], { command: 'pnpm run typecheck', source: 'package.json#scripts.typecheck' });
});

test('ưu tiên lint:check', () => {
  const dir = makeFixture({ 'package.json': '{"scripts":{"lint":"eslint . --fix","lint:check":"eslint ."}}' });
  assert.strictEqual(buildReport(dir).verifyCandidates.lint[0].command, 'npm run lint:check');
});

test('tsconfig không script', () => {
  const r = buildReport(makeFixture({ 'package.json': '{}', 'tsconfig.json': '{}' }));
  assert.deepStrictEqual(r.verifyCandidates.typecheck, [{ command: 'npx tsc --noEmit', source: 'default' }]);
  assert.ok(r.warnings.includes('Không tìm thấy lệnh lint'));
  assert.ok(r.warnings.includes('Không tìm thấy lệnh test'));
});

test('python uv', () => {
  const dir = makeFixture({
    'pyproject.toml': '[tool.ruff]\nline-length = 100\n[tool.pytest.ini_options]\n',
    'uv.lock': '',
  });
  const r = buildReport(dir);
  assert.deepStrictEqual(r.verifyCandidates.lint, [{ command: 'uv run ruff check .', source: 'pyproject.toml#tool.ruff' }]);
  assert.strictEqual(r.verifyCandidates.test[0].command, 'uv run pytest');
  assert.ok(r.lintConfigs.includes('pyproject.toml'));
});

test('go mặc định', () => {
  const c = buildReport(makeFixture({ 'go.mod': 'module x\n' })).verifyCandidates;
  assert.strictEqual(c.typecheck[0].command, 'go build ./...');
  assert.strictEqual(c.lint[0].command, 'go vet ./...');
  assert.strictEqual(c.test[0].command, 'go test ./...');
  assert.ok([...c.typecheck, ...c.lint, ...c.test].every((x) => x.source === 'default'));
});

test('bỏ trùng lệnh giống hệt', () => {
  const dir = makeFixture({ 'package.json': '{"scripts":{"test":"vitest"}}', [CI_FILE]: ciWith('npm run test') });
  assert.deepStrictEqual(buildReport(dir).verifyCandidates.test, [{ command: 'npm run test', source: `ci:${CI_FILE}` }]);
});

test('không gộp lệnh khác chuỗi', () => {
  const dir = makeFixture({ 'package.json': '{"scripts":{"test":"vitest"}}', [CI_FILE]: ciWith('npm test') });
  const t = buildReport(dir).verifyCandidates.test;
  assert.deepStrictEqual(t.map((x) => x.command), ['npm test', 'npm run test']);
});

// ---------- Final review fixes ----------

test('classifyCommand không nhận nhầm lệnh cài đặt/build', () => {
  for (const cmd of [
    'npm i -g npm@latest',
    'docker build -t app:latest .',
    'corepack prepare pnpm@latest --activate',
    'npm install --save-dev @testing-library/react',
    'pip install ruff mypy pytest',
    'npx tsx --tsconfig tsconfig.json x.ts',
  ]) {
    assert.strictEqual(classifyCommand(cmd), null, cmd);
  }
  assert.strictEqual(classifyCommand('yarn check-types'), 'typecheck');
  assert.strictEqual(classifyCommand('pnpm lint:check'), 'lint');
  assert.strictEqual(classifyCommand('golangci-lint run'), 'lint');
  assert.strictEqual(classifyCommand('pnpm test:unit'), 'test');
});

test('run: là mapping (shell, working-directory) không bị coi là lệnh, có warning thư mục', () => {
  const yml = [
    'defaults:',
    '  run:',
    '    shell: bash',
    '    working-directory: ./apps/web',
    'jobs:',
    '  t:',
    '    steps:',
    '      - run: yarn test',
    '',
  ].join('\n');
  assert.deepStrictEqual(parseCiCommands(yml), ['yarn test']);
  const r = buildReport(makeFixture({ [CI_FILE]: yml }));
  assert.ok(r.warnings.some((w) => w.includes('./apps/web') && w.includes(CI_FILE)));
});

test('package.json có BOM vẫn đọc được', () => {
  const r = buildReport(makeFixture({ 'package.json': '﻿{"scripts":{"test":"vitest"}}' }));
  assert.strictEqual(r.scripts.test, 'vitest');
  assert.ok(!r.warnings.includes('package.json không parse được'));
});

test('pnpm-workspace có comment và dạng [..]', () => {
  const a = makeFixture({
    'pnpm-workspace.yaml': "packages:\n  - 'apps/*' # web\n  - packages/* # libs\n",
    'apps/web/package.json': '{}',
    'packages/ui/package.json': '{}',
  });
  assert.deepStrictEqual(buildReport(a).monorepo.workspaces, ['apps/web', 'packages/ui']);
  const b = makeFixture({ 'pnpm-workspace.yaml': "packages: ['apps/*']\n", 'apps/web/package.json': '{}' });
  assert.deepStrictEqual(buildReport(b).monorepo.workspaces, ['apps/web']);
});

test('monorepo không có workspace nào → warning', () => {
  const r = buildReport(makeFixture({ 'pnpm-workspace.yaml': 'packages:\n', 'package.json': '{}' }));
  assert.ok(r.warnings.some((w) => w.includes('không tìm thấy workspace')));
});

test('existing liệt kê docs/*standard* và lintConfigs có formatter', () => {
  const r = buildReport(
    makeFixture({ 'package.json': '{}', 'docs/coding-standards.md': '', '.prettierrc': '{}', 'biome.jsonc': '{}' }),
  );
  assert.strictEqual(r.existing['docs/coding-standards.md'], true);
  assert.ok(r.lintConfigs.includes('.prettierrc'));
  assert.ok(r.lintConfigs.includes('biome.jsonc'));
});
