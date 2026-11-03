import { expect, test } from '@playwright/test';
import { accedi, aspettaDati } from './aiuti';

test.describe('candidature', () => {
  test.beforeEach(async ({ page }) => {
    await accedi(page, '/candidature');
    await aspettaDati(page);
  });

  test('il tasto N apre l’aggiunta rapida e si salva una candidatura', async ({ page }) => {
    await page.keyboard.press('n');
    const pannello = page.getByRole('dialog');
    await expect(pannello.getByRole('heading', { name: 'Aggiungi candidatura' })).toBeVisible();
    await pannello.getByLabel('Azienda').fill('Pioppo Digitale');
    await pannello.getByLabel('Ruolo').fill('Platform Engineer');
    await pannello.getByLabel('Città').fill('Mil');
    await page.getByRole('option', { name: /Milano/ }).click();
    await pannello.getByRole('button', { name: 'Salva candidatura' }).click();
    await expect(page.getByText('Candidatura per Pioppo Digitale salvata')).toBeVisible();
    await page.getByPlaceholder('Cerca azienda, ruolo o città').fill('pioppo');
    await expect(page.getByRole('link', { name: 'Pioppo Digitale' })).toBeVisible();
  });

  test('i campi obbligatori mancanti spiegano cosa fare', async ({ page }) => {
    await page.getByRole('button', { name: 'Aggiungi candidatura' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Salva candidatura' }).click();
    await expect(page.getByText('Indica il nome dell’azienda.')).toBeVisible();
    await expect(page.getByText('Scegli una città dall’elenco o aggiungila.')).toBeVisible();
  });

  test('se l’azienda esiste già avvisa con data e stato ma non blocca', async ({ page }) => {
    await page.getByRole('button', { name: 'Aggiungi candidatura' }).first().click();
    const pannello = page.getByRole('dialog');
    await pannello.getByLabel('Azienda').fill('Nordvento');
    await expect(pannello.getByText('Hai già scritto a questa azienda.')).toBeVisible();
    await expect(pannello.getByText(/inviata il .*stato: /).first()).toBeVisible();
    await expect(pannello.getByRole('button', { name: 'Salva candidatura' })).toBeEnabled();
  });

  test('«Altri dettagli» mostra i campi facoltativi e l’etichetta cambia per le spontanee', async ({ page }) => {
    await page.getByRole('button', { name: 'Aggiungi candidatura' }).first().click();
    const pannello = page.getByRole('dialog');
    await pannello.getByRole('button', { name: 'Altri dettagli' }).click();
    await expect(pannello.getByText('Link all’annuncio')).toBeVisible();
    await pannello.getByLabel('Candidatura spontanea, senza annuncio').check();
    await expect(pannello.getByText('Link o testo del messaggio inviato')).toBeVisible();
  });

  test('una città che non esiste si crea dal modulo', async ({ page }) => {
    await page.getByRole('button', { name: 'Aggiungi candidatura' }).first().click();
    const pannello = page.getByRole('dialog');
    await pannello.getByLabel('Azienda').fill('Trieste Software');
    await pannello.getByLabel('Ruolo').fill('Dev');
    await pannello.getByLabel('Città').fill('Trieste');
    await pannello.getByRole('button', { name: /Aggiungi «Trieste» come nuova città/ }).click();
    await pannello.getByLabel('Provincia').fill('ts');
    await pannello.getByLabel('Regione').fill('Friuli-Venezia Giulia');
    await pannello.getByRole('button', { name: 'Salva città' }).click();
    await expect(pannello.getByRole('button', { name: 'Salva città' })).toHaveCount(0);
    await expect(pannello.getByLabel('Città')).toHaveValue('Trieste');
    await pannello.getByRole('button', { name: 'Salva candidatura' }).click();
    await expect(page.getByText('Candidatura per Trieste Software salvata')).toBeVisible();
  });

  test('i filtri stanno nell’URL e sopravvivono a un ricaricamento', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Modalità' }).click();
    await page.getByRole('option', { name: 'Da remoto' }).click();
    await expect(page).toHaveURL(/modalita=REMOTO/);
    const conta = await page.getByText(/\d+ su \d+ candidature/).textContent();
    await page.reload();
    await aspettaDati(page);
    await expect(page.getByText(/\d+ su \d+ candidature/)).toHaveText(conta!);
    await page.getByRole('button', { name: 'Azzera i filtri' }).click();
    await expect(page).not.toHaveURL(/modalita=/);
  });

  test('un filtro che non trova niente lo dice e propone di azzerarlo', async ({ page }) => {
    await page.getByPlaceholder('Cerca azienda, ruolo o città').fill('qwertyuiop');
    await expect(page.getByText('Nessuna candidatura corrisponde ai filtri')).toBeVisible();
    await page.getByRole('button', { name: 'Azzera i filtri' }).last().click();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('si ordina cliccando sulle intestazioni', async ({ page }) => {
    await page.getByRole('button', { name: 'Azienda e ruolo' }).click();
    await expect(page.getByRole('columnheader', { name: 'Azienda e ruolo' })).toHaveAttribute('aria-sort', 'ascending');
    await page.getByRole('button', { name: 'Azienda e ruolo' }).click();
    await expect(page.getByRole('columnheader', { name: 'Azienda e ruolo' })).toHaveAttribute('aria-sort', 'descending');
  });

  test('la bacheca sposta una candidatura dal menu e si può annullare', async ({ page }) => {
    await page.getByRole('button', { name: 'Bacheca' }).click();
    await expect(page).toHaveURL(/vista=bacheca/);
    const scheda = page.locator('article.scheda').filter({ hasText: 'Lumia Tech' });
    await scheda.getByRole('button', { name: /Azioni per Lumia Tech/ }).click();
    await page.getByRole('menuitem', { name: 'Conoscitivo' }).click();
    await expect(page.getByText('Lumia Tech: Conoscitivo')).toBeVisible();
    await expect(page.locator('section.colonna', { hasText: 'Conoscitivo' }).getByText('Lumia Tech')).toBeVisible();
    await page.getByRole('button', { name: 'Annulla' }).click();
    await expect(page.getByText('Lumia Tech: di nuovo In attesa')).toBeVisible();
    await expect(page.locator('section.colonna', { hasText: 'In attesa' }).getByText('Lumia Tech')).toBeVisible();
  });

  test('si trascina una scheda in un’altra colonna e cambia lo stato', async ({ page }) => {
    await page.getByRole('button', { name: 'Bacheca' }).click();
    // Si parte dalla prima scheda di «In attesa»: è già visibile, senza scorrere.
    const scheda = page.locator('section.colonna', { hasText: 'In attesa' }).locator('article.scheda').first();
    const nome = (await scheda.locator('a.azienda').textContent())!.trim();
    const destinazione = page.locator('section.colonna', { hasText: 'Conoscitivo' }).locator('.lista');
    const a = (await scheda.boundingBox())!;
    const b = (await destinazione.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + 30);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + 40, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByText(`${nome}: Conoscitivo`)).toBeVisible();
    await expect(page.locator('section.colonna', { hasText: 'Conoscitivo' }).getByText(nome)).toBeVisible();
  });

  test('il dettaglio mostra la linea datata e salva le modifiche', async ({ page }) => {
    await page.getByRole('link', { name: 'Nordvento' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Nordvento' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Cambi di stato' })).toBeVisible();
    const salva = page.getByRole('button', { name: 'Salva modifiche' });
    await expect(salva).toBeDisabled();
    await page.getByLabel('Note').fill('Chiamare lunedì mattina');
    await expect(salva).toBeEnabled();
    await salva.click();
    await expect(page.getByText('Modifiche salvate')).toBeVisible();
  });

  test('si può esportare in CSV con i filtri applicati', async ({ page }) => {
    await page.getByPlaceholder('Cerca azienda, ruolo o città').fill('nordvento');
    await expect(page.getByRole('link', { name: /nordvento/i }).first()).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Esporta CSV' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^candidature-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('eliminare una candidatura chiede conferma con lo stesso verbo del pulsante', async ({ page }) => {
    await page.getByRole('link', { name: 'Lumia Tech' }).first().click();
    await page.getByRole('button', { name: 'Elimina candidatura' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('button', { name: 'Elimina candidatura' })).toBeVisible();
    await dialogo.getByRole('button', { name: 'Elimina candidatura' }).click();
    await expect(page).toHaveURL(/\/candidature$/);
    await expect(page.getByText('Candidatura per Lumia Tech eliminata')).toBeVisible();
  });
});
