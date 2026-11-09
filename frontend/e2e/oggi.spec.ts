import { expect, test } from '@playwright/test';
import { accedi, aspettaDati } from './aiuti';

test.describe('Oggi', () => {
  test.beforeEach(async ({ page }) => {
    await accedi(page);
    await aspettaDati(page);
  });

  test('mostra la linea con i conteggi, le cose da fare, i colloqui e la settimana', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Dove si trovano le \d+ candidature ancora in corso/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Da fare', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Prossimi colloqui' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Questa settimana' })).toBeVisible();
    await expect(page.getByText(/Prepara il colloquio tecnico con Nordvento/)).toBeVisible();
  });

  test('«Da fare» sta in cima, sotto la testata e sopra la linea, a tutta larghezza', async ({ page }) => {
    const daFare = page.getByRole('region', { name: 'Da fare' });
    const linea = page.getByRole('heading', { name: /Dove si trovano le \d+ candidature ancora in corso/ });
    const [a, b] = [await daFare.boundingBox(), await linea.boundingBox()];
    expect(a!.y).toBeLessThan(b!.y);
    const titolo = await page.getByRole('heading', { level: 1 }).boundingBox();
    expect(a!.y).toBeGreaterThan(titolo!.y);
    const pagina = await page.locator('app-oggi-pagina').boundingBox();
    expect(a!.width).toBeGreaterThan(pagina!.width * 0.9);
  });

  test('«Andamento in breve» mostra tre riquadri', async ({ page }) => {
    const sezione = page.getByRole('region', { name: 'Andamento in breve' });
    await expect(sezione.getByRole('listitem')).toHaveCount(3);
    await expect(sezione.getByText('Inviate negli ultimi 30 giorni')).toBeVisible();
    await expect(sezione.getByText('Risposte', { exact: true })).toBeVisible();
    await expect(sezione.getByText('Colloqui fatti')).toBeVisible();
    await expect(sezione.getByText(/^\d+ su \d+$/)).toBeVisible();
  });

  test('in fondo ci sono Ritmo e Costanza, con l’alternativa a tabella', async ({ page }) => {
    // I grafici arrivano con @defer quando il segnaposto entra nello schermo.
    await page.locator('.posto-grafici, app-ritmo-costanza').first().scrollIntoViewIfNeeded();
    const costanza = page.getByRole('region', { name: 'Costanza' });
    await costanza.scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'Ritmo', level: 2 })).toBeVisible();
    const grafico = costanza.locator('app-grafico');
    await expect(grafico.locator('canvas')).toBeVisible();
    await grafico.getByRole('button', { name: 'Vedi come tabella' }).click();
    await expect(grafico.getByRole('table')).toBeVisible();
  });

  test('il vecchio indirizzo /andamento porta a Oggi', async ({ page }) => {
    await page.goto('/andamento');
    await expect(page).toHaveURL(/\/oggi/);
  });

  test('a 390px i riquadri vanno in colonna e la pagina non scorre in orizzontale', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const riquadri = page.getByRole('region', { name: 'Andamento in breve' }).getByRole('listitem');
    const [uno, due] = [await riquadri.nth(0).boundingBox(), await riquadri.nth(1).boundingBox()];
    expect(due!.y).toBeGreaterThan(uno!.y + uno!.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('ogni fermata apre Candidature filtrata', async ({ page }) => {
    await page.getByRole('link', { name: /^Tecnico 1: \d+ candidature/ }).click();
    await expect(page).toHaveURL(/fermata=2/);
    await expect(page.getByRole('button', { name: /Togli il filtro fermata Tecnico 1/ })).toBeVisible();
  });

  test('«Segna come fatto» toglie la voce senza cambiare pagina e si può annullare', async ({ page }) => {
    const titolo = page.getByRole('heading', { level: 1 });
    const prima = Number((await titolo.textContent())!.match(/\d+/)![0]);
    await page.locator('li.riga', { hasText: 'Manda il portfolio a Giulia di Altavia' }).getByRole('button', { name: 'Segna come fatto' }).click();
    await expect(titolo).toHaveText(`Oggi hai ${prima - 1} ${prima - 1 === 1 ? 'cosa' : 'cose'} da fare`);
    await expect(page).toHaveURL(/\/oggi/);
    await page.getByRole('button', { name: 'Annulla' }).click();
    await expect(titolo).toHaveText(`Oggi hai ${prima} cose da fare`);
  });

  test('l’app propone di segnare senza risposta ma lo stato cambia solo dopo il clic', async ({ page }) => {
    const riga = page.locator('li.riga', { hasText: 'Lumia Tech non risponde da' });
    await expect(riga.getByText('In attesa', { exact: true })).toBeVisible();
    await riga.getByRole('button', { name: 'Segna senza risposta' }).click();
    await expect(page.getByText('Lumia Tech segnata come senza risposta')).toBeVisible();
    await expect(page.locator('li.riga', { hasText: 'Lumia Tech non risponde da' })).toHaveCount(0);
  });

  test('«Scrivi un sollecito» apre il modello già compilato e lo copia', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('li.riga', { hasText: 'Lumia Tech non risponde da' }).getByRole('button', { name: 'Scrivi un sollecito' }).click();
    const testo = page.getByRole('dialog').getByLabel('Testo del messaggio');
    await expect(testo).toHaveValue(/Lumia Tech/);
    await expect(testo).toHaveValue(/Backend Developer/);
    await expect(testo).not.toHaveValue(/\{azienda\}/);
    await page.getByRole('button', { name: 'Copia testo' }).click();
    await expect(page.getByText('Testo copiato')).toBeVisible();
  });

  test('«Apri preparazione» porta alla scheda del colloquio, evidenziata', async ({ page }) => {
    await page.getByRole('button', { name: 'Apri preparazione' }).click();
    await expect(page).toHaveURL(/\/colloqui\?apri=\d+/);
    await expect(page.locator('article.evidenziata')).toContainText('Nordvento');
  });
});
