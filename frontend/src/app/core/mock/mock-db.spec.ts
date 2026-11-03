import { CandidaturaInput } from '../api/models';
import { ErroreMock, MockDb } from './mock-db';
import { DEMO_EMAIL, DEMO_PASSWORD } from './seed';

function chiama(f: () => unknown): ErroreMock | null {
  try {
    f();
    return null;
  } catch (e) {
    return e as ErroreMock;
  }
}

describe('mock del backend', () => {
  let db: MockDb;
  let idDemo: number;

  beforeEach(() => {
    db = new MockDb('2026-11-03');
    idDemo = db.idDaToken(db.login(DEMO_EMAIL, DEMO_PASSWORD).token);
  });

  it('genera dati coerenti e ripetibili', () => {
    const a = db.candidature(idDemo);
    const b = new MockDb('2026-11-03').candidature(1);
    expect(a.length).toBeGreaterThanOrEqual(55);
    expect(a.map((c) => `${c.nomeAzienda}|${c.statoCandidatura}|${c.dataCandidatura}`)).toEqual(b.map((c) => `${c.nomeAzienda}|${c.statoCandidatura}|${c.dataCandidatura}`));
    expect(db.colloqui(idDemo)).toHaveLength(10);
    expect(db.offerte(idDemo)).toHaveLength(2);
    expect(db.cv(idDemo)).toHaveLength(3);
  });

  it('lo storico di ogni candidatura finisce nello stato attuale e non va oltre oggi', () => {
    for (const c of db.candidature(idDemo)) {
      const storico = db.storico(idDemo, c.id);
      expect(storico[0].stato).toBe('IN_FASE_DI_ATTESA');
      expect(storico[storico.length - 1].stato).toBe(c.statoCandidatura);
      expect(storico.every((e) => e.dataEvento >= c.dataCandidatura && e.dataEvento <= '2026-11-03')).toBe(true);
    }
  });

  it('rifiuta credenziali sbagliate e token sconosciuti con 401', () => {
    expect(chiama(() => db.login(DEMO_EMAIL, 'sbagliata'))?.stato).toBe(401);
    expect(chiama(() => db.idDaToken('mock.999.x'))?.stato).toBe(401);
    expect(chiama(() => db.idDaToken(null))?.stato).toBe(401);
  });

  it('registra un nuovo account vuoto e segnala l’email già usata con 409', () => {
    const r = db.registra({ nome: 'Ada', cognome: 'Rossi', email: 'ada@esempio.it', password: 'password1' });
    const id = db.idDaToken(r.token);
    expect(db.candidature(id)).toEqual([]);
    expect(chiama(() => db.registra({ nome: 'A', cognome: 'B', email: 'ADA@esempio.it', password: 'password1' }))?.stato).toBe(409);
  });

  it('valida i dati di registrazione con 400 e errori per campo', () => {
    const e = chiama(() => db.registra({ nome: '', cognome: 'B', email: 'non-valida', password: 'corta' }));
    expect(e?.stato).toBe(400);
    expect(Object.keys(e!.errori!)).toEqual(['nome', 'email', 'password']);
  });

  it('crea uno storico a ogni cambio di stato e non lo duplica se lo stato resta uguale', () => {
    const c = db.candidature(idDemo).find((x) => x.statoCandidatura === 'IN_FASE_DI_ATTESA')!;
    const prima = db.storico(idDemo, c.id).length;
    const { id: _i, idAccount: _a, dataCreazione: _d, ...input } = c;
    db.aggiornaCandidatura(idDemo, c.id, { ...input, note: 'solo una nota' });
    expect(db.storico(idDemo, c.id)).toHaveLength(prima);
    db.aggiornaCandidatura(idDemo, c.id, { ...input, statoCandidatura: 'FASE_DI_COLLOQUIO_CONOSCITIVO' });
    expect(db.storico(idDemo, c.id)).toHaveLength(prima + 1);
  });

  it('crea e cancella candidature, con 404 sugli id inesistenti', () => {
    const citta = db.elencoCitta()[0];
    const input: CandidaturaInput = {
      nomeAzienda: 'Nuova', posizioneLavorativa: 'Dev', jobOffert: '', modalita: 'REMOTO', citta, statoCandidatura: 'IN_FASE_DI_ATTESA',
      dataCandidatura: '2026-11-03', note: null, spontanea: false, fonte: 'ALTRO', prossimaAzioneTesto: null, prossimaAzioneData: null, idCv: null,
    };
    const n = db.creaCandidatura(idDemo, input);
    expect(db.storico(idDemo, n.id)).toHaveLength(1);
    db.eliminaCandidatura(idDemo, n.id);
    expect(chiama(() => db.candidatura(idDemo, n.id))?.stato).toBe(404);
    expect(chiama(() => db.creaCandidatura(idDemo, { ...input, nomeAzienda: ' ' }))?.stato).toBe(400);
  });

  it('segnala la città duplicata con 409', () => {
    const c = db.elencoCitta()[0];
    expect(chiama(() => db.creaCitta({ nomeCitta: c.nomeCitta.toUpperCase(), provincia: c.provincia, regione: c.regione, nazione: 'Italia' }))?.stato).toBe(409);
    expect(db.creaCitta({ nomeCitta: 'Trieste', provincia: 'TS', regione: 'Friuli-Venezia Giulia', nazione: 'Italia' }).id).toBeGreaterThan(0);
  });

  it('il promemoria ignora maiuscole e spazi nel nome dell’azienda', () => {
    db.aggiornaPromemoria(idDemo, 'Altavia', { nonRicontattarePrimaDel: '2026-12-01' });
    expect(db.promemoria(idDemo, ' ALTAVIA ').nonRicontattarePrimaDel).toBe('2026-12-01');
    expect(db.promemoria(idDemo, 'Sconosciuta').nonRicontattarePrimaDel).toBeNull();
  });
});
