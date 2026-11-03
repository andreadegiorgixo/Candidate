/** Contrasto WCAG 2.x tra due colori esadecimali. */
function luminanza(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrasto(a: string, b: string): number {
  const [x, y] = [luminanza(a), luminanza(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const BOSCO = '#092D0B';
const LIME = '#CBF949';
const AVORIO = '#F9F9EF';
const BIANCO = '#FFFFFF';
const SABBIA = '#EBEBDD';
const TESTO_2 = '#565E50';
const VERDE_TESTO = '#3F6F20';

describe('contrasto dei colori (WCAG AA)', () => {
  const testoNormale: [string, string, string][] = [
    ['testo su avorio', BOSCO, AVORIO],
    ['testo su bianco', BOSCO, BIANCO],
    ['testo secondario su avorio', TESTO_2, AVORIO],
    ['testo secondario su bianco', TESTO_2, BIANCO],
    ['testo secondario su sabbia', TESTO_2, SABBIA],
    ['link su avorio', VERDE_TESTO, AVORIO],
    ['link su bianco', VERDE_TESTO, BIANCO],
    ['pulsante primario: lime su bosco', LIME, BOSCO],
    ['voce attiva: bosco su lime', BOSCO, LIME],
    ['barra laterale: testo chiaro su bosco', '#E7EEDD', BOSCO],
    ['barra laterale: testo secondario su bosco', '#CFDCC1', BOSCO],
    ['linea in grande: testo su bosco', '#DDE8D0', BOSCO],
    // Etichette di stato (fondo, testo) dal brief
    ['etichetta In attesa', '#8A3B12', '#FFE3B6'],
    ['etichetta Colloqui', '#1F4E9E', '#C2DAFF'],
    ['etichetta Proposta', '#5B2E9E', '#DCC2FF'],
    ['etichetta Assunzione', '#092D0B', '#CBF949'],
    ['etichetta Rifiutata o ritirata', '#B3261E', '#FBE4E1'],
    ['etichetta Senza risposta', '#565E50', '#EBEBDD'],
    ['errori su bianco', '#B3261E', BIANCO],
    ['errori su avorio', '#B3261E', AVORIO],
  ];

  for (const [nome, testo, fondo] of testoNormale) {
    it(`${nome} ha almeno 4,5:1`, () => {
      expect(contrasto(testo, fondo)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('il lime su sfondo chiaro non basta, ed è per questo che non si usa come testo', () => {
    expect(contrasto(LIME, AVORIO)).toBeLessThan(1.3);
    expect(contrasto(LIME, BIANCO)).toBeLessThan(1.3);
  });

  it('gli elementi grafici (focus, bordi dei campi, punti della linea) hanno almeno 3:1', () => {
    expect(contrasto(VERDE_TESTO, AVORIO)).toBeGreaterThanOrEqual(3);
    expect(contrasto('#8B917F', BIANCO)).toBeGreaterThanOrEqual(3); // bordo dei campi, nativi e di Material
    expect(contrasto('#B9' + 'BDAA', BIANCO)).toBeLessThan(3); // il bordo usato prima non bastava
    expect(contrasto(LIME, BOSCO)).toBeGreaterThanOrEqual(3); // linea e fermate su fondo scuro
  });
});
