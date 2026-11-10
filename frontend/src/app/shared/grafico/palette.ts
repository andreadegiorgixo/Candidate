/** Colori dei grafici (brief, sezione 8). I testi non usano mai il colore della serie. */
export const CATEGORIE = ['#16845A', '#2F6FD0', '#C77700', '#7C4DBC', '#C2455A', '#0E8F86'] as const;
export const SCALA_FERMATE = ['#A7E8C9', '#38B982', '#16845A', '#073B28'] as const;
export const COLORE_ALTRE = '#9AA79F';

export const TESTO = '#142B20';
export const TESTO_2 = '#5F6E66';
export const GRIGLIA = '#EDF2EE';
export const SFONDO = '#FFFFFF';

/** Colori di stato per le uscite (fondo, testo). */
export const USCITE = {
  rifiutata: { fondo: '#FDECEA', bordo: '#B42318' },
  senzaRisposta: { fondo: '#EEF2EF', bordo: '#9AA79F' },
  proposta: { fondo: '#F0E9FD', bordo: '#5B2E9E' },
} as const;

export const FONT = "'Inter Variable', system-ui, sans-serif";
