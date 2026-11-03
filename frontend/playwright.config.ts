import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  // Un solo tentativo extra: il dev server può ricaricare la pagina quando ottimizza una dipendenza caricata per la prima volta.
  retries: 1,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4201',
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      // Suite normale: gira contro il mock (porta 4201). La prova col backend vero è un progetto a parte.
      testIgnore: /backend-reale\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        // Se la build di Chromium che Playwright si aspetta non è installata, si può indicare un eseguibile già presente.
        launchOptions: { executablePath: process.env['PW_CHROMIUM'] || undefined },
      },
    },
    {
      // Richiede backend su :8080 e `npm start` su :4200 già avviati.
      name: 'backend-reale',
      testMatch: /backend-reale\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4200',
        viewport: { width: 1440, height: 900 },
        launchOptions: { executablePath: process.env['PW_CHROMIUM'] || undefined },
      },
    },
  ],
  webServer: {
    command: 'npm run start:mock',
    url: 'http://localhost:4201',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
