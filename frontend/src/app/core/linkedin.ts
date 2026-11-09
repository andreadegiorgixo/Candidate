/** Il link al profilo LinkedIn: vuoto oppure http(s) di linkedin.com (anche www. e sottodomini come it.linkedin.com). */
export const LINKEDIN_PATTERN = /^\s*(https?:\/\/([a-z0-9-]+\.)*linkedin\.com([/?#]\S*)?)?\s*$/i;

export const LINKEDIN_MESSAGGIO = 'Scrivi un indirizzo LinkedIn valido, per esempio https://www.linkedin.com/in/nome-cognome.';

export function linkedinValido(valore: string): boolean {
  return valore.length <= 255 && LINKEDIN_PATTERN.test(valore);
}
