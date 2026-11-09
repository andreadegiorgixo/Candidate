import { candidatura } from '../../core/testing/fabbriche';
import { inizioCalendario, inviateNegliUltimi, invioPerGiorno, invioPerSettimana, messaggioPochiDati } from './ritmo.logic';

describe('inviate negli ultimi giorni', () => {
  it('include il primo giorno del periodo ed esclude quelli prima', () => {
    const c = [candidatura({ dataCandidatura: '2026-08-04' }), candidatura({ dataCandidatura: '2026-08-05' }), candidatura({ dataCandidatura: '2026-11-03' })];
    expect(inviateNegliUltimi(c, '2026-11-03', 90).map((x) => x.dataCandidatura)).toEqual(['2026-08-05', '2026-11-03']);
  });
});

describe('ritmo settimanale', () => {
  it('senza candidature non c’è nulla da mostrare', () => {
    expect(invioPerSettimana([], '2026-11-03', 90)).toEqual([]);
  });

  it('include le settimane vuote e conta da lunedì', () => {
    const c = [candidatura({ dataCandidatura: '2026-10-12' }), candidatura({ dataCandidatura: '2026-10-18' }), candidatura({ dataCandidatura: '2026-11-03' })];
    const s = invioPerSettimana(c, '2026-11-03', 30);
    // 30 giorni indietro è il 4 ottobre, una domenica: la prima settimana parte dal lunedì prima.
    expect(s.map((x) => x.inizio)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']);
    expect(s.map((x) => x.n)).toEqual([0, 0, 2, 0, 0, 1]);
  });

  it('una settimana a cavallo del mese resta una sola settimana', () => {
    const c = [candidatura({ dataCandidatura: '2026-10-30' }), candidatura({ dataCandidatura: '2026-11-02' })];
    const s = invioPerSettimana(c, '2026-11-03', 30);
    expect(s.find((x) => x.inizio === '2026-10-26')?.n).toBe(1);
    expect(s.find((x) => x.inizio === '2026-11-02')?.n).toBe(1);
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

  it('il calendario copre esattamente le settimane richieste, oggi compreso', () => {
    const da = inizioCalendario('2026-11-03', 2);
    expect(da).toBe('2026-10-21');
    expect(invioPerGiorno([], da, '2026-11-03')).toHaveLength(14);
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
