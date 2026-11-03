import { candidatura, MILANO } from '../../core/testing/fabbriche';
import {
  applicaFiltri,
  contaFiltriAttivi,
  FILTRI_VUOTI,
  generaCsv,
  ordina,
  paramsDaStato,
  statoDaParams,
} from './candidature.logic';

const elenco = [
  candidatura({ id: 1, nomeAzienda: 'Brera Labs', modalita: 'IBRIDO', statoCandidatura: 'FASE_DI_COLLOQUIO_TECNICO_1', dataCandidatura: '2026-10-10', fonte: 'RECRUITER' }),
  candidatura({ id: 2, nomeAzienda: 'Altavia', modalita: 'REMOTO', statoCandidatura: 'IN_FASE_DI_ATTESA', dataCandidatura: '2026-10-20', spontanea: true, citta: { ...MILANO, id: 2, nomeCitta: 'Torino' } }),
  candidatura({ id: 3, nomeAzienda: 'Zattera', modalita: 'REMOTO', statoCandidatura: 'GHOSTING_O_SENZA_RISPOSTA', dataCandidatura: '2026-05-01', note: 'Stack con àncora' }),
  candidatura({ id: 4, nomeAzienda: 'Lanterna', statoCandidatura: 'PROPOSTA_LAVORATIVA_RICEVUTA', dataCandidatura: '2026-09-01', prossimaAzioneTesto: 'Rispondere', prossimaAzioneData: '2026-11-04' }),
];

describe('filtri delle candidature', () => {
  it('senza filtri restituisce tutto e conta zero filtri attivi', () => {
    expect(applicaFiltri(elenco, FILTRI_VUOTI)).toHaveLength(4);
    expect(contaFiltriAttivi(FILTRI_VUOTI)).toBe(0);
  });

  it('con un elenco vuoto non si rompe', () => {
    expect(applicaFiltri([], { ...FILTRI_VUOTI, q: 'x' })).toEqual([]);
    expect(ordina([], { colonna: 'azienda', direzione: 'asc' })).toEqual([]);
  });

  it('la ricerca ignora maiuscole e accenti e guarda anche le note e la città', () => {
    expect(applicaFiltri(elenco, { ...FILTRI_VUOTI, q: 'BRERA' }).map((c) => c.id)).toEqual([1]);
    expect(applicaFiltri(elenco, { ...FILTRI_VUOTI, q: 'ancora' }).map((c) => c.id)).toEqual([3]);
    expect(applicaFiltri(elenco, { ...FILTRI_VUOTI, q: 'torino' }).map((c) => c.id)).toEqual([2]);
  });

  it('filtra per gruppo di stato e per stato singolo', () => {
    expect(applicaFiltri(elenco, { ...FILTRI_VUOTI, stato: 'IN_CORSO' }).map((c) => c.id)).toEqual([1, 2, 4]);
    expect(applicaFiltri(elenco, { ...FILTRI_VUOTI, stato: 'USCITE' }).map((c) => c.id)).toEqual([3]);
    expect(applicaFiltri(elenco, { ...FILTRI_VUOTI, stato: 'IN_FASE_DI_ATTESA' }).map((c) => c.id)).toEqual([2]);
  });

  it('la fermata esclude le uscite e raccoglie le tre varianti di proposta', () => {
    expect(applicaFiltri(elenco, { ...FILTRI_VUOTI, fermata: 4 }).map((c) => c.id)).toEqual([4]);
    expect(applicaFiltri(elenco, { ...FILTRI_VUOTI, fermata: 0 }).map((c) => c.id)).toEqual([2]);
  });

  it('combina più filtri', () => {
    const f = { ...FILTRI_VUOTI, modalita: 'REMOTO', tipo: 'annuncio' as const };
    expect(applicaFiltri(elenco, f).map((c) => c.id)).toEqual([3, 4]);
    expect(applicaFiltri(elenco, { ...FILTRI_VUOTI, tipo: 'spontanea' }).map((c) => c.id)).toEqual([2]);
    expect(applicaFiltri(elenco, { ...FILTRI_VUOTI, fonte: 'RECRUITER' }).map((c) => c.id)).toEqual([1]);
    expect(applicaFiltri(elenco, { ...FILTRI_VUOTI, citta: 2 }).map((c) => c.id)).toEqual([2]);
  });
});

describe('ordinamento', () => {
  it('ordina per azienda ignorando le maiuscole', () => {
    expect(ordina(elenco, { colonna: 'azienda', direzione: 'asc' }).map((c) => c.nomeAzienda)).toEqual(['Altavia', 'Brera Labs', 'Lanterna', 'Zattera']);
  });

  it('ordina per data di invio, in entrambe le direzioni', () => {
    expect(ordina(elenco, { colonna: 'invio', direzione: 'desc' }).map((c) => c.id)).toEqual([2, 1, 4, 3]);
    expect(ordina(elenco, { colonna: 'invio', direzione: 'asc' }).map((c) => c.id)).toEqual([3, 4, 1, 2]);
  });

  it('ordina per stato secondo la fermata', () => {
    expect(ordina(elenco, { colonna: 'stato', direzione: 'asc' }).map((c) => c.id)).toEqual([3, 2, 1, 4]);
  });

  it('mette sempre in fondo le candidature senza prossima azione', () => {
    expect(ordina(elenco, { colonna: 'azione', direzione: 'asc' })[0].id).toBe(4);
    expect(ordina(elenco, { colonna: 'azione', direzione: 'desc' })[0].id).toBe(4);
  });

  it('non modifica l’elenco originale', () => {
    const copia = [...elenco];
    ordina(elenco, { colonna: 'azienda', direzione: 'desc' });
    expect(elenco).toEqual(copia);
  });
});

describe('filtri nell’URL', () => {
  const da = (o: Record<string, string>) => statoDaParams((k) => o[k] ?? null);

  it('con URL vuoto restituisce i predefiniti', () => {
    const s = da({});
    expect(s.filtri).toEqual(FILTRI_VUOTI);
    expect(s.ordine).toEqual({ colonna: 'invio', direzione: 'desc' });
    expect(s.vista).toBe('elenco');
  });

  it('legge e riscrive i parametri senza perdere nulla', () => {
    const s = da({ q: 'nord', stato: 'IN_CORSO', fermata: '2', modalita: 'REMOTO', citta: '3', fonte: 'LINKEDIN', tipo: 'spontanea', ord: 'azienda', dir: 'asc', vista: 'bacheca' });
    expect(s.filtri.fermata).toBe(2);
    expect(s.filtri.citta).toBe(3);
    expect(s.vista).toBe('bacheca');
    const p = paramsDaStato(s);
    expect(p).toMatchObject({ q: 'nord', stato: 'IN_CORSO', fermata: '2', citta: '3', ord: 'azienda', dir: 'asc', vista: 'bacheca' });
  });

  it('ignora valori non validi', () => {
    const s = da({ fermata: '9', ord: 'inventata', dir: 'su', tipo: 'boh', citta: 'abc' });
    expect(s.filtri.fermata).toBeNull();
    expect(s.filtri.citta).toBeNull();
    expect(s.filtri.tipo).toBe('');
    expect(s.ordine).toEqual({ colonna: 'invio', direzione: 'desc' });
  });

  it('toglie dall’URL ciò che è predefinito', () => {
    const p = paramsDaStato(da({}));
    expect(Object.values(p).every((v) => v === null)).toBe(true);
  });
});

describe('esportazione CSV', () => {
  it('scrive intestazione e righe con separatore punto e virgola e BOM', () => {
    const csv = generaCsv(elenco.slice(0, 1));
    const [testa, riga] = csv.replace('﻿', '').split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(testa.split(';')).toHaveLength(12);
    expect(riga).toContain('Brera Labs;Java Developer;Tecnico 1;Ibrido;Milano;Recruiter;No;2026-10-10');
  });

  it('protegge punti e virgola, virgolette e a capo nei testi', () => {
    const c = candidatura({ note: 'Riga uno; "citata"\nriga due' });
    expect(generaCsv([c])).toContain('"Riga uno; ""citata""\nriga due"');
  });

  it('con nessuna candidatura produce solo l’intestazione', () => {
    expect(generaCsv([]).split('\r\n')).toHaveLength(1);
  });
});
