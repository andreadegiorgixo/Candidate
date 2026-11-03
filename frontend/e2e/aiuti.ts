import { expect, Page } from '@playwright/test';

export const DEMO = { email: 'demo@candidate.it', password: 'demo1234' };

/** Accede con l'utente demo del mock e aspetta la pagina Oggi. */
export async function accedi(page: Page, destinazione = '/oggi'): Promise<void> {
  await page.goto('/accedi');
  await page.getByLabel('Email').fill(DEMO.email);
  await page.getByLabel('Password').fill(DEMO.password);
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page).toHaveURL(/\/oggi/);
  if (destinazione !== '/oggi') await page.goto(destinazione);
}

/** Aspetta che la pagina sia comparsa e che i dati del mock siano arrivati. */
export async function aspettaDati(page: Page): Promise<void> {
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('app-scheletro:not(app-stile app-scheletro)')).toHaveCount(0, { timeout: 10_000 });
}
