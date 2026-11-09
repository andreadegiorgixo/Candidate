/** Fa scaricare al browser un file costruito in memoria. */
export function scaricaFile(contenuto: Blob, nomeFile: string): void {
  const url = URL.createObjectURL(contenuto);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFile;
  a.click();
  // Il click avvia il download in modo asincrono: l'indirizzo si libera subito dopo.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
