import { candidatura, colloquio } from '../../core/testing/fabbriche';
import { contaInCorso, contaPerFermata, invioSettimana, prossimiColloqui, riepilogoUscite, titoloOggi } from './oggi.logic';

describe('logica di Oggi', () => {
  it('con nessuna candidatura i conteggi sono tutti a zero', () => {
    expect(contaPerFermata([])).toEqual([0, 0, 0, 0, 0, 0]);
    expect(contaInCorso([])).toBe(0);
    expect(riepilogoUscite([])).toEqual({ rifiutate: 0, ritirate: 0, propostaRifiutata: 0, senzaRisposta: 0 });
  });

  it('conta per fermata le candidature in corso e le assunzioni, non le uscite', () => {
    const c = [
      candidatura({ statoCandidatura: 'IN_FASE_DI_ATTESA' }),
      candidatura({ statoCandidatura: 'IN_FASE_DI_ATTESA' }),
      candidatura({ statoCandidatura: 'FASE_DI_COLLOQUIO_TECNICO_1' }),
      candidatura({ statoCandidatura: 'PROPOSTA_LAVORATIVA_RICEVUTA' }),
      candidatura({ statoCandidatura: 'PROPOSTA_LAVORATIVA_IN_FASE_DI_REVISIONE' }),
      candidatura({ statoCandidatura: 'ASSUNZIONE_COMPLETATA' }),
      candidatura({ statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }),
      candidatura({ statoCandidatura: 'PROPOSTA_LAVORATIVA_RIFIUTATA' }),
    ];
    expect(contaPerFermata(c)).toEqual([2, 0, 1, 0, 2, 1]);
    expect(contaInCorso(c)).toBe(5);
  });

  it('riassume le uscite per tipo', () => {
    const c = [
      candidatura({ statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }),
      candidatura({ statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }),
      candidatura({ statoCandidatura: 'RIFIUTATO_DAL_CANDIDATO' }),
      candidatura({ statoCandidatura: 'GHOSTING_O_SENZA_RISPOSTA' }),
      candidatura({ statoCandidatura: 'PROPOSTA_LAVORATIVA_RIFIUTATA' }),
    ];
    expect(riepilogoUscite(c)).toEqual({ rifiutate: 2, ritirate: 1, propostaRifiutata: 1, senzaRisposta: 1 });
  });

  it('il titolo cambia con il numero di cose da fare', () => {
    expect(titoloOggi(0)).toBe('Oggi non hai niente in sospeso');
    expect(titoloOggi(1)).toBe('Oggi hai 1 cosa da fare');
    expect(titoloOggi(4)).toBe('Oggi hai 4 cose da fare');
  });

  describe('invii della settimana', () => {
    const invii = [
      candidatura({ dataCandidatura: '2026-11-01' }), // domenica scorsa
      candidatura({ dataCandidatura: '2026-11-02' }), // lunedì
      candidatura({ dataCandidatura: '2026-11-03' }),
      candidatura({ dataCandidatura: '2026-11-08' }), // domenica
      candidatura({ dataCandidatura: '2026-11-09' }), // lunedì prossimo
    ];

    it('conta da lunedì a domenica', () => {
      const s = invioSettimana(invii, '2026-11-03', 10);
      expect(s.inviate).toBe(3);
      expect(s.mancano).toBe(7);
      expect(s.giorniRimasti).toBe(6);
      expect(s.tacche).toBe(3);
    });

    it('le tacche sono proporzionali all’obiettivo e non superano dieci', () => {
      expect(invioSettimana(invii, '2026-11-03', 5).tacche).toBe(6);
      expect(invioSettimana(invii, '2026-11-03', 2).tacche).toBe(10);
      expect(invioSettimana(invii, '2026-11-03', 20).tacche).toBe(2);
    });

    it('senza invii o senza obiettivo non divide per zero', () => {
      expect(invioSettimana([], '2026-11-03', 10)).toMatchObject({ inviate: 0, tacche: 0, mancano: 10 });
      expect(invioSettimana(invii, '2026-11-03', 0)).toMatchObject({ tacche: 0, mancano: 0 });
    });

    it('funziona a cavallo del mese', () => {
      const c = [candidatura({ dataCandidatura: '2026-11-30' }), candidatura({ dataCandidatura: '2026-12-02' })];
      expect(invioSettimana(c, '2026-12-01', 10).inviate).toBe(2);
    });
  });

  describe('prossimi colloqui', () => {
    const colloqui = [
      colloquio({ id: 1, dataOra: '2026-11-09T15:00' }),
      colloquio({ id: 2, dataOra: '2026-11-04T10:30' }),
      colloquio({ id: 3, dataOra: '2026-11-02T10:30' }),
      colloquio({ id: 4, dataOra: '2026-11-20T10:30' }),
      colloquio({ id: 5, dataOra: '2026-11-12T10:30' }),
    ];

    it('prende i primi tre dal più vicino, senza quelli passati', () => {
      expect(prossimiColloqui(colloqui, '2026-11-03T12:00').map((c) => c.id)).toEqual([2, 1, 5]);
    });

    it('con nessun colloquio futuro restituisce un elenco vuoto', () => {
      expect(prossimiColloqui(colloqui, '2027-01-01T00:00')).toEqual([]);
      expect(prossimiColloqui([], '2026-11-03T12:00')).toEqual([]);
    });
  });
});
