import { offerta } from '../../core/testing/fabbriche';
import { euro, migliori } from './offerte.logic';

describe('confronto delle offerte', () => {
  it('senza offerte o con una sola non evidenzia nulla', () => {
    expect(migliori([]).ral.size).toBe(0);
    expect(migliori([offerta({ id: 1, ral: 40000 })]).ral.size).toBe(0);
  });

  it('evidenzia il valore più alto di ogni riga, riga per riga', () => {
    const a = offerta({ id: 1, ral: 42000, variabile: 3000, giorniRemoto: 2, ferie: 26, voto: 4 });
    const b = offerta({ id: 2, ral: 38000, variabile: null, giorniRemoto: 5, ferie: 28, voto: 3 });
    const m = migliori([a, b]);
    expect([...m.ral]).toEqual([1]);
    expect([...m.giorniRemoto]).toEqual([2]);
    expect([...m.ferie]).toEqual([2]);
    expect([...m.voto]).toEqual([1]);
  });

  it('ignora i valori mancanti e non evidenzia se resta una sola offerta con quel dato', () => {
    const m = migliori([offerta({ id: 1, variabile: 3000 }), offerta({ id: 2, variabile: null })]);
    expect(m.variabile.size).toBe(0);
  });

  it('non evidenzia quando i valori sono tutti uguali, ma evidenzia i pari merito se c’è un peggiore', () => {
    expect(migliori([offerta({ id: 1, ral: 40000 }), offerta({ id: 2, ral: 40000 })]).ral.size).toBe(0);
    const m = migliori([offerta({ id: 1, ral: 40000 }), offerta({ id: 2, ral: 40000 }), offerta({ id: 3, ral: 30000 })]);
    expect([...m.ral].sort()).toEqual([1, 2]);
  });

  it('per la scadenza il migliore è la data più lontana', () => {
    const m = migliori([offerta({ id: 1, scadenza: '2026-11-06' }), offerta({ id: 2, scadenza: '2026-11-15' })]);
    expect([...m.scadenza]).toEqual([2]);
  });

  it('formatta gli importi in euro all’italiana', () => {
    expect(euro(42000).replace(/\s/g, ' ')).toBe('42.000 €');
    expect(euro(null)).toBe('');
  });
});
