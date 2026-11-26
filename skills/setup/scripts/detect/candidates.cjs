'use strict';
// Dựng lệnh verify đề xuất. Ưu tiên: CI → script của repo → mặc định của stack; bỏ trùng theo command.

const { exists, readText } = require('./fs-utils.cjs');
const { classifyCommand } = require('./ci.cjs');

const GROUPS = ['typecheck', 'lint', 'test'];

const NODE_SCRIPTS = {
  typecheck: ['typecheck', 'type-check', 'tsc'],
  lint: ['lint:check', 'lint'],
  test: ['test'],
};

// Mỗi giá trị: chuỗi lệnh, hoặc hàm (root) => lệnh | null.
const STACK_DEFAULTS = {
  go: {
    typecheck: 'go build ./...',
    lint: (root) => (exists(root, '.golangci.yml') || exists(root, '.golangci.yaml') ? 'golangci-lint run' : 'go vet ./...'),
    test: 'go test ./...',
  },
  'java-maven': { test: 'mvn -q verify' },
  'java-gradle': { test: './gradlew check' },
  rust: { typecheck: 'cargo check', lint: 'cargo clippy -- -D warnings', test: 'cargo test' },
  dotnet: { typecheck: 'dotnet build', test: 'dotnet test' },
  flutter: { lint: 'dart analyze', test: 'flutter test' },
  php: {
    lint: (root) => (exists(root, 'phpstan.neon') ? 'vendor/bin/phpstan analyse' : null),
    test: 'vendor/bin/phpunit',
  },
  ruby: {
    lint: 'bundle exec rubocop',
    test: (root) => (exists(root, 'spec') ? 'bundle exec rspec' : 'bin/rails test'),
  },
};

function fromCi(ci, add) {
  for (const { file, commands } of ci) {
    for (const command of commands) {
      const group = classifyCommand(command);
      if (group) add(group, command, `ci:${file}`);
    }
  }
}

function fromNodeScripts(root, report, add) {
  const pm = report.packageManager;
  for (const group of GROUPS) {
    for (const name of NODE_SCRIPTS[group]) {
      if (report.scripts[name]) add(group, `${pm} run ${name}`, `package.json#scripts.${name}`);
    }
  }
  const hasTypecheckScript = NODE_SCRIPTS.typecheck.some((name) => report.scripts[name]);
  if (!hasTypecheckScript && exists(root, 'tsconfig.json')) add('typecheck', 'npx tsc --noEmit', 'default');
}

function pythonPrefix(root) {
  if (exists(root, 'uv.lock')) return 'uv run ';
  if (exists(root, 'poetry.lock')) return 'poetry run ';
  return '';
}

function fromPython(root, add) {
  const prefix = pythonPrefix(root);
  const pyproject = readText(root, 'pyproject.toml') || '';
  if (pyproject.includes('[tool.mypy')) add('typecheck', `${prefix}mypy .`, 'pyproject.toml#tool.mypy');
  if (pyproject.includes('[tool.ruff')) add('lint', `${prefix}ruff check .`, 'pyproject.toml#tool.ruff');
  if (pyproject.includes('[tool.pytest')) add('test', `${prefix}pytest`, 'pyproject.toml#tool.pytest');
  else if (exists(root, 'tests')) add('test', `${prefix}pytest`, 'default');
}

function fromStackDefaults(root, id, add) {
  const defaults = STACK_DEFAULTS[id] || {};
  for (const group of GROUPS) {
    const value = defaults[group];
    const command = typeof value === 'function' ? value(root) : value;
    if (command) add(group, command, 'default');
  }
}

function buildCandidates(root, report) {
  const candidates = { typecheck: [], lint: [], test: [] };
  const add = (group, command, source) => {
    if (!candidates[group].some((c) => c.command === command)) candidates[group].push({ command, source });
  };
  fromCi(report.ci, add);
  const rootStacks = report.stacks.filter((s) => s.dir === '.').map((s) => s.id);
  if (rootStacks.includes('node')) fromNodeScripts(root, report, add);
  if (rootStacks.includes('python')) fromPython(root, add);
  for (const id of rootStacks) fromStackDefaults(root, id, add);
  return candidates;
}

function missingWarnings(candidates) {
  return GROUPS.filter((group) => candidates[group].length === 0).map((group) => `Không tìm thấy lệnh ${group}`);
}

module.exports = { buildCandidates, missingWarnings };
