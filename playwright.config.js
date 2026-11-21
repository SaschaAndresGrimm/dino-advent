const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests',
  timeout: 90000,
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:8790', viewport: { width: 960, height: 540 }, serviceWorkers: 'block' },
  webServer: { command: 'python3 -m http.server 8790', port: 8790, reuseExistingServer: true },
});
