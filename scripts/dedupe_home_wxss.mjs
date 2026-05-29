import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wxssPath = path.join(__dirname, '..', 'miniprogram', 'pages', 'home', 'home.wxss');

const START =
  '/* ================= 自动消失提示（无按钮，3秒后自动消失，带收缩退出动画） ================= */';
const END = '.cd-btn:active { opacity: 0.8; transform: scale(0.98); }\n';

let text = fs.readFileSync(wxssPath, 'utf8');
const originalLen = text.length;
let i = 0;
const out = [];
let kept = 0;
let removed = 0;

while (true) {
  const idx = text.indexOf(START, i);
  if (idx === -1) {
    out.push(text.slice(i));
    break;
  }
  out.push(text.slice(i, idx));
  const end = text.indexOf(END, idx);
  if (end === -1) {
    out.push(text.slice(idx));
    break;
  }
  const blockEnd = end + END.length;
  const block = text.slice(idx, blockEnd);
  if (kept === 0) {
    out.push(block);
    kept++;
  } else {
    removed++;
  }
  i = blockEnd;
}

const newText = out.join('');
fs.writeFileSync(wxssPath, newText, 'utf8');
console.log(
  `home.wxss: ${originalLen} -> ${newText.length} bytes (removed ${removed} duplicate toast/dialog blocks)`
);
