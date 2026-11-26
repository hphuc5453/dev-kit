'use strict';
// Nhận diện stack theo manifest, package manager và monorepo/workspaces.

const { exists, readText, readJson, listFiles, subdirs } = require('./fs-utils.cjs');

const MANIFESTS = [
  ['package.json', 'node'],
  ['pyproject.toml', 'python'],
  ['requirements.txt', 'python'],
  ['setup.cfg', 'python'],
  ['go.mod', 'go'],
  ['pom.xml', 'java-maven'],
  ['build.gradle', 'java-gradle'],
  ['build.gradle.kts', 'java-gradle'],
  ['composer.json', 'php'],
  ['Cargo.toml', 'rust'],
  [/\.(csproj|sln)$/, 'dotnet'],
  ['pubspec.yaml', 'flutter'],
  ['Gemfile', 'ruby'],
];

const LOCK_FILES = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
];

const MONOREPO_MARKERS = [
  ['nx.json', 'nx'],
  ['turbo.json', 'turbo'],
  ['lerna.json', 'lerna'],
  ['pnpm-workspace.yaml', 'pnpm'],
];

const DEFAULT_GLOBS = ['apps/*', 'packages/*', 'libs/*'];

function findManifest(files, matcher) {
  if (typeof matcher === 'string') return files.includes(matcher) ? matcher : null;
  return files.find((f) => matcher.test(f)) || null;
}

function detectStacks(root, relDir) {
  const files = listFiles(root, relDir);
  const seen = new Set();
  const stacks = [];
  for (const [matcher, id] of MANIFESTS) {
    const manifest = findManifest(files, matcher);
    if (!manifest || seen.has(id)) continue;
    seen.add(id);
    stacks.push({ id, manifest, dir: relDir });
  }
  return stacks;
}

function detectPackageManager(root) {
  if (!exists(root, 'package.json')) return null;
  const pkg = readJson(root, 'package.json').value;
  if (pkg && typeof pkg.packageManager === 'string') return pkg.packageManager.split('@')[0];
  const lock = LOCK_FILES.find(([file]) => exists(root, file));
  return lock ? lock[1] : 'npm';
}

function pnpmWorkspaceGlobs(root) {
  const text = readText(root, 'pnpm-workspace.yaml');
  if (text === null) return null;
  const globs = [];
  let inPackages = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+#.*$/, '');
    if (/^\S/.test(line)) inPackages = /^packages:/.test(line);
    const flow = line.match(/^packages:\s*\[(.*)\]/);
    if (flow) globs.push(...flow[1].split(',').map(unquoteItem).filter(Boolean));
    const m = inPackages && line.match(/^\s*-\s*(.+?)\s*$/);
    if (m) globs.push(unquoteItem(m[1]));
  }
  return globs;
}

function unquoteItem(text) {
  return text.trim().replace(/^(['"])(.*)\1$/, '$2');
}

function packageJsonGlobs(root) {
  const pkg = readJson(root, 'package.json').value;
  const ws = pkg && pkg.workspaces;
  if (Array.isArray(ws)) return ws;
  if (ws && Array.isArray(ws.packages)) return ws.packages;
  return null;
}

function lernaGlobs(root) {
  const lerna = readJson(root, 'lerna.json').value;
  return lerna && Array.isArray(lerna.packages) ? lerna.packages : null;
}

function detectTool(root) {
  const marker = MONOREPO_MARKERS.find(([file]) => exists(root, file));
  if (marker) return marker[1];
  return packageJsonGlobs(root) ? 'workspaces' : null;
}

function expandGlob(root, glob, warnings) {
  if (glob.startsWith('!') || glob.includes('**')) {
    warnings.push(`Bỏ qua glob workspace không hỗ trợ: ${glob}`);
    return [];
  }
  const clean = glob.replace(/\/+$/, '');
  if (clean.endsWith('/*')) {
    const prefix = clean.slice(0, -2);
    return subdirs(root, prefix).map((name) => `${prefix}/${name}`);
  }
  if (clean.includes('*')) {
    warnings.push(`Bỏ qua glob workspace không hỗ trợ: ${glob}`);
    return [];
  }
  return exists(root, clean) ? [clean] : [];
}

function detectMonorepo(root, warnings) {
  const tool = detectTool(root);
  if (!tool) return null;
  const globs = pnpmWorkspaceGlobs(root) || packageJsonGlobs(root) || lernaGlobs(root) || DEFAULT_GLOBS;
  const dirs = new Set();
  for (const glob of globs) {
    for (const dir of expandGlob(root, glob, warnings)) dirs.add(dir);
  }
  if (dirs.size === 0) warnings.push(`Nhận diện monorepo (${tool}) nhưng không tìm thấy workspace nào`);
  return { tool, workspaces: [...dirs].sort() };
}

module.exports = { detectStacks, detectPackageManager, detectMonorepo };
