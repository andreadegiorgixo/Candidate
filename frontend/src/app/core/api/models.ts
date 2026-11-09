/**
 * Tipi del contratto API. In fase 5 saranno sostituiti da quelli generati con
 * `openapi-typescript` da `/v3/api-docs`.
 */

export type StatoCandidatura =
  | 'IN_FASE_DI_ATTESA'
  | 'FASE_DI_COLLOQUIO_CONOSCITIVO'
  | 'FASE_DI_COLLOQUIO_TECNICO_1'
  | 'FASE_DI_COLLOQUIO_TECNICO_2'
  | 'PROPOSTA_LAVORATIVA_RICEVUTA'
  | 'PROPOSTA_LAVORATIVA_IN_FASE_DI_REVISIONE'
  | 'PROPOSTA_LAVORATIVA_ACCETTATA'
  | 'ASSUNZIONE_COMPLETATA'
  | 'RIFIUTATO_DA_RECRUITER'
  | 'RIFIUTATO_DAL_CANDIDATO'
  | 'PROPOSTA_LAVORATIVA_RIFIUTATA'
  | 'GHOSTING_O_SENZA_RISPOSTA';

export type Modalita = 'REMOTO' | 'IBRIDO' | 'INSEDE';

export type Fonte = 'LINKEDIN' | 'INDEED' | 'SITO_AZIENDA' | 'PASSAPAROLA' | 'RECRUITER' | 'ALTRO';

export interface Account {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  password?: string;
  /** Link al profilo LinkedIn; stringa vuota se non c'è. */
  linkedin: string;
  dataCreazione: string;
  obiettivoSettimanale: number;
  sogliaAttesaGiorni: number;
}

export interface Citta {
  id: number;
  nomeCitta: string;
  provincia: string;
  regione: string;
  nazione: string;
}

export interface Candidatura {
  id: number;
  idAccount: number;
  nomeAzienda: string;
  posizioneLavorativa: string;
  jobOffert: string;
  modalita: Modalita;
  citta: Citta;
  statoCandidatura: StatoCandidatura;
  dataCandidatura: string;
  note: string | null;
  dataCreazione: string;
  spontanea: boolean;
  fonte: Fonte;
  prossimaAzioneTesto: string | null;
  prossimaAzioneData: string | null;
  idCv: number | null;
}

/** Dati inviati in creazione o modifica: `idAccount` viene dal token. */
export type CandidaturaInput = Omit<Candidatura, 'id' | 'idAccount' | 'dataCreazione'>;

export interface StoricoEvento {
  stato: StatoCandidatura;
  dataEvento: string;
  nota: string | null;
}

export type TipoColloquio = 'CONOSCITIVO' | 'TECNICO_1' | 'TECNICO_2' | 'ALTRO';

export interface VoceChecklist {
  testo: string;
  fatto: boolean;
}

export interface Colloquio {
  id: number;
  idCandidatura: number;
  tipo: TipoColloquio;
  /** LocalDateTime: `YYYY-MM-DDTHH:mm` */
  dataOra: string;
  luogoOLink: string;
  persone: string;
  checklist: VoceChecklist[];
  /** Come è andata, da 1 a 5. Vuoto finché non c'è il resoconto. */
  voto: number | null;
  domande: string[];
  daMigliorare: string | null;
}
export type ColloquioInput = Omit<Colloquio, 'id'>;

export interface Contatto {
  id: number;
  nomeAzienda: string;
  nome: string;
  ruolo: string;
  email: string;
  linkedin: string;
  note: string;
}
export type ContattoInput = Omit<Contatto, 'id'>;

export interface Promemoria {
  nonRicontattarePrimaDel: string | null;
}

/** Versione del CV: i metadati del file caricato (il contenuto si scarica a parte). */
export interface Cv {
  id: number;
  nome: string;
  nomeFile: string;
  contentType: string;
  /** In byte. */
  dimensione: number;
  /** Istante ISO 8601. */
  dataCaricamento: string;
}
/** Il file è obbligatorio in creazione; in modifica, se manca, resta quello attuale. */
export interface CvInput {
  nome: string;
  file: File | null;
}

export type TipoModello = 'SOLLECITO' | 'RINGRAZIAMENTO' | 'SPONTANEA';

export interface Modello {
  id: number;
  tipo: TipoModello;
  nome: string;
  testo: string;
}
export type ModelloInput = Omit<Modello, 'id'>;

export interface Offerta {
  id: number;
  idCandidatura: number;
  ral: number | null;
  variabile: number | null;
  giorniRemoto: number | null;
  ferie: number | null;
  benefit: string;
  scadenza: string | null;
  note: string;
  voto: number | null;
}
export type OffertaInput = Omit<Offerta, 'id'>;

export interface AuthResponse {
  token: string;
  scadenza: string;
  account: Account;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  nome: string;
  cognome: string;
}

export type AccountInput = Pick<Account, 'nome' | 'cognome' | 'email' | 'linkedin' | 'obiettivoSettimanale' | 'sogliaAttesaGiorni'> & {
  password?: string;
};

export type CittaInput = Omit<Citta, 'id'>;
