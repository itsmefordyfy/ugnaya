// Responsive sweep: loads each page at each width in headless Chrome and reports horizontal scroll, elements past
// the viewport edge, and buttons or links under 40 px tall (needs Google Chrome on macOS).
//   node scripts/responsive-sweep.mjs http://localhost:3000 /,/pricing,/login 320,375,390,430,768,1024,1280,1440,1920
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [base, pagesArg, widthsArg] = process.argv.slice(2);
const pages = pagesArg.split(','); const widths = widthsArg.split(',').map(Number);
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'sweep-'))}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const probe = `(() => {
  const vw = document.documentElement.clientWidth;
  const bad = [], small = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[aria-hidden="true"], .sr-only')) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if (r.right > vw + 1 && cs.position !== 'fixed' && !el.closest('svg')) {
      let clipped = false; for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') { clipped = true; break; } }
      if (!clipped) bad.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 2).join('.') + ' right=' + Math.round(r.right));
    }
    if ((el.tagName === 'BUTTON' || (el.tagName === 'A' && el.matches('nav a, a[class*="inline-flex"], footer a'))) && r.height < 40 && !el.closest('p, li > a:only-child') ) small.push(el.tagName.toLowerCase() + ' "' + (el.textContent || '').trim().slice(0, 24) + '" h=' + Math.round(r.height));
  }
  return JSON.stringify({ scrollWidth: document.documentElement.scrollWidth, vw, bad: bad.slice(0, 3), small: [...new Set(small)].slice(0, 3) });
})()`;
let problems = 0;
for (const page of pages) {
  for (const w of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: w < 600 ? 800 : 900, deviceScaleFactor: 1, mobile: w < 600 });
    await send('Page.navigate', { url: base + page }); await sleep(1100);
    const res = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
    const v = JSON.parse(res.result.result.value);
    const issues = [];
    if (v.scrollWidth > v.vw + 1) issues.push(`HORIZONTAL SCROLL ${v.scrollWidth} > ${v.vw}`);
    if (v.bad.length) issues.push('past edge: ' + v.bad.join('; '));
    if (v.small.length) issues.push('small targets: ' + v.small.join('; '));
    if (issues.length) { problems++; console.log(`${page} @${w}: ${issues.join(' | ')}`); }
  }
}
console.log(`swept ${pages.length} pages x ${widths.length} widths: ${problems} with findings`);
ws.close(); chrome.kill();
