'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const MAX_SKILL_LINES = 300;
const EXTERNAL_PLUGIN = /superpowers|commit-commands/i;
const SKILL_REF = /\bdev-kit:([a-z][a-z-]*)/g;

function skillNames() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, d.name, 'SKILL.md')))
    .map((d) => d.name);
}

function walkMarkdown(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return walkMarkdown(full);
    return d.name.endsWith('.md') ? [full] : [];
  });
}

function scannedFiles() {
  return [...walkMarkdown(SKILLS_DIR), path.join(ROOT, 'README.md'), path.join(ROOT, 'docs', 'USAGE.md')];
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function readFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([a-z-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2];
  }
  return fields;
}

test('mỗi SKILL.md có frontmatter name/description/argument-hint, name trùng thư mục', () => {
  for (const name of skillNames()) {
    const fm = readFrontmatter(path.join(SKILLS_DIR, name, 'SKILL.md'));
    assert.ok(fm, `${name}: thiếu frontmatter`);
    assert.strictEqual(fm.name, name, `${name}: name trong frontmatter là "${fm.name}"`);
    assert.ok(fm.description, `${name}: thiếu description`);
    assert.ok('argument-hint' in fm, `${name}: thiếu argument-hint`);
  }
});

test(`mỗi SKILL.md ≤ ${MAX_SKILL_LINES} dòng`, () => {
  for (const name of skillNames()) {
    const lines = fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8').split('\n').length;
    assert.ok(lines <= MAX_SKILL_LINES, `${name}: ${lines} dòng`);
  }
});

test('mọi tham chiếu dev-kit:<tên> trỏ tới skill có thật', () => {
  const known = new Set(skillNames());
  const broken = [];
  for (const file of scannedFiles()) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(SKILL_REF)) {
      if (!known.has(m[1])) broken.push(`${rel(file)}: dev-kit:${m[1]}`);
    }
  }
  assert.deepStrictEqual([...new Set(broken)], []);
});

test('skills, README, USAGE không nhắc tới plugin ngoài đã bỏ', () => {
  const hits = [];
  for (const file of scannedFiles()) {
    fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (EXTERNAL_PLUGIN.test(line)) hits.push(`${rel(file)}:${i + 1}`);
    });
  }
  assert.deepStrictEqual(hits, []);
});
