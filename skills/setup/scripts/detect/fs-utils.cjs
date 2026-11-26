'use strict';
// Đọc file/thư mục trong repo một cách an toàn: không bao giờ throw.

const fs = require('node:fs');
const path = require('node:path');

const IGNORED_DIRS = new Set(['node_modules', '.git', 'vendor', 'dist', 'build']);

function exists(root, rel) {
  return fs.existsSync(path.join(root, rel));
}

function readText(root, rel) {
  try {
    return fs
      .readFileSync(path.join(root, rel), 'utf8')
      .replace(/^﻿/, '')
      .replace(/\r\n/g, '\n');
  } catch {
    return null;
  }
}

function readJson(root, rel) {
  const text = readText(root, rel);
  if (text === null) return { value: null, error: false };
  try {
    return { value: JSON.parse(text), error: false };
  } catch {
    return { value: null, error: true };
  }
}

function listEntries(root, rel) {
  try {
    return fs.readdirSync(path.join(root, rel), { withFileTypes: true });
  } catch {
    return [];
  }
}

function listFiles(root, rel) {
  return listEntries(root, rel)
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();
}

function subdirs(root, rel) {
  return listEntries(root, rel)
    .filter((e) => e.isDirectory() && !IGNORED_DIRS.has(e.name))
    .map((e) => e.name)
    .sort();
}

module.exports = { exists, readText, readJson, listFiles, subdirs };
