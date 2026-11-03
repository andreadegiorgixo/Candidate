import {
  Account,
  Candidatura,
  Citta,
  Colloquio,
  Contatto,
  Cv,
  Fonte,
  Modalita,
  Modello,
  Offerta,
  Promemoria,
  StatoCandidatura,
  StoricoEvento,
  TipoColloquio,
} from '../api/models';
import { aggiungiGiorni, DataISO } from '../date';
import { normalizzaAzienda } from '../azienda';

/** Dati di un account: il mock tiene un insieme separato per ogni utente. */
export interface DatiAccount {
  candidature: Candidatura[];
  storico: Map<number, StoricoEvento[]>;
  colloqui: Colloquio[];
  contatti: Contatto[];
  cv: Cv[];
  modelli: Modello[];
  offerte: Offerta[];
  promemoria: Map<string, Promemoria>;
}

export interface Seme {
  account: Account;
  password: string;
  citta: Citta[];
  dati: DatiAccount;
}

export const DEMO_EMAIL = 'demo@candidate.it';
export const DEMO_PASSWORD = 'demo1234';

/** Generatore pseudo-casuale con seme fisso (mulberry32). */
export function creaRandom(seme: number): () => number {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AZIENDE = [
  'Quadrante Software', 'Mareluce', 'Ferrovivo', 'Pinodata', 'Tessitura Digitale', 'Argento Cloud',
  'Corallo Soft', 'Vetta Systems', 'Orsa Minore', 'Cartiera Digitale', 'Fiordaliso IT', 'Solstizio',
  'Granaio Dati', 'Lampada Verde', 'Ponte Sottile', 'Rotonda Labs', 'Sestante', 'Tramonto Software',
  'Aurelia Systems', 'Biancospino', 'Cerchio Aperto', 'Dogana Digitale', 'Eliante', 'Faro Nord',
  'Gelso Tech', 'Hangar 41', 'Isola Dati', 'Giunco', 'Kalimero Soft', 'Lanterna', 'Meridiana IT',
  'Nodo Sei', 'Oasi Cloud', 'Pergola', 'Quercia Labs', 'Radura', 'Salice Software', 'Tiglio Systems',
  'Umbria Byte', 'Vela Rossa', 'Zattera', 'Ancora Digitale', 'Bussola', 'Cometa Lab', 'Delta Piave',
  'Edera', 'Fucina Web', 'Glicine', 'Ippocampo', 'Lucerna', 'Maestrale Tech', 'Noce Bianca',
];
const DUPLICATI = ['nordvento', 'Altavia ', 'BRERA LABS', 'pinodata'];

const RUOLI = [
  'Java Developer', 'Backend Developer', 'Full Stack Developer', 'Software Engineer',
  'Spring Boot Developer', 'Frontend Developer Angular', 'DevOps Engineer', 'Data Engineer', 'Junior Developer',
];

const CITTA_SEME: Omit<Citta, 'id'>[] = [
  { nomeCitta: 'Milano', provincia: 'MI', regione: 'Lombardia', nazione: 'Italia' },
  { nomeCitta: 'Roma', provincia: 'RM', regione: 'Lazio', nazione: 'Italia' },
  { nomeCitta: 'Torino', provincia: 'TO', regione: 'Piemonte', nazione: 'Italia' },
  { nomeCitta: 'Bologna', provincia: 'BO', regione: 'Emilia-Romagna', nazione: 'Italia' },
  { nomeCitta: 'Napoli', provincia: 'NA', regione: 'Campania', nazione: 'Italia' },
  { nomeCitta: 'Padova', provincia: 'PD', regione: 'Veneto', nazione: 'Italia' },
  { nomeCitta: 'Firenze', provincia: 'FI', regione: 'Toscana', nazione: 'Italia' },
  { nomeCitta: 'Verona', provincia: 'VR', regione: 'Veneto', nazione: 'Italia' },
];

type S = StatoCandidatura;
const ATT: S = 'IN_FASE_DI_ATTESA';
const CON: S = 'FASE_DI_COLLOQUIO_CONOSCITIVO';
const T1: S = 'FASE_DI_COLLOQUIO_TECNICO_1';
const T2: S = 'FASE_DI_COLLOQUIO_TECNICO_2';
const PRO: S = 'PROPOSTA_LAVORATIVA_RICEVUTA';
const REV: S = 'PROPOSTA_LAVORATIVA_IN_FASE_DI_REVISIONE';
const RIF: S = 'RIFIUTATO_DA_RECRUITER';
const RIT: S = 'RIFIUTATO_DAL_CANDIDATO';
const PRF: S = 'PROPOSTA_LAVORATIVA_RIFIUTATA';
const GHO: S = 'GHOSTING_O_SENZA_RISPOSTA';

interface Specifica {
  percorso: S[];
  /** Giorni trascorsi dall'invio; se mancante è casuale nell'intervallo. */
  offset?: number;
  intervallo?: [number, number];
  azienda?: string;
  ruolo?: string;
  modalita?: Modalita;
  citta?: string;
  nome?: 'nordvento' | 'brera' | 'altavia' | 'lumia' | 'terza-offerta';
}

const SPECIFICHE: Specifica[] = [
  // Colloqui e proposte in corso, con nomi fissi usati dalla pagina Oggi.
  { percorso: [ATT, CON, T1], offset: 24, azienda: 'Nordvento', ruolo: 'Java Developer', modalita: 'REMOTO', citta: 'Milano', nome: 'nordvento' },
  { percorso: [ATT, CON, T1, T2, PRO, REV], offset: 41, azienda: 'Brera Labs', ruolo: 'Backend Developer', modalita: 'IBRIDO', citta: 'Milano', nome: 'brera' },
  { percorso: [ATT, CON], offset: 20, azienda: 'Altavia', ruolo: 'Full Stack Developer', modalita: 'REMOTO', citta: 'Milano', nome: 'altavia' },
  { percorso: [ATT], offset: 21, azienda: 'Lumia Tech', ruolo: 'Backend Developer', modalita: 'INSEDE', citta: 'Torino', nome: 'lumia' },
  { percorso: [ATT, CON, T1, T2, PRO], intervallo: [38, 48], nome: 'terza-offerta' },
  { percorso: [ATT, CON], intervallo: [9, 30] },
  { percorso: [ATT, CON], intervallo: [9, 30] },
  { percorso: [ATT, CON], intervallo: [9, 30] },
  { percorso: [ATT, CON, T1], intervallo: [20, 50] },
  { percorso: [ATT, CON, T1], intervallo: [20, 50] },
  { percorso: [ATT, CON, T1, T2], intervallo: [28, 60] },
  { percorso: [ATT, CON, T1, T2], intervallo: [28, 60] },
  // In attesa: alcune recenti, altre oltre la soglia dei 14 giorni.
  ...[0, 0, 1, 3, 5, 8, 10, 12, 16, 38].map<Specifica>((offset) => ({ percorso: [ATT], offset })),
  // Rifiutate subito, dopo il primo contatto, dopo i colloqui.
  ...Array.from({ length: 9 }, () => ({ percorso: [ATT, RIF], intervallo: [40, 230] }) as Specifica),
  ...Array.from({ length: 3 }, () => ({ percorso: [ATT, CON, RIF], intervallo: [50, 230] }) as Specifica),
  ...Array.from({ length: 2 }, () => ({ percorso: [ATT, CON, T1, RIF], intervallo: [60, 230] }) as Specifica),
  { percorso: [ATT, CON, T1, T2, RIF], intervallo: [70, 200] },
  // Ritirate e proposta rifiutata.
  { percorso: [ATT, CON, RIT], intervallo: [60, 200] },
  { percorso: [ATT, CON, T1, RIT], intervallo: [60, 200] },
  { percorso: [ATT, CON, RIT], intervallo: [60, 200] },
  { percorso: [ATT, CON, T1, T2, PRO, PRF], intervallo: [90, 200] },
  // Senza risposta.
  ...Array.from({ length: 16 }, () => ({ percorso: [ATT, GHO], intervallo: [35, 235] }) as Specifica),
];

const NOTE_USCITA: Partial<Record<S, string>> = {
  RIFIUTATO_DA_RECRUITER: 'L’azienda ha scelto un altro profilo.',
  RIFIUTATO_DAL_CANDIDATO: 'Ruolo diverso da quello descritto.',
  PROPOSTA_LAVORATIVA_RIFIUTATA: 'RAL sotto le aspettative.',
  GHOSTING_O_SENZA_RISPOSTA: 'Nessuna risposta dopo il sollecito.',
};

const SALTI: Partial<Record<S, [number, number]>> = {
  [CON]: [4, 13],
  [T1]: [4, 10],
  [T2]: [5, 12],
  [PRO]: [6, 14],
  [REV]: [2, 5],
  [RIF]: [3, 12],
  [RIT]: [2, 6],
  [PRF]: [3, 8],
  [GHO]: [24, 34],
};

function sceglie<T>(rnd: () => number, lista: readonly T[]): T {
  return lista[Math.floor(rnd() * lista.length)];
}

function intero(rnd: () => number, min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

function slug(nome: string): string {
  return normalizzaAzienda(nome).replace(/[^a-z0-9]+/g, '');
}

export function creaSeme(oggi: DataISO): Seme {
  const rnd = creaRandom(20261103);
  const citta: Citta[] = CITTA_SEME.map((c, i) => ({ id: i + 1, ...c }));
  const cittaPerNome = (nome: string) => citta.find((c) => c.nomeCitta === nome) ?? citta[0];

  const account: Account = {
    id: 1,
    nome: 'Elisa',
    cognome: 'Marchetti',
    email: DEMO_EMAIL,
    dataCreazione: aggiungiGiorni(oggi, -250),
    obiettivoSettimanale: 10,
    sogliaAttesaGiorni: 14,
  };

  const cv: Cv[] = [
    { id: 1, nome: 'CV generale', url: 'https://example.com/cv/generale.pdf' },
    { id: 2, nome: 'CV sviluppatore Java', url: 'https://example.com/cv/java.pdf' },
    { id: 3, nome: 'CV breve, una pagina', url: 'https://example.com/cv/breve.pdf' },
  ];

  const nomiLiberi = [...AZIENDE, ...DUPLICATI];
  // Mescola in modo deterministico.
  for (let i = nomiLiberi.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [nomiLiberi[i], nomiLiberi[j]] = [nomiLiberi[j], nomiLiberi[i]];
  }

  const candidature: Candidatura[] = [];
  const storico = new Map<number, StoricoEvento[]>();
  const colloqui: Colloquio[] = [];
  let idColloquio = 1;

  SPECIFICHE.forEach((spec, i) => {
    const id = i + 1;
    const finale = spec.percorso[spec.percorso.length - 1];
    const risposta = spec.percorso.length > 1 && finale !== GHO;
    const offset = spec.offset ?? intero(rnd, spec.intervallo![0], spec.intervallo![1]);
    const dataCandidatura = aggiungiGiorni(oggi, -offset);

    const pesoRemoto = risposta ? 0.55 : finale === GHO ? 0.2 : 0.4;
    const pesoIbrido = 0.3;
    const r = rnd();
    const modalita: Modalita = spec.modalita ?? (r < pesoRemoto ? 'REMOTO' : r < pesoRemoto + pesoIbrido ? 'IBRIDO' : 'INSEDE');

    const spontanea = !spec.nome && finale === GHO ? rnd() < 0.3 : !spec.nome && rnd() < 0.05;
    let fonte: Fonte;
    if (spontanea) fonte = rnd() < 0.5 ? 'SITO_AZIENDA' : 'LINKEDIN';
    else if (risposta) fonte = sceglie(rnd, ['LINKEDIN', 'PASSAPAROLA', 'RECRUITER', 'RECRUITER', 'SITO_AZIENDA', 'INDEED']);
    else fonte = sceglie(rnd, ['LINKEDIN', 'LINKEDIN', 'INDEED', 'INDEED', 'SITO_AZIENDA', 'ALTRO']);
    if (spec.nome === 'nordvento') fonte = 'RECRUITER';
    if (spec.nome === 'altavia') fonte = 'PASSAPAROLA';

    const idCv = risposta ? sceglie(rnd, [2, 2, 2, 1, 3]) : sceglie(rnd, [1, 1, 3, 3, 3, 2]);
    const azienda = spec.azienda ?? nomiLiberi.pop()!;
    const ruolo = spec.ruolo ?? sceglie(rnd, RUOLI);

    // Percorso con date coerenti: nessun evento dopo oggi.
    const eventi: StoricoEvento[] = [{ stato: ATT, dataEvento: dataCandidatura, nota: null }];
    let giorno = 0;
    for (const stato of spec.percorso.slice(1)) {
      const [min, max] = SALTI[stato] ?? [3, 8];
      giorno = Math.min(offset, giorno + intero(rnd, min, max));
      eventi.push({ stato, dataEvento: aggiungiGiorni(dataCandidatura, giorno), nota: NOTE_USCITA[stato] ?? null });
    }
    storico.set(id, eventi);

    let prossimaAzioneTesto: string | null = null;
    let prossimaAzioneData: DataISO | null = null;
    if (spec.nome === 'altavia') {
      prossimaAzioneTesto = 'Manda il portfolio a Giulia di Altavia';
      prossimaAzioneData = oggi;
    } else if (spec.nome === 'brera') {
      prossimaAzioneTesto = 'Rispondere alla proposta con la controfferta';
      prossimaAzioneData = aggiungiGiorni(oggi, 2);
    } else if (spec.percorso.length > 1 && !spec.percorso.includes(RIF) && !finale.startsWith('RIFIUTATO') && finale !== GHO && finale !== PRF && rnd() < 0.5) {
      prossimaAzioneTesto = sceglie(rnd, ['Mandare un grazie al recruiter', 'Ripassare la parte su Spring Security', 'Rispondere con le disponibilità']);
      prossimaAzioneData = aggiungiGiorni(oggi, intero(rnd, -2, 5));
    }

    const jobOffert = spontanea
      ? 'Buongiorno, sono una sviluppatrice Java con tre anni di esperienza su servizi REST. Mi piacerebbe contribuire al vostro team backend.'
      : `https://lavora.${slug(azienda)}.example/posizioni/${1000 + id}`;

    candidature.push({
      id,
      idAccount: 1,
      nomeAzienda: azienda,
      posizioneLavorativa: ruolo,
      jobOffert,
      modalita,
      citta: spec.citta ? cittaPerNome(spec.citta) : sceglie(rnd, citta),
      statoCandidatura: finale,
      dataCandidatura,
      note: rnd() < 0.3 ? 'Stack: Java 21, Spring Boot, PostgreSQL. Team di otto persone.' : null,
      dataCreazione: dataCandidatura,
      spontanea,
      fonte,
      prossimaAzioneTesto,
      prossimaAzioneData,
      idCv,
    });

    // Un colloquio per ogni candidatura che ha raggiunto la fase di colloquio corrente.
    const tipoDa: Partial<Record<S, TipoColloquio>> = { [CON]: 'CONOSCITIVO', [T1]: 'TECNICO_1', [T2]: 'TECNICO_2' };
    const ultimaFase = [...spec.percorso].reverse().find((s) => tipoDa[s]);
    const inCorsoColloquio = [CON, T1, T2].includes(finale);
    const rifiutoDopoT2 = spec.percorso.join() === [ATT, CON, T1, T2, RIF].join();
    if (ultimaFase && (inCorsoColloquio || rifiutoDopoT2)) {
      const evento = eventi.find((e) => e.stato === ultimaFase)!;
      const futuro = spec.nome === 'nordvento' || spec.nome === 'altavia';
      let dataOra: string;
      if (spec.nome === 'nordvento') dataOra = `${aggiungiGiorni(oggi, 1)}T10:30`;
      else if (spec.nome === 'altavia') dataOra = `${aggiungiGiorni(oggi, 6)}T15:00`;
      else dataOra = `${aggiungiGiorni(evento.dataEvento, intero(rnd, 2, 5) > offset ? 0 : intero(rnd, 1, 3))}T${sceglie(rnd, ['09:30', '11:00', '14:30', '16:00'])}`;
      if (!futuro && dataOra.slice(0, 10) > oggi) dataOra = `${oggi}T09:00`;
      colloqui.push({
        id: idColloquio++,
        idCandidatura: id,
        tipo: tipoDa[ultimaFase]!,
        dataOra,
        luogoOLink: spec.nome === 'altavia' ? 'Via Tortona 12, Milano' : `https://meet.${slug(azienda)}.example/stanza-${id}`,
        persone: sceglie(rnd, ['Giulia Ferri, HR', 'Paolo Neri, Tech lead', 'Marta Conti, Engineering manager', 'Luca Serra, Recruiter']),
        checklist: [
          { testo: 'Rileggere l’annuncio e le note sull’azienda', fatto: futuro },
          { testo: 'Preparare due domande per chi mi intervista', fatto: false },
          { testo: 'Provare audio, camera e connessione', fatto: false },
        ],
        voto: null,
        domande: [],
        daMigliorare: null,
      });
    }
  });

  // Resoconti: tutti i colloqui passati tranne l'ultimo ne hanno uno, così resta un caso "da compilare".
  const passati = colloqui.filter((c) => c.dataOra.slice(0, 10) <= oggi).sort((a, b) => a.dataOra.localeCompare(b.dataOra));
  const DOMANDE = [
    'Come gestisci le transazioni in Spring?',
    'Qual è la differenza tra @Component e @Service?',
    'Raccontami un bug difficile che hai risolto.',
    'Perché vuoi cambiare azienda?',
    'Come progetteresti un’API per le notifiche?',
    'Che differenza c’è tra un indice B-tree e uno hash?',
    'Come strutturi i test di un servizio REST?',
  ];
  passati.slice(0, -1).forEach((c, i) => {
    c.voto = [4, 3, 5, 2, 4, 3, 4][i % 7];
    c.domande = [DOMANDE[i % 7], DOMANDE[(i + 2) % 7], ...(i % 3 === 0 ? [DOMANDE[0]] : [])];
    c.daMigliorare = i % 2 === 0 ? 'Rispondere con esempi concreti, non con definizioni.' : 'Ripassare la gestione delle transazioni.';
    c.checklist = c.checklist.map((v) => ({ ...v, fatto: true }));
  });

  const brera = candidature.find((c) => c.nomeAzienda === 'Brera Labs')!;
  const terza = candidature[4];
  const offerte: Offerta[] = [
    {
      id: 1, idCandidatura: brera.id, ral: 42000, variabile: 3000, giorniRemoto: 2, ferie: 26,
      benefit: 'Buoni pasto da 8 euro, assicurazione sanitaria, budget formazione',
      scadenza: aggiungiGiorni(oggi, 3), note: 'Il team è piccolo ma il progetto è interessante.', voto: 4,
    },
    {
      id: 2, idCandidatura: terza.id, ral: 38500, variabile: null, giorniRemoto: 5, ferie: 28,
      benefit: 'Remoto completo, portatile a scelta',
      scadenza: aggiungiGiorni(oggi, 12), note: '', voto: 3,
    },
  ];

  const contatti: Contatto[] = [
    { id: 1, nomeAzienda: 'Altavia', nome: 'Giulia Ferri', ruolo: 'Talent acquisition', email: 'giulia.ferri@altavia.example', linkedin: 'https://linkedin.com/in/giulia-ferri-esempio', note: 'Preferisce essere contattata la mattina.' },
    { id: 2, nomeAzienda: 'Nordvento', nome: 'Paolo Neri', ruolo: 'Tech lead', email: 'paolo.neri@nordvento.example', linkedin: '', note: '' },
    { id: 3, nomeAzienda: 'Brera Labs', nome: 'Marta Conti', ruolo: 'Engineering manager', email: 'marta.conti@breralabs.example', linkedin: 'https://linkedin.com/in/marta-conti-esempio', note: 'Ha seguito lei tutto il processo.' },
    { id: 4, nomeAzienda: 'Brera Labs', nome: 'Davide Longo', ruolo: 'HR', email: 'davide.longo@breralabs.example', linkedin: '', note: '' },
    { id: 5, nomeAzienda: 'Lumia Tech', nome: 'Sofia Greco', ruolo: 'Recruiter', email: 'sofia.greco@lumiatech.example', linkedin: '', note: 'Ha scritto lei su LinkedIn.' },
  ];

  const modelli: Modello[] = [
    {
      id: 1, tipo: 'SOLLECITO', nome: 'Sollecito dopo due settimane',
      testo: 'Buongiorno {contatto},\nho inviato la mia candidatura per la posizione di {ruolo} presso {azienda} un paio di settimane fa. Sono ancora molto interessata e volevo chiedere se ci fossero novità.\nGrazie per il tempo che mi dedicherà.\nElisa',
    },
    {
      id: 2, tipo: 'RINGRAZIAMENTO', nome: 'Grazie dopo il colloquio',
      testo: 'Buongiorno {contatto},\ngrazie per il tempo dedicato oggi. Il colloquio per il ruolo di {ruolo} mi ha confermato quanto {azienda} sia un posto in cui mi piacerebbe lavorare.\nResto a disposizione per qualsiasi altra informazione.\nElisa',
    },
    {
      id: 3, tipo: 'SPONTANEA', nome: 'Primo messaggio spontaneo',
      testo: 'Buongiorno {contatto},\nsono una sviluppatrice backend e seguo da tempo {azienda}. Anche se non vedo un annuncio aperto, mi piacerebbe candidarmi come {ruolo}. In allegato trova il mio CV.\nGrazie per l’attenzione.\nElisa',
    },
  ];

  const promemoria = new Map<string, Promemoria>([
    [normalizzaAzienda('Lumia Tech'), { nonRicontattarePrimaDel: aggiungiGiorni(oggi, 20) }],
  ]);

  return {
    account,
    password: DEMO_PASSWORD,
    citta,
    dati: { candidature, storico, colloqui, contatti, cv, modelli, offerte, promemoria },
  };
}
