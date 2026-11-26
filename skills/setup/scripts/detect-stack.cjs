#!/usr/bin/env node
// dev-kit detect-stack: khảo sát repo (chỉ đọc) và in JSON dữ kiện cho /dev-kit:setup.
//   node detect-stack.cjs [đường dẫn repo]   (mặc định: thư mục hiện tại)
// Script chỉ thu thập dữ kiện và đề xuất lệnh kèm nguồn; việc chốt lệnh verify do Claude làm.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { exists, readText, readJson, listFiles } = require('./detect/fs-utils.cjs');
const { detectStacks, detectPackageManager, detectMonorepo } = require('./detect/stacks.cjs');
const { collectCi } = require('./detect/ci.cjs');
const { buildCandidates, missingWarnings } = require('./detect/candidates.cjs');

const EXISTING_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'docs/code-standards.md',
  'docs/tech-debt.md',
  '.claude/verify.json',
  '.editorconfig',
];

const LINT_CONFIG_FILES = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'biome.json',
  'biome.jsonc',
  '.golangci.yml',
  '.golangci.yaml',
  'ruff.toml',
  '.ruff.toml',
  'checkstyle.xml',
  'phpstan.neon',
  'phpmd.xml',
  'clippy.toml',
  '.rubocop.yml',
  'analysis_options.yaml',
];

const LINT_CONFIG_PREFIXES = ['.eslintrc', '.prettierrc', 'prettier.config.'];

function detectLintConfigs(root) {
  const files = listFiles(root, '.');
  const found = files.filter((f) => LINT_CONFIG_FILES.includes(f) || LINT_CONFIG_PREFIXES.some((p) => f.startsWith(p)));
  const pyproject = readText(root, 'pyproject.toml');
  if (pyproject && pyproject.includes('[tool.ruff')) found.push('pyproject.toml');
  return found.sort();
}

// 7 khoá cố định + mọi file trong docs/ có tên chứa "standard" (vd docs/coding-standards.md).
function detectExisting(root) {
  const existing = Object.fromEntries(EXISTING_FILES.map((rel) => [rel, exists(root, rel)]));
  for (const name of listFiles(root, 'docs').filter((f) => /standard/i.test(f))) existing[`docs/${name}`] = true;
  return existing;
}

function readScripts(root, warnings) {
  const { value, error } = readJson(root, 'package.json');
  if (error) warnings.push('package.json không parse được');
  return value && value.scripts && typeof value.scripts === 'object' ? value.scripts : {};
}

function collectStacks(root, monorepo) {
  const stacks = detectStacks(root, '.');
  for (const dir of monorepo ? monorepo.workspaces : []) stacks.push(...detectStacks(root, dir));
  return stacks;
}

function buildReport(root) {
  const warnings = [];
  const monorepo = detectMonorepo(root, warnings);
  const report = {
    root,
    isGitRepo: exists(root, '.git'),
    stacks: collectStacks(root, monorepo),
    packageManager: detectPackageManager(root),
    monorepo,
    scripts: readScripts(root, warnings),
    ci: collectCi(root, warnings),
    lintConfigs: detectLintConfigs(root),
    existing: detectExisting(root),
    verifyCandidates: { typecheck: [], lint: [], test: [] },
    warnings,
  };
  if (report.stacks.length === 0) warnings.push('Không nhận diện được stack');
  report.verifyCandidates = buildCandidates(root, report);
  warnings.push(...missingWarnings(report.verifyCandidates));
  return report;
}

function main() {
  const root = path.resolve(process.argv[2] || process.cwd());
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    process.stdout.write(`${JSON.stringify({ error: `Không tìm thấy thư mục: ${root}` }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${JSON.stringify(buildReport(root), null, 2)}\n`);
}

if (require.main === module) main();

module.exports = { buildReport };
