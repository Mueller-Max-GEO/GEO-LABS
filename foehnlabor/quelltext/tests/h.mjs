import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path';
export const S = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export async function open(opts = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: opts.vp || { width: 1440, height: 1000 }, deviceScaleFactor: opts.dsf || 1, colorScheme: opts.dark ? 'dark' : 'light' });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errs.push(m.text()); if (m.type() === 'warning' && m.text().includes('THREE')) errs.push('WARN ' + m.text()); });
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.includes('cdn.jsdelivr.net/npm/three@0.160.0/')) return r.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/three', u.split('three@0.160.0/')[1])), contentType: 'application/javascript' });
    if (u.startsWith('file:')) return r.continue();
    return r.abort();
  });
  await page.goto("file://" + path.join(S, opts.file || process.env.FOEHN_FILE || "foehn-labor.html") + (process.env.FOEHN_HASH || ""));
  await page.waitForFunction(() => window.__foehn, null, { timeout: 20000 });
  await page.waitForTimeout(opts.settle ?? 1500);
  return { browser, page, errs };
}
export const shot = async (page, name, sel) => { const p = path.join(S, 'out', name + '.png'); fs.mkdirSync(path.dirname(p), { recursive: true }); if (sel) await (await page.$(sel)).screenshot({ path: p }); else await page.screenshot({ path: p }); return p; };
