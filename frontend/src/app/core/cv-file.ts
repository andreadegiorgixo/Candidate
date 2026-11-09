/** Regole sui file dei CV: le stesse del backend (PDF, DOC, DOCX, al massimo 5 MB). */

export const CV_MAX_BYTES = 5 * 1024 * 1024;

const TIPI_PER_ESTENSIONE: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Valore dell'attributo `accept` del campo file. */
export const CV_ACCEPT = ['.pdf', '.doc', '.docx', ...Object.values(TIPI_PER_ESTENSIONE)].join(',');

export function estensioneFile(nome: string): string {
  const punto = nome.lastIndexOf('.');
  return punto < 0 ? '' : nome.slice(punto + 1).toLowerCase();
}

const fmtNumero = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

/** «812 byte», «240 KB», «1,2 MB» */
export function dimensioneLeggibile(byte: number): string {
  if (byte < 1024) return `${byte} byte`;
  if (byte < 1024 * 1024) return `${fmtNumero.format(byte / 1024)} KB`;
  return `${fmtNumero.format(byte / (1024 * 1024))} MB`;
}

/** Messaggio per l'utente se il file non va bene, altrimenti `null`. */
export function erroreFileCv(f: Pick<File, 'name' | 'size'>): string | null {
  if (!(estensioneFile(f.name) in TIPI_PER_ESTENSIONE)) return 'Questo formato non è ammesso. Scegli un file PDF, DOC o DOCX.';
  if (f.size === 0) return 'Il file è vuoto. Scegline un altro.';
  if (f.size > CV_MAX_BYTES) return `Il file pesa ${dimensioneLeggibile(f.size)}: il massimo è 5 MB.`;
  return null;
}

/**
 * Il sistema operativo non sempre indica il tipo dei file Word: lo si ricava dall'estensione,
 * perché il backend controlla che estensione e tipo corrispondano.
 */
export function conTipoCv(file: File): File {
  const tipo = TIPI_PER_ESTENSIONE[estensioneFile(file.name)];
  return tipo && file.type !== tipo ? new File([file], file.name, { type: tipo, lastModified: file.lastModified }) : file;
}
