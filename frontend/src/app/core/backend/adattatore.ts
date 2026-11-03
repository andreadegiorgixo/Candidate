import {
  Account,
  AccountInput,
  AuthResponse,
  Candidatura,
  CandidaturaInput,
  Fonte,
  StoricoEvento,
} from '../api/models';
import { DataISO } from '../date';
import { components } from './api.generated';

/**
 * Traduzione tra il contratto che il frontend si aspetta e quello esposto davvero dal backend
 * (tipi generati in `api.generated.ts`). Funzioni pure: niente HTTP, niente storage.
 */

type AccountDTO = components['schemas']['AccountDTO'];
/** OpenAPI non segna i campi come obbligatori nei record: la risposta di accesso li ha sempre tutti. */
type AuthResponseDTO = Required<components['schemas']['AuthResponseDTO']>;
type CandidatureDTO = components['schemas']['CandidatureDTO'];

/**
 * Il backend rifiuta `jobOffert` vuoto, mentre nell'aggiunta rapida il campo è facoltativo.
 * Al server si manda questo testo e in lettura lo si riconverte in stringa vuota.
 */
export const ANNUNCIO_NON_INDICATO = '(non indicato)';

export const OBIETTIVO_PREDEFINITO = 10;
export const SOGLIA_PREDEFINITA = 14;

/** Dati che il backend non conserva: stanno nel browser (vedi `archivio-locale.ts`). */
export interface ExtraCandidatura {
  spontanea: boolean;
  fonte: Fonte;
  prossimaAzioneTesto: string | null;
  prossimaAzioneData: DataISO | null;
  idCv: number | null;
}

export interface Impostazioni {
  obiettivoSettimanale: number;
  sogliaAttesaGiorni: number;
}

export const IMPOSTAZIONI_PREDEFINITE: Impostazioni = {
  obiettivoSettimanale: OBIETTIVO_PREDEFINITO,
  sogliaAttesaGiorni: SOGLIA_PREDEFINITA,
};

export const EXTRA_PREDEFINITI: ExtraCandidatura = {
  spontanea: false,
  fonte: 'ALTRO',
  prossimaAzioneTesto: null,
  prossimaAzioneData: null,
  idCv: null,
};

// ---- account ----

export function daAccountDTO(b: AccountDTO, imp: Impostazioni = IMPOSTAZIONI_PREDEFINITE): Account {
  return {
    id: b.id!,
    nome: b.nome,
    cognome: b.cognome,
    email: b.email,
    dataCreazione: b.dataCreazione ?? '',
    obiettivoSettimanale: imp.obiettivoSettimanale,
    sogliaAttesaGiorni: imp.sogliaAttesaGiorni,
  };
}

/** Il backend riceve solo i campi che conosce; la password solo se è stata scritta. */
export function aAccountDTO(i: AccountInput): AccountDTO {
  const password = i.password?.trim() ? i.password : undefined;
  return { nome: i.nome, cognome: i.cognome, email: i.email, ...(password ? { password } : {}) };
}

export function impostazioniDa(i: Pick<AccountInput, 'obiettivoSettimanale' | 'sogliaAttesaGiorni'>): Impostazioni {
  return { obiettivoSettimanale: i.obiettivoSettimanale, sogliaAttesaGiorni: i.sogliaAttesaGiorni };
}

export function daAuthDTO(b: AuthResponseDTO, imp?: Impostazioni): AuthResponse {
  return { token: b.accessToken, scadenza: b.expiresAt, account: daAccountDTO(b.account, imp) };
}

// ---- candidature ----

export function daCandidatureDTO(b: CandidatureDTO, extra: ExtraCandidatura = EXTRA_PREDEFINITI): Candidatura {
  return {
    id: b.id!,
    idAccount: b.idAccount!,
    nomeAzienda: b.nomeAzienda,
    posizioneLavorativa: b.posizioneLavorativa,
    jobOffert: b.jobOffert === ANNUNCIO_NON_INDICATO ? '' : b.jobOffert,
    modalita: b.modalita,
    citta: { ...b.citta, id: b.citta.id! },
    statoCandidatura: b.statoCandidatura,
    dataCandidatura: b.dataCandidatura,
    note: b.note ?? null,
    dataCreazione: b.dataCreazione ?? '',
    ...extra,
  };
}

/** Separa ciò che va al backend da ciò che resta nel browser. */
export function dividiCandidatura(i: CandidaturaInput): { dto: CandidatureDTO; extra: ExtraCandidatura } {
  return {
    dto: {
      nomeAzienda: i.nomeAzienda,
      posizioneLavorativa: i.posizioneLavorativa,
      jobOffert: i.jobOffert.trim() || ANNUNCIO_NON_INDICATO,
      modalita: i.modalita,
      citta: i.citta,
      statoCandidatura: i.statoCandidatura,
      dataCandidatura: i.dataCandidatura,
      // `null` cancella la nota; il tipo generato non lo prevede ma il backend lo accetta.
      note: i.note as string | undefined,
    },
    extra: {
      spontanea: i.spontanea,
      fonte: i.fonte,
      prossimaAzioneTesto: i.prossimaAzioneTesto,
      prossimaAzioneData: i.prossimaAzioneData,
      idCv: i.idCv,
    },
  };
}

// ---- storico ----

/**
 * Il backend non tiene lo storico degli stati: lo ricostruiamo osservando i cambi.
 * Senza storico si parte dallo stato attuale alla data di invio; quando lo stato cambia
 * si aggiunge un evento alla data di oggi.
 */
export function riconciliaStorico(
  precedente: readonly StoricoEvento[] | undefined,
  c: Pick<Candidatura, 'statoCandidatura' | 'dataCandidatura'>,
  oggi: DataISO,
): StoricoEvento[] {
  if (!precedente?.length) return [{ stato: c.statoCandidatura, dataEvento: c.dataCandidatura, nota: null }];
  if (precedente[precedente.length - 1].stato === c.statoCandidatura) return [...precedente];
  return [...precedente, { stato: c.statoCandidatura, dataEvento: oggi, nota: null }];
}

// ---- token ----

/** Identificativo dell'account: è il `sub` del JWT emesso dal backend. */
export function idDaToken(authorization: string | null): number | null {
  const token = (authorization ?? '').replace(/^Bearer\s+/i, '');
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const sub = (JSON.parse(json) as { sub?: unknown }).sub;
    const id = Number(sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
