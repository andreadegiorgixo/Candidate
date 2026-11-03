/** Chiave di raggruppamento delle aziende: ignora maiuscole, accenti e spazi in eccesso. */
export function normalizzaAzienda(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
