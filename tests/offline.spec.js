const { test, expect } = require('@playwright/test');

// The only spec that runs with the service worker enabled (the config blocks it everywhere else).
test.use({ serviceWorkers: 'allow' });

test('the installed copy starts offline, entirely from one cache', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__dino);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller); // installed and in control
  const cached = await page.evaluate(async () => {
    const names = await caches.keys(), c = await caches.open(names[0]);
    return { names, files: (await c.keys()).map(r => new URL(r.url).pathname) };
  });
  expect(cached.names).toHaveLength(1);
  for (const f of ['/index.html', '/js/core.js', '/js/main.js', '/manifest.webmanifest']) expect(cached.files).toContain(f);
  expect(cached.files.filter(f => f.startsWith('/js/'))).toHaveLength(17);

  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__dino);
  await page.evaluate(() => window.__dino.go('map'));
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__dino.scene)).toBe('map');
  expect(errors).toEqual([]);
});
