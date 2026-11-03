import { candidatura, colloquio } from '../../core/testing/fabbriche';
import { avanzamentoChecklist, filtraDomande, raccogliDomande, suddividiColloqui } from './colloqui.logic';

describe('suddivisione dei colloqui', () => {
  const colloqui = [
    colloquio({ id: 1, dataOra: '2026-11-09T15:00' }),
    colloquio({ id: 2, dataOra: '2026-11-04T10:30' }),
    colloquio({ id: 3, dataOra: '2026-11-02T10:00', voto: 4 }),
    colloquio({ id: 4, dataOra: '2026-10-20T10:00' }),
    colloquio({ id: 5, dataOra: '2026-11-03T12:00' }), // proprio adesso
  ];

  it('mette in programma i futuri, anche quello di questo istante, dal più vicino', () => {
    expect(suddividiColloqui(colloqui, '2026-11-03T12:00').inProgramma.map((c) => c.id)).toEqual([5, 2, 1]);
  });

  it('mette tra i conclusi i passati, dal più recente, e segnala quelli senza resoconto', () => {
    const s = suddividiColloqui(colloqui, '2026-11-03T12:00');
    expect(s.conclusi.map((c) => c.id)).toEqual([3, 4]);
    expect(s.senzaResoconto.map((c) => c.id)).toEqual([4]);
  });

  it('senza colloqui restituisce tutto vuoto', () => {
    expect(suddividiColloqui([], '2026-11-03T12:00')).toEqual({ inProgramma: [], conclusi: [], senzaResoconto: [] });
  });

  it('conta l’avanzamento della checklist, anche se è vuota', () => {
    expect(avanzamentoChecklist(colloquio({ checklist: [{ testo: 'a', fatto: true }, { testo: 'b', fatto: false }] }))).toEqual({ fatte: 1, totale: 2 });
    expect(avanzamentoChecklist(colloquio())).toEqual({ fatte: 0, totale: 0 });
  });
});

describe('archivio delle domande', () => {
  const cand = [candidatura({ id: 1, nomeAzienda: 'Altavia' }), candidatura({ id: 2, nomeAzienda: 'Brera Labs' })];
  const colloqui = [
    colloquio({ id: 1, idCandidatura: 1, tipo: 'TECNICO_1', dataOra: '2026-10-01T10:00', domande: ['Come gestisci le transazioni in Spring?', 'Perché vuoi cambiare?'] }),
    colloquio({ id: 2, idCandidatura: 2, tipo: 'TECNICO_2', dataOra: '2026-10-10T10:00', domande: ['come gestisci le TRANSAZIONI in spring', 'Parlami di un bug'] }),
    colloquio({ id: 3, idCandidatura: 2, tipo: 'CONOSCITIVO', dataOra: '2026-10-20T10:00', domande: ['Perché vuoi cambiare?', 'Perché vuoi cambiare?', '  '] }),
  ];

  it('raggruppa le domande uguali ignorando maiuscole e punteggiatura finale', () => {
    const d = raccogliDomande(colloqui, cand);
    const transazioni = d.find((x) => x.testo.startsWith('Come gestisci'))!;
    expect(transazioni.volte).toBe(2);
    expect(transazioni.aziende).toEqual(['Altavia', 'Brera Labs']);
    expect(transazioni.tipi).toEqual(['TECNICO_1', 'TECNICO_2']);
  });

  it('non conta due volte la stessa domanda nello stesso colloquio e salta quelle vuote', () => {
    const d = raccogliDomande(colloqui, cand);
    expect(d.find((x) => x.testo === 'Perché vuoi cambiare?')?.volte).toBe(2);
    expect(d.some((x) => x.testo.trim() === '')).toBe(false);
  });

  it('mette per prime le domande che tornano più spesso', () => {
    const d = raccogliDomande(colloqui, cand);
    expect(d[0].volte).toBeGreaterThanOrEqual(d[1].volte);
    expect(d[d.length - 1].testo).toBe('Parlami di un bug');
  });

  it('senza colloqui l’archivio è vuoto', () => {
    expect(raccogliDomande([], cand)).toEqual([]);
  });

  it('si può cercare e filtrare per tipo di colloquio', () => {
    const d = raccogliDomande(colloqui, cand);
    expect(filtraDomande(d, 'BUG', '').map((x) => x.testo)).toEqual(['Parlami di un bug']);
    expect(filtraDomande(d, '', 'CONOSCITIVO').map((x) => x.testo)).toEqual(['Perché vuoi cambiare?']);
    expect(filtraDomande(d, 'xyz', '')).toEqual([]);
  });
});
