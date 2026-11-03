import { AZIONI, cercaGlobale } from './ricerca';
import { candidatura } from './testing/fabbriche';

const cand = [
  candidatura({ id: 1, nomeAzienda: 'Nordvento', posizioneLavorativa: 'Java Developer', dataCandidatura: '2026-10-01' }),
  candidatura({ id: 2, nomeAzienda: 'nordvento ', posizioneLavorativa: 'Backend Developer', dataCandidatura: '2026-10-05' }),
  candidatura({ id: 3, nomeAzienda: 'Altavia', posizioneLavorativa: 'Java Developer', dataCandidatura: '2026-09-01' }),
];
const contatti = [{ id: 1, nomeAzienda: 'Altavia', nome: 'Giulia Ferri', ruolo: 'Talent acquisition', email: '', linkedin: '', note: '' }];

describe('ricerca globale', () => {
  it('con il campo vuoto propone tutte le azioni e nient’altro', () => {
    const r = cercaGlobale('', cand, contatti);
    expect(r).toHaveLength(AZIONI.length);
    expect(r.every((x) => x.tipo === 'azione')).toBe(true);
  });

  it('senza dati e con un testo che non corrisponde a nulla non restituisce niente', () => {
    expect(cercaGlobale('zzzz', [], [])).toEqual([]);
    expect(cercaGlobale('zzzz', cand, contatti)).toEqual([]);
  });

  it('raggruppa le aziende scritte in modi diversi e dice quante candidature hanno', () => {
    const r = cercaGlobale('nord', cand, contatti).filter((x) => x.tipo === 'azienda');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ titolo: 'Nordvento', dettaglio: '2 candidature', percorso: ['/aziende', 'nordvento'] });
  });

  it('trova i ruoli e apre la candidatura, dalla più recente', () => {
    const r = cercaGlobale('java', cand, contatti).filter((x) => x.tipo === 'ruolo');
    expect(r.map((x) => x.percorso)).toEqual([['/candidature', '1'], ['/candidature', '3']]);
  });

  it('trova i contatti per nome o per ruolo e porta all’azienda', () => {
    expect(cercaGlobale('giulia', cand, contatti).find((x) => x.tipo === 'contatto')).toMatchObject({ titolo: 'Giulia Ferri', percorso: ['/aziende', 'altavia'] });
    expect(cercaGlobale('talent', cand, contatti).some((x) => x.tipo === 'contatto')).toBe(true);
  });

  it('ignora maiuscole e accenti', () => {
    expect(cercaGlobale('ALTÀVIA', cand, contatti).some((x) => x.tipo === 'azienda')).toBe(true);
    expect(cercaGlobale('ALTAVIA', cand, contatti).some((x) => x.tipo === 'azienda')).toBe(true);
  });

  it('porta alle azioni principali con parole chiave', () => {
    expect(cercaGlobale('nuova', [], [])[0]).toMatchObject({ comando: 'nuova-candidatura' });
    expect(cercaGlobale('cv', [], [])[0]).toMatchObject({ percorso: ['/materiali'] });
  });

  it('limita i risultati per gruppo', () => {
    const molte = Array.from({ length: 20 }, (_, i) => candidatura({ id: 100 + i, nomeAzienda: `Alfa ${i}`, posizioneLavorativa: 'Dev' }));
    expect(cercaGlobale('alfa', molte, []).filter((x) => x.tipo === 'azienda')).toHaveLength(5);
  });
});
