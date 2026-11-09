import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Account, Candidatura, CandidaturaInput, Colloquio } from '../api/models';
import { candidatura, colloquio, MILANO } from '../testing/fabbriche';
import { tokenFinto } from './adattatore.spec';
import { ArchivioLocale } from './archivio-locale';
import { backendInterceptor, impostaArchivioLocale } from './backend.interceptor';

class DepositoFinto {
  readonly dati = new Map<string, string>();
  getItem = (k: string) => this.dati.get(k) ?? null;
  setItem = (k: string, v: string) => void this.dati.set(k, v);
  removeItem = (k: string) => void this.dati.delete(k);
}

const BEARER = { Authorization: `Bearer ${tokenFinto(7)}` };

function input(extra: Partial<CandidaturaInput> = {}): CandidaturaInput {
  const { id: _i, idAccount: _a, dataCreazione: _d, ...resto } = candidatura({ jobOffert: 'https://x.it', ...extra });
  return resto;
}

function rispostaBackend(id: number, stato = 'IN_FASE_DI_ATTESA') {
  return {
    id,
    idAccount: 7,
    nomeAzienda: 'Acme',
    posizioneLavorativa: 'Java Developer',
    jobOffert: 'https://x.it',
    modalita: 'REMOTO',
    citta: MILANO,
    statoCandidatura: stato,
    dataCandidatura: '2026-10-01',
    note: null,
    dataCreazione: '2026-10-01',
  };
}

describe('interceptor del backend', () => {
  let http: HttpClient;
  let rete: HttpTestingController;
  let archivio: ArchivioLocale;

  beforeEach(() => {
    archivio = new ArchivioLocale(new DepositoFinto());
    impostaArchivioLocale(archivio);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([backendInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    rete = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    rete.verify();
    impostaArchivioLocale(null);
  });

  it('lascia passare le richieste che non sono per /api', async () => {
    const p = firstValueFrom(http.get('/assets/x.json'));
    rete.expectOne('/assets/x.json').flush({ ok: true });
    expect(await p).toEqual({ ok: true });
  });

  describe('accesso', () => {
    it('traduce il token e l’account della risposta', async () => {
      const p = firstValueFrom(http.post<{ token: string; account: Account }>('/api/auth/login', { email: 'a@b.it', password: 'x' }));
      rete.expectOne('/api/auth/login').flush({
        accessToken: 'tok',
        tokenType: 'Bearer',
        expiresAt: '2026-11-03T22:00:00Z',
        account: { id: 7, nome: 'Ada', cognome: 'L', email: 'a@b.it', dataCreazione: '2026-11-03' },
      });
      const r = await p;
      expect(r.token).toBe('tok');
      expect(r.account.sogliaAttesaGiorni).toBe(14);
    });

    it('lascia passare gli errori del backend com’erano', async () => {
      const p = firstValueFrom(http.post('/api/auth/login', {}));
      rete.expectOne('/api/auth/login').flush({ detail: 'Credenziali non valide' }, { status: 401, statusText: 'Unauthorized' });
      const e = (await p.catch((x: unknown) => x)) as HttpErrorResponse;
      expect(e.status).toBe(401);
      expect(e.error).toEqual({ detail: 'Credenziali non valide' });
    });
  });

  describe('account', () => {
    it('GET /account/me aggiunge le impostazioni conservate nel browser', async () => {
      archivio.salvaImpostazioni(7, { obiettivoSettimanale: 4, sogliaAttesaGiorni: 30 });
      const p = firstValueFrom(http.get<Account>('/api/account/me', { headers: BEARER }));
      rete.expectOne('/api/account/me').flush({ id: 7, nome: 'Ada', cognome: 'L', email: 'a@b.it', dataCreazione: '2026-11-03' });
      expect(await p).toMatchObject({ obiettivoSettimanale: 4, sogliaAttesaGiorni: 30 });
    });

    it('PUT /account/me diventa PUT /account/{id} senza i campi sconosciuti al backend', async () => {
      const p = firstValueFrom(
        http.put<Account>('/api/account/me', { nome: 'Ada', cognome: 'L', email: 'a@b.it', linkedin: 'https://it.linkedin.com/in/ada', obiettivoSettimanale: 6, sogliaAttesaGiorni: 10, password: '' }, { headers: BEARER }),
      );
      const r = rete.expectOne('/api/account/7');
      expect(r.request.method).toBe('PUT');
      expect(r.request.body).toEqual({ nome: 'Ada', cognome: 'L', email: 'a@b.it', linkedin: 'https://it.linkedin.com/in/ada' });
      r.flush({ id: 7, nome: 'Ada', cognome: 'L', email: 'a@b.it', linkedin: 'https://it.linkedin.com/in/ada', dataCreazione: '2026-11-03' });
      expect(await p).toMatchObject({ obiettivoSettimanale: 6, sogliaAttesaGiorni: 10, linkedin: 'https://it.linkedin.com/in/ada' });
      expect(archivio.impostazioni(7)).toEqual({ obiettivoSettimanale: 6, sogliaAttesaGiorni: 10 });
    });

    it('se il salvataggio fallisce le impostazioni non cambiano', async () => {
      const p = firstValueFrom(http.put('/api/account/me', { nome: 'A', cognome: 'B', email: 'x', linkedin: '', obiettivoSettimanale: 1, sogliaAttesaGiorni: 1 }, { headers: BEARER }));
      rete.expectOne('/api/account/7').flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
      await p.catch(() => undefined);
      expect(archivio.impostazioni(7).obiettivoSettimanale).toBe(10);
    });

    it('DELETE /account/me diventa DELETE /account/delete/{id} e cancella i dati locali', async () => {
      archivio.crea(7, 'modelli', { tipo: 'SOLLECITO', nome: 'A', testo: 't' });
      const p = firstValueFrom(http.delete<void>('/api/account/me', { headers: BEARER }));
      const r = rete.expectOne('/api/account/delete/7');
      expect(r.request.method).toBe('DELETE');
      r.flush(null, { status: 204, statusText: 'No Content' });
      await p;
      expect(archivio.elenco(7, 'modelli')).toEqual([]);
    });
  });

  describe('candidature', () => {
    it('POST manda solo i campi del backend e restituisce anche quelli locali', async () => {
      const p = firstValueFrom(
        http.post<Candidatura>('/api/candidatura', input({ spontanea: true, fonte: 'RECRUITER', prossimaAzioneTesto: 'Scrivere', idCv: 2 }), { headers: BEARER }),
      );
      const r = rete.expectOne('/api/candidatura');
      expect(Object.keys(r.request.body as object)).not.toContain('fonte');
      expect(Object.keys(r.request.body as object)).not.toContain('spontanea');
      expect((r.request.body as { citta: unknown }).citta).toEqual(MILANO);
      r.flush(rispostaBackend(31), { status: 201, statusText: 'Created' });
      expect(await p).toMatchObject({ id: 31, spontanea: true, fonte: 'RECRUITER', prossimaAzioneTesto: 'Scrivere', idCv: 2 });
      expect(archivio.storico(7, 31)).toHaveLength(1);
    });

    it('GET dell’elenco unisce i dati locali e usa valori neutri per le candidature create altrove', async () => {
      archivio.salvaCandidatura(7, rispostaBackend(1) as never, { spontanea: true, fonte: 'INDEED', prossimaAzioneTesto: null, prossimaAzioneData: null, idCv: null }, '2026-10-01');
      const p = firstValueFrom(http.get<Candidatura[]>('/api/candidatura', { headers: BEARER }));
      rete.expectOne('/api/candidatura').flush([rispostaBackend(1), rispostaBackend(2)]);
      const l = await p;
      expect(l[0]).toMatchObject({ id: 1, fonte: 'INDEED', spontanea: true });
      expect(l[1]).toMatchObject({ id: 2, fonte: 'ALTRO', spontanea: false, idCv: null });
    });

    it('PUT con un nuovo stato aggiunge un evento allo storico', async () => {
      archivio.salvaCandidatura(7, rispostaBackend(31) as never, { spontanea: false, fonte: 'LINKEDIN', prossimaAzioneTesto: null, prossimaAzioneData: null, idCv: null }, '2026-10-01');
      const p = firstValueFrom(http.put<Candidatura>('/api/candidatura/31', input({ statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }), { headers: BEARER }));
      rete.expectOne('/api/candidatura/31').flush(rispostaBackend(31, 'RIFIUTATO_DA_RECRUITER'));
      await p;
      const storico = await firstValueFrom(http.get<{ stato: string }[]>('/api/candidatura/31/storico', { headers: BEARER }));
      expect(storico.map((e) => e.stato)).toEqual(['IN_FASE_DI_ATTESA', 'RIFIUTATO_DA_RECRUITER']);
    });

    it('lo storico mancante si ricostruisce leggendo la candidatura', async () => {
      const p = firstValueFrom(http.get<{ stato: string }[]>('/api/candidatura/40/storico', { headers: BEARER }));
      rete.expectOne('/api/candidatura/40').flush(rispostaBackend(40, 'FASE_DI_COLLOQUIO_CONOSCITIVO'));
      expect((await p).map((e) => e.stato)).toEqual(['FASE_DI_COLLOQUIO_CONOSCITIVO']);
    });

    it('DELETE toglie anche i dati locali, ma solo se il server ha risposto bene', async () => {
      archivio.salvaCandidatura(7, rispostaBackend(31) as never, { spontanea: false, fonte: 'LINKEDIN', prossimaAzioneTesto: null, prossimaAzioneData: null, idCv: null }, '2026-10-01');
      archivio.crea(7, 'colloqui', colloquio({ idCandidatura: 31 }));

      const fallita = firstValueFrom(http.delete('/api/candidatura/delete/31', { headers: BEARER }));
      rete.expectOne('/api/candidatura/delete/31').flush({ detail: 'x' }, { status: 500, statusText: 'Server Error' });
      await fallita.catch(() => undefined);
      expect(archivio.elenco(7, 'colloqui')).toHaveLength(1);

      const riuscita = firstValueFrom(http.delete('/api/candidatura/delete/31', { headers: BEARER }));
      rete.expectOne('/api/candidatura/delete/31').flush(null, { status: 204, statusText: 'No Content' });
      await riuscita;
      expect(archivio.elenco(7, 'colloqui')).toEqual([]);
      expect(archivio.storico(7, 31)).toBeUndefined();
    });
  });

  describe('risorse che il backend non ha', () => {
    it('si gestiscono nel browser senza chiamare la rete', async () => {
      const nuovo = await firstValueFrom(http.post<Colloquio>('/api/colloquio', { ...colloquio({ idCandidatura: 3 }) }, { headers: BEARER }));
      expect(nuovo.id).toBeGreaterThan(0);
      const elenco = await firstValueFrom(http.get<Colloquio[]>('/api/colloquio', { headers: BEARER }));
      expect(elenco).toHaveLength(1);
      const mod = await firstValueFrom(http.put<Colloquio>(`/api/colloquio/${nuovo.id}`, { ...nuovo, voto: 4 }, { headers: BEARER }));
      expect(mod.voto).toBe(4);
      await firstValueFrom(http.delete(`/api/colloquio/${nuovo.id}`, { headers: BEARER }));
      expect(await firstValueFrom(http.get<Colloquio[]>('/api/colloquio', { headers: BEARER }))).toEqual([]);
    });

    it('rispondono 404 per un elemento che non c’è', async () => {
      const e = (await firstValueFrom(http.put('/api/colloquio/99', { ...colloquio({ idCandidatura: 3 }) }, { headers: BEARER })).catch((x: unknown) => x)) as HttpErrorResponse;
      expect(e.status).toBe(404);
    });

    it('senza token rispondono 401', async () => {
      const e = (await firstValueFrom(http.get('/api/colloquio')).catch((x: unknown) => x)) as HttpErrorResponse;
      expect(e.status).toBe(401);
    });

    it('promemoria per azienda', async () => {
      await firstValueFrom(http.put('/api/azienda/Acm%C3%A9%20Italia/promemoria', { nonRicontattarePrimaDel: '2026-12-01' }, { headers: BEARER }));
      const p = await firstValueFrom(http.get<{ nonRicontattarePrimaDel: string | null }>('/api/azienda/ACME%20italia/promemoria', { headers: BEARER }));
      expect(p.nonRicontattarePrimaDel).toBe('2026-12-01');
    });
  });

  describe('CV (file sul server)', () => {
    const cv = (id: number) => ({ id, nome: `CV ${id}`, nomeFile: 'cv.pdf', contentType: 'application/pdf', dimensione: 10, dataCaricamento: '2026-11-01T10:00:00Z' });
    const conIdCv = (idCv: number | null) => ({ spontanea: false, fonte: 'ALTRO' as const, prossimaAzioneTesto: null, prossimaAzioneData: null, idCv });

    it('GET /cv va al backend e scollega le candidature che puntano a versioni sparite', async () => {
      archivio.salvaCandidatura(7, rispostaBackend(1) as never, conIdCv(2), '2026-10-01');
      archivio.salvaCandidatura(7, rispostaBackend(2) as never, conIdCv(9), '2026-10-01');
      const p = firstValueFrom(http.get('/api/cv', { headers: BEARER }));
      rete.expectOne('/api/cv').flush([cv(2)]);
      expect(await p).toEqual([cv(2)]);
      expect(archivio.leggi(7).extra[1].idCv).toBe(2);
      expect(archivio.leggi(7).extra[2].idCv).toBeNull();
    });

    it('POST manda il FormData così com’è', async () => {
      const form = new FormData();
      form.append('nome', 'CV');
      form.append('file', new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }));
      const p = firstValueFrom(http.post('/api/cv', form, { headers: BEARER }));
      const r = rete.expectOne('/api/cv');
      expect(r.request.body).toBe(form);
      r.flush(cv(5), { status: 201, statusText: 'Created' });
      expect(await p).toEqual(cv(5));
    });

    it('DELETE scollega dalle candidature la versione eliminata, ma solo se il server ha risposto bene', async () => {
      archivio.salvaCandidatura(7, rispostaBackend(1) as never, conIdCv(2), '2026-10-01');
      const fallita = firstValueFrom(http.delete('/api/cv/2', { headers: BEARER }));
      rete.expectOne('/api/cv/2').flush({ detail: 'x' }, { status: 500, statusText: 'Server Error' });
      await fallita.catch(() => undefined);
      expect(archivio.leggi(7).extra[1].idCv).toBe(2);

      const riuscita = firstValueFrom(http.delete('/api/cv/2', { headers: BEARER }));
      rete.expectOne('/api/cv/2').flush(null, { status: 204, statusText: 'No Content' });
      await riuscita;
      expect(archivio.leggi(7).extra[1].idCv).toBeNull();
    });

    it('senza token non si risponde dal browser: la richiesta va al backend, che dà 401', async () => {
      const p = firstValueFrom(http.get('/api/cv')).catch((x: unknown) => x);
      rete.expectOne('/api/cv').flush({ detail: 'x' }, { status: 401, statusText: 'Unauthorized' });
      expect(((await p) as HttpErrorResponse).status).toBe(401);
    });
  });

  it('le città vanno al backend così come sono', async () => {
    const p = firstValueFrom(http.post('/api/citta', { nomeCitta: 'Torino', provincia: 'TO', regione: 'Piemonte', nazione: 'Italia' }, { headers: BEARER }));
    const r = rete.expectOne('/api/citta');
    expect(r.request.body).toMatchObject({ nomeCitta: 'Torino' });
    r.flush({ id: 9, nomeCitta: 'Torino', provincia: 'TO', regione: 'Piemonte', nazione: 'Italia' }, { status: 201, statusText: 'Created' });
    expect(await p).toMatchObject({ id: 9 });
  });
});
