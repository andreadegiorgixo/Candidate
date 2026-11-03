import {
  aggiungiGiorni,
  aggiungiMesi,
  chiaveMese,
  componiDataOra,
  descriviData,
  differenzaGiorni,
  fineSettimana,
  formatISO,
  formatoBreve,
  giorni,
  inizioSettimana,
  minutiTra,
  parseData,
  soloData,
  soloOra,
} from './date';

describe('date', () => {
  it('legge una LocalDate come giorno locale, senza spostamenti di fuso', () => {
    const d = parseData('2026-03-29'); // giorno del cambio all'ora legale
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 29]);
    expect(d.getHours()).toBe(0);
  });

  it('formatISO è l’inverso di parseData', () => {
    for (const s of ['2026-01-01', '2026-12-31', '2028-02-29', '2026-10-25']) expect(formatISO(parseData(s))).toBe(s);
  });

  it('differenzaGiorni conta giorni di calendario anche a cavallo dell’ora legale', () => {
    expect(differenzaGiorni('2026-03-28', '2026-03-30')).toBe(2);
    expect(differenzaGiorni('2026-10-24', '2026-10-26')).toBe(2);
    expect(differenzaGiorni('2026-11-03', '2026-11-03')).toBe(0);
    expect(differenzaGiorni('2026-11-03', '2026-10-13')).toBe(-21);
  });

  it('aggiungiGiorni gestisce fine mese, fine anno e anno bisestile', () => {
    expect(aggiungiGiorni('2026-10-31', 1)).toBe('2026-11-01');
    expect(aggiungiGiorni('2026-12-31', 1)).toBe('2027-01-01');
    expect(aggiungiGiorni('2028-02-28', 1)).toBe('2028-02-29');
    expect(aggiungiGiorni('2026-03-01', -1)).toBe('2026-02-28');
    expect(aggiungiGiorni('2026-11-03', -250)).toBe('2026-02-26');
  });

  it('aggiungiMesi non sfora la fine del mese', () => {
    expect(aggiungiMesi('2026-01-31', 1)).toBe('2026-02-28');
    expect(aggiungiMesi('2026-03-31', -1)).toBe('2026-02-28');
    expect(aggiungiMesi('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('la settimana va da lunedì a domenica', () => {
    expect(inizioSettimana('2026-11-03')).toBe('2026-11-02'); // martedì
    expect(inizioSettimana('2026-11-02')).toBe('2026-11-02'); // lunedì
    expect(inizioSettimana('2026-11-08')).toBe('2026-11-02'); // domenica
    expect(fineSettimana('2026-11-03')).toBe('2026-11-08');
    // settimana a cavallo del mese
    expect(inizioSettimana('2026-12-01')).toBe('2026-11-30');
    expect(fineSettimana('2026-12-01')).toBe('2026-12-06');
  });

  it('chiaveMese estrae anno e mese', () => {
    expect(chiaveMese('2026-02-28')).toBe('2026-02');
  });

  it('separa e ricompone data e ora', () => {
    expect(soloData('2026-11-04T10:30')).toBe('2026-11-04');
    expect(soloOra('2026-11-04T10:30')).toBe('10:30');
    expect(soloOra('2026-11-04')).toBe('');
    expect(componiDataOra('2026-11-04', '09:05')).toBe('2026-11-04T09:05');
    expect(componiDataOra('2026-11-04', '')).toBe('2026-11-04T00:00');
  });

  it('minutiTra misura anche a cavallo di mezzanotte e di fine mese', () => {
    expect(minutiTra('2026-11-03T12:00', '2026-11-04T10:30')).toBe(22 * 60 + 30);
    expect(minutiTra('2026-10-31T23:30', '2026-11-01T00:30')).toBe(60);
    expect(minutiTra('2026-11-04T10:30', '2026-11-03T10:30')).toBe(-1440);
  });

  it('descrive le date in italiano rispetto a oggi', () => {
    expect(descriviData('2026-11-03', '2026-11-03')).toBe('oggi');
    expect(descriviData('2026-11-04', '2026-11-03')).toBe('domani');
    expect(descriviData('2026-11-02', '2026-11-03')).toBe('ieri');
    expect(descriviData('2026-11-06', '2026-11-03')).toBe('venerdì 6 novembre');
  });

  it('formatta giorni e date brevi', () => {
    expect(formatoBreve('2026-11-03')).toBe('3 nov');
    expect(giorni(1)).toBe('1 giorno');
    expect(giorni(21)).toBe('21 giorni');
  });
});
