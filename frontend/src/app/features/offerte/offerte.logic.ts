import { Offerta } from '../../core/api/models';

export type RigaConfronto = 'ral' | 'variabile' | 'giorniRemoto' | 'ferie' | 'scadenza' | 'voto';

/** Quale direzione è «meglio» per ogni riga: più alto, tranne la scadenza dove più tardi lascia più tempo. */
const RIGHE: readonly RigaConfronto[] = ['ral', 'variabile', 'giorniRemoto', 'ferie', 'scadenza', 'voto'];

function valore(o: Offerta, riga: RigaConfronto): number | string | null {
  return o[riga];
}

/**
 * Per ogni riga, gli id delle offerte con il valore migliore. Non dichiara un vincitore:
 * se c'è una sola offerta o tutte hanno lo stesso valore non evidenzia niente.
 */
export function migliori(offerte: readonly Offerta[]): Record<RigaConfronto, ReadonlySet<number>> {
  const r = {} as Record<RigaConfronto, ReadonlySet<number>>;
  for (const riga of RIGHE) {
    const con = offerte.filter((o) => valore(o, riga) !== null);
    const valori = new Set(con.map((o) => valore(o, riga)));
    if (con.length < 2 || valori.size < 2) {
      r[riga] = new Set();
      continue;
    }
    const migliore = [...valori].reduce((a, b) => (a! >= b! ? a : b));
    r[riga] = new Set(con.filter((o) => valore(o, riga) === migliore).map((o) => o.id));
  }
  return r;
}

export function euro(n: number | null): string {
  return n === null ? '' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
