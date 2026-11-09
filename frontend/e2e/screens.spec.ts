import { mkdirSync } from 'node:fs';
import { expect, Page, test } from '@playwright/test';
import { accedi, aspettaDati } from './aiuti';

/**
 * Genera gli screenshot di fine fase: `FASE=1 npx playwright test e2e/screens.spec.ts`.
 * Ogni fase contiene le pagine introdotte in quella fase, a 1440px e 390px, con i dati,
 * e per le pagine principali anche senza dati, in caricamento e in errore.
 */
const fase = process.env['FASE'] ?? '0';
const cartella = process.env['OUT'] ?? `docs/screens/fase-${fase}`;
const soloViewport = process.env['SOLO_VIEWPORT'] === '1';

interface Schermata {
  nome: string;
  fase: string;
  url: string;
  /** Azioni da fare dopo il caricamento, prima dello screenshot. */
  prepara?: (page: Page) => Promise<void>;
  /** Voce della barra laterale: se c'è, si fanno anche le versioni vuota, in caricamento e in errore. */
  voce?: string;
}

const SCHERMATE: Schermata[] = [
  { nome: 'stile', fase: '0', url: '/stile' },
  { nome: 'oggi', fase: '1', url: '/oggi', voce: 'Oggi' },
  { nome: 'candidature-elenco', fase: '1', url: '/candidature', voce: 'Candidature' },
  { nome: 'candidature-bacheca', fase: '1', url: '/candidature?vista=bacheca' },
  { nome: 'candidature-filtrate', fase: '1', url: '/candidature?modalita=REMOTO&stato=IN_CORSO' },
  {
    nome: 'candidatura-dettaglio',
    fase: '1',
    url: '/candidature',
    prepara: async (page) => {
      await page.getByRole('link', { name: 'Nordvento' }).first().click();
      await expect(page.getByRole('heading', { level: 1, name: 'Nordvento' })).toBeVisible();
      await page.waitForTimeout(800);
    },
  },
  {
    nome: 'aggiunta-rapida',
    fase: '1',
    url: '/candidature',
    prepara: async (page) => {
      await page.keyboard.press('n');
      const p = page.getByRole('dialog');
      await p.getByLabel('Azienda').fill('Nordvento');
      await p.getByRole('button', { name: 'Altri dettagli' }).click();
      await page.waitForTimeout(400);
    },
  },
  { nome: 'colloqui', fase: '3', url: '/colloqui', voce: 'Colloqui' },
  {
    nome: 'colloqui-conclusi',
    fase: '3',
    url: '/colloqui',
    prepara: async (page) => void (await page.getByRole('tab', { name: /Conclusi/ }).click()),
  },
  {
    nome: 'colloqui-domande',
    fase: '3',
    url: '/colloqui',
    prepara: async (page) => void (await page.getByRole('tab', { name: /Domande ricevute/ }).click()),
  },
  { nome: 'aziende', fase: '3', url: '/aziende', voce: 'Aziende' },
  {
    nome: 'azienda-dettaglio',
    fase: '3',
    url: '/aziende',
    prepara: async (page) => {
      await page.getByRole('link', { name: /^altavia$/i }).click();
      await expect(page.getByRole('heading', { level: 1, name: /altavia/i })).toBeVisible();
      await page.waitForTimeout(1200);
    },
  },
  { nome: 'materiali', fase: '4', url: '/materiali', voce: 'Materiali' },
  { nome: 'offerte', fase: '4', url: '/offerte', voce: 'Offerte' },
  { nome: 'profilo', fase: '4', url: '/profilo' },
  {
    nome: 'ricerca-globale',
    fase: '4',
    url: '/oggi',
    prepara: async (page) => {
      await page.keyboard.press('Control+k');
      await expect(page.getByRole('combobox', { name: 'Cerca' })).toBeFocused();
      await page.keyboard.type('al');
      await page.waitForTimeout(400);
    },
  },
];

const VISTE = [
  { nome: '1440', width: 1440, height: 900 },
  { nome: '390', width: 390, height: 844 },
];

async function scatta(page: Page, nome: string, vista: string): Promise<void> {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${cartella}/${nome}-${vista}.png`, fullPage: !soloViewport });
}

async function accediVuoto(page: Page): Promise<void> {
  await page.goto('/registrati');
  await page.getByLabel('Nome', { exact: true }).fill('Elena');
  await page.getByLabel('Cognome').fill('Nuovi');
  await page.getByLabel('Email').fill(`nuova.${Date.now()}@esempio.it`);
  await page.getByLabel('Password').fill('password-lunga');
  await page.getByRole('button', { name: 'Crea account' }).click();
  await expect(page).toHaveURL(/\/oggi/);
}

test.beforeAll(() => mkdirSync(cartella, { recursive: true }));

for (const v of VISTE) {
  test.describe(`screenshot ${v.nome}`, () => {
    test.use({ viewport: { width: v.width, height: v.height } });

    if (fase === '1') {
      test('accesso e registrazione', async ({ page }) => {
        await page.goto('/accedi');
        await scatta(page, 'accedi', v.nome);
        await page.getByRole('button', { name: 'Accedi' }).click();
        await scatta(page, 'accedi-errori', v.nome);
        await page.goto('/registrati');
        await scatta(page, 'registrati', v.nome);
      });
    }

    for (const s of SCHERMATE.filter((x) => x.fase === fase)) {
      test(s.nome, async ({ page }) => {
        await accedi(page, s.url);
        await aspettaDati(page);
        await s.prepara?.(page);
        await scatta(page, s.nome, v.nome);
      });

      if (s.voce) {
        test(`${s.nome}, senza dati`, async ({ page }) => {
          await accediVuoto(page);
          if (s.voce !== 'Oggi') await page.getByRole('link', { name: new RegExp(`^${s.voce}`) }).click();
          await aspettaDati(page);
          await scatta(page, `${s.nome}-vuoto`, v.nome);
        });

        test(`${s.nome}, in caricamento`, async ({ page }) => {
          await accedi(page);
          await page.evaluate(() => sessionStorage.setItem('candidate.mock.lento', '8000'));
          await page.goto(s.url);
          await expect(page.locator('app-scheletro').first()).toBeVisible();
          await scatta(page, `${s.nome}-caricamento`, v.nome);
        });

        test(`${s.nome}, in errore`, async ({ page }) => {
          await accedi(page);
          await page.evaluate(() => sessionStorage.setItem('candidate.mock.errore', '1'));
          await page.goto(s.url);
          await expect(page.getByRole('alert')).toBeVisible();
          await scatta(page, `${s.nome}-errore`, v.nome);
        });
      }
    }
  });
}
