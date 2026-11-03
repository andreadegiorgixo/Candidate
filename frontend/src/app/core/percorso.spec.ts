import { calcolaPercorso, fermataRaggiunta } from './percorso';
import { evento } from './testing/fabbriche';

describe('percorso della candidatura', () => {
  it('senza storico una candidatura in attesa è sulla prima fermata', () => {
    const p = calcolaPercorso('IN_FASE_DI_ATTESA', undefined, '2026-10-01');
    expect(p.raggiunta).toBe(0);
    expect(p.esito).toBe('in-corso');
    expect(p.passi[0]).toMatchObject({ stato: 'corrente', data: '2026-10-01' });
    expect(p.passi.slice(1).every((x) => x.stato === 'futuro')).toBe(true);
  });

  it('per gli stati in corso la fermata è quella dello stato', () => {
    const p = calcolaPercorso('FASE_DI_COLLOQUIO_TECNICO_2', undefined, '2026-10-01');
    expect(p.raggiunta).toBe(3);
    expect(p.passi.map((x) => x.stato)).toEqual(['raggiunto', 'raggiunto', 'raggiunto', 'corrente', 'futuro', 'futuro']);
  });

  it('registra le date in cui ogni fermata è stata raggiunta', () => {
    const storico = [evento('IN_FASE_DI_ATTESA', '2026-10-01'), evento('FASE_DI_COLLOQUIO_CONOSCITIVO', '2026-10-09'), evento('FASE_DI_COLLOQUIO_TECNICO_1', '2026-10-20')];
    const p = calcolaPercorso('FASE_DI_COLLOQUIO_TECNICO_1', storico, '2026-10-01');
    expect(p.passi.slice(0, 3).map((x) => x.data)).toEqual(['2026-10-01', '2026-10-09', '2026-10-20']);
    expect(p.passi[3].data).toBeNull();
  });

  it('per un rifiuto la linea si interrompe sull’ultima fermata dello storico', () => {
    const storico = [
      evento('IN_FASE_DI_ATTESA', '2026-09-01'),
      evento('FASE_DI_COLLOQUIO_CONOSCITIVO', '2026-09-10'),
      evento('FASE_DI_COLLOQUIO_TECNICO_1', '2026-09-20'),
      evento('RIFIUTATO_DA_RECRUITER', '2026-09-30'),
    ];
    const p = calcolaPercorso('RIFIUTATO_DA_RECRUITER', storico, '2026-09-01');
    expect(p.raggiunta).toBe(2);
    expect(p.esito).toBe('rifiutata');
    expect(p.passi[2].stato).toBe('interrotto');
    expect(p.passi[3].stato).toBe('futuro');
  });

  it('il ghosting dopo la sola attesa resta sulla prima fermata', () => {
    const p = calcolaPercorso('GHOSTING_O_SENZA_RISPOSTA', [evento('IN_FASE_DI_ATTESA', '2026-08-01'), evento('GHOSTING_O_SENZA_RISPOSTA', '2026-09-01')], '2026-08-01');
    expect(p.raggiunta).toBe(0);
    expect(p.esito).toBe('senza-risposta');
  });

  it('un’uscita senza storico ricade sulla prima fermata', () => {
    expect(fermataRaggiunta('RIFIUTATO_DAL_CANDIDATO', undefined)).toBe(0);
    expect(fermataRaggiunta('RIFIUTATO_DAL_CANDIDATO', [])).toBe(0);
  });

  it('la proposta rifiutata sta sulla fermata Proposta anche senza storico', () => {
    const p = calcolaPercorso('PROPOSTA_LAVORATIVA_RIFIUTATA', undefined, '2026-01-01');
    expect(p.raggiunta).toBe(4);
    expect(p.esito).toBe('proposta-rifiutata');
  });

  it('ignora l’ordine in cui il backend restituisce lo storico', () => {
    const storico = [evento('RIFIUTATO_DAL_CANDIDATO', '2026-09-30'), evento('IN_FASE_DI_ATTESA', '2026-09-01'), evento('FASE_DI_COLLOQUIO_CONOSCITIVO', '2026-09-10')];
    expect(fermataRaggiunta('RIFIUTATO_DAL_CANDIDATO', storico)).toBe(1);
  });

  it('un’assunzione completata riempie tutta la linea', () => {
    const p = calcolaPercorso('ASSUNZIONE_COMPLETATA', undefined, '2026-01-01');
    expect(p.esito).toBe('conclusa');
    expect(p.passi.every((x) => x.stato === 'raggiunto')).toBe(true);
  });
});
