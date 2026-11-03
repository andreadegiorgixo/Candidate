import { expect, test } from '@playwright/test';
import { accedi, aspettaDati, DEMO } from './aiuti';
import { Page } from '@playwright/test';

/** Apre la ricerca e aspetta che il campo abbia il focus, così il testo digitato non si perde. */
async function apriRicerca(page: Page): Promise<void> {
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('combobox', { name: 'Cerca' })).toBeFocused();
}

test.describe('Materiali', () => {
  test('mostra le versioni del CV con candidature inviate e tasso di risposta', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await expect(page.getByText('CV sviluppatore Java')).toBeVisible();
    await expect(page.getByText(/Tasso di risposta \d+%/).first()).toBeVisible();
  });

  test('si aggiunge una versione del CV', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await page.getByRole('button', { name: 'Aggiungi versione' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Nome', { exact: true }).fill('CV in inglese');
    await d.getByLabel('Link al file').fill('https://esempio.it/cv-en.pdf');
    await d.getByRole('button', { name: 'Salva versione' }).click();
    await expect(page.getByText('CV in inglese')).toBeVisible();
    await expect(page.getByText('Non l’hai ancora usata per nessuna candidatura.')).toBeVisible();
  });

  test('un link non valido spiega come correggerlo', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await page.getByRole('button', { name: 'Aggiungi versione' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Nome', { exact: true }).fill('X');
    await d.getByLabel('Link al file').fill('non-un-link');
    await d.getByRole('button', { name: 'Salva versione' }).click();
    await expect(d.getByText('Scrivi un link che inizi con http:// o https://.')).toBeVisible();
  });

  test('i modelli si copiano e si modificano', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await expect(page.getByRole('heading', { name: 'Sollecito', level: 3 })).toBeVisible();
    await page.getByRole('button', { name: 'Copia testo' }).first().click();
    await expect(page.getByText('Testo copiato')).toBeVisible();
    await page.getByRole('button', { name: 'Aggiungi modello' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Nome', { exact: true }).fill('Ringraziamento breve');
    await d.getByLabel('Testo').fill('Grazie {contatto}, a presto.');
    await d.getByRole('button', { name: 'Salva modello' }).click();
    await expect(page.getByText('Ringraziamento breve')).toBeVisible();
  });
});

test.describe('Offerte', () => {
  test('affianca le proposte aperte e evidenzia il valore migliore di ogni riga', async ({ page }) => {
    await accedi(page, '/offerte');
    await aspettaDati(page);
    await expect(page.getByRole('columnheader')).toHaveCount(2);
    await expect(page.locator('.migliore').first()).toBeVisible();
    // Nessun vincitore dichiarato: nessuna riga riassuntiva e un avviso che non è un consiglio.
    await expect(page.getByText('Non è un consiglio')).toBeVisible();
    const ral = page.getByRole('row', { name: /^RAL/ });
    await expect(ral.locator('.migliore')).toHaveCount(1);
  });

  test('si aggiunge e si elimina una proposta', async ({ page }) => {
    await accedi(page, '/offerte');
    await aspettaDati(page);
    await page.getByRole('button', { name: 'Aggiungi proposta' }).click();
    const d = page.getByRole('dialog');
    await d.getByRole('combobox', { name: 'Candidatura' }).click();
    await page.getByRole('option').first().click();
    await d.getByLabel('RAL annua, in euro').fill('45000');
    await d.getByRole('button', { name: 'Salva proposta' }).click();
    await expect(page.getByRole('columnheader')).toHaveCount(3);
    await page.getByRole('button', { name: /^Elimina la proposta di/ }).last().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Elimina proposta' }).click();
    await expect(page.getByRole('columnheader')).toHaveCount(2);
  });
});

test.describe('Profilo', () => {
  test.beforeEach(async ({ page }) => {
    await accedi(page, '/profilo');
    await expect(page.getByLabel('Candidature a settimana')).toBeVisible();
  });

  test('cambiare l’obiettivo si vede subito in Oggi', async ({ page }) => {
    await page.getByLabel('Candidature a settimana').fill('12');
    await page.getByRole('button', { name: 'Salva obiettivi' }).click();
    await expect(page.getByText('Obiettivi salvati')).toBeVisible();
    await page.getByRole('link', { name: /^Oggi/ }).click();
    await expect(page.getByText(/candidature inviate su 12/)).toBeVisible();
  });

  test('i valori fuori limite spiegano cosa fare', async ({ page }) => {
    await page.getByLabel('Candidature a settimana').fill('0');
    await page.getByLabel('Candidature a settimana').blur();
    await expect(page.getByText('Scegli un numero da 1 a 100.')).toBeVisible();
  });

  test('la password nuova deve coincidere con la conferma', async ({ page }) => {
    await page.getByLabel('Nuova password', { exact: true }).fill('nuova-password');
    await page.getByLabel('Ripeti la nuova password').fill('altra-password');
    await page.getByRole('button', { name: 'Cambia password' }).click();
    await expect(page.getByText('Le due password sono diverse.')).toBeVisible();
  });

  test('l’esportazione scarica un file JSON con tutti i dati', async ({ page }) => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Esporta tutti i dati' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^candidate-dati-\d{4}-\d{2}-\d{2}\.json$/);
    const path = await file.path();
    const json = JSON.parse((await import('node:fs')).readFileSync(path!, 'utf8')) as Record<string, unknown[]>;
    expect(json['candidature'].length).toBeGreaterThan(50);
    expect(Object.keys(json)).toEqual(expect.arrayContaining(['account', 'colloqui', 'contatti', 'cv', 'modelli', 'offerte']));
    expect(JSON.stringify(json)).not.toContain('demo1234');
  });

  test('eliminare l’account richiede di scrivere l’email', async ({ page }) => {
    const elimina = page.getByRole('button', { name: 'Elimina account' });
    await expect(elimina).toBeDisabled();
    await page.getByLabel('La tua email').fill('sbagliata@esempio.it');
    await expect(elimina).toBeDisabled();
    await page.getByLabel('La tua email').fill(DEMO.email);
    await expect(elimina).toBeEnabled();
    await elimina.click();
    await expect(page).toHaveURL(/\/accedi/);
    // L'account non esiste più.
    await page.getByLabel('Email').fill(DEMO.email);
    await page.getByLabel('Password').fill(DEMO.password);
    await page.getByRole('button', { name: 'Accedi' }).click();
    await expect(page.getByText('Email o password non corrette. Controlla i dati e riprova.')).toBeVisible();
  });
});

test.describe('ricerca globale', () => {
  test('Ctrl+K apre la ricerca, trova un’azienda e porta alla sua pagina', async ({ page }) => {
    await accedi(page);
    await aspettaDati(page);
    await apriRicerca(page);
    await page.keyboard.type('altavia');
    await expect(page.getByRole('option', { name: /Altavia/ }).first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/aziende\/altavia/);
  });

  test('trova i contatti e i ruoli, e le frecce spostano la selezione', async ({ page }) => {
    await accedi(page);
    await aspettaDati(page);
    await apriRicerca(page);
    await page.keyboard.type('giulia');
    await expect(page.getByRole('option', { name: /Giulia Ferri/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await apriRicerca(page);
    await page.keyboard.type('java');
    const opzioni = page.getByRole('option');
    await expect(opzioni.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(opzioni.nth(1)).toHaveAttribute('aria-selected', 'true');
  });

  test('porta alle azioni principali, per esempio aggiungere una candidatura', async ({ page }) => {
    await accedi(page);
    await aspettaDati(page);
    await apriRicerca(page);
    await page.keyboard.type('aggiungi');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Aggiungi candidatura' })).toBeVisible();
  });

  test('senza risultati lo dice', async ({ page }) => {
    await accedi(page);
    await apriRicerca(page);
    await page.keyboard.type('zzzzqq');
    await expect(page.getByText(/Non trovo niente per «zzzzqq»/)).toBeVisible();
  });
});
