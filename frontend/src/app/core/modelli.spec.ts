import { compilaModello } from './modelli';
import { normalizzaAzienda } from './azienda';

describe('modelli di messaggio', () => {
  const testo = 'Buongiorno {contatto}, candidatura per {ruolo} presso {azienda}. {azienda} è la mia prima scelta. {altro}';

  it('compila i segnaposto, anche se ripetuti, e lascia quelli sconosciuti', () => {
    expect(compilaModello(testo, { azienda: 'Altavia', ruolo: 'Java Developer', contatto: 'Giulia' })).toBe(
      'Buongiorno Giulia, candidatura per Java Developer presso Altavia. Altavia è la mia prima scelta. {altro}',
    );
  });

  it('senza contatto usa un’espressione neutra', () => {
    expect(compilaModello('Ciao {contatto}', { azienda: 'A', ruolo: 'R' })).toBe('Ciao team di selezione');
    expect(compilaModello('Ciao {contatto}', { azienda: 'A', ruolo: 'R', contatto: '  ' })).toBe('Ciao team di selezione');
  });
});

describe('normalizzaAzienda', () => {
  it('ignora maiuscole, accenti e spazi in eccesso', () => {
    expect(normalizzaAzienda('  Brera   LABS ')).toBe('brera labs');
    expect(normalizzaAzienda('Caffè Nero')).toBe('caffe nero');
    expect(normalizzaAzienda('')).toBe('');
  });
});
