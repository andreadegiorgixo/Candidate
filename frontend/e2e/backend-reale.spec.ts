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

test('CV caricati come file e link LinkedIn finiscono nel database', async ({ page, request }) => {
  test.setTimeout(90_000);
  const su = await request.get(`${BACKEND}/v3/api-docs`).catch(() => null);
  test.skip(!su?.ok(), 'Il backend non risponde su localhost:8080');

  const email = `e2e.cv.${Date.now()}@esempio.it`;
  const password = 'password-lunga';
  const contenuto = '%PDF-1.4 curriculum di prova';
  const fs = await import('node:fs');

  await page.goto('/registrati');
  await page.getByLabel('Nome', { exact: true }).fill('Ada');
  await page.getByLabel('Cognome').fill('Rossi');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Crea account' }).click();
  await expect(page).toHaveURL(/\/oggi/);

  const login = await request.post(`${BACKEND}/api/auth/login`, { data: { email, password } });
  const { accessToken, account } = (await login.json()) as { accessToken: string; account: { id: number } };
  const headers = { Authorization: `Bearer ${accessToken}` };
  const elencoCv = async () => (await (await request.get(`${BACKEND}/api/cv`, { headers })).json()) as { id: number; nome: string; nomeFile: string; dimensione: number }[];

  try {
    await test.step('le vecchie versioni «con link» salvate nel browser vengono ignorate', async () => {
      await page.evaluate((idAccount) => {
        localStorage.setItem(
          `candidate.locale.${idAccount}`,
          JSON.stringify({ cv: [{ id: 1, nome: 'Versione col link', url: 'https://x.it/cv.pdf' }], extra: { 5: { spontanea: false, fonte: 'ALTRO', prossimaAzioneTesto: null, prossimaAzioneData: null, idCv: 1 } } }),
        );
      }, account.id);
      await page.goto('/materiali');
      await aspettaDati(page);
      await expect(page.getByText('Non hai ancora versioni del CV')).toBeVisible();
      await expect(page.getByText('Versione col link')).toHaveCount(0);
    });

    await test.step('il link LinkedIn si salva sull’account', async () => {
      const blocco = page.getByRole('region', { name: 'Profilo LinkedIn' });
      await blocco.getByRole('button', { name: 'Aggiungi il link' }).click();
      await blocco.getByLabel('Link al tuo profilo LinkedIn').fill('https://example.com/ada');
      await blocco.getByRole('button', { name: 'Salva link' }).click();
      await expect(blocco.getByText(/Scrivi un indirizzo LinkedIn valido|LinkedIn valido/)).toBeVisible();
      await blocco.getByLabel('Link al tuo profilo LinkedIn').fill('https://www.linkedin.com/in/ada-rossi');
      await blocco.getByRole('button', { name: 'Salva link' }).click();
      await expect(page.getByText('Link LinkedIn salvato')).toBeVisible();
      const me = await (await request.get(`${BACKEND}/api/account/me`, { headers })).json();
      expect(me).toMatchObject({ linkedin: 'https://www.linkedin.com/in/ada-rossi', nome: 'Ada' });
      await page.reload();
      await aspettaDati(page);
      await expect(blocco.getByRole('link', { name: 'https://www.linkedin.com/in/ada-rossi' })).toBeVisible();
    });

    await test.step('un file non ammesso viene rifiutato dal modulo, uno valido viene caricato', async () => {
      await page.getByRole('button', { name: 'Aggiungi versione' }).click();
      const d = page.getByRole('dialog');
      await d.getByLabel('Nome', { exact: true }).fill('CV backend');
      await d.locator('input[type=file]').setInputFiles({ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
      await expect(d.getByText(/formato non è ammesso/)).toBeVisible();
      await d.locator('input[type=file]').setInputFiles({ name: 'ada-cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from(contenuto) });
      await d.getByRole('button', { name: 'Salva versione' }).click();
      await expect(page.getByText('Versione del CV salvata')).toBeVisible();
      await expect(page.getByText(/ada-cv\.pdf · 28 byte/)).toBeVisible();
      const cv = await elencoCv();
      expect(cv).toHaveLength(1);
      expect(cv[0]).toMatchObject({ nome: 'CV backend', nomeFile: 'ada-cv.pdf', dimensione: contenuto.length });
    });

    await test.step('«Scarica» restituisce lo stesso file', async () => {
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Scarica CV backend' }).click();
      const file = await download;
      expect(file.suggestedFilename()).toBe('ada-cv.pdf');
      expect(fs.readFileSync((await file.path())!, 'utf8')).toBe(contenuto);
    });

    await test.step('rinominare lascia il file, sostituirlo lo cambia', async () => {
      await page.getByRole('button', { name: 'Modifica' }).nth(1).click();
      let d = page.getByRole('dialog');
      await d.getByLabel('Nome', { exact: true }).fill('CV backend 2026');
      await d.getByRole('button', { name: 'Salva versione' }).click();
      await expect(page.getByText('CV backend 2026')).toBeVisible();
      expect((await elencoCv())[0]).toMatchObject({ nome: 'CV backend 2026', nomeFile: 'ada-cv.pdf' });

      await page.getByRole('button', { name: 'Modifica' }).nth(1).click();
      d = page.getByRole('dialog');
      await d.locator('input[type=file]').setInputFiles({ name: 'ada-cv-nuovo.docx', mimeType: '', buffer: Buffer.from('PK-nuovo') });
      await d.getByRole('button', { name: 'Salva versione' }).click();
      await expect(page.getByText(/ada-cv-nuovo\.docx · 8 byte/)).toBeVisible();
      expect((await elencoCv())[0]).toMatchObject({ nomeFile: 'ada-cv-nuovo.docx', dimensione: 8 });
    });

    await test.step('un CV non si vede e non si scarica da un altro account', async () => {
      const [{ id }] = await elencoCv();
      const altro = await request.post(`${BACKEND}/api/auth/register`, { data: { nome: 'B', cognome: 'B', email: `altro.${Date.now()}@esempio.it`, password } });
      const { accessToken: tokenAltro, account: accountAltro } = (await altro.json()) as { accessToken: string; account: { id: number } };
      try {
        const h = { Authorization: `Bearer ${tokenAltro}` };
        expect((await request.get(`${BACKEND}/api/cv/${id}/file`, { headers: h })).status()).toBe(404);
        expect(await (await request.get(`${BACKEND}/api/cv`, { headers: h })).json()).toEqual([]);
      } finally {
        await request.delete(`${BACKEND}/api/account/delete/${accountAltro.id}`, { headers: { Authorization: `Bearer ${tokenAltro}` } });
      }
    });

    await test.step('dopo un ricaricamento il CV c’è ancora; eliminandolo sparisce dal server', async () => {
      await page.reload();
      await aspettaDati(page);
      await expect(page.getByText('CV backend 2026')).toBeVisible();
      await page.getByRole('button', { name: 'Elimina' }).first().click();
      await page.getByRole('dialog').getByRole('button', { name: 'Elimina versione' }).click();
      await expect(page.getByText('Versione eliminata')).toBeVisible();
      expect(await elencoCv()).toEqual([]);
    });

    await test.step('il link LinkedIn si rimuove', async () => {
      await page.getByRole('region', { name: 'Profilo LinkedIn' }).getByRole('button', { name: 'Rimuovi' }).click();
      await expect(page.getByText('Link LinkedIn rimosso')).toBeVisible();
      const me = (await (await request.get(`${BACKEND}/api/account/me`, { headers })).json()) as { linkedin?: string };
      expect(me.linkedin ?? '').toBe('');
    });
  } finally {
    // Pulizia: l'account di prova (e i suoi CV, in cascata) non deve restare nel database.
    await request.delete(`${BACKEND}/api/account/delete/${account.id}`, { headers });
  }
});
