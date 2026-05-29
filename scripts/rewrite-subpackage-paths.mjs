/**
 * After moving pages to package-app, rewrite navigation paths /pages/X -> /package-app/pages/X
 * (does not touch /pages/index or /pages/blocked)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const miniRoot = path.join(__dirname, '..', 'miniprogram');

const ROUTES = [
  'shop',
  'my',
  'azjc',
  'ota',
  'products',
  'case',
  'pagenew',
  'scan',
  'adminLite',
  'admin',
  'paihang',
  'shouhou',
  'call',
  'home',
  'invest',
];

const exts = new Set(['.js', '.wxml', '.wxss', '.json', '.wxs']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules') continue;
      walk(p, out);
    } else if (exts.has(path.extname(name.name))) {
      out.push(p);
    }
  }
  return out;
}

let files = 0;
let repl = 0;

for (const file of walk(miniRoot)) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;
  for (const r of ROUTES) {
    const from = `/pages/${r}`;
    const to = `/package-app/pages/${r}`;
    s = s.split(from).join(to);
  }
  s = s.replaceAll('/package-app/package-app/pages/', '/package-app/pages/');
  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8');
    files++;
    repl += orig.length - s.length;
  }
}

console.log(`Updated ${files} files (rough byte delta ${repl})`);
