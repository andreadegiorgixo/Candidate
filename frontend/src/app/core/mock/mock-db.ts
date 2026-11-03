import {
  Account,
  AccountInput,
  AuthResponse,
  Candidatura,
  CandidaturaInput,
  Citta,
  CittaInput,
  Colloquio,
  ColloquioInput,
  Contatto,
  ContattoInput,
  Cv,
  CvInput,
  Modello,
  ModelloInput,
  Offerta,
  OffertaInput,
  Promemoria,
  RegisterRequest,
  StoricoEvento,
} from '../api/models';
import { normalizzaAzienda } from '../azienda';
import { aggiungiGiorni, oggiISO } from '../date';
import { creaSeme, DatiAccount, DEMO_EMAIL } from './seed';

/** Errore HTTP che il mock trasforma in risposta, nel formato ProblemDetail del backend. */
export class ErroreMock extends Error {
  constructor(
    readonly stato: number,
    readonly dettaglio: string,
    readonly errori?: Record<string, string>,
  ) {
    super(dettaglio);
  }
}

function vuoto(): DatiAccount {
  return {
    candidature: [],
    storico: new Map(),
    colloqui: [],
    contatti: [],
    cv: [],
    modelli: [],
    offerte: [],
    promemoria: new Map(),
  };
}

interface Sessione {
  account: Account;
  password: string;
  dati: DatiAccount;
}

/** Archivio in memoria: si azzera a ogni ricarica della pagina. */
export class MockDb {
  private readonly sessioni = new Map<number, Sessione>();
  private citta: Citta[] = [];
  private prossimoId = { account: 2, candidatura: 1000, citta: 100, altro: 1000 };

  constructor(oggi: string = oggiISO()) {
    const seme = creaSeme(oggi);
    this.citta = seme.citta;
    this.sessioni.set(seme.account.id, { account: seme.account, password: seme.password, dati: seme.dati });
  }

  // ---- autenticazione ----

  private risposta(s: Sessione): AuthResponse {
    return {
      token: `mock.${s.account.id}.${Math.random().toString(36).slice(2, 10)}`,
      scadenza: new Date(Date.now() + 3_600_000).toISOString(),
      account: this.pubblico(s.account),
    };
  }

  private pubblico(a: Account): Account {
    const { password: _scartata, ...resto } = a;
    return resto;
  }

  login(email: string, password: string): AuthResponse {
    const s = [...this.sessioni.values()].find((x) => x.account.email.toLowerCase() === email.trim().toLowerCase());
    if (!s || s.password !== password) throw new ErroreMock(401, 'Email o password non corrette');
    return this.risposta(s);
  }

  registra(r: RegisterRequest): AuthResponse {
    const errori: Record<string, string> = {};
    if (!r.nome?.trim()) errori['nome'] = 'Il nome è obbligatorio';
    if (!r.cognome?.trim()) errori['cognome'] = 'Il cognome è obbligatorio';
    if (!/^\S+@\S+\.\S+$/.test(r.email ?? '')) errori['email'] = 'Inserisci un’email valida';
    if ((r.password ?? '').length < 8) errori['password'] = 'La password deve avere almeno 8 caratteri';
    if (Object.keys(errori).length) throw new ErroreMock(400, 'Dati non validi', errori);
    if ([...this.sessioni.values()].some((x) => x.account.email.toLowerCase() === r.email.trim().toLowerCase())) {
      throw new ErroreMock(409, 'Esiste già un account con questa email');
    }
    const account: Account = {
      id: this.prossimoId.account++,
      nome: r.nome.trim(),
      cognome: r.cognome.trim(),
      email: r.email.trim(),
      dataCreazione: oggiISO(),
      obiettivoSettimanale: 10,
      sogliaAttesaGiorni: 14,
    };
    const s = { account, password: r.password, dati: vuoto() };
    this.sessioni.set(account.id, s);
    return this.risposta(s);
  }

  idDaToken(token: string | null): number {
    const m = /^mock\.(\d+)\./.exec(token ?? '');
    const id = m ? Number(m[1]) : NaN;
    if (!this.sessioni.has(id)) throw new ErroreMock(401, 'Sessione scaduta');
    return id;
  }

  private sessione(id: number): Sessione {
    return this.sessioni.get(id)!;
  }

  private dati(id: number): DatiAccount {
    return this.sessione(id).dati;
  }

  // ---- account ----

  account(id: number): Account {
    return this.pubblico(this.sessione(id).account);
  }

  aggiornaAccount(id: number, input: AccountInput): Account {
    const s = this.sessione(id);
    const errori: Record<string, string> = {};
    if (!input.nome?.trim()) errori['nome'] = 'Il nome è obbligatorio';
    if (!input.cognome?.trim()) errori['cognome'] = 'Il cognome è obbligatorio';
    if (!/^\S+@\S+\.\S+$/.test(input.email ?? '')) errori['email'] = 'Inserisci un’email valida';
    if (input.password !== undefined && input.password.length > 0 && input.password.length < 8) {
      errori['password'] = 'La password deve avere almeno 8 caratteri';
    }
    if (Object.keys(errori).length) throw new ErroreMock(400, 'Dati non validi', errori);
    const altro = [...this.sessioni.values()].find(
      (x) => x.account.id !== id && x.account.email.toLowerCase() === input.email.trim().toLowerCase(),
    );
    if (altro) throw new ErroreMock(409, 'Esiste già un account con questa email');
    const { password, ...resto } = input;
    s.account = { ...s.account, ...resto, email: input.email.trim() };
    if (password) s.password = password;
    return this.pubblico(s.account);
  }

  eliminaAccount(id: number): void {
    this.sessioni.delete(id);
  }

  // ---- candidature ----

  private validaCandidatura(i: CandidaturaInput): void {
    const errori: Record<string, string> = {};
    if (!i.nomeAzienda?.trim()) errori['nomeAzienda'] = 'Indica il nome dell’azienda';
    if (!i.posizioneLavorativa?.trim()) errori['posizioneLavorativa'] = 'Indica il ruolo';
    if (!i.citta?.id) errori['citta'] = 'Scegli una città';
    if (!i.dataCandidatura) errori['dataCandidatura'] = 'Indica la data di invio';
    if (Object.keys(errori).length) throw new ErroreMock(400, 'Dati non validi', errori);
  }

  candidature(id: number): Candidatura[] {
    return this.dati(id).candidature.map((c) => ({ ...c }));
  }

  candidatura(id: number, idC: number): Candidatura {
    const c = this.dati(id).candidature.find((x) => x.id === idC);
    if (!c) throw new ErroreMock(404, 'Candidatura non trovata');
    return { ...c };
  }

  creaCandidatura(id: number, input: CandidaturaInput): Candidatura {
    this.validaCandidatura(input);
    const d = this.dati(id);
    const c: Candidatura = { ...input, id: this.prossimoId.candidatura++, idAccount: id, dataCreazione: oggiISO() };
    d.candidature.push(c);
    d.storico.set(c.id, [{ stato: c.statoCandidatura, dataEvento: c.dataCandidatura, nota: null }]);
    return { ...c };
  }

  aggiornaCandidatura(id: number, idC: number, input: CandidaturaInput): Candidatura {
    this.validaCandidatura(input);
    const d = this.dati(id);
    const i = d.candidature.findIndex((x) => x.id === idC);
    if (i < 0) throw new ErroreMock(404, 'Candidatura non trovata');
    const prima = d.candidature[i];
    d.candidature[i] = { ...input, id: prima.id, idAccount: prima.idAccount, dataCreazione: prima.dataCreazione };
    if (prima.statoCandidatura !== input.statoCandidatura) {
      const eventi = d.storico.get(idC) ?? [];
      eventi.push({ stato: input.statoCandidatura, dataEvento: oggiISO(), nota: null });
      d.storico.set(idC, eventi);
    }
    return { ...d.candidature[i] };
  }

  eliminaCandidatura(id: number, idC: number): void {
    const d = this.dati(id);
    if (!d.candidature.some((x) => x.id === idC)) throw new ErroreMock(404, 'Candidatura non trovata');
    d.candidature = d.candidature.filter((x) => x.id !== idC);
    d.storico.delete(idC);
    d.colloqui = d.colloqui.filter((x) => x.idCandidatura !== idC);
    d.offerte = d.offerte.filter((x) => x.idCandidatura !== idC);
  }

  storico(id: number, idC: number): StoricoEvento[] {
    this.candidatura(id, idC);
    return (this.dati(id).storico.get(idC) ?? []).map((e) => ({ ...e }));
  }

  // ---- città ----

  elencoCitta(): Citta[] {
    return this.citta.map((c) => ({ ...c }));
  }

  creaCitta(input: CittaInput): Citta {
    if (!input.nomeCitta?.trim()) throw new ErroreMock(400, 'Dati non validi', { nomeCitta: 'Indica il nome della città' });
    const doppia = this.citta.some(
      (c) => normalizzaAzienda(c.nomeCitta) === normalizzaAzienda(input.nomeCitta) && c.provincia.toLowerCase() === input.provincia.toLowerCase(),
    );
    if (doppia) throw new ErroreMock(409, 'Questa città esiste già');
    const c: Citta = { ...input, nomeCitta: input.nomeCitta.trim(), id: this.prossimoId.citta++ };
    this.citta.push(c);
    return { ...c };
  }

  // ---- risorse semplici ----

  private elenco<T>(lista: T[]): T[] {
    return lista.map((x) => ({ ...x }));
  }

  private crea<T extends { id: number }>(lista: T[], input: Omit<T, 'id'>): T {
    const nuovo = { ...input, id: this.prossimoId.altro++ } as T;
    lista.push(nuovo);
    return { ...nuovo };
  }

  private aggiorna<T extends { id: number }>(lista: T[], idR: number, input: Omit<T, 'id'>): T {
    const i = lista.findIndex((x) => x.id === idR);
    if (i < 0) throw new ErroreMock(404, 'Elemento non trovato');
    lista[i] = { ...input, id: idR } as T;
    return { ...lista[i] };
  }

  private elimina<T extends { id: number }>(lista: T[], idR: number): T[] {
    if (!lista.some((x) => x.id === idR)) throw new ErroreMock(404, 'Elemento non trovato');
    return lista.filter((x) => x.id !== idR);
  }

  colloqui = (id: number): Colloquio[] => this.elenco(this.dati(id).colloqui);
  creaColloquio = (id: number, i: ColloquioInput) => this.crea(this.dati(id).colloqui, i);
  aggiornaColloquio = (id: number, r: number, i: ColloquioInput) => this.aggiorna(this.dati(id).colloqui, r, i);
  eliminaColloquio = (id: number, r: number) => void (this.dati(id).colloqui = this.elimina(this.dati(id).colloqui, r));

  contatti = (id: number): Contatto[] => this.elenco(this.dati(id).contatti);
  creaContatto = (id: number, i: ContattoInput) => this.crea(this.dati(id).contatti, i);
  aggiornaContatto = (id: number, r: number, i: ContattoInput) => this.aggiorna(this.dati(id).contatti, r, i);
  eliminaContatto = (id: number, r: number) => void (this.dati(id).contatti = this.elimina(this.dati(id).contatti, r));

  cv = (id: number): Cv[] => this.elenco(this.dati(id).cv);
  creaCv = (id: number, i: CvInput) => this.crea(this.dati(id).cv, i);
  aggiornaCv = (id: number, r: number, i: CvInput) => this.aggiorna(this.dati(id).cv, r, i);
  eliminaCv = (id: number, r: number) => void (this.dati(id).cv = this.elimina(this.dati(id).cv, r));

  modelli = (id: number): Modello[] => this.elenco(this.dati(id).modelli);
  creaModello = (id: number, i: ModelloInput) => this.crea(this.dati(id).modelli, i);
  aggiornaModello = (id: number, r: number, i: ModelloInput) => this.aggiorna(this.dati(id).modelli, r, i);
  eliminaModello = (id: number, r: number) => void (this.dati(id).modelli = this.elimina(this.dati(id).modelli, r));

  offerte = (id: number): Offerta[] => this.elenco(this.dati(id).offerte);
  creaOfferta = (id: number, i: OffertaInput) => this.crea(this.dati(id).offerte, i);
  aggiornaOfferta = (id: number, r: number, i: OffertaInput) => this.aggiorna(this.dati(id).offerte, r, i);
  eliminaOfferta = (id: number, r: number) => void (this.dati(id).offerte = this.elimina(this.dati(id).offerte, r));

  promemoria(id: number, azienda: string): Promemoria {
    return this.dati(id).promemoria.get(normalizzaAzienda(azienda)) ?? { nonRicontattarePrimaDel: null };
  }

  aggiornaPromemoria(id: number, azienda: string, p: Promemoria): Promemoria {
    this.dati(id).promemoria.set(normalizzaAzienda(azienda), { ...p });
    return { ...p };
  }
}

export { DEMO_EMAIL, aggiungiGiorni };
