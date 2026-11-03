import { Candidatura, Citta, Colloquio, Offerta, StatoCandidatura, StoricoEvento } from '../api/models';

export const MILANO: Citta = { id: 1, nomeCitta: 'Milano', provincia: 'MI', regione: 'Lombardia', nazione: 'Italia' };

let contatore = 0;

export function candidatura(extra: Partial<Candidatura> = {}): Candidatura {
  const id = extra.id ?? ++contatore;
  return {
    id,
    idAccount: 1,
    nomeAzienda: `Azienda ${id}`,
    posizioneLavorativa: 'Java Developer',
    jobOffert: '',
    modalita: 'REMOTO',
    citta: MILANO,
    statoCandidatura: 'IN_FASE_DI_ATTESA',
    dataCandidatura: '2026-10-01',
    note: null,
    dataCreazione: '2026-10-01',
    spontanea: false,
    fonte: 'LINKEDIN',
    prossimaAzioneTesto: null,
    prossimaAzioneData: null,
    idCv: null,
    ...extra,
  };
}

export function evento(stato: StatoCandidatura, dataEvento: string, nota: string | null = null): StoricoEvento {
  return { stato, dataEvento, nota };
}

export function colloquio(extra: Partial<Colloquio> = {}): Colloquio {
  return {
    id: ++contatore,
    idCandidatura: 1,
    tipo: 'TECNICO_1',
    dataOra: '2026-11-04T10:30',
    luogoOLink: 'https://meet.example/x',
    persone: '',
    checklist: [],
    voto: null,
    domande: [],
    daMigliorare: null,
    ...extra,
  };
}

export function offerta(extra: Partial<Offerta> = {}): Offerta {
  return {
    id: ++contatore,
    idCandidatura: 1,
    ral: 40000,
    variabile: null,
    giorniRemoto: null,
    ferie: null,
    benefit: '',
    scadenza: null,
    note: '',
    voto: null,
    ...extra,
  };
}
