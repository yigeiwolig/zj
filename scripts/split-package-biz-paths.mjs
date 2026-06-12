/**
 * After moving secondary pages to package-biz:
 * 1) Rewrite navigation URLs
 * 2) Fix relative requires/imports (one extra ../)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const miniRoot = path.join(__dirname, '..', 'miniprogram');
const bizRoot = path.join(miniRoot, 'package-biz');

const BIZ_ROUTES = [
  'azjc',
  'ota',
  'pagenew',
  'adminLite',
  'admin',
  'paihang',
  'shouhou',
  'call',
  'home',
  'invest',
];

const exts = new Set(['.js', '.wxml', '.wxss', '.json', '.wxs', '.md']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
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

let urlFiles = 0;
for (const file of walk(miniRoot)) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;
  for (const r of BIZ_ROUTES) {
    s = s.split(`/package-app/pages/${r}`).join(`/package-biz/pages/${r}`);
  }
  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8');
    urlFiles++;
  }
}

let importFiles = 0;
for (const file of walk(bizRoot)) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;
  // package-biz/pages/xxx 与 package-app/pages/xxx 同级，均为 ../../../utils 到主包
  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8');
    importFiles++;
  }
}

console.log(`URL paths updated in ${urlFiles} files`);
console.log(`Relative imports fixed in ${importFiles} package-biz files`);
