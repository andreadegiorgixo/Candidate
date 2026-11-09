import { aggiungiGiorni } from '../../core/date';
import { candidatura, colloquio } from '../../core/testing/fabbriche';
import { contaInCorso, contaPerFermata, invioSettimana, prossimiColloqui, riepilogoAndamento, riepilogoUscite, titoloOggi } from './oggi.logic';

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

describe('riepilogo «Andamento in breve»', () => {
  const oggi = '2026-11-06';
  const adesso = '2026-11-06T10:00';
  const base = { candidature: [], colloqui: [], oggi, adesso, sogliaAttesa: 14 };
  const inviata = (giorniFa: number, extra: Parameters<typeof candidatura>[0] = {}) =>
    candidatura({ dataCandidatura: aggiungiGiorni(oggi, -giorniFa), ...extra });

  it('senza dati i riquadri sono a zero e senza confronto', () => {
    const r = riepilogoAndamento(base);
    expect(r.inviate).toEqual({ etichetta: 'Inviate negli ultimi 30 giorni', valore: '0', sotto: '' });
    expect(r.risposte).toEqual({ etichetta: 'Risposte', valore: '0', sotto: 'Nessuna candidatura inviata da più di 14 giorni' });
    expect(r.colloqui).toEqual({ etichetta: 'Colloqui fatti', valore: '0', sotto: 'Ancora nessuno' });
  });

  describe('inviate negli ultimi 30 giorni', () => {
    it('il confine è oggi meno 30 giorni, incluso, come il filtro di Andamento', () => {
      const candidature = [inviata(0), inviata(30), inviata(31)];
      expect(riepilogoAndamento({ ...base, candidature }).inviate.valore).toBe('2');
    });

    it('confronta con i 30 giorni prima: più', () => {
      const candidature = [inviata(1), inviata(2), inviata(3), inviata(40)];
      expect(riepilogoAndamento({ ...base, candidature }).inviate.sotto).toBe('2 in più del mese prima');
    });

    it('confronta con i 30 giorni prima: meno', () => {
      const candidature = [inviata(1), inviata(31), inviata(40), inviata(59)];
      expect(riepilogoAndamento({ ...base, candidature }).inviate.sotto).toBe('2 in meno del mese prima');
      expect(riepilogoAndamento({ ...base, candidature: [inviata(31), inviata(32)] }).inviate.sotto).toBe('2 in meno del mese prima');
      expect(riepilogoAndamento({ ...base, candidature: [inviata(1), inviata(31), inviata(32)] }).inviate.sotto).toBe('1 in meno del mese prima');
    });

    it('confronta con i 30 giorni prima: uguale', () => {
      const candidature = [inviata(1), inviata(2), inviata(31), inviata(60)];
      expect(riepilogoAndamento({ ...base, candidature }).inviate.sotto).toBe('Come il mese prima');
    });

    it('il periodo precedente va da oggi meno 60 (incluso) a oggi meno 30 (escluso)', () => {
      // 60 giorni fa rientra nel mese prima, 61 no.
      expect(riepilogoAndamento({ ...base, candidature: [inviata(1), inviata(60)] }).inviate.sotto).toBe('Come il mese prima');
      expect(riepilogoAndamento({ ...base, candidature: [inviata(1), inviata(61)] }).inviate.sotto).toBe('1 in più del mese prima');
    });

    it('senza candidature nel mese prima né più vecchie non c’è confronto', () => {
      expect(riepilogoAndamento({ ...base, candidature: [inviata(1), inviata(5)] }).inviate.sotto).toBe('');
    });

    it('con candidature più vecchie ma nessuna nel mese prima il confronto c’è', () => {
      const candidature = [inviata(1), inviata(5), inviata(90)];
      expect(riepilogoAndamento({ ...base, candidature }).inviate.sotto).toBe('2 in più del mese prima');
      expect(riepilogoAndamento({ ...base, candidature: [inviata(90)] }).inviate.sotto).toBe('Come il mese prima');
    });
  });

  describe('risposte', () => {
    it('con pochi dati mostra «X su Y» e niente percentuale', () => {
      const candidature = [
        inviata(20, { statoCandidatura: 'FASE_DI_COLLOQUIO_CONOSCITIVO' }),
        inviata(20, { statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }),
        inviata(20, { statoCandidatura: 'IN_FASE_DI_ATTESA' }),
        inviata(20, { statoCandidatura: 'GHOSTING_O_SENZA_RISPOSTA' }),
      ];
      const r = riepilogoAndamento({ ...base, candidature }).risposte;
      expect(r.valore).toBe('2 su 4');
      expect(r.sotto).toBe('Tra quelle inviate da più di 14 giorni');
    });

    it('da cinque candidature in su aggiunge la percentuale', () => {
      const candidature = [
        inviata(20, { statoCandidatura: 'FASE_DI_COLLOQUIO_CONOSCITIVO' }),
        inviata(20, { statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }),
        ...Array.from({ length: 5 }, () => inviata(20, { statoCandidatura: 'GHOSTING_O_SENZA_RISPOSTA' })),
      ];
      const r = riepilogoAndamento({ ...base, candidature }).risposte;
      expect(r.valore).toBe('2 su 7');
      expect(r.sotto).toBe('29%, tra quelle inviate da più di 14 giorni');
    });

    it('esclude dal totale le attese inviate da meno di sogliaAttesa giorni, ma non quelle già scadute', () => {
      const candidature = [
        inviata(20, { statoCandidatura: 'FASE_DI_COLLOQUIO_TECNICO_1' }),
        inviata(0, { statoCandidatura: 'IN_FASE_DI_ATTESA' }),
        inviata(14, { statoCandidatura: 'IN_FASE_DI_ATTESA' }),
        inviata(15, { statoCandidatura: 'IN_FASE_DI_ATTESA' }),
        // una candidatura recente che ha già avuto risposta conta lo stesso
        inviata(2, { statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }),
      ];
      expect(riepilogoAndamento({ ...base, candidature }).risposte.valore).toBe('2 su 3');
    });

    it('usa la soglia dell’account nel testo e nel calcolo', () => {
      const candidature = [inviata(8, { statoCandidatura: 'IN_FASE_DI_ATTESA' }), inviata(3, { statoCandidatura: 'IN_FASE_DI_ATTESA' })];
      const r = riepilogoAndamento({ ...base, candidature, sogliaAttesa: 7 }).risposte;
      expect(r.valore).toBe('0 su 1');
      expect(r.sotto).toBe('Tra quelle inviate da più di 7 giorni');
    });

    it('con solo attese recenti non c’è nessuna candidatura da contare', () => {
      const r = riepilogoAndamento({ ...base, candidature: [inviata(2), inviata(5)] }).risposte;
      expect(r.valore).toBe('0');
      expect(r.sotto).toBe('Nessuna candidatura inviata da più di 14 giorni');
    });
  });

  describe('colloqui fatti', () => {
    it('conta solo i colloqui nel passato', () => {
      const a = inviata(30);
      const colloqui = [
        colloquio({ idCandidatura: a.id, dataOra: '2026-11-05T09:00' }),
        colloquio({ idCandidatura: a.id, dataOra: '2026-11-06T09:59' }),
        colloquio({ idCandidatura: a.id, dataOra: '2026-11-06T10:00' }), // adesso: non ancora passato
        colloquio({ idCandidatura: a.id, dataOra: '2026-11-07T09:00' }),
      ];
      const r = riepilogoAndamento({ ...base, candidature: [a], colloqui }).colloqui;
      expect(r.valore).toBe('2');
    });

    it('con soli colloqui futuri è «Ancora nessuno»', () => {
      const a = inviata(3);
      const colloqui = [colloquio({ idCandidatura: a.id, dataOra: '2026-11-10T09:00' })];
      expect(riepilogoAndamento({ ...base, candidature: [a], colloqui }).colloqui).toEqual({
        etichetta: 'Colloqui fatti',
        valore: '0',
        sotto: 'Ancora nessuno',
      });
    });

    it('più colloqui con la stessa azienda contano una volta sola tra le aziende', () => {
      const a = inviata(40, { nomeAzienda: 'Nordvento' });
      const b = inviata(30, { nomeAzienda: ' nordvento ' }); // stessa azienda, altra candidatura
      const c = inviata(20, { nomeAzienda: 'Altavia' });
      const colloqui = [
        colloquio({ idCandidatura: a.id, dataOra: '2026-10-10T10:00' }),
        colloquio({ idCandidatura: a.id, dataOra: '2026-10-20T10:00' }),
        colloquio({ idCandidatura: b.id, dataOra: '2026-10-25T10:00' }),
        colloquio({ idCandidatura: c.id, dataOra: '2026-10-30T10:00' }),
      ];
      const r = riepilogoAndamento({ ...base, candidature: [a, b, c], colloqui }).colloqui;
      expect(r.valore).toBe('4');
      expect(r.sotto).toBe('colloqui con 2 aziende');
    });

    it('usa il singolare con un colloquio e un’azienda', () => {
      const a = inviata(10);
      const colloqui = [colloquio({ idCandidatura: a.id, dataOra: '2026-11-01T10:00' })];
      const r = riepilogoAndamento({ ...base, candidature: [a], colloqui }).colloqui;
      expect(r.valore).toBe('1');
      expect(r.sotto).toBe('colloquio con 1 azienda');
    });
  });
});
