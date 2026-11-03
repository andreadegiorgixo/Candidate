import { costruisciDaFare, IngressiDaFare } from './da-fare';
import { candidatura, colloquio, offerta } from './testing/fabbriche';

const base: IngressiDaFare = {
  candidature: [],
  colloqui: [],
  offerte: [],
  oggi: '2026-11-03',
  adesso: '2026-11-03T12:00',
  sogliaAttesa: 14,
};

describe('coda di Oggi', () => {
  it('senza dati la coda è vuota', () => {
    expect(costruisciDaFare(base)).toEqual([]);
  });

  it('include i colloqui entro 48 ore e lascia fuori quelli più lontani o già passati', () => {
    const c = candidatura({ id: 1, nomeAzienda: 'Nordvento', statoCandidatura: 'FASE_DI_COLLOQUIO_TECNICO_1' });
    const voci = costruisciDaFare({
      ...base,
      candidature: [c],
      colloqui: [
        colloquio({ id: 10, idCandidatura: 1, dataOra: '2026-11-04T10:30' }), // tra 22 ore
        colloquio({ id: 11, idCandidatura: 1, dataOra: '2026-11-05T12:00' }), // esattamente 48 ore
        colloquio({ id: 12, idCandidatura: 1, dataOra: '2026-11-05T12:01' }), // fuori
        colloquio({ id: 13, idCandidatura: 1, dataOra: '2026-11-03T09:00' }), // già passato
      ],
    });
    expect(voci.map((v) => v.chiave)).toEqual(['colloquio-10', 'colloquio-11']);
    expect(voci[0].titolo).toBe('Prepara il colloquio tecnico con Nordvento');
    expect(voci[0].dettaglio).toBe('Domani alle 10:30, Java Developer');
  });

  it('include le offerte in scadenza entro sette giorni, anche a cavallo del mese', () => {
    const c = candidatura({ id: 1, nomeAzienda: 'Brera Labs', statoCandidatura: 'PROPOSTA_LAVORATIVA_IN_FASE_DI_REVISIONE' });
    const voci = costruisciDaFare({
      ...base,
      oggi: '2026-10-29',
      adesso: '2026-10-29T09:00',
      candidature: [c],
      offerte: [
        offerta({ id: 1, idCandidatura: 1, scadenza: '2026-11-05' }), // 7 giorni
        offerta({ id: 2, idCandidatura: 1, scadenza: '2026-11-06' }), // 8 giorni: fuori
        offerta({ id: 3, idCandidatura: 1, scadenza: '2026-10-28' }), // già scaduta
        offerta({ id: 4, idCandidatura: 1, scadenza: null }),
      ],
    });
    expect(voci.map((v) => v.chiave)).toEqual(['offerta-1']);
    expect(voci[0].titolo).toBe('Decidi sulla proposta di Brera Labs');
  });

  it('ignora le offerte di candidature ormai chiuse', () => {
    const c = candidatura({ id: 1, statoCandidatura: 'PROPOSTA_LAVORATIVA_RIFIUTATA' });
    expect(costruisciDaFare({ ...base, candidature: [c], offerte: [offerta({ idCandidatura: 1, scadenza: '2026-11-04' })] })).toEqual([]);
  });

  it('include le prossime azioni di oggi o scadute, ma non quelle future', () => {
    const voci = costruisciDaFare({
      ...base,
      candidature: [
        candidatura({ id: 1, prossimaAzioneTesto: 'Manda il portfolio', prossimaAzioneData: '2026-11-03', statoCandidatura: 'FASE_DI_COLLOQUIO_CONOSCITIVO' }),
        candidatura({ id: 2, prossimaAzioneTesto: 'Rispondi', prossimaAzioneData: '2026-10-31', statoCandidatura: 'FASE_DI_COLLOQUIO_TECNICO_1' }),
        candidatura({ id: 3, prossimaAzioneTesto: 'Domani', prossimaAzioneData: '2026-11-04', statoCandidatura: 'FASE_DI_COLLOQUIO_TECNICO_1' }),
        candidatura({ id: 4, prossimaAzioneTesto: 'Chiusa', prossimaAzioneData: '2026-10-01', statoCandidatura: 'RIFIUTATO_DA_RECRUITER' }),
      ],
    });
    expect(voci.map((v) => v.chiave)).toEqual(['azione-2', 'azione-1']);
    expect(voci[1].dettaglio).toBe('L’avevi fissata per oggi');
    expect(voci[0].dettaglio).toBe('Era per il 31 ott, 3 giorni fa');
  });

  it('segnala le candidature in attesa solo oltre la soglia', () => {
    const voci = costruisciDaFare({
      ...base,
      candidature: [
        candidatura({ id: 1, nomeAzienda: 'Lumia Tech', dataCandidatura: '2026-10-13' }), // 21 giorni
        candidatura({ id: 2, dataCandidatura: '2026-10-20' }), // 14 giorni: non oltre
        candidatura({ id: 3, dataCandidatura: '2026-10-19' }), // 15 giorni
        candidatura({ id: 4, dataCandidatura: '2026-09-01', statoCandidatura: 'GHOSTING_O_SENZA_RISPOSTA' }),
      ],
    });
    expect(voci.map((v) => v.chiave)).toEqual(['attesa-1', 'attesa-3']);
    expect(voci[0].titolo).toBe('Lumia Tech non risponde da 21 giorni');
    expect(voci[0].dettaglio).toBe('Java Developer, inviata il 13 ottobre');
  });

  it('rispetta la soglia indicata nel profilo', () => {
    const c = [candidatura({ id: 1, dataCandidatura: '2026-10-25' })]; // 9 giorni
    expect(costruisciDaFare({ ...base, candidature: c, sogliaAttesa: 7 })).toHaveLength(1);
    expect(costruisciDaFare({ ...base, candidature: c, sogliaAttesa: 14 })).toHaveLength(0);
  });

  it('ordina per priorità: colloqui, offerte, azioni, attese', () => {
    const voci = costruisciDaFare({
      ...base,
      candidature: [
        candidatura({ id: 1, dataCandidatura: '2026-09-01' }),
        candidatura({ id: 2, statoCandidatura: 'FASE_DI_COLLOQUIO_TECNICO_1', prossimaAzioneTesto: 'x', prossimaAzioneData: '2026-11-03' }),
        candidatura({ id: 3, statoCandidatura: 'PROPOSTA_LAVORATIVA_RICEVUTA' }),
      ],
      colloqui: [colloquio({ id: 7, idCandidatura: 2, dataOra: '2026-11-04T10:00' })],
      offerte: [offerta({ id: 8, idCandidatura: 3, scadenza: '2026-11-05' })],
    });
    expect(voci.map((v) => v.tipo)).toEqual(['colloquio', 'offerta', 'azione', 'attesa']);
  });
});
