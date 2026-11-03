import { TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { DateAdapterItaliano } from './data-italiana';

describe('date digitate a mano', () => {
  let adapter: DateAdapter<Date>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DateAdapter, useClass: DateAdapterItaliano },
        { provide: MAT_DATE_LOCALE, useValue: 'it-IT' },
      ],
    });
    adapter = TestBed.inject(DateAdapter);
  });

  it('capisce il formato italiano con barre, trattini e punti', () => {
    for (const s of ['31/12/2026', '31-12-2026', '31.12.2026', ' 31/12/2026 ']) {
      const d = adapter.parse(s, null)!;
      expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 11, 31]);
    }
  });

  it('accetta giorno e mese a una cifra e l’anno a due cifre', () => {
    const d = adapter.parse('3/1/27', null)!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2027, 0, 3]);
  });

  it('accetta anche il formato ISO', () => {
    expect(adapter.parse('2026-11-03', null)!.getDate()).toBe(3);
  });

  it('rifiuta le date che non esistono invece di spostarle', () => {
    for (const s of ['31/02/2026', '32/01/2026', '00/01/2026', '10/13/2026', 'domani', '12/2026']) {
      expect(adapter.isValid(adapter.parse(s, null)!), s).toBe(false);
    }
  });

  it('un campo vuoto non è una data', () => {
    expect(adapter.parse('', null)).toBeNull();
  });

  it('mostra le date come giorno/mese/anno', () => {
    expect(adapter.format(new Date(2026, 10, 3), {})).toBe('03/11/2026');
  });
});
