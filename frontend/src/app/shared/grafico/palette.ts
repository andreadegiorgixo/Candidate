/** Colori dei grafici (brief, sezione 8). I testi non usano mai il colore della serie. */
export const CATEGORIE = ['#3F7D20', '#2F6FD0', '#C77700', '#7C4DBC', '#C2455A', '#008F85'] as const;
export const SCALA_FERMATE = ['#8CBF45', '#5E9A2E', '#3F7D20', '#173814'] as const;
export const COLORE_ALTRE = '#9AA08F';

export const TESTO = '#092D0B';
export const TESTO_2 = '#565E50';
export const GRIGLIA = '#EBEBDD';
export const SFONDO = '#FFFFFF';

/** Colori di stato per le uscite (fondo, testo). */
export const USCITE = {
  rifiutata: { fondo: '#FBE4E1', bordo: '#B3261E' },
  senzaRisposta: { fondo: '#EBEBDD', bordo: '#8B917F' },
  proposta: { fondo: '#DCC2FF', bordo: '#5B2E9E' },
} as const;

export const FONT = "'Mona Sans Variable', system-ui, sans-serif";
