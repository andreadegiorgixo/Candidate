import { Candidatura, StatoCandidatura } from '../../core/api/models';
import { normalizzaAzienda } from '../../core/azienda';
import { INFO_STATO, FONTE_ETICHETTA, MODALITA_ETICHETTA, etichettaStato } from '../../core/stati';

export type Colonna = 'azienda' | 'stato' | 'modalita' | 'citta' | 'invio' | 'azione';
export type Direzione = 'asc' | 'desc';
export type Vista = 'elenco' | 'bacheca';
export type FiltroStato = '' | StatoCandidatura | 'IN_CORSO' | 'USCITE';

export interface Filtri {
  q: string;
  stato: FiltroStato;
  fermata: number | null;
  modalita: string;
  citta: number | null;
  fonte: string;
  tipo: '' | 'spontanea' | 'annuncio';
}

export interface Ordine {
  colonna: Colonna;
  direzione: Direzione;
}

export interface StatoPagina {
  filtri: Filtri;
  ordine: Ordine;
  vista: Vista;
}

export const FILTRI_VUOTI: Filtri = { q: '', stato: '', fermata: null, modalita: '', citta: null, fonte: '', tipo: '' };
export const ORDINE_PREDEFINITO: Ordine = { colonna: 'invio', direzione: 'desc' };

const COLONNE: readonly Colonna[] = ['azienda', 'stato', 'modalita', 'citta', 'invio', 'azione'];

/** Legge lo stato della pagina dall'URL: i filtri vivono nei parametri della query. */
export function statoDaParams(get: (chiave: string) => string | null): StatoPagina {
  const num = (k: string): number | null => {
    const v = get(k);
    return v !== null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;
  };
  const col = get('ord') as Colonna | null;
  const dir = get('dir');
  const tipo = get('tipo');
  const fermata = num('fermata');
  return {
    filtri: {
      q: get('q') ?? '',
      stato: (get('stato') ?? '') as FiltroStato,
      fermata: fermata !== null && fermata >= 0 && fermata <= 5 ? fermata : null,
      modalita: get('modalita') ?? '',
      citta: num('citta'),
      fonte: get('fonte') ?? '',
      tipo: tipo === 'spontanea' || tipo === 'annuncio' ? tipo : '',
    },
    ordine: {
      colonna: col && COLONNE.includes(col) ? col : ORDINE_PREDEFINITO.colonna,
      direzione: dir === 'asc' || dir === 'desc' ? dir : ORDINE_PREDEFINITO.direzione,
    },
    vista: get('vista') === 'bacheca' ? 'bacheca' : 'elenco',
  };
}

/** Parametri da scrivere nell'URL; `null` toglie il parametro. */
export function paramsDaStato(s: StatoPagina): Record<string, string | null> {
  const { filtri: f, ordine: o, vista } = s;
  const predefinito = o.colonna === ORDINE_PREDEFINITO.colonna && o.direzione === ORDINE_PREDEFINITO.direzione;
  return {
    q: f.q.trim() || null,
    stato: f.stato || null,
    fermata: f.fermata === null ? null : String(f.fermata),
    modalita: f.modalita || null,
    citta: f.citta === null ? null : String(f.citta),
    fonte: f.fonte || null,
    tipo: f.tipo || null,
    ord: predefinito ? null : o.colonna,
    dir: predefinito ? null : o.direzione,
    vista: vista === 'bacheca' ? 'bacheca' : null,
  };
}

export function contaFiltriAttivi(f: Filtri): number {
  return [f.q.trim(), f.stato, f.fermata, f.modalita, f.citta, f.fonte, f.tipo].filter((v) => v !== '' && v !== null).length;
}

export function applicaFiltri(candidature: readonly Candidatura[], f: Filtri): Candidatura[] {
  const q = normalizzaAzienda(f.q);
  return candidature.filter((c) => {
    const info = INFO_STATO[c.statoCandidatura];
    if (q) {
      const testo = normalizzaAzienda(`${c.nomeAzienda} ${c.posizioneLavorativa} ${c.citta.nomeCitta} ${c.note ?? ''}`);
      if (!testo.includes(q)) return false;
    }
    if (f.stato === 'IN_CORSO' && info.tipo !== 'in-corso') return false;
    if (f.stato === 'USCITE' && info.tipo !== 'uscita') return false;
    if (f.stato && f.stato !== 'IN_CORSO' && f.stato !== 'USCITE' && c.statoCandidatura !== f.stato) return false;
    if (f.fermata !== null && (info.fermata !== f.fermata || info.tipo === 'uscita')) return false;
    if (f.modalita && c.modalita !== f.modalita) return false;
    if (f.citta !== null && c.citta.id !== f.citta) return false;
    if (f.fonte && c.fonte !== f.fonte) return false;
    if (f.tipo === 'spontanea' && !c.spontanea) return false;
    if (f.tipo === 'annuncio' && c.spontanea) return false;
    return true;
  });
}

function confronta(a: Candidatura, b: Candidatura, col: Colonna): number {
  switch (col) {
    case 'azienda':
      return a.nomeAzienda.localeCompare(b.nomeAzienda, 'it', { sensitivity: 'base' });
    case 'stato': {
      const fa = INFO_STATO[a.statoCandidatura].fermata ?? -1;
      const fb = INFO_STATO[b.statoCandidatura].fermata ?? -1;
      return fa - fb || etichettaStato(a.statoCandidatura).localeCompare(etichettaStato(b.statoCandidatura), 'it');
    }
    case 'modalita':
      return MODALITA_ETICHETTA[a.modalita].localeCompare(MODALITA_ETICHETTA[b.modalita], 'it');
    case 'citta':
      return a.citta.nomeCitta.localeCompare(b.citta.nomeCitta, 'it');
    case 'invio':
      return a.dataCandidatura.localeCompare(b.dataCandidatura);
    case 'azione':
      return (a.prossimaAzioneData ?? '').localeCompare(b.prossimaAzioneData ?? '');
  }
}

/** Ordina senza modificare l'elenco. Le prossime azioni mancanti vanno sempre in fondo. */
export function ordina(candidature: readonly Candidatura[], o: Ordine): Candidatura[] {
  const segno = o.direzione === 'asc' ? 1 : -1;
  return [...candidature].sort((a, b) => {
    if (o.colonna === 'azione') {
      if (!a.prossimaAzioneData && !b.prossimaAzioneData) return 0;
      if (!a.prossimaAzioneData) return 1;
      if (!b.prossimaAzioneData) return -1;
    }
    return confronta(a, b, o.colonna) * segno || b.id - a.id;
  });
}

function cella(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV per Excel italiano: separatore `;`, accenti preservati dal BOM. */
export function generaCsv(candidature: readonly Candidatura[]): string {
  const intestazione = ['Azienda', 'Ruolo', 'Stato', 'Modalità', 'Città', 'Fonte', 'Spontanea', 'Data di invio', 'Prossima azione', 'Entro il', 'Annuncio o messaggio', 'Note'];
  const righe = candidature.map((c) =>
    [
      c.nomeAzienda,
      c.posizioneLavorativa,
      etichettaStato(c.statoCandidatura),
      MODALITA_ETICHETTA[c.modalita],
      c.citta.nomeCitta,
      FONTE_ETICHETTA[c.fonte],
      c.spontanea ? 'Sì' : 'No',
      c.dataCandidatura,
      c.prossimaAzioneTesto,
      c.prossimaAzioneData,
      c.jobOffert,
      c.note,
    ]
      .map(cella)
      .join(';'),
  );
  return '﻿' + [intestazione.map(cella).join(';'), ...righe].join('\r\n');
}
