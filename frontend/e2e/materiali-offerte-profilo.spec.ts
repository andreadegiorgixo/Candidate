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

  test('ogni versione mostra nome del file, dimensione e data di caricamento', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await expect(page.getByText(/elisa-marchetti-cv-java\.pdf · 209 KB · caricato il \d{1,2} \w+ \d{4}/)).toBeVisible();
  });

  test('si carica una versione del CV scegliendo un file dal computer', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await page.getByRole('button', { name: 'Aggiungi versione' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Nome', { exact: true }).fill('CV in inglese');
    await d.locator('input[type=file]').setInputFiles({ name: 'cv-en.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 inglese') });
    await expect(d.getByText('cv-en.pdf')).toBeVisible();
    await expect(d.getByText('16 byte')).toBeVisible();
    await d.getByRole('button', { name: 'Salva versione' }).click();
    await expect(page.getByText('CV in inglese')).toBeVisible();
    await expect(page.getByText(/cv-en\.pdf · 16 byte/)).toBeVisible();
    await expect(page.getByText('Non l’hai ancora usata per nessuna candidatura.')).toBeVisible();
  });

  test('il file si può anche trascinare sul riquadro', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await page.getByRole('button', { name: 'Aggiungi versione' }).click();
    const d = page.getByRole('dialog');
    const dati = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['%PDF-1.4'], 'trascinato.pdf', { type: 'application/pdf' }));
      return dt;
    });
    await d.locator('.zona').dispatchEvent('drop', { dataTransfer: dati });
    await expect(d.getByText('trascinato.pdf')).toBeVisible();
  });

  test('senza file, o con un file non ammesso o troppo grande, spiega cosa fare', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await page.getByRole('button', { name: 'Aggiungi versione' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Nome', { exact: true }).fill('X');
    await d.getByRole('button', { name: 'Salva versione' }).click();
    await expect(d.getByText('Scegli il file del tuo CV.')).toBeVisible();

    const campo = d.locator('input[type=file]');
    await campo.setInputFiles({ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('ciao') });
    await expect(d.getByText('Questo formato non è ammesso. Scegli un file PDF, DOC o DOCX.')).toBeVisible();

    await campo.setInputFiles({ name: 'enorme.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(6 * 1024 * 1024) });
    await expect(d.getByText('Il file pesa 6 MB: il massimo è 5 MB.')).toBeVisible();

    // nessun file valido è stato scelto: la versione non si salva
    await d.getByRole('button', { name: 'Salva versione' }).click();
    await expect(d).toBeVisible();
    await expect(page.getByText('Versione del CV salvata')).toHaveCount(0);
  });

  test('in modifica il file è facoltativo: cambia il nome e resta quello attuale', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await page.getByRole('button', { name: 'Modifica' }).first().click();
    const d = page.getByRole('dialog');
    await expect(d.getByText('elisa-marchetti-cv.pdf')).toBeVisible();
    await expect(d.getByText('Se non ne scegli un altro, resta quello attuale.')).toBeVisible();
    await d.getByLabel('Nome', { exact: true }).fill('CV generale 2026');
    await d.getByRole('button', { name: 'Salva versione' }).click();
    await expect(page.getByText('CV generale 2026')).toBeVisible();
    await expect(page.getByText(/elisa-marchetti-cv\.pdf · 184 KB/)).toBeVisible();
  });

  test('in modifica si può sostituire il file', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await page.getByRole('button', { name: 'Modifica' }).first().click();
    const d = page.getByRole('dialog');
    await d.locator('input[type=file]').setInputFiles({ name: 'nuovo.docx', mimeType: '', buffer: Buffer.from('PK') });
    await d.getByRole('button', { name: 'Salva versione' }).click();
    await expect(page.getByText(/nuovo\.docx · 2 byte/)).toBeVisible();
  });

  test('«Scarica» salva il file col suo nome', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Scarica CV generale' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('elisa-marchetti-cv.pdf');
    expect((await import('node:fs')).readFileSync((await file.path())!, 'utf8')).toContain('%PDF');
  });

  test('un file caricato si scarica identico', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await page.getByRole('button', { name: 'Aggiungi versione' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Nome', { exact: true }).fill('Prova');
    await d.locator('input[type=file]').setInputFiles({ name: 'prova.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 contenuto di prova') });
    await d.getByRole('button', { name: 'Salva versione' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Scarica Prova' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('prova.pdf');
    expect((await import('node:fs')).readFileSync((await file.path())!, 'utf8')).toBe('%PDF-1.4 contenuto di prova');
  });

  test('si elimina una versione', async ({ page }) => {
    await accedi(page, '/materiali');
    await aspettaDati(page);
    await page.getByRole('button', { name: 'Elimina' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Elimina versione' }).click();
    await expect(page.getByText('Versione eliminata')).toBeVisible();
    await expect(page.getByText('CV generale', { exact: true })).toHaveCount(0);
  });

  test.describe('profilo LinkedIn', () => {
    test.beforeEach(async ({ page }) => {
      await accedi(page, '/materiali');
      await aspettaDati(page);
    });

    test('si aggiunge, compare come link che apre in una nuova scheda, si modifica e si rimuove', async ({ page }) => {
      const blocco = page.getByRole('region', { name: 'Profilo LinkedIn' });
      await expect(blocco.getByText('Non hai ancora indicato il tuo profilo.')).toBeVisible();
      await blocco.getByRole('button', { name: 'Aggiungi il link' }).click();
      await blocco.getByLabel('Link al tuo profilo LinkedIn').fill('https://www.linkedin.com/in/elisa-marchetti');
      await blocco.getByRole('button', { name: 'Salva link' }).click();
      await expect(page.getByText('Link LinkedIn salvato')).toBeVisible();
      const link = blocco.getByRole('link', { name: 'https://www.linkedin.com/in/elisa-marchetti' });
      await expect(link).toHaveAttribute('href', 'https://www.linkedin.com/in/elisa-marchetti');
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);

      await blocco.getByRole('button', { name: 'Modifica' }).click();
      await expect(blocco.getByLabel('Link al tuo profilo LinkedIn')).toHaveValue('https://www.linkedin.com/in/elisa-marchetti');
      await blocco.getByLabel('Link al tuo profilo LinkedIn').fill('https://it.linkedin.com/in/elisa');
      await blocco.getByRole('button', { name: 'Salva link' }).click();
      await expect(blocco.getByRole('link', { name: 'https://it.linkedin.com/in/elisa' })).toBeVisible();

      await blocco.getByRole('button', { name: 'Rimuovi' }).click();
      await expect(page.getByText('Link LinkedIn rimosso')).toBeVisible();
      await expect(blocco.getByText('Non hai ancora indicato il tuo profilo.')).toBeVisible();
    });

    test('un indirizzo che non è di LinkedIn spiega come correggerlo', async ({ page }) => {
      const blocco = page.getByRole('region', { name: 'Profilo LinkedIn' });
      await blocco.getByRole('button', { name: 'Aggiungi il link' }).click();
      await blocco.getByLabel('Link al tuo profilo LinkedIn').fill('https://example.com/elisa');
      await blocco.getByRole('button', { name: 'Salva link' }).click();
      await expect(blocco.getByText(/Scrivi un indirizzo LinkedIn valido/)).toBeVisible();
    });

    test('il link si vede e si modifica anche nel profilo', async ({ page }) => {
      const blocco = page.getByRole('region', { name: 'Profilo LinkedIn' });
      await blocco.getByRole('button', { name: 'Aggiungi il link' }).click();
      await blocco.getByLabel('Link al tuo profilo LinkedIn').fill('https://www.linkedin.com/in/elisa');
      await blocco.getByRole('button', { name: 'Salva link' }).click();
      await expect(page.getByText('Link LinkedIn salvato')).toBeVisible();

      await page.getByRole('link', { name: /^Profilo/ }).click();
      await expect(page).toHaveURL(/\/profilo/);
      const campo = page.getByRole('textbox', { name: 'Profilo LinkedIn' });
      await expect(campo).toHaveValue('https://www.linkedin.com/in/elisa');
      await campo.fill('https://www.linkedin.com/in/elisa-m');
      await page.getByRole('button', { name: 'Salva dati' }).click();
      await expect(page.getByText('Dati salvati')).toBeVisible();

      await page.getByRole('link', { name: /^Materiali/ }).click();
      await expect(page.getByRole('link', { name: 'https://www.linkedin.com/in/elisa-m' })).toBeVisible();
    });
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
