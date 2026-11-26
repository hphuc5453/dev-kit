'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'hooks', 'verify-gate.cjs');

function makeRepo(commands) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vg-repo-'));
  const git = (...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  fs.writeFileSync(path.join(dir, 'a.txt'), 'one\n');
  if (commands) {
    fs.mkdirSync(path.join(dir, '.claude'));
    fs.writeFileSync(path.join(dir, '.claude', 'verify.json'), JSON.stringify({ commands, maxAttempts: 2 }));
  }
  git('add', '.');
  git('commit', '-qm', 'init');
  return dir;
}

function hook(mode, dir, sessionId, env = {}) {
  return spawnSync('node', [SCRIPT, mode], {
    input: JSON.stringify({ session_id: sessionId, cwd: dir }),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

const uid = () => `t-${process.pid}-${Math.random().toString(36).slice(2)}`;
const FAIL = 'node -e "console.error(\'lint boom\');process.exit(1)"';
const PASS = 'node -e "process.exit(0)"';

test('không có verify.json → cho qua', () => {
  const dir = makeRepo(null);
  fs.writeFileSync(path.join(dir, 'a.txt'), 'changed\n');
  assert.strictEqual(hook('stop', dir, uid()).status, 0);
});

test('không thay đổi so với baseline → không chạy verify', () => {
  const dir = makeRepo([FAIL]);
  const sid = uid();
  hook('baseline', dir, sid);
  assert.strictEqual(hook('stop', dir, sid).status, 0);
});

test('có thay đổi + verify fail → exit 2 kèm output', () => {
  const dir = makeRepo([FAIL]);
  const sid = uid();
  hook('baseline', dir, sid);
  fs.writeFileSync(path.join(dir, 'a.txt'), 'changed\n');
  const res = hook('stop', dir, sid);
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /lint boom/);
});

test('fail quá maxAttempts → cho dừng với systemMessage', () => {
  const dir = makeRepo([FAIL]);
  const sid = uid();
  hook('baseline', dir, sid);
  fs.writeFileSync(path.join(dir, 'a.txt'), 'changed\n');
  assert.strictEqual(hook('stop', dir, sid).status, 2);
  assert.strictEqual(hook('stop', dir, sid).status, 2);
  const res = hook('stop', dir, sid);
  assert.strictEqual(res.status, 0);
  assert.match(res.stdout, /systemMessage/);
});

test('verify pass → lần stop sau cùng trạng thái không chạy lại', () => {
  const dir = makeRepo([PASS]);
  const sid = uid();
  hook('baseline', dir, sid);
  fs.writeFileSync(path.join(dir, 'new.txt'), 'x\n');
  assert.strictEqual(hook('stop', dir, sid).status, 0);
  fs.writeFileSync(path.join(dir, '.claude', 'verify.json'), JSON.stringify({ commands: [FAIL] }));
  // verify.json đổi nhưng nằm trong .claude/ đã commit → diff đổi → chạy lại và fail
  assert.strictEqual(hook('stop', dir, sid).status, 2);
});

test('DEV_KIT_VERIFY=off → cho qua', () => {
  const dir = makeRepo([FAIL]);
  fs.writeFileSync(path.join(dir, 'a.txt'), 'changed\n');
  assert.strictEqual(hook('stop', dir, uid(), { DEV_KIT_VERIFY: 'off' }).status, 0);
});
