'use strict';
// Tìm file CI, trích lệnh trong `run:` / `script:` (quét theo dòng, không parse YAML), phân loại lệnh.

const { exists, readText, listFiles } = require('./fs-utils.cjs');

const KEY_LINE = /^(\s*)(- )?(run|script):\s*(.*)$/;
const BLOCK_MARKERS = new Set(['', '|', '>', '|-', '>-']);
// Dòng dạng `key: value` trong block `run:` (vd `defaults.run.shell`) là mapping, không phải lệnh.
const MAPPING_LINE = /^[\w-]+:(\s|$)/;
const WORKING_DIR_LINE = /^\s*(- )?working-directory:\s*['"]?([^'"#\s]+)/;

// Lệnh có động từ này ở 2 token đầu là cài đặt/đóng gói, không phải verify.
const SKIP_VERBS = new Set(['install', 'i', 'add', 'ci', 'prepare', 'pull', 'build', 'docker', 'corepack']);

const CATEGORIES = [
  ['typecheck', ['tsc', 'typecheck', 'type-check', 'check-types', 'mypy', 'pyright']],
  [
    'lint',
    ['lint', 'eslint', 'ruff', 'golangci', 'clippy', 'vet', 'rubocop', 'phpstan', 'analyze', 'checkstyle', 'detekt', 'ktlint'],
  ],
  ['test', ['test', 'pytest', 'jest', 'vitest', 'rspec', 'phpunit']],
];

function unquote(text) {
  const m = text.match(/^(['"])(.*)\1$/);
  return m ? m[2] : text;
}

function indentOf(line) {
  return line.match(/^\s*/)[0].length;
}

// Lấy các dòng thụt sâu hơn `indent` ngay sau dòng `start`; trả về lệnh và vị trí dòng kế tiếp cần xét.
function readBlock(lines, start, indent) {
  const commands = [];
  let i = start;
  for (; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '') continue;
    if (indentOf(lines[i]) <= indent) break;
    if (trimmed.startsWith('#') || MAPPING_LINE.test(trimmed)) continue;
    commands.push(unquote(trimmed.replace(/^- /, '')));
  }
  return { commands, next: i };
}

function parseCiCommands(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const commands = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(KEY_LINE);
    i += 1;
    if (!m) continue;
    const value = m[4].trim();
    if (!BLOCK_MARKERS.has(value)) {
      commands.push(unquote(value));
      continue;
    }
    const block = readBlock(lines, i, m[1].length + (m[2] ? 2 : 0));
    commands.push(...block.commands);
    i = block.next;
  }
  return commands;
}

function findWorkingDirectories(text) {
  const dirs = new Set();
  for (const line of text.split('\n')) {
    const m = line.match(WORKING_DIR_LINE);
    if (m) dirs.add(m[2]);
  }
  return [...dirs];
}

function tokenize(cmd) {
  const tokens = cmd.toLowerCase().split(/[\s/:@=]+/).filter(Boolean);
  return { tokens, pieces: new Set(tokens.flatMap((t) => [t, ...t.split('-')])) };
}

function classifyCommand(cmd) {
  const { tokens, pieces } = tokenize(cmd);
  if (tokens.slice(0, 2).some((t) => SKIP_VERBS.has(t))) return null;
  if (tokens.includes('cargo') && tokens.includes('check')) return 'typecheck';
  const hit = CATEGORIES.find(([, words]) => words.some((w) => pieces.has(w)));
  return hit ? hit[0] : null;
}

function ciFiles(root) {
  const workflows = listFiles(root, '.github/workflows')
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => `.github/workflows/${f}`);
  const others = ['.gitlab-ci.yml', 'bitbucket-pipelines.yml'].filter((f) => exists(root, f));
  return [...workflows, ...others].sort();
}

function collectCi(root, warnings) {
  return ciFiles(root).map((file) => {
    const text = readText(root, file) || '';
    const dirs = findWorkingDirectories(text);
    if (dirs.length) warnings.push(`CI chạy lệnh trong thư mục con ${dirs.join(', ')} (${file}); lệnh có thể không chạy được ở gốc repo`);
    return { file, commands: parseCiCommands(text) };
  });
}

module.exports = { parseCiCommands, classifyCommand, collectCi };
