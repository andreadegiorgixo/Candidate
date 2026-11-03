import { candidatura, colloquio, evento } from '../../core/testing/fabbriche';
import { cronologiaAzienda, raggruppaAziende } from './aziende.logic';

describe('aziende', () => {
  const cand = [
    candidatura({ id: 1, nomeAzienda: 'Altavia', dataCandidatura: '2026-05-01', statoCandidatura: 'GHOSTING_O_SENZA_RISPOSTA' }),
    candidatura({ id: 2, nomeAzienda: ' altavia ', dataCandidatura: '2026-10-10', statoCandidatura: 'FASE_DI_COLLOQUIO_CONOSCITIVO' }),
    candidatura({ id: 3, nomeAzienda: 'Brera Labs', dataCandidatura: '2026-10-20' }),
  ];

  it('con nessuna candidatura non produce aziende', () => {
    expect(raggruppaAziende([], new Map(), [], '2026-11-03')).toEqual([]);
  });

  it('raggruppa ignorando maiuscole e spazi e usa il nome della candidatura più recente', () => {
    const a = raggruppaAziende(cand, new Map(), [], '2026-11-03');
    expect(a).toHaveLength(2);
    const altavia = a.find((x) => x.chiave === 'altavia')!;
    expect(altavia.nome).toBe('altavia');
    expect(altavia.candidature.map((c) => c.id)).toEqual([2, 1]);
    expect(altavia.ultimoStato).toBe('FASE_DI_COLLOQUIO_CONOSCITIVO');
  });

  it('l’ultimo contatto considera storico e colloqui già avvenuti, ma non quelli futuri', () => {
    const storici = new Map([[2, [evento('IN_FASE_DI_ATTESA', '2026-10-10'), evento('FASE_DI_COLLOQUIO_CONOSCITIVO', '2026-10-25')]]]);
    const colloqui = [colloquio({ idCandidatura: 2, dataOra: '2026-10-30T10:00' }), colloquio({ idCandidatura: 2, dataOra: '2026-11-09T10:00' })];
    const altavia = raggruppaAziende(cand, storici, colloqui, '2026-11-03').find((x) => x.chiave === 'altavia')!;
    expect(altavia.ultimoContatto).toBe('2026-10-30');
  });

  it('ordina per ultimo contatto, dal più recente', () => {
    const a = raggruppaAziende(cand, new Map(), [], '2026-11-03');
    expect(a.map((x) => x.chiave)).toEqual(['brera labs', 'altavia']);
  });

  it('la cronologia unisce storico e colloqui, dal più recente', () => {
    const storici = new Map([[2, [evento('IN_FASE_DI_ATTESA', '2026-10-10'), evento('FASE_DI_COLLOQUIO_CONOSCITIVO', '2026-10-25')]]]);
    const c = cronologiaAzienda(cand.slice(0, 2), storici, [colloquio({ idCandidatura: 2, dataOra: '2026-10-30T10:00' })], '2026-11-03');
    expect(c.map((e) => e.data)).toEqual(['2026-10-30', '2026-10-25', '2026-10-10', '2026-05-01']);
    expect(c[1].testo).toBe('Java Developer: Conoscitivo');
  });

  it('senza storico la cronologia ripiega sulla data di invio', () => {
    expect(cronologiaAzienda([cand[2]], new Map(), [], '2026-11-03')).toEqual([{ data: '2026-10-20', idCandidatura: 3, testo: 'Candidatura inviata per Java Developer' }]);
  });
});
