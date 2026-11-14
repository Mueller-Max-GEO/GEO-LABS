import { chromium } from 'playwright'; import path from 'path';
const S = '/tmp/claude-0/-home-claude/4c9bd4db-f3f3-5c57-9c86-e1efd10303c7/scratchpad/foehn';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-webgl', '--disable-3d-apis'] });
const p = await b.newPage(); await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
await p.goto('file://' + path.join(S, 'foehn-labor.html')); await p.waitForTimeout(2500);
console.log(await p.evaluate(() => { const e = document.getElementById('bootFail'); return e.hidden ? 'KEINE Meldung' : e.innerText.slice(0, 160); }));
await b.close();
