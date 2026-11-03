import { expect, test } from '@playwright/test';
import { accedi, aspettaDati, DEMO } from './aiuti';

test.describe('accesso e registrazione', () => {
  test('con la password sbagliata l’errore compare sotto il campo', async ({ page }) => {
    await page.goto('/accedi');
    await page.getByLabel('Email').fill(DEMO.email);
    await page.getByLabel('Password').fill('sbagliata1');
    await page.getByRole('button', { name: 'Accedi' }).click();
    await expect(page.getByText('Email o password non corrette. Controlla i dati e riprova.')).toBeVisible();
    await expect(page).toHaveURL(/\/accedi/);
  });

  test('i campi obbligatori spiegano cosa fare', async ({ page }) => {
    await page.goto('/accedi');
    await page.getByRole('button', { name: 'Accedi' }).click();
    await expect(page.getByText('Inserisci la tua email.')).toBeVisible();
    await expect(page.getByText('Inserisci la password.')).toBeVisible();
  });

  test('dopo l’accesso si arriva a Oggi con il titolo dinamico', async ({ page }) => {
    await accedi(page);
    await aspettaDati(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Oggi hai \d+ cos[ae] da fare/);
  });

  test('senza accesso si viene portati a /accedi e poi alla pagina richiesta', async ({ page }) => {
    await page.goto('/candidature');
    await expect(page).toHaveURL(/\/accedi\?ritorno=%2Fcandidature/);
    await page.getByLabel('Email').fill(DEMO.email);
    await page.getByLabel('Password').fill(DEMO.password);
    await page.getByRole('button', { name: 'Accedi' }).click();
    await expect(page).toHaveURL(/\/candidature$/);
  });

  test('chi è già dentro non vede la pagina di accesso', async ({ page }) => {
    await accedi(page);
    await page.goto('/accedi');
    await expect(page).toHaveURL(/\/oggi/);
  });

  test('registrandosi si ottiene un account vuoto con gli stati vuoti che propongono la prima azione', async ({ page }) => {
    await page.goto('/registrati');
    await page.getByLabel('Nome', { exact: true }).fill('Ada');
    await page.getByLabel('Cognome').fill('Rossi');
    await page.getByLabel('Email').fill(`ada.${Date.now()}@esempio.it`);
    await page.getByLabel('Password').fill('password-lunga');
    await page.getByRole('button', { name: 'Crea account' }).click();
    await expect(page).toHaveURL(/\/oggi/);
    await expect(page.getByText('Non hai ancora candidature')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aggiungi la prima candidatura' })).toBeVisible();
    await page.getByRole('link', { name: /^Offerte/ }).click();
    await expect(page.getByText('Qui confronterai le proposte quando ne riceverai una.')).toBeVisible();
  });

  test('un’email già usata dà un errore sul campo', async ({ page }) => {
    await page.goto('/registrati');
    await page.getByLabel('Nome', { exact: true }).fill('Ada');
    await page.getByLabel('Cognome').fill('Rossi');
    await page.getByLabel('Email').fill(DEMO.email);
    await page.getByLabel('Password').fill('password-lunga');
    await page.getByRole('button', { name: 'Crea account' }).click();
    await expect(page.getByText(/Esiste già un account con questa email/)).toBeVisible();
  });

  test('uscendo dal profilo si torna alla pagina di accesso', async ({ page }) => {
    await accedi(page, '/profilo');
    await page.getByRole('button', { name: 'Esci' }).click();
    await expect(page).toHaveURL(/\/accedi/);
  });
});
