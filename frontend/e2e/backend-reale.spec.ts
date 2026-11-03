import { APIRequestContext, expect, test } from '@playwright/test';
import { aspettaDati } from './aiuti';

/**
 * Prova il frontend contro il backend vero (Spring Boot su :8080, Angular su :4200 con il proxy).
 * Non fa parte della suite normale: si lancia con `npx playwright test --project=backend-reale`.
 * Ogni esecuzione crea un account nuovo e lo cancella alla fine.
 */

const BACKEND = 'http://localhost:8080';

interface CandidaturaApi {
  id: number;
  nomeAzienda: string;
  statoCandidatura: string;
  note: string | null;
  citta: { nomeCitta: string; provincia: string };
}

async function leggiDalServer(request: APIRequestContext, email: string, password: string) {
  const login = await request.post(`${BACKEND}/api/auth/login`, { data: { email, password } });
  expect(login.status()).toBe(200);
  const { accessToken, account } = (await login.json()) as { accessToken: string; account: { id: number } };
  const headers = { Authorization: `Bearer ${accessToken}` };
  const elenco = await request.get(`${BACKEND}/api/candidatura`, { headers });
  expect(elenco.status()).toBe(200);
  return { idAccount: account.id, headers, candidature: (await elenco.json()) as CandidaturaApi[] };
}

test('i dati creati dal frontend finiscono nel database', async ({ page, request }) => {
  test.setTimeout(90_000);
  const su = await request.get(`${BACKEND}/v3/api-docs`).catch(() => null);
  test.skip(!su?.ok(), 'Il backend non risponde su localhost:8080');

  const email = `e2e.${Date.now()}@esempio.it`;
  const password = 'password-lunga';
  const azienda = `Pioppo Reale ${Date.now() % 100000}`;
  // Le città sono condivise tra gli account: una per esecuzione, così si può creare dal modulo e poi rimuovere.
  const citta = `Cittadella${Date.now() % 100000}`;

  await test.step('registrazione dalla pagina', async () => {
    await page.goto('/registrati');
    await page.getByLabel('Nome', { exact: true }).fill('Ada');
    await page.getByLabel('Cognome').fill('Rossi');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Crea account' }).click();
    await expect(page).toHaveURL(/\/oggi/);
    await expect(page.getByText('Non hai ancora candidature')).toBeVisible();
  });

  const { idAccount, headers, candidature } = await leggiDalServer(request, email, password);
  expect(candidature).toEqual([]);

  try {
    await test.step('nuova candidatura con una città creata dal modulo', async () => {
      await page.goto('/candidature');
      await aspettaDati(page);
      await page.keyboard.press('n');
      const pannello = page.getByRole('dialog');
      await pannello.getByLabel('Azienda').fill(azienda);
      await pannello.getByLabel('Ruolo').fill('Platform Engineer');
      await pannello.getByLabel('Città').fill(citta);
      await pannello.getByRole('button', { name: new RegExp(`Aggiungi «${citta}» come nuova città`) }).click();
      await pannello.getByLabel('Provincia').fill('ts');
      await pannello.getByLabel('Regione').fill('Friuli-Venezia Giulia');
      await pannello.getByRole('button', { name: 'Salva città' }).click();
      await expect(pannello.getByLabel('Città')).toHaveValue(citta);
      await pannello.getByRole('button', { name: 'Salva candidatura' }).click();
      await expect(page.getByText(`Candidatura per ${azienda} salvata`)).toBeVisible();
    });

    await test.step('il server ha davvero la candidatura', async () => {
      const { candidature: c } = await leggiDalServer(request, email, password);
      expect(c).toHaveLength(1);
      expect(c[0]).toMatchObject({ nomeAzienda: azienda, statoCandidatura: 'IN_FASE_DI_ATTESA' });
      expect(c[0].citta).toMatchObject({ nomeCitta: citta, provincia: 'TS' });
    });

    await test.step('dopo un ricaricamento la candidatura c’è ancora', async () => {
      await page.reload();
      await aspettaDati(page);
      await expect(page.getByRole('link', { name: azienda })).toBeVisible();
    });

    await test.step('una nota scritta nel dettaglio viene salvata', async () => {
      await page.getByRole('link', { name: azienda }).first().click();
      await expect(page.getByRole('heading', { level: 1, name: azienda })).toBeVisible();
      await page.getByLabel('Note').fill('Chiamare lunedì mattina');
      await page.getByRole('button', { name: 'Salva modifiche' }).click();
      await expect(page.getByText('Modifiche salvate')).toBeVisible();
      const { candidature: c } = await leggiDalServer(request, email, password);
      expect(c[0].note).toBe('Chiamare lunedì mattina');
    });

    await test.step('il cambio di stato dalla bacheca arriva al server', async () => {
      await page.goto('/candidature');
      await aspettaDati(page);
      await page.getByRole('button', { name: 'Bacheca' }).click();
      await page.getByRole('button', { name: new RegExp(`Azioni per ${azienda}`) }).click();
      await page.getByRole('menuitem', { name: 'Conoscitivo' }).click();
      await expect(page.getByText(`${azienda}: Conoscitivo`)).toBeVisible();
      const { candidature: c } = await leggiDalServer(request, email, password);
      expect(c[0].statoCandidatura).toBe('FASE_DI_COLLOQUIO_CONOSCITIVO');
    });

    await test.step('uscendo e rientrando si ritrovano i dati', async () => {
      await page.goto('/profilo');
      await page.getByRole('button', { name: 'Esci' }).click();
      await expect(page).toHaveURL(/\/accedi/);
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Accedi' }).click();
      await expect(page).toHaveURL(/\/oggi/);
      await page.goto('/candidature');
      await aspettaDati(page);
      await expect(page.getByRole('link', { name: azienda })).toBeVisible();
    });

    await test.step('una password sbagliata viene rifiutata dal server', async () => {
      await page.goto('/profilo');
      await page.getByRole('button', { name: 'Esci' }).click();
      await expect(page).toHaveURL(/\/accedi/);
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill('sbagliata-123');
      await page.getByRole('button', { name: 'Accedi' }).click();
      await expect(page).toHaveURL(/\/accedi/);
      await expect(page.getByRole('alert').or(page.getByText(/non corrett|non valid/i)).first()).toBeVisible();
    });

    await test.step('eliminando la candidatura sparisce dal server', async () => {
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Accedi' }).click();
      await expect(page).toHaveURL(/\/oggi/);
      await page.goto('/candidature');
      await aspettaDati(page);
      await page.getByRole('link', { name: azienda }).first().click();
      await page.getByRole('button', { name: 'Elimina candidatura' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Elimina candidatura' }).click();
      await expect(page).toHaveURL(/\/candidature$/);
      const { candidature: c } = await leggiDalServer(request, email, password);
      expect(c).toEqual([]);
    });
  } finally {
    // Pulizia: l'account di prova non deve restare nel database.
    await request.delete(`${BACKEND}/api/account/delete/${idAccount}`, { headers });
    const create = (await (await request.get(`${BACKEND}/api/citta`, { headers, params: { nome: citta } })).json()) as { id: number; nomeCitta: string }[];
    for (const c of create.filter((x) => x.nomeCitta === citta)) await request.delete(`${BACKEND}/api/citta/delete/${c.id}`, { headers });
  }
});
