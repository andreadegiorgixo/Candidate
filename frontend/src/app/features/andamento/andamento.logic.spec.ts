import { Cv } from '../../core/api/models';
import { candidatura, evento } from '../../core/testing/fabbriche';
import {
  applicaFiltriAndamento,
  calcolaPercorsoAggregato,
  calcolaSegnali,
  calcolaTasso,
  invioPerGiorno,
  invioPerSettimana,
  mediana,
  messaggioPochiDati,
  Storici,
  tassoColloquio,
  tassoMensile,
  tassoPerCitta,
  tassoPerCv,
  tassoPerModalita,
  tempiPerFase,
} from './andamento.logic';

const nessunoStorico: Storici = new Map();

describe('mediana', () => {
  it('non c’è con nessun valore', () => expect(mediana([])).toBeNull());
  it('è il valore centrale con un numero dispari di casi', () => expect(mediana([9, 1, 5])).toBe(5));
  it('è la media dei due centrali con un numero pari di casi', () => expect(mediana([1, 2, 3, 10])).toBe(2.5));
  it('non è sensibile ai valori estremi', () => expect(mediana([3, 4, 5, 6, 900])).toBe(5));
});

describe('tasso di risposta', () => {
  it('senza candidature non c’è un tasso', () => {
    expect(calcolaTasso([], nessunoStorico)).toEqual({ n: 0, risposte: 0, tasso: null });
  });

  it('conta come risposta ogni uscita dall’attesa, ma non il ghosting', () => {
    const c = [
      candidatura({ id: 1, statoCandidatura: 'IN_FASE_DI_ATTESA' }),
      candidatura({ id: 2, statoCandidatura: 'FASE_DI_COLLOQUIO_CONOSCITIVO' }),
      candidatura({ id: 3, statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }),
      candidatura({ id: 4, statoCandidatura: 'GHOSTING_O_SENZA_RISPOSTA' }),
    ];
    const t = calcolaTasso(c, new Map([[4, [evento('IN_FASE_DI_ATTESA', '2026-01-01'), evento('GHOSTING_O_SENZA_RISPOSTA', '2026-02-01')]]]));
    expect(t).toEqual({ n: 4, risposte: 2, tasso: 0.5 });
  });
});

describe('filtri di Andamento', () => {
  const c = [
    candidatura({ id: 1, dataCandidatura: '2026-11-01', modalita: 'REMOTO', fonte: 'LINKEDIN' }),
    candidatura({ id: 2, dataCandidatura: '2026-10-05', modalita: 'IBRIDO', fonte: 'LINKEDIN' }),
    candidatura({ id: 3, dataCandidatura: '2026-04-05', modalita: 'REMOTO', fonte: 'INDEED' }),
  ];

  it('il periodo si conta dall’oggi, estremi compresi', () => {
    const f = { periodo: '30' as const, modalita: '' as const, fonte: '' as const };
    expect(applicaFiltriAndamento(c, f, '2026-11-03').map((x) => x.id)).toEqual([1, 2]);
    expect(applicaFiltriAndamento(c, { ...f, periodo: '30' }, '2026-11-04').map((x) => x.id)).toEqual([1, 2]);
    expect(applicaFiltriAndamento(c, { ...f, periodo: '30' }, '2026-11-05').map((x) => x.id)).toEqual([1]);
    expect(applicaFiltriAndamento(c, { ...f, periodo: 'tutto' }, '2026-11-03')).toHaveLength(3);
    expect(applicaFiltriAndamento(c, { ...f, periodo: '365' }, '2026-11-03')).toHaveLength(3);
  });

  it('combina modalità e fonte', () => {
    expect(applicaFiltriAndamento(c, { periodo: 'tutto', modalita: 'REMOTO', fonte: 'LINKEDIN' }, '2026-11-03').map((x) => x.id)).toEqual([1]);
  });
});

describe('segnali', () => {
  /** 12 candidature remote (6 con risposta) e 12 in sede (2 con risposta). */
  function scenario() {
    const c = [
      ...Array.from({ length: 12 }, (_, i) => candidatura({ id: 100 + i, modalita: 'REMOTO', statoCandidatura: i < 6 ? 'RIFIUTATO_DA_RECRUITER' : 'IN_FASE_DI_ATTESA', fonte: 'LINKEDIN' })),
      ...Array.from({ length: 12 }, (_, i) => candidatura({ id: 200 + i, modalita: 'INSEDE', statoCandidatura: i < 2 ? 'RIFIUTATO_DA_RECRUITER' : 'IN_FASE_DI_ATTESA', fonte: 'LINKEDIN' })),
    ];
    return c;
  }

  it('senza candidature non produce frasi', () => {
    expect(calcolaSegnali([], nessunoStorico, [])).toEqual([]);
  });

  it('descrive il confronto quando entrambi i gruppi hanno almeno 10 candidature e la differenza è 1,5 volte', () => {
    const frasi = calcolaSegnali(scenario(), nessunoStorico, []);
    expect(frasi).toContain('Finora le candidature da remoto ricevono risposta 3 volte più spesso di quelle in sede (50% contro 17%).');
  });

  it('usa «il doppio» quando il rapporto è vicino a due', () => {
    const c = [
      ...Array.from({ length: 10 }, (_, i) => candidatura({ id: 300 + i, modalita: 'REMOTO', statoCandidatura: i < 4 ? 'RIFIUTATO_DA_RECRUITER' : 'IN_FASE_DI_ATTESA' })),
      ...Array.from({ length: 10 }, (_, i) => candidatura({ id: 400 + i, modalita: 'INSEDE', statoCandidatura: i < 2 ? 'RIFIUTATO_DA_RECRUITER' : 'IN_FASE_DI_ATTESA' })),
    ];
    expect(calcolaSegnali(c, nessunoStorico, []).join(' ')).toContain('ricevono risposta il doppio di quelle in sede (40% contro 20%)');
  });

  it('non compare con meno di 10 candidature in un gruppo', () => {
    const c = scenario().filter((x) => x.id !== 111); // 11 remote, ma togliamo anche in sede sotto soglia
    const poche = c.filter((x) => x.modalita === 'REMOTO' || x.id < 208);
    expect(calcolaSegnali(poche, nessunoStorico, []).some((f) => f.includes('contro'))).toBe(false);
  });

  it('non compare se la differenza è sotto 1,5 volte', () => {
    const c = [
      ...Array.from({ length: 10 }, (_, i) => candidatura({ id: 500 + i, modalita: 'REMOTO', statoCandidatura: i < 5 ? 'RIFIUTATO_DA_RECRUITER' : 'IN_FASE_DI_ATTESA' })),
      ...Array.from({ length: 10 }, (_, i) => candidatura({ id: 600 + i, modalita: 'INSEDE', statoCandidatura: i < 4 ? 'RIFIUTATO_DA_RECRUITER' : 'IN_FASE_DI_ATTESA' })),
    ];
    expect(calcolaSegnali(c, nessunoStorico, []).some((f) => f.includes('contro'))).toBe(false);
  });

  it('non afferma nulla quando il gruppo peggiore ha tasso zero', () => {
    const c = [
      ...Array.from({ length: 10 }, (_, i) => candidatura({ id: 700 + i, modalita: 'REMOTO', statoCandidatura: i < 5 ? 'RIFIUTATO_DA_RECRUITER' : 'IN_FASE_DI_ATTESA' })),
      ...Array.from({ length: 10 }, (_, i) => candidatura({ id: 800 + i, modalita: 'INSEDE', statoCandidatura: 'IN_FASE_DI_ATTESA' })),
    ];
    expect(calcolaSegnali(c, nessunoStorico, []).some((f) => f.includes('contro'))).toBe(false);
  });

  it('dà sempre da due a quattro frasi quando c’è abbastanza da dire', () => {
    const frasi = calcolaSegnali(scenario(), nessunoStorico, []);
    expect(frasi.length).toBeGreaterThanOrEqual(2);
    expect(frasi.length).toBeLessThanOrEqual(4);
  });

  it('nomina la versione del CV nei confronti', () => {
    const cv: Cv[] = [
      { id: 1, nome: 'CV generale', url: '' },
      { id: 2, nome: 'CV Java', url: '' },
    ];
    const c = [
      ...Array.from({ length: 10 }, (_, i) => candidatura({ id: 900 + i, idCv: 2, statoCandidatura: i < 6 ? 'RIFIUTATO_DA_RECRUITER' : 'IN_FASE_DI_ATTESA' })),
      ...Array.from({ length: 10 }, (_, i) => candidatura({ id: 950 + i, idCv: 1, statoCandidatura: i < 2 ? 'RIFIUTATO_DA_RECRUITER' : 'IN_FASE_DI_ATTESA' })),
    ];
    expect(calcolaSegnali(c, nessunoStorico, cv).join(' ')).toContain('inviate con «CV Java»');
  });
});

describe('ritmo settimanale', () => {
  it('senza candidature non c’è nulla da mostrare', () => {
    expect(invioPerSettimana([], '2026-11-03', '90')).toEqual([]);
  });

  it('include le settimane vuote e conta da lunedì', () => {
    const c = [candidatura({ dataCandidatura: '2026-10-12' }), candidatura({ dataCandidatura: '2026-10-18' }), candidatura({ dataCandidatura: '2026-11-03' })];
    const s = invioPerSettimana(c, '2026-11-03', '30');
    // 30 giorni indietro è il 4 ottobre, una domenica: la prima settimana parte dal lunedì prima.
    expect(s.map((x) => x.inizio)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']);
    expect(s.map((x) => x.n)).toEqual([0, 0, 2, 0, 0, 1]);
  });

  it('con «tutto» parte dalla prima candidatura', () => {
    const c = [candidatura({ dataCandidatura: '2026-09-30' })];
    const s = invioPerSettimana(c, '2026-11-03', 'tutto');
    expect(s[0].inizio).toBe('2026-09-28');
    expect(s[s.length - 1].inizio).toBe('2026-11-02');
  });

  it('una settimana a cavallo del mese resta una sola settimana', () => {
    const c = [candidatura({ dataCandidatura: '2026-10-30' }), candidatura({ dataCandidatura: '2026-11-02' })];
    const s = invioPerSettimana(c, '2026-11-03', '30');
    expect(s.find((x) => x.inizio === '2026-10-26')?.n).toBe(1);
    expect(s.find((x) => x.inizio === '2026-11-02')?.n).toBe(1);
  });
});

describe('percorso aggregato', () => {
  it('senza candidature è tutto a zero e senza collegamenti', () => {
    const p = calcolaPercorsoAggregato([], nessunoStorico);
    expect(p.totale).toBe(0);
    expect(p.collegamenti).toEqual([]);
    expect(p.conversioni.every((x) => x.tasso === null && x.su === 0)).toBe(true);
  });

  it('conta le fermate raggiunte e separa le uscite', () => {
    const c = [
      candidatura({ id: 1, statoCandidatura: 'IN_FASE_DI_ATTESA' }),
      candidatura({ id: 2, statoCandidatura: 'GHOSTING_O_SENZA_RISPOSTA' }),
      candidatura({ id: 3, statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }),
      candidatura({ id: 4, statoCandidatura: 'FASE_DI_COLLOQUIO_TECNICO_1' }),
    ];
    const storici: Storici = new Map([
      [2, [evento('IN_FASE_DI_ATTESA', '2026-01-01'), evento('GHOSTING_O_SENZA_RISPOSTA', '2026-02-01')]],
      [3, [evento('IN_FASE_DI_ATTESA', '2026-01-01'), evento('FASE_DI_COLLOQUIO_CONOSCITIVO', '2026-01-05'), evento('RIFIUTATO_DA_RECRUITER', '2026-01-09')]],
    ]);
    const p = calcolaPercorsoAggregato(c, storici);
    expect(p.raggiunte).toEqual([4, 2, 1, 0, 0, 0]);
    const valore = (da: string, a: string) => p.collegamenti.find((x) => x.da === da && x.a === a)?.valore;
    expect(valore('Inviate', 'Conoscitivo')).toBe(2);
    expect(valore('Conoscitivo', 'Tecnico 1')).toBe(1);
    expect(valore('Inviate', 'Ancora in corso')).toBe(1);
    expect(valore('Inviate', 'Senza risposta')).toBe(1);
    expect(valore('Conoscitivo', 'Rifiutate dall’azienda')).toBe(1);
    expect(valore('Tecnico 1', 'Ancora in corso')).toBe(1);
  });

  it('il flusso in uscita da ogni fermata è uguale a quello in entrata', () => {
    const c = [
      candidatura({ id: 1, statoCandidatura: 'FASE_DI_COLLOQUIO_TECNICO_2' }),
      candidatura({ id: 2, statoCandidatura: 'PROPOSTA_LAVORATIVA_RIFIUTATA' }),
      candidatura({ id: 3, statoCandidatura: 'ASSUNZIONE_COMPLETATA' }),
      candidatura({ id: 4 }),
    ];
    const p = calcolaPercorsoAggregato(c, nessunoStorico);
    for (const nodo of ['Inviate', 'Conoscitivo', 'Tecnico 1', 'Tecnico 2', 'Proposta']) {
      const entra = nodo === 'Inviate' ? p.totale : p.collegamenti.filter((x) => x.a === nodo).reduce((s, x) => s + x.valore, 0);
      const esce = p.collegamenti.filter((x) => x.da === nodo).reduce((s, x) => s + x.valore, 0);
      expect(esce).toBe(entra);
    }
  });

  it('la conversione indica anche su quante candidature è calcolata', () => {
    const c = [candidatura({ id: 1 }), candidatura({ id: 2 }), candidatura({ id: 3, statoCandidatura: 'FASE_DI_COLLOQUIO_CONOSCITIVO' })];
    const p = calcolaPercorsoAggregato(c, nessunoStorico);
    expect(p.conversioni[0]).toMatchObject({ da: 'Inviate', a: 'Conoscitivo', su: 3 });
    expect(p.conversioni[0].tasso).toBeCloseTo(1 / 3);
    expect(p.conversioni[1]).toMatchObject({ su: 1, tasso: 0 });
  });
});

describe('tasso di risposta nel tempo', () => {
  it('esclude le candidature inviate da meno giorni della soglia', () => {
    const c = [
      candidatura({ id: 1, dataCandidatura: '2026-10-20', statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }), // 14 giorni: inclusa
      candidatura({ id: 2, dataCandidatura: '2026-10-21', statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }), // 13 giorni: esclusa
    ];
    const p = tassoMensile(c, nessunoStorico, '2026-11-03', 14);
    expect(p).toEqual([{ mese: '2026-10', n: 1, risposte: 1, tasso: 1 }]);
  });

  it('senza candidature idonee non restituisce punti', () => {
    expect(tassoMensile([], nessunoStorico, '2026-11-03', 14)).toEqual([]);
    expect(tassoMensile([candidatura({ dataCandidatura: '2026-11-01' })], nessunoStorico, '2026-11-03', 14)).toEqual([]);
  });

  it('lascia un buco, non uno zero, nei mesi senza invii', () => {
    const c = [candidatura({ id: 1, dataCandidatura: '2026-07-31' }), candidatura({ id: 2, dataCandidatura: '2026-09-01', statoCandidatura: 'FASE_DI_COLLOQUIO_CONOSCITIVO' })];
    const p = tassoMensile(c, nessunoStorico, '2026-11-03', 14);
    expect(p.map((x) => x.mese)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(p[1]).toEqual({ mese: '2026-08', n: 0, risposte: 0, tasso: null });
    expect(p[0].tasso).toBe(0);
    expect(p[2].tasso).toBe(1);
  });

  it('a cavallo d’anno ordina correttamente i mesi', () => {
    const c = [candidatura({ id: 1, dataCandidatura: '2025-12-15' }), candidatura({ id: 2, dataCandidatura: '2026-01-10' })];
    expect(tassoMensile(c, nessunoStorico, '2026-11-03', 14).map((x) => x.mese)).toEqual(['2025-12', '2026-01']);
  });
});

describe('tempi per fase', () => {
  it('senza dati restituisce fasi con zero casi e nessuna mediana', () => {
    for (const t of tempiPerFase([], nessunoStorico)) expect(t).toMatchObject({ mediana: null, casi: 0 });
  });

  it('calcola la mediana, non la media, e il numero di casi', () => {
    const risposte = ['2026-01-04', '2026-01-06', '2026-02-10']; // 3, 5 e 40 giorni dopo l'invio
    const c = risposte.map((_, i) => candidatura({ id: i + 1, dataCandidatura: '2026-01-01', statoCandidatura: 'FASE_DI_COLLOQUIO_CONOSCITIVO' }));
    const storici: Storici = new Map(risposte.map((d, i) => [i + 1, [evento('IN_FASE_DI_ATTESA', '2026-01-01'), evento('FASE_DI_COLLOQUIO_CONOSCITIVO', d)]]));
    const r = tempiPerFase(c, storici)[0];
    expect(r.casi).toBe(3);
    expect(r.mediana).toBe(5);
  });

  it('ignora i ghosting nel tempo di prima risposta', () => {
    const c = [candidatura({ id: 1, statoCandidatura: 'GHOSTING_O_SENZA_RISPOSTA' })];
    const r = tempiPerFase(c, new Map([[1, [evento('IN_FASE_DI_ATTESA', '2026-01-01'), evento('GHOSTING_O_SENZA_RISPOSTA', '2026-02-01')]]]))[0];
    expect(r.casi).toBe(0);
  });

  it('misura il passaggio tra fermate consecutive', () => {
    const c = [candidatura({ id: 1, statoCandidatura: 'FASE_DI_COLLOQUIO_TECNICO_2' })];
    const st: Storici = new Map([[1, [evento('IN_FASE_DI_ATTESA', '2026-10-01'), evento('FASE_DI_COLLOQUIO_CONOSCITIVO', '2026-10-10'), evento('FASE_DI_COLLOQUIO_TECNICO_1', '2026-10-24'), evento('FASE_DI_COLLOQUIO_TECNICO_2', '2026-11-03')]]]);
    const t = tempiPerFase(c, st);
    expect(t.map((x) => x.mediana)).toEqual([9, 14, 10, null]);
  });
});

describe('cosa funziona', () => {
  it('segna «pochi dati» sotto le cinque candidature', () => {
    const c = [
      ...Array.from({ length: 6 }, (_, i) => candidatura({ id: i + 1, modalita: 'REMOTO', statoCandidatura: i < 3 ? 'RIFIUTATO_DA_RECRUITER' : 'IN_FASE_DI_ATTESA' })),
      ...Array.from({ length: 4 }, (_, i) => candidatura({ id: 10 + i, modalita: 'IBRIDO' })),
    ];
    const b = tassoPerModalita(c, nessunoStorico);
    expect(b.map((x) => [x.etichetta, x.n, x.pochiDati])).toEqual([['Da remoto', 6, false], ['Ibrido', 4, true]]);
    expect(b[0].tasso).toBe(0.5);
  });

  it('con nessuna candidatura non produce barre', () => {
    expect(tassoPerModalita([], nessunoStorico)).toEqual([]);
    expect(tassoPerCitta([], nessunoStorico)).toEqual([]);
  });

  it('mostra le prime cinque città e raggruppa il resto in «Altre»', () => {
    const nomi = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const c = nomi.flatMap((n, k) => Array.from({ length: 7 - k }, (_, i) => candidatura({ id: k * 10 + i + 1, citta: { id: k + 1, nomeCitta: n, provincia: 'XX', regione: 'R', nazione: 'Italia' } })));
    const b = tassoPerCitta(c, nessunoStorico);
    expect(b.map((x) => x.etichetta)).toEqual(['A', 'B', 'C', 'D', 'E', 'Altre']);
    expect(b[5].n).toBe(2 + 1);
  });

  it('raggruppa per versione del CV e mette in «Altre» le candidature senza CV', () => {
    const cv: Cv[] = [{ id: 1, nome: 'Generale', url: '' }, { id: 2, nome: 'Java', url: '' }];
    const c = [candidatura({ id: 1, idCv: 1 }), candidatura({ id: 2, idCv: 2 }), candidatura({ id: 3, idCv: null })];
    expect(tassoPerCv(c, nessunoStorico, cv).map((x) => [x.etichetta, x.n])).toEqual([['Generale', 1], ['Java', 1], ['Altre', 1]]);
  });
});

describe('costanza', () => {
  it('include i giorni senza invii e ha un elemento per giorno', () => {
    const g = invioPerGiorno([candidatura({ dataCandidatura: '2026-10-31' }), candidatura({ dataCandidatura: '2026-10-31' }), candidatura({ dataCandidatura: '2026-11-02' })], '2026-10-30', '2026-11-03');
    expect(g.map((x) => x.n)).toEqual([0, 2, 0, 1, 0]);
  });

  it('un intervallo di un solo giorno funziona e uno invertito è vuoto', () => {
    expect(invioPerGiorno([], '2026-11-03', '2026-11-03')).toHaveLength(1);
    expect(invioPerGiorno([], '2026-11-04', '2026-11-03')).toEqual([]);
  });
});

describe('messaggi con pochi dati', () => {
  it('spiega quanti invii servono', () => {
    expect(messaggioPochiDati(10, 4, 'il percorso')).toBe('Per vedere il percorso servono almeno 10 invii. Finora ne hai 4: ne mancano 6.');
    expect(messaggioPochiDati(10, 9, 'il percorso')).toContain('ne manca 1');
  });

  it('non compare quando i dati bastano', () => {
    expect(messaggioPochiDati(10, 10, 'x')).toBeNull();
  });
});


describe('tasso di arrivo al colloquio', () => {
  it('non c’è senza invii', () => expect(tassoColloquio(calcolaPercorsoAggregato([], nessunoStorico))).toBeNull());

  it('è la quota delle inviate arrivate al colloquio', () => {
    const p = { totale: 4, raggiunte: [4, 1, 0, 0, 0, 0], collegamenti: [], conversioni: [] };
    expect(tassoColloquio(p)).toBe(0.25);
  });
});
