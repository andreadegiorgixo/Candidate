/** Contrasto WCAG 2.x tra due colori esadecimali. */
function luminanza(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrasto(a: string, b: string): number {
  const [x, y] = [luminanza(a), luminanza(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const FOREST = '#073B28';
const EMERALD = '#0B5138';
const TESTO = '#142B20';
const AVORIO = '#F7FAF8';
const BIANCO = '#FFFFFF';
const SABBIA = '#EEF5F0';
const SUPERFICIE_VERDE = '#E8F7EF';
const TESTO_2 = '#5F6E66';
const VERDE_TESTO = '#13764F';

describe('contrasto dei colori (WCAG AA)', () => {
  const testoNormale: [string, string, string][] = [
    ['testo su avorio', TESTO, AVORIO],
    ['testo su bianco', TESTO, BIANCO],
    ['testo secondario su avorio', TESTO_2, AVORIO],
    ['testo secondario su bianco', TESTO_2, BIANCO],
    ['testo secondario su sabbia', TESTO_2, SABBIA],
    ['link su avorio', VERDE_TESTO, AVORIO],
    ['link su bianco', VERDE_TESTO, BIANCO],
    ['pulsante primario: bianco su emerald', BIANCO, EMERALD],
    ['voce attiva su chiaro: emerald su superficie verde', EMERALD, SUPERFICIE_VERDE],
    ['barra laterale: testo chiaro su forest', '#FFFFFF', FOREST],
    ['barra laterale: testo secondario su forest', '#B8C9C0', FOREST],
    ['linea in grande: testo su forest', '#B8C9C0', FOREST],
    ['etichetta In attesa', '#8A4B0F', '#FEF3E2'],
    ['etichetta Colloqui', '#1E4FA3', '#E6EEFC'],
    ['etichetta Proposta', '#5B2E9E', '#F0E9FD'],
    ['etichetta Assunzione', '#0B5138', '#E8F7EF'],
    ['etichetta Rifiutata o ritirata', '#B42318', '#FDECEA'],
    ['etichetta Senza risposta', '#5F6E66', '#EEF2EF'],
    ['errori su bianco', '#B42318', BIANCO],
    ['errori su avorio', '#B42318', AVORIO],
  ];

  for (const [nome, testo, fondo] of testoNormale) {
    it(`${nome} ha almeno 4,5:1`, () => {
      expect(contrasto(testo, fondo)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('gli elementi grafici (focus, punti della linea) hanno almeno 3:1', () => {
    expect(contrasto('#16845A', AVORIO)).toBeGreaterThanOrEqual(3); // anello di focus (smeraldo)
    expect(contrasto('#16845A', BIANCO)).toBeGreaterThanOrEqual(3);
    expect(contrasto('#38B982', FOREST)).toBeGreaterThanOrEqual(3); // linea, indicatori e focus su fondo scuro
  });
});
