# Brief frontend di Candidate

Questo documento è la fonte di verità per il frontend. Se trovi un conflitto o una lacuna, non inventare: segnalalo nel report di fine fase.

## 1. Prodotto

Candidate è una web app personale in italiano per seguire la propria ricerca di lavoro. Deve rispondere a tre domande:

- **Cosa devo fare oggi?**
- **Come sta andando la mia ricerca?**
- **Cosa funziona e cosa devo cambiare?**

Chi la usa è una sola persona con qualche decina o centinaio di candidature, quindi conta la velocità d'uso più che la scalabilità.

## 2. Confini del lavoro

- Scrivi solo dentro `frontend/`. Non modificare `backend/`, `compose.yaml`, `.env` o `docs/`.
- Se serve qualcosa dal backend, annotalo in `frontend/BACKEND_REQUESTS.md`.
- Non fare commit né push: li decide il proprietario del progetto dopo la revisione.
- Non scrivere mai segreti nel codice. Le configurazioni pubbliche stanno in `src/environments/`.
- Il backend non è ancora pronto: lavora contro il mock descritto nella sezione 9.
- Se usi il Playwright MCP, a fine fase cancella la cartella `.playwright-mcp/` che crea nella radice del progetto.

## 3. Stack

Versioni verificate il 3 novembre 2026. Usa l'ultima stabile compatibile, senza scendere di major.

| Area | Scelta |
|---|---|
| Runtime | Node 24 o 26. La versione 25 non è supportata da Angular CLI: se la trovi, fermati e dillo |
| Framework | Angular 22, componenti standalone, signals, nuovo control flow, route in lazy loading |
| Form | Reactive Forms tipizzati |
| UI | Angular Material 22 solo per form field, select, autocomplete, datepicker, dialog, snackbar, menu. Angular CDK per drag and drop e overlay |
| Stili | SCSS con variabili CSS. Niente Tailwind |
| Grafici | Apache ECharts 6 con ngx-echarts 22, importando solo i moduli usati |
| Font | `@fontsource-variable/mona-sans`, ospitato in locale |
| Test | Vitest o il runner predefinito della CLI per le unità, Playwright per l'end-to-end |

Non aggiungere NgRx, Tailwind, moment, lodash o altre librerie di componenti. Se ti sembra indispensabile una dipendenza nuova, motivala nel report.

Le date del backend sono `LocalDate` (`YYYY-MM-DD`). Non passarle a `new Date(stringa)`, che sposta il giorno in base al fuso orario: usa una utility unica in `core/`.

## 4. Struttura

```text
frontend/src/app/
  core/       auth, interceptor, guard, api, mock, date, mappa stati
  layout/     shell con barra laterale
  shared/     percorso, etichetta stato, stato vuoto, grafico, tabella dati
  features/
    auth/  oggi/  candidature/  colloqui/  aziende/  materiali/  offerte/  profilo/
```

Le feature non si importano tra loro: ciò che è condiviso va in `shared/` o `core/`. I componenti di pagina orchestrano, la logica di calcolo sta in funzioni pure testabili (soprattutto i calcoli e la coda di Oggi).

## 5. Design

Il riferimento visivo è [mockup-oggi.html](mockup-oggi.html): riproducine carattere, gerarchia e proporzioni, ma costruisci componenti tuoi. I colori si ispirano a Complaion e Jet HR: **non copiare loghi, testi o layout di quei siti**.

### Idea centrale: la linea

Ogni candidatura è un viaggio lungo una linea con sei fermate: In attesa, Conoscitivo, Tecnico 1, Tecnico 2, Proposta, Assunzione. Questo è l'unico elemento appariscente dell'app e compare sempre nella stessa forma:

- grande in Oggi, con i conteggi per fermata;
- piccolo in ogni riga di candidatura;
- come cronologia datata nel dettaglio.

Tutto il resto resta sobrio. Se un'altra parte della pagina attira più della linea, va ridotta.

### Colori

| Token | Valore | Uso |
|---|---|---|
| `--bosco` | `#092D0B` | testo, barra laterale, pulsante primario |
| `--bosco-2` | `#173814` | hover sul fondo scuro |
| `--lime` | `#CBF949` | voce attiva, testo del pulsante primario, linea su fondo scuro |
| `--avorio` | `#F9F9EF` | sfondo pagina |
| `--sabbia` | `#EBEBDD` | divisori, fondi tenui |
| `--bordo` | `#DEDFCF` | bordi |
| `--bianco` | `#FFFFFF` | pannelli |
| `--testo-2` | `#565E50` | testo secondario |
| `--verde-testo` | `#3F6F20` | link e focus su fondo chiaro |

Il lime su fondo chiaro ha contrasto 1,15:1: **non usarlo mai come testo, icona o bordo unico su sfondi chiari**. Su chiaro va solo come riempimento con testo `--bosco` sopra.

Etichette di stato, sempre con testo leggibile e mai solo col colore:

| Gruppo | Fondo | Testo |
|---|---|---|
| In attesa | `#FFE3B6` | `#8A3B12` |
| Colloqui | `#C2DAFF` | `#1F4E9E` |
| Proposta | `#DCC2FF` | `#5B2E9E` |
| Assunzione | `#CBF949` | `#092D0B` |
| Rifiutata o ritirata | `#FBE4E1` | `#B3261E` |
| Senza risposta | `#EBEBDD` | `#565E50` |

### Tipografia e forme

- Solo Mona Sans. Titoli di pagina 38px, peso 800, larghezza espansa (`font-stretch: 112%`), interlinea stretta. Testo 15px.
- Le cifre tabellari di Mona Sans sembrano monospace: usa `tabular-nums` solo nelle colonne numeriche delle tabelle, mai nei numeri grandi o nelle frasi.
- Raggi: pulsanti a pillola, campi e voci di menu 12px, pannelli 20px, banda della linea 24px.
- Nessuna ombra sui pannelli: bastano i bordi. Ombra leggera solo per dialog e menu.
- La login può avere una sfumatura lime e avorio sullo sfondo. Nessun'altra pagina usa sfumature decorative.

### Cose da evitare

Griglie di card tutte uguali, tile con numero grande e percentuale, etichette in maiuscolo sopra i titoli, testi uniti da punti centrali, frecce nei pulsanti, emoji, animazioni di ingresso sulle sezioni. Le animazioni servono solo a mostrare cosa è cambiato dopo un'azione e rispettano `prefers-reduced-motion`.

### Testi

Italiano, frasi normali, prima lettera maiuscola, verbi chiari. Il pulsante dice cosa succede ("Salva candidatura", non "Invia") e la conferma usa lo stesso verbo. Gli errori spiegano cosa fare, senza scuse. Ogni stato vuoto propone l'azione successiva, per esempio: "Non hai ancora candidature. Aggiungi la prima."

## 6. Mappa degli stati

Sta in un solo file di `core/`. È l'unico punto in cui gli enum diventano testo e fermata.

| Enum | Etichetta | Fermata | Tipo |
|---|---|---|---|
| `IN_FASE_DI_ATTESA` | In attesa | In attesa | in corso |
| `FASE_DI_COLLOQUIO_CONOSCITIVO` | Conoscitivo | Conoscitivo | in corso |
| `FASE_DI_COLLOQUIO_TECNICO_1` | Tecnico 1 | Tecnico 1 | in corso |
| `FASE_DI_COLLOQUIO_TECNICO_2` | Tecnico 2 | Tecnico 2 | in corso |
| `PROPOSTA_LAVORATIVA_RICEVUTA` | Proposta ricevuta | Proposta | in corso |
| `PROPOSTA_LAVORATIVA_IN_FASE_DI_REVISIONE` | Proposta in valutazione | Proposta | in corso |
| `PROPOSTA_LAVORATIVA_ACCETTATA` | Proposta accettata | Proposta | in corso |
| `ASSUNZIONE_COMPLETATA` | Assunzione completata | Assunzione | conclusa bene |
| `RIFIUTATO_DA_RECRUITER` | Rifiutata dall'azienda | ultima dallo storico | uscita |
| `RIFIUTATO_DAL_CANDIDATO` | Ritirata da te | ultima dallo storico | uscita |
| `PROPOSTA_LAVORATIVA_RIFIUTATA` | Proposta rifiutata | Proposta | uscita |
| `GHOSTING_O_SENZA_RISPOSTA` | Senza risposta | ultima dallo storico | uscita |

Per le uscite, la fermata è l'ultima raggiunta secondo lo storico e la linea si interrompe lì. Mostra il rifiuto con una linea troncata e il ghosting con una linea che sfuma nel grigio.

Modalità: `REMOTO` diventa "Da remoto", `IBRIDO` "Ibrido", `INSEDE` "In sede".

**Definizioni da usare ovunque:**

- *Risposta*: la candidatura ha lasciato `IN_FASE_DI_ATTESA` verso uno stato diverso da `GHOSTING_O_SENZA_RISPOSTA`.
- *In corso*: tipo "in corso" nella tabella.
- *In attesa da troppo*: in attesa da più giorni della soglia in Profilo (predefinita 14). L'app **propone** di segnarla senza risposta, ma non cambia mai uno stato da sola.

## 7. Pagine

La barra laterale è sempre visibile su desktop, nell'ordine: Oggi, Candidature, Colloqui, Aziende, Materiali, Offerte e, separato in basso, Profilo. Il contatore compare solo su Oggi (cose da fare), Colloqui (in programma) e Offerte (aperte). Sotto i 1050px diventa una barra orizzontale scorrevole. Ogni pagina ha un compito diverso: non ripetere gli stessi dati in forma diversa.

### Accesso (`/accedi`, `/registrati`)

Form brevi, errori sotto il campo. Dopo l'accesso si va a Oggi.

### Oggi (`/oggi`, pagina iniziale) — "cosa faccio adesso?"

Vedi il mockup. Titolo dinamico col numero di cose da fare; se sono zero: "Oggi non hai niente in sospeso".

Dall'alto in basso: testata, **Da fare** (solo se c'è qualcosa), la linea, poi due colonne con **Andamento in breve** a sinistra e Prossimi colloqui e Questa settimana a destra, infine **Ritmo** e **Costanza** a tutta larghezza.

- **Da fare:** sezione a tutta larghezza, subito sotto la testata e sopra la linea. **Compare solo se ci sono cose da fare**: quando è vuota non c'è nessuno stato vuoto, la pagina parte dalla linea (il titolo dice già "Oggi non hai niente in sospeso"). Priorità: colloqui entro 48 ore; offerte in scadenza entro 7 giorni; prossime azioni scadute o di oggi; candidature in attesa da troppo. Ogni riga ha un'azione che si completa senza cambiare pagina quando possibile.
- **La linea:** conteggi delle candidature in corso per fermata, più il riepilogo delle uscite. Ogni fermata apre Candidature filtrata.
- **Andamento in breve:** colonna principale, tre riquadri numerici in riga (in colonna quando la sezione è stretta, quindi anche a 390px). Il calcolo è `riepilogoAndamento` in `oggi.logic.ts`, che restituisce anche i testi.
  - **Inviate negli ultimi 30 giorni:** candidature con `dataCandidatura >= oggi - 30 giorni`, oggi compreso. Sotto, il confronto con i 30 giorni precedenti (da oggi-60 incluso a oggi-30 escluso): "3 in più del mese prima", "2 in meno del mese prima", "Come il mese prima". Se nel mese prima non ce ne sono e l'account non ha candidature più vecchie, niente confronto.
  - **Risposte:** "X su Y" con `calcolaTasso` su tutte le candidature. La percentuale compare solo se Y è almeno 5 (sotto, la percentuale non è affidabile). Restano fuori da Y le candidature ancora in attesa inviate da non più di `sogliaAttesa` giorni (non hanno avuto il tempo di rispondere); il sottotitolo lo dice: "tra quelle inviate da più di 14 giorni". È una stima prudente: Oggi non carica lo storico (una richiesta per candidatura), quindi chi ha risposto ed è poi passato a "Senza risposta" non conta tra le risposte.
  - **Colloqui fatti:** colloqui con `dataOra` già passata e aziende distinte (stesso nome normalizzato = una azienda): "5" e "colloqui con 3 aziende". Con zero: "0" e "Ancora nessuno".
  - Con zero candidature resta lo stato vuoto generale della pagina.
- **Prossimi colloqui:** i prossimi tre.
- **Questa settimana:** invii rispetto all'obiettivo, con dieci tacche proporzionali.
- **Ritmo e Costanza:** i due grafici della sezione 8, in fondo alla pagina. Stanno nel componente `ritmo-costanza.ts`, caricato con `@defer (on viewport)`: ECharts si scarica solo quando la sezione sta per entrare nello schermo.

### Candidature (`/candidature`) — "gestisco tutto qui"

- **Vista Elenco** (predefinita): azienda, ruolo, percorso piccolo, stato, modalità, città, data di invio, prossima azione. Ordinabile.
- **Vista Bacheca:** una colonna per fermata. Trascinare cambia stato con annullamento in snackbar; le uscite si scelgono da un menu.
- **Filtri in una riga:** ricerca libera, stato, modalità, città, fonte, spontanea. I filtri stanno nell'URL.
- **Aggiunta rapida:** pulsante e tasto `N` aprono un pannello laterale con i soli campi obbligatori. "Altri dettagli" mostra gli altri. Se esiste già una candidatura per la stessa azienda, avvisa con data e stato ma non bloccare.
- **Dettaglio (`/candidature/:id`):** linea datata, tutti i campi modificabili, annuncio o messaggio, note, colloqui, contatti, prossima azione.
- **Spontanee:** se `spontanea` è vera, il campo `jobOffert` si etichetta "Link o testo del messaggio inviato"; altrimenti "Link all'annuncio". La città si cerca con autocomplete e, se manca, si crea dal form.
- **Esporta CSV** con i filtri applicati.

### Andamento (eliminata)

La pagina è confluita in Oggi: i tre numeri erano già in "Andamento in breve", Ritmo e Costanza sono in fondo a Oggi. `/andamento` reindirizza a `/oggi`.

### Colloqui (`/colloqui`) — "arrivo preparato e imparo da ognuno"

- **In programma:** agenda in ordine di data. Ogni colloquio ha link o luogo, persone e una checklist di preparazione con modello modificabile.
- **Conclusi:** dopo la data, l'app chiede un resoconto breve: come è andata (1-5), domande ricevute, cosa migliorare.
- **Domande ricevute:** archivio cercabile di tutte le domande, filtrabile per tipo di colloquio. È il pezzo che migliora nel tempo: dopo dieci colloqui vedi quali domande tornano.

### Aziende (`/aziende`) — "ci sono già passato?"

Raggruppa le candidature per azienda, ignorando maiuscole e spazi. Elenco con numero di candidature, ultimo stato e ultimo contatto. Il dettaglio mostra cronologia, contatti (nome, ruolo, email, LinkedIn, note) e un promemoria "Da non ricontattare prima del" con data.

### Materiali (`/materiali`) — "quale CV funziona?"

- **Profilo LinkedIn:** blocco sopra le versioni del CV. Il link si inserisce, si modifica e si rimuove; quando c'è compare come link che si apre in una nuova scheda. È salvato sull'account (`linkedin`) e si modifica anche in Profilo. Vuoto oppure `http(s)` di `linkedin.com` (anche `www.` e sottodomini come `it.linkedin.com`).
- **Versioni del CV:** nome e **file caricato dal computer** (PDF, DOC o DOCX, al massimo 5 MB), con scelta dal pulsante o trascinamento sul riquadro. Ogni versione mostra nome, nome del file, dimensione, data di caricamento e un pulsante «Scarica» (richiesta autenticata, salvata come Blob). In modifica il file è facoltativo: se non si sceglie, resta quello attuale. Accanto a ognuna: candidature inviate e tasso di risposta.
- **Modelli di messaggio:** sollecito, ringraziamento, spontanea. Segnaposto `{azienda}`, `{ruolo}`, `{contatto}`, compilati quando il modello è aperto da una candidatura. Pulsante "Copia testo".

### Offerte (`/offerte`) — "quale accetto?"

Confronto affiancato delle proposte aperte: RAL, variabile, giorni da remoto, ferie, benefit, scadenza, note, più un voto personale. Evidenzia il valore migliore di ogni riga senza dichiarare un vincitore. Stato vuoto: "Qui confronterai le proposte quando ne riceverai una."

### Profilo (`/profilo`)

Dati personali (compreso il link al profilo LinkedIn, facoltativo), password, obiettivo settimanale (predefinito 10), soglia di attesa (predefinita 14 giorni), esportazione completa, eliminazione dell'account con conferma digitando l'email.

### Ricerca globale

`Cmd+K` o `Ctrl+K` su qualsiasi pagina: cerca aziende, ruoli e contatti, e porta alle azioni principali.

## 8. Grafici di Oggi: Ritmo e Costanza

Niente filtri: ogni grafico ha il suo periodo fisso.

1. **Ritmo:** colonne degli invii per settimana negli ultimi 90 giorni, con linea tratteggiata dell'obiettivo. Sotto i 3 invii nel periodo, al posto del grafico si spiega quanti ne servono.
2. **Costanza:** calendario annuale degli invii per giorno (26 settimane sotto i 700px).

Regole per ogni grafico:

- Un solo asse Y. Mai grafici a doppio asse.
- Colori per categoria, in quest'ordine fisso e legati all'entità, non al rango: `#3F7D20`, `#2F6FD0`, `#C77700`, `#7C4DBC`, `#C2455A`, `#008F85`. Palette validata su fondo bianco e avorio: la coppia più vicina è ΔE 7 per il deuteranope, quindi serve sempre un secondo indizio (etichetta diretta o legenda). Oltre le sei categorie, raggruppa in "Altre".
- Scala ordinata per fermate e calendario: `#8CBF45`, `#5E9A2E`, `#3F7D20`, `#173814`. Le uscite usano i colori di stato della sezione 5, sempre con etichetta.
- Barre sottili con estremità arrotondate di 4px, spazio di 2px tra i riempimenti, linee da 2px, griglia discreta.
- Testi e valori in colori di testo, mai nel colore della serie. Solo etichette dirette selezionate, non un numero su ogni punto.
- Legenda sempre presente con due o più serie; nessuna con una sola.
- Tooltip al passaggio del mouse e accesso da tastiera.
- Ogni grafico ha "Vedi come tabella". Il titolo dice cosa si vede in italiano semplice.
- Con pochi dati non mostrare un grafico vuoto: spiega quanti invii servono.

## 9. Contratto API e mock

Il backend usa JWT Bearer su `/api`. Tutte le risposte sono JSON. Risposte `401`: esci e torna a `/accedi`, conservando la pagina di destinazione. `409`: errore sul campo. `404`: pagina "non trovata" nel contesto. Gli altri errori: snackbar con azione "Riprova". Il token sta in `sessionStorage`.

**Esiste già nel modello dati:**

```ts
Account { id, nome, cognome, email, password?, dataCreazione }
Citta { id, nomeCitta, provincia, regione, nazione }
Candidatura {
  id, idAccount, nomeAzienda, posizioneLavorativa, jobOffert, modalita,
  citta: Citta, statoCandidatura, dataCandidatura, note, dataCreazione
}
```

**Endpoint concordati.** Quelli marcati *nuovo* saranno aggiunti al backend da noi:

| Metodo e percorso | Note |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | *nuovo*; risposta `{ token, scadenza, account }` |
| `GET`, `PUT`, `DELETE /api/account/me` | *nuovo* |
| `GET`, `POST /api/candidatura` | *nuovo* il `GET`: tutte quelle dell'utente. Nessun filtro lato server: filtra nel browser. `idAccount` viene dal token, non inviarlo |
| `GET`, `PUT /api/candidatura/{id}`, `DELETE /api/candidatura/delete/{id}` | |
| `GET /api/candidatura/{id}/storico` | *nuovo*: `{ stato, dataEvento, nota }[]`; lo crea il backend a ogni cambio di stato |
| `GET`, `POST /api/citta` | *nuovo* il `GET` |
| `GET`, `POST`, `PUT`, `DELETE /api/colloquio` | *nuovo*: `{ id, idCandidatura, tipo, dataOra, luogoOLink, persone, checklist[], voto, domande[], daMigliorare }` |
| `GET`, `POST`, `PUT`, `DELETE /api/contatto` | *nuovo*: `{ id, nomeAzienda, nome, ruolo, email, linkedin, note }` |
| `GET`, `PUT /api/azienda/{nome}/promemoria` | *nuovo*: `{ nonRicontattarePrimaDel }` |
| `GET /api/cv` | **collegato**: metadati `{ id, nome, nomeFile, contentType, dimensione, dataCaricamento }`, senza il file |
| `POST /api/cv`, `PUT /api/cv/{id}` | **collegato**: `multipart/form-data` con `nome` e `file` (nel `PUT` il file è facoltativo). Solo PDF, DOC, DOCX, massimo 5 MB: `400` con `errors.file` per il tipo, `413` per la dimensione |
| `GET /api/cv/{id}/file`, `DELETE /api/cv/{id}` | **collegato**: il download ha `Content-Disposition: attachment`; il CV di un altro account risponde `404` |
| `GET`, `POST`, `PUT`, `DELETE /api/modello` | *nuovo*: `{ id, tipo, nome, testo }` |
| `GET`, `POST`, `PUT`, `DELETE /api/offerta` | *nuovo*: `{ id, idCandidatura, ral, variabile, giorniRemoto, ferie, benefit, scadenza, note, voto }` |

**Campi nuovi di Candidatura:** `spontanea` (boolean), `fonte` (`LINKEDIN`, `INDEED`, `SITO_AZIENDA`, `PASSAPAROLA`, `RECRUITER`, `ALTRO`), `prossimaAzioneTesto`, `prossimaAzioneData`, `idCv`.
**Campi nuovi di Account:** `obiettivoSettimanale`, `sogliaAttesaGiorni`, `linkedin` (stringa, vuota se assente; `400` con `errors.linkedin` se non è un indirizzo di linkedin.com).

**Mock:** implementa tutto il contratto con un interceptor HTTP attivo solo in sviluppo, tramite `useMocks` in `src/environments/`, escluso dal bundle di produzione. I componenti non devono sapere che esiste. Dati con seme fisso e nomi inventati: circa 60 candidature su 8 mesi con storico coerente, 10 colloqui, 2 offerte aperte, 3 versioni del CV (file PDF di esempio). La persistenza è in memoria. Serve anche un utente demo. I tipi stanno in `core/api/models.ts`; in fase 5 saranno sostituiti da quelli generati con `openapi-typescript` da `/v3/api-docs`.

## 10. Fasi

Lavora una fase alla volta. A fine fase **fermati** e consegna il report. Non passare alla successiva senza conferma.

| Fase | Contenuto |
|---|---|
| 0 | Progetto Angular in `frontend/`, token, font, tema Material, shell, mappa stati, mock e rotta di sviluppo `/stile` con tutti i componenti condivisi |
| 1 | Accesso, Candidature completa, Oggi |
| 2 | Andamento |
| 3 | Colloqui e Aziende |
| 4 | Materiali, Offerte, Profilo, ricerca globale |
| 5 | Sostituzione del mock con il backend reale (solo quando viene comunicato che è pronto) |

**Report di fine fase:** cosa è stato fatto, comandi eseguiti con il risultato, screenshot in `frontend/docs/screens/fase-N/` a 1440px e 390px, scostamenti dal brief e motivo, voci aggiunte a `BACKEND_REQUESTS.md`.

## 11. Una fase è finita quando

- `ng build` passa senza errori e `ng test` è verde.
- Le funzioni pure di `core/` e i calcoli di Oggi hanno test unitari, inclusi i casi limite: nessun dato, pochi dati, date a cavallo del mese.
- I flussi principali della fase hanno un test Playwright.
- Ogni pagina è stata aperta e controllata davvero negli screenshot, con dati, senza dati, in caricamento e in errore.
- Funziona con la sola tastiera, con focus visibile; contrasto WCAG AA; nessuno scroll orizzontale a 390px.
- TypeScript in `strict`, nessun `any`.
- Tutti i testi sono in italiano e rispettano la sezione 5.
