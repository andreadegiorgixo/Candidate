export interface ValoriModello {
  azienda: string;
  ruolo: string;
  contatto?: string | null;
}

/** Sostituisce i segnaposto `{azienda}`, `{ruolo}` e `{contatto}`. Quelli sconosciuti restano com'erano. */
export function compilaModello(testo: string, v: ValoriModello): string {
  const mappa: Record<string, string> = {
    azienda: v.azienda,
    ruolo: v.ruolo,
    contatto: v.contatto?.trim() || 'team di selezione',
  };
  return testo.replace(/\{(\w+)\}/g, (intero, nome: string) => mappa[nome] ?? intero);
}

export const SEGNAPOSTO = ['{azienda}', '{ruolo}', '{contatto}'] as const;
