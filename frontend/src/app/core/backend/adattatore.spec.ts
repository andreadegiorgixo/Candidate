import { CandidaturaInput } from '../api/models';
import { candidatura, MILANO } from '../testing/fabbriche';
import {
  aAccountDTO,
  ANNUNCIO_NON_INDICATO,
  daAuthDTO,
  daCandidatureDTO,
  dividiCandidatura,
  EXTRA_PREDEFINITI,
  idDaToken,
  riconciliaStorico,
} from './adattatore';

export function tokenFinto(sub: string | number): string {
  const corpo = btoa(JSON.stringify({ iss: 'candidate', sub: String(sub) })).replace(/=+$/, '');
  return `eyJhbGciOiJIUzI1NiJ9.${corpo}.firma`;
}

describe('adattatore del backend', () => {
  it('traduce la risposta di accesso nel formato del frontend', () => {
    const r = daAuthDTO({
      accessToken: 'abc',
      tokenType: 'Bearer',
      expiresAt: '2026-11-03T22:00:00Z',
      account: { id: 7, nome: 'Ada', cognome: 'Lovelace', email: 'ada@example.com', dataCreazione: '2026-11-03' },
    });
    expect(r.token).toBe('abc');
    expect(r.scadenza).toBe('2026-11-03T22:00:00Z');
    expect(r.account).toMatchObject({ id: 7, nome: 'Ada', obiettivoSettimanale: 10, sogliaAttesaGiorni: 14 });
  });

  it('manda la password solo se scritta', () => {
    const base = { nome: 'A', cognome: 'B', email: 'a@b.it', obiettivoSettimanale: 5, sogliaAttesaGiorni: 7 };
    expect(aAccountDTO({ ...base, password: '' })).toEqual({ nome: 'A', cognome: 'B', email: 'a@b.it' });
    expect(aAccountDTO({ ...base, password: '   ' })).not.toHaveProperty('password');
    expect(aAccountDTO({ ...base, password: 'segreta123' })).toHaveProperty('password', 'segreta123');
    expect(aAccountDTO(base)).not.toHaveProperty('obiettivoSettimanale');
  });

  it('separa i campi del backend da quelli che restano nel browser', () => {
    const { id: _i, idAccount: _a, dataCreazione: _d, ...input } = candidatura({
      spontanea: true,
      fonte: 'RECRUITER',
      prossimaAzioneTesto: 'Scrivere',
      prossimaAzioneData: '2026-11-10',
      idCv: 3,
      note: null,
    });
    const { dto, extra } = dividiCandidatura(input as CandidaturaInput);
    expect(Object.keys(dto).sort()).toEqual(
      ['citta', 'dataCandidatura', 'jobOffert', 'modalita', 'nomeAzienda', 'note', 'posizioneLavorativa', 'statoCandidatura'],
    );
    expect(dto.citta).toEqual(MILANO);
    expect(extra).toEqual({ spontanea: true, fonte: 'RECRUITER', prossimaAzioneTesto: 'Scrivere', prossimaAzioneData: '2026-11-10', idCv: 3 });
  });

  it('il backend non accetta l’annuncio vuoto: si manda un segnaposto e in lettura torna vuoto', () => {
    const { id: _i, idAccount: _a, dataCreazione: _d, ...input } = candidatura({ jobOffert: '   ' });
    const { dto } = dividiCandidatura(input as CandidaturaInput);
    expect(dto.jobOffert).toBe(ANNUNCIO_NON_INDICATO);
    expect(daCandidatureDTO({ ...dto, id: 1, idAccount: 1 }).jobOffert).toBe('');
    expect(dividiCandidatura({ ...(input as CandidaturaInput), jobOffert: 'https://x.it' }).dto.jobOffert).toBe('https://x.it');
  });

  it('ricompone la candidatura con valori neutri se mancano i dati locali', () => {
    const c = daCandidatureDTO({
      id: 4,
      idAccount: 1,
      nomeAzienda: 'Acme',
      posizioneLavorativa: 'Dev',
      jobOffert: 'https://x.it',
      modalita: 'IBRIDO',
      citta: MILANO,
      statoCandidatura: 'IN_FASE_DI_ATTESA',
      dataCandidatura: '2026-10-01',
      dataCreazione: '2026-10-01',
    });
    expect(c).toMatchObject({ id: 4, note: null, ...EXTRA_PREDEFINITI });
  });

  describe('storico ricostruito', () => {
    const c = { statoCandidatura: 'FASE_DI_COLLOQUIO_TECNICO_1' as const, dataCandidatura: '2026-10-01' };

    it('senza storico parte dallo stato attuale alla data di invio', () => {
      expect(riconciliaStorico(undefined, c, '2026-11-03')).toEqual([{ stato: c.statoCandidatura, dataEvento: '2026-10-01', nota: null }]);
      expect(riconciliaStorico([], c, '2026-11-03')).toHaveLength(1);
    });

    it('non aggiunge nulla se lo stato non è cambiato', () => {
      const prima = [{ stato: c.statoCandidatura, dataEvento: '2026-10-01', nota: null }];
      expect(riconciliaStorico(prima, c, '2026-11-03')).toEqual(prima);
    });

    it('aggiunge un evento con la data di oggi quando lo stato cambia, anche se torna a uno già visto', () => {
      const prima = [
        { stato: 'IN_FASE_DI_ATTESA' as const, dataEvento: '2026-10-01', nota: null },
        { stato: 'FASE_DI_COLLOQUIO_TECNICO_1' as const, dataEvento: '2026-10-10', nota: null },
      ];
      const dopo = riconciliaStorico(prima, { ...c, statoCandidatura: 'IN_FASE_DI_ATTESA' }, '2026-11-03');
      expect(dopo).toHaveLength(3);
      expect(dopo[2]).toEqual({ stato: 'IN_FASE_DI_ATTESA', dataEvento: '2026-11-03', nota: null });
      expect(prima).toHaveLength(2);
    });
  });

  describe('token', () => {
    it('legge l’id dell’account dal campo sub', () => {
      expect(idDaToken(`Bearer ${tokenFinto(12)}`)).toBe(12);
      expect(idDaToken(tokenFinto(3))).toBe(3);
    });

    it('rifiuta token assenti, rotti o con un sub non valido', () => {
      expect(idDaToken(null)).toBeNull();
      expect(idDaToken('Bearer')).toBeNull();
      expect(idDaToken('Bearer a.!!!.c')).toBeNull();
      expect(idDaToken(`Bearer ${tokenFinto('abc')}`)).toBeNull();
      expect(idDaToken(`Bearer ${tokenFinto(0)}`)).toBeNull();
    });
  });
});
