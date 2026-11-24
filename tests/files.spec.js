const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const scripts = [...read('index.html').matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);

test('every script of index.html exists, is precached by the service worker and is deployed by CI', () => {
  expect(scripts.length).toBeGreaterThan(1);
  const sw = read('sw.js'), ci = read('.github/workflows/ci.yml');
  for (const s of scripts) {
    expect(fs.existsSync(path.join(root, s)), `${s} exists`).toBe(true);
    expect(sw, `${s} is in sw.js FILES`).toContain(`'${s}'`);
    const dir = s.includes('/') ? s.split('/')[0] : null;
    expect(dir ? new RegExp(`cp -r ${dir} _site/`).test(ci) : ci.includes(s), `${s} is copied by ci.yml`).toBe(true);
  }
  // no stray script in js/ that index.html forgot
  for (const f of fs.readdirSync(path.join(root, 'js'))) expect(scripts, `js/${f} is loaded`).toContain(`js/${f}`);
  // everything sw.js precaches exists
  for (const f of [...sw.matchAll(/'([^']+\.(?:js|html|png|webmanifest))'/g)].map(m => m[1])) expect(fs.existsSync(path.join(root, f)), f).toBe(true);
});

// The scripts share the global scope (no IIFE). A top-level function or var with the name of a browser
// built-in (open, stop, print, ...) would overwrite it; a let/const that clashes with a non-configurable
// window property would not even load.
test('top-level names do not collide with browser built-ins', async ({ page }) => {
  const funcs = new Set(), lexical = new Set();
  for (const s of scripts.filter(s => s.startsWith('js/'))) {
    for (const line of read(s).split('\n')) {
      let m = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/.exec(line); if (m) funcs.add(m[1]);
      m = /^var\s+([A-Za-z_$][\w$]*)/.exec(line); if (m) funcs.add(m[1]);
      m = /^(?:let|const|class)\s+([A-Za-z_$][\w$]*)/.exec(line); if (m) lexical.add(m[1]);
    }
  }
  await page.goto('about:blank');
  const bad = await page.evaluate(([f, l]) => ({
    overwritten: f.filter(n => n in window),
    unloadable: l.filter(n => { const d = Object.getOwnPropertyDescriptor(window, n); return d && !d.configurable; }),
  }), [[...funcs], [...lexical]]);
  expect(bad).toEqual({ overwritten: [], unloadable: [] });
});
