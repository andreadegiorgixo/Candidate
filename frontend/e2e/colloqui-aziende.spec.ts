import { expect, test } from '@playwright/test';
import { accedi, aspettaDati } from './aiuti';

test.describe('Colloqui', () => {
  test.beforeEach(async ({ page }) => {
    await accedi(page, '/colloqui');
    await aspettaDati(page);
  });

  test('l’agenda mostra i colloqui in programma in ordine di data con la checklist', async ({ page }) => {
    const schede = page.locator('article.scheda');
    await expect(schede).toHaveCount(2);
    await expect(schede.first()).toContainText('Nordvento');
    await expect(schede.first().getByText(/Preparazione, \d di \d/)).toBeVisible();
  });

  test('spuntare una voce aggiorna l’avanzamento', async ({ page }) => {
    const scheda = page.locator('article.scheda').first();
    await expect(scheda.getByText('Preparazione, 1 di 3')).toBeVisible();
    await scheda.getByLabel('Preparare due domande per chi mi intervista').check();
    await expect(scheda.getByText('Preparazione, 2 di 3')).toBeVisible();
  });

  test('un colloquio concluso senza resoconto chiede di scriverlo', async ({ page }) => {
    await expect(page.getByText('C’è un colloquio concluso senza resoconto.')).toBeVisible();
    await page.getByRole('tab', { name: /Conclusi/ }).click();
    await page.getByRole('button', { name: 'Scrivi il resoconto' }).first().click();
    const dialogo = page.getByRole('dialog');
    await dialogo.getByRole('radio', { name: '4' }).click();
    await dialogo.getByLabel('Domande ricevute, una per riga').fill('Come funziona il garbage collector?');
    await dialogo.getByLabel('Cosa migliorare').fill('Ripassare la JVM');
    await dialogo.getByRole('button', { name: 'Salva resoconto' }).click();
    await expect(page.getByText('Resoconto salvato')).toBeVisible();
    await expect(page.getByText('Come funziona il garbage collector?')).toBeVisible();
  });

  test('l’archivio delle domande si cerca e si filtra per tipo', async ({ page }) => {
    await page.getByRole('tab', { name: /Domande ricevute/ }).click();
    await expect(page.locator('.archivio li').first()).toBeVisible();
    const prima = await page.locator('.archivio li').count();
    expect(prima).toBeGreaterThan(3);
    await page.getByPlaceholder('Cerca tra le domande').fill('transazioni');
    await expect(page.locator('.archivio li')).toHaveCount(1);
    await expect(page.getByText(/Tornata \d+ volte/)).toBeVisible();
    await page.getByPlaceholder('Cerca tra le domande').fill('');
    await page.getByRole('combobox', { name: 'Tipo di colloquio' }).click();
    await page.getByRole('option', { name: 'Tecnico 2' }).click();
    await expect.poll(() => page.locator('.archivio li').count()).toBeLessThan(prima);
  });

  test('si aggiunge un colloquio con la checklist del modello', async ({ page }) => {
    await page.getByRole('button', { name: 'Aggiungi colloquio' }).click();
    const d = page.getByRole('dialog');
    await d.getByRole('combobox', { name: 'Candidatura' }).click();
    await page.getByRole('option', { name: /Lumia Tech/ }).click();
    await d.getByRole('button', { name: 'Salva colloquio' }).click();
    await expect(page.getByText('Colloquio salvato')).toBeVisible();
    await expect(page.locator('article.scheda')).toHaveCount(3);
  });
});

test.describe('Aziende', () => {
  test('elenca le aziende raggruppate ignorando maiuscole e spazi', async ({ page }) => {
    await accedi(page, '/aziende');
    await aspettaDati(page);
    // «Altavia» e «Altavia » (con lo spazio) sono la stessa azienda.
    await expect(page.getByRole('link', { name: /^altavia$/i })).toHaveCount(1);
    await page.getByPlaceholder('Cerca un’azienda').fill('brera');
    await expect(page.getByRole('link', { name: /brera labs/i })).toHaveCount(1);
  });

  test('il dettaglio mostra cronologia, contatti e salva il promemoria', async ({ page }) => {
    await accedi(page, '/aziende');
    await aspettaDati(page);
    await page.getByRole('link', { name: /^altavia$/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: /altavia/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cronologia' })).toBeVisible();
    await expect(page.getByText('Giulia Ferri')).toBeVisible();
    await page.getByLabel('Data', { exact: true }).fill('31/12/2026');
    await page.getByRole('button', { name: 'Salva promemoria' }).click();
    await expect(page.getByText('Promemoria salvato')).toBeVisible();
    await expect(page.getByText(/non ricontattare Altavia prima del/i)).toBeVisible();
  });

  test('un’azienda inesistente dà una pagina «non trovata» nel contesto', async ({ page }) => {
    await accedi(page, '/aziende/azienda-che-non-esiste');
    await expect(page.getByText('Non ho trovato questa azienda')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Vai alle aziende' })).toBeVisible();
  });

  test('si aggiunge un contatto', async ({ page }) => {
    await accedi(page, '/aziende');
    await aspettaDati(page);
    await page.getByRole('link', { name: /brera labs/i }).click();
    await page.getByRole('button', { name: 'Aggiungi contatto' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Nome e cognome').fill('Carlo Bianchi');
    await d.getByLabel('Ruolo').fill('CTO');
    await d.getByRole('button', { name: 'Salva contatto' }).click();
    await expect(page.getByText('Carlo Bianchi')).toBeVisible();
  });
});
