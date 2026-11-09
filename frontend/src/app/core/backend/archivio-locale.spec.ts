import { components } from './api.generated';
import { ArchivioLocale } from './archivio-locale';
import { MILANO, colloquio } from '../testing/fabbriche';

type CandidatureDTO = components['schemas']['CandidatureDTO'];

class DepositoFinto {
  readonly dati = new Map<string, string>();
  getItem(k: string): string | null {
    return this.dati.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.dati.set(k, v);
  }
  removeItem(k: string): void {
    this.dati.delete(k);
  }
}

function dto(id: number, extra: Partial<CandidatureDTO> = {}): CandidatureDTO {
  return {
    id,
    idAccount: 1,
    nomeAzienda: `Azienda ${id}`,
    posizioneLavorativa: 'Dev',
    jobOffert: 'x',
    modalita: 'REMOTO',
    citta: MILANO,
    statoCandidatura: 'IN_FASE_DI_ATTESA',
    dataCandidatura: '2026-10-01',
    dataCreazione: '2026-10-01',
    ...extra,
  };
}

describe('archivio locale', () => {
  let deposito: DepositoFinto;
  let a: ArchivioLocale;

  beforeEach(() => {
    deposito = new DepositoFinto();
    a = new ArchivioLocale(deposito);
  });

  it('tiene separati gli account e sopravvive a una nuova istanza', () => {
    a.crea(1, 'modelli', { tipo: 'SOLLECITO', nome: 'A', testo: 't' });
    expect(a.elenco(2, 'modelli')).toEqual([]);
    expect(new ArchivioLocale(deposito).elenco(1, 'modelli')).toHaveLength(1);
  });

  describe('CV salvati nel browser prima che i file stessero sul server', () => {
    const extra = (idCv: number | null) => ({ spontanea: false, fonte: 'ALTRO' as const, prossimaAzioneTesto: null, prossimaAzioneData: null, idCv });

    it('le vecchie versioni «con link» vengono scartate e le candidature restano senza versione', () => {
      deposito.setItem(
        'candidate.locale.1',
        JSON.stringify({ cv: [{ id: 2, nome: 'Vecchio', url: 'https://x.it' }], extra: { 5: extra(2), 6: extra(null) }, modelli: [{ id: 9, tipo: 'SOLLECITO', nome: 'M', testo: 't' }], prossimoId: 10 }),
      );
      const dati = a.leggi(1);
      expect(dati).not.toHaveProperty('cv');
      expect(dati.extra[5].idCv).toBeNull();
      expect(dati.extra[6].idCv).toBeNull();
      // il resto non si tocca
      expect(a.elenco(1, 'modelli')).toHaveLength(1);
      expect(dati.prossimoId).toBe(10);
    });

    it('dopo la prima scrittura il marcatore resta e i nuovi idCv non vengono più azzerati', () => {
      deposito.setItem('candidate.locale.1', JSON.stringify({ cv: [{ id: 2, nome: 'Vecchio', url: 'u' }], extra: { 5: extra(2) } }));
      a.crea(1, 'modelli', { tipo: 'SOLLECITO', nome: 'A', testo: 't' });
      expect(JSON.parse(deposito.getItem('candidate.locale.1')!)).not.toHaveProperty('cv');
      a.modifica(1, (d) => void (d.extra[5].idCv = 2));
      expect(new ArchivioLocale(deposito).leggi(1).extra[5].idCv).toBe(2);
    });

    it('scollegaCv toglie la versione solo dalle candidature che puntano a numeri non più validi', () => {
      a.modifica(1, (d) => void (d.extra = { 1: extra(3), 2: extra(4), 3: extra(null) }));
      a.scollegaCv(1, (id) => id !== 4);
      expect(Object.values(a.leggi(1).extra).map((e) => e.idCv)).toEqual([null, 4, null]);
    });
  });

  it('riparte da zero se il contenuto salvato è illeggibile', () => {
    deposito.setItem('candidate.locale.1', '{non json');
    expect(a.elenco(1, 'modelli')).toEqual([]);
    expect(a.impostazioni(1)).toEqual({ obiettivoSettimanale: 10, sogliaAttesaGiorni: 14 });
  });

  it('crea, aggiorna ed elimina con id propri e segnala gli elementi mancanti', () => {
    const x = a.crea(1, 'modelli', { tipo: 'SOLLECITO', nome: 'A', testo: 't' });
    const y = a.crea(1, 'modelli', { tipo: 'SOLLECITO', nome: 'B', testo: 't' });
    expect(y.id).not.toBe(x.id);
    expect(a.aggiorna(1, 'modelli', x.id, { tipo: 'RINGRAZIAMENTO', nome: 'A2', testo: 't' })).toMatchObject({ id: x.id, nome: 'A2' });
    expect(a.aggiorna(1, 'modelli', 999, {})).toBeNull();
    expect(a.eliminaRisorsa(1, 'modelli', x.id)).toBe(true);
    expect(a.eliminaRisorsa(1, 'modelli', x.id)).toBe(false);
    expect(a.elenco(1, 'modelli')).toHaveLength(1);
  });

  it('salva le impostazioni per account', () => {
    a.salvaImpostazioni(1, { obiettivoSettimanale: 3, sogliaAttesaGiorni: 21 });
    expect(a.impostazioni(1)).toEqual({ obiettivoSettimanale: 3, sogliaAttesaGiorni: 21 });
    expect(a.impostazioni(2).obiettivoSettimanale).toBe(10);
  });

  it('promemoria: l’azienda si riconosce senza badare a maiuscole, accenti e spazi', () => {
    a.salvaPromemoria(1, 'Acmé  Italia', { nonRicontattarePrimaDel: '2026-12-01' });
    expect(a.promemoria(1, ' ACME italia ').nonRicontattarePrimaDel).toBe('2026-12-01');
    expect(a.promemoria(1, 'Altra').nonRicontattarePrimaDel).toBeNull();
  });

  describe('candidature', () => {
    it('unisce i dati locali e costruisce lo storico', () => {
      const c = a.salvaCandidatura(1, dto(5), { spontanea: true, fonte: 'PASSAPAROLA', prossimaAzioneTesto: null, prossimaAzioneData: null, idCv: 2 }, '2026-11-03');
      expect(c).toMatchObject({ id: 5, spontanea: true, fonte: 'PASSAPAROLA', idCv: 2 });
      expect(a.storico(1, 5)).toEqual([{ stato: 'IN_FASE_DI_ATTESA', dataEvento: '2026-10-01', nota: null }]);
    });

    it('registra il cambio di stato visto in un elenco successivo', () => {
      a.arricchisci(1, [dto(5)], '2026-10-02', true);
      a.arricchisci(1, [dto(5, { statoCandidatura: 'RIFIUTATO_DA_RECRUITER' })], '2026-11-03', true);
      expect(a.storico(1, 5)?.map((e) => `${e.stato}@${e.dataEvento}`)).toEqual([
        'IN_FASE_DI_ATTESA@2026-10-01',
        'RIFIUTATO_DA_RECRUITER@2026-11-03',
      ]);
    });

    it('con l’elenco completo elimina ciò che riguarda candidature sparite, con un elenco parziale no', () => {
      const extra = { spontanea: false, fonte: 'LINKEDIN' as const, prossimaAzioneTesto: null, prossimaAzioneData: null, idCv: null };
      a.salvaCandidatura(1, dto(5), extra, '2026-11-03');
      a.salvaCandidatura(1, dto(6), extra, '2026-11-03');
      a.crea(1, 'colloqui', colloquio({ idCandidatura: 5 }));
      a.crea(1, 'colloqui', colloquio({ idCandidatura: 6 }));
      a.arricchisci(1, [dto(6)], '2026-11-03', false);
      expect(a.storico(1, 5)).toBeDefined();
      a.arricchisci(1, [dto(6)], '2026-11-03', true);
      expect(a.storico(1, 5)).toBeUndefined();
      expect(a.elenco(1, 'colloqui').map((x) => x.idCandidatura)).toEqual([6]);
    });

    it('rimuovendo una candidatura toglie storico, colloqui e offerte', () => {
      a.salvaCandidatura(1, dto(5), { spontanea: false, fonte: 'ALTRO', prossimaAzioneTesto: null, prossimaAzioneData: null, idCv: null }, '2026-11-03');
      a.crea(1, 'colloqui', colloquio({ idCandidatura: 5 }));
      a.rimuoviCandidatura(1, 5);
      expect(a.storico(1, 5)).toBeUndefined();
      expect(a.elenco(1, 'colloqui')).toEqual([]);
    });
  });
});
