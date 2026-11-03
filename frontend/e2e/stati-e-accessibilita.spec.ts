import { expect, test } from '@playwright/test';
import { accedi, aspettaDati } from './aiuti';

const PAGINE = ['/oggi', '/candidature', '/candidature?vista=bacheca', '/andamento', '/colloqui', '/aziende', '/materiali', '/offerte', '/profilo'];

test.describe('stati di caricamento, errore e vuoto', () => {
  test('mentre i dati arrivano si vede lo scheletro, non una pagina vuota', async ({ page }) => {
    await accedi(page);
    await page.evaluate(() => sessionStorage.setItem('candidate.mock.lento', '1500'));
    await page.goto('/candidature');
    await expect(page.getByRole('status', { name: /Sto caricando le candidature/ }).or(page.locator('app-scheletro'))).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 });
  });

  for (const url of ['/oggi', '/candidature', '/andamento', '/colloqui', '/aziende', '/materiali', '/offerte']) {
    test(`${url}: se il server dà errore spiega cosa fare e «Riprova» funziona`, async ({ page }) => {
      await accedi(page);
      await page.evaluate(() => sessionStorage.setItem('candidate.mock.errore', '1'));
      await page.goto(url);
      await expect(page.getByRole('alert')).toContainText('Non riesco a mostrarti questi dati');
      await expect(page.getByRole('alert')).toContainText('Il server ha avuto un problema');
      await page.evaluate(() => sessionStorage.removeItem('candidate.mock.errore'));
      await page.getByRole('button', { name: 'Riprova' }).click();
      await expect(page.getByRole('alert')).toHaveCount(0);
    });
  }

  test('una candidatura inesistente dà «non esiste più» nel contesto', async ({ page }) => {
    await accedi(page, '/candidature/99999');
    await expect(page.getByText('Questa candidatura non esiste più')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Vai alle candidature' })).toBeVisible();
  });

  test('una sessione scaduta (401) riporta all’accesso conservando la pagina', async ({ page }) => {
    await accedi(page);
    await page.evaluate(() => sessionStorage.setItem('candidate.token', 'mock.999.scaduto'));
    await page.goto('/colloqui');
    await expect(page).toHaveURL(/\/accedi\?ritorno=%2Fcolloqui/);
  });

  test('un account nuovo vede stati vuoti con l’azione successiva in ogni pagina', async ({ page }) => {
    await page.goto('/registrati');
    await page.getByLabel('Nome', { exact: true }).fill('Vuota');
    await page.getByLabel('Cognome').fill('Prova');
    await page.getByLabel('Email').fill(`vuota.${Date.now()}@esempio.it`);
    await page.getByLabel('Password').fill('password-lunga');
    await page.getByRole('button', { name: 'Crea account' }).click();
    await expect(page).toHaveURL(/\/oggi/);
    const attesi: [string, string][] = [
      ['/candidature', 'Non hai ancora candidature'],
      ['/andamento', 'Non c’è ancora niente da analizzare'],
      ['/colloqui', 'Non hai colloqui in programma'],
      ['/aziende', 'Non hai ancora aziende'],
      ['/materiali', 'Non hai ancora versioni del CV'],
      ['/offerte', 'Qui confronterai le proposte quando ne riceverai una.'],
    ];
    for (const [url, testo] of attesi) {
      await page.getByRole('link', { name: new RegExp(`^${url === '/candidature' ? 'Candidature' : url === '/andamento' ? 'Andamento' : url === '/colloqui' ? 'Colloqui' : url === '/aziende' ? 'Aziende' : url === '/materiali' ? 'Materiali' : 'Offerte'}`) }).click();
      await expect(page.getByText(testo).first()).toBeVisible();
    }
  });
});

test.describe('tastiera e accessibilità', () => {
  test('il primo Tab porta a «Vai al contenuto» e Invio sposta il focus nella pagina', async ({ page }) => {
    await accedi(page);
    await aspettaDati(page);
    await page.keyboard.press('Tab');
    const salta = page.getByRole('link', { name: 'Vai al contenuto' });
    await expect(salta).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#contenuto')).toBeFocused();
  });

  test('il focus è sempre visibile', async ({ page }) => {
    await accedi(page);
    await aspettaDati(page);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const contorno = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const s = getComputedStyle(el);
        return { w: parseFloat(s.outlineWidth), stile: s.outlineStyle, ombra: s.boxShadow };
      });
      expect(contorno.w > 0 && contorno.stile !== 'none' ? true : contorno.ombra !== 'none').toBe(true);
    }
  });

  test('il tasto N non si attiva mentre si scrive in un campo', async ({ page }) => {
    await accedi(page, '/candidature');
    await aspettaDati(page);
    await page.getByPlaceholder('Cerca azienda, ruolo o città').click();
    await page.keyboard.type('nordvento');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByPlaceholder('Cerca azienda, ruolo o città')).toHaveValue('nordvento');
  });

  test('Esc chiude il pannello e il focus torna dove era', async ({ page }) => {
    await accedi(page, '/candidature');
    await aspettaDati(page);
    await page.keyboard.press('n');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('la barra laterale segna la pagina corrente con aria-current', async ({ page }) => {
    await accedi(page, '/colloqui');
    await expect(page.getByRole('navigation', { name: 'Navigazione principale' }).getByRole('link', { name: /^Colloqui/ })).toHaveAttribute('aria-current', 'page');
  });

  test('ogni pagina ha un solo titolo di primo livello e la lingua è italiana', async ({ page }) => {
    await accedi(page);
    await aspettaDati(page);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('it');
    for (const url of PAGINE) {
      await page.goto(url);
      await aspettaDati(page);
      await expect(page.locator('h1')).toHaveCount(1);
    }
  });

  test('il contatore della barra laterale compare solo su Oggi, Colloqui e Offerte', async ({ page }) => {
    await accedi(page);
    await aspettaDati(page);
    const nav = page.getByRole('navigation', { name: 'Navigazione principale' });
    await expect(nav.locator('.n')).toHaveCount(3);
    await expect(nav.getByRole('link', { name: /^Candidature/ }).locator('.n')).toHaveCount(0);
  });
});

test.describe('mobile a 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('nessuna pagina ha scroll orizzontale', async ({ page }) => {
    await accedi(page);
    await aspettaDati(page);
    for (const url of PAGINE) {
      await page.goto(url);
      await aspettaDati(page);
      await page.waitForTimeout(400);
      const larghezza = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, finestra: window.innerWidth }));
      expect(larghezza.doc, `${url} deborda a 390px`).toBeLessThanOrEqual(larghezza.finestra);
    }
  });

  test('la navigazione diventa una barra orizzontale scorrevole', async ({ page }) => {
    await accedi(page);
    const nav = page.getByRole('navigation', { name: 'Navigazione principale' });
    const stile = await nav.evaluate((el) => getComputedStyle(el).flexDirection);
    expect(stile).toBe('row');
    await expect(nav.getByRole('link', { name: 'Profilo' })).toBeAttached();
  });
});
