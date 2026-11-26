#!/usr/bin/env node
// dev-kit verify-gate.
//   baseline: (SessionStart) ghi lại trạng thái working tree lúc mở phiên.
//   stop:     (Stop) nếu working tree khác baseline và khác lần verify pass gần nhất,
//             chạy các lệnh trong <repo>/.claude/verify.json; fail → exit 2 để Claude sửa tiếp.
// Repo không có .claude/verify.json → không làm gì. Tắt tạm: DEV_KIT_VERIFY=off.
'use strict';

const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_SEC = 600;
const TAIL_LINES = 80;
const TAIL_CHARS = 6000;
const STATE_DIR = path.join(os.tmpdir(), 'dev-kit-verify');

function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function git(args, cwd) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return res.status === 0 ? res.stdout : null;
}

function findRepoRoot(cwd) {
  const out = git(['rev-parse', '--show-toplevel'], cwd);
  return out ? out.trim() : null;
}

function loadConfig(root) {
  const file = path.join(root, '.claude', 'verify.json');
  if (!fs.existsSync(file)) return null;
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(cfg.commands) || cfg.commands.length === 0) return null;
  return {
    commands: cfg.commands,
    maxAttempts: cfg.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    timeoutSec: cfg.timeoutSec ?? DEFAULT_TIMEOUT_SEC,
  };
}

function untrackedSignature(root) {
  const list = git(['ls-files', '--others', '--exclude-standard'], root) || '';
  return list
    .split('\n')
    .filter(Boolean)
    .map((file) => {
      try {
        const st = fs.statSync(path.join(root, file));
        return `${file}:${st.size}:${st.mtimeMs}`;
      } catch {
        return file;
      }
    })
    .join('\n');
}

// Dấu vân tay của working tree: thay đổi so với HEAD + file untracked.
function fingerprint(root) {
  const parts = [git(['diff', 'HEAD'], root) || '', untrackedSignature(root)];
  return crypto.createHash('sha1').update(parts.join('\0')).digest('hex');
}

function stateFile(sessionId) {
  const safe = String(sessionId || 'default').replace(/[^\w-]/g, '_');
  return path.join(STATE_DIR, `${safe}.json`);
}

function loadState(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(stateFile(sessionId), 'utf8'));
  } catch {
    return {};
  }
}

function saveState(sessionId, state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(stateFile(sessionId), JSON.stringify(state));
}

function tail(text) {
  const lines = text.split(/\r?\n/).slice(-TAIL_LINES).join('\n');
  return lines.length > TAIL_CHARS ? lines.slice(-TAIL_CHARS) : lines;
}

function runCommand(command, root, timeoutSec) {
  const res = spawnSync(command, {
    cwd: root,
    shell: true,
    encoding: 'utf8',
    timeout: timeoutSec * 1000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${res.stdout || ''}${res.stderr || ''}`;
  if (res.error) return { ok: false, output: `${res.error.message}\n${output}` };
  return { ok: res.status === 0, output };
}

function runAll(cfg, root) {
  for (const command of cfg.commands) {
    const result = runCommand(command, root, cfg.timeoutSec);
    if (!result.ok) return { failed: command, output: result.output };
  }
  return null;
}

function blockStop(failure, attempt, maxAttempts) {
  process.stderr.write(
    `[dev-kit verify-gate] Lệnh verify fail (lần ${attempt}/${maxAttempts}): \`${failure.failed}\`\n` +
      'Sửa cho tới khi sạch (lint 0 error / 0 warning) rồi mới kết thúc. ' +
      'Không tắt rule, không thêm eslint-disable/noqa để lách; nếu thật sự không sửa được, giải thích lý do cho user.\n\n' +
      `${tail(failure.output)}\n`,
  );
  process.exit(2);
}

function giveUp(failure, maxAttempts) {
  const msg =
    `[dev-kit verify-gate] \`${failure.failed}\` vẫn fail sau ${maxAttempts} lần sửa. ` +
    'Cho phép dừng để bạn xem; chạy lại lệnh verify để biết chi tiết.';
  process.stdout.write(JSON.stringify({ systemMessage: msg }));
  process.exit(0);
}

function handleBaseline(input, root) {
  const state = loadState(input.session_id);
  saveState(input.session_id, { ...state, baseline: fingerprint(root), failCount: 0 });
}

function handleStop(input, root, cfg) {
  const state = loadState(input.session_id);
  const current = fingerprint(root);
  if (current === state.baseline || current === state.lastPass) return;

  const failure = runAll(cfg, root);
  if (!failure) {
    saveState(input.session_id, { ...state, lastPass: current, failCount: 0 });
    return;
  }
  const attempt = (state.failCount || 0) + 1;
  if (attempt > cfg.maxAttempts) {
    saveState(input.session_id, { ...state, failCount: 0 });
    giveUp(failure, cfg.maxAttempts);
  }
  saveState(input.session_id, { ...state, failCount: attempt });
  blockStop(failure, attempt, cfg.maxAttempts);
}

function main() {
  if (process.env.DEV_KIT_VERIFY === 'off') return;
  const mode = process.argv[2];
  const input = readStdinJson();
  const root = findRepoRoot(input.cwd || process.cwd());
  if (!root) return;
  const cfg = loadConfig(root);
  if (!cfg) return;

  if (mode === 'baseline') handleBaseline(input, root);
  if (mode === 'stop') handleStop(input, root, cfg);
}

main();
