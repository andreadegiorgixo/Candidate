/** Lettura tipizzata del valore di un campo da un evento DOM, senza ricorrere ad `any` nei template. */
export function testoDa(e: Event): string {
  return (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
}

export function spuntatoDa(e: Event): boolean {
  return (e.target as HTMLInputElement).checked;
}
