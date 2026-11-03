import { StatoCandidatura } from './api/models';
import { eInCorso, eUscita, etichettaStato, FERMATE, haAvutoRisposta, INFO_STATO, STATI_USCITA, TUTTI_GLI_STATI } from './stati';

describe('mappa degli stati', () => {
  it('copre tutti e dodici gli stati', () => {
    expect(TUTTI_GLI_STATI).toHaveLength(12);
  });

  it('usa le etichette del brief', () => {
    expect(etichettaStato('RIFIUTATO_DA_RECRUITER')).toBe('Rifiutata dall’azienda');
    expect(etichettaStato('RIFIUTATO_DAL_CANDIDATO')).toBe('Ritirata da te');
    expect(etichettaStato('PROPOSTA_LAVORATIVA_IN_FASE_DI_REVISIONE')).toBe('Proposta in valutazione');
    expect(etichettaStato('GHOSTING_O_SENZA_RISPOSTA')).toBe('Senza risposta');
  });

  it('le tre varianti di proposta stanno sulla stessa fermata', () => {
    const proposta: StatoCandidatura[] = ['PROPOSTA_LAVORATIVA_RICEVUTA', 'PROPOSTA_LAVORATIVA_IN_FASE_DI_REVISIONE', 'PROPOSTA_LAVORATIVA_ACCETTATA'];
    expect(proposta.map((s) => INFO_STATO[s].fermata)).toEqual([4, 4, 4]);
  });

  it('distingue in corso, conclusa e uscita', () => {
    expect(eInCorso('PROPOSTA_LAVORATIVA_ACCETTATA')).toBe(true);
    expect(eInCorso('ASSUNZIONE_COMPLETATA')).toBe(false);
    expect(eUscita('ASSUNZIONE_COMPLETATA')).toBe(false);
    expect(STATI_USCITA).toHaveLength(4);
    expect(STATI_USCITA.every(eUscita)).toBe(true);
  });

  it('le uscite senza fermata propria la prendono dallo storico', () => {
    expect(INFO_STATO['RIFIUTATO_DA_RECRUITER'].fermata).toBeNull();
    expect(INFO_STATO['GHOSTING_O_SENZA_RISPOSTA'].fermata).toBeNull();
    expect(INFO_STATO['PROPOSTA_LAVORATIVA_RIFIUTATA'].fermata).toBe(4);
  });

  it('ha sei fermate, ciascuna con uno stato di destinazione coerente', () => {
    expect(FERMATE).toHaveLength(6);
    FERMATE.forEach((f, i) => expect(INFO_STATO[f.stato].fermata).toBe(i));
  });

  describe('risposta', () => {
    it('è assente finché resta in attesa o finisce senza risposta', () => {
      expect(haAvutoRisposta('IN_FASE_DI_ATTESA')).toBe(false);
      expect(haAvutoRisposta('GHOSTING_O_SENZA_RISPOSTA', [{ stato: 'IN_FASE_DI_ATTESA' }, { stato: 'GHOSTING_O_SENZA_RISPOSTA' }])).toBe(false);
      expect(haAvutoRisposta('GHOSTING_O_SENZA_RISPOSTA')).toBe(false);
    });

    it('c’è quando la candidatura ha lasciato l’attesa verso altro che non sia il ghosting', () => {
      expect(haAvutoRisposta('FASE_DI_COLLOQUIO_CONOSCITIVO')).toBe(true);
      expect(haAvutoRisposta('RIFIUTATO_DA_RECRUITER')).toBe(true);
    });

    it('c’è anche se in seguito la candidatura si è fermata', () => {
      expect(
        haAvutoRisposta('GHOSTING_O_SENZA_RISPOSTA', [{ stato: 'IN_FASE_DI_ATTESA' }, { stato: 'FASE_DI_COLLOQUIO_CONOSCITIVO' }, { stato: 'GHOSTING_O_SENZA_RISPOSTA' }]),
      ).toBe(true);
    });
  });
});
