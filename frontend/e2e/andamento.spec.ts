import { expect, test } from '@playwright/test';
import { accedi, aspettaDati } from './aiuti';

test.describe('Andamento', () => {
  test.beforeEach(async ({ page }) => {
    await accedi(page, '/andamento');
    await aspettaDati(page);
    await expect(page.getByRole('heading', { name: 'Segnali' })).toBeVisible();
  });

  test('mostra le sette sezioni nell’ordine del brief', async ({ page }) => {
    const titoli = await page.locator('main h2.t').allTextContents();
    expect(titoli).toEqual(['Segnali', 'Ritmo', 'Percorso', 'Tasso di risposta nel tempo', 'Tempi', 'Cosa funziona', 'Costanza']);
  });

  test('i segnali sono da due a quattro e non affermano cause', async ({ page }) => {
    const n = await page.locator('.segnali li').count();
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(4);
    await expect(page.getByText('Descrivono cosa è successo finora, non il motivo.')).toBeVisible();
  });

  test('i grafici si disegnano e hanno un’alternativa a tabella', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible();
    const grafico = page.locator('app-grafico').first();
    await grafico.getByRole('button', { name: 'Vedi come tabella' }).click();
    await expect(grafico.getByRole('table')).toBeVisible();
    await grafico.getByRole('button', { name: 'Vedi come grafico' }).click();
    await expect(grafico.locator('canvas')).toBeVisible();
  });

  test('i grafici si esplorano da tastiera con le frecce', async ({ page }) => {
    const tela = page.locator('app-grafico').first().getByRole('img');
    await tela.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('body')).toBeVisible();
    await expect(tela).toBeFocused();
  });

  test('cambiando periodo il conteggio delle candidature considerate cambia', async ({ page }) => {
    const conta = page.locator('.conta');
    const novanta = await conta.textContent();
    await page.getByRole('button', { name: '30 giorni' }).click();
    await expect(conta).not.toHaveText(novanta!);
    await page.getByRole('button', { name: 'Tutto' }).click();
    await expect(conta).toContainText('candidature considerate');
  });

  test('con pochi dati spiega quanti invii servono invece di un grafico vuoto', async ({ page }) => {
    await page.getByRole('button', { name: '30 giorni' }).click();
    await page.getByRole('combobox', { name: 'Fonte' }).click();
    await page.getByRole('option', { name: 'Indeed' }).click();
    await expect(page.getByText(/servono almeno \d+ invii\. Finora ne hai \d+/).first()).toBeVisible();
  });

  test('il tasso nel tempo spiega che esclude le candidature più recenti della soglia', async ({ page }) => {
    await expect(page.getByText(/da meno giorni della soglia di attesa/)).toBeVisible();
  });
});
